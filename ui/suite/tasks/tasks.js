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
  initTasksApp();
});

function initTasksApp() {
  initWebSocket();
  setupEventListeners();
  setupKeyboardShortcuts();
  setupIntentInputHandlers();
  scrollAgentLogToBottom();
  console.log("[Tasks] Initialized");
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
}

// =============================================================================
// WEBSOCKET CONNECTION
// =============================================================================

function initWebSocket() {
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
      console.log(
        "[Tasks WS] TASK_STARTED - showing floating progress:",
        data.message,
      );
      addAgentLog("accent", `[TASK] Started: ${data.message}`);
      showFloatingProgress(data.message);
      updateFloatingProgressBar(0, data.total_steps, data.message);
      updateActivityMetrics(data.activity);
      updateProgressUI(data);
      break;

    case "task_progress":
      console.log(
        "[Tasks WS] TASK_PROGRESS - step:",
        data.step,
        "message:",
        data.message,
      );
      addAgentLog("info", `[${data.step}] ${data.message}`);
      if (data.activity) {
        updateActivityMetrics(data.activity);
        if (data.activity.current_item) {
          addAgentLog("info", `  → Processing: ${data.activity.current_item}`);
        }
      } else if (data.details) {
        addAgentLog("info", `  → ${data.details}`);
      }
      updateFloatingProgressBar(
        data.current_step,
        data.total_steps,
        data.message,
        data.step,
        data.details,
        data.activity,
      );
      updateProgressUI(data);
      break;

    case "task_completed":
      console.log("[Tasks WS] TASK_COMPLETED:", data.message);
      addAgentLog("success", `[COMPLETE] ${data.message}`);
      if (data.activity) {
        updateActivityMetrics(data.activity);
        logFinalStats(data.activity);
      }
      completeFloatingProgress(data.message, data.activity);
      updateProgressUI(data);
      onTaskCompleted(data);
      if (typeof htmx !== "undefined") {
        htmx.trigger(document.body, "taskCreated");
      }
      break;

    case "task_error":
      console.log("[Tasks WS] TASK_ERROR:", data.error || data.message);
      addAgentLog("error", `[ERROR] ${data.error || data.message}`);
      errorFloatingProgress(data.error || data.message);
      onTaskFailed(data, data.error);
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
  }
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

function showFloatingProgress(taskName) {
  let panel = document.getElementById("floating-progress");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "floating-progress";
    panel.className = "floating-progress-panel";
    panel.innerHTML = `
      <div class="floating-progress-header">
        <div class="floating-progress-title">
          <span class="progress-dot"></span>
          <span id="floating-task-name">Processing...</span>
        </div>
        <div class="floating-progress-actions">
          <button class="btn-minimize" onclick="minimizeFloatingProgress()">—</button>
          <button class="btn-close-float" onclick="closeFloatingProgress()">×</button>
        </div>
      </div>
      <div class="floating-progress-body">
        <div class="floating-progress-bar">
          <div class="floating-progress-fill" id="floating-progress-fill" style="width: 0%"></div>
        </div>
        <div class="floating-progress-info">
          <span id="floating-progress-step">Starting...</span>
          <span id="floating-progress-percent">0%</span>
        </div>
        <div class="floating-activity-metrics" id="floating-activity-metrics"></div>
        <div class="floating-progress-terminal" id="floating-progress-terminal">
          <div class="terminal-header">
            <span class="terminal-title">LIVE AGENT ACTIVITY</span>
            <span class="terminal-status" id="terminal-status">●</span>
          </div>
          <div class="terminal-content" id="floating-progress-log"></div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
  }

  const taskNameEl = document.getElementById("floating-task-name");
  if (taskNameEl) taskNameEl.textContent = taskName || "Processing...";

  const fillEl = document.getElementById("floating-progress-fill");
  if (fillEl) fillEl.style.width = "0%";

  const stepEl = document.getElementById("floating-progress-step");
  if (stepEl) stepEl.textContent = "Starting...";

  const percentEl = document.getElementById("floating-progress-percent");
  if (percentEl) percentEl.textContent = "0%";

  const logEl = document.getElementById("floating-progress-log");
  if (logEl) logEl.innerHTML = "";

  const dotEl = panel.querySelector(".progress-dot");
  if (dotEl) {
    dotEl.classList.remove("completed", "error");
  }

  panel.style.display = "block";
  panel.classList.remove("minimized");
}

function updateFloatingProgressBar(
  current,
  total,
  message,
  step,
  details,
  activity,
) {
  const panel = document.getElementById("floating-progress");
  if (!panel || panel.style.display === "none") {
    showFloatingProgress(message);
  }

  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  const fillEl = document.getElementById("floating-progress-fill");
  if (fillEl) fillEl.style.width = percent + "%";

  const stepEl = document.getElementById("floating-progress-step");
  if (stepEl) stepEl.textContent = message;

  const percentEl = document.getElementById("floating-progress-percent");
  if (percentEl) percentEl.textContent = percent + "%";

  const statusEl = document.getElementById("terminal-status");
  if (statusEl) statusEl.classList.add("active");

  if (step) {
    const logEl = document.getElementById("floating-progress-log");
    if (logEl) {
      const entry = document.createElement("div");
      entry.className = "log-entry";
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour12: false,
      });

      let logContent = `<span class="log-time">${timestamp}</span> <span class="log-step">[${step.toUpperCase()}]</span> ${message}`;

      if (activity) {
        if (activity.current_item) {
          logContent += `<span class="log-current"> → ${activity.current_item}</span>`;
        }
        if (activity.items_processed !== undefined && activity.items_total) {
          logContent += `<span class="log-progress"> (${activity.items_processed}/${activity.items_total})</span>`;
        }
        if (activity.bytes_processed) {
          const kb = (activity.bytes_processed / 1024).toFixed(1);
          logContent += `<span class="log-bytes"> [${kb} KB]</span>`;
        }
      } else if (details) {
        logContent += `<span class="log-details"> → ${details}</span>`;
      }

      entry.innerHTML = logContent;
      logEl.appendChild(entry);
      logEl.scrollTop = logEl.scrollHeight;
    }
  }

  if (activity) {
    updateActivityMetrics(activity);
  }
}

function completeFloatingProgress(message, activity) {
  const fillEl = document.getElementById("floating-progress-fill");
  if (fillEl) fillEl.style.width = "100%";

  const stepEl = document.getElementById("floating-progress-step");
  if (stepEl) stepEl.textContent = message || "Completed!";

  const percentEl = document.getElementById("floating-progress-percent");
  if (percentEl) percentEl.textContent = "100%";

  const panel = document.getElementById("floating-progress");
  if (panel) {
    const dotEl = panel.querySelector(".progress-dot");
    if (dotEl) dotEl.classList.add("completed");
  }

  const statusEl = document.getElementById("terminal-status");
  if (statusEl) {
    statusEl.classList.remove("active");
    statusEl.classList.add("completed");
  }

  if (activity) {
    const logEl = document.getElementById("floating-progress-log");
    if (logEl) {
      const summary = document.createElement("div");
      summary.className = "log-entry log-summary";
      let summaryText = "═══════════════════════════════════\n";
      summaryText += "✓ GENERATION COMPLETE\n";
      if (activity.files_created) {
        summaryText += `  Files: ${activity.files_created.length} created\n`;
      }
      if (activity.tables_created) {
        summaryText += `  Tables: ${activity.tables_created.length} synced\n`;
      }
      if (activity.bytes_processed) {
        summaryText += `  Size: ${(activity.bytes_processed / 1024).toFixed(1)} KB\n`;
      }
      summaryText += "═══════════════════════════════════";
      summary.innerHTML = `<pre class="summary-pre">${summaryText}</pre>`;
      logEl.appendChild(summary);
      logEl.scrollTop = logEl.scrollHeight;
    }
  }

  setTimeout(closeFloatingProgress, 8000);
}

function errorFloatingProgress(errorMessage) {
  const stepEl = document.getElementById("floating-progress-step");
  if (stepEl) stepEl.textContent = "Error: " + errorMessage;

  const panel = document.getElementById("floating-progress");
  if (panel) {
    const dotEl = panel.querySelector(".progress-dot");
    if (dotEl) dotEl.classList.add("error");
  }
}

function minimizeFloatingProgress() {
  const panel = document.getElementById("floating-progress");
  if (panel) panel.classList.toggle("minimized");
}

function closeFloatingProgress() {
  const panel = document.getElementById("floating-progress");
  if (panel) {
    panel.style.display = "none";
    const dotEl = panel.querySelector(".progress-dot");
    if (dotEl) dotEl.classList.remove("completed", "error");
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
  // In real app, fetch from API
  // htmx.ajax('GET', `/api/tasks/${taskId}`, {target: '#task-detail-panel', swap: 'innerHTML'});

  addAgentLog("info", `[LOAD] Loading task #${taskId} details`);
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
// TASK LIFECYCLE
// =============================================================================

function onTaskCompleted(task) {
  showToast(`Task completed: ${task.title}`, "success");
  addAgentLog("success", `[COMPLETE] Task #${task.id}: ${task.title}`);
  updateTaskCard(task);
}

function onTaskFailed(task, error) {
  showToast(`Task failed: ${task.title}`, "error");
  addAgentLog("error", `[FAILED] Task #${task.id}: ${error}`);
  updateTaskCard(task);
}

// =============================================================================
// TOAST NOTIFICATIONS
// =============================================================================

function showToast(message, type = "info") {
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

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "fadeOut 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
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
