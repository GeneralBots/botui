# BotUI Full Product Implementation Plan

**Budget:** $200,000 USD  
**Goal:** Complete enterprise-ready product for international market  
**Version:** 6.1.0

---

## Executive Summary

This document outlines the implementation of ~100+ missing API integrations in BotUI to create a complete enterprise productivity suite. All backend APIs already exist in BotServer - this work focuses purely on frontend UI integration using HTMX patterns.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BotUI Suite                               │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│    Apps     │   Admin     │  Settings   │  Monitoring │  Auth   │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────┤
│ Chat        │ Users       │ Profile     │ Services    │ Login   │
│ Drive       │ Groups      │ Theme       │ Resources   │ OAuth   │
│ Mail        │ Permissions │ Sync        │ Logs        │ 2FA     │
│ Calendar    │ Audit       │ Storage     │ Metrics     │ SSO     │
│ Tasks       │ DNS         │ API Keys    │ Health      │         │
│ Meet        │ Bots        │ Webhooks    │ Alerts      │         │
│ Paper       │             │             │             │         │
│ Research    │             │             │             │         │
│ Sources     │             │             │             │         │
│ Designer    │             │             │             │         │
│ Analytics   │             │             │             │         │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────┘
```

---

## Phase 1: Core Apps Completion ($45,000 - 3 weeks)

### 1.1 Paper App - Document Editor
**Location:** `ui/suite/paper/`  
**Priority:** HIGH  
**Effort:** 5 days

Wire existing `/api/paper/*` endpoints:

```html
<!-- paper/paper.html -->
<div class="paper-app">
    <!-- Document List Sidebar -->
    <aside class="paper-sidebar">
        <button hx-post="/api/paper/new" hx-target="#editor-area">New Document</button>
        <div id="doc-list" hx-get="/api/paper/list" hx-trigger="load" hx-swap="innerHTML"></div>
        <input type="search" hx-get="/api/paper/search" hx-trigger="keyup changed delay:300ms" 
               hx-target="#doc-list" name="q" placeholder="Search documents...">
    </aside>
    
    <!-- Editor Area -->
    <main id="editor-area">
        <div class="editor-toolbar">
            <button hx-post="/api/paper/save" hx-include="#editor-content">Save</button>
            <button hx-post="/api/paper/autosave" hx-trigger="keyup changed delay:5s from:#editor-content">Autosave</button>
        </div>
        <div id="editor-content" contenteditable="true"></div>
    </main>
    
    <!-- AI Assistant Panel -->
    <aside class="ai-panel">
        <button hx-post="/api/paper/ai/summarize" hx-include="#editor-content" hx-target="#ai-result">Summarize</button>
        <button hx-post="/api/paper/ai/expand" hx-include="#editor-content" hx-target="#ai-result">Expand</button>
        <button hx-post="/api/paper/ai/improve" hx-include="#editor-content" hx-target="#ai-result">Improve</button>
        <button hx-post="/api/paper/ai/simplify" hx-include="#editor-content" hx-target="#ai-result">Simplify</button>
        <button hx-post="/api/paper/ai/translate" hx-include="#editor-content" hx-target="#ai-result">Translate</button>
        <div id="ai-result"></div>
    </aside>
</div>

<!-- Templates Modal -->
<dialog id="template-modal">
    <button hx-post="/api/paper/template/blank" hx-target="#editor-area">Blank</button>
    <button hx-post="/api/paper/template/meeting" hx-target="#editor-area">Meeting Notes</button>
    <button hx-post="/api/paper/template/todo" hx-target="#editor-area">Todo List</button>
    <button hx-post="/api/paper/template/research" hx-target="#editor-area">Research</button>
</dialog>

<!-- Export Menu -->
<div class="export-menu">
    <a hx-get="/api/paper/export/pdf" hx-include="#doc-id">Export PDF</a>
    <a hx-get="/api/paper/export/docx" hx-include="#doc-id">Export DOCX</a>
    <a hx-get="/api/paper/export/md" hx-include="#doc-id">Export Markdown</a>
    <a hx-get="/api/paper/export/html" hx-include="#doc-id">Export HTML</a>
    <a hx-get="/api/paper/export/txt" hx-include="#doc-id">Export Text</a>
</div>
```

**API Endpoints to Wire:**
- `POST /api/paper/new`
- `GET /api/paper/list`
- `GET /api/paper/search`
- `POST /api/paper/save`
- `POST /api/paper/autosave`
- `GET /api/paper/{id}`
- `POST /api/paper/{id}/delete`
- `POST /api/paper/template/*` (blank, meeting, todo, research)
- `POST /api/paper/ai/*` (summarize, expand, improve, simplify, translate, custom)
- `GET /api/paper/export/*` (pdf, docx, md, html, txt)

---

### 1.2 Research App - Knowledge Collection
**Location:** `ui/suite/research/`  
**Priority:** HIGH  
**Effort:** 4 days

```html
<!-- research/research.html -->
<div class="research-app">
    <aside class="collections-sidebar">
        <button hx-post="/api/research/collections/new" hx-target="#collections-list">New Collection</button>
        <div id="collections-list" hx-get="/api/research/collections" hx-trigger="load"></div>
    </aside>
    
    <main class="research-main">
        <!-- Search Interface -->
        <form hx-post="/api/research/search" hx-target="#search-results">
            <input type="text" name="query" placeholder="Search across all sources...">
            <button type="submit">Search</button>
        </form>
        
        <div id="search-results"></div>
        
        <!-- Quick Access -->
        <section>
            <h3>Recent Searches</h3>
            <div hx-get="/api/research/recent" hx-trigger="load"></div>
        </section>
        
        <section>
            <h3>Trending Topics</h3>
            <div hx-get="/api/research/trending" hx-trigger="load"></div>
        </section>
        
        <section>
            <h3>Suggested Prompts</h3>
            <div hx-get="/api/research/prompts" hx-trigger="load"></div>
        </section>
    </main>
    
    <!-- Collection Detail -->
    <aside class="collection-detail" id="collection-detail">
        <div hx-get="/api/research/collections/{id}" hx-trigger="collection-selected"></div>
        <button hx-get="/api/research/export-citations" hx-include="#collection-id">Export Citations</button>
    </aside>
</div>
```

**API Endpoints to Wire:**
- `GET /api/research/collections`
- `POST /api/research/collections/new`
- `GET /api/research/collections/{id}`
- `POST /api/research/search`
- `GET /api/research/recent`
- `GET /api/research/trending`
- `GET /api/research/prompts`
- `GET /api/research/export-citations`

---

### 1.3 Sources App - Knowledge Management
**Location:** `ui/suite/sources/`  
**Priority:** HIGH  
**Effort:** 4 days

```html
<!-- sources/sources.html -->
<div class="sources-app">
    <nav class="sources-tabs">
        <button hx-get="/api/sources/prompts" hx-target="#sources-content" class="active">Prompts</button>
        <button hx-get="/api/sources/templates" hx-target="#sources-content">Templates</button>
        <button hx-get="/api/sources/news" hx-target="#sources-content">News</button>
        <button hx-get="/api/sources/mcp-servers" hx-target="#sources-content">MCP Servers</button>
        <button hx-get="/api/sources/llm-tools" hx-target="#sources-content">LLM Tools</button>
        <button hx-get="/api/sources/models" hx-target="#sources-content">Models</button>
    </nav>
    
    <div class="sources-toolbar">
        <input type="search" hx-get="/api/sources/search" hx-trigger="keyup changed delay:300ms"
               hx-target="#sources-content" name="q" placeholder="Search sources...">
    </div>
    
    <main id="sources-content" hx-get="/api/sources/prompts" hx-trigger="load">
        <!-- Content loaded via HTMX -->
    </main>
</div>
```

**API Endpoints to Wire:**
- `GET /api/sources/prompts`
- `GET /api/sources/templates`
- `GET /api/sources/news`
- `GET /api/sources/mcp-servers`
- `GET /api/sources/llm-tools`
- `GET /api/sources/models`
- `GET /api/sources/search`

---

### 1.4 Meet App - Video Conferencing
**Location:** `ui/suite/meet/`  
**Priority:** HIGH  
**Effort:** 6 days

```html
<!-- meet/meet.html -->
<div class="meet-app">
    <header class="meet-header">
        <button hx-post="/api/meet/create" hx-target="#meeting-room">Start Instant Meeting</button>
        <button onclick="showScheduleModal()">Schedule Meeting</button>
    </header>
    
    <!-- Active Rooms -->
    <section class="rooms-list">
        <h3>Active Rooms</h3>
        <div hx-get="/api/meet/rooms" hx-trigger="load, every 10s" id="rooms-list"></div>
    </section>
    
    <!-- Meeting Room -->
    <main id="meeting-room" hx-ext="ws" ws-connect="/ws/meet">
        <div class="video-grid" id="video-grid"></div>
        
        <div class="meeting-controls">
            <button hx-post="/api/meet/rooms/{id}/join">Join</button>
            <button hx-post="/api/voice/start">Unmute</button>
            <button hx-post="/api/voice/stop">Mute</button>
            <button hx-post="/api/meet/transcription/{id}">Start Transcription</button>
        </div>
        
        <!-- Invite Participants -->
        <form hx-post="/api/meet/invite" hx-swap="none">
            <input type="email" name="emails" placeholder="Invite by email...">
            <button type="submit">Send Invite</button>
        </form>
    </main>
</div>

<!-- Schedule Modal -->
<dialog id="schedule-modal">
    <form hx-post="/api/meet/create">
        <input type="text" name="title" placeholder="Meeting Title">
        <input type="datetime-local" name="scheduled_at">
        <textarea name="description" placeholder="Description"></textarea>
        <button type="submit">Schedule</button>
    </form>
</dialog>
```

**API Endpoints to Wire:**
- `POST /api/meet/create`
- `GET /api/meet/rooms`
- `GET /api/meet/rooms/{room_id}`
- `POST /api/meet/rooms/{room_id}/join`
- `POST /api/meet/transcription/{room_id}`
- `POST /api/meet/token`
- `POST /api/meet/invite`
- `WebSocket /ws/meet`

---

### 1.5 Conversations System (Chat Enhancement)
**Location:** `ui/suite/chat/` (enhancement)  
**Priority:** HIGH  
**Effort:** 8 days

```html
<!-- Conversations Panel (add to chat.html) -->
<aside class="conversations-panel">
    <button hx-post="/conversations/create" hx-target="#conversation-list">New Conversation</button>
    
    <div id="conversation-list" hx-get="/conversations/list" hx-trigger="load"></div>
</aside>

<!-- Active Conversation -->
<main class="conversation-main" hx-ext="ws" ws-connect="/ws/conversation/{id}">
    <!-- Members -->
    <div class="conversation-members" hx-get="/conversations/{id}/members" hx-trigger="load"></div>
    
    <!-- Messages -->
    <div class="conversation-messages" id="messages" 
         hx-get="/conversations/{id}/messages" hx-trigger="load"></div>
    
    <!-- Message Input -->
    <form ws-send class="message-form">
        <textarea name="message" placeholder="Type a message..."></textarea>
        <button type="submit">Send</button>
    </form>
    
    <!-- Message Actions (per message) -->
    <template id="message-actions">
        <button hx-post="/conversations/{id}/messages/{msg_id}/edit">Edit</button>
        <button hx-post="/conversations/{id}/messages/{msg_id}/delete">Delete</button>
        <button hx-post="/conversations/{id}/messages/{msg_id}/react">React</button>
        <button hx-post="/conversations/{id}/messages/{msg_id}/pin">Pin</button>
    </template>
    
    <!-- Call Controls -->
    <div class="call-controls">
        <button hx-post="/conversations/{id}/calls/start">Start Call</button>
        <button hx-post="/conversations/{id}/calls/join">Join Call</button>
        <button hx-post="/conversations/{id}/calls/leave">Leave Call</button>
        <button hx-post="/conversations/{id}/calls/mute">Mute</button>
        <button hx-post="/conversations/{id}/calls/unmute">Unmute</button>
        <button hx-post="/conversations/{id}/screen/share">Share Screen</button>
        <button hx-post="/conversations/{id}/screen/stop">Stop Sharing</button>
        <button hx-post="/conversations/{id}/recording/start">Start Recording</button>
        <button hx-post="/conversations/{id}/recording/stop">Stop Recording</button>
    </div>
    
    <!-- Whiteboard -->
    <div class="whiteboard-controls">
        <button hx-post="/conversations/{id}/whiteboard/create">Create Whiteboard</button>
        <button hx-post="/conversations/{id}/whiteboard/collaborate">Collaborate</button>
    </div>
</main>

<!-- Search Messages -->
<div class="message-search">
    <input type="search" hx-get="/conversations/{id}/messages/search" 
           hx-trigger="keyup changed delay:300ms" name="q">
</div>
```

**API Endpoints to Wire (40+ endpoints):**
- `POST /conversations/create`
- `POST /conversations/{id}/join`
- `POST /conversations/{id}/leave`
- `GET /conversations/{id}/members`
- `GET /conversations/{id}/messages`
- `POST /conversations/{id}/messages/send`
- `POST /conversations/{id}/messages/{msg_id}/edit`
- `POST /conversations/{id}/messages/{msg_id}/delete`
- `POST /conversations/{id}/messages/{msg_id}/react`
- `POST /conversations/{id}/messages/{msg_id}/pin`
- `GET /conversations/{id}/messages/search`
- `POST /conversations/{id}/calls/start`
- `POST /conversations/{id}/calls/join`
- `POST /conversations/{id}/calls/leave`
- `POST /conversations/{id}/calls/mute`
- `POST /conversations/{id}/calls/unmute`
- `POST /conversations/{id}/screen/share`
- `POST /conversations/{id}/screen/stop`
- `POST /conversations/{id}/recording/start`
- `POST /conversations/{id}/recording/stop`
- `POST /conversations/{id}/whiteboard/create`
- `POST /conversations/{id}/whiteboard/collaborate`

---

### 1.6 Drive App Completion
**Location:** `ui/suite/drive/` (enhancement)  
**Priority:** MEDIUM  
**Effort:** 5 days

Add missing file operations:

```html
<!-- Add to drive/index.html -->

<!-- File Context Menu -->
<div id="file-context-menu" class="context-menu">
    <button hx-post="/files/copy" hx-include="#selected-file">Copy</button>
    <button hx-post="/files/move" hx-include="#selected-file">Move</button>
    <button hx-get="/files/versions" hx-include="#selected-file" hx-target="#versions-modal">Versions</button>
    <button hx-post="/files/restore" hx-include="#selected-file">Restore</button>
    <button hx-get="/files/permissions" hx-include="#selected-file" hx-target="#permissions-modal">Permissions</button>
</div>

<!-- Sync Status Panel -->
<div class="sync-panel">
    <div hx-get="/files/sync/status" hx-trigger="load, every 5s" id="sync-status"></div>
    <button hx-post="/files/sync/start">Start Sync</button>
    <button hx-post="/files/sync/stop">Stop Sync</button>
</div>

<!-- Storage Quota -->
<div class="storage-quota" hx-get="/files/quota" hx-trigger="load"></div>

<!-- Shared Files View -->
<div id="shared-files" hx-get="/files/shared" hx-trigger="revealed"></div>

<!-- Favorites View -->
<div id="favorites" hx-get="/files/favorite" hx-trigger="revealed"></div>

<!-- Document Processing -->
<dialog id="doc-processing-modal">
    <form hx-post="/docs/merge" hx-include=".selected-files">
        <button type="submit">Merge Documents</button>
    </form>
    <form hx-post="/docs/convert">
        <select name="format">
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
            <option value="html">HTML</option>
        </select>
        <button type="submit">Convert</button>
    </form>
    <form hx-post="/docs/fill" hx-include="#template-data">
        <button type="submit">Fill Template</button>
    </form>
</dialog>
```

**API Endpoints to Wire:**
- `POST /files/read`
- `POST /files/write`
- `POST /files/copy`
- `POST /files/move`
- `POST /files/shareFolder`
- `GET /files/shared`
- `GET /files/permissions`
- `GET /files/quota`
- `GET /files/sync/status`
- `POST /files/sync/start`
- `POST /files/sync/stop`
- `GET /files/versions`
- `POST /files/restore`
- `POST /docs/merge`
- `POST /docs/convert`
- `POST /docs/fill`
- `POST /docs/export`
- `POST /docs/import`

---

### 1.7 Calendar App Completion
**Location:** `ui/suite/calendar/` (enhancement)  
**Priority:** MEDIUM  
**Effort:** 3 days

```html
<!-- Add to calendar/calendar.html -->

<!-- Event CRUD -->
<div class="event-actions">
    <button hx-get="/api/calendar/events/{id}" hx-target="#event-detail">View</button>
    <button hx-put="/api/calendar/events/{id}" hx-include="#event-form">Update</button>
    <button hx-delete="/api/calendar/events/{id}" hx-confirm="Delete this event?">Delete</button>
</div>

<!-- Import/Export -->
<div class="calendar-io">
    <a hx-get="/api/calendar/export.ics" download="calendar.ics">Export iCal</a>
    <form hx-post="/api/calendar/import" hx-encoding="multipart/form-data">
        <input type="file" name="ical" accept=".ics">
        <button type="submit">Import iCal</button>
    </form>
</div>
```

**API Endpoints to Wire:**
- `GET /api/calendar/events/{id}`
- `PUT /api/calendar/events/{id}`
- `DELETE /api/calendar/events/{id}`
- `GET /api/calendar/export.ics`
- `POST /api/calendar/import`

---

### 1.8 Email App Completion
**Location:** `ui/suite/mail/` (enhancement)  
**Priority:** MEDIUM  
**Effort:** 4 days

```html
<!-- Add to mail/mail.html -->

<!-- Account Management -->
<div class="email-accounts" hx-get="/api/email/accounts" hx-trigger="load">
    <button hx-get="/api/email/compose" hx-target="#compose-modal">Compose</button>
</div>

<!-- Add Account -->
<dialog id="add-account-modal">
    <form hx-post="/api/email/accounts/add" hx-target="#email-accounts">
        <input type="email" name="email" placeholder="Email address">
        <input type="password" name="password" placeholder="Password">
        <select name="provider">
            <option value="gmail">Gmail</option>
            <option value="outlook">Outlook</option>
            <option value="imap">Custom IMAP</option>
        </select>
        <button type="submit">Add Account</button>
    </form>
</dialog>

<!-- Compose Email -->
<dialog id="compose-modal">
    <form hx-post="/api/email/send" hx-swap="none">
        <input type="email" name="to" placeholder="To">
        <input type="email" name="cc" placeholder="Cc">
        <input type="text" name="subject" placeholder="Subject">
        <textarea name="body"></textarea>
        <button type="submit">Send</button>
        <button type="button" hx-post="/api/email/draft">Save Draft</button>
    </form>
</dialog>

<!-- Tracking Stats -->
<div class="tracking-stats" hx-get="/api/email/tracking/stats" hx-trigger="load"></div>
```

**API Endpoints to Wire:**
- `GET /api/email/accounts`
- `POST /api/email/accounts/add`
- `DELETE /api/email/accounts/{account_id}`
- `GET /api/email/compose`
- `POST /api/email/send`
- `POST /api/email/draft`
- `GET /api/email/folders/{account_id}`
- `GET /api/email/tracking/stats`
- `GET /api/email/tracking/status/{tracking_id}`

---

## Phase 2: Admin Panel ($55,000 - 4 weeks)

### 2.1 User Management
**Location:** `ui/suite/admin/users.html`  
**Priority:** CRITICAL  
**Effort:** 8 days

```html
<!-- admin/users.html -->
<div class="admin-users">
    <header class="admin-header">
        <h1>User Management</h1>
        <button hx-get="/users/create" hx-target="#user-modal-content">Add User</button>
    </header>
    
    <!-- User Search & Filter -->
    <div class="user-filters">
        <input type="search" hx-get="/users/search" hx-trigger="keyup changed delay:300ms"
               hx-target="#users-table" name="q" placeholder="Search users...">
        <select hx-get="/users/list" hx-target="#users-table" name="status">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
        </select>
    </div>
    
    <!-- Users Table -->
    <table class="data-table">
        <thead>
            <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody id="users-table" hx-get="/users/list" hx-trigger="load"></tbody>
    </table>
    
    <!-- User Modal -->
    <dialog id="user-modal">
        <div id="user-modal-content"></div>
    </dialog>
</div>

<!-- User Form Template (returned by server) -->
<template id="user-form">
    <form hx-post="/users/create" hx-target="#users-table">
        <input type="text" name="name" placeholder="Full Name" required>
        <input type="email" name="email" placeholder="Email" required>
        <select name="role">
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
        </select>
        <button type="submit">Create User</button>
    </form>
</template>

<!-- User Detail View -->
<div class="user-detail" id="user-detail">
    <div hx-get="/users/{user_id}/profile" hx-trigger="user-selected"></div>
    
    <div class="user-tabs">
        <button hx-get="/users/{user_id}/settings" hx-target="#user-tab-content">Settings</button>
        <button hx-get="/users/{user_id}/permissions" hx-target="#user-tab-content">Permissions</button>
        <button hx-get="/users/{user_id}/roles" hx-target="#user-tab-content">Roles</button>
        <button hx-get="/users/{user_id}/activity" hx-target="#user-tab-content">Activity</button>
        <button hx-get="/users/{user_id}/presence" hx-target="#user-tab-content">Presence</button>
    </div>
    
    <div id="user-tab-content"></div>
    
    <!-- User Actions -->
    <div class="user-actions">
        <button hx-put="/users/{user_id}/update" hx-include="#user-form">Save Changes</button>
        <button hx-delete="/users/{user_id}/delete" hx-confirm="Delete this user?">Delete User</button>
    </div>
    
    <!-- Security Section -->
    <div class="user-security">
        <h3>Security</h3>
        <button hx-post="/users/{user_id}/security/2fa/enable">Enable 2FA</button>
        <button hx-post="/users/{user_id}/security/2fa/disable">Disable 2FA</button>
        <div hx-get="/users/{user_id}/security/devices" hx-trigger="load">Devices</div>
        <div hx-get="/users/{user_id}/security/sessions" hx-trigger="load">Sessions</div>
    </div>
    
    <!-- Notifications -->
    <div class="user-notifications">
        <h3>Notification Preferences</h3>
        <form hx-post="/users/{user_id}/notifications/preferences/update">
            <!-- Notification settings -->
        </form>
    </div>
</div>
```

**API Endpoints to Wire:**
- `POST /users/create`
- `PUT /users/{user_id}/update`
- `DELETE /users/{user_id}/delete`
- `GET /users/list`
- `GET /users/search`
- `GET /users/{user_id}/profile`
- `GET /users/{user_id}/settings`
- `GET /users/{user_id}/permissions`
- `GET /users/{user_id}/roles`
- `GET /users/{user_id}/status`
- `GET /users/{user_id}/presence`
- `GET /users/{user_id}/activity`
- `POST /users/{user_id}/security/2fa/enable`
- `POST /users/{user_id}/security/2fa/disable`
- `GET /users/{user_id}/security/devices`
- `GET /users/{user_id}/security/sessions`
- `POST /users/{user_id}/notifications/preferences/update`

---

### 2.2 Group Management
**Location:** `ui/suite/admin/groups.html`  
**Priority:** CRITICAL  
**Effort:** 6 days

```html
<!-- admin/groups.html -->
<div class="admin-groups">
    <header class="admin-header">
        <h1>Group Management</h1>
        <button hx-post="/groups/create" hx-target="#groups-list">Create Group</button>
    </header>
    
    <!-- Groups List -->
    <div class="groups-grid" id="groups-list" hx-get="/groups/list" hx-trigger="load"></div>
    
    <!-- Group Search -->
    <input type="search" hx-get="/groups/search" hx-trigger="keyup changed delay:300ms"
           hx-target="#groups-list" name="q" placeholder="Search groups...">
    
    <!-- Group Detail -->
    <aside class="group-detail" id="group-detail">
        <div class="group-info"></div>
        
        <!-- Members -->
        <section class="group-members">
            <h3>Members</h3>
            <div hx-get="/groups/{group_id}/members" hx-trigger="group-selected"></div>
            <form hx-post="/groups/{group_id}/members/add">
                <input type="text" name="user_id" placeholder="Add member...">
                <button type="submit">Add</button>
            </form>
        </section>
        
        <!-- Member Roles -->
        <form hx-post="/groups/{group_id}/members/roles">
            <select name="role">
                <option value="member">Member</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
            </select>
            <button type="submit">Update Role</button>
        </form>
        
        <!-- Group Settings -->
        <section class="group-settings">
            <div hx-get="/groups/{group_id}/settings" hx-trigger="load"></div>
            <div hx-get="/groups/{group_id}/permissions" hx-trigger="load"></div>
            <div hx-get="/groups/{group_id}/analytics" hx-trigger="load"></div>
        </section>
        
        <!-- Join Requests -->
        <section class="join-requests">
            <h3>Join Requests</h3>
            <div hx-get="/groups/{group_id}/join/requests" hx-trigger="load"></div>
            <button hx-post="/groups/{group_id}/join/approve">Approve</button>
            <button hx-post="/groups/{group_id}/join/reject">Reject</button>
        </section>
        
        <!-- Invites -->
        <section class="group-invites">
            <h3>Invites</h3>
            <form hx-post="/groups/{group_id}/invites/send">
                <input type="email" name="email" placeholder="Email to invite">
                <button type="submit">Send Invite</button>
            </form>
            <div hx-get="/groups/{group_id}/invites/list" hx-trigger="load"></div>
        </section>
        
        <!-- Group Actions -->
        <div class="group-actions">
            <button hx-put="/groups/{group_id}/update" hx-include="#group-form">Save</button>
            <button hx-delete="/groups/{group_id}/delete" hx-confirm="Delete group?">Delete</button>
        </div>
    </aside>
</div>
```

**API Endpoints to Wire:**
- `POST /groups/create`
- `PUT /groups/{group_id}/update`
- `DELETE /groups/{group_id}/delete`
- `GET /groups/list`
- `GET /groups/search`
- `GET /groups/{group_id}/members`
- `POST /groups/{group_id}/members/add`
- `POST /groups/{group_id}/members/roles`
- `DELETE /groups/{group_id}/members/remove`
- `GET /groups/{group_id}/permissions`
- `GET /groups/{group_id}/settings`
- `GET /groups/{group_id}/analytics`
- `POST /groups/{group_id}/join/request`
- `POST /groups/{group_id}/join/approve`
- `POST /groups/{group_id}/join/reject`
- `POST /groups/{group_id}/invites/send`
- `GET /groups/{group_id}/invites/list`

---

### 2.3 DNS Management
**Location:** `ui/suite/admin/dns.html`  
**Priority:** MEDIUM  
**Effort:** 2 days

```html
<!-- admin/dns.html -->
<div class="admin-dns">
    <header class="admin-header">
        <h1>Dynamic DNS Management</h1>
    </header>
    
    <!-- Register Hostname -->
    <section class="dns-register">
        <h2>Register Hostname</h2>
        <form hx-post="/api/dns/register" hx-target="#dns-result">
            <input type="text" name="hostname" placeholder="subdomain.yourdomain.com" required>
            <input type="text" name="ip" placeholder="IP Address (leave empty for auto-detect)">
            <select name="type">
                <option value="A">A Record</option>
                <option value="AAAA">AAAA Record</option>
                <option value="CNAME">CNAME</option>
            </select>
            <button type="submit">Register</button>
        </form>
    </section>
    
    <!-- Registered Hostnames -->
    <section class="dns-list">
        <h2>Registered Hostnames</h2>
        <div id="dns-list" hx-get="/api/dns/list" hx-trigger="load"></div>
    </section>
    
    <!-- Remove Hostname -->
    <form hx-post="/api/dns/remove" hx-target="#dns-result">
        <input type="text" name="hostname" placeholder="Hostname to remove">
        <button type="submit" class="btn-danger">Remove</button>
    </form>
    
    <div id="dns-result"></div>
</div>
```

**API Endpoints to Wire:**
- `POST /api/dns/register`
- `POST /api/dns/remove`

---

### 2.4 Admin Dashboard & Navigation
**Location:** `ui/suite/admin/index.html`  
**Priority:** HIGH  
**Effort:** 3 days

```html
<!-- admin/index.html -->
<div class="admin-layout">
    <aside class="admin-sidebar">
        <nav class="admin-nav">
            <a hx-get="/admin/dashboard" hx-target="#admin-content" class="active">
                <svg><!-- Dashboard icon --></svg>
                Dashboard
            </a>
            <a hx-get="/admin/users" hx-target="#admin-content">
                <svg><!-- Users icon --></svg>
                Users
            </a>
            <a hx-get="/admin/groups" hx-target="#admin-content">
                <svg><!-- Groups icon --></svg>
                Groups
            </a>
            <a hx-get="/admin/bots" hx-target="#admin-content">
                <svg><!-- Bot icon --></svg>
                Bots
            </a>
            <a hx-get="/admin/dns" hx-target="#admin-content">
                <svg><!-- DNS icon --></svg>
                DNS
            </a>
            <a hx-get="/admin/audit" hx-target="#admin-content">
                <svg><!-- Audit icon --></svg>
                Audit Log
            </a>
            <a hx-get="/admin/billing" hx-target="#admin-content">
                <svg><!-- Billing icon --></svg>
                Billing
            </a>
        </nav>
    </aside>
    
    <main id="admin-content" hx-get="/admin/dashboard" hx-trigger="load">
        <!-- Admin content loaded here -->
    </main>
</div>
```

---

## Phase 3: Settings Enhancement ($30,000 - 2 weeks)

### 3.1 Settings Subviews Structure
**Location:** `ui/suite/settings/`  
**Priority:** HIGH  
**Effort:** 10 days

```
ui/suite/settings/
├── index.html          # Settings shell with navigation
├── profile.html        # User profile settings
├── security.html       # 2FA, sessions, devices
├── appearance.html     # Theme, layout preferences
├── notifications.html  # Email, push, in-app
├── storage.html        # Cloud sync, quotas
├── integrations.html   # API keys, webhooks, OAuth
├── privacy.html        # Data export, deletion
└── billing.html        # Subscription, invoices
```

```html
<!-- settings/index.html -->
<div class="settings-layout">
    <aside class="settings-nav">
        <a hx-get="/settings/profile" hx-target="#settings-content" class="active">Profile</a>
        <a hx-get="/settings/security" hx-target="#settings-content">Security</a>
        <a hx-get="/settings/appearance" hx-target="#settings-content">Appearance</a>
        <a hx-get="/settings/notifications" hx-target="#settings-content">Notifications</a>
        <a hx-get="/settings/storage" hx-target="#settings-content">Storage & Sync</a>
        <a hx-get="/settings/integrations" hx-target="#settings-content">Integrations</a>
        <a hx-get="/settings/privacy" hx-target="#settings-content">Privacy</a>
        <a hx-get="/settings/billing" hx-target="#settings-content">Billing</a>
    </aside>
    
    <main id="settings-content" hx-get="/settings/profile" hx-trigger="load">
        <!-- Settings content loaded here -->
    </main>
</div>

<!-- settings/security.html -->
<div class="settings-section">
    <h2>Security Settings</h2>
    
    <!-- Two-Factor Authentication -->
    <div class="setting-card">
        <h3>Two-Factor Authentication</h3>
        <div hx-get="/api/user/2fa/status" hx-trigger="load" id="2fa-status"></div>
        <button hx-post="/api/user/2fa/enable" hx-target="#2fa-setup">Enable 2FA</button>
        <div id="2fa-setup"></div>
    </div>
    
    <!-- Active Sessions -->
    <div class="setting-card">
        <h3>Active Sessions</h3>
        <div hx-get="/api/user/sessions" hx-trigger="load" id="sessions-list"></div>
        <button hx-post="/api/user/sessions/revoke-all" hx-confirm="Sign out all other devices?">
            Sign Out All Other Devices
        </button>
    </div>
    
    <!-- Connected Devices -->
    <div class="setting-card">
        <h3>Connected Devices</h3>
        <div hx-get="/api/user/devices" hx-trigger="load" id="devices-list"></div>
    </div>
    
    <!-- Password Change -->
    <div class="setting-card">
        <h3>Change Password</h3>
        <form hx-post="/api/user/password/change" hx-swap="none">
            <input type="password" name="current" placeholder="Current Password" required>
            <input type="password" name="new" placeholder="New Password" required>
            <input type="password" name="confirm" placeholder="Confirm New Password" required>
            <button type="submit">Update Password</button>
        </form>
    </div>
</div>

<!-- settings/integrations.html -->
<div class="settings-section">
    <h2>Integrations</h2>
    
    <!-- API Keys -->
    <div class="setting-card">
        <h3>API Keys</h3>
        <div hx-get="/api/user/api-keys" hx-trigger="load" id="api-keys-list"></div>
        <form hx-post="/api/user/api-keys/create" hx-target="#api-keys-list" hx-swap="beforeend">
            <input type="text" name="name" placeholder="Key Name" required>
            <select name="scope">
                <option value="read">Read Only</option>
                <option value="write">Read/Write</option>
                <option value="admin">Full Access</option>
            </select>
            <button type="submit">Generate Key</button>
        </form>
    </div>
    
    <!-- Webhooks -->
    <div class="setting-card">
        <h3>Webhooks</h3>
        <div hx-get="/api/user/webhooks" hx-trigger="load" id="webhooks-list"></div>
        <form hx-post="/api/user/webhooks/create" hx-target="#webhooks-list">
            <input type="url" name="url" placeholder="Webhook URL" required>
            <select name="events" multiple>
                <option value="message.created">New Message</option>
                <option value="file.uploaded">File Uploaded</option>
                <option value="meeting.started">Meeting Started</option>
            </select>
            <button type="submit">Add Webhook</button>
        </form>
    </div>
    
    <!-- OAuth Connections -->
    <div class="setting-card">
        <h3>Connected Accounts</h3>
        <div class="oauth-providers">
            <button hx-get="/api/auth/oauth/google" class="oauth-btn google">Connect Google</button>
            <button hx-get="/api/auth/oauth/microsoft" class="oauth-btn microsoft">Connect Microsoft</button>
            <button hx-get="/api/auth/oauth/github" class="oauth-btn github">Connect GitHub</button>
        </div>
        <div hx-get="/api/user/oauth/connections" hx-trigger="load" id="oauth-connections"></div>
    </div>
</div>
```

---

## Phase 4: Monitoring Enhancement ($25,000 - 2 weeks)

### 4.1 Monitoring Subviews
**Location:** `ui/suite/monitoring/`  
**Priority:** HIGH  
**Effort:** 8 days

```
ui/suite/monitoring/
├── index.html          # Main monitoring dashboard
├── services.html       # Service health status
├── resources.html      # CPU, Memory, Disk
├── logs.html           # Real-time logs viewer
├── metrics.html        # Prometheus metrics
├── alerts.html         # Alert configuration
└── health.html         # Health check endpoints
```

```html
<!-- monitoring/services.html -->
<div class="monitoring-services">
    <h2>Service Health</h2>
    
    <!-- Service Status Grid -->
    <div class="services-grid" hx-get="/api/services/status" hx-trigger="load, every 10s">
        <!-- Rendered by server -->
    </div>
    
    <!-- Individual Service Details -->
    <div class="service-details" id="service-details"></div>
</div>

<!-- monitoring/logs.html -->
<div class="monitoring-logs" hx-ext="ws" ws-connect="/ws/logs">
    <div class="log-filters">
        <select name="level" hx-get="/api/logs" hx-trigger="change" hx-target="#log-stream">
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
        </select>
        <select name="service" hx-get="/api/logs" hx-trigger="change" hx-target="#log-stream">
            <option value="all">All Services</option>
            <option value="api">API Server</option>
            <option value="worker">Workers</option>
            <option value="database">Database</option>
        </select>
    </div>
    
    <div id="log-stream" class="log-stream">
        <!-- Real-time logs via WebSocket -->
    </div>
</div>

<!-- monitoring/metrics.html -->
<div class="monitoring-metrics">
    <h2>System Metrics</h2>
    
    <!-- Core Metrics -->
    <div class="metrics-grid">
        <div class="metric-card" hx-get="/api/analytics/dashboard" hx-trigger="load, every 30s">
            <!-- Dashboard metrics -->
        </div>
        <div class="metric-card" hx-get="/api/analytics/metric?name=cpu" hx-trigger="load, every 5s">
            <!-- CPU metrics -->
        </div>
        <div class="metric-card" hx-get="/api/analytics/metric?name=memory" hx-trigger="load, every 5s">
            <!-- Memory metrics -->
        </div>
        <div class="metric-card" hx-get="/api/analytics/metric?name=disk" hx-trigger="load, every 30s">
            <!-- Disk metrics -->
        </div>
    </div>
    
    <!-- Prometheus Export -->
    <a href="/metrics" target="_blank" class="btn">View Raw Metrics</a>
</div>

<!-- monitoring/alerts.html -->
<div class="monitoring-alerts">
    <h2>Alert Configuration</h2>
    
    <!-- Active Alerts -->
    <div class="active-alerts" hx-get="/api/alerts/active" hx-trigger="load, every 30s">
        <!-- Active alerts list -->
    </div>
    
    <!-- Alert Rules -->
    <div class="alert-rules" hx-get="/api/alerts/rules" hx-trigger="load">
        <!-- Alert rules list -->
    </div>
    
    <!-- Create Alert Rule -->
    <form hx-post="/api/alerts/rules/create" hx-target=".alert-rules">
        <input type="text" name="name" placeholder="Alert Name" required>
        <select name="metric">
            <option value="cpu">CPU Usage</option>
            <option value="memory">Memory Usage</option>
            <option value="disk">Disk Usage</option>
            <option value="errors">Error Rate</option>
            <option value="latency">Response Latency</option>
        </select>
        <select name="condition">
            <option value="gt">Greater Than</option>
            <option value="lt">Less Than</option>
            <option value="eq">Equals</option>
        </select>
        <input type="number" name="threshold" placeholder="Threshold" required>
        <select name="notify">
            <option value="email">Email</option>
            <option value="slack">Slack</option>
            <option value="webhook">Webhook</option>
        </select>
        <button type="submit">Create Alert</button>
    </form>
</div>
```

**API Endpoints to Wire:**
- `GET /api/services/status`
- `GET /api/analytics/dashboard`
- `GET /api/analytics/metric`
- `GET /metrics`
- `WebSocket /ws/logs`

---

## Phase 5: Authentication & Security ($25,000 - 2 weeks)

### 5.1 Complete Auth Flow
**Location:** `ui/suite/auth/`  
**Priority:** CRITICAL  
**Effort:** 8 days

```html
<!-- auth/login.html (enhance existing) -->
<div class="auth-page">
    <div class="auth-card">
        <h1>Sign In</h1>
        
        <!-- Standard Login -->
        <form hx-post="/api/auth/login" hx-target="#auth-result">
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Sign In</button>
        </form>
        
        <!-- OAuth Providers -->
        <div class="oauth-buttons">
            <button hx-get="/api/auth/oauth/google" class="oauth-btn google">
                Continue with Google
            </button>
            <button hx-get="/api/auth/oauth/microsoft" class="oauth-btn microsoft">
                Continue with Microsoft
            </button>
        </div>
        
        <!-- 2FA Challenge (shown when required) -->
        <div id="2fa-challenge" style="display: none;">
            <form hx-post="/api/auth/2fa/verify" hx-target="#auth-result">
                <input type="text" name="code" placeholder="2FA Code" maxlength="6" required>
                <button type="submit">Verify</button>
            </form>
        </div>
        
        <div id="auth-result"></div>
        
        <!-- Links -->
        <div class="auth-links">
            <a href="/auth/forgot-password">Forgot Password?</a>
            <a href="/auth/register">Create Account</a>
        </div>
    </div>
</div>

<!-- auth/register.html -->
<div class="auth-page">
    <div class="auth-card">
        <h1>Create Account</h1>
        
        <form hx-post="/api/auth/register" hx-target="#register-result">
            <input type="text" name="name" placeholder="Full Name" required>
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="password" placeholder="Password" required>
            <input type="password" name="password_confirm" placeholder="Confirm Password" required>
            <label>
                <input type="checkbox" name="terms" required>
                I agree to the Terms of Service
            </label>
            <button type="submit">Create Account</button>
        </form>
        
        <div id="register-result"></div>
    </div>
</div>

<!-- auth/forgot-password.html -->
<div class="auth-page">
    <div class="auth-card">
        <h1>Reset Password</h1>
        
        <form hx-post="/api/auth/forgot-password" hx-target="#reset-result">
            <input type="email" name="email" placeholder="Email" required>
            <button type="submit">Send Reset Link</button>
        </form>
        
        <div id="reset-result"></div>
    </div>
</div>

<!-- auth/reset-password.html -->
<div class="auth-page">
    <div class="auth-card">
        <h1>Set New Password</h1>
        
        <form hx-post="/api/auth/reset-password" hx-target="#reset-result">
            <input type="hidden" name="token" value="{{ token }}">
            <input type="password" name="password" placeholder="New Password" required>
            <input type="password" name="password_confirm" placeholder="Confirm Password" required>
            <button type="submit">Reset Password</button>
        </form>
        
        <div id="reset-result"></div>
    </div>
</div>
```

---

## Phase 6: Polish & Integration ($20,000 - 2 weeks)

### 6.1 Navigation Updates
Update `base.html` to include all new apps and admin sections:

```html
<!-- Add to base.html navigation -->
<nav class="app-nav">
    <!-- Existing Apps -->
    <a hx-get="/chat/chat.html" hx-target="#main-content">Chat</a>
    <a hx-get="/drive/index.html" hx-target="#main-content">Drive</a>
    <a hx-get="/mail/mail.html" hx-target="#main-content">Mail</a>
    <a hx-get="/calendar/calendar.html" hx-target="#main-content">Calendar</a>
    <a hx-get="/tasks/tasks.html" hx-target="#main-content">Tasks</a>
    
    <!-- New Apps -->
    <a hx-get="/meet/meet.html" hx-target="#main-content">Meet</a>
    <a hx-get="/paper/paper.html" hx-target="#main-content">Paper</a>
    <a hx-get="/research/research.html" hx-target="#main-content">Research</a>
    <a hx-get="/sources/sources.html" hx-target="#main-content">Sources</a>
    
    <!-- Tools -->
    <a hx-get="/designer.html" hx-target="#main-content">Designer</a>
    <a hx-get="/analytics/analytics.html" hx-target="#main-content">Analytics</a>
    
    <!-- Admin (role-based visibility) -->
    <a hx-get="/admin/index.html" hx-target="#main-content" class="admin-only">Admin</a>
    
    <!-- User Menu -->
    <a hx-get="/settings/index.html" hx-target="#main-content">Settings</a>
    <a hx-get="/monitoring/index.html" hx-target="#main-content">Monitoring</a>
</nav>
```

### 6.2 Mobile Responsiveness
- Ensure all new views are mobile-friendly
- Add touch-friendly controls for Meet
- Responsive tables for Admin views

### 6.3 Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader compatibility

### 6.4 Internationalization Preparation
- Extract all strings to translation files
- RTL layout support
- Date/time localization

---

## File Structure Summary

```
botui/ui/suite/
├── admin/
│   ├── index.html           # Admin dashboard shell
│   ├── users.html           # User management
│   ├── groups.html          # Group management
│   ├── dns.html             # DNS management
│   ├── bots.html            # Bot management
│   ├── audit.html           # Audit logs
│   └── billing.html         # Billing/subscription
├── auth/
│   ├── login.html           # Enhanced login
│   ├── register.html        # Registration
│   ├── forgot-password.html # Password reset request
│   └── reset-password.html  # Password reset form
├── settings/
│   ├── index.html           # Settings shell
│   ├── profile.html         # Profile settings
│   ├── security.html        # Security settings
│   ├── appearance.html      # Theme settings
│   ├── notifications.html   # Notification prefs
│   ├── storage.html         # Storage & sync
│   ├── integrations.html    # API keys, webhooks
│   ├── privacy.html         # Privacy settings
│   └── billing.html         # User billing
├── monitoring/
│   ├── index.html           # Monitoring shell
│   ├── services.html        # Service health
│   ├── resources.html       # System resources
│   ├── logs.html            # Log viewer
│   ├── metrics.html         # Metrics dashboard
│   ├── alerts.html          # Alert config
│   └── health.html          # Health checks
├── paper/
│   └── paper.html           # Document editor
├── research/
│   └── research.html        # Research collections
├── sources/
│   └── sources.html         # Knowledge sources
├── meet/
│   └── meet.html            # Video conferencing
├── chat/
│   └── conversations.html   # Enhanced conversations
├── drive/
│   └── index.html           # Enhanced (add file ops)
├── calendar/
│   └── calendar.html        # Enhanced (add CRUD)
└── mail/
    └── mail.html            # Enhanced (add compose)
```

---

## Budget Breakdown

| Phase | Description | Duration | Cost |
|-------|-------------|----------|------|
| 1 | Core Apps (Paper, Research, Sources, Meet, Conversations, Drive, Calendar, Email) | 3 weeks | $45,000 |
| 2 | Admin Panel (Users, Groups, DNS, Dashboard) | 4 weeks | $55,000 |
| 3 | Settings Enhancement | 2 weeks | $30,000 |
| 4 | Monitoring Enhancement | 2 weeks | $25,000 |
| 5 | Authentication & Security | 2 weeks | $25,000 |
| 6 | Polish & Integration | 2 weeks | $20,000 |
| **Total** | | **15 weeks** | **$200,000** |

---

## Technical Requirements

### Developer Skills Required
- Rust (Axum, Askama templates)
- HTMX patterns
- HTML5/CSS3 (responsive design)
- WebSocket integration
- OAuth 2.0 / OpenID Connect

### Development Environment
- Rust 1.90.0+
- Node.js (for build tools only)
- PostgreSQL
- Redis
- MinIO

### Quality Standards
- Zero warnings in Rust compilation
- All HTMX patterns - minimal JavaScript
- Local assets only (no CDN)
- Mobile-responsive design
- WCAG 2.1 AA accessibility
- Comprehensive error handling

---

## Recommended Implementation Order

1. **Week 1-2:** Paper App + Research App (high user value)
2. **Week 3-4:** Sources App + Meet App (completes productivity suite)
3. **Week 5-6:** Conversations System (enhances Chat)
4. **Week 7-8:** User Management + Group Management (admin critical)
5. **Week 9-10:** Settings Enhancement (user self-service)
6. **Week 11-12:** Monitoring Enhancement (ops critical)
7. **Week 13-14:** Auth Enhancement + DNS (security)
8. **Week 15:** Polish, Testing, Documentation

---

## Success Criteria

- [ ] All 100+ API endpoints wired to UI
- [ ] Full CRUD operations for all entities
- [ ] Real-time updates via WebSocket where applicable
- [ ] Mobile-responsive on all views
- [ ] Admin panel fully functional
- [ ] User self-service settings complete
- [ ] Monitoring dashboard operational
- [ ] OAuth providers working (Google, Microsoft)
- [ ] 2FA implementation complete
- [ ] Zero JavaScript where HTMX suffices
- [ ] Production-ready error handling
- [ ] Internationalization-ready strings

---

## Notes for Developers

1. **HTMX First:** Always prefer HTMX attributes over custom JavaScript
2. **Server Rendering:** All dynamic content rendered server-side via Askama
3. **Local Assets:** Never use CDN - all vendor JS/CSS in `ui/suite/js/vendor/`
4. **Icons:** Use existing icons from `ui/suite/assets/icons/` - never generate new ones
5. **Themes:** Respect the 6-theme system via CSS variables
6. **Error Handling:** Let errors bubble up - no silent failures
7. **Version:** All work targets version 6.1.0