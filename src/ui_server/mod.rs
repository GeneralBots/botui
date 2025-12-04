//! UI Server module for BotUI
//!
//! Serves the web UI (suite, minimal) and handles API proxying.

#![allow(dead_code)] // Some functions prepared for future use

use axum::{
    extract::State,
    http::StatusCode,
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use log::error;
use std::{fs, path::PathBuf, sync::Arc};
use tower_http::services::ServeDir;

use botlib::http_client::BotServerClient;

// Serve minimal UI (default at /)
pub async fn index() -> impl IntoResponse {
    serve_minimal().await
}

// Handler for minimal UI
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

// Handler for suite UI
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

pub fn configure_router() -> Router {
    let suite_path = PathBuf::from("./ui/suite");
    let minimal_path = PathBuf::from("./ui/minimal");
    let client = Arc::new(BotServerClient::new(None));

    Router::new()
        // API health check
        .route("/health", get(health))
        .route("/api/health", get(api_health))
        // Default route serves minimal UI
        .route("/", get(root))
        .route("/minimal", get(serve_minimal))
        // Suite UI route
        .route("/suite", get(serve_suite))
        // Suite static assets (when accessing /suite/*)
        .nest_service("/suite/js", ServeDir::new(suite_path.join("js")))
        .nest_service("/suite/css", ServeDir::new(suite_path.join("css")))
        .nest_service("/suite/public", ServeDir::new(suite_path.join("public")))
        .nest_service("/suite/drive", ServeDir::new(suite_path.join("drive")))
        .nest_service("/suite/chat", ServeDir::new(suite_path.join("chat")))
        .nest_service("/suite/mail", ServeDir::new(suite_path.join("mail")))
        .nest_service("/suite/tasks", ServeDir::new(suite_path.join("tasks")))
        // Legacy paths for backward compatibility (serve suite assets)
        .nest_service("/js", ServeDir::new(suite_path.join("js")))
        .nest_service("/css", ServeDir::new(suite_path.join("css")))
        .nest_service("/public", ServeDir::new(suite_path.join("public")))
        .nest_service("/drive", ServeDir::new(suite_path.join("drive")))
        .nest_service("/chat", ServeDir::new(suite_path.join("chat")))
        .nest_service("/mail", ServeDir::new(suite_path.join("mail")))
        .nest_service("/tasks", ServeDir::new(suite_path.join("tasks")))
        // Fallback for other static files
        .fallback_service(
            ServeDir::new(minimal_path.clone()).fallback(
                ServeDir::new(minimal_path.clone()).append_index_html_on_directories(true),
            ),
        )
        .with_state(client)
}

async fn health(
    State(client): State<Arc<BotServerClient>>,
) -> (StatusCode, axum::Json<serde_json::Value>) {
    match client.health_check().await {
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

async fn api_health() -> (StatusCode, axum::Json<serde_json::Value>) {
    (
        StatusCode::OK,
        axum::Json(serde_json::json!({
            "status": "ok",
            "version": "1.0.0"
        })),
    )
}

async fn root() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "service": "BotUI",
        "version": "1.0.0",
        "description": "General Bots User Interface",
        "endpoints": {
            "health": "/health",
            "api": "/api/health",
            "ui": "/"
        }
    }))
}
