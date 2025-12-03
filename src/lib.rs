//! BotUI - General Bots Desktop, Web & Mobile UI
//!
//! This crate provides the UI layer for General Bots including:
//! - Desktop application (Tauri)
//! - Web UI server (HTMX backend)
//!
//! Most logic lives in botserver; this crate is primarily for:
//! - Serving static HTMX UI files
//! - Proxying API requests to botserver
//! - Desktop-specific functionality (Tauri)

// Re-export common types from botlib
pub use botlib::{
    branding, error, init_branding, is_white_label, platform_name, platform_short, ApiResponse,
    BotError, BotResponse, BotResult, MessageType, Session, Suggestion, UserMessage,
};

// HTTP client is always available via botlib
pub use botlib::BotServerClient;

#[cfg(feature = "desktop")]
pub mod desktop;

#[cfg(not(feature = "desktop"))]
pub mod http_client;

pub mod shared;

#[cfg(not(feature = "desktop"))]
pub mod ui_server;

#[cfg(not(feature = "desktop"))]
pub mod web;

// Re-exports
#[cfg(feature = "desktop")]
pub use desktop::*;

pub use shared::*;

#[cfg(not(feature = "desktop"))]
pub use ui_server::*;
