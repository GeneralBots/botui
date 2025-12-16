/* Monitoring module - shared/base JavaScript */

function setActiveNav(element) {
  document.querySelectorAll(".monitoring-nav .nav-item").forEach((item) => {
    item.classList.remove("active");
  });
  element.classList.add("active");

  // Update page title
  const title = element.querySelector(
    "span:not(.alert-badge):not(.health-indicator)",
  ).textContent;
  document.getElementById("page-title").textContent = title;
}

function updateTimeRange(range) {
  // Store selected time range
  localStorage.setItem("monitoring-time-range", range);

  // Trigger refresh of current view
  htmx.trigger("#monitoring-content", "refresh");
}

function refreshMonitoring() {
  htmx.trigger("#monitoring-content", "refresh");

  // Visual feedback
  const btn = event.currentTarget;
  btn.classList.add("active");
  setTimeout(() => btn.classList.remove("active"), 500);
}

// Guard against duplicate declarations on HTMX reload
if (typeof window.monitoringModuleInitialized === "undefined") {
  window.monitoringModuleInitialized = true;
  var autoRefresh = true;
}

function toggleAutoRefresh() {
  autoRefresh = !autoRefresh;
  const btn = document.getElementById("auto-refresh-btn");
  btn.classList.toggle("active", autoRefresh);

  if (autoRefresh) {
    // Re-enable polling by refreshing the page content
    htmx.trigger("#monitoring-content", "refresh");
  }
}

function exportData() {
  const timeRange = document.getElementById("time-range").value;
  window.open(`/api/monitoring/export?range=${timeRange}`, "_blank");
}

// Initialize
document.addEventListener("DOMContentLoaded", function () {
  // Restore time range preference
  const savedRange = localStorage.getItem("monitoring-time-range");
  if (savedRange) {
    const timeRangeEl = document.getElementById("time-range");
    if (timeRangeEl) timeRangeEl.value = savedRange;
  }

  // Set auto-refresh button state
  const autoRefreshBtn = document.getElementById("auto-refresh-btn");
  if (autoRefreshBtn) autoRefreshBtn.classList.toggle("active", autoRefresh);
});

// Handle HTMX events for loading states
document.body.addEventListener("htmx:beforeRequest", function (evt) {
  if (evt.target.id === "monitoring-content") {
    evt.target.innerHTML =
      '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';
  }
});
