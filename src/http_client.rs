//! HTTP client for communicating with botserver
//!
//! This module re-exports the HTTP client from botlib.
//! All implementation is now in the shared library.

#![cfg(not(feature = "desktop"))]

// Re-export everything from botlib's http_client
pub use botlib::http_client::*;
pub use botlib::models::ApiResponse;
