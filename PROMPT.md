# BotUI Development Prompt Guide

**Version:** 6.1.0  
**Purpose:** LLM context for BotUI development

---

## Project Overview

BotUI is a **dual-mode UI application** built in Rust that runs as either a desktop app (Tauri) or web server (Axum). All business logic is in **botserver** - BotUI is purely presentation + HTTP bridge.

### Workspace Position

```
botui/         # THIS PROJECT - Web/Desktop UI
botserver/     # Main server (business logic)
botlib/        # Shared library (consumed here)
botapp/        # Desktop wrapper (consumes botui)
botbook/       # Documentation
```

### What BotUI Provides

- **Web Mode**: Axum server serving HTML/CSS/JS UI on port 3000
- **Desktop Mode**: Tauri native application with same UI
- **HTTP Bridge**: Proxies all requests to botserver
- **Local Assets**: All JS/CSS bundled locally (no CDN)

---

## Quick Start

```bash
# Terminal 1: Start BotServer
cd ../botserver && cargo run

# Terminal 2: Start BotUI (Web Mode)
cd ../botui && cargo run
# Visit http://localhost:3000

# OR Desktop Mode
cargo tauri dev
```

---

## Architecture

### Dual Modes

| Mode | Command | Description |
|------|---------|-------------|
| Web | `cargo run` | Axum server on port 3000 |
| Desktop | `cargo tauri dev` | Tauri native window |

### Code Organization

```
src/
├── main.rs           # Entry point - mode detection
├── lib.rs            # Feature-gated module exports
├── http_client.rs    # HTTP wrapper for botserver (web-only)
├── ui_server/
│   └── mod.rs        # Axum router + UI serving (web-only)
├── desktop/
│   ├── mod.rs        # Desktop module organization
│   ├── drive.rs      # File operations via Tauri
│   ├── tray.rs       # System tray infrastructure
│   └── stream.rs     # Streaming operations
└── shared/
    └── state.rs      # Shared application state

ui/
├── suite/            # Main UI (HTML/CSS/JS)
│   ├── js/vendor/    # Local JS libraries (htmx, marked, etc.)
│   └── css/          # Stylesheets
└── minimal/          # Minimal chat UI
    └── js/vendor/    # Local JS libraries
```

---

## Feature Gating

```rust
#[cfg(feature = "desktop")]     // Desktop build only
pub mod desktop;

#[cfg(not(feature = "desktop"))] // Web build only
pub mod http_client;
```

Build commands:
```bash
cargo build                    # Web mode (default)
cargo build --features desktop # Desktop mode
cargo tauri build              # Optimized desktop build
```

---

## Code Generation Rules

### CRITICAL REQUIREMENTS

```
- BotUI = Presentation + HTTP bridge ONLY
- All business logic goes in botserver
- No code duplication between layers
- Feature gates eliminate unused code paths
- Zero warnings - feature gating prevents dead code
- All JS/CSS must be local (no CDN)
```

### Key Principles

1. **Minimize Code** - Only presentation and HTTP bridging
2. **Feature Gating** - Desktop code doesn't compile in web mode
3. **HTTP Communication** - All botserver calls through BotServerClient
4. **Local Assets** - All vendor JS in ui/*/js/vendor/

---

## Local JS/CSS Vendor Files

All external libraries are bundled locally:

```
ui/suite/js/vendor/
├── htmx.min.js           # HTMX 1.9.10
├── htmx-ws.js            # HTMX WebSocket extension
├── htmx-json-enc.js      # HTMX JSON encoding
├── marked.min.js         # Markdown parser
├── gsap.min.js           # Animation library
├── alpinejs.min.js       # Alpine.js reactivity
└── livekit-client.umd.min.js  # LiveKit video
```

**NEVER use CDN URLs** - always reference local vendor files:
```html
<!-- CORRECT -->
<script src="js/vendor/htmx.min.js"></script>

<!-- WRONG - DO NOT USE -->
<script src="https://unpkg.com/htmx.org@1.9.10"></script>
```

---

## HTTP Client

```rust
pub struct BotServerClient {
    client: Arc<Client>,
    base_url: String,
}

impl BotServerClient {
    pub async fn get<T: Deserialize>(&self, endpoint: &str) -> Result<T, String>
    pub async fn post<T, R>(&self, endpoint: &str, body: &T) -> Result<R, String>
    pub async fn health_check(&self) -> bool
}
```

---

## Adding Features

### Process

1. Add business logic to **botserver** first
2. Create REST API endpoint in botserver
3. Add HTTP wrapper in BotUI
4. Add UI in `ui/suite/`
5. For desktop-specific: Add Tauri command in `src/desktop/`

### Desktop Tauri Command

```rust
#[tauri::command]
pub fn list_files(path: &str) -> Result<Vec<FileItem>, String> {
    // Implementation
}
```

---

## Environment Variables

```bash
BOTSERVER_URL=http://localhost:8081  # BotServer location
RUST_LOG=debug                        # Logging level
```

---

## Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| axum | 0.7.5 | Web framework |
| reqwest | 0.12 | HTTP client |
| tokio | 1.41 | Async runtime |
| askama | 0.12 | Templates |
| diesel | 2.1 | Database (sqlite) |

---

## Testing

```bash
cargo build                    # Web mode
cargo build --features desktop # Desktop mode
cargo test
cargo run                      # Start web server
cargo tauri dev                # Start desktop app
```

---

## Rules

- **No business logic** - only presentation
- **No CDN** - all assets local
- **Feature gate** - unused code never compiles
- **Zero warnings** - clean compilation
- **HTTP bridge** - all data from botserver