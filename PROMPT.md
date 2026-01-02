# BotUI Development Prompt Guide

**Version:** 6.1.0  
**Purpose:** LLM context for BotUI development

---

## ZERO TOLERANCE POLICY

**This project has the strictest code quality requirements possible.**

**EVERY SINGLE WARNING MUST BE FIXED. NO EXCEPTIONS.**

---

## ABSOLUTE PROHIBITIONS

```
❌ NEVER use #![allow()] or #[allow()] in source code to silence warnings
❌ NEVER use _ prefix for unused variables - DELETE the variable or USE it
❌ NEVER use .unwrap() - use ? or proper error handling
❌ NEVER use .expect() - use ? or proper error handling  
❌ NEVER use panic!() or unreachable!() - handle all cases
❌ NEVER use todo!() or unimplemented!() - write real code
❌ NEVER leave unused imports - DELETE them
❌ NEVER leave dead code - DELETE it or IMPLEMENT it
❌ NEVER use approximate constants (3.14159) - use std::f64::consts::PI
❌ NEVER silence clippy in code - FIX THE CODE or configure in Cargo.toml
❌ NEVER add comments explaining what code does - code must be self-documenting
❌ NEVER use CDN links - all assets must be local
```

---

## CARGO.TOML LINT EXCEPTIONS

When a clippy lint has **technical false positives** that cannot be fixed in code,
disable it in `Cargo.toml` with a comment explaining why:

```toml
[lints.clippy]
# Disabled: has false positives for functions with mut self, heap types (Vec, String)
missing_const_for_fn = "allow"
# Disabled: Tauri commands require owned types (Window) that cannot be passed by reference
needless_pass_by_value = "allow"
# Disabled: transitive dependencies we cannot control
multiple_crate_versions = "allow"
```

**Approved exceptions:**
- `missing_const_for_fn` - false positives for `mut self`, heap types
- `needless_pass_by_value` - Tauri/framework requirements
- `multiple_crate_versions` - transitive dependencies
- `future_not_send` - when async traits require non-Send futures

---

## MANDATORY CODE PATTERNS

### Error Handling - Use `?` Operator

```rust
// ❌ WRONG
let value = something.unwrap();
let value = something.expect("msg");

// ✅ CORRECT
let value = something?;
let value = something.ok_or_else(|| Error::NotFound)?;
```

### Self Usage in Impl Blocks

```rust
// ❌ WRONG
impl MyStruct {
    fn new() -> MyStruct { MyStruct { } }
}

// ✅ CORRECT
impl MyStruct {
    fn new() -> Self { Self { } }
}
```

### Format Strings - Inline Variables

```rust
// ❌ WRONG
format!("Hello {}", name)

// ✅ CORRECT
format!("Hello {name}")
```

### Display vs ToString

```rust
// ❌ WRONG
impl ToString for MyType { }

// ✅ CORRECT
impl std::fmt::Display for MyType { }
```

### Derive Eq with PartialEq

```rust
// ❌ WRONG
#[derive(PartialEq)]
struct MyStruct { }

// ✅ CORRECT
#[derive(PartialEq, Eq)]
struct MyStruct { }
```

---

## Weekly Maintenance - EVERY MONDAY

### Package Review Checklist

**Every Monday, review the following:**

1. **Dependency Updates**
   ```bash
   cargo outdated
   cargo audit
   ```

2. **Package Consolidation Opportunities**
   - Check if new crates can replace custom code
   - Look for crates that combine multiple dependencies
   - Review `Cargo.toml` for redundant dependencies

3. **Code Reduction Candidates**
   - Custom implementations that now have crate equivalents
   - Boilerplate that can be replaced with derive macros
   - Manual serialization that `serde` can handle

4. **Frontend Asset Updates**
   ```bash
   # Check vendor libs in ui/suite/js/vendor/
   # Compare with latest versions of htmx, gsap, etc.
   ```

### Packages to Watch

| Area | Potential Packages | Purpose |
|------|-------------------|---------|
| HTTP Client | `reqwest` | Consolidate HTTP handling |
| Templates | `askama` | Efficient HTML templates |
| Animations | `gsap` | Replace CSS animations |

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
- Use vendor libs sparingly (htmx, marked, gsap)
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

---

## Design System - UI Standards

**The `tasks.css` file defines the standard patterns for ALL screens in General Bots.**

All themes MUST implement these core components consistently.

### Layout Standards

```css
/* Full-height container - no global scroll */
.app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-height: 100vh;
    overflow: hidden;
}

/* Two-column layout - list + detail */
.main-content {
    display: grid;
    grid-template-columns: 320px 1fr;
    flex: 1;
    overflow: hidden;
    height: calc(100vh - 120px);
}

/* Scrollable list panel (LEFT) */
.list-panel {
    overflow-y: scroll;
    overflow-x: hidden;
    height: 100%;
    scrollbar-width: auto;
    scrollbar-color: var(--border-light) var(--surface);
}

/* Fixed detail panel (RIGHT) - no scroll */
.detail-panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
}
```

### Scrollbar Standards

```css
/* Visible scrollbar - 10px width */
.scrollable::-webkit-scrollbar {
    width: 10px;
}

.scrollable::-webkit-scrollbar-track {
    background: var(--surface);
    border-radius: 5px;
}

.scrollable::-webkit-scrollbar-thumb {
    background: var(--border-light);
    border-radius: 5px;
    border: 2px solid var(--surface);
}

.scrollable::-webkit-scrollbar-thumb:hover {
    background: var(--primary);
}

/* Firefox */
.scrollable {
    scrollbar-width: auto;
    scrollbar-color: var(--border-light) var(--surface);
}
```

### Card Standards

```css
/* Base card - used in task lists, items, etc. */
.card {
    background: var(--surface-hover);
    border: 2px solid var(--border);
    border-radius: 16px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
}

.card:hover {
    border-color: var(--border-hover);
    background: var(--surface);
}

.card.selected {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary);
}

/* Card status indicator (left bar) */
.card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 5px;
    height: 100%;
    background: var(--text-secondary);
    transition: background 0.2s ease;
}

.card.status-running::before { background: var(--primary); }
.card.status-complete::before { background: var(--success); }
.card.status-error::before { background: var(--error); }
.card.status-pending::before { background: var(--text-secondary); }
```

### Progress/Tree Indicators

```css
/* Dot indicator - shows status */
.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--text-secondary);
    transition: all 0.3s ease;
}

.status-dot.running {
    background: var(--primary);
    box-shadow: 0 0 8px var(--primary-light);
    animation: dot-pulse 1.5s ease-in-out infinite;
}

.status-dot.completed {
    background: var(--primary);
}

.status-dot.pending {
    background: var(--text-secondary);
}

@keyframes dot-pulse {
    0%, 100% {
        opacity: 1;
        box-shadow: 0 0 10px var(--primary-light);
        transform: scale(1);
    }
    50% {
        opacity: 0.7;
        box-shadow: 0 0 4px var(--primary-light);
        transform: scale(0.9);
    }
}

/* Step badge */
.step-badge {
    padding: 4px 12px;
    background: var(--primary);
    color: var(--bg);
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
}

.step-badge.pending {
    background: var(--surface);
    color: var(--text-secondary);
}
```

### Tree/List with Children

```css
/* Parent-child expandable tree */
.tree-section {
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 8px;
    margin: 8px 16px;
    overflow: hidden;
}

.tree-row {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    cursor: pointer;
    transition: background 0.15s;
}

.tree-row:hover {
    background: var(--surface-hover);
}

.tree-children {
    display: none;
    background: var(--bg);
}

.tree-section.expanded .tree-children {
    display: block;
}

.tree-child {
    border-bottom: 1px solid var(--border);
    padding-left: 24px;
}

.tree-item {
    display: flex;
    align-items: center;
    padding: 8px 20px 8px 40px;
    min-height: 32px;
}
```

### Fixed Panels (Terminal, Status)

```css
/* Fixed-height panel at bottom */
.fixed-panel {
    flex: 0 0 120px;
    height: 120px;
    min-height: 120px;
    max-height: 120px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-top: 1px solid var(--border);
}

/* Variable-height panel with scroll */
.variable-panel {
    flex: 1 1 auto;
    min-height: 150px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.variable-panel-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: scroll;
}
```

### Status Badges

```css
.status-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 6px 12px;
    border-radius: 6px;
    text-transform: uppercase;
}

.status-badge.running {
    background: rgba(var(--primary-rgb), 0.15);
    color: var(--primary);
}

.status-badge.completed {
    background: rgba(var(--success-rgb), 0.15);
    color: var(--success);
}

.status-badge.error {
    background: rgba(var(--error-rgb), 0.15);
    color: var(--error);
}

.status-badge.pending {
    background: var(--surface);
    color: var(--text-secondary);
}
```

### Theme Variables Required

Every theme MUST define these CSS variables:

```css
[data-theme="your-theme"] {
    /* Backgrounds */
    --bg: #0a0a0a;
    --surface: #161616;
    --surface-hover: #1e1e1e;
    
    /* Borders */
    --border: #2a2a2a;
    --border-light: #3a3a3a;
    --border-hover: #4a4a4a;
    
    /* Text */
    --text: #ffffff;
    --text-secondary: #888888;
    --text-tertiary: #666666;
    
    /* Primary (accent) */
    --primary: #c5f82a;
    --primary-hover: #d4ff3a;
    --primary-light: rgba(197, 248, 42, 0.15);
    
    /* Status colors */
    --success: #22c55e;
    --warning: #f59e0b;
    --error: #ef4444;
    --info: #3b82f6;
}
```

### Component Checklist for New Screens

When creating a new screen, ensure it has:

- [ ] Full-height container with `overflow: hidden`
- [ ] No global page scroll
- [ ] List panel with visible scrollbar (if applicable)
- [ ] Detail panel with fixed layout
- [ ] Cards with status indicator bar
- [ ] Status dots/badges using standard classes
- [ ] Tree sections if showing parent-child relationships
- [ ] Fixed terminal/status panels at bottom
- [ ] Variable content area with internal scroll

---

## Remember

- **ZERO WARNINGS** - Every clippy warning must be fixed
- **NO ALLOW IN CODE** - Never use #[allow()] in source files
- **CARGO.TOML EXCEPTIONS OK** - Disable lints with false positives in Cargo.toml with comment
- **NO DEAD CODE** - Delete unused code, never prefix with _
- **NO UNWRAP/EXPECT** - Use ? operator or proper error handling
- **INLINE FORMAT ARGS** - format!("{name}") not format!("{}", name)
- **USE SELF** - In impl blocks, use Self not the type name
- **DERIVE EQ** - Always derive Eq with PartialEq
- **DISPLAY NOT TOSTRING** - Implement Display, not ToString
- **USE DIAGNOSTICS** - Use IDE diagnostics tool, never call cargo clippy directly
- **HTMX first**: Minimize JS, delegate to server
- **Local assets**: No CDN, all vendor files local
- **No business logic**: All logic in botserver
- **HTML responses**: Server returns fragments, not JSON
- **Version**: Always 6.1.0 - do not change without approval
- **Theme system**: Use data-theme attribute on body, 6 themes available
- **Session Continuation**: When running out of context, create detailed summary: (1) what was done, (2) what remains, (3) specific files and line numbers, (4) exact next steps.