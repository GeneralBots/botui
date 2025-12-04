//! BotUI - General Bots Pure Web UI
//!
//! This crate provides the web UI layer for General Bots:
//! - Serves static HTMX UI files (suite, minimal)
//! - Proxies API requests to botserver
//! - WebSocket support for real-time communication
//!
//! For desktop/mobile native features, see the `botapp` crate which
//! wraps this pure web UI with Tauri.

// Re-export common types from botlib
pub use botlib::{
    branding, error, init_branding, is_white_label, platform_name, platform_short, ApiResponse,
    BotError, BotResponse, BotResult, MessageType, Session, Suggestion, UserMessage,
};

// HTTP client is always available via botlib
pub use botlib::BotServerClient;

pub mod shared;

#[cfg(feature = "ui-server")]
pub mod ui_server;

#[cfg(feature = "ui-server")]
pub mod web;

// Re-exports
pub use shared::*;

#[cfg(feature = "ui-server")]
pub use ui_server::*;
