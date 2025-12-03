#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
//! Desktop Module
//!
//! This module provides desktop-specific functionality including:
//! - Drive management
//! - System tray management

#[cfg(feature = "desktop")]
pub mod drive;

#[cfg(feature = "desktop")]
pub mod tray;
