# BotUI CSS/JS Extraction Tasks

## Overview
This document lists ALL HTML files in `botui/ui/suite` that contain inline `<style>` and/or `<script>` tags that need to be extracted to separate CSS/JS files.

---

## Phase 1: Create CSS/JS Files ✅ COMPLETE

All external CSS/JS files have been created.

---

## Phase 2: Modify HTML Files ✅ IN PROGRESS

### Completed Extractions

| File | CSS | JS | Status |
|------|-----|----|----|
| `suite/home.html` | ✅ | ✅ | Done - uses `css/home.css`, `js/home.js` |
| `suite/tasks/tasks.html` | ✅ | ✅ | Done - uses `tasks/tasks.css`, `tasks/tasks.js` |
| `suite/admin/index.html` | ✅ | ✅ | Done - uses `admin/admin.css`, `admin/admin.js` |
| `suite/analytics/analytics.html` | ✅ | ✅ | Done - uses `analytics/analytics.css`, `analytics/analytics.js` |
| `suite/mail/mail.html` | ✅ | ✅ | Done - uses `mail/mail.css`, `mail/mail.js` |
| `suite/monitoring/monitoring.html` | ✅ | ✅ | Done - uses `monitoring/monitoring.css`, `monitoring/monitoring.js` |
| `suite/attendant/index.html` | ✅ | ✅ | Done - uses `attendant/attendant.css`, `attendant/attendant.js` |

### Remaining Files

| File | CSS | JS | Priority |
|------|-----|----|----|
| `suite/admin/users.html` | ❌ | ❌ | Medium |
| `suite/admin/groups.html` | ❌ | ❌ | Medium |
| `suite/admin/dns.html` | N/A | ❌ | Medium |
| `suite/admin/billing.html` | ❌ | N/A | Low |
| `suite/admin/roles.html` | ❌ | N/A | Low |
| `suite/admin/contacts.html` | ❌ | N/A | Low |
| `suite/admin/organization-settings.html` | ❌ | N/A | Low |
| `suite/admin/organization-switcher.html` | ❌ | ❌ | Low |
| `suite/admin/search-settings.html` | ❌ | ❌ | Low |
| `suite/auth/login.html` | ❌ | ❌ | High |
| `suite/auth/register.html` | ❌ | ❌ | High |
| `suite/auth/forgot-password.html` | ❌ | ❌ | High |
| `suite/auth/reset-password.html` | ❌ | ❌ | High |
| `suite/auth/bootstrap.html` | ❌ | ❌ | Medium |
| `suite/analytics/partials/business-reports.html` | ❌ | ❌ | Low |
| `suite/monitoring/alerts.html` | ❌ | ❌ | Medium |
| `suite/monitoring/health.html` | ❌ | ❌ | Medium |
| `suite/monitoring/logs.html` | ❌ | ❌ | Medium |
| `suite/monitoring/metrics.html` | ❌ | ❌ | Medium |
| `suite/monitoring/resources.html` | ❌ | ❌ | Medium |

---

## Phase 3: Verification

- [ ] All HTML files have no inline `<style>` tags
- [ ] All HTML files have no inline `<script>` tags (except external src references)
- [ ] All pages render correctly
- [ ] All JavaScript functionality works
- [ ] No console errors

---

## External Files Reference

### CSS Files
```
suite/css/home.css
suite/css/partials.css
suite/admin/admin.css
suite/analytics/analytics.css
suite/attendant/attendant.css
suite/auth/auth.css
suite/calendar/calendar.css
suite/chat/chat.css
suite/designer.css
suite/drive/drive.css
suite/editor.css
suite/mail/mail.css
suite/meet/meet.css
suite/monitoring/monitoring.css
suite/paper/paper.css
suite/research/research.css (needs creation)
suite/settings/settings.css
suite/sources/sources.css
suite/tasks/tasks.css
suite/tools/tools.css
```

### JS Files
```
suite/js/home.js
suite/js/base.js
suite/admin/admin.js
suite/analytics/analytics.js
suite/attendant/attendant.js
suite/auth/auth.js
suite/calendar/calendar.js
suite/chat/chat.js
suite/designer.js
suite/drive/drive.js
suite/editor.js
suite/mail/mail.js
suite/meet/meet.js
suite/monitoring/monitoring.js
suite/paper/paper.js
suite/research/research.js
suite/settings/settings.js
suite/sources/sources.js
suite/tasks/tasks.js
suite/tools/tools.js
```

---

## Notes

1. All extracted JS uses IIFE pattern to prevent global namespace pollution
2. Functions that need to be called from HTML onclick handlers are exposed via `window.functionName`
3. HTMX reload handlers are included to reinitialize when content is swapped
4. CSS files contain all styles including responsive breakpoints
5. No CDN links - all assets are local per PROMPT.md requirements