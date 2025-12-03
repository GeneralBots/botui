#![cfg(not(feature = "desktop"))]

use axum::{extract::State, http::StatusCode, Json};
use serde_json::json;
use std::sync::Arc;

use crate::http_client::BotServerClient;

/// Health check endpoint
pub async fn health(
    State(client): State<Arc<BotServerClient>>,
) -> (StatusCode, Json<serde_json::Value>) {
    match client.health_check().await {
        true => (
            StatusCode::OK,
            Json(json!({
                "status": "healthy",
                "service": "botui",
                "mode": "web"
            })),
        ),
        false => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({
                "status": "unhealthy",
                "service": "botui",
                "error": "botserver unreachable"
            })),
        ),
    }
}

/// API health check endpoint
pub async fn api_health() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::OK,
        Json(json!({
            "status": "ok",
            "version": "1.0.0"
        })),
    )
}

/// Root endpoint
pub async fn root() -> Json<serde_json::Value> {
    Json(json!({
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
