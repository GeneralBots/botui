//! Shared types and state management for BotUI
//!
//! This module re-exports common types from botlib and provides
//! UI-specific shared functionality.

pub mod state;

// Re-export from botlib for convenience
pub use botlib::branding::{
    branding, copyright_text, footer_text, init_branding, is_white_label, log_prefix,
    platform_name, platform_short, BrandingConfig,
};
pub use botlib::error::{BotError, BotResult};
pub use botlib::message_types::MessageType;
pub use botlib::models::{ApiResponse, BotResponse, Session, Suggestion, UserMessage};
pub use botlib::version::{get_botserver_version, version_string, BOTSERVER_VERSION};

// Local re-exports
pub use state::AppState;
