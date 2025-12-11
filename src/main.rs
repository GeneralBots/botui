//! BotUI - General Bots Pure Web UI Server
//!
//! This is the entry point for the botui web server.
//! For desktop/mobile native features, see the `botapp` crate.

use log::info;

mod shared;
mod ui_server;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    info!("BotUI starting...");
    info!("Starting web UI server...");

    let app = ui_server::configure_router();

    let port: u16 = std::env::var("BOTUI_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!("UI server listening on {}", addr);

    axum::serve(listener, app).await
}
