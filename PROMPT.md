# BotUI Development Prompt Guide

**Version:** 6.1.0  
**Purpose:** LLM context for BotUI development

---

## Version Management - CRITICAL

**Current version is 6.1.0 - DO NOT CHANGE without explicit approval!**

### Rules

1. **Version is 6.1.0 across ALL workspace crates**
2. **NEVER change version without explicit user approval**
3. **BotUI does not have migrations - all migrations are in botserver/**
4. **All workspace crates share version 6.1.0**

---

## Official Icons - MANDATORY

**NEVER generate icons with LLM. ALWAYS use official SVG icons from:**

```
ui/suite/assets/icons/
├── gb-logo.svg        # Main GB logo
├── gb-bot.svg         # Bot/assistant
├── gb-analytics.svg   # Analytics app
├── gb-calendar.svg    # Calendar app
├── gb-chat.svg        # Chat app
├── gb-compliance.svg  # Compliance/security
├── gb-designer.svg    # Workflow designer
├── gb-drive.svg       # File storage
├── gb-mail.svg        # Email
├── gb-meet.svg        # Video meetings
├── gb-paper.svg       # Documents
├── gb-research.svg    # Research/search
├── gb-sources.svg     # Knowledge sources
└── gb-tasks.svg       # Task management
```

### Usage in HTML

```html
<!-- Inline SVG (preferred for styling) -->
<img src="/assets/icons/gb-chat.svg" alt="Chat" class="icon">

<!-- With CSS currentColor -->
<svg class="icon" style="color: var(--primary);">
  <use href="/assets/icons/gb-chat.svg#icon"></use>
</svg>
```

### Icon Style Guidelines

- All icons use `stroke="currentColor"` for theming
- ViewBox: `0 0 24 24`
- Stroke width: `1.5`
- Rounded caps and joins
- Consistent with GB brand identity

**DO NOT:**
- Generate new icons with AI/LLM
- Use emoji or unicode symbols as icons
- Use external icon libraries (FontAwesome, etc.)
- Create inline SVG content in templates

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

---

## LLM Workflow Strategy

### Two Types of LLM Work

1. **Execution Mode (Fazer)**
   - Pre-annotate phrases and send for execution
   - Focus on automation freedom
   - Less concerned with code details
   - Primary concern: Is the LLM destroying something?
   - Trust but verify output doesn't break existing functionality

2. **Review Mode (Conferir)**
   - Read generated code with full attention
   - Line-by-line verification
   - Check for correctness, security, performance
   - Validate against requirements

### LLM Fallback Strategy (After 3 attempts / 10 minutes)

1. DeepSeek-V3-0324 (good architect, reliable)
2. gpt-5-chat (slower but thorough)
3. gpt-oss-120b (final validation)
4. Claude Web (for complex debugging, unit tests, UI)

---

## Code Generation Rules

### CRITICAL REQUIREMENTS

```
- BotUI = Presentation + HTTP bridge ONLY
- All business logic goes in botserver
- No code duplication between layers
- Feature gates eliminate unused code paths
- Zero warnings - feature gating prevents dead code
- NO DEAD CODE - implement real functionality, never use _ for unused
- All JS/CSS must be local (no CDN)
```

### HTMX-First Frontend

```
- Use HTMX to minimize JavaScript at maximum
- Delegate ALL logic to Rust server
- Server returns HTML fragments, not JSON
- Use hx-get, hx-post, hx-target, hx-swap attributes
- WebSocket via htmx-ws extension for real-time
- NO custom JavaScript where HTMX can handle it
```

### JavaScript Usage Guidelines

**JS is ONLY acceptable when HTMX cannot handle the requirement:**

| Use Case | Solution |
|----------|----------|
| Data fetching | HTMX `hx-get`, `hx-post` |
| Form submission | HTMX `hx-post`, `hx-put` |
| Real-time updates | HTMX WebSocket extension `hx-ext="ws"` |
| Content swapping | HTMX `hx-target`, `hx-swap` |
| Polling | HTMX `hx-trigger="every 5s"` |
| Loading states | HTMX `hx-indicator` |
| **Modal show/hide** | **JS required** - DOM manipulation |
| **Toast notifications** | **JS required** - dynamic element creation |
| **Clipboard operations** | **JS required** - `navigator.clipboard` API |
| **Keyboard shortcuts** | **JS required** - `keydown` event handling |
| **WebSocket state mgmt** | **JS required** - connection lifecycle |
| **Complex animations** | **JS required** - GSAP or custom |
| **Client-side validation** | **JS required** - before submission UX |

**When writing JS:**
```
- Keep it minimal - one function per concern
- No frameworks (React, Vue, etc.) - vanilla JS only
- Use vendor libs sparingly (htmx, marked, gsap, alpine)
- All JS must work with HTMX lifecycle (htmx:afterSwap, etc.)
- Prefer CSS for animations when possible
```

### Local Assets Only

All external libraries are bundled locally - NEVER use CDN:

```
ui/suite/js/vendor/
├── htmx.min.js           # HTMX core
├── htmx-ws.js            # WebSocket extension
├── htmx-json-enc.js      # JSON encoding
├── marked.min.js         # Markdown parser
├── gsap.min.js           # Animation (minimal use)
├── alpinejs.min.js       # Alpine.js (minimal use)
└── livekit-client.umd.min.js  # LiveKit video

ui/minimal/js/vendor/
└── (same structure)
```

```html
<!-- CORRECT -->
<script src="js/vendor/htmx.min.js"></script>

<!-- WRONG - NEVER DO THIS -->
<script src="https://unpkg.com/htmx.org@1.9.10"></script>
```

### Dependency Management

```
- Use diesel for any local database needs
- After adding to Cargo.toml: cargo audit must show 0 warnings
- If audit fails, find alternative library
- Minimize redundancy - check existing libs before adding new ones
```

### Documentation Rules

```
- Rust code examples ONLY allowed in architecture/gbapp documentation
- Scan for ALL_CAPS.md files created at wrong places - delete or integrate
- Keep only README.md and PROMPT.md at project root level
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
│   ├── js/vendor/    # Local JS libraries
│   └── css/          # Stylesheets
└── minimal/          # Minimal chat UI
    └── js/vendor/    # Local JS libraries
```

### Feature Gating

```rust
#[cfg(feature = "desktop")]
pub mod desktop;

#[cfg(not(feature = "desktop"))]
pub mod http_client;
```

---

## HTMX Patterns

### Server-Side Rendering

```html
<!-- Button triggers server request, response swaps into target -->
<button hx-get="/api/items" 
        hx-target="#items-list" 
        hx-swap="innerHTML">
    Load Items
</button>

<div id="items-list">
    <!-- Server returns HTML fragment here -->
</div>
```

### Form Submission

```html
<form hx-post="/api/items" 
      hx-target="#items-list" 
      hx-swap="beforeend">
    <input name="title" type="text" required>
    <button type="submit">Add</button>
</form>
```

### WebSocket Real-time

```html
<div hx-ext="ws" ws-connect="/ws/chat">
    <div id="messages"></div>
    <form ws-send>
        <input name="message" type="text">
        <button type="submit">Send</button>
    </form>
</div>
```

### Server Response (Rust/Askama)

```rust
#[derive(Template)]
#[template(path = "partials/item.html")]
struct ItemTemplate {
    item: Item,
}

async fn create_item(
    State(state): State<Arc<AppState>>,
    Form(input): Form<CreateItem>,
) -> Html<String> {
    let item = save_item(&state, input).await;
    let template = ItemTemplate { item };
    Html(template.render().unwrap())
}
```

---

## Adding Features

### Process

1. Add business logic to **botserver** first
2. Create REST API endpoint in botserver (returns HTML for HTMX)
3. Add HTTP wrapper in BotUI if needed
4. Add UI in `ui/suite/` using HTMX attributes
5. For desktop-specific: Add Tauri command in `src/desktop/`

### Desktop Tauri Command

```rust
#[tauri::command]
pub fn list_files(path: &str) -> Result<Vec<FileItem>, String> {
    let entries = std::fs::read_dir(path)
        .map_err(|e| e.to_string())?;
    
    let items: Vec<FileItem> = entries
        .filter_map(|e| e.ok())
        .map(|e| FileItem {
            name: e.file_name().to_string_lossy().to_string(),
            is_dir: e.path().is_dir(),
        })
        .collect();
    
    Ok(items)
}
```

---

## Final Steps Before Commit

```bash
# Check for warnings
cargo check 2>&1 | grep warning

# Audit dependencies (must be 0 warnings)
cargo audit

# Build both modes
cargo build
cargo build --features desktop

# Verify no dead code with _ prefixes
grep -r "let _" src/ --include="*.rs"

# Verify no CDN references
grep -r "unpkg.com\|cdnjs\|jsdelivr" ui/
```

---

## Key Files Reference

```
src/main.rs           # Entry point, mode detection
src/lib.rs            # Feature-gated exports
src/http_client.rs    # botserverClient wrapper
src/ui_server/mod.rs  # Axum router, static files
ui/suite/index.html   # Main UI entry
ui/suite/base.html    # Base template
ui/minimal/index.html # Minimal chat UI
```

---

## Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| axum | 0.7.5 | Web framework |
| reqwest | 0.12 | HTTP client |
| tokio | 1.41 | Async runtime |
| askama | 0.12 | HTML Templates |
| diesel | 2.1 | Database (sqlite) |

---

## Remember

- **Two LLM modes**: Execution (fazer) vs Review (conferir)
- **HTMX first**: Minimize JS, delegate to server
- **Local assets**: No CDN, all vendor files local
- **Dead code**: Never use _ prefix, implement real code
- **cargo audit**: Must pass with 0 warnings
- **No business logic**: All logic in botserver
- **Feature gates**: Unused code never compiles
- **HTML responses**: Server returns fragments, not JSON
- **Version**: Always 6.1.0 - do not change without approval
- **Theme system**: Use data-theme attribute on body, 6 themes available