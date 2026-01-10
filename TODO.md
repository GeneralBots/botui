# BotUI TODO

## Completed ✅

### CSS/JS Extraction - Phase 2

The following HTML files have been updated to use external CSS/JS files instead of inline styles and scripts:

| File | External CSS | External JS |
|------|-------------|-------------|
| `suite/home.html` | `css/home.css` | `js/home.js` |
| `suite/tasks/tasks.html` | `tasks/tasks.css` | `tasks/tasks.js` |
| `suite/admin/index.html` | `admin/admin.css` | `admin/admin.js` |
| `suite/analytics/analytics.html` | `analytics/analytics.css` | `analytics/analytics.js` |
| `suite/mail/mail.html` | `mail/mail.css` | `mail/mail.js` |
| `suite/monitoring/monitoring.html` | `monitoring/monitoring.css` | `monitoring/monitoring.js` |
| `suite/attendant/index.html` | `attendant/attendant.css` | `attendant/attendant.js` |

---

## Remaining Work

### Additional HTML Files to Extract

The following files still contain inline `<style>` and/or `<script>` tags:

**Admin Module:**
- `admin/users.html`
- `admin/groups.html`
- `admin/dns.html`
- `admin/billing.html`
- `admin/roles.html`

**Auth Module:**
- `auth/login.html`
- `auth/register.html`
- `auth/forgot-password.html`
- `auth/reset-password.html`
- `auth/bootstrap.html`

**Monitoring Module:**
- `monitoring/alerts.html`
- `monitoring/health.html`
- `monitoring/logs.html`
- `monitoring/metrics.html`
- `monitoring/resources.html`

---

## Guidelines

Per `PROMPT.md`:
- All JS/CSS must be local (no CDN)
- Use HTMX-first approach, minimize JavaScript
- No inline styles or scripts in production HTML
- All external JS wrapped in IIFE to prevent global pollution
- Functions called from HTML exposed via `window.functionName`

---

## Verification Checklist

- [ ] All pages render correctly after extraction
- [ ] All JavaScript functionality works
- [ ] No console errors
- [ ] HTMX interactions work correctly
- [ ] Theme switching works
- [ ] Responsive layouts preserved