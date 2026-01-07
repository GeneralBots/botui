/* =============================================================================
   GB DOCS - Word-like Document Editor JavaScript
   General Bots Suite Component
   ============================================================================= */

(function () {
  "use strict";

  // =============================================================================
  // CONFIGURATION
  // =============================================================================

  const CONFIG = {
    AUTOSAVE_DELAY: 3000,
    MAX_HISTORY: 50,
    WS_RECONNECT_DELAY: 5000,
  };

  // =============================================================================
  // STATE
  // =============================================================================

  const state = {
    docId: null,
    docTitle: "Untitled Document",
    content: "",
    history: [],
    historyIndex: -1,
    isDirty: false,
    autoSaveTimer: null,
    ws: null,
    collaborators: [],
    slashPosition: null,
    isAIPanelOpen: false,
    focusMode: false,
  };

  // =============================================================================
  // DOM ELEMENTS
  // =============================================================================

  const elements = {
    container: null,
    sidebar: null,
    docsList: null,
    docTitleInput: null,
    editorTitle: null,
    editorContent: null,
    slashMenu: null,
    aiPanel: null,
    wordCount: null,
    charCount: null,
    saveStatus: null,
    exportModal: null,
  };

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  function init() {
    cacheElements();
    bindEvents();
    loadFromUrlParams();
    setupSlashMenu();
    setupAIPanel();
    setupToolbar();
    setupKeyboardShortcuts();
    updateWordCount();
  }

  function cacheElements() {
    elements.container = document.querySelector(".docs-container");
    elements.sidebar = document.getElementById("docs-sidebar");
    elements.docsList = document.getElementById("docs-list");
    elements.docTitleInput = document.getElementById("doc-title");
    elements.editorTitle = document.getElementById("editor-title");
    elements.editorContent = document.getElementById("editor-content");
    elements.slashMenu = document.getElementById("slash-menu");
    elements.aiPanel = document.getElementById("ai-panel");
    elements.wordCount = document.getElementById("word-count");
    elements.charCount = document.getElementById("char-count");
    elements.saveStatus = document.getElementById("save-status");
    elements.exportModal = document.getElementById("export-modal");
  }

  // =============================================================================
  // EVENT BINDING
  // =============================================================================

  function bindEvents() {
    if (elements.editorContent) {
      elements.editorContent.addEventListener("input", handleEditorInput);
      elements.editorContent.addEventListener("keydown", handleEditorKeydown);
      elements.editorContent.addEventListener("paste", handlePaste);
    }

    if (elements.editorTitle) {
      elements.editorTitle.addEventListener("input", handleTitleInput);
      elements.editorTitle.addEventListener("keydown", handleTitleKeydown);
    }

    document.addEventListener("click", handleDocumentClick);
    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  // =============================================================================
  // EDITOR INPUT HANDLING
  // =============================================================================

  function handleEditorInput(e) {
    state.isDirty = true;
    updateWordCount();
    scheduleAutoSave();
    checkSlashCommand();
  }

  function handleTitleInput(e) {
    state.docTitle = elements.editorTitle.textContent || "Untitled Document";
    if (elements.docTitleInput) {
      elements.docTitleInput.value = state.docTitle;
    }
    state.isDirty = true;
    scheduleAutoSave();
  }

  function handleTitleKeydown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      elements.editorContent?.focus();
    }
  }

  function handleEditorKeydown(e) {
    if (!elements.slashMenu?.classList.contains("hidden")) {
      if (e.key === "Escape") {
        hideSlashMenu();
        e.preventDefault();
      } else if (e.key === "Enter") {
        const selected =
          elements.slashMenu.querySelector(".slash-item.selected") ||
          elements.slashMenu.querySelector(".slash-item");
        if (selected) {
          executeSlashCommand(selected.dataset.cmd);
          e.preventDefault();
        }
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        navigateSlashMenu(e.key === "ArrowDown" ? 1 : -1);
        e.preventDefault();
      }
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") || "";
    document.execCommand("insertText", false, text);
  }

  function handleDocumentClick(e) {
    if (
      elements.slashMenu &&
      !elements.slashMenu.contains(e.target) &&
      !elements.editorContent?.contains(e.target)
    ) {
      hideSlashMenu();
    }
  }

  function handleBeforeUnload(e) {
    if (state.isDirty) {
      e.preventDefault();
      e.returnValue = "";
      return "";
    }
  }

  // =============================================================================
  // SLASH COMMAND MENU
  // =============================================================================

  function checkSlashCommand() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const text = range.startContainer.textContent || "";
    const cursorPos = range.startOffset;

    if (text[cursorPos - 1] === "/") {
      showSlashMenu(range);
    } else if (
      elements.slashMenu &&
      !elements.slashMenu.classList.contains("hidden")
    ) {
      const slashIndex = text.lastIndexOf("/");
      if (slashIndex >= 0 && cursorPos > slashIndex) {
        const filter = text.substring(slashIndex + 1, cursorPos).toLowerCase();
        filterSlashMenu(filter);
      }
    }
  }

  function showSlashMenu(range) {
    if (!elements.slashMenu || !elements.editorContent) return;

    const rect = range.getBoundingClientRect();
    const editorRect = elements.editorContent.getBoundingClientRect();

    elements.slashMenu.style.top =
      rect.bottom -
      editorRect.top +
      elements.editorContent.scrollTop +
      8 +
      "px";
    elements.slashMenu.style.left = rect.left - editorRect.left + "px";
    elements.slashMenu.classList.remove("hidden");
    state.slashPosition = range.startOffset;

    filterSlashMenu("");
  }

  function hideSlashMenu() {
    if (elements.slashMenu) {
      elements.slashMenu.classList.add("hidden");
    }
    state.slashPosition = null;
  }

  function filterSlashMenu(filter) {
    if (!elements.slashMenu) return;

    const items = elements.slashMenu.querySelectorAll(".slash-item");
    let firstVisible = null;

    items.forEach((item) => {
      const label =
        item.querySelector(".slash-label")?.textContent.toLowerCase() || "";
      const matches = label.includes(filter);
      item.style.display = matches ? "flex" : "none";
      if (matches && !firstVisible) firstVisible = item;
    });

    items.forEach((item) => item.classList.remove("selected"));
    if (firstVisible) firstVisible.classList.add("selected");
  }

  function navigateSlashMenu(direction) {
    if (!elements.slashMenu) return;

    const items = Array.from(
      elements.slashMenu.querySelectorAll(".slash-item"),
    ).filter((i) => i.style.display !== "none");
    const current = items.findIndex((i) => i.classList.contains("selected"));

    items.forEach((i) => i.classList.remove("selected"));

    let next = current + direction;
    if (next < 0) next = items.length - 1;
    if (next >= items.length) next = 0;

    if (items[next]) {
      items[next].classList.add("selected");
      items[next].scrollIntoView({ block: "nearest" });
    }
  }

  function executeSlashCommand(cmd) {
    hideSlashMenu();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const text = range.startContainer.textContent || "";
    const slashIndex = text.lastIndexOf("/");

    if (slashIndex >= 0) {
      range.startContainer.textContent =
        text.substring(0, slashIndex) + text.substring(range.startOffset);
      range.setStart(range.startContainer, slashIndex);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    switch (cmd) {
      case "h1":
        document.execCommand("formatBlock", false, "h1");
        break;
      case "h2":
        document.execCommand("formatBlock", false, "h2");
        break;
      case "h3":
        document.execCommand("formatBlock", false, "h3");
        break;
      case "paragraph":
        document.execCommand("formatBlock", false, "p");
        break;
      case "bullet":
        document.execCommand("insertUnorderedList");
        break;
      case "number":
        document.execCommand("insertOrderedList");
        break;
      case "todo":
        insertTodo();
        break;
      case "quote":
        document.execCommand("formatBlock", false, "blockquote");
        break;
      case "code":
        document.execCommand("formatBlock", false, "pre");
        break;
      case "divider":
        document.execCommand("insertHTML", false, "<hr>");
        break;
      case "callout":
        document.execCommand(
          "insertHTML",
          false,
          '<div class="callout">💡 Callout text here...</div>',
        );
        break;
      case "table":
        insertTable();
        break;
      case "image":
        insertImage();
        break;
      case "link":
        insertLink();
        break;
      case "ai-write":
      case "ai-improve":
      case "ai-summarize":
        openAIPanel(cmd);
        break;
    }

    state.isDirty = true;
    updateWordCount();
    scheduleAutoSave();
  }

  function setupSlashMenu() {
    if (!elements.slashMenu) return;

    elements.slashMenu.querySelectorAll(".slash-item").forEach((item) => {
      item.addEventListener("click", () => {
        executeSlashCommand(item.dataset.cmd);
      });
    });
  }

  // =============================================================================
  // CONTENT INSERTION
  // =============================================================================

  function insertTodo() {
    const html =
      '<div class="todo-item"><input type="checkbox" class="todo-checkbox"><span>Todo item</span></div>';
    document.execCommand("insertHTML", false, html);
  }

  function insertTable() {
    const html = `
      <table>
        <thead>
          <tr>
            <th>Header 1</th>
            <th>Header 2</th>
            <th>Header 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cell 1</td>
            <td>Cell 2</td>
            <td>Cell 3</td>
          </tr>
          <tr>
            <td>Cell 4</td>
            <td>Cell 5</td>
            <td>Cell 6</td>
          </tr>
        </tbody>
      </table>
    `;
    document.execCommand("insertHTML", false, html);
  }

  function insertImage() {
    const url = prompt("Enter image URL:");
    if (url) {
      document.execCommand(
        "insertHTML",
        false,
        `<img src="${escapeHtml(url)}" alt="Image">`,
      );
    }
  }

  function insertLink() {
    const url = prompt("Enter URL:");
    if (url) {
      document.execCommand("createLink", false, url);
    }
  }

  // =============================================================================
  // TOOLBAR
  // =============================================================================

  function setupToolbar() {
    document.querySelectorAll("[data-cmd]").forEach((btn) => {
      btn.addEventListener("click", () => {
        executeToolbarCommand(btn.dataset.cmd);
      });
    });

    const headingSelect = document.getElementById("heading-select");
    if (headingSelect) {
      headingSelect.addEventListener("change", (e) => {
        const value = e.target.value;
        document.execCommand("formatBlock", false, value);
        elements.editorContent?.focus();
      });
    }

    const colorPicker = document.getElementById("text-color");
    if (colorPicker) {
      colorPicker.addEventListener("change", (e) => {
        document.execCommand("foreColor", false, e.target.value);
      });
    }

    const highlightPicker = document.getElementById("highlight-color");
    if (highlightPicker) {
      highlightPicker.addEventListener("change", (e) => {
        document.execCommand("hiliteColor", false, e.target.value);
      });
    }
  }

  function executeToolbarCommand(cmd) {
    elements.editorContent?.focus();

    switch (cmd) {
      case "bold":
        document.execCommand("bold");
        break;
      case "italic":
        document.execCommand("italic");
        break;
      case "underline":
        document.execCommand("underline");
        break;
      case "strikethrough":
        document.execCommand("strikeThrough");
        break;
      case "alignLeft":
        document.execCommand("justifyLeft");
        break;
      case "alignCenter":
        document.execCommand("justifyCenter");
        break;
      case "alignRight":
        document.execCommand("justifyRight");
        break;
      case "alignJustify":
        document.execCommand("justifyFull");
        break;
      case "bullet":
        document.execCommand("insertUnorderedList");
        break;
      case "number":
        document.execCommand("insertOrderedList");
        break;
      case "indent":
        document.execCommand("indent");
        break;
      case "outdent":
        document.execCommand("outdent");
        break;
      case "undo":
        document.execCommand("undo");
        break;
      case "redo":
        document.execCommand("redo");
        break;
      case "link":
        insertLink();
        break;
      case "image":
        insertImage();
        break;
      case "clearFormat":
        document.execCommand("removeFormat");
        break;
    }

    state.isDirty = true;
    scheduleAutoSave();
  }

  // =============================================================================
  // KEYBOARD SHORTCUTS
  // =============================================================================

  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "s":
            e.preventDefault();
            saveDocument();
            break;
          case "b":
            e.preventDefault();
            document.execCommand("bold");
            break;
          case "i":
            e.preventDefault();
            document.execCommand("italic");
            break;
          case "u":
            e.preventDefault();
            document.execCommand("underline");
            break;
          case "z":
            if (e.shiftKey) {
              e.preventDefault();
              document.execCommand("redo");
            }
            break;
          case "k":
            e.preventDefault();
            insertLink();
            break;
        }
      }

      if (e.key === "Escape") {
        hideSlashMenu();
        closeAIPanel();
      }
    });
  }

  // =============================================================================
  // AI PANEL
  // =============================================================================

  function setupAIPanel() {
    const aiBtn = document.getElementById("ai-assist-btn");
    if (aiBtn) {
      aiBtn.addEventListener("click", () => {
        const selectedText = window.getSelection()?.toString() || "";
        openAIPanel("ai-improve", selectedText);
      });
    }

    const closeBtn = document.getElementById("close-ai-panel");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeAIPanel);
    }

    document.querySelectorAll(".tone-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".tone-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    document.querySelectorAll(".ai-action-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        const selectedText = window.getSelection()?.toString() || "";
        processAIAction(action, selectedText);
      });
    });

    const copyBtn = document.getElementById("copy-ai-response");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const content =
          document.getElementById("ai-response-content")?.innerText || "";
        navigator.clipboard.writeText(content);
      });
    }

    const insertBtn = document.getElementById("insert-ai-response");
    if (insertBtn) {
      insertBtn.addEventListener("click", () => {
        const content =
          document.getElementById("ai-response-content")?.innerHTML || "";
        elements.editorContent?.focus();
        document.execCommand("insertHTML", false, content);
        closeAIPanel();
      });
    }

    const replaceBtn = document.getElementById("replace-ai-response");
    if (replaceBtn) {
      replaceBtn.addEventListener("click", () => {
        const content =
          document.getElementById("ai-response-content")?.innerHTML || "";
        document.execCommand("insertHTML", false, content);
        closeAIPanel();
      });
    }
  }

  function openAIPanel(action, selectedText) {
    if (!elements.aiPanel) return;

    elements.aiPanel.classList.remove("hidden");
    state.isAIPanelOpen = true;

    const input = document.getElementById("selected-text-input");
    if (input && selectedText) {
      input.value = selectedText;
    }
  }

  function closeAIPanel() {
    if (elements.aiPanel) {
      elements.aiPanel.classList.add("hidden");
      state.isAIPanelOpen = false;
    }
  }

  async function processAIAction(action, text) {
    const responseContainer = document.getElementById("ai-response");
    const responseContent = document.getElementById("ai-response-content");

    if (!responseContainer || !responseContent) return;

    responseContent.innerHTML =
      '<div class="loading-spinner"></div> Processing...';
    responseContainer.classList.remove("hidden");

    try {
      const response = await fetch("/api/ui/docs/ai/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, action }),
      });

      if (response.ok) {
        const data = await response.json();
        responseContent.innerHTML =
          data.result || data.content || "No response generated.";
      } else {
        responseContent.innerHTML = "AI processing failed. Please try again.";
      }
    } catch (e) {
      console.error("AI error:", e);
      responseContent.innerHTML = "Unable to connect to AI service.";
    }
  }

  // =============================================================================
  // SIDEBAR
  // =============================================================================

  function toggleSidebar() {
    if (elements.sidebar) {
      elements.sidebar.classList.toggle("open");
    }
  }

  // =============================================================================
  // MODALS
  // =============================================================================

  function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("hidden");
  }

  function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("hidden");
  }

  function closeModals() {
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.classList.add("hidden");
    });
  }

  // =============================================================================
  // WORD COUNT
  // =============================================================================

  function updateWordCount() {
    if (!elements.editorContent) return;

    const text = elements.editorContent.innerText || "";
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const chars = text.length;

    if (elements.wordCount) {
      elements.wordCount.textContent = words.length + " words";
    }
    if (elements.charCount) {
      elements.charCount.textContent = chars + " characters";
    }
  }

  // =============================================================================
  // SAVE/LOAD
  // =============================================================================

  function scheduleAutoSave() {
    if (state.autoSaveTimer) {
      clearTimeout(state.autoSaveTimer);
    }
    state.autoSaveTimer = setTimeout(() => {
      if (state.isDirty) {
        saveDocument();
      }
    }, CONFIG.AUTOSAVE_DELAY);
  }

  async function saveDocument() {
    showSaveStatus("saving");

    try {
      const title = elements.editorTitle?.textContent || state.docTitle;
      const content = elements.editorContent?.innerHTML || "";

      const response = await fetch("/api/ui/docs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: state.docId,
          title,
          content,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.id) {
          state.docId = data.id;
          window.history.replaceState({}, "", `#id=${state.docId}`);
        }
        state.isDirty = false;
        showSaveStatus("saved");
        updateLastEdited();
      } else {
        showSaveStatus("error");
      }
    } catch (e) {
      console.error("Save failed:", e);
      showSaveStatus("error");
    }
  }

  function showSaveStatus(status) {
    if (!elements.saveStatus) return;

    elements.saveStatus.className = "save-status " + status;
    elements.saveStatus.textContent =
      status === "saved"
        ? "Saved"
        : status === "error"
          ? "Save failed"
          : "Saving...";

    if (status === "saved") {
      setTimeout(() => {
        if (elements.saveStatus) {
          elements.saveStatus.textContent = "";
          elements.saveStatus.className = "save-status";
        }
      }, 2000);
    }
  }

  function updateLastEdited() {
    const lastEdited = document.getElementById("last-edited");
    if (lastEdited) {
      const now = new Date();
      lastEdited.textContent = "Edited " + now.toLocaleTimeString();
    }
  }

  async function loadFromUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    let docId = urlParams.get("id");

    if (!docId && hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      docId = hashParams.get("id");
    }

    if (docId) {
      try {
        const response = await fetch(`/api/ui/docs/${docId}`);
        if (response.ok) {
          const data = await response.json();
          state.docId = docId;
          state.docTitle = data.title || "Untitled Document";

          if (elements.editorTitle) {
            elements.editorTitle.textContent = state.docTitle;
          }
          if (elements.docTitleInput) {
            elements.docTitleInput.value = state.docTitle;
          }
          if (elements.editorContent) {
            elements.editorContent.innerHTML = data.content || "";
          }

          updateWordCount();
        }
      } catch (e) {
        console.error("Load failed:", e);
      }
    }
  }

  // =============================================================================
  // EXPORT
  // =============================================================================

  function exportDocument(format) {
    const title = elements.editorTitle?.textContent || state.docTitle;
    const content = elements.editorContent?.innerHTML || "";

    switch (format) {
      case "pdf":
        exportAsPDF(title, content);
        break;
      case "docx":
        exportAsDocx(title, content);
        break;
      case "html":
        exportAsHTML(title, content);
        break;
      case "txt":
        exportAsTxt(title);
        break;
      case "md":
        exportAsMarkdown(title);
        break;
    }

    hideModal("export-modal");
  }

  function exportAsPDF(title, content) {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1 { font-size: 28px; margin-bottom: 24px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          ${content}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  function exportAsDocx(title, content) {
    alert("DOCX export requires server-side processing. Please use the API.");
  }

  function exportAsHTML(title, content) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { font-size: 28px; }
    h2 { font-size: 24px; }
    h3 { font-size: 20px; }
    blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; margin-left: 0; color: #64748b; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
    pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${content}
</body>
</html>`;

    downloadFile(title + ".html", html, "text/html");
  }

  function exportAsTxt(title) {
    const text = elements.editorContent?.innerText || "";
    downloadFile(title + ".txt", title + "\n\n" + text, "text/plain");
  }

  function exportAsMarkdown(title) {
    const text = elements.editorContent?.innerText || "";
    const md = "# " + title + "\n\n" + text;
    downloadFile(title + ".md", md, "text/markdown");
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // =============================================================================
  // FOCUS MODE
  // =============================================================================

  function toggleFocusMode() {
    if (elements.container) {
      elements.container.classList.toggle("focus-mode");
      state.focusMode = elements.container.classList.contains("focus-mode");
    }
  }

  // =============================================================================
  // NEW DOCUMENT
  // =============================================================================

  function createNewDocument() {
    state.docId = null;
    state.docTitle = "Untitled Document";
    state.isDirty = false;

    if (elements.editorTitle) {
      elements.editorTitle.textContent = state.docTitle;
    }
    if (elements.docTitleInput) {
      elements.docTitleInput.value = state.docTitle;
    }
    if (elements.editorContent) {
      elements.editorContent.innerHTML = "";
    }

    window.history.replaceState({}, "", window.location.pathname);
    updateWordCount();
    elements.editorContent?.focus();
  }

  // =============================================================================
  // UTILITIES
  // =============================================================================

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renameDocument(name) {
    state.docTitle = name;
    if (elements.editorTitle) {
      elements.editorTitle.textContent = name;
    }
    state.isDirty = true;
    scheduleAutoSave();
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  window.gbDocs = {
    init,
    toggleSidebar,
    createNewDocument,
    saveDocument,
    exportDocument,
    showModal,
    hideModal,
    closeModals,
    toggleFocusMode,
    renameDocument,
    openAIPanel,
    closeAIPanel,
    executeToolbarCommand,
  };

  // =============================================================================
  // INITIALIZE ON DOM READY
  // =============================================================================

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
