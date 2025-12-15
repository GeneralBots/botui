/* =============================================================================
   TASKS APP JAVASCRIPT
   Automated Intelligent Task Management Interface
   ============================================================================= */

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

const TasksState = {
  selectedTaskId: 2, // Default selected task
  currentFilter: "complete",
  tasks: [],
  wsConnection: null,
  agentLogPaused: false,
};

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener("DOMContentLoaded", function () {
  initTasksApp();
});

function initTasksApp() {
  // Initialize WebSocket for real-time updates
  initWebSocket();

  // Setup event listeners
  setupEventListeners();

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  // Auto-scroll agent log to bottom
  scrollAgentLogToBottom();

  console.log("[Tasks] Initialized");
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
