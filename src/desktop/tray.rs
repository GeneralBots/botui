#![cfg(feature = "desktop")]
#![allow(dead_code)]

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::RwLock;

#[cfg(target_os = "windows")]
use trayicon::{Icon, MenuBuilder, TrayIcon, TrayIconBuilder};

#[cfg(target_os = "macos")]
use trayicon_osx::{Icon, MenuBuilder, TrayIcon, TrayIconBuilder};

#[cfg(all(target_os = "linux", feature = "desktop-tray"))]
use ksni::{Tray, TrayService};

pub struct TrayManager {
    hostname: Arc<RwLock<Option<String>>>,
    running_mode: RunningMode,
}

#[derive(Debug, Clone, PartialEq)]
pub enum RunningMode {
    Server,
    Desktop,
    Client,
}

impl TrayManager {
    pub fn new() -> Self {
        let running_mode = if cfg!(feature = "desktop") {
            RunningMode::Desktop
        } else {
            RunningMode::Server
        };

        Self {
            hostname: Arc::new(RwLock::new(None)),
            running_mode,
        }
    }

    pub async fn start(&self) -> Result<()> {
        match self.running_mode {
            RunningMode::Desktop => {
                self.start_desktop_mode().await?;
            }
            RunningMode::Server => {
                log::info!("Running in server mode - tray icon disabled");
            }
            RunningMode::Client => {
                log::info!("Running in client mode - tray icon minimal");
            }
        }
        Ok(())
    }

    async fn start_desktop_mode(&self) -> Result<()> {
        log::info!("Starting desktop mode tray icon");

        #[cfg(any(target_os = "windows", target_os = "macos"))]
        {
            self.create_tray_icon()?;
        }

        #[cfg(target_os = "linux")]
        {
            self.create_linux_tray()?;
        }

        Ok(())
    }

    #[cfg(any(target_os = "windows", target_os = "macos"))]
    fn create_tray_icon(&self) -> Result<()> {
        log::info!("Tray icon not fully implemented for this platform");
        Ok(())
    }

    #[cfg(target_os = "linux")]
    fn create_linux_tray(&self) -> Result<()> {
        log::info!("Linux tray icon not fully implemented");
        Ok(())
    }

    fn get_mode_string(&self) -> String {
        match self.running_mode {
            RunningMode::Desktop => "Desktop".to_string(),
            RunningMode::Server => "Server".to_string(),
            RunningMode::Client => "Client".to_string(),
        }
    }

    pub async fn update_status(&self, status: &str) -> Result<()> {
        log::info!("Tray status update: {}", status);
        Ok(())
    }

    pub async fn get_hostname(&self) -> Option<String> {
        let hostname = self.hostname.read().await;
        hostname.clone()
    }
}

// Service status monitor
pub struct ServiceMonitor {
    services: Vec<ServiceStatus>,
}

#[derive(Debug, Clone)]
pub struct ServiceStatus {
    pub name: String,
    pub running: bool,
    pub port: u16,
    pub url: String,
}

impl ServiceMonitor {
    pub fn new() -> Self {
        Self {
            services: vec![
                ServiceStatus {
                    name: "API".to_string(),
                    running: false,
                    port: 8080,
                    url: "https://localhost:8080".to_string(),
                },
                ServiceStatus {
                    name: "Directory".to_string(),
                    running: false,
                    port: 8080,
                    url: "https://localhost:8080".to_string(),
                },
                ServiceStatus {
                    name: "LLM".to_string(),
                    running: false,
                    port: 8081,
                    url: "https://localhost:8081".to_string(),
                },
                ServiceStatus {
                    name: "Database".to_string(),
                    running: false,
                    port: 5432,
                    url: "postgresql://localhost:5432".to_string(),
                },
                ServiceStatus {
                    name: "Cache".to_string(),
                    running: false,
                    port: 6379,
                    url: "redis://localhost:6379".to_string(),
                },
            ],
        }
    }

    pub async fn check_services(&mut self) -> Vec<ServiceStatus> {
        let urls: Vec<String> = self.services.iter().map(|s| s.url.clone()).collect();
        for (i, url) in urls.iter().enumerate() {
            self.services[i].running = self.check_service(url).await;
        }
        self.services.clone()
    }

    async fn check_service(&self, url: &str) -> bool {
        if url.starts_with("https://") || url.starts_with("http://") {
            match reqwest::Client::builder()
                .danger_accept_invalid_certs(true)
                .build()
                .unwrap()
                .get(format!("{}/health", url))
                .timeout(std::time::Duration::from_secs(2))
                .send()
                .await
            {
                Ok(_) => true,
                Err(_) => false,
            }
        } else {
            false
        }
    }
}
