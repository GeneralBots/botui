/* =============================================================================
   AUTO TASK JAVASCRIPT - Intelligent Self-Executing Task Interface
   Premium VIP Mode Functionality
   ============================================================================= */

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

const AutoTaskState = {
  currentFilter: "all",
  tasks: [],
  compiledPlan: null,
  pendingDecisions: [],
  pendingApprovals: [],
  refreshInterval: null,
  wsConnection: null,
};

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener("DOMContentLoaded", function () {
  initAutoTask();
});

function initAutoTask() {
  // Initialize WebSocket for real-time updates
  initWebSocket();

  // Start auto-refresh
  startAutoRefresh();

  // Setup event listeners
  setupEventListeners();

  // Load initial stats
  updateStats();

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  console.log("AutoTask initialized");
}

// =============================================================================
// WEBSOCKET CONNECTION
// =============================================================================

function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/autotask`;

  try {
    AutoTaskState.wsConnection = new WebSocket(wsUrl);

    AutoTaskState.wsConnection.onopen = function () {
      console.log("AutoTask WebSocket connected");
    };

    AutoTaskState.wsConnection.onmessage = function (event) {
      handleWebSocketMessage(JSON.parse(event.data));
    };

    AutoTaskState.wsConnection.onclose = function () {
      console.log("AutoTask WebSocket disconnected, reconnecting...");
      setTimeout(initWebSocket, 5000);
    };

    AutoTaskState.wsConnection.onerror = function (error) {
      console.error("AutoTask WebSocket error:", error);
    };
  } catch (e) {
    console.warn("WebSocket not available, using polling");
  }
}

function handleWebSocketMessage(data) {
  switch (data.type) {
    case "task_update":
      updateTaskInList(data.task);
      break;
    case "step_progress":
      updateStepProgress(data.taskId, data.step, data.progress);
      break;
    case "decision_required":
      showDecisionNotification(data.decision);
      break;
    case "approval_required":
      showApprovalNotification(data.approval);
      break;
    case "task_completed":
      onTaskCompleted(data.task);
      break;
    case "task_failed":
      onTaskFailed(data.task, data.error);
      break;
    case "stats_update":
      updateStatsFromData(data.stats);
      break;
  }
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

function setupEventListeners() {
  // Intent form submission
  const intentForm = document.getElementById("intent-form");
  if (intentForm) {
    intentForm.addEventListener("htmx:afterSwap", function (event) {
      if (event.detail.target.id === "compilation-result") {
        onCompilationComplete(event);
      }
    });
  }

  // Task list updates
  const taskList = document.getElementById("task-list");
  if (taskList) {
    taskList.addEventListener("htmx:afterSwap", function () {
      updateStats();
      highlightPendingItems();
    });
  }

  // Expand log entries on details open
  document.addEventListener(
    "toggle",
    function (event) {
      if (
        event.target.classList.contains("execution-log") &&
        event.target.open
      ) {
        const taskId = event.target.closest(".autotask-item")?.dataset.taskId;
        if (taskId) {
          loadExecutionLogs(taskId);
        }
      }
    },
    true,
  );
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", function (e) {
    // Alt + N: Focus on intent input
    if (e.altKey && e.key === "n") {
      e.preventDefault();
      document.getElementById("intent-input")?.focus();
    }

    // Alt + R: Refresh tasks
    if (e.altKey && e.key === "r") {
      e.preventDefault();
      refreshTasks();
    }

    // Escape: Close any open modal
    if (e.key === "Escape") {
      closeAllModals();
    }

    // Alt + 1-4: Switch filters
    if (e.altKey && e.key >= "1" && e.key <= "4") {
      e.preventDefault();
      const filters = ["all", "running", "approval", "decision"];
      const index = parseInt(e.key) - 1;
      const tabs = document.querySelectorAll(".filter-tab");
      if (tabs[index]) {
        tabs[index].click();
      }
    }
  });
}

// =============================================================================
// AUTO REFRESH
// =============================================================================

function startAutoRefresh() {
  // Refresh every 5 seconds
  AutoTaskState.refreshInterval = setInterval(function () {
    if (!document.hidden) {
      updateStats();
    }
  }, 5000);
}

function stopAutoRefresh() {
  if (AutoTaskState.refreshInterval) {
    clearInterval(AutoTaskState.refreshInterval);
    AutoTaskState.refreshInterval = null;
  }
}

// =============================================================================
// STATS MANAGEMENT
// =============================================================================

function updateStats() {
  fetch("/api/autotask/stats")
    .then((response) => response.json())
    .then((stats) => {
      updateStatsFromData(stats);
    })
    .catch((error) => {
      console.error("Failed to fetch stats:", error);
    });
}

function updateStatsFromData(stats) {
  // Header stats
  document.getElementById("stat-running").textContent = stats.running || 0;
  document.getElementById("stat-pending").textContent = stats.pending || 0;
  document.getElementById("stat-completed").textContent = stats.completed || 0;
  document.getElementById("stat-approval").textContent =
    stats.pending_approval || 0;

  // Filter counts
  document.getElementById("count-all").textContent = stats.total || 0;
  document.getElementById("count-running").textContent = stats.running || 0;
  document.getElementById("count-approval").textContent =
    stats.pending_approval || 0;
  document.getElementById("count-decision").textContent =
    stats.pending_decision || 0;

  // Highlight if approvals needed
  const approvalStat = document.querySelector(".stat-item.highlight");
  if (approvalStat && stats.pending_approval > 0) {
    approvalStat.classList.add("attention");
  } else if (approvalStat) {
    approvalStat.classList.remove("attention");
  }
}

// =============================================================================
// TASK FILTERING
// =============================================================================

function filterTasks(filter, button) {
  AutoTaskState.currentFilter = filter;

  // Update active tab
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  button.classList.add("active");

  // Trigger HTMX request
  htmx.ajax("GET", `/api/autotask/list?filter=${filter}`, {
    target: "#task-list",
    swap: "innerHTML",
  });
}

function refreshTasks() {
  const filter = AutoTaskState.currentFilter;
  htmx.ajax("GET", `/api/autotask/list?filter=${filter}`, {
    target: "#task-list",
    swap: "innerHTML",
  });
  updateStats();
}

// =============================================================================
// COMPILATION HANDLING
// =============================================================================

function onCompilationComplete(event) {
  const result = event.detail.target.querySelector(".compiled-plan");
  if (result) {
    // Scroll to result
    result.scrollIntoView({ behavior: "smooth", block: "start" });

    // Store compiled plan
    const planId = result.dataset?.planId;
    if (planId) {
      AutoTaskState.compiledPlan = planId;
    }

    // Syntax highlight the code
    highlightBasicCode();
  }
}

function highlightBasicCode() {
  const codeBlocks = document.querySelectorAll(".code-preview code");
  codeBlocks.forEach((block) => {
    // Basic syntax highlighting for BASIC keywords
    let html = block.innerHTML;

    // Keywords
    const keywords = [
      "PLAN_START",
      "PLAN_END",
      "STEP",
      "SET",
      "GET",
      "IF",
      "THEN",
      "ELSE",
      "END IF",
      "FOR EACH",
      "NEXT",
      "WHILE",
      "WEND",
      "TALK",
      "HEAR",
      "LLM",
      "CREATE_TASK",
      "RUN_PYTHON",
      "RUN_JAVASCRIPT",
      "RUN_BASH",
      "USE_MCP",
      "POST",
      "GET",
      "PUT",
      "PATCH",
      "DELETE HTTP",
      "REQUIRE_APPROVAL",
      "SIMULATE_IMPACT",
      "AUDIT_LOG",
      "SEND_MAIL",
      "SAVE",
      "UPDATE",
      "INSERT",
      "DELETE",
      "FIND",
    ];

    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "g");
      html = html.replace(regex, `<span class="keyword">${keyword}</span>`);
    });

    // Comments
    html = html.replace(/(\'[^\n]*)/g, '<span class="comment">$1</span>');

    // Strings
    html = html.replace(/("[^"]*")/g, '<span class="string">$1</span>');

    // Numbers
    html = html.replace(/\b(\d+)\b/g, '<span class="number">$1</span>');

    block.innerHTML = html;
  });
}

function copyGeneratedCode() {
  const code = document.querySelector(".code-preview code")?.textContent;
  if (code) {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        showToast("Code copied to clipboard", "success");
      })
      .catch(() => {
        showToast("Failed to copy code", "error");
      });
  }
}

function discardPlan() {
  if (confirm("Are you sure you want to discard this plan?")) {
    document.getElementById("compilation-result").innerHTML = "";
    AutoTaskState.compiledPlan = null;
    document.getElementById("intent-input").value = "";
    document.getElementById("intent-input").focus();
  }
}

function editPlan() {
  if (!AutoTaskState.compiledPlan) {
    showToast("No plan to edit", "warning");
    return;
  }

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.id = "plan-editor-modal";
  modal.innerHTML = `
    <div class="modal-content large">
      <div class="modal-header">
        <h3>Edit Plan</h3>
        <button class="close-btn" onclick="closePlanEditor()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="plan-name">Plan Name</label>
          <input type="text" id="plan-name" value="${AutoTaskState.compiledPlan.name || "Untitled Plan"}" />
        </div>
        <div class="form-group">
          <label for="plan-description">Description</label>
          <textarea id="plan-description" rows="3">${AutoTaskState.compiledPlan.description || ""}</textarea>
        </div>
        <div class="form-group">
          <label for="plan-steps">Steps (JSON)</label>
          <textarea id="plan-steps" rows="10" class="code-editor">${JSON.stringify(AutoTaskState.compiledPlan.steps || [], null, 2)}</textarea>
        </div>
        <div class="form-group">
          <label for="plan-priority">Priority</label>
          <select id="plan-priority">
            <option value="low" ${AutoTaskState.compiledPlan.priority === "low" ? "selected" : ""}>Low</option>
            <option value="medium" ${AutoTaskState.compiledPlan.priority === "medium" ? "selected" : ""}>Medium</option>
            <option value="high" ${AutoTaskState.compiledPlan.priority === "high" ? "selected" : ""}>High</option>
            <option value="urgent" ${AutoTaskState.compiledPlan.priority === "urgent" ? "selected" : ""}>Urgent</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closePlanEditor()">Cancel</button>
        <button class="btn btn-primary" onclick="savePlanEdits()">Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function closePlanEditor() {
  const modal = document.getElementById("plan-editor-modal");
  if (modal) {
    modal.remove();
  }
}

function savePlanEdits() {
  const name = document.getElementById("plan-name").value;
  const description = document.getElementById("plan-description").value;
  const stepsJson = document.getElementById("plan-steps").value;
  const priority = document.getElementById("plan-priority").value;

  let steps;
  try {
    steps = JSON.parse(stepsJson);
  } catch (e) {
    showToast("Invalid JSON in steps", "error");
    return;
  }

  AutoTaskState.compiledPlan = {
    ...AutoTaskState.compiledPlan,
    name: name,
    description: description,
    steps: steps,
    priority: priority,
  };

  closePlanEditor();
  showToast("Plan updated successfully", "success");

  const resultDiv = document.getElementById("compilation-result");
  if (resultDiv && AutoTaskState.compiledPlan) {
    renderCompiledPlan(AutoTaskState.compiledPlan);
  }
}

function renderCompiledPlan(plan) {
  const resultDiv = document.getElementById("compilation-result");
  if (!resultDiv) return;

  const stepsHtml = (plan.steps || [])
    .map(
      (step, i) => `
      <div class="plan-step">
        <span class="step-number">${i + 1}</span>
        <span class="step-action">${step.action || step.type || "Action"}</span>
        <span class="step-target">${step.target || step.description || ""}</span>
      </div>
    `,
    )
    .join("");

  resultDiv.innerHTML = `
    <div class="compiled-plan">
      <div class="plan-header">
        <h4>${plan.name || "Compiled Plan"}</h4>
        <span class="plan-priority priority-${plan.priority || "medium"}">${plan.priority || "medium"}</span>
      </div>
      ${plan.description ? `<p class="plan-description">${plan.description}</p>` : ""}
      <div class="plan-steps">${stepsHtml}</div>
      <div class="plan-actions">
        <button class="btn btn-secondary" onclick="editPlan()">Edit</button>
        <button class="btn btn-secondary" onclick="discardPlan()">Discard</button>
        <button class="btn btn-primary" onclick="executePlan('${plan.id || ""}')">Execute</button>
      </div>
    </div>
  `;
}

// =============================================================================
// PLAN EXECUTION
// =============================================================================

function simulatePlan(planId) {
  showSimulationModal();

  fetch(`/api/autotask/simulate/${planId}`, {
    method: "POST",
  })
    .then((response) => response.json())
    .then((result) => {
      renderSimulationResult(result);
    })
    .catch((error) => {
      document.getElementById("simulation-content").innerHTML = `
            <div class="error-message">
                <span class="error-icon">❌</span>
                <p>Failed to simulate plan: ${error.message}</p>
            </div>
        `;
    });
}

function executePlan(planId) {
  const executionMode =
    document.querySelector('[name="execution_mode"]')?.value ||
    "semi-automatic";
  const priority =
    document.querySelector('[name="priority"]')?.value || "medium";

  if (!confirm("Are you sure you want to execute this plan?")) {
    return;
  }

  fetch("/api/autotask/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      execution_mode: executionMode,
      priority: priority,
    }),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        showToast("Task execution started!", "success");
        document.getElementById("compilation-result").innerHTML = "";
        document.getElementById("intent-input").value = "";
        refreshTasks();
      } else {
        showToast(`Failed to start execution: ${result.error}`, "error");
      }
    })
    .catch((error) => {
      showToast(`Failed to execute plan: ${error.message}`, "error");
    });
}

// =============================================================================
// TASK ACTIONS
// =============================================================================

function viewTaskDetails(taskId) {
  window.location.href = `/suite/tasks/detail/${taskId}`;
}

function simulateTask(taskId) {
  showSimulationModal();

  fetch(`/api/autotask/${taskId}/simulate`, {
    method: "POST",
  })
    .then((response) => response.json())
    .then((result) => {
      result.task_id = taskId;
      renderSimulationResult(result);
    })
    .catch((error) => {
      document.getElementById("simulation-content").innerHTML = `
            <div class="error-message">
                <span class="error-icon">❌</span>
                <p>Failed to simulate task: ${error.message}</p>
            </div>
        `;
    });
}

function pauseTask(taskId) {
  fetch(`/api/autotask/${taskId}/pause`, {
    method: "POST",
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        showToast("Task paused", "success");
        refreshTasks();
      } else {
        showToast(`Failed to pause task: ${result.error}`, "error");
      }
    });
}

function resumeTask(taskId) {
  fetch(`/api/autotask/${taskId}/resume`, {
    method: "POST",
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        showToast("Task resumed", "success");
        refreshTasks();
      } else {
        showToast(`Failed to resume task: ${result.error}`, "error");
      }
    });
}

function cancelTask(taskId) {
  if (
    !confirm(
      "Are you sure you want to cancel this task? This may not be reversible.",
    )
  ) {
    return;
  }

  fetch(`/api/autotask/${taskId}/cancel`, {
    method: "POST",
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        showToast("Task cancelled", "success");
        refreshTasks();
      } else {
        showToast(`Failed to cancel task: ${result.error}`, "error");
      }
    });
}

function updateTaskInList(task) {
  const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
  if (taskElement) {
    // Update status badge
    const statusBadge = taskElement.querySelector(".task-status-badge");
    if (statusBadge) {
      statusBadge.className = `task-status-badge status-${task.status}`;
      statusBadge.textContent = task.status.replace(/-/g, " ");
    }

    // Update progress
    const progressFill = taskElement.querySelector(".progress-fill");
    const progressText = taskElement.querySelector(".progress-text");
    if (progressFill && progressText) {
      progressFill.style.width = `${task.progress}%`;
      progressText.textContent = `${task.current_step}/${task.total_steps} steps (${Math.round(task.progress)}%)`;
    }

    // Update data attribute
    taskElement.dataset.status = task.status;
  }
}

function updateStepProgress(taskId, step, progress) {
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement) {
    const currentStep = taskElement.querySelector(".current-step");
    if (currentStep) {
      currentStep.querySelector(".step-name").textContent =
        `Step ${step.order}: ${step.name}`;
      currentStep.querySelector(".step-status").textContent =
        `${Math.round(progress)}%`;
    }
  }
}

// =============================================================================
// DECISIONS
// =============================================================================

function viewDecisions(taskId) {
  showDecisionModal();

  fetch(`/api/autotask/${taskId}/decisions`)
    .then((response) => response.json())
    .then((decisions) => {
      renderDecisions(taskId, decisions);
    })
    .catch((error) => {
      document.getElementById("decision-content").innerHTML = `
                <div class="error-message">
                    <span class="error-icon">❌</span>
                    <p>Failed to load decisions: ${error.message}</p>
                </div>
            `;
    });
}

function renderDecisions(taskId, decisions) {
  const container = document.getElementById("decision-content");

  if (!decisions || decisions.length === 0) {
    container.innerHTML = '<p class="no-decisions">No pending decisions.</p>';
    return;
  }

  let html = '<div class="decisions-list">';

  decisions.forEach((decision) => {
    html += `
            <div class="decision-item" data-decision-id="${decision.id}">
                <h4>${decision.title}</h4>
                <p class="decision-description">${decision.description}</p>

                <div class="decision-options">
                    ${decision.options
                      .map(
                        (opt) => `
                        <div class="decision-option ${opt.recommended ? "recommended" : ""}" data-option-id="${opt.id}">
                            <div class="option-header">
                                <input type="radio" name="decision_${decision.id}" value="${opt.id}" id="opt_${opt.id}" ${opt.recommended ? "checked" : ""}>
                                <label for="opt_${opt.id}">
                                    <span class="option-label">${opt.label}</span>
                                    ${opt.recommended ? '<span class="recommended-badge">Recommended</span>' : ""}
                                </label>
                            </div>
                            <p class="option-description">${opt.description}</p>
                            <div class="option-impact">
                                <span class="impact-cost">💰 ${opt.estimated_impact.cost_change >= 0 ? "+" : ""}$${opt.estimated_impact.cost_change}</span>
                                <span class="impact-time">⏱️ ${opt.estimated_impact.time_change_minutes >= 0 ? "+" : ""}${opt.estimated_impact.time_change_minutes}m</span>
                                <span class="impact-risk risk-${opt.risk_level.toLowerCase()}">⚠️ ${opt.risk_level}</span>
                            </div>
                        </div>
                    `,
                      )
                      .join("")}
                </div>

                <div class="decision-actions">
                    <button class="btn-secondary" onclick="skipDecision('${taskId}', '${decision.id}')">Skip</button>
                    <button class="btn-primary" onclick="submitDecision('${taskId}', '${decision.id}')">Submit Decision</button>
                </div>
            </div>
        `;
  });

  html += "</div>";
  container.innerHTML = html;
}

function submitDecision(taskId, decisionId) {
  const selectedOption = document.querySelector(
    `input[name="decision_${decisionId}"]:checked`,
  )?.value;

  if (!selectedOption) {
    showToast("Please select an option", "warning");
    return;
  }

  fetch(`/api/autotask/${taskId}/decide`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      decision_id: decisionId,
      option_id: selectedOption,
    }),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        showToast("Decision submitted", "success");
        closeDecisionModal();
        refreshTasks();
      } else {
        showToast(`Failed to submit decision: ${result.error}`, "error");
      }
    });
}

function skipDecision(taskId, decisionId) {
  if (
    !confirm(
      "Are you sure you want to skip this decision? The default option will be used.",
    )
  ) {
    return;
  }

  fetch(`/api/autotask/${taskId}/decide`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      decision_id: decisionId,
      skip: true,
    }),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        showToast("Decision skipped", "info");
        closeDecisionModal();
        refreshTasks();
      } else {
        showToast(`Failed to skip decision: ${result.error}`, "error");
      }
    });
}

function showDecisionNotification(decision) {
  showToast(`Decision required: ${decision.title}`, "warning", 10000);
  updateStats();
}

// =============================================================================
// APPROVALS
// =============================================================================

function viewApprovals(taskId) {
  showApprovalModal();

  fetch(`/api/autotask/${taskId}/approvals`)
    .then((response) => response.json())
    .then((approvals) => {
      renderApprovals(taskId, approvals);
    })
    .catch((error) => {
      document.getElementById("approval-content").innerHTML = `
                <div class="error-message">
                    <span class="error-icon">❌</span>
                    <p>Failed to load approvals: ${error.message}</p>
                </div>
            `;
    });
}

function renderApprovals(taskId, approvals) {
  const container = document.getElementById("approval-content");

  if (!approvals || approvals.length === 0) {
    container.innerHTML = '<p class="no-approvals">No pending approvals.</p>';
    return;
  }

  let html = '<div class="approvals-list">';

  approvals.forEach((approval) => {
    html += `
            <div class="approval-item" data-approval-id="${approval.id}">
                <div class="approval-header">
                    <span class="approval-type type-${approval.approval_type.toLowerCase().replace(/_/g, "-")}">${approval.approval_type.replace(/_/g, " ")}</span>
                    <span class="approval-risk risk-${approval.risk_level.toLowerCase()}">${approval.risk_level} Risk</span>
                </div>

                <h4>${approval.title}</h4>
                <p class="approval-description">${approval.description}</p>

                <div class="approval-impact">
                    <h5>Impact Summary</h5>
                    <p>${approval.impact_summary}</p>
                </div>

                ${
                  approval.simulation_result
                    ? `
                    <div class="simulation-preview">
                        <h5>Simulation Result</h5>
                        <div class="simulation-summary">
                            <span class="sim-risk risk-${approval.simulation_result.risk_level.toLowerCase()}">Risk: ${approval.simulation_result.risk_level}</span>
                            <span class="sim-confidence">Confidence: ${Math.round(approval.simulation_result.confidence * 100)}%</span>
                        </div>
                    </div>
                `
                    : ""
                }

                <div class="approval-meta">
                    <span>Step: ${approval.step_name || "N/A"}</span>
                    <span>Expires: ${formatRelativeTime(approval.expires_at)}</span>
                    <span>Default: ${approval.default_action}</span>
                </div>

                <div class="approval-actions">
                    <button class="btn-reject" onclick="rejectApproval('${taskId}', '${approval.id}')">
                        <span>❌</span> Reject
                    </button>
                    <button class="btn-defer" onclick="deferApproval('${taskId}', '${approval.id}')">
                        <span>⏸️</span> Defer
                    </button>
                    <button class="btn-approve" onclick="approveApproval('${taskId}', '${approval.id}')">
                        <span>✅</span> Approve
                    </button>
                </div>
            </div>
        `;
  });

  html += "</div>";
  container.innerHTML = html;
}

function approveApproval(taskId, approvalId) {
  submitApprovalDecision(taskId, approvalId, "approve");
}

function rejectApproval(taskId, approvalId) {
  if (!confirm("Are you sure you want to reject this action?")) {
    return;
  }
  submitApprovalDecision(taskId, approvalId, "reject");
}

function deferApproval(taskId, approvalId) {
  submitApprovalDecision(taskId, approvalId, "defer");
}

function submitApprovalDecision(taskId, approvalId, action) {
  fetch(`/api/autotask/${taskId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      approval_id: approvalId,
      action: action,
    }),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        const messages = {
          approve: "Approval granted",
          reject: "Approval rejected",
          defer: "Approval deferred",
        };
        showToast(messages[action], "success");
        closeApprovalModal();
        refreshTasks();
      } else {
        showToast(`Failed to ${action}: ${result.error}`, "error");
      }
    });
}

function showApprovalNotification(approval) {
  showToast(`Approval required: ${approval.title}`, "warning", 10000);
  updateStats();
}

// =============================================================================
// SIMULATION
// =============================================================================

function renderSimulationResult(result) {
  const container = document.getElementById("simulation-content");

  const statusIcon = result.success ? "✅" : "⚠️";
  const statusText = result.success
    ? "Simulation Successful"
    : "Simulation Found Issues";

  let html = `
        <div class="simulation-result">
            <div class="simulation-header">
                <div class="simulation-status status-${result.success}">
                    <span class="status-icon">${statusIcon}</span>
                    <span class="status-text">${statusText}</span>
                </div>
                <div class="simulation-confidence">
                    Confidence: ${Math.round(result.confidence * 100)}%
                </div>
            </div>

            <div class="impact-overview">
                <h4>Impact Assessment</h4>
                <div class="impact-grid">
                    <div class="impact-card">
                        <span class="impact-icon">💾</span>
                        <span class="impact-label">Data Impact</span>
                        <span class="impact-value">${result.impact.data_impact.records_modified} records modified</span>
                    </div>
                    <div class="impact-card">
                        <span class="impact-icon">💰</span>
                        <span class="impact-label">Cost Impact</span>
                        <span class="impact-value">$${result.impact.cost_impact.total_estimated_cost.toFixed(2)}</span>
                    </div>
                    <div class="impact-card">
                        <span class="impact-icon">⏱️</span>
                        <span class="impact-label">Time Impact</span>
                        <span class="impact-value">${formatDuration(result.impact.time_impact.estimated_duration_seconds)}</span>
                    </div>
                    <div class="impact-card risk-${result.impact.security_impact.risk_level.toLowerCase()}">
                        <span class="impact-icon">🔒</span>
                        <span class="impact-label">Security Impact</span>
                        <span class="impact-value">${result.impact.security_impact.risk_level}</span>
                    </div>
                </div>
            </div>

            <div class="step-outcomes">
                <h4>Step-by-Step Predictions</h4>
                <div class="outcomes-list">
                    ${result.step_outcomes
                      .map(
                        (step) => `
                        <div class="outcome-item ${step.would_succeed ? "success" : "warning"}">
                            <span class="outcome-icon">${step.would_succeed ? "✅" : "⚠️"}</span>
                            <span class="outcome-name">${step.step_name}</span>
                            <span class="outcome-probability">${Math.round(step.success_probability * 100)}% success</span>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
            </div>

            ${
              result.side_effects.length > 0
                ? `
                <div class="side-effects">
                    <h4>⚠️ Potential Side Effects</h4>
                    <div class="side-effects-list">
                        ${result.side_effects
                          .map(
                            (effect) => `
                            <div class="side-effect-item severity-${effect.severity.toLowerCase()}">
                                <span class="effect-description">${effect.description}</span>
                                ${effect.mitigation ? `<span class="effect-mitigation">Mitigation: ${effect.mitigation}</span>` : ""}
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                </div>
            `
                : ""
            }

            ${
              result.recommendations.length > 0
                ? `
                <div class="recommendations">
                    <h4>💡 Recommendations</h4>
                    <div class="recommendations-list">
                        ${result.recommendations
                          .map(
                            (rec) => `
                            <div class="recommendation-item">
                                <span class="rec-description">${rec.description}</span>
                                ${rec.action ? `<button class="btn-apply-rec" onclick="applyRecommendation('${rec.id}')">${rec.action}</button>` : ""}
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                </div>
            `
                : ""
            }

            <div class="simulation-actions">
                <button class="btn-secondary" onclick="closeSimulationModal()">
                    <span>↩️</span> Back
                </button>
                <button class="btn-primary" onclick="proceedAfterSimulation('${result.task_id}')" ${result.impact.risk_score > 0.8 ? "disabled" : ""}>
                    <span>🚀</span> Proceed with Execution
                </button>
            </div>
        </div>
    `;

  container.innerHTML = html;
}

// =============================================================================
// MODAL FUNCTIONS
// =============================================================================

function showSimulationModal() {
  const modal = document.getElementById("simulation-modal");
  if (modal) {
    modal.style.display = "flex";
    document.body.classList.add("modal-open");
    // Show loading state
    document.getElementById("simulation-content").innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Running impact simulation...</p>
            </div>
        `;
  }
}

function closeSimulationModal() {
  const modal = document.getElementById("simulation-modal");
  if (modal) {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  }
}

function showDecisionModal() {
  const modal = document.getElementById("decision-modal");
  if (modal) {
    modal.style.display = "flex";
    document.body.classList.add("modal-open");
    // Show loading state
    document.getElementById("decision-content").innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading decisions...</p>
            </div>
        `;
  }
}

function closeDecisionModal() {
  const modal = document.getElementById("decision-modal");
  if (modal) {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  }
}

function showApprovalModal() {
  const modal = document.getElementById("approval-modal");
  if (modal) {
    modal.style.display = "flex";
    document.body.classList.add("modal-open");
    // Show loading state
    document.getElementById("approval-content").innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading approvals...</p>
            </div>
        `;
  }
}

function closeApprovalModal() {
  const modal = document.getElementById("approval-modal");
  if (modal) {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  }
}

function closeAllModals() {
  closeSimulationModal();
  closeDecisionModal();
  closeApprovalModal();
}

// =============================================================================
// SIMULATION ACTIONS
// =============================================================================

function proceedAfterSimulation(taskId) {
  closeSimulationModal();

  if (!taskId) {
    showToast("No task ID provided", "error");
    return;
  }

  fetch(`/api/autotask/${taskId}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      confirmed: true,
    }),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        showToast("Task execution started!", "success");
        refreshTasks();
      } else {
        showToast(result.error || "Failed to start execution", "error");
      }
    })
    .catch((error) => {
      console.error("Failed to proceed after simulation:", error);
      showToast("Failed to start execution", "error");
    });
}

function applyRecommendation(recId) {
  fetch(`/api/autotask/recommendations/${recId}/apply`, {
    method: "POST",
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        showToast("Recommendation applied", "success");
        // Re-run simulation to show updated results
        const taskId =
          document.querySelector(".simulation-result")?.dataset?.taskId;
        if (taskId) {
          simulateTask(taskId);
        }
      } else {
        showToast(result.error || "Failed to apply recommendation", "error");
      }
    })
    .catch((error) => {
      console.error("Failed to apply recommendation:", error);
      showToast("Failed to apply recommendation", "error");
    });
}

// =============================================================================
// TOAST NOTIFICATIONS
// =============================================================================

function showToast(message, type = "info") {
  // Get or create toast container
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

  container.appendChild(toast);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.classList.add("toast-fade-out");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 5000);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatDuration(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

function formatRelativeTime(dateString) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date - now;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    // Past
    const absDays = Math.abs(diffDays);
    const absHours = Math.abs(diffHours);
    const absMinutes = Math.abs(diffMinutes);

    if (absDays > 0) return `${absDays}d ago`;
    if (absHours > 0) return `${absHours}h ago`;
    if (absMinutes > 0) return `${absMinutes}m ago`;
    return "just now";
  } else {
    // Future
    if (diffDays > 0) return `in ${diffDays}d`;
    if (diffHours > 0) return `in ${diffHours}h`;
    if (diffMinutes > 0) return `in ${diffMinutes}m`;
    return "soon";
  }
}

// =============================================================================
// TASK LIFECYCLE HANDLERS
// =============================================================================

function onTaskCompleted(task) {
  showToast(`Task completed: ${task.title || task.id}`, "success");
  updateTaskInList(task);
  updateStats();
}

function onTaskFailed(task, error) {
  showToast(`Task failed: ${task.title || task.id} - ${error}`, "error");
  updateTaskInList(task);
  updateStats();
}

function highlightPendingItems() {
  // Highlight tasks requiring attention
  document.querySelectorAll(".autotask-item").forEach((item) => {
    const status = item.dataset.status;
    if (status === "pending-approval" || status === "pending-decision") {
      item.classList.add("attention-required");
    } else {
      item.classList.remove("attention-required");
    }
  });
}

function loadExecutionLogs(taskId) {
  const logContainer = document.querySelector(
    `[data-task-id="${taskId}"] .log-entries`,
  );
  if (!logContainer || logContainer.dataset.loaded === "true") {
    return;
  }

  logContainer.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading logs...</p>
    </div>
  `;

  fetch(`/api/autotask/${taskId}/logs`)
    .then((response) => response.json())
    .then((logs) => {
      if (!logs || logs.length === 0) {
        logContainer.innerHTML =
          "<p class='no-logs'>No execution logs yet.</p>";
      } else {
        logContainer.innerHTML = logs
          .map(
            (log) => `
            <div class="log-entry log-${log.level.toLowerCase()}">
              <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
              <span class="log-level">${log.level}</span>
              <span class="log-message">${log.message}</span>
            </div>
          `,
          )
          .join("");
      }
      logContainer.dataset.loaded = "true";
    })
    .catch((error) => {
      logContainer.innerHTML = `
        <div class="error-message">
          <span class="error-icon">❌</span>
          <p>Failed to load logs: ${error.message}</p>
        </div>
      `;
    });
}
