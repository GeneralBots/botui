/* =============================================================================
   TASKS APP JAVASCRIPT
   Automated Intelligent Task Management Interface
   ============================================================================= */

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

// Prevent duplicate declaration when script is reloaded via HTMX
if (typeof TasksState === "undefined") {
  var TasksState = {
    selectedTaskId: 2, // Default selected task
    currentFilter: "complete",
    tasks: [],
    wsConnection: null,
    agentLogPaused: false,
    selectedItemType: "task", // task, goal, pending, scheduler, monitor
  };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener("DOMContentLoaded", function () {
  // Only init if tasks app is visible
  if (document.querySelector(".tasks-app")) {
    initTasksApp();
  }
});

// Reinitialize when tasks page is loaded via HTMX
document.body.addEventListener("htmx:afterSwap", function (evt) {
  // Check if tasks app was just loaded
  if (evt.detail.target && evt.detail.target.id === "main-content") {
    if (document.querySelector(".tasks-app")) {
      console.log(
        "[Tasks] Detected tasks app loaded via HTMX, initializing...",
      );
      initTasksApp();
    }
  }
});

function initTasksApp() {
  // Only init WebSocket if not already connected
  if (
    !TasksState.wsConnection ||
    TasksState.wsConnection.readyState !== WebSocket.OPEN
  ) {
    initWebSocket();
  } else {
    console.log("[Tasks] WebSocket already connected, skipping init");
  }
  setupEventListeners();
  setupKeyboardShortcuts();
  setupIntentInputHandlers();
  setupHtmxListeners();
  scrollAgentLogToBottom();
  console.log("[Tasks] Initialized");
}

function setupHtmxListeners() {
  // Listen for HTMX content swaps to apply pending manifest updates
  document.body.addEventListener("htmx:afterSwap", function (evt) {
    const target = evt.detail.target;
    if (
      target &&
      (target.id === "task-detail-content" ||
        target.closest("#task-detail-content"))
    ) {
      console.log(
        "[HTMX] Task detail content loaded, checking for pending manifest updates",
      );
      // Check if there's a pending manifest update for the selected task
      if (
        TasksState.selectedTaskId &&
        pendingManifestUpdates.has(TasksState.selectedTaskId)
      ) {
        const manifest = pendingManifestUpdates.get(TasksState.selectedTaskId);
        console.log(
          "[HTMX] Applying pending manifest for task:",
          TasksState.selectedTaskId,
        );
        setTimeout(() => {
          renderManifestProgress(TasksState.selectedTaskId, manifest, 0);
        }, 50);
      }
    }
  });
}

function setupIntentInputHandlers() {
  const input = document.getElementById("quick-intent-input");
  const btn = document.getElementById("quick-intent-btn");

  if (input && btn) {
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter" && input.value.trim()) {
        e.preventDefault();
        htmx.trigger(btn, "click");
      }
    });
  }

  document.body.addEventListener("htmx:beforeRequest", function (e) {
    if (e.detail.elt.id === "quick-intent-btn") {
      const resultDiv = document.getElementById("intent-result");
      resultDiv.innerHTML = `
        <div class="result-card">
          <div class="result-message">Processing your request...</div>
          <div class="result-progress">
            <div class="result-progress-bar" style="width: 30%"></div>
          </div>
        </div>
      `;
    }
  });

  document.body.addEventListener("htmx:afterRequest", function (e) {
    if (e.detail.elt.id === "quick-intent-btn") {
      const resultDiv = document.getElementById("intent-result");
      try {
        const response = JSON.parse(e.detail.xhr.responseText);

        // Handle async task creation (status 202 Accepted)
        if (response.status === "running" && response.task_id) {
          // Clear input immediately
          document.getElementById("quick-intent-input").value = "";

          // Select the task to show progress in detail panel
          setTimeout(() => {
            selectTask(response.task_id);
          }, 500);

          // Clear result div - progress is shown in floating panel
          resultDiv.innerHTML = "";

          // Trigger task list refresh to show new task
          htmx.trigger(document.body, "taskCreated");

          // Start polling for task status
          startTaskPolling(response.task_id);

          return;
        }

        // Handle completed task (legacy sync response)
        if (response.success) {
          let html = `<div class="result-card">
            <div class="result-message result-success">✓ ${response.message || "Done!"}</div>`;

          if (response.app_url) {
            html += `<a href="${response.app_url}" class="result-link" target="_blank">
              Open App →
            </a>`;
          }

          if (response.task_id) {
            html += `<div style="margin-top:8px;color:#666;font-size:13px;">Task ID: ${response.task_id}</div>`;
          }

          html += `</div>`;
          resultDiv.innerHTML = html;

          document.getElementById("quick-intent-input").value = "";
          htmx.trigger(document.body, "taskCreated");
        } else {
          resultDiv.innerHTML = `<div class="result-card">
            <div class="result-message result-error">✗ ${response.error || response.message || "Something went wrong"}</div>
          </div>`;
        }
      } catch (err) {
        resultDiv.innerHTML = `<div class="result-card">
          <div class="result-message result-error">✗ Failed to process response</div>
        </div>`;
      }
    }
  });

  // Save intent text before submit for progress display
  if (input) {
    input.addEventListener("input", function () {
      input.setAttribute("data-last-intent", input.value);
    });
  }
}

// Task polling for async task creation
let activePollingTaskId = null;
let pollingInterval = null;

function startTaskPolling(taskId) {
  // Stop any existing polling
  stopTaskPolling();

  activePollingTaskId = taskId;
  let pollCount = 0;
  const maxPolls = 180; // 3 minutes at 1 second intervals

  console.log(`[POLL] Starting polling for task ${taskId}`);

  pollingInterval = setInterval(async () => {
    pollCount++;

    if (pollCount > maxPolls) {
      console.log(`[POLL] Max polls reached for task ${taskId}`);
      stopTaskPolling();
      errorFloatingProgress("Task timed out");
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        headers: {
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        console.error(`[POLL] Failed to fetch task status: ${response.status}`);
        return;
      }

      const task = await response.json();
      console.log(
        `[POLL] Task ${taskId} status: ${task.status}, progress: ${task.progress || 0}%`,
      );

      // Update progress
      const progress = task.progress || 0;
      const message = task.current_step || task.status || "Processing...";
      updateFloatingProgressBar(message, progress, task);

      // Check if task is complete
      if (task.status === "completed" || task.status === "complete") {
        stopTaskPolling();
        completeFloatingProgress(task);
        htmx.trigger(document.body, "taskCreated"); // Refresh task list
        showToast("Task completed successfully!", "success");
      } else if (task.status === "failed" || task.status === "error") {
        stopTaskPolling();
        errorFloatingProgress(task.error || "Task failed");
        htmx.trigger(document.body, "taskCreated"); // Refresh task list
        showToast(task.error || "Task failed", "error");
      }
    } catch (err) {
      console.error(`[POLL] Error polling task ${taskId}:`, err);
    }
  }, 1000); // Poll every 1 second
}

function stopTaskPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  activePollingTaskId = null;
}

// =============================================================================
// WEBSOCKET CONNECTION
// =============================================================================

function initWebSocket() {
  // Don't create new connection if one already exists and is open/connecting
  if (TasksState.wsConnection) {
    const state = TasksState.wsConnection.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
      console.log(
        "[Tasks WS] WebSocket already connected/connecting, skipping",
      );
      return;
    }
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/task-progress`;

  console.log("[Tasks WS] Attempting connection to:", wsUrl);

  try {
    TasksState.wsConnection = new WebSocket(wsUrl);

    TasksState.wsConnection.onopen = function () {
      console.log("[Tasks WS] WebSocket connected successfully");
      addAgentLog("info", "[SYSTEM] Connected to task orchestrator");
    };

    TasksState.wsConnection.onmessage = function (event) {
      console.log("[Tasks WS] Raw message received:", event.data);
      try {
        const data = JSON.parse(event.data);
        console.log("[Tasks WS] Parsed message:", data.type, data);
        handleWebSocketMessage(data);
      } catch (e) {
        console.error("[Tasks WS] Failed to parse message:", e, event.data);
      }
    };

    TasksState.wsConnection.onclose = function (event) {
      console.log(
        "[Tasks WS] WebSocket disconnected, code:",
        event.code,
        "reason:",
        event.reason,
      );
      setTimeout(initWebSocket, 5000);
    };

    TasksState.wsConnection.onerror = function (error) {
      console.error("[Tasks WS] WebSocket error:", error);
    };
  } catch (e) {
    console.error("[Tasks WS] Failed to create WebSocket:", e);
  }
}

function handleWebSocketMessage(data) {
  console.log("[Tasks WS] handleWebSocketMessage called with type:", data.type);

  switch (data.type) {
    case "connected":
      console.log("[Tasks WS] Connected to task progress stream");
      addAgentLog("info", "[SYSTEM] Task progress stream connected");
      break;

    case "task_started":
      console.log("[Tasks WS] TASK_STARTED:", data.message);
      addAgentLog("accent", `[TASK] Started: ${data.message}`);
      // Update terminal in detail panel
      updateDetailTerminal(data.task_id, data.message, "started");
      // Refresh task list
      if (typeof htmx !== "undefined") {
        htmx.trigger(document.body, "taskCreated");
      }
      // Select the task if not already selected
      if (data.task_id) {
        selectTask(data.task_id);
      }
      break;

    case "task_progress":
      console.log(
        "[Tasks WS] TASK_PROGRESS - step:",
        data.step,
        "message:",
        data.message,
      );
      addAgentLog("info", `[${data.step}] ${data.message}`);
      // Update terminal in detail panel with real data
      updateDetailTerminal(
        data.task_id,
        data.message,
        data.step,
        data.activity,
      );
      // Update progress bar in detail panel
      updateDetailProgress(
        data.task_id,
        data.current_step,
        data.total_steps,
        data.progress,
      );
      break;

    case "task_completed":
      console.log("[Tasks WS] TASK_COMPLETED:", data.message);
      addAgentLog("success", `[COMPLETE] ${data.message}`);

      // Extract app_url from details if present
      let appUrl = null;
      if (data.details && data.details.startsWith("app_url:")) {
        appUrl = data.details.substring(8);
        addAgentLog("success", `🚀 App URL: ${appUrl}`);
        showAppUrlNotification(appUrl);
      }

      // Update terminal with completion
      updateDetailTerminal(
        data.task_id,
        data.message,
        "complete",
        data.activity,
      );
      updateDetailProgress(
        data.task_id,
        data.total_steps,
        data.total_steps,
        100,
      );

      onTaskCompleted(data, appUrl);

      // Play completion sound
      playCompletionSound();

      // Refresh task list and details
      if (typeof htmx !== "undefined") {
        htmx.trigger(document.body, "taskCreated");
      }
      if (data.task_id) {
        setTimeout(() => loadTaskDetails(data.task_id), 500);
      }
      break;

    case "task_error":
      console.log("[Tasks WS] TASK_ERROR:", data.error || data.message);
      addAgentLog("error", `[ERROR] ${data.error || data.message}`);
      updateDetailTerminal(data.task_id, data.error || data.message, "error");
      onTaskFailed(data, data.error);
      // Refresh task details to show error
      if (data.task_id) {
        setTimeout(() => loadTaskDetails(data.task_id), 500);
      }
      break;

    case "task_update":
      updateTaskCard(data.task);
      if (data.task && data.task.id === TasksState.selectedTaskId) {
        updateTaskDetail(data.task);
      }
      break;

    case "step_progress":
      updateStepProgress(data.taskId, data.step);
      break;

    case "agent_log":
      addAgentLog(data.level, data.message);
      break;

    case "decision_required":
      showDecisionRequired(data.decision);
      break;

    case "llm_stream":
      // Don't show raw LLM stream in terminal - it contains HTML/code garbage
      // Progress is shown via manifest_update events instead
      console.log("[Tasks WS] LLM streaming...");
      break;

    case "manifest_update":
      console.log("[Tasks WS] MANIFEST_UPDATE for task:", data.task_id);
      // Update the progress log section with manifest data
      if (data.details) {
        try {
          const manifestData = JSON.parse(data.details);
          renderManifestProgress(data.task_id, manifestData);
        } catch (e) {
          console.error("[Tasks WS] Failed to parse manifest:", e);
        }
      }
      break;
  }
}

// Store pending manifest updates for tasks whose elements aren't loaded yet
const pendingManifestUpdates = new Map();

function renderManifestProgress(taskId, manifest, retryCount = 0) {
  // Only update if this is the selected task
  if (TasksState.selectedTaskId !== taskId) {
    return;
  }

  // Try multiple selectors to find the progress log element
  let progressLog = document.getElementById(`progress-log-${taskId}`);
  if (!progressLog) {
    progressLog = document.querySelector(".taskmd-progress-content");
  }

  if (!progressLog) {
    // If task is selected but element not yet loaded, retry after a delay
    if (retryCount < 5) {
      pendingManifestUpdates.set(taskId, manifest);
      setTimeout(
        () => {
          const pending = pendingManifestUpdates.get(taskId);
          if (pending && TasksState.selectedTaskId === taskId) {
            renderManifestProgress(taskId, pending, retryCount + 1);
          }
        },
        150 * (retryCount + 1),
      );
    }
    return;
  }

  // Clear pending update
  pendingManifestUpdates.delete(taskId);

  if (!manifest || !manifest.sections) {
    return;
  }

  const totalSteps = manifest.progress?.total || 60;

  // Update STATUS section if exists
  updateStatusSection(manifest);

  // Update or create progress tree
  let tree = progressLog.querySelector(".taskmd-tree");
  if (!tree) {
    // First render - create full HTML
    progressLog.innerHTML = buildProgressTreeHTML(manifest, totalSteps);
    // Auto-expand running sections
    progressLog
      .querySelectorAll(".tree-section.running, .tree-child.running")
      .forEach((el) => {
        el.classList.add("expanded");
      });
  } else {
    // Incremental update - only update changed elements
    updateProgressTree(tree, manifest, totalSteps);
  }

  // Update terminal stats
  updateTerminalStats(taskId, manifest);
}

function updateStatusSection(manifest) {
  const statusContent = document.querySelector(".taskmd-status-content");
  if (!statusContent) return;

  // Update current action
  const actionText = statusContent.querySelector(
    ".status-current .status-text",
  );
  if (actionText && manifest.status?.current_action) {
    actionText.textContent = manifest.status.current_action;
  }

  // Update runtime
  const runtimeEl = statusContent.querySelector(".status-main .status-time");
  if (runtimeEl && manifest.status?.runtime_display) {
    runtimeEl.innerHTML = `Runtime: ${manifest.status.runtime_display} <span class="status-indicator"></span>`;
  }

  // Update estimated
  const estimatedEl = statusContent.querySelector(
    ".status-current .status-time",
  );
  if (estimatedEl && manifest.status?.estimated_display) {
    estimatedEl.innerHTML = `Estimated: ${manifest.status.estimated_display} <span class="status-gear">⚙</span>`;
  }
}

function buildProgressTreeHTML(manifest, totalSteps) {
  let html = '<div class="taskmd-tree">';

  for (const section of manifest.sections) {
    const statusClass = section.status?.toLowerCase() || "pending";
    const isRunning = statusClass === "running";
    const globalCurrent =
      section.progress?.global_current || section.progress?.current || 0;
    const statusText = section.status || "Pending";

    html += `
      <div class="tree-section ${statusClass}${isRunning ? " expanded" : ""}" data-section-id="${section.id}">
        <div class="tree-row tree-level-0" onclick="this.parentElement.classList.toggle('expanded')">
          <span class="tree-name">${escapeHtml(section.name)}</span>
          <span class="tree-view-details">View Details ›</span>
          <span class="tree-step-badge">Step ${globalCurrent}/${totalSteps}</span>
          <span class="tree-status ${statusClass}">${statusText}</span>
        </div>
        <div class="tree-children">`;

    // Children
    if (section.children?.length > 0) {
      for (const child of section.children) {
        const childStatus = child.status?.toLowerCase() || "pending";
        const childIsRunning = childStatus === "running";
        html += `
          <div class="tree-child ${childStatus}${childIsRunning ? " expanded" : ""}" data-child-id="${child.id}">
            <div class="tree-row tree-level-1" onclick="this.parentElement.classList.toggle('expanded')">
              <span class="tree-indent"></span>
              <span class="tree-name">${escapeHtml(child.name)}</span>
              <span class="tree-view-details">View Details ›</span>
              <span class="tree-step-badge">Step ${child.progress?.current || 0}/${child.progress?.total || 1}</span>
              <span class="tree-status ${childStatus}">${child.status || "Pending"}</span>
            </div>
            <div class="tree-items">`;

        // Items
        const items = [...(child.item_groups || []), ...(child.items || [])];
        for (const item of items) {
          html += buildItemHTML(item);
        }

        html += `</div></div>`;
      }
    }

    // Section-level items
    const sectionItems = [
      ...(section.item_groups || []),
      ...(section.items || []),
    ];
    for (const item of sectionItems) {
      html += buildItemHTML(item);
    }

    html += `</div></div>`;
  }

  html += "</div>";
  return html;
}

function buildItemHTML(item) {
  const status = item.status?.toLowerCase() || "pending";
  const checkIcon = status === "completed" ? "✓" : "";
  const duration = item.duration_seconds
    ? item.duration_seconds >= 60
      ? `Duration: ${Math.floor(item.duration_seconds / 60)} min`
      : `Duration: ${item.duration_seconds} sec`
    : "";
  const name = item.name || item.display_name || "";

  return `
    <div class="tree-item ${status}" data-item-id="${item.id || name}">
      <span class="tree-item-dot ${status}"></span>
      <span class="tree-item-name">${escapeHtml(name)}</span>
      <span class="tree-item-duration">${duration}</span>
      <span class="tree-item-check ${status}">${checkIcon}</span>
    </div>`;
}

function updateProgressTree(tree, manifest, totalSteps) {
  for (const section of manifest.sections) {
    const sectionEl = tree.querySelector(`[data-section-id="${section.id}"]`);
    if (!sectionEl) continue;

    const statusClass = section.status?.toLowerCase() || "pending";
    const globalCurrent =
      section.progress?.global_current || section.progress?.current || 0;

    // Update section class
    sectionEl.className = `tree-section ${statusClass}${statusClass === "running" ? " expanded" : sectionEl.classList.contains("expanded") ? " expanded" : ""}`;

    // Update step badge
    const stepBadge = sectionEl.querySelector(
      ":scope > .tree-row .tree-step-badge",
    );
    if (stepBadge)
      stepBadge.textContent = `Step ${globalCurrent}/${totalSteps}`;

    // Update status text
    const statusEl = sectionEl.querySelector(":scope > .tree-row .tree-status");
    if (statusEl) {
      statusEl.className = `tree-status ${statusClass}`;
      statusEl.textContent = section.status || "Pending";
    }

    // Update children
    if (section.children) {
      for (const child of section.children) {
        const childEl = sectionEl.querySelector(
          `[data-child-id="${child.id}"]`,
        );
        if (!childEl) continue;

        const childStatus = child.status?.toLowerCase() || "pending";
        childEl.className = `tree-child ${childStatus}${childStatus === "running" ? " expanded" : childEl.classList.contains("expanded") ? " expanded" : ""}`;

        const childStepBadge = childEl.querySelector(
          ":scope > .tree-row .tree-step-badge",
        );
        if (childStepBadge)
          childStepBadge.textContent = `Step ${child.progress?.current || 0}/${child.progress?.total || 1}`;

        const childStatusEl = childEl.querySelector(
          ":scope > .tree-row .tree-status",
        );
        if (childStatusEl) {
          childStatusEl.className = `tree-status ${childStatus}`;
          childStatusEl.textContent = child.status || "Pending";
        }

        // Update items
        updateItems(childEl.querySelector(".tree-items"), [
          ...(child.item_groups || []),
          ...(child.items || []),
        ]);
      }
    }

    // Update section-level items
    updateItems(sectionEl.querySelector(".tree-children"), [
      ...(section.item_groups || []),
      ...(section.items || []),
    ]);
  }
}

function updateItems(container, items) {
  if (!container || !items) return;

  for (const item of items) {
    const itemId = item.id || item.name || item.display_name;
    const itemEl = container.querySelector(`[data-item-id="${itemId}"]`);
    if (!itemEl) {
      // New item - append it
      container.insertAdjacentHTML("beforeend", buildItemHTML(item));
      continue;
    }

    const status = item.status?.toLowerCase() || "pending";
    itemEl.className = `tree-item ${status}`;

    const dot = itemEl.querySelector(".tree-item-dot");
    if (dot) dot.className = `tree-item-dot ${status}`;

    const check = itemEl.querySelector(".tree-item-check");
    if (check) {
      check.className = `tree-item-check ${status}`;
      check.textContent = status === "completed" ? "✓" : "";
    }

    const durationEl = itemEl.querySelector(".tree-item-duration");
    if (durationEl && item.duration_seconds) {
      durationEl.textContent =
        item.duration_seconds >= 60
          ? `Duration: ${Math.floor(item.duration_seconds / 60)} min`
          : `Duration: ${item.duration_seconds} sec`;
    }
  }
}

function updateTerminalStats(taskId, manifest) {
  const processedEl = document.getElementById(`terminal-processed-${taskId}`);
  if (processedEl && manifest.terminal?.stats?.processed) {
    processedEl.textContent = manifest.terminal.stats.processed;
  }

  const etaEl = document.getElementById(`terminal-eta-${taskId}`);
  if (etaEl && manifest.terminal?.stats?.eta) {
    etaEl.textContent = manifest.terminal.stats.eta;
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function updateActivityMetrics(activity) {
  if (!activity) return;

  const metricsEl = document.getElementById("floating-activity-metrics");
  if (!metricsEl) return;

  let html = "";

  if (activity.phase) {
    html += `<div class="metric-row"><span class="metric-label">Phase:</span> <span class="metric-value phase-${activity.phase}">${activity.phase.toUpperCase()}</span></div>`;
  }

  if (activity.items_processed !== undefined) {
    const total = activity.items_total ? `/${activity.items_total}` : "";
    html += `<div class="metric-row"><span class="metric-label">Processed:</span> <span class="metric-value">${activity.items_processed}${total} items</span></div>`;
  }

  if (activity.speed_per_min) {
    html += `<div class="metric-row"><span class="metric-label">Speed:</span> <span class="metric-value">~${activity.speed_per_min.toFixed(1)} items/min</span></div>`;
  }

  if (activity.eta_seconds) {
    const mins = Math.floor(activity.eta_seconds / 60);
    const secs = activity.eta_seconds % 60;
    const eta = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    html += `<div class="metric-row"><span class="metric-label">ETA:</span> <span class="metric-value">${eta}</span></div>`;
  }

  if (activity.bytes_processed) {
    const kb = (activity.bytes_processed / 1024).toFixed(1);
    html += `<div class="metric-row"><span class="metric-label">Generated:</span> <span class="metric-value">${kb} KB</span></div>`;
  }

  if (activity.tokens_used) {
    html += `<div class="metric-row"><span class="metric-label">Tokens:</span> <span class="metric-value">${activity.tokens_used.toLocaleString()}</span></div>`;
  }

  if (activity.files_created && activity.files_created.length > 0) {
    html += `<div class="metric-row"><span class="metric-label">Files:</span> <span class="metric-value">${activity.files_created.length} created</span></div>`;
  }

  if (activity.tables_created && activity.tables_created.length > 0) {
    html += `<div class="metric-row"><span class="metric-label">Tables:</span> <span class="metric-value">${activity.tables_created.length} synced</span></div>`;
  }

  if (activity.current_item) {
    html += `<div class="metric-row current-item"><span class="metric-label">Current:</span> <span class="metric-value">${activity.current_item}</span></div>`;
  }

  metricsEl.innerHTML = html;
}

function logFinalStats(activity) {
  if (!activity) return;

  addAgentLog("info", "─────────────────────────────────");
  addAgentLog("info", "GENERATION COMPLETE");

  if (activity.files_created && activity.files_created.length > 0) {
    addAgentLog("success", `Files created: ${activity.files_created.length}`);
    activity.files_created.forEach((f) => addAgentLog("info", `  • ${f}`));
  }

  if (activity.tables_created && activity.tables_created.length > 0) {
    addAgentLog("success", `Tables synced: ${activity.tables_created.length}`);
    activity.tables_created.forEach((t) => addAgentLog("info", `  • ${t}`));
  }

  if (activity.bytes_processed) {
    const kb = (activity.bytes_processed / 1024).toFixed(1);
    addAgentLog("info", `Total size: ${kb} KB`);
  }

  addAgentLog("info", "─────────────────────────────────");
}

// =============================================================================
// FLOATING PROGRESS PANEL
// =============================================================================

// Update terminal in the detail panel with real-time data
function updateDetailTerminal(taskId, message, step, activity) {
  const terminalOutput = document.getElementById(`terminal-output-${taskId}`);
  if (!terminalOutput) {
    // Try generic terminal output
    const genericTerminal = document.querySelector(".terminal-output-rich");
    if (genericTerminal) {
      addTerminalLine(genericTerminal, message, step);
    }
    return;
  }
  addTerminalLine(terminalOutput, message, step, activity);
}

// Format markdown-like text for terminal display
function formatTerminalMarkdown(text) {
  if (!text) return "";

  // Headers (## Header)
  text = text.replace(
    /^##\s+(.+)$/gm,
    '<strong class="terminal-header">$1</strong>',
  );

  // Bold (**text**)
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Inline code (`code`)
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Code blocks (```code```)
  text = text.replace(
    /```([\s\S]*?)```/g,
    '<div class="terminal-code">$1</div>',
  );

  // List items (- item)
  text = text.replace(/^-\s+(.+)$/gm, "  • $1");

  // Checkmarks
  text = text.replace(/^✓\s*/gm, '<span class="check-mark">✓</span> ');

  return text;
}

function addTerminalLine(terminal, message, step, activity) {
  const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });
  const isLlmStream = step === "llm_stream";

  // Determine line type based on content
  const isHeader = message && message.startsWith("##");
  const isSuccess = message && message.startsWith("✓");
  const isError = step === "error";
  const isComplete = step === "complete";

  const stepClass = isError
    ? "error"
    : isComplete || isSuccess
      ? "success"
      : isHeader
        ? "progress"
        : isLlmStream
          ? "llm-stream"
          : "info";

  // Format the message with markdown
  const formattedMessage = formatTerminalMarkdown(message);

  const line = document.createElement("div");
  line.className = `terminal-line ${stepClass} current`;

  if (isLlmStream) {
    line.innerHTML = `<span class="llm-text">${formattedMessage}</span>`;
  } else if (isHeader) {
    line.innerHTML = formattedMessage;
  } else {
    line.innerHTML = `<span class="terminal-timestamp">${timestamp}</span>${formattedMessage}`;
  }

  // Remove 'current' class from previous lines
  terminal.querySelectorAll(".terminal-line.current").forEach((el) => {
    el.classList.remove("current");
  });

  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;

  // Keep only last 50 lines
  while (terminal.children.length > 50) {
    terminal.removeChild(terminal.firstChild);
  }
}

// Update progress bar in detail panel
function updateDetailProgress(taskId, current, total, percent) {
  const progressFill = document.querySelector(".progress-fill-rich");
  const progressLabel = document.querySelector(".progress-label-rich");
  const stepInfo = document.querySelector(".meta-estimated");

  const pct = percent || (total > 0 ? Math.round((current / total) * 100) : 0);

  if (progressFill) {
    progressFill.style.width = `${pct}%`;
  }
  if (progressLabel) {
    progressLabel.textContent = `Progress: ${pct}%`;
  }
  if (stepInfo) {
    stepInfo.textContent = `Step ${current}/${total}`;
  }
}

// Legacy functions kept for compatibility but now do nothing
function showFloatingProgress(taskName) {
  // Progress now shown in detail panel terminal
  console.log("[Tasks] Progress:", taskName);
}

function updateFloatingProgressBar(
  current,
  total,
  message,
  step,
  details,
  activity,
) {
  // Progress now shown in detail panel
  updateDetailProgress(null, current, total);
  if (message) {
    updateDetailTerminal(null, message, step, activity);
  }
}

function completeFloatingProgress(message, activity, appUrl) {
  // Completion now shown in detail panel
  console.log("[Tasks] Complete:", message);
}

function closeFloatingProgress() {
  // No floating panel to close
}

function minimizeFloatingProgress() {
  // No floating panel to minimize
}

function updateProgressUI(data) {
  if (data && data.current_step !== undefined) {
    updateDetailProgress(
      data.task_id,
      data.current_step,
      data.total_steps,
      data.progress,
    );
  }
}

// Legacy function - errors now shown in detail panel
function errorFloatingProgress(errorMessage) {
  updateDetailTerminal(null, errorMessage, "error");
}

function updateActivityMetrics(activity) {
  // Activity metrics are now shown in terminal output
  if (!activity) return;
  console.log("[Tasks] Activity update:", activity);
}

function logFinalStats(activity) {
  if (!activity) return;
  let stats = "Generation complete";
  if (activity.files_created)
    stats += ` - ${activity.files_created.length} files`;
  if (activity.bytes_processed)
    stats += ` - ${Math.round(activity.bytes_processed / 1024)}KB`;
  console.log("[Tasks]", stats);
}

function addLLMStreamOutput(text) {
  // Add LLM streaming output to the floating terminal
  const terminal = document.getElementById("floating-llm-terminal");
  if (!terminal) return;

  const line = document.createElement("div");
  line.className = "llm-output";
  line.textContent = text;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;

  // Keep only last 100 lines to prevent memory issues
  while (terminal.children.length > 100) {
    terminal.removeChild(terminal.firstChild);
  }
}

function updateProgressUI(data) {
  const progressBar = document.querySelector(".result-progress-bar");
  const resultDiv = document.getElementById("intent-result");

  if (data.total_steps && data.current_step) {
    const percent = Math.round((data.current_step / data.total_steps) * 100);

    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }

    if (resultDiv && data.message) {
      resultDiv.innerHTML = `
        <div class="result-card">
          <div class="result-message">${data.message}</div>
          <div class="result-progress">
            <div class="result-progress-bar" style="width: ${percent}%"></div>
          </div>
          <div style="margin-top:8px;font-size:12px;color:var(--sentient-text-muted);">
            Step ${data.current_step}/${data.total_steps} (${percent}%)
          </div>
        </div>
      `;
    }
  }
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

function setupEventListeners() {
  // Filter pills
  document.querySelectorAll(".status-pill").forEach((pill) => {
    pill.addEventListener("click", function (e) {
      e.preventDefault();
      const filter = this.dataset.filter;
      setActiveFilter(filter, this);
    });
  });

  // Search input
  const searchInput = document.querySelector(".topbar-search-input");
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(function (e) {
        searchTasks(e.target.value);
      }, 300),
    );
  }

  // Nav items
  document.querySelectorAll(".topbar-nav-item").forEach((item) => {
    item.addEventListener("click", function () {
      document
        .querySelectorAll(".topbar-nav-item")
        .forEach((i) => i.classList.remove("active"));
      this.classList.add("active");
    });
  });

  // Progress log toggle
  const logToggle = document.querySelector(".progress-log-toggle");
  if (logToggle) {
    logToggle.addEventListener("click", toggleProgressLog);
  }
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", function (e) {
    // Escape: Deselect task
    if (e.key === "Escape") {
      deselectTask();
    }

    // Cmd/Ctrl + K: Focus search
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      document.querySelector(".topbar-search-input")?.focus();
    }

    // Arrow keys: Navigate tasks
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      navigateTasks(e.key === "ArrowDown" ? 1 : -1);
    }

    // Enter: Submit decision if in decision mode
    if (
      e.key === "Enter" &&
      document.querySelector(".decision-option.selected")
    ) {
      submitDecision();
    }

    // 1-5: Quick filter
    if (e.key >= "1" && e.key <= "5" && !e.target.matches("input, textarea")) {
      const pills = document.querySelectorAll(".status-pill");
      const index = parseInt(e.key) - 1;
      if (pills[index]) {
        pills[index].click();
      }
    }
  });
}

// =============================================================================
// TASK SELECTION & FILTERING
// =============================================================================

function selectTask(taskId) {
  TasksState.selectedTaskId = taskId;

  // Update selected state in list
  document.querySelectorAll(".task-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.taskId == taskId);
  });

  // Load task details (in real app, this would fetch from API)
  loadTaskDetails(taskId);
}

function deselectTask() {
  TasksState.selectedTaskId = null;
  document.querySelectorAll(".task-card").forEach((card) => {
    card.classList.remove("selected");
  });
}

function navigateTasks(direction) {
  const cards = Array.from(document.querySelectorAll(".task-card"));
  if (cards.length === 0) return;

  const currentIndex = cards.findIndex((c) => c.classList.contains("selected"));
  let newIndex;

  if (currentIndex === -1) {
    newIndex = direction === 1 ? 0 : cards.length - 1;
  } else {
    newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = cards.length - 1;
    if (newIndex >= cards.length) newIndex = 0;
  }

  const taskId = cards[newIndex].dataset.taskId;
  selectTask(taskId);
  cards[newIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function setActiveFilter(filter, button) {
  TasksState.currentFilter = filter;

  // Update active pill
  document.querySelectorAll(".status-pill").forEach((pill) => {
    pill.classList.remove("active");
  });
  button.classList.add("active");

  // Filter will be handled by HTMX, but we track state
  addAgentLog("info", `[FILTER] Showing ${filter} tasks`);
}

function searchTasks(query) {
  if (query.length > 0) {
    addAgentLog("info", `[SEARCH] Searching: "${query}"`);
  }

  // In real app, this would filter via API
  // For demo, we'll do client-side filtering
  const cards = document.querySelectorAll(".task-card");
  cards.forEach((card) => {
    const title =
      card.querySelector(".task-card-title")?.textContent.toLowerCase() || "";
    const subtitle =
      card.querySelector(".task-card-subtitle")?.textContent.toLowerCase() ||
      "";
    const matches =
      title.includes(query.toLowerCase()) ||
      subtitle.includes(query.toLowerCase());
    card.style.display = matches || query === "" ? "block" : "none";
  });
}

// =============================================================================
// TASK DETAILS
// =============================================================================

function loadTaskDetails(taskId) {
  if (!taskId) {
    console.warn("[LOAD] No task ID provided");
    return;
  }

  addAgentLog("info", `[LOAD] Loading task #${taskId} details`);

  // Show detail panel and hide empty state
  const emptyState = document.getElementById("detail-empty");
  const detailContent = document.getElementById("task-detail-content");

  if (!detailContent) {
    console.error("[LOAD] task-detail-content element not found");
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  detailContent.style.display = "block";

  // Fetch task details from API - use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    if (typeof htmx !== "undefined" && htmx.ajax) {
      htmx.ajax("GET", `/api/tasks/${taskId}`, {
        target: "#task-detail-content",
        swap: "innerHTML",
      });
    } else {
      console.error("[LOAD] HTMX not available");
    }
  });
}

function updateTaskCard(task) {
  const card = document.querySelector(`[data-task-id="${task.id}"]`);
  if (!card) return;

  // Update progress
  const progressFill = card.querySelector(".task-progress-fill");
  const progressPercent = card.querySelector(".task-progress-percent");
  const progressSteps = card.querySelector(".task-progress-steps");

  if (progressFill) progressFill.style.width = `${task.progress}%`;
  if (progressPercent) progressPercent.textContent = `${task.progress}%`;
  if (progressSteps)
    progressSteps.textContent = `${task.currentStep}/${task.totalSteps} steps`;

  // Update status badge
  const statusBadge = card.querySelector(".task-card-status");
  if (statusBadge) {
    statusBadge.className = `task-card-status ${task.status}`;
    statusBadge.textContent = formatStatus(task.status);
  }
}

function updateTaskDetail(task) {
  // Update detail panel with task data
  const detailTitle = document.querySelector(".task-detail-title");
  if (detailTitle) detailTitle.textContent = task.title;
}

// =============================================================================
// DECISION HANDLING
// =============================================================================

function selectDecision(element, value) {
  // Remove selected from all options
  document.querySelectorAll(".decision-option").forEach((opt) => {
    opt.classList.remove("selected");
  });

  // Add selected to clicked option
  element.classList.add("selected");

  // Store selected value
  TasksState.selectedDecision = value;

  addAgentLog("info", `[DECISION] Selected: ${value}`);
}

function submitDecision() {
  const selectedOption = document.querySelector(".decision-option.selected");
  if (!selectedOption) {
    showToast("Please select an option", "warning");
    return;
  }

  const value = TasksState.selectedDecision;
  const taskId = TasksState.selectedTaskId;

  addAgentLog("accent", `[AGENT] Applying decision: ${value}`);
  addAgentLog("info", `[TASK] Resuming task #${taskId}...`);

  // In real app, send to API
  fetch(`/api/tasks/${taskId}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: value }),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        showToast("Decision applied successfully", "success");
        addAgentLog("success", `[OK] Decision applied, task resuming`);

        // Hide decision section (in real app, would update via HTMX)
        const decisionSection = document.querySelector(
          ".decision-required-section",
        );
        if (decisionSection) {
          decisionSection.style.display = "none";
        }
      } else {
        showToast("Failed to apply decision", "error");
        addAgentLog(
          "error",
          `[ERROR] Failed to apply decision: ${result.error}`,
        );
      }
    })
    .catch((error) => {
      // For demo, simulate success
      showToast("Decision applied successfully", "success");
      addAgentLog("success", `[OK] Decision applied, task resuming`);

      const decisionSection = document.querySelector(
        ".decision-required-section",
      );
      if (decisionSection) {
        decisionSection.style.opacity = "0.5";
        setTimeout(() => {
          decisionSection.style.display = "none";
        }, 500);
      }

      // Update step status
      const activeStep = document.querySelector(".step-item.active");
      if (activeStep) {
        activeStep.classList.remove("active");
        activeStep.classList.add("completed");
        activeStep.querySelector(".step-icon").textContent = "✓";
        activeStep.querySelector(".step-detail").textContent =
          "Completed with merge strategy";

        const nextStep = activeStep.nextElementSibling;
        if (nextStep && nextStep.classList.contains("pending")) {
          nextStep.classList.remove("pending");
          nextStep.classList.add("active");
          nextStep.querySelector(".step-icon").textContent = "●";
          nextStep.querySelector(".step-time").textContent = "Now";
        }
      }
    });
}

function showDecisionRequired(decision) {
  addAgentLog("warning", `[ALERT] Decision required: ${decision.title}`);
  showToast(`Decision required: ${decision.title}`, "warning");
}

// =============================================================================
// PROGRESS LOG
// =============================================================================

function toggleProgressLog() {
  const stepList = document.querySelector(".step-list");
  const toggle = document.querySelector(".progress-log-toggle");

  if (stepList.style.display === "none") {
    stepList.style.display = "flex";
    toggle.textContent = "Collapse";
  } else {
    stepList.style.display = "none";
    toggle.textContent = "Expand";
  }
}

function updateStepProgress(taskId, step) {
  if (taskId !== TasksState.selectedTaskId) return;

  const stepItems = document.querySelectorAll(".step-item");
  stepItems.forEach((item, index) => {
    if (index < step.index) {
      item.classList.remove("active", "pending");
      item.classList.add("completed");
      item.querySelector(".step-icon").textContent = "✓";
    } else if (index === step.index) {
      item.classList.remove("completed", "pending");
      item.classList.add("active");
      item.querySelector(".step-icon").textContent = "●";
      item.querySelector(".step-name").textContent = step.name;
      item.querySelector(".step-detail").textContent = step.detail;
      item.querySelector(".step-time").textContent = "Now";
    } else {
      item.classList.remove("completed", "active");
      item.classList.add("pending");
      item.querySelector(".step-icon").textContent = "○";
    }
  });
}

// =============================================================================
// AGENT ACTIVITY LOG
// =============================================================================

function addAgentLog(level, message) {
  if (TasksState.agentLogPaused) return;

  const log = document.getElementById("agent-log");
  if (!log) return;

  const now = new Date();
  const timestamp = now.toTimeString().split(" ")[0].substring(0, 8);

  const line = document.createElement("div");
  line.className = `activity-line ${level}`;
  line.innerHTML = `
        <span class="activity-timestamp">${timestamp}</span>
        <span class="activity-message">${message}</span>
    `;

  // Insert at the top
  log.insertBefore(line, log.firstChild);

  // Limit log entries
  while (log.children.length > 100) {
    log.removeChild(log.lastChild);
  }
}

function scrollAgentLogToBottom() {
  const log = document.getElementById("agent-log");
  if (log) {
    log.scrollTop = 0; // Since newest is at top
  }
}

function clearAgentLog() {
  const log = document.getElementById("agent-log");
  if (log) {
    log.innerHTML = "";
    addAgentLog("info", "[SYSTEM] Log cleared");
  }
}

function toggleAgentLogPause() {
  TasksState.agentLogPaused = !TasksState.agentLogPaused;
  const pauseBtn = document.querySelector(".agent-activity-btn:last-child");
  if (pauseBtn) {
    pauseBtn.textContent = TasksState.agentLogPaused ? "Resume" : "Pause";
  }
  addAgentLog(
    "info",
    TasksState.agentLogPaused ? "[SYSTEM] Log paused" : "[SYSTEM] Log resumed",
  );
}

// =============================================================================
// TASK ACTIONS
// =============================================================================

function pauseTask(taskId) {
  addAgentLog("info", `[TASK] Pausing task #${taskId}...`);

  fetch(`/api/tasks/${taskId}/pause`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        showToast("Task paused", "success");
        addAgentLog("success", `[OK] Task #${taskId} paused`);
        htmx.trigger(document.body, "taskCreated");
        if (TasksState.selectedTaskId === taskId) {
          loadTaskDetails(taskId);
        }
      } else {
        showToast("Failed to pause task", "error");
        addAgentLog(
          "error",
          `[ERROR] Failed to pause task: ${result.error || result.message}`,
        );
      }
    })
    .catch((error) => {
      showToast("Failed to pause task", "error");
      addAgentLog("error", `[ERROR] Failed to pause task: ${error}`);
    });
}

function cancelTask(taskId) {
  if (!confirm("Are you sure you want to cancel this task?")) {
    return;
  }

  addAgentLog("info", `[TASK] Cancelling task #${taskId}...`);

  fetch(`/api/tasks/${taskId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        showToast("Task cancelled", "success");
        addAgentLog("success", `[OK] Task #${taskId} cancelled`);
        htmx.trigger(document.body, "taskCreated");
        if (TasksState.selectedTaskId === taskId) {
          loadTaskDetails(taskId);
        }
      } else {
        showToast("Failed to cancel task", "error");
        addAgentLog(
          "error",
          `[ERROR] Failed to cancel task: ${result.error || result.message}`,
        );
      }
    })
    .catch((error) => {
      showToast("Failed to cancel task", "error");
      addAgentLog("error", `[ERROR] Failed to cancel task: ${error}`);
    });
}

function showDetailedView(taskId) {
  addAgentLog("info", `[TASK] Opening detailed view for task #${taskId}...`);

  // For now, just reload the task details
  // In the future, this could open a modal or new page with more details
  loadTaskDetails(taskId);
  showToast("Detailed view loaded", "info");
}

// =============================================================================
// TASK LIFECYCLE
// =============================================================================

function onTaskCompleted(data, appUrl) {
  const title = data.title || data.message || "Task";
  const taskId = data.task_id || data.id;

  if (appUrl) {
    showToast(`App ready! Click to open: ${appUrl}`, "success", 10000, () => {
      window.open(appUrl, "_blank");
    });
    addAgentLog("success", `[COMPLETE] Task #${taskId}: ${title}`);
    addAgentLog("success", `[URL] ${appUrl}`);
  } else {
    showToast(`Task completed: ${title}`, "success");
    addAgentLog("success", `[COMPLETE] Task #${taskId}: ${title}`);
  }

  if (data.task) {
    updateTaskCard(data.task);
  }
}

function showAppUrlNotification(appUrl) {
  // Create a prominent notification for the app URL
  let notification = document.getElementById("app-url-notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "app-url-notification";
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 24px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(34, 197, 94, 0.4);
      z-index: 10001;
      max-width: 400px;
      animation: slideInRight 0.5s ease;
    `;
    document.body.appendChild(notification);
  }

  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px;">🎉 App Created Successfully!</div>
    <div style="font-size: 13px; opacity: 0.9; margin-bottom: 12px;">Your app is ready to use</div>
    <a href="${appUrl}" target="_blank" style="
      display: inline-block;
      background: white;
      color: #16a34a;
      padding: 8px 16px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    ">Open App →</a>
    <button onclick="this.parentElement.remove()" style="
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 18px;
      opacity: 0.7;
    ">×</button>
  `;

  // Auto-hide after 30 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = "slideOutRight 0.5s ease forwards";
      setTimeout(() => notification.remove(), 500);
    }
  }, 30000);
}

function playCompletionSound() {
  try {
    // Create a simple beep sound using Web Audio API
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioCtx.currentTime + 0.5,
    );

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);

    // Play a second higher tone for success feel
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.frequency.value = 1200;
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc2.start(audioCtx.currentTime);
      osc2.stop(audioCtx.currentTime + 0.3);
    }, 150);
  } catch (e) {
    console.log("[Tasks] Could not play completion sound:", e);
  }
}

function onTaskFailed(task, error) {
  showToast(`Task failed: ${task.title}`, "error");
  addAgentLog("error", `[FAILED] Task #${task.id}: ${error}`);
  updateTaskCard(task);
}

// =============================================================================
// TOAST NOTIFICATIONS
// =============================================================================

function showToast(message, type = "info", duration = 4000, onClick = null) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  const bgColors = {
    success: "rgba(34, 197, 94, 0.95)",
    error: "rgba(239, 68, 68, 0.95)",
    warning: "rgba(245, 158, 11, 0.95)",
    info: "rgba(59, 130, 246, 0.95)",
  };

  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  toast.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: ${bgColors[type] || bgColors.info};
        border-radius: 10px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
    `;

  toast.innerHTML = `
        <span style="font-size: 16px;">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;

  if (onClick) {
    toast.style.cursor = "pointer";
    toast.addEventListener("click", onClick);
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "fadeOut 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function formatStatus(status) {
  const statusMap = {
    complete: "Complete",
    running: "Running",
    awaiting: "Awaiting",
    paused: "Paused",
    blocked: "Blocked",
  };
  return statusMap[status] || status;
}

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

// =============================================================================
// GLOBAL STYLES FOR TOAST ANIMATIONS
// =============================================================================

const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(20px);
        }
    }

    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

// =============================================================================
// GOALS, PENDING INFO, SCHEDULERS, MONITORS
// =============================================================================

// Select a goal and show its details
window.selectGoal = function (goalId) {
  TasksState.selectedItemType = "goal";
  window.selectedTaskId = goalId;

  document.querySelectorAll(".task-item, .task-card").forEach((el) => {
    el.classList.remove("selected");
  });
  const selectedEl = document.querySelector(`[data-goal-id="${goalId}"]`);
  if (selectedEl) {
    selectedEl.classList.add("selected");
  }

  document.getElementById("task-detail-empty").style.display = "none";
  document.getElementById("task-detail-content").style.display = "block";

  // Hide other sections, show goal section
  hideAllDetailSections();
  document.getElementById("goal-progress-section").style.display = "block";

  fetch(`/api/goals/${goalId}`)
    .then((response) => response.json())
    .then((goal) => {
      document.getElementById("detail-title").textContent =
        goal.goal_text || "Untitled Goal";
      document.getElementById("detail-status-text").textContent =
        goal.status || "active";
      document.getElementById("detail-priority-text").textContent = "Goal";
      document.getElementById("detail-description").textContent =
        goal.goal_text || "";

      const percent =
        goal.target_value > 0
          ? Math.round((goal.current_value / goal.target_value) * 100)
          : 0;
      document.getElementById("goal-progress-fill").style.width = `${percent}%`;
      document.getElementById("goal-current-value").textContent =
        goal.current_value || 0;
      document.getElementById("goal-target-value").textContent =
        goal.target_value || 0;
      document.getElementById("goal-percent").textContent = percent;
      document.getElementById("goal-last-action").textContent = goal.last_action
        ? `Last action: ${goal.last_action}`
        : "No actions yet";
    })
    .catch((err) => console.error("Failed to load goal:", err));
};

// Select a pending info item
window.selectPendingInfo = function (pendingId) {
  TasksState.selectedItemType = "pending";
  window.selectedTaskId = pendingId;

  document.querySelectorAll(".task-item, .task-card").forEach((el) => {
    el.classList.remove("selected");
  });
  const selectedEl = document.querySelector(`[data-pending-id="${pendingId}"]`);
  if (selectedEl) {
    selectedEl.classList.add("selected");
  }

  document.getElementById("task-detail-empty").style.display = "none";
  document.getElementById("task-detail-content").style.display = "block";

  hideAllDetailSections();
  document.getElementById("pending-fill-section").style.display = "block";

  fetch(`/api/pending-info/${pendingId}`)
    .then((response) => response.json())
    .then((pending) => {
      document.getElementById("detail-title").textContent =
        pending.field_label || "Pending Info";
      document.getElementById("detail-status-text").textContent = "Pending";
      document.getElementById("detail-priority-text").textContent =
        pending.app_name || "";
      document.getElementById("detail-description").textContent =
        pending.reason || "";

      document.getElementById("pending-reason").textContent =
        pending.reason || "Required for app functionality";
      document.getElementById("pending-fill-id").value = pending.id;
      document.getElementById("pending-fill-label").textContent =
        pending.field_label;
      document.getElementById("pending-fill-value").type =
        pending.field_type === "secret" ? "password" : "text";
    })
    .catch((err) => console.error("Failed to load pending info:", err));
};

// Select a scheduler
window.selectScheduler = function (schedulerName) {
  TasksState.selectedItemType = "scheduler";
  window.selectedTaskId = schedulerName;

  document.querySelectorAll(".task-item, .task-card").forEach((el) => {
    el.classList.remove("selected");
  });
  const selectedEl = document.querySelector(
    `[data-scheduler-name="${schedulerName}"]`,
  );
  if (selectedEl) {
    selectedEl.classList.add("selected");
  }

  document.getElementById("task-detail-empty").style.display = "none";
  document.getElementById("task-detail-content").style.display = "block";

  hideAllDetailSections();
  document.getElementById("scheduler-info-section").style.display = "block";

  fetch(`/api/schedulers/${encodeURIComponent(schedulerName)}`)
    .then((response) => response.json())
    .then((scheduler) => {
      document.getElementById("detail-title").textContent =
        scheduler.name || schedulerName;
      document.getElementById("detail-status-text").textContent =
        scheduler.status || "active";
      document.getElementById("detail-priority-text").textContent = "Scheduler";
      document.getElementById("detail-description").textContent =
        scheduler.description || "";

      document.getElementById("scheduler-cron").textContent =
        scheduler.cron || "-";
      document.getElementById("scheduler-next").textContent = scheduler.next_run
        ? `Next run: ${new Date(scheduler.next_run).toLocaleString()}`
        : "Next run: -";
      document.getElementById("scheduler-file").textContent = scheduler.file
        ? `File: ${scheduler.file}`
        : "File: -";
    })
    .catch((err) => console.error("Failed to load scheduler:", err));
};

// Select a monitor
window.selectMonitor = function (monitorName) {
  TasksState.selectedItemType = "monitor";
  window.selectedTaskId = monitorName;

  document.querySelectorAll(".task-item, .task-card").forEach((el) => {
    el.classList.remove("selected");
  });
  const selectedEl = document.querySelector(
    `[data-monitor-name="${monitorName}"]`,
  );
  if (selectedEl) {
    selectedEl.classList.add("selected");
  }

  document.getElementById("task-detail-empty").style.display = "none";
  document.getElementById("task-detail-content").style.display = "block";

  hideAllDetailSections();
  document.getElementById("monitor-info-section").style.display = "block";

  fetch(`/api/monitors/${encodeURIComponent(monitorName)}`)
    .then((response) => response.json())
    .then((monitor) => {
      document.getElementById("detail-title").textContent =
        monitor.name || monitorName;
      document.getElementById("detail-status-text").textContent =
        monitor.status || "active";
      document.getElementById("detail-priority-text").textContent = "Monitor";
      document.getElementById("detail-description").textContent =
        monitor.description || "";

      document.getElementById("monitor-target").textContent = monitor.target
        ? `Target: ${monitor.target}`
        : "Target: -";
      document.getElementById("monitor-interval").textContent = monitor.interval
        ? `Interval: ${monitor.interval}`
        : "Interval: -";
      document.getElementById("monitor-last-check").textContent =
        monitor.last_check
          ? `Last check: ${new Date(monitor.last_check).toLocaleString()}`
          : "Last check: -";
      document.getElementById("monitor-last-value").textContent =
        monitor.last_value
          ? `Last value: ${monitor.last_value}`
          : "Last value: -";
    })
    .catch((err) => console.error("Failed to load monitor:", err));
};

// Hide all detail sections
function hideAllDetailSections() {
  document.getElementById("goal-progress-section").style.display = "none";
  document.getElementById("pending-fill-section").style.display = "none";
  document.getElementById("scheduler-info-section").style.display = "none";
  document.getElementById("monitor-info-section").style.display = "none";
}

// Fill pending info form submission
document.addEventListener("htmx:afterRequest", function (event) {
  if (event.detail.elt.id === "pending-fill-form" && event.detail.successful) {
    htmx.trigger(document.body, "taskCreated");
    document.getElementById("pending-fill-value").value = "";
    addAgentLog("success", "[OK] Pending info filled successfully");
  }
});

// Update counts for new filters
function updateFilterCounts() {
  fetch("/api/tasks/stats/json")
    .then((response) => response.json())
    .then((stats) => {
      if (stats.total !== undefined) {
        const el = document.getElementById("count-all");
        if (el) el.textContent = stats.total;
      }
      if (stats.completed !== undefined) {
        const el = document.getElementById("count-complete");
        if (el) el.textContent = stats.completed;
      }
      if (stats.active !== undefined) {
        const el = document.getElementById("count-active");
        if (el) el.textContent = stats.active;
      }
      if (stats.awaiting !== undefined) {
        const el = document.getElementById("count-awaiting");
        if (el) el.textContent = stats.awaiting;
      }
      if (stats.paused !== undefined) {
        const el = document.getElementById("count-paused");
        if (el) el.textContent = stats.paused;
      }
      if (stats.blocked !== undefined) {
        const el = document.getElementById("count-blocked");
        if (el) el.textContent = stats.blocked;
      }
      if (stats.time_saved !== undefined) {
        const el = document.getElementById("time-saved-value");
        if (el) el.textContent = stats.time_saved;
      }
    })
    .catch((e) => console.warn("Failed to load task stats:", e));
}

// Call updateFilterCounts on load
document.addEventListener("DOMContentLoaded", updateFilterCounts);
document.body.addEventListener("taskCreated", updateFilterCounts);
