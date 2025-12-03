#![cfg_attr(feature = "desktop", windows_subsystem = "windows")]

use log::info;

#[cfg(feature = "desktop")]
mod desktop;

mod ui_server;

#[cfg(not(feature = "desktop"))]
pub mod http_client;

#[cfg(not(feature = "desktop"))]
mod web;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    info!("BotUI starting...");

    #[cfg(feature = "desktop")]
    {
        info!("Starting in desktop mode (Tauri)...");
        return Ok(());
    }

    #[cfg(not(feature = "desktop"))]
    {
        info!("Starting web UI server...");
        web_main().await
    }
}

#[cfg(not(feature = "desktop"))]
async fn web_main() -> std::io::Result<()> {
    let app = ui_server::configure_router();

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 3000));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!("UI server listening on {}", addr);

    axum::serve(listener, app).await
}
