/* Drive Module JavaScript */

(function () {
  "use strict";

  let selectedFiles = [];
  let currentPath = "/";
  let viewMode = "grid";

  // Global function for onclick handlers in HTML
  window.selectFile = function (element) {
    const fileId = element.dataset.id;
    const isSelected = element.classList.contains("selected");

    // If not holding Ctrl/Cmd, deselect all others first
    if (!event.ctrlKey && !event.metaKey) {
      document
        .querySelectorAll(
          ".drive-file-item.selected, .file-item.selected, .file-card.selected, .file-list-item.selected",
        )
        .forEach((f) => f.classList.remove("selected"));
    }

    // Toggle selection on clicked element
    if (isSelected && (event.ctrlKey || event.metaKey)) {
      element.classList.remove("selected");
    } else {
      element.classList.add("selected");
    }

    updateSelectedFiles();
  };

  function init() {
    bindNavigation();
    bindFileSelection();
    bindDragAndDrop();
    bindContextMenu();
    bindKeyboardShortcuts();
  }

  function bindNavigation() {
    document.querySelectorAll(".drive-nav-item").forEach((item) => {
      item.addEventListener("click", function () {
        document
          .querySelectorAll(".drive-nav-item")
          .forEach((i) => i.classList.remove("active"));
        this.classList.add("active");
      });
    });
  }

  function bindFileSelection() {
    document.querySelectorAll(".file-card, .file-list-item").forEach((file) => {
      file.addEventListener("click", function (e) {
        if (e.ctrlKey || e.metaKey) {
          this.classList.toggle("selected");
        } else {
          document
            .querySelectorAll(".file-card.selected, .file-list-item.selected")
            .forEach((f) => f.classList.remove("selected"));
          this.classList.add("selected");
        }
        updateSelectedFiles();
      });

      file.addEventListener("dblclick", function () {
        const isFolder = this.dataset.type === "folder";
        if (isFolder) {
          navigateToFolder(this.dataset.path);
        } else {
          openFile(this.dataset.id);
        }
      });
    });
  }

  function bindDragAndDrop() {
    const uploadZone = document.querySelector(".upload-zone");
    if (!uploadZone) return;

    ["dragenter", "dragover", "dragleave", "drop"].forEach((event) => {
      uploadZone.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ["dragenter", "dragover"].forEach((event) => {
      uploadZone.addEventListener(event, () =>
        uploadZone.classList.add("dragover"),
      );
    });

    ["dragleave", "drop"].forEach((event) => {
      uploadZone.addEventListener(event, () =>
        uploadZone.classList.remove("dragover"),
      );
    });

    uploadZone.addEventListener("drop", (e) => {
      const files = e.dataTransfer.files;
      handleFileUpload(files);
    });
  }

  function bindContextMenu() {
    document.addEventListener("contextmenu", (e) => {
      const fileCard = e.target.closest(".file-card, .file-list-item");
      if (fileCard) {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, fileCard);
      }
    });

    document.addEventListener("click", hideContextMenu);
  }

  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Delete" && selectedFiles.length > 0) {
        deleteSelectedFiles();
      }
      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        selectAllFiles();
      }
      if (e.key === "Escape") {
        deselectAllFiles();
        hideContextMenu();
      }
    });
  }

  function updateSelectedFiles() {
    selectedFiles = Array.from(
      document.querySelectorAll(
        ".file-card.selected, .file-list-item.selected",
      ),
    ).map((f) => f.dataset.id);
  }

  function navigateToFolder(path) {
    currentPath = path;
    // HTMX handles actual navigation
  }

  function openFile(fileId) {
    console.log("Opening file:", fileId);
  }

  function handleFileUpload(files) {
    console.log("Uploading files:", files);
  }

  function showContextMenu(x, y, fileCard) {
    hideContextMenu();
    const menu = document.getElementById("context-menu");
    if (menu) {
      menu.style.left = x + "px";
      menu.style.top = y + "px";
      menu.classList.remove("hidden");
      menu.dataset.fileId = fileCard.dataset.id;
    }
  }

  function hideContextMenu() {
    const menu = document.getElementById("context-menu");
    if (menu) menu.classList.add("hidden");
  }

  function selectAllFiles() {
    document
      .querySelectorAll(".file-card, .file-list-item")
      .forEach((f) => f.classList.add("selected"));
    updateSelectedFiles();
  }

  function deselectAllFiles() {
    document
      .querySelectorAll(".file-card.selected, .file-list-item.selected")
      .forEach((f) => f.classList.remove("selected"));
    selectedFiles = [];
  }

  function deleteSelectedFiles() {
    if (confirm(`Delete ${selectedFiles.length} file(s)?`)) {
      console.log("Deleting:", selectedFiles);
    }
  }

  window.DriveModule = { init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
