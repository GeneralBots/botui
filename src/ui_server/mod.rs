//! UI Server module for BotUI
//!
//! Serves the web UI (suite, minimal) and handles API proxying.

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
use std::{fs, path::PathBuf};
use tokio_tungstenite::{
    connect_async_tls_with_config,
    tungstenite::{self, protocol::Message as TungsteniteMessage},
};

use crate::shared::AppState;

/// Serve the index page (suite UI)
pub async fn index() -> impl IntoResponse {
    serve_suite().await
}

/// Handler for minimal UI
pub async fn serve_minimal() -> impl IntoResponse {
    match fs::read_to_string("ui/minimal/index.html") {
        Ok(html) => (StatusCode::OK, [("content-type", "text/html")], Html(html)),
        Err(e) => {
            error!("Failed to load minimal UI: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                [("content-type", "text/plain")],
                Html("Failed to load minimal interface".to_string()),
            )
        }
    }
}

/// Handler for suite UI
pub async fn serve_suite() -> impl IntoResponse {
    match fs::read_to_string("ui/suite/index.html") {
        Ok(html) => (StatusCode::OK, [("content-type", "text/html")], Html(html)),
        Err(e) => {
            error!("Failed to load suite UI: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                [("content-type", "text/plain")],
                Html("Failed to load suite interface".to_string()),
            )
        }
    }
}

/// Health check endpoint - checks BotServer connectivity
async fn health(State(state): State<AppState>) -> (StatusCode, axum::Json<serde_json::Value>) {
    match state.health_check().await {
        true => (
            StatusCode::OK,
            axum::Json(serde_json::json!({
                "status": "healthy",
                "service": "botui",
                "mode": "web"
            })),
        ),
        false => (
            StatusCode::SERVICE_UNAVAILABLE,
            axum::Json(serde_json::json!({
                "status": "unhealthy",
                "service": "botui",
                "error": "botserver unreachable"
            })),
        ),
    }
}

/// API health check endpoint
async fn api_health() -> (StatusCode, axum::Json<serde_json::Value>) {
    (
        StatusCode::OK,
        axum::Json(serde_json::json!({
            "status": "ok",
            "version": env!("CARGO_PKG_VERSION")
        })),
    )
}

/// Proxy API requests to botserver
async fn proxy_api(
    State(state): State<AppState>,
    original_uri: OriginalUri,
    req: Request<Body>,
) -> Response<Body> {
    let path = original_uri.path();
    let query = original_uri.query().map(|q| format!("?{}", q)).unwrap_or_default();
    let method = req.method().clone();
    let headers = req.headers().clone();
    
    let target_url = format!("{}{}{}", state.client.base_url(), path, query);
    debug!("Proxying {} {} to {}", method, path, target_url);
    
    // Build the proxied request with self-signed cert support
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());
    let mut proxy_req = client.request(method.clone(), &target_url);
    
    // Copy headers (excluding host)
    for (name, value) in headers.iter() {
        if name != "host" {
            if let Ok(v) = value.to_str() {
                proxy_req = proxy_req.header(name.as_str(), v);
            }
        }
    }
    
    // Copy body for non-GET requests
    let body_bytes = match axum::body::to_bytes(req.into_body(), usize::MAX).await {
        Ok(bytes) => bytes,
        Err(e) => {
            error!("Failed to read request body: {}", e);
            return Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from("Failed to read request body"))
                .unwrap();
        }
    };
    
    if !body_bytes.is_empty() {
        proxy_req = proxy_req.body(body_bytes.to_vec());
    }
    
    // Execute the request
    match proxy_req.send().await {
        Ok(resp) => {
            let status = resp.status();
            let headers = resp.headers().clone();
            
            match resp.bytes().await {
                Ok(body) => {
                    let mut response = Response::builder().status(status);
                    
                    // Copy response headers
                    for (name, value) in headers.iter() {
                        response = response.header(name, value);
                    }
                    
                    response.body(Body::from(body)).unwrap_or_else(|_| {
                        Response::builder()
                            .status(StatusCode::INTERNAL_SERVER_ERROR)
                            .body(Body::from("Failed to build response"))
                            .unwrap()
                    })
                }
                Err(e) => {
                    error!("Failed to read response body: {}", e);
                    Response::builder()
                        .status(StatusCode::BAD_GATEWAY)
                        .body(Body::from(format!("Failed to read response: {}", e)))
                        .unwrap()
                }
            }
        }
        Err(e) => {
            error!("Proxy request failed: {}", e);
            Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Body::from(format!("Proxy error: {}", e)))
                .unwrap()
        }
    }
}

/// Create API proxy router
fn create_api_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(api_health))
        .route("/chat", any(proxy_api))
        .route("/sessions", any(proxy_api))
        .route("/sessions/{id}", any(proxy_api))
        .route("/sessions/{id}/history", any(proxy_api))
        .route("/sessions/{id}/start", any(proxy_api))
        .route("/drive/files", any(proxy_api))
        .route("/drive/files/{path}", any(proxy_api))
        .route("/drive/upload", any(proxy_api))
        .route("/drive/download/{path}", any(proxy_api))
        .route("/tasks", any(proxy_api))
        .route("/tasks/{id}", any(proxy_api))
        .fallback(any(proxy_api))
}

/// WebSocket query parameters
#[derive(Debug, Deserialize)]
struct WsQuery {
    session_id: String,
    user_id: String,
}

/// WebSocket proxy handler
async fn ws_proxy(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(params): Query<WsQuery>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_ws_proxy(socket, state, params))
}

/// Handle WebSocket proxy connection
async fn handle_ws_proxy(client_socket: WebSocket, state: AppState, params: WsQuery) {
    let backend_url = format!(
        "{}/ws?session_id={}&user_id={}",
        state.client.base_url().replace("https://", "wss://").replace("http://", "ws://"),
        params.session_id,
        params.user_id
    );
    
    info!("Proxying WebSocket to: {}", backend_url);
    
    // Create TLS connector that accepts self-signed certs
    let tls_connector = native_tls::TlsConnector::builder()
        .danger_accept_invalid_certs(true)
        .danger_accept_invalid_hostnames(true)
        .build()
        .expect("Failed to build TLS connector");
    
    let connector = tokio_tungstenite::Connector::NativeTls(tls_connector);
    
    // Connect to backend WebSocket
    let backend_result = connect_async_tls_with_config(
        &backend_url,
        None,
        false,
        Some(connector),
    ).await;
    
    let backend_socket = match backend_result {
        Ok((socket, _)) => socket,
        Err(e) => {
            error!("Failed to connect to backend WebSocket: {}", e);
            return;
        }
    };
    
    info!("Connected to backend WebSocket");
    
    // Split both sockets
    let (mut client_tx, mut client_rx) = client_socket.split();
    let (mut backend_tx, mut backend_rx) = backend_socket.split();
    
    // Forward messages from client to backend
    let client_to_backend = async {
        while let Some(msg) = client_rx.next().await {
            match msg {
                Ok(AxumMessage::Text(text)) => {
                    if backend_tx.send(TungsteniteMessage::Text(text)).await.is_err() {
                        break;
                    }
                }
                Ok(AxumMessage::Binary(data)) => {
                    if backend_tx.send(TungsteniteMessage::Binary(data)).await.is_err() {
                        break;
                    }
                }
                Ok(AxumMessage::Ping(data)) => {
                    if backend_tx.send(TungsteniteMessage::Ping(data)).await.is_err() {
                        break;
                    }
                }
                Ok(AxumMessage::Pong(data)) => {
                    if backend_tx.send(TungsteniteMessage::Pong(data)).await.is_err() {
                        break;
                    }
                }
                Ok(AxumMessage::Close(_)) | Err(_) => break,
            }
        }
    };
    
    // Forward messages from backend to client
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
                _ => {}
            }
        }
    };
    
    // Run both forwarding tasks concurrently
    tokio::select! {
        _ = client_to_backend => info!("Client connection closed"),
        _ = backend_to_client => info!("Backend connection closed"),
    }
}

/// Create WebSocket proxy router  
fn create_ws_router() -> Router<AppState> {
    Router::new()
        .fallback(get(ws_proxy))
}

/// Configure and return the main router
pub fn configure_router() -> Router {
    let suite_path = PathBuf::from("./ui/suite");
    let _minimal_path = PathBuf::from("./ui/minimal");
    let state = AppState::new();

    Router::new()
        // Health check endpoints
        .route("/health", get(health))
        // API proxy routes
        .nest("/api", create_api_router())
        // WebSocket proxy routes
        .nest("/ws", create_ws_router())
        // UI routes
        .route("/", get(index))
        .route("/minimal", get(serve_minimal))
        .route("/suite", get(serve_suite))
        // Suite static assets (when accessing /suite/*)
        .nest_service(
            "/suite/js",
            tower_http::services::ServeDir::new(suite_path.join("js")),
        )
        .nest_service(
            "/suite/css",
            tower_http::services::ServeDir::new(suite_path.join("css")),
        )
        .nest_service(
            "/suite/public",
            tower_http::services::ServeDir::new(suite_path.join("public")),
        )
        .nest_service(
            "/suite/drive",
            tower_http::services::ServeDir::new(suite_path.join("drive")),
        )
        .nest_service(
            "/suite/chat",
            tower_http::services::ServeDir::new(suite_path.join("chat")),
        )
        .nest_service(
            "/suite/mail",
            tower_http::services::ServeDir::new(suite_path.join("mail")),
        )
        .nest_service(
            "/suite/tasks",
            tower_http::services::ServeDir::new(suite_path.join("tasks")),
        )
        // Legacy paths for backward compatibility (serve suite assets)
        .nest_service(
            "/js",
            tower_http::services::ServeDir::new(suite_path.join("js")),
        )
        .nest_service(
            "/css",
            tower_http::services::ServeDir::new(suite_path.join("css")),
        )
        .nest_service(
            "/public",
            tower_http::services::ServeDir::new(suite_path.join("public")),
        )
        .nest_service(
            "/drive",
            tower_http::services::ServeDir::new(suite_path.join("drive")),
        )
        .nest_service(
            "/chat",
            tower_http::services::ServeDir::new(suite_path.join("chat")),
        )
        .nest_service(
            "/mail",
            tower_http::services::ServeDir::new(suite_path.join("mail")),
        )
        .nest_service(
            "/tasks",
            tower_http::services::ServeDir::new(suite_path.join("tasks")),
        )
        // Additional app routes
        .nest_service(
            "/paper",
            tower_http::services::ServeDir::new(suite_path.join("paper")),
        )
        .nest_service(
            "/calendar",
            tower_http::services::ServeDir::new(suite_path.join("calendar")),
        )
        .nest_service(
            "/research",
            tower_http::services::ServeDir::new(suite_path.join("research")),
        )
        .nest_service(
            "/meet",
            tower_http::services::ServeDir::new(suite_path.join("meet")),
        )
        .nest_service(
            "/analytics",
            tower_http::services::ServeDir::new(suite_path.join("analytics")),
        )
        .nest_service(
            "/monitoring",
            tower_http::services::ServeDir::new(suite_path.join("monitoring")),
        )
        .nest_service(
            "/admin",
            tower_http::services::ServeDir::new(suite_path.join("admin")),
        )
        .nest_service(
            "/auth",
            tower_http::services::ServeDir::new(suite_path.join("auth")),
        )
        .nest_service(
            "/settings",
            tower_http::services::ServeDir::new(suite_path.join("settings")),
        )
        .nest_service(
            "/sources",
            tower_http::services::ServeDir::new(suite_path.join("sources")),
        )
        .nest_service(
            "/tools",
            tower_http::services::ServeDir::new(suite_path.join("tools")),
        )
        .nest_service(
            "/assets",
            tower_http::services::ServeDir::new(suite_path.join("assets")),
        )
        .nest_service(
            "/partials",
            tower_http::services::ServeDir::new(suite_path.join("partials")),
        )
        .nest_service(
            "/attendant",
            tower_http::services::ServeDir::new(suite_path.join("attendant")),
        )
        // Fallback for other static files (serve suite by default)
        .fallback_service(
            tower_http::services::ServeDir::new(suite_path.clone()).fallback(
                tower_http::services::ServeDir::new(suite_path)
                    .append_index_html_on_directories(true),
            ),
        )
        .with_state(state)
}
