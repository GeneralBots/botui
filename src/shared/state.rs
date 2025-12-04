//! Application state management
//!
//! This module contains the shared application state that is passed to all
//! route handlers and provides access to the BotServer client.

use botlib::http_client::BotServerClient;
use std::sync::Arc;

/// Application state shared across all handlers
#[derive(Clone)]
pub struct AppState {
    /// HTTP client for communicating with BotServer
    pub client: Arc<BotServerClient>,
}

impl AppState {
    /// Create a new application state
    ///
    /// Uses BOTSERVER_URL environment variable if set, otherwise defaults to localhost:8080
    pub fn new() -> Self {
        let url = std::env::var("BOTSERVER_URL").ok();
        Self {
            client: Arc::new(BotServerClient::new(url)),
        }
    }

    /// Check if the BotServer is healthy
    pub async fn health_check(&self) -> bool {
        self.client.health_check().await
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
