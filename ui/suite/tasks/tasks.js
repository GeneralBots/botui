/* Tasks page JavaScript */

// Set active tab
function setActiveTab(button) {
    document.querySelectorAll(".filter-tab").forEach((tab) => {
        tab.classList.remove("active");
    });
    button.classList.add("active");
}

// Export tasks as JSON
function exportTasks() {
    fetch("/api/tasks?format=json")
        .then((response) => response.json())
        .then((tasks) => {
            const dataStr = JSON.stringify(tasks, null, 2);
            const dataUri =
                "data:application/json;charset=utf-8," +
                encodeURIComponent(dataStr);

            const exportFileDefaultName = `tasks-${new Date().toISOString().split("T")[0]}.json`;

            const linkElement = document.createElement("a");
            linkElement.setAttribute("href", dataUri);
            linkElement.setAttribute("download", exportFileDefaultName);
            linkElement.click();
        });
}

// Update task statistics
function updateStats() {
    fetch("/api/tasks/stats")
        .then((response) => response.json())
        .then((stats) => {
            // Update header stats
            document.querySelector(
                ".stat-item:nth-child(1) .stat-value",
            ).textContent = stats.total || 0;
            document.querySelector(
                ".stat-item:nth-child(2) .stat-value",
            ).textContent = stats.active || 0;
            document.querySelector(
                ".stat-item:nth-child(3) .stat-value",
            ).textContent = stats.completed || 0;

            // Update tab counts
            document.getElementById("count-all").textContent =
                stats.total || 0;
            document.getElementById("count-active").textContent =
                stats.active || 0;
            document.getElementById("count-completed").textContent =
                stats.completed || 0;
            document.getElementById("count-priority").textContent =
                stats.priority || 0;

            // Update footer text
            const footerText = document.getElementById("footer-text");
            if (stats.active === 0) {
                footerText.innerHTML = "All tasks completed! 🎉";
            } else {
                footerText.innerHTML = `<strong>${stats.active}</strong> ${stats.active === 1 ? "task" : "tasks"} remaining`;
            }

            // Show/hide footer
            const footer = document.getElementById("task-footer");
            footer.style.display = stats.total > 0 ? "flex" : "none";
        });
}

// Handle checkbox changes
document.addEventListener("change", function (e) {
    if (e.target.classList.contains("task-checkbox")) {
        const taskId = e.target.dataset.taskId;
        const completed = e.target.checked;

        fetch(`/api/tasks/${taskId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed }),
        }).then(() => {
            const taskItem = e.target.closest(".task-item");
            if (completed) {
                taskItem.classList.add("completed");
            } else {
                taskItem.classList.remove("completed");
            }
            updateStats();
        });
    }
});

// Handle task actions
document.addEventListener("click", function (e) {
    // Priority toggle
    if (e.target.closest('[data-action="priority"]')) {
        const btn = e.target.closest('[data-action="priority"]');
        const taskId = btn.dataset.taskId;
        const priority = !btn.classList.contains("active");

        fetch(`/api/tasks/${taskId}/priority`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priority }),
        }).then(() => {
            btn.classList.toggle("active");
            updateStats();
        });
    }

    // Edit task
    if (e.target.closest('[data-action="edit"]')) {
        const btn = e.target.closest('[data-action="edit"]');
        const taskId = btn.dataset.taskId;
        const taskItem = btn.closest(".task-item");
        const taskText = taskItem.querySelector(".task-text");
        const currentText = taskText.textContent;

        const input = document.createElement("input");
        input.type = "text";
        input.className = "task-edit-input";
        input.value = currentText;

        taskText.replaceWith(input);
        input.focus();
        input.select();

        input.addEventListener("blur", function () {
            saveEdit();
        });

        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                saveEdit();
            } else if (e.key === "Escape") {
                cancelEdit();
            }
        });

        function saveEdit() {
            const newText = input.value.trim();
            if (newText && newText !== currentText) {
                fetch(`/api/tasks/${taskId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: newText }),
                }).then(() => {
                    const span = document.createElement("span");
                    span.className = "task-text";
                    span.textContent = newText;
                    input.replaceWith(span);
                });
            } else {
                cancelEdit();
            }
        }

        function cancelEdit() {
            const span = document.createElement("span");
            span.className = "task-text";
            span.textContent = currentText;
            input.replaceWith(span);
        }
    }

    // Delete task
    if (e.target.closest('[data-action="delete"]')) {
        const btn = e.target.closest('[data-action="delete"]');
        const taskId = btn.dataset.taskId;

        if (confirm("Delete this task?")) {
            fetch(`/api/tasks/${taskId}`, {
                method: "DELETE",
            }).then(() => {
                const taskItem = btn.closest(".task-item");
                taskItem.style.animation = "slideOut 0.3s ease";
                setTimeout(() => {
                    taskItem.remove();
                    updateStats();
                }, 300);
            });
        }
    }
});

// Animation for removing tasks
const style = document.createElement("style");
style.textContent = `
@keyframes slideOut {
    to {
        opacity: 0;
        transform: translateX(-100%);
    }
}
`;
document.head.appendChild(style);

// Update stats after any HTMX request
document.body.addEventListener("htmx:afterSwap", function (evt) {
    if (evt.detail.target.id === "task-list") {
        updateStats();
    }
});

// Initial stats load
document.addEventListener("DOMContentLoaded", function () {
    updateStats();
});

// Keyboard shortcuts
document.addEventListener("keydown", function (e) {
    // Alt + N for new task
    if (e.altKey && e.key === "n") {
        e.preventDefault();
        document.querySelector(".task-input").focus();
    }

    // Alt + 1-4 for filter tabs
    if (e.altKey && e.key >= "1" && e.key <= "4") {
        e.preventDefault();
        const tabs = document.querySelectorAll(".filter-tab");
        const index = parseInt(e.key) - 1;
        if (tabs[index]) {
            tabs[index].click();
        }
    }
});
