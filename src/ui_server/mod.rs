
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
use serde::Deserialize;
use std::{fs, path::Path, path::PathBuf};
use tokio_tungstenite::{
    connect_async_tls_with_config, tungstenite::protocol::Message as TungsteniteMessage,
};
use tower_http::services::ServeDir;

use crate::shared::AppState;

const SUITE_DIRS: &[&str] = &[
    "js",
    "css",
    "public",
    "drive",
    "chat",
    "mail",
    "tasks",
    "calendar",
    "meet",
    "paper",
    "sheet",
    "slides",
    "docs",
    "research",
    "analytics",
    "monitoring",
    "admin",
    "auth",
    "settings",
    "sources",
    "attendant",
    "tools",
    "assets",
    "partials",
    "video",
    "learn",
    "social",
    "dashboards",
    "designer",
    "workspace",
    "project",
    "goals",
    "player",
    "canvas",
    "people",
    "crm",
    "billing",
    "products",
    "tickets",
    "about",
];

pub async fn index() -> impl IntoResponse {
    serve_suite().await
}

pub async fn serve_minimal() -> impl IntoResponse {
    match fs::read_to_string("ui/minimal/index.html") {
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
    match fs::read_to_string("ui/suite/index.html") {
        Ok(html) => (StatusCode::OK, [("content-type", "text/html")], Html(html)),
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

    let backend_socket = match backend_result {
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
                    if backend_tx
                        .send(TungsteniteMessage::Text(text))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                Ok(AxumMessage::Binary(data)) => {
                    if backend_tx
                        .send(TungsteniteMessage::Binary(data))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                Ok(AxumMessage::Ping(data)) => {
                    if backend_tx
                        .send(TungsteniteMessage::Ping(data))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                Ok(AxumMessage::Pong(data)) => {
                    if backend_tx
                        .send(TungsteniteMessage::Pong(data))
                        .await
                        .is_err()
                    {
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
                    // Log manifest_update messages for debugging
                    let is_manifest = text.contains("manifest_update");
                    if is_manifest {
                        info!("[WS_PROXY] Forwarding manifest_update to client: {}...", &text[..text.len().min(200)]);
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

    let backend_socket = match backend_result {
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
                    if backend_tx
                        .send(TungsteniteMessage::Text(text))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                Ok(AxumMessage::Binary(data)) => {
                    if backend_tx
                        .send(TungsteniteMessage::Binary(data))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                Ok(AxumMessage::Ping(data)) => {
                    if backend_tx
                        .send(TungsteniteMessage::Ping(data))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                Ok(AxumMessage::Pong(data)) => {
                    if backend_tx
                        .send(TungsteniteMessage::Pong(data))
                        .await
                        .is_err()
                    {
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
    let favicon_path = PathBuf::from("./ui/suite/public/favicon.ico");
    match tokio::fs::read(&favicon_path).await {
        Ok(bytes) => (
            StatusCode::OK,
            [("content-type", "image/x-icon")],
            bytes,
        ).into_response(),
        Err(_) => StatusCode::NOT_FOUND.into_response(),
    }
}

fn add_static_routes(router: Router<AppState>, suite_path: &Path) -> Router<AppState> {
    let mut r = router;

    for dir in SUITE_DIRS {
        let path = suite_path.join(dir);
        r = r
            .nest_service(&format!("/suite/{dir}"), ServeDir::new(path.clone()))
            .nest_service(&format!("/{dir}"), ServeDir::new(path));
    }

    r
}

pub fn configure_router() -> Router {
    let suite_path = PathBuf::from("./ui/suite");
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

    router
        .fallback_service(
            ServeDir::new(suite_path.clone())
                .fallback(ServeDir::new(suite_path).append_index_html_on_directories(true)),
        )
        .with_state(state)
}
