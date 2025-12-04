//! BotUI - General Bots Pure Web UI
//!
//! This crate provides the web UI layer for General Bots:
//! - Serves static HTMX UI files (suite, minimal)
//! - Proxies API requests to botserver
//! - WebSocket support for real-time communication
//!
//! For desktop/mobile native features, see the `botapp` crate which
//! wraps this pure web UI with Tauri.

pub mod shared;
pub mod ui_server;

// Re-export commonly used types
pub use shared::AppState;
pub use ui_server::configure_router;
