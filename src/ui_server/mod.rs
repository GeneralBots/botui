//! UI Server module for BotUI
//!
//! Serves the web UI (suite, minimal) and handles API proxying.

use axum::{
    extract::State,
    http::StatusCode,
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use log::error;
use std::{fs, path::PathBuf};

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

/// Configure and return the main router
pub fn configure_router() -> Router {
    let suite_path = PathBuf::from("./ui/suite");
    let _minimal_path = PathBuf::from("./ui/minimal");
    let state = AppState::new();

    Router::new()
        // Health check endpoints
        .route("/health", get(health))
        .route("/api/health", get(api_health))
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
        // Fallback for other static files (serve suite by default)
        .fallback_service(
            tower_http::services::ServeDir::new(suite_path.clone()).fallback(
                tower_http::services::ServeDir::new(suite_path)
                    .append_index_html_on_directories(true),
            ),
        )
        .with_state(state)
}
