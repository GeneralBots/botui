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

  if (input) {
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter" && input.value.trim()) {
        btn.click();
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
  const wsUrl = `${protocol}//${window.location.host}/ws/tasks`;

  try {
    TasksState.wsConnection = new WebSocket(wsUrl);

    TasksState.wsConnection.onopen = function () {
      console.log("[Sentient Tasks] WebSocket connected");
      addAgentLog("info", "[SYSTEM] Connected to task orchestrator");
    };

    TasksState.wsConnection.onmessage = function (event) {
      handleWebSocketMessage(JSON.parse(event.data));
    };

    TasksState.wsConnection.onclose = function () {
      console.log("[Sentient Tasks] WebSocket disconnected, reconnecting...");
      setTimeout(initWebSocket, 5000);
    };

    TasksState.wsConnection.onerror = function (error) {
      console.error("[Sentient Tasks] WebSocket error:", error);
    };
  } catch (e) {
    console.warn("[Sentient Tasks] WebSocket not available");
  }
}

function handleWebSocketMessage(data) {
  switch (data.type) {
    case "task_update":
      updateTaskCard(data.task);
      if (data.task.id === TasksState.selectedTaskId) {
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
    case "task_completed":
      onTaskCompleted(data.task);
      break;
    case "task_failed":
      onTaskFailed(data.task, data.error);
      break;
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
  fetch("/api/tasks/stats")
    .then((response) => response.json())
    .then((stats) => {
      if (stats.pending_count !== undefined) {
        document.getElementById("count-pending").textContent =
          stats.pending_count;
      }
      if (stats.goals_count !== undefined) {
        document.getElementById("count-goals").textContent = stats.goals_count;
      }
      if (stats.schedulers_count !== undefined) {
        document.getElementById("count-schedulers").textContent =
          stats.schedulers_count;
      }
      if (stats.monitors_count !== undefined) {
        document.getElementById("count-monitors").textContent =
          stats.monitors_count;
      }
    })
    .catch(() => {});
}

// Call updateFilterCounts on load
document.addEventListener("DOMContentLoaded", updateFilterCounts);
document.body.addEventListener("taskCreated", updateFilterCounts);

// =============================================================================
// DEMO: Simulate real-time activity
// =============================================================================

// Simulate agent activity for demo
setInterval(() => {
  if (Math.random() > 0.7) {
    const messages = [
      { level: "info", msg: "[SCAN] Monitoring task queues..." },
      { level: "info", msg: "[AGENT] Processing next batch..." },
      { level: "success", msg: "[OK] Checkpoint saved" },
      { level: "info", msg: "[SYNC] Synchronizing state..." },
    ];
    const { level, msg } =
      messages[Math.floor(Math.random() * messages.length)];
    addAgentLog(level, msg);
  }
}, 5000);
