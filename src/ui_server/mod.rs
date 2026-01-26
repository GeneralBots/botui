use axum::{
    body::Body,
    extract::{
        ws::{Message as AxumMessage, WebSocket, WebSocketUpgrade},
        OriginalUri, Query, State,
    },
    http::{Request, StatusCode},
    response::{Html, IntoResponse, Response},
    routing::{any, get},
    Router,
};
use futures_util::{SinkExt, StreamExt};
use log::{debug, error, info};
#[cfg(feature = "embed-ui")]
use rust_embed::RustEmbed;
use serde::Deserialize;
use std::fs;
use std::path::{Path, PathBuf};
use tokio_tungstenite::{
    connect_async_tls_with_config, tungstenite,
    tungstenite::protocol::Message as TungsteniteMessage,
};
#[cfg(not(feature = "embed-ui"))]
use tower_http::services::{ServeDir, ServeFile};

#[cfg(feature = "embed-ui")]
#[derive(RustEmbed)]
#[folder = "ui"]
struct Assets;

use crate::shared::AppState;

const SUITE_DIRS: &[&str] = &[
    "js",
    "css",
    "public",
    "assets",
    "partials",
    // Core & Support
    "settings",
    "auth",
    "about",
    // Core Apps
    #[cfg(feature = "drive")]
    "drive",
    #[cfg(feature = "chat")]
    "chat",
    #[cfg(feature = "mail")]
    "mail",
    #[cfg(feature = "tasks")]
    "tasks",
    #[cfg(feature = "calendar")]
    "calendar",
    #[cfg(feature = "meet")]
    "meet",
    // Document Apps
    #[cfg(feature = "paper")]
    "paper",
    #[cfg(feature = "sheet")]
    "sheet",
    #[cfg(feature = "slides")]
    "slides",
    #[cfg(feature = "docs")]
    "docs",
    // Research & Learning
    #[cfg(feature = "research")]
    "research",
    #[cfg(feature = "sources")]
    "sources",
    #[cfg(feature = "learn")]
    "learn",
    // Analytics
    #[cfg(feature = "analytics")]
    "analytics",
    #[cfg(feature = "dashboards")]
    "dashboards",
    #[cfg(feature = "monitoring")]
    "monitoring",
    // Admin & Tools
    #[cfg(feature = "admin")]
    "admin",
    #[cfg(feature = "attendant")]
    "attendant",
    #[cfg(feature = "tools")]
    "tools",
    // Media
    #[cfg(feature = "video")]
    "video",
    #[cfg(feature = "player")]
    "player",
    #[cfg(feature = "canvas")]
    "canvas",
    // Social
    #[cfg(feature = "social")]
    "social",
    #[cfg(feature = "people")]
    "people",
    #[cfg(feature = "people")]
    "crm",
    #[cfg(feature = "tickets")]
    "tickets",
    // Business
    #[cfg(feature = "billing")]
    "billing",
    #[cfg(feature = "products")]
    "products",
    // Development
    #[cfg(feature = "designer")]
    "designer",
    #[cfg(feature = "workspace")]
    "workspace",
    #[cfg(feature = "project")]
    "project",
    #[cfg(feature = "goals")]
    "goals",
];

const ROOT_FILES: &[&str] = &[
    "designer.html",
    "designer.css",
    "designer.js",
    "editor.html",
    "editor.css",
    "editor.js",
    "home.html",
    "base.html",
    "base-layout.html",
    "base-layout.css",
    "default.gbui",
    "single.gbui",
];

pub async fn index() -> impl IntoResponse {
    serve_suite().await
}

pub fn get_ui_root() -> PathBuf {
    let candidates = [
        "ui",
        "botui/ui",
        "../botui/ui",
        "../../botui/ui",
        "../../../botui/ui",
    ];

    for path_str in candidates {
        let path = PathBuf::from(path_str);
        if path.exists() {
            info!("Found UI root at: {:?}", path);
            return path;
        }
    }

    // Fallback to "ui" but log a warning
    let default = PathBuf::from("ui");
    error!(
        "Could not find 'ui' directory in candidates: {:?}. Defaulting to 'ui' (CWD: {:?})",
        candidates,
        std::env::current_dir()
    );
    default
}

pub async fn serve_minimal() -> impl IntoResponse {
    let html_res = {
        #[cfg(feature = "embed-ui")]
        {
            Assets::get("minimal/index.html")
                .map(|f| String::from_utf8(f.data.into_owned()).map_err(|e| e.to_string()))
                .unwrap_or(Err("Asset not found".to_string()))
        }
        #[cfg(not(feature = "embed-ui"))]
        {
            let path = get_ui_root().join("minimal/index.html");
            fs::read_to_string(&path).map_err(|e| {
                format!(
                    "Failed to read {:?} (CWD: {:?}): {}",
                    path,
                    std::env::current_dir(),
                    e
                )
            })
        }
    };

    match html_res {
        Ok(html) => (StatusCode::OK, [("content-type", "text/html")], Html(html)),
        Err(e) => {
            error!("Failed to load minimal UI: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                [("content-type", "text/plain")],
                Html("Failed to load minimal interface".to_string()),
            )
        }
    }
}

pub async fn serve_suite() -> impl IntoResponse {
    let raw_html_res = {
        #[cfg(feature = "embed-ui")]
        {
            match Assets::get("suite/index.html") {
                Some(f) => String::from_utf8(f.data.into_owned()).map_err(|e| e.to_string()),
                None => {
                    let path = get_ui_root().join("suite/index.html");
                    log::warn!("Asset 'suite/index.html' not found in embedded binary, falling back to filesystem: {:?}", path);
                    fs::read_to_string(&path).map_err(|e| {
                        format!(
                            "Asset not found in binary AND failed to read {:?} (CWD: {:?}): {}",
                            path,
                            std::env::current_dir(),
                            e
                        )
                    })
                }
            }
        }
        #[cfg(not(feature = "embed-ui"))]
        {
            let path = get_ui_root().join("suite/index.html");
            fs::read_to_string(&path).map_err(|e| {
                format!(
                    "Failed to read {:?} (CWD: {:?}): {}",
                    path,
                    std::env::current_dir(),
                    e
                )
            })
        }
    };

    match raw_html_res {
        Ok(raw_html) => {
            #[allow(unused_mut)] // Mutable required for feature-gated blocks
            let mut html = raw_html;

            // Core Apps
            #[cfg(not(feature = "chat"))]
            {
                html = remove_section(&html, "chat");
            }
            #[cfg(not(feature = "mail"))]
            {
                html = remove_section(&html, "mail");
            }
            #[cfg(not(feature = "calendar"))]
            {
                html = remove_section(&html, "calendar");
            }
            #[cfg(not(feature = "drive"))]
            {
                html = remove_section(&html, "drive");
            }
            #[cfg(not(feature = "tasks"))]
            {
                html = remove_section(&html, "tasks");
            }
            #[cfg(not(feature = "meet"))]
            {
                html = remove_section(&html, "meet");
            }

            // Documents
            #[cfg(not(feature = "docs"))]
            {
                html = remove_section(&html, "docs");
            }
            #[cfg(not(feature = "sheet"))]
            {
                html = remove_section(&html, "sheet");
            }
            #[cfg(not(feature = "slides"))]
            {
                html = remove_section(&html, "slides");
            }
            #[cfg(not(feature = "paper"))]
            {
                html = remove_section(&html, "paper");
            }

            // Research
            #[cfg(not(feature = "research"))]
            {
                html = remove_section(&html, "research");
            }
            #[cfg(not(feature = "sources"))]
            {
                html = remove_section(&html, "sources");
            }
            #[cfg(not(feature = "learn"))]
            {
                html = remove_section(&html, "learn");
            }

            // Analytics
            #[cfg(not(feature = "analytics"))]
            {
                html = remove_section(&html, "analytics");
            }
            #[cfg(not(feature = "dashboards"))]
            {
                html = remove_section(&html, "dashboards");
            }
            #[cfg(not(feature = "monitoring"))]
            {
                html = remove_section(&html, "monitoring");
            }

            // Business
            #[cfg(not(feature = "people"))]
            {
                html = remove_section(&html, "people");
                html = remove_section(&html, "crm");
            }
            #[cfg(not(feature = "billing"))]
            {
                html = remove_section(&html, "billing");
            }
            #[cfg(not(feature = "products"))]
            {
                html = remove_section(&html, "products");
            }
            #[cfg(not(feature = "tickets"))]
            {
                html = remove_section(&html, "tickets");
            }

            // Media
            #[cfg(not(feature = "video"))]
            {
                html = remove_section(&html, "video");
            }
            #[cfg(not(feature = "player"))]
            {
                html = remove_section(&html, "player");
            }
            #[cfg(not(feature = "canvas"))]
            {
                html = remove_section(&html, "canvas");
            }

            // Social & Project
            #[cfg(not(feature = "social"))]
            {
                html = remove_section(&html, "social");
            }
            #[cfg(not(feature = "project"))]
            {
                html = remove_section(&html, "project");
            }
            #[cfg(not(feature = "goals"))]
            {
                html = remove_section(&html, "goals");
            }
            #[cfg(not(feature = "workspace"))]
            {
                html = remove_section(&html, "workspace");
            }

            // Admin/Tools
            #[cfg(not(feature = "admin"))]
            {
                html = remove_section(&html, "admin");
            }
            // Mapped security to tools feature
            #[cfg(not(feature = "tools"))]
            {
                html = remove_section(&html, "security");
            }
            #[cfg(not(feature = "attendant"))]
            {
                html = remove_section(&html, "attendant");
            }
            #[cfg(not(feature = "designer"))]
            {
                html = remove_section(&html, "designer");
            }
            #[cfg(not(feature = "editor"))]
            {
                html = remove_section(&html, "editor");
            }
            #[cfg(not(feature = "settings"))]
            {
                html = remove_section(&html, "settings");
            }

            (StatusCode::OK, [("content-type", "text/html")], Html(html))
        }
        Err(e) => {
            error!("Failed to load suite UI: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                [("content-type", "text/plain")],
                Html("Failed to load suite interface".to_string()),
            )
        }
    }
}

#[allow(dead_code)]
pub fn remove_section(html: &str, section: &str) -> String {
    let start_marker = format!("<!-- SECTION:{} -->", section);
    let end_marker = format!("<!-- ENDSECTION:{} -->", section);

    let mut result = String::with_capacity(html.len());
    let mut current_pos = 0;

    // Process multiple occurrences of the section
    while let Some(start_idx) = html[current_pos..].find(&start_marker) {
        let abs_start = current_pos + start_idx;
        // Append content up to the marker
        result.push_str(&html[current_pos..abs_start]);

        // Find end marker
        if let Some(end_idx) = html[abs_start..].find(&end_marker) {
            // Skip past the end marker
            current_pos = abs_start + end_idx + end_marker.len();
        } else {
            // No end marker? This shouldn't happen with our script,
            // but if it does, just skip the start marker and continue
            // or consume everything?
            // Safety: Skip start marker only
            current_pos = abs_start + start_marker.len();
        }
    }

    // Append remaining content
    result.push_str(&html[current_pos..]);
    result
}

async fn health(State(state): State<AppState>) -> (StatusCode, axum::Json<serde_json::Value>) {
    if state.health_check().await {
        (
            StatusCode::OK,
            axum::Json(serde_json::json!({
                "status": "healthy",
                "service": "botui",
                "mode": "web"
            })),
        )
    } else {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            axum::Json(serde_json::json!({
                "status": "unhealthy",
                "service": "botui",
                "error": "botserver unreachable"
            })),
        )
    }
}

async fn api_health() -> (StatusCode, axum::Json<serde_json::Value>) {
    (
        StatusCode::OK,
        axum::Json(serde_json::json!({
            "status": "ok",
            "version": env!("CARGO_PKG_VERSION")
        })),
    )
}

fn extract_app_context(headers: &axum::http::HeaderMap, path: &str) -> Option<String> {
    if let Some(referer) = headers.get("referer") {
        if let Ok(referer_str) = referer.to_str() {
            if let Some(start) = referer_str.find("/apps/") {
                let after_apps = &referer_str[start + 6..];
                if let Some(end) = after_apps.find('/') {
                    return Some(after_apps[..end].to_string());
                } else if !after_apps.is_empty() {
                    return Some(after_apps.to_string());
                }
            }
        }
    }

    if let Some(after_apps) = path.strip_prefix("/apps/") {
        if let Some(end) = after_apps.find('/') {
            return Some(after_apps[..end].to_string());
        }
    }

    None
}

async fn proxy_api(
    State(state): State<AppState>,
    original_uri: OriginalUri,
    req: Request<Body>,
) -> Response<Body> {
    let path = original_uri.path();
    let query = original_uri
        .query()
        .map_or_else(String::new, |q| format!("?{q}"));
    let method = req.method().clone();
    let headers = req.headers().clone();

    let app_context = extract_app_context(&headers, path);

    let target_url = format!("{}{path}{query}", state.client.base_url());
    debug!("Proxying {method} {path} to {target_url} (app: {app_context:?})");

    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());
    let mut proxy_req = client.request(method.clone(), &target_url);

    for (name, value) in &headers {
        if name != "host" {
            if let Ok(v) = value.to_str() {
                proxy_req = proxy_req.header(name.as_str(), v);
            }
        }
    }

    if let Some(app) = app_context {
        proxy_req = proxy_req.header("X-App-Context", app);
    }

    let body_bytes = match axum::body::to_bytes(req.into_body(), usize::MAX).await {
        Ok(bytes) => bytes,
        Err(e) => {
            error!("Failed to read request body: {e}");
            return build_error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to read request body",
            );
        }
    };

    if !body_bytes.is_empty() {
        proxy_req = proxy_req.body(body_bytes.to_vec());
    }

    match proxy_req.send().await {
        Ok(resp) => build_proxy_response(resp).await,
        Err(e) => {
            error!("Proxy request failed: {e}");
            build_error_response(StatusCode::BAD_GATEWAY, &format!("Proxy error: {e}"))
        }
    }
}

fn build_error_response(status: StatusCode, message: &str) -> Response<Body> {
    Response::builder()
        .status(status)
        .body(Body::from(message.to_string()))
        .unwrap_or_else(|_| {
            Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from("Failed to build error response"))
                .unwrap_or_default()
        })
}

async fn build_proxy_response(resp: reqwest::Response) -> Response<Body> {
    let status = resp.status();
    let headers = resp.headers().clone();

    match resp.bytes().await {
        Ok(body) => {
            let mut response = Response::builder().status(status);

            for (name, value) in &headers {
                response = response.header(name, value);
            }

            response.body(Body::from(body)).unwrap_or_else(|_| {
                build_error_response(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to build response",
                )
            })
        }
        Err(e) => {
            error!("Failed to read response body: {e}");
            build_error_response(
                StatusCode::BAD_GATEWAY,
                &format!("Failed to read response: {e}"),
            )
        }
    }
}

fn create_api_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(api_health))
        .fallback(any(proxy_api))
}

#[derive(Debug, Deserialize)]
struct WsQuery {
    session_id: String,
    user_id: String,
}

#[derive(Debug, Default, Deserialize)]
struct OptionalWsQuery {
    task_id: Option<String>,
}

async fn ws_proxy(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(params): Query<WsQuery>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_ws_proxy(socket, state, params))
}

async fn ws_task_progress_proxy(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(params): Query<OptionalWsQuery>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_task_progress_ws_proxy(socket, state, params))
}

async fn handle_task_progress_ws_proxy(
    client_socket: WebSocket,
    state: AppState,
    params: OptionalWsQuery,
) {
    let mut backend_url = format!(
        "{}/ws/task-progress",
        state
            .client
            .base_url()
            .replace("https://", "wss://")
            .replace("http://", "ws://"),
    );

    if let Some(task_id) = &params.task_id {
        backend_url = format!("{}/{}", backend_url, task_id);
    }

    info!("Proxying task-progress WebSocket to: {backend_url}");

    let Ok(tls_connector) = native_tls::TlsConnector::builder()
        .danger_accept_invalid_certs(true)
        .danger_accept_invalid_hostnames(true)
        .build()
    else {
        error!("Failed to build TLS connector for task-progress");
        return;
    };

    let connector = tokio_tungstenite::Connector::NativeTls(tls_connector);

    let backend_result =
        connect_async_tls_with_config(&backend_url, None, false, Some(connector)).await;

    let backend_socket: tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    > = match backend_result {
        Ok((socket, _)) => socket,
        Err(e) => {
            error!("Failed to connect to backend task-progress WebSocket: {e}");
            return;
        }
    };

    info!("Connected to backend task-progress WebSocket");

    let (mut client_tx, mut client_rx) = client_socket.split();
    let (mut backend_tx, mut backend_rx) = backend_socket.split();

    let client_to_backend = async {
        while let Some(msg) = client_rx.next().await {
            match msg {
                Ok(AxumMessage::Text(text)) => {
                    let res: Result<(), tungstenite::Error> =
                        backend_tx.send(TungsteniteMessage::Text(text)).await;
                    if res.is_err() {
                        break;
                    }
                }
                Ok(AxumMessage::Binary(data)) => {
                    let res: Result<(), tungstenite::Error> =
                        backend_tx.send(TungsteniteMessage::Binary(data)).await;
                    if res.is_err() {
                        break;
                    }
                }
                Ok(AxumMessage::Ping(data)) => {
                    let res: Result<(), tungstenite::Error> =
                        backend_tx.send(TungsteniteMessage::Ping(data)).await;
                    if res.is_err() {
                        break;
                    }
                }
                Ok(AxumMessage::Pong(data)) => {
                    let res: Result<(), tungstenite::Error> =
                        backend_tx.send(TungsteniteMessage::Pong(data)).await;
                    if res.is_err() {
                        break;
                    }
                }
                Ok(AxumMessage::Close(_)) | Err(_) => break,
            }
        }
    };

    let backend_to_client = async {
        while let Some(msg) =
            backend_rx.next().await as Option<Result<TungsteniteMessage, tungstenite::Error>>
        {
            match msg {
                Ok(TungsteniteMessage::Text(text)) => {
                    // Log manifest_update messages for debugging
                    let is_manifest = text.contains("manifest_update");
                    if is_manifest {
                        info!(
                            "[WS_PROXY] Forwarding manifest_update to client: {}...",
                            &text[..text.len().min(200)]
                        );
                    } else if text.contains("task_progress") {
                        debug!("[WS_PROXY] Forwarding task_progress to client");
                    }
                    match client_tx.send(AxumMessage::Text(text)).await {
                        Ok(()) => {
                            if is_manifest {
                                info!("[WS_PROXY] manifest_update SENT successfully to client");
                            }
                        }
                        Err(e) => {
                            error!("[WS_PROXY] Failed to send message to client: {:?}", e);
                            break;
                        }
                    }
                }
                Ok(TungsteniteMessage::Binary(data)) => {
                    if client_tx.send(AxumMessage::Binary(data)).await.is_err() {
                        break;
                    }
                }
                Ok(TungsteniteMessage::Ping(data)) => {
                    if client_tx.send(AxumMessage::Ping(data)).await.is_err() {
                        break;
                    }
                }
                Ok(TungsteniteMessage::Pong(data)) => {
                    if client_tx.send(AxumMessage::Pong(data)).await.is_err() {
                        break;
                    }
                }
                Ok(TungsteniteMessage::Close(_)) | Err(_) => break,
                Ok(_) => {}
            }
        }
    };

    tokio::select! {
        () = client_to_backend => info!("Task-progress client connection closed"),
        () = backend_to_client => info!("Task-progress backend connection closed"),
    }
}

#[allow(clippy::too_many_lines)]
async fn handle_ws_proxy(client_socket: WebSocket, state: AppState, params: WsQuery) {
    let backend_url = format!(
        "{}/ws?session_id={}&user_id={}",
        state
            .client
            .base_url()
            .replace("https://", "wss://")
            .replace("http://", "ws://"),
        params.session_id,
        params.user_id
    );

    info!("Proxying WebSocket to: {backend_url}");

    let Ok(tls_connector) = native_tls::TlsConnector::builder()
        .danger_accept_invalid_certs(true)
        .danger_accept_invalid_hostnames(true)
        .build()
    else {
        error!("Failed to build TLS connector");
        return;
    };

    let connector = tokio_tungstenite::Connector::NativeTls(tls_connector);

    let backend_result =
        connect_async_tls_with_config(&backend_url, None, false, Some(connector)).await;

    let backend_socket: tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    > = match backend_result {
        Ok((socket, _)) => socket,
        Err(e) => {
            error!("Failed to connect to backend WebSocket: {e}");
            return;
        }
    };

    info!("Connected to backend WebSocket");

    let (mut client_tx, mut client_rx) = client_socket.split();
    let (mut backend_tx, mut backend_rx) = backend_socket.split();

    let client_to_backend = async {
        while let Some(msg) = client_rx.next().await {
            match msg {
                Ok(AxumMessage::Text(text)) => {
                    let res: Result<(), tungstenite::Error> =
                        backend_tx.send(TungsteniteMessage::Text(text)).await;
                    if res.is_err() {
                        break;
                    }
                }
                Ok(AxumMessage::Binary(data)) => {
                    let res: Result<(), tungstenite::Error> =
                        backend_tx.send(TungsteniteMessage::Binary(data)).await;
                    if res.is_err() {
                        break;
                    }
                }
                Ok(AxumMessage::Ping(data)) => {
                    let res: Result<(), tungstenite::Error> =
                        backend_tx.send(TungsteniteMessage::Ping(data)).await;
                    if res.is_err() {
                        break;
                    }
                }
                Ok(AxumMessage::Pong(data)) => {
                    let res: Result<(), tungstenite::Error> =
                        backend_tx.send(TungsteniteMessage::Pong(data)).await;
                    if res.is_err() {
                        break;
                    }
                }
                Ok(AxumMessage::Close(_)) | Err(_) => break,
            }
        }
    };

    let backend_to_client = async {
        while let Some(msg) = backend_rx.next().await {
            match msg {
                Ok(TungsteniteMessage::Text(text)) => {
                    if client_tx.send(AxumMessage::Text(text)).await.is_err() {
                        break;
                    }
                }
                Ok(TungsteniteMessage::Binary(data)) => {
                    if client_tx.send(AxumMessage::Binary(data)).await.is_err() {
                        break;
                    }
                }
                Ok(TungsteniteMessage::Ping(data)) => {
                    if client_tx.send(AxumMessage::Ping(data)).await.is_err() {
                        break;
                    }
                }
                Ok(TungsteniteMessage::Pong(data)) => {
                    if client_tx.send(AxumMessage::Pong(data)).await.is_err() {
                        break;
                    }
                }
                Ok(TungsteniteMessage::Close(_)) | Err(_) => break,
                Ok(_) => {}
            }
        }
    };

    tokio::select! {
        () = client_to_backend => info!("Client connection closed"),
        () = backend_to_client => info!("Backend connection closed"),
    }
}

fn create_ws_router() -> Router<AppState> {
    Router::new()
        .route("/task-progress", get(ws_task_progress_proxy))
        .route("/task-progress/:task_id", get(ws_task_progress_proxy))
        .fallback(any(ws_proxy))
}

fn create_apps_router() -> Router<AppState> {
    Router::new().fallback(any(proxy_api))
}

fn create_ui_router() -> Router<AppState> {
    Router::new().fallback(any(proxy_api))
}

async fn serve_favicon() -> impl IntoResponse {
    #[cfg(feature = "embed-ui")]
    {
        match Assets::get("suite/public/favicon.ico") {
            Some(content) => (
                StatusCode::OK,
                [("content-type", "image/x-icon")],
                content.data,
            )
                .into_response(),
            None => StatusCode::NOT_FOUND.into_response(),
        }
    }
    #[cfg(not(feature = "embed-ui"))]
    {
        let favicon_path = get_ui_root().join("suite/public/favicon.ico");
        match tokio::fs::read(&favicon_path).await {
            Ok(bytes) => {
                (StatusCode::OK, [("content-type", "image/x-icon")], bytes).into_response()
            }
            Err(_) => StatusCode::NOT_FOUND.into_response(),
        }
    }
}

#[cfg(feature = "embed-ui")]
async fn handle_embedded_asset(
    axum::extract::Path((dir, path)): axum::extract::Path<(String, String)>,
) -> impl IntoResponse {
    if !SUITE_DIRS.contains(&dir.as_str()) {
        return StatusCode::NOT_FOUND.into_response();
    }

    let asset_path = format!("suite/{}/{}", dir, path);
    match Assets::get(&asset_path) {
        Some(content) => {
            let mime = mime_guess::from_path(&asset_path).first_or_octet_stream();
            (
                [(axum::http::header::CONTENT_TYPE, mime.as_ref())],
                content.data,
            )
                .into_response()
        }
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

#[cfg(feature = "embed-ui")]
async fn handle_embedded_root_asset(
    axum::extract::Path(filename): axum::extract::Path<String>,
) -> impl IntoResponse {
    if !ROOT_FILES.contains(&filename.as_str()) {
        return StatusCode::NOT_FOUND.into_response();
    }

    let asset_path = format!("suite/{}", filename);
    match Assets::get(&asset_path) {
        Some(content) => {
            let mime = mime_guess::from_path(&asset_path).first_or_octet_stream();
            (
                [(axum::http::header::CONTENT_TYPE, mime.as_ref())],
                content.data,
            )
                .into_response()
        }
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

fn add_static_routes(router: Router<AppState>, _suite_path: &Path) -> Router<AppState> {
    #[cfg(feature = "embed-ui")]
    {
        let mut r = router
            .route("/suite/:dir/*path", get(handle_embedded_asset))
            .route("/:dir/*path", get(handle_embedded_asset));

        // Add root files
        for file in ROOT_FILES {
            r = r
                .route(&format!("/{}", file), get(handle_embedded_root_asset))
                .route(&format!("/suite/{}", file), get(handle_embedded_root_asset));
        }
        r
    }
    #[cfg(not(feature = "embed-ui"))]
    {
        let mut r = router;
        for dir in SUITE_DIRS {
            let path = _suite_path.join(dir);
            r = r
                .nest_service(&format!("/suite/{dir}"), ServeDir::new(path.clone()))
                .nest_service(&format!("/{dir}"), ServeDir::new(path));
        }

        for file in ROOT_FILES {
            let path = _suite_path.join(file);
            r = r
                .nest_service(&format!("/{}", file), ServeFile::new(path.clone()))
                .nest_service(&format!("/suite/{}", file), ServeFile::new(path));
        }
        r
    }
}

pub fn configure_router() -> Router {
    let suite_path = get_ui_root().join("suite");
    let state = AppState::new();

    let mut router = Router::new()
        .route("/health", get(health))
        .nest("/api", create_api_router())
        .nest("/ui", create_ui_router())
        .nest("/ws", create_ws_router())
        .nest("/apps", create_apps_router())
        .route("/", get(index))
        .route("/minimal", get(serve_minimal))
        .route("/suite", get(serve_suite))
        .route("/favicon.ico", get(serve_favicon));

    router = add_static_routes(router, &suite_path);

    router.fallback(get(index)).with_state(state)
}
