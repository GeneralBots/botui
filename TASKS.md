# BotUI CSS/JS Extraction Tasks

## Overview
This document lists ALL HTML files in `botui/ui/suite` that contain inline `<style>` and/or `<script>` tags that need to be extracted to separate CSS/JS files.

---

## Files Requiring CSS Extraction (34 files)

| File | Module | Priority |
|------|--------|----------|
| `suite/home.html` | Home | High |
| `suite/partials/contexts.html` | Partials | Medium |
| `suite/partials/apps_menu.html` | Partials | Medium |
| `suite/partials/user_menu.html` | Partials | Medium |
| `suite/settings/index.html` | Settings | High |
| `suite/tasks/tasks.html` | Tasks | High |
| `suite/meet/meet.html` | Meet | High |
| `suite/attendant/index.html` | Attendant | High |
| `suite/monitoring/alerts.html` | Monitoring | Medium |
| `suite/monitoring/health.html` | Monitoring | Medium |
| `suite/monitoring/logs.html` | Monitoring | Medium |
| `suite/monitoring/home-dashboard.html` | Monitoring | Medium |
| `suite/monitoring/resources.html` | Monitoring | Medium |
| `suite/monitoring/metrics.html` | Monitoring | Medium |
| `suite/monitoring/index.html` | Monitoring | High |
| `suite/monitoring/monitoring.html` | Monitoring | Medium |
| `suite/admin/groups.html` | Admin | Medium |
| `suite/admin/users.html` | Admin | Medium |
| `suite/admin/index.html` | Admin | High |
| `suite/admin/dns.html` | Admin | Medium |
| `suite/tools/compliance.html` | Tools | High |
| `suite/research/research.html` | Research | High |
| `suite/chat/projector.html` | Chat | Medium |
| `suite/editor.html` | Editor | High |
| `suite/sources/index.html` | Sources | High |
| `suite/calendar/calendar.html` | Calendar | High |
| `suite/mail/mail.html` | Mail | High |
| `suite/auth/reset-password.html` | Auth | High |
| `suite/auth/login.html` | Auth | High |
| `suite/auth/register.html` | Auth | High |
| `suite/auth/forgot-password.html` | Auth | High |
| `suite/drive/index.html` | Drive | High |
| `suite/designer.html` | Designer | High |
| `suite/paper/paper.html` | Paper | High |

---

## Files Requiring JS Extraction (35 files)

| File | Module | Priority |
|------|--------|----------|
| `suite/index.html` | Index | High |
| `suite/settings/index.html` | Settings | High |
| `suite/tasks/tasks.html` | Tasks | High |
| `suite/meet/meet.html` | Meet | High |
| `suite/monitoring/services.html` | Monitoring | Medium |
| `suite/monitoring/health.html` | Monitoring | Medium |
| `suite/monitoring/alerts.html` | Monitoring | Medium |
| `suite/monitoring/logs.html` | Monitoring | Medium |
| `suite/monitoring/resources.html` | Monitoring | Medium |
| `suite/monitoring/home-dashboard.html` | Monitoring | Medium |
| `suite/monitoring/metrics.html` | Monitoring | Medium |
| `suite/monitoring/index.html` | Monitoring | High |
| `suite/monitoring/monitoring.html` | Monitoring | Medium |
| `suite/attendant/index.html` | Attendant | High |
| `suite/sources/index.html` | Sources | High |
| `suite/admin/users.html` | Admin | Medium |
| `suite/admin/groups.html` | Admin | Medium |
| `suite/admin/dns.html` | Admin | Medium |
| `suite/admin/index.html` | Admin | High |
| `suite/chat/projector.html` | Chat | Medium |
| `suite/research/research.html` | Research | High |
| `suite/tools/compliance.html` | Tools | High |
| `suite/mail/mail.html` | Mail | High |
| `suite/calendar/calendar.html` | Calendar | High |
| `suite/editor.html` | Editor | High |
| `suite/auth/reset-password.html` | Auth | High |
| `suite/auth/login.html` | Auth | High |
| `suite/auth/register.html` | Auth | High |
| `suite/auth/forgot-password.html` | Auth | High |
| `suite/base.html` | Base | Critical |
| `suite/home.html` | Home | High |
| `suite/analytics/analytics.html` | Analytics | High |
| `suite/designer.html` | Designer | High |
| `suite/paper/paper.html` | Paper | High |
| `suite/drive/index.html` | Drive | High |

---

## Extraction Strategy

### CSS Files to Create
```
suite/css/home.css
suite/css/partials.css (combined contexts, apps_menu, user_menu)
suite/settings/settings.css ✓ (already created)
suite/tasks/tasks.css
suite/meet/meet.css
suite/attendant/attendant.css ✓ (already created)
suite/monitoring/monitoring.css (combined all monitoring views)
suite/admin/admin.css ✓ (already created)
suite/tools/tools.css ✓ (already created)
suite/research/research.css ✓ (already created)
suite/chat/chat.css
suite/editor.css
suite/sources/sources.css ✓ (already created)
suite/calendar/calendar.css ✓ (already created)
suite/mail/mail.css
suite/auth/auth.css ✓ (already created)
suite/drive/drive.css ✓ (already created)
suite/designer.css
suite/paper/paper.css ✓ (already created)
suite/analytics/analytics.css
```

### JS Files to Create
```
suite/js/home.js
suite/settings/settings.js ✓ (already created)
suite/tasks/tasks.js
suite/meet/meet.js
suite/monitoring/monitoring.js (combined all monitoring scripts)
suite/attendant/attendant.js ✓ (already created)
suite/sources/sources.js ✓ (already created)
suite/admin/admin.js ✓ (already created)
suite/chat/chat.js
suite/research/research.js ✓ (already created)
suite/tools/tools.js ✓ (already created)
suite/mail/mail.js
suite/calendar/calendar.js ✓ (already created)
suite/editor.js
suite/auth/auth.js ✓ (already created)
suite/css/base.js
suite/analytics/analytics.js
suite/designer.js
suite/paper/paper.js ✓ (already created)
suite/drive/drive.js ✓ (already created)
```

---

## Completed Extractions (CSS/JS files created, HTML not yet modified)

- [x] `suite/admin/admin.css`, `admin.js`
- [x] `suite/auth/auth.css`, `auth.js`
- [x] `suite/calendar/calendar.css`, `calendar.js`
- [x] `suite/settings/settings.css`, `settings.js`
- [x] `suite/drive/drive.css`, `drive.js`
- [x] `suite/attendant/attendant.css`, `attendant.js`
- [x] `suite/paper/paper.css`, `paper.js`
- [x] `suite/research/research.css`, `research.js`
- [x] `suite/sources/sources.css`, `sources.js`
- [x] `suite/tools/tools.css`, `tools.js`

---

## Remaining Tasks

### Phase 1: Create Missing CSS/JS Files ✅ COMPLETE
- [x] `suite/css/home.css`, `js/home.js`
- [x] `suite/css/partials.css` (contexts, apps_menu, user_menu)
- [x] `suite/tasks/tasks.css`, `tasks.js`
- [x] `suite/meet/meet.css`, `meet.js`
- [x] `suite/monitoring/monitoring.css`, `monitoring.js`
- [x] `suite/chat/chat.css`, `chat.js`
- [x] `suite/editor.css`, `editor.js`
- [x] `suite/mail/mail.css`, `mail.js`
- [x] `suite/js/base.js`
- [x] `suite/analytics/analytics.css`, `analytics.js`
- [x] `suite/designer.css`, `designer.js`

### Phase 2: Modify HTML Files
Replace inline `<style>` and `<script>` blocks with external file references:
```html
<!-- Replace inline styles with: -->
<link rel="stylesheet" href="module.css">

<!-- Replace inline scripts with: -->
<script src="module.js"></script>
```

### Phase 3: Verification
- [ ] All HTML files have no inline `<style>` tags
- [ ] All HTML files have no inline `<script>` tags (except external src references)
- [ ] All pages render correctly
- [ ] All JavaScript functionality works
- [ ] No console errors

---

## Statistics

| Category | Count |
|----------|-------|
| Files with inline CSS | 34 |
| Files with inline JS | 35 |
| Unique files total | ~38 |
| CSS/JS already created | 21 modules |
| CSS/JS remaining | 0 modules |

---

## Notes

1. Some files have both inline CSS and JS (e.g., `paper.html`, `research.html`)
2. Monitoring module has 9 HTML files - consider consolidating CSS/JS
3. Admin module has 4 HTML files - CSS/JS can be consolidated
4. Auth module has 4 HTML files - CSS/JS already extracted
5. Partials should share a single CSS file
6. `base.html` contains critical JS for app menus - extract to `base.js`
