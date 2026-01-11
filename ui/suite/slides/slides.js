(function () {
  "use strict";

  const CONFIG = {
    CANVAS_WIDTH: 960,
    CANVAS_HEIGHT: 540,
    MAX_HISTORY: 50,
    AUTOSAVE_DELAY: 3000,
    WS_RECONNECT_DELAY: 5000,
    MIN_ELEMENT_SIZE: 20,
  };

  const state = {
    presentationId: null,
    presentationName: "Untitled Presentation",
    slides: [],
    currentSlideIndex: 0,
    selectedElement: null,
    clipboard: null,
    history: [],
    historyIndex: -1,
    zoom: 100,
    collaborators: [],
    ws: null,
    isDragging: false,
    isResizing: false,
    isRotating: false,
    dragStart: null,
    resizeHandle: null,
    isDirty: false,
    autoSaveTimer: null,
    isPresenting: false,
    theme: null,
    driveSource: null,
    chatPanelOpen: true,
  };

  const elements = {};

  function init() {
    cacheElements();
    bindEvents();
    createNewPresentation();
    loadFromUrlParams();
    renderThumbnails();
    renderCurrentSlide();
    updateSlideCounter();
  }

  function cacheElements() {
    elements.app = document.getElementById("slides-app");
    elements.presentationName = document.getElementById("presentationName");
    elements.thumbnailsPanel = document.getElementById("thumbnailsPanel");
    elements.thumbnails = document.getElementById("thumbnails");
    elements.canvasContainer = document.getElementById("canvasContainer");
    elements.slideCanvas = document.getElementById("slideCanvas");
    elements.canvasContent = document.getElementById("canvasContent");
    elements.selectionHandles = document.getElementById("selectionHandles");
    elements.cursorIndicators = document.getElementById("cursorIndicators");
    elements.collaborators = document.getElementById("collaborators");
    elements.slideInfo = document.getElementById("slideInfo");
    elements.saveStatus = document.getElementById("saveStatus");
    elements.zoomLevel = document.getElementById("zoomLevel");
    elements.chatPanel = document.getElementById("chatPanel");
    elements.chatMessages = document.getElementById("chatMessages");
    elements.chatInput = document.getElementById("chatInput");
    elements.chatForm = document.getElementById("chatForm");
    elements.contextMenu = document.getElementById("contextMenu");
    elements.slideContextMenu = document.getElementById("slideContextMenu");
    elements.presenterModal = document.getElementById("presenterModal");
  }

  function bindEvents() {
    if (elements.presentationName) {
      elements.presentationName.addEventListener("change", (e) => {
        state.presentationName = e.target.value || "Untitled Presentation";
        state.isDirty = true;
        scheduleAutoSave();
      });
    }

    document.getElementById("undoBtn")?.addEventListener("click", undo);
    document.getElementById("redoBtn")?.addEventListener("click", redo);

    document
      .getElementById("addTextBtn")
      ?.addEventListener("click", addTextBox);
    document
      .getElementById("addImageBtn")
      ?.addEventListener("click", () => showModal("imageModal"));
    document
      .getElementById("addShapeBtn")
      ?.addEventListener("click", () => showModal("shapeModal"));
    document.getElementById("addTableBtn")?.addEventListener("click", addTable);
    document
      .getElementById("addSlideBtn")
      ?.addEventListener("click", () => addSlide());

    document.getElementById("boldBtn")?.addEventListener("click", toggleBold);
    document
      .getElementById("italicBtn")
      ?.addEventListener("click", toggleItalic);
    document
      .getElementById("underlineBtn")
      ?.addEventListener("click", toggleUnderline);

    document
      .getElementById("fontFamily")
      ?.addEventListener("change", (e) => setFontFamily(e.target.value));
    document
      .getElementById("fontSize")
      ?.addEventListener("change", (e) => setFontSize(e.target.value));

    document.getElementById("textColorBtn")?.addEventListener("click", () => {
      document.getElementById("textColorPicker")?.click();
    });
    document
      .getElementById("textColorPicker")
      ?.addEventListener("input", (e) => setTextColor(e.target.value));
    document.getElementById("fillColorBtn")?.addEventListener("click", () => {
      document.getElementById("fillColorPicker")?.click();
    });
    document
      .getElementById("fillColorPicker")
      ?.addEventListener("input", (e) => setFillColor(e.target.value));

    document
      .getElementById("alignLeftBtn")
      ?.addEventListener("click", () => setTextAlign("left"));
    document
      .getElementById("alignCenterBtn")
      ?.addEventListener("click", () => setTextAlign("center"));
    document
      .getElementById("alignRightBtn")
      ?.addEventListener("click", () => setTextAlign("right"));

    document
      .getElementById("presentBtn")
      ?.addEventListener("click", startPresentation);
    document
      .getElementById("shareBtn")
      ?.addEventListener("click", () => showModal("shareModal"));

    document.getElementById("zoomInBtn")?.addEventListener("click", zoomIn);
    document.getElementById("zoomOutBtn")?.addEventListener("click", zoomOut);

    document
      .getElementById("chatToggle")
      ?.addEventListener("click", toggleChatPanel);
    document
      .getElementById("chatClose")
      ?.addEventListener("click", toggleChatPanel);
    elements.chatForm?.addEventListener("submit", handleChatSubmit);

    document.querySelectorAll(".suggestion-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        handleSuggestionClick(btn.dataset.action),
      );
    });

    document.querySelectorAll(".btn-close").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const modal = e.target.closest(".modal");
        if (modal) modal.classList.add("hidden");
      });
    });

    document
      .getElementById("closeShareModal")
      ?.addEventListener("click", () => hideModal("shareModal"));
    document
      .getElementById("closeImageModal")
      ?.addEventListener("click", () => hideModal("imageModal"));
    document
      .getElementById("closeShapeModal")
      ?.addEventListener("click", () => hideModal("shapeModal"));
    document
      .getElementById("closeNotesModal")
      ?.addEventListener("click", () => hideModal("notesModal"));
    document
      .getElementById("closeBackgroundModal")
      ?.addEventListener("click", () => hideModal("backgroundModal"));

    document
      .getElementById("insertImageBtn")
      ?.addEventListener("click", insertImage);
    document
      .getElementById("saveNotesBtn")
      ?.addEventListener("click", saveNotes);
    document
      .getElementById("applyBgBtn")
      ?.addEventListener("click", applyBackground);
    document
      .getElementById("copyLinkBtn")
      ?.addEventListener("click", copyShareLink);

    document.querySelectorAll(".shape-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        addShape(btn.dataset.shape);
        hideModal("shapeModal");
      });
    });

    if (elements.canvasContent) {
      elements.canvasContent.addEventListener(
        "mousedown",
        handleCanvasMouseDown,
      );
      elements.canvasContent.addEventListener(
        "dblclick",
        handleCanvasDoubleClick,
      );
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleDocumentClick);

    document.querySelectorAll(".context-item").forEach((item) => {
      item.addEventListener("click", () =>
        handleContextAction(item.dataset.action),
      );
    });

    document
      .getElementById("prevSlideBtn")
      ?.addEventListener("click", () => navigatePresentation(-1));
    document
      .getElementById("nextSlideBtn")
      ?.addEventListener("click", () => navigatePresentation(1));
    document
      .getElementById("exitPresenterBtn")
      ?.addEventListener("click", exitPresentation);

    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  function handleBeforeUnload(e) {
    if (state.isDirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  }

  async function loadFromUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    let presentationId = urlParams.get("id");
    let bucket = urlParams.get("bucket");
    let path = urlParams.get("path");

    if (hash) {
      const hashQueryIndex = hash.indexOf("?");
      if (hashQueryIndex > -1) {
        const hashParams = new URLSearchParams(hash.slice(hashQueryIndex + 1));
        presentationId = presentationId || hashParams.get("id");
        bucket = bucket || hashParams.get("bucket");
        path = path || hashParams.get("path");
      } else if (hash.startsWith("#id=")) {
        presentationId = hash.slice(4);
      }
    }

    if (bucket && path) {
      await loadFromDrive(bucket, path);
    } else if (presentationId) {
      try {
        const response = await fetch(`/api/slides/${presentationId}`);
        if (response.ok) {
          const data = await response.json();
          state.presentationId = presentationId;
          state.presentationName = data.name || "Untitled Presentation";
          state.slides = data.slides || [];

          if (elements.presentationName) {
            elements.presentationName.value = state.presentationName;
          }

          renderThumbnails();
          renderCurrentSlide();
          updateSlideCounter();
        }
      } catch (e) {
        console.error("Load failed:", e);
        createNewPresentation();
      }
    } else {
      createNewPresentation();
    }
  }

  async function loadFromDrive(bucket, path) {
    const fileName = path.split("/").pop() || "presentation";

    state.driveSource = { bucket, path };
    state.presentationName = fileName;

    if (elements.presentationName) {
      elements.presentationName.value = fileName;
    }

    try {
      const response = await fetch("/api/files/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, path }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content || "";

      createNewPresentation();
      if (state.slides.length > 0 && state.slides[0].elements) {
        const titleElement = state.slides[0].elements.find(
          (el) => el.element_type === "text" && el.style?.fontSize >= 32,
        );
        if (titleElement) {
          titleElement.content = fileName.replace(/\.[^/.]+$/, "");
        }
      }

      renderThumbnails();
      renderCurrentSlide();
      updateSlideCounter();
      state.isDirty = false;
    } catch (err) {
      console.error("Failed to load file from drive:", err);
      createNewPresentation();
    }
  }

  function cacheElements() {
    elements.container = document.querySelector(".slides-container");
    elements.sidebar = document.getElementById("slides-sidebar");
    elements.thumbnails = document.getElementById("slide-thumbnails");
    elements.canvas = document.getElementById("slide-canvas");
    elements.canvasContainer = document.getElementById("canvas-container");
    elements.selectionHandles = document.getElementById("selection-handles");
    elements.propertiesPanel = document.getElementById("properties-panel");
    elements.presentationName = document.getElementById("presentation-name");
    elements.collaborators = document.getElementById("collaborators");
    elements.contextMenu = document.getElementById("context-menu");
    elements.slideContextMenu = document.getElementById("slide-context-menu");
    elements.cursorIndicators = document.getElementById("cursor-indicators");
  }

  function bindEvents() {
    elements.canvas.addEventListener("mousedown", handleCanvasMouseDown);
    elements.canvas.addEventListener("dblclick", handleCanvasDoubleClick);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", hideContextMenus);
    elements.canvas.addEventListener("contextmenu", handleContextMenu);

    const handles = elements.selectionHandles.querySelectorAll(
      ".handle, .rotate-handle",
    );
    handles.forEach((handle) => {
      handle.addEventListener("mousedown", handleResizeStart);
    });

    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  function createNewPresentation() {
    const titleSlide = createSlide("title");
    state.slides = [titleSlide];
    state.currentSlideIndex = 0;
    state.theme = createDefaultTheme();
    renderThumbnails();
    renderCurrentSlide();
    updateSlideCounter();
  }

  function createSlide(layout) {
    const slide = {
      id: generateId(),
      layout: layout,
      elements: [],
      background: {
        bg_type: "solid",
        color: "#ffffff",
      },
      notes: null,
      transition: {
        transition_type: "fade",
        duration: 0.5,
      },
    };

    switch (layout) {
      case "title":
        slide.elements.push(
          createTextElement(100, 200, 760, 100, "Presentation Title", {
            fontSize: 48,
            fontWeight: "bold",
            textAlign: "center",
            color: "#1e293b",
          }),
        );
        slide.elements.push(
          createTextElement(100, 320, 760, 50, "Subtitle or Author Name", {
            fontSize: 24,
            textAlign: "center",
            color: "#64748b",
          }),
        );
        break;
      case "title-content":
        slide.elements.push(
          createTextElement(50, 40, 860, 60, "Slide Title", {
            fontSize: 36,
            fontWeight: "bold",
            color: "#1e293b",
          }),
        );
        slide.elements.push(
          createTextElement(
            50,
            120,
            860,
            400,
            "• Click to add content\n• Add your bullet points here",
            {
              fontSize: 20,
              color: "#374151",
              lineHeight: 1.6,
            },
          ),
        );
        break;
      case "two-column":
        slide.elements.push(
          createTextElement(50, 40, 860, 60, "Slide Title", {
            fontSize: 36,
            fontWeight: "bold",
            color: "#1e293b",
          }),
        );
        slide.elements.push(
          createTextElement(50, 120, 410, 400, "Left column content", {
            fontSize: 18,
            color: "#374151",
          }),
        );
        slide.elements.push(
          createTextElement(500, 120, 410, 400, "Right column content", {
            fontSize: 18,
            color: "#374151",
          }),
        );
        break;
      case "section":
        slide.elements.push(
          createTextElement(100, 220, 760, 100, "Section Title", {
            fontSize: 48,
            fontWeight: "bold",
            textAlign: "center",
            color: "#1e293b",
          }),
        );
        break;
      case "blank":
      default:
        break;
    }

    return slide;
  }

  function createTextElement(x, y, width, height, text, style) {
    return {
      id: generateId(),
      element_type: "text",
      x: x,
      y: y,
      width: width,
      height: height,
      rotation: 0,
      content: { text: text },
      style: {
        fontFamily: style.fontFamily || "Inter",
        fontSize: style.fontSize || 16,
        fontWeight: style.fontWeight || "normal",
        fontStyle: style.fontStyle || "normal",
        textAlign: style.textAlign || "left",
        verticalAlign: style.verticalAlign || "top",
        color: style.color || "#000000",
        lineHeight: style.lineHeight || 1.4,
        ...style,
      },
      animations: [],
      z_index: 1,
      locked: false,
    };
  }

  function createShapeElement(x, y, width, height, shapeType, style) {
    return {
      id: generateId(),
      element_type: "shape",
      x: x,
      y: y,
      width: width,
      height: height,
      rotation: 0,
      content: { shape_type: shapeType },
      style: {
        fill: style.fill || "#3b82f6",
        stroke: style.stroke || "none",
        strokeWidth: style.strokeWidth || 0,
        opacity: style.opacity || 1,
        borderRadius: style.borderRadius || 0,
        ...style,
      },
      animations: [],
      z_index: 1,
      locked: false,
    };
  }

  function createImageElement(x, y, width, height, src) {
    return {
      id: generateId(),
      element_type: "image",
      x: x,
      y: y,
      width: width,
      height: height,
      rotation: 0,
      content: { src: src },
      style: {
        opacity: 1,
        borderRadius: 0,
      },
      animations: [],
      z_index: 1,
      locked: false,
    };
  }

  function createDefaultTheme() {
    return {
      name: "Default",
      colors: {
        primary: "#3b82f6",
        secondary: "#64748b",
        accent: "#f59e0b",
        background: "#ffffff",
        text: "#1e293b",
        text_light: "#64748b",
      },
      fonts: {
        heading: "Inter",
        body: "Inter",
      },
    };
  }

  function renderThumbnails() {
    if (!elements.thumbnails) return;

    elements.thumbnails.innerHTML = state.slides
      .map(
        (slide, index) => `
      <div class="slide-thumbnail ${index === state.currentSlideIndex ? "active" : ""}"
           data-index="${index}"
           onclick="window.slidesApp.goToSlide(${index})"
           oncontextmenu="window.slidesApp.showSlideContextMenu(event, ${index})">
        <div class="slide-thumbnail-preview" id="thumbnail-${index}">
          ${renderSlideThumbnailContent(slide)}
        </div>
        <span class="slide-thumbnail-number">${index + 1}</span>
      </div>
    `,
      )
      .join("");
  }

  function renderSlideThumbnailContent(slide) {
    const scale = 0.15;
    let html = `<div style="transform: scale(${scale}); transform-origin: top left; width: ${CONFIG.CANVAS_WIDTH}px; height: ${CONFIG.CANVAS_HEIGHT}px; background: ${slide.background.color || "#ffffff"}; position: relative;">`;

    slide.elements.forEach((element) => {
      html += renderElementHTML(element, true);
    });

    html += "</div>";
    return html;
  }

  function renderCurrentSlide() {
    if (!elements.canvas) return;

    const slide = state.slides[state.currentSlideIndex];
    if (!slide) return;

    elements.canvas.style.background = slide.background.color || "#ffffff";
    elements.canvas.innerHTML = "";

    slide.elements.forEach((element) => {
      const el = document.createElement("div");
      el.innerHTML = renderElementHTML(element);
      const elementNode = el.firstElementChild;
      if (elementNode) {
        elements.canvas.appendChild(elementNode);
        bindElementEvents(elementNode, element);
      }
    });

    clearSelection();
    updateSlideCounter();
  }

  function renderElementHTML(element, isThumbnail = false) {
    const style = buildElementStyle(element);
    const classes = ["slide-element"];

    if (
      state.selectedElement &&
      state.selectedElement.id === element.id &&
      !isThumbnail
    ) {
      classes.push("selected");
    }
    if (element.locked) {
      classes.push("locked");
    }

    let content = "";

    switch (element.element_type) {
      case "text":
        classes.push("slide-element-text");
        content = escapeHtml(element.content.text || "").replace(/\n/g, "<br>");
        break;
      case "image":
        classes.push("slide-element-image");
        content = `<img src="${element.content.src}" alt="" draggable="false">`;
        break;
      case "shape":
        classes.push("slide-element-shape");
        content = renderShapeSVG(element);
        break;
      case "chart":
        classes.push("slide-element-chart");
        content = renderChartContent(element);
        break;
    }

    return `
      <div class="${classes.join(" ")}"
           data-id="${element.id}"
           style="${style}">
        ${content}
      </div>
    `;
  }

  function buildElementStyle(element) {
    const styles = [
      `left: ${element.x}px`,
      `top: ${element.y}px`,
      `width: ${element.width}px`,
      `height: ${element.height}px`,
      `transform: rotate(${element.rotation || 0}deg)`,
      `z-index: ${element.z_index || 1}`,
    ];

    const s = element.style || {};

    if (element.element_type === "text") {
      if (s.fontFamily) styles.push(`font-family: ${s.fontFamily}`);
      if (s.fontSize) styles.push(`font-size: ${s.fontSize}px`);
      if (s.fontWeight) styles.push(`font-weight: ${s.fontWeight}`);
      if (s.fontStyle) styles.push(`font-style: ${s.fontStyle}`);
      if (s.textAlign) styles.push(`text-align: ${s.textAlign}`);
      if (s.color) styles.push(`color: ${s.color}`);
      if (s.lineHeight) styles.push(`line-height: ${s.lineHeight}`);
      if (s.fill) styles.push(`background: ${s.fill}`);
    }

    if (element.element_type === "shape") {
      if (s.opacity) styles.push(`opacity: ${s.opacity}`);
    }

    return styles.join("; ");
  }

  function renderShapeSVG(element) {
    const shapeType = element.content.shape_type || "rectangle";
    const fill = element.style.fill || "#3b82f6";
    const stroke = element.style.stroke || "none";
    const strokeWidth = element.style.strokeWidth || 0;

    let path = "";
    switch (shapeType) {
      case "rectangle":
        path = `<rect x="0" y="0" width="100%" height="100%" rx="${element.style.borderRadius || 0}"/>`;
        break;
      case "rounded-rectangle":
        path = `<rect x="0" y="0" width="100%" height="100%" rx="12"/>`;
        break;
      case "ellipse":
        path = `<ellipse cx="50%" cy="50%" rx="50%" ry="50%"/>`;
        break;
      case "triangle":
        path = `<polygon points="50,0 100,100 0,100"/>`;
        break;
      case "diamond":
        path = `<polygon points="50,0 100,50 50,100 0,50"/>`;
        break;
      case "star":
        path = `<polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35"/>`;
        break;
      case "arrow-right":
        path = `<polygon points="0,25 60,25 60,0 100,50 60,100 60,75 0,75"/>`;
        break;
      case "callout":
        path = `<path d="M0,0 L100,0 L100,70 L40,70 L20,100 L20,70 L0,70 Z"/>`;
        break;
      default:
        path = `<rect x="0" y="0" width="100%" height="100%"/>`;
    }

    return `
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="fill: ${fill}; stroke: ${stroke}; stroke-width: ${strokeWidth};">
        ${path}
      </svg>
    `;
  }

  function renderChartContent(element) {
    return '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;">Chart</div>';
  }

  function bindElementEvents(node, element) {
    node.addEventListener("mousedown", (e) =>
      handleElementMouseDown(e, element),
    );
    node.addEventListener("dblclick", (e) =>
      handleElementDoubleClick(e, element),
    );
  }

  function handleCanvasMouseDown(e) {
    if (e.target === elements.canvas) {
      clearSelection();
    }
  }

  function handleCanvasDoubleClick(e) {
    if (e.target === elements.canvas) {
      const rect = elements.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / state.zoom;
      const y = (e.clientY - rect.top) / state.zoom;
      addTextBoxAt(x - 100, y - 25);
    }
  }

  function addTextBox() {
    const slide = state.slides[state.currentSlideIndex];
    const centerX = CONFIG.CANVAS_WIDTH / 2 - 150;
    const centerY = CONFIG.CANVAS_HEIGHT / 2 - 30;
    addTextBoxAt(centerX, centerY);
  }

  function addTextBoxAt(x, y) {
    const slide = state.slides[state.currentSlideIndex];
    const textElement = createTextElement(x, y, 300, 60, "Click to edit text", {
      fontSize: 24,
      color: "#1e293b",
    });
    slide.elements.push(textElement);
    saveToHistory();
    renderCurrentSlide();
    selectElement(textElement);
    scheduleAutoSave();
    broadcastChange("elementAdded", { element: textElement });
  }

  function handleElementMouseDown(e, element) {
    e.stopPropagation();

    if (element.locked) return;

    selectElement(element);

    if (e.button === 0) {
      state.isDragging = true;
      state.dragStart = {
        x: e.clientX,
        y: e.clientY,
        elementX: element.x,
        elementY: element.y,
      };
    }
  }

  function handleElementDoubleClick(e, element) {
    e.stopPropagation();

    if (element.element_type === "text") {
      startTextEditing(element);
    }
  }

  function handleResizeStart(e) {
    e.stopPropagation();

    if (!state.selectedElement) return;

    const handle = e.target.dataset.handle;
    if (handle === "rotate") {
      state.isRotating = true;
    } else {
      state.isResizing = true;
      state.resizeHandle = handle;
    }

    state.dragStart = {
      x: e.clientX,
      y: e.clientY,
      elementX: state.selectedElement.x,
      elementY: state.selectedElement.y,
      elementWidth: state.selectedElement.width,
      elementHeight: state.selectedElement.height,
      elementRotation: state.selectedElement.rotation || 0,
    };
  }

  function handleMouseMove(e) {
    if (state.isDragging && state.selectedElement && state.dragStart) {
      const dx = (e.clientX - state.dragStart.x) / state.zoom;
      const dy = (e.clientY - state.dragStart.y) / state.zoom;

      state.selectedElement.x = state.dragStart.elementX + dx;
      state.selectedElement.y = state.dragStart.elementY + dy;

      updateElementPosition(state.selectedElement);
      updateSelectionHandles();
      broadcastChange("elementMove", state.selectedElement);
    } else if (state.isResizing && state.selectedElement && state.dragStart) {
      const dx = (e.clientX - state.dragStart.x) / state.zoom;
      const dy = (e.clientY - state.dragStart.y) / state.zoom;

      resizeElement(dx, dy);
      updateElementPosition(state.selectedElement);
      updateSelectionHandles();
      broadcastChange("elementResize", state.selectedElement);
    } else if (state.isRotating && state.selectedElement) {
      const rect = elements.canvas.getBoundingClientRect();
      const centerX = state.selectedElement.x + state.selectedElement.width / 2;
      const centerY =
        state.selectedElement.y + state.selectedElement.height / 2;
      const mouseX = (e.clientX - rect.left) / state.zoom;
      const mouseY = (e.clientY - rect.top) / state.zoom;

      const angle =
        Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI) + 90;
      state.selectedElement.rotation = Math.round(angle);

      updateElementPosition(state.selectedElement);
      updateSelectionHandles();
      updatePropertiesPanel();
      broadcastChange("elementRotate", state.selectedElement);
    }

    broadcastCursor(e);
  }

  function resizeElement(dx, dy) {
    const el = state.selectedElement;
    const s = state.dragStart;

    switch (state.resizeHandle) {
      case "se":
        el.width = Math.max(CONFIG.MIN_ELEMENT_SIZE, s.elementWidth + dx);
        el.height = Math.max(CONFIG.MIN_ELEMENT_SIZE, s.elementHeight + dy);
        break;
      case "sw":
        el.x = s.elementX + dx;
        el.width = Math.max(CONFIG.MIN_ELEMENT_SIZE, s.elementWidth - dx);
        el.height = Math.max(CONFIG.MIN_ELEMENT_SIZE, s.elementHeight + dy);
        break;
      case "ne":
        el.y = s.elementY + dy;
        el.width = Math.max(CONFIG.MIN_ELEMENT_SIZE, s.elementWidth + dx);
        el.height = Math.max(CONFIG.MIN_ELEMENT_SIZE, s.elementHeight - dy);
        break;
      case "nw":
        el.x = s.elementX + dx;
        el.y = s.elementY + dy;
        el.width = Math.max(CONFIG.MIN_ELEMENT_SIZE, s.elementWidth - dx);
        el.height = Math.max(CONFIG.MIN_ELEMENT_SIZE, s.elementHeight - dy);
        break;
      case "n":
        el.y = s.elementY + dy;
        el.height = Math.max(CONFIG.MIN_ELEMENT_SIZE, s.elementHeight - dy);
        break;
      case "s":
        el.height = Math.max(CONFIG.MIN_ELEMENT_SIZE, s.elementHeight + dy);
        break;
      case "e":
        el.width = Math.max(CONFIG.MIN_ELEMENT_SIZE, s.elementWidth + dx);
        break;
      case "w":
        el.x = s.elementX + dx;
        el.width = Math.max(CONFIG.MIN_ELEMENT_SIZE, s.elementWidth - dx);
        break;
    }
  }

  function handleMouseUp() {
    if (state.isDragging || state.isResizing || state.isRotating) {
      saveToHistory();
      scheduleAutoSave();
    }

    state.isDragging = false;
    state.isResizing = false;
    state.isRotating = false;
    state.dragStart = null;
    state.resizeHandle = null;
  }

  function handleKeyDown(e) {
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.isContentEditable
    ) {
      return;
    }

    const isMod = e.ctrlKey || e.metaKey;

    if (isMod && e.key === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    } else if (isMod && e.key === "y") {
      e.preventDefault();
      redo();
    } else if (isMod && e.key === "c") {
      e.preventDefault();
      copyElement();
    } else if (isMod && e.key === "x") {
      e.preventDefault();
      cutElement();
    } else if (isMod && e.key === "v") {
      e.preventDefault();
      pasteElement();
    } else if (isMod && e.key === "d") {
      e.preventDefault();
      duplicateElement();
    } else if (isMod && e.key === "s") {
      e.preventDefault();
      savePresentation();
    } else if (isMod && e.key === "a") {
      e.preventDefault();
      selectAll();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (state.selectedElement) {
        e.preventDefault();
        deleteElement();
      }
    } else if (e.key === "Escape") {
      clearSelection();
      hideContextMenus();
      if (state.isPresenting) {
        exitPresentation();
      }
    } else if (e.key === "ArrowUp" && state.selectedElement) {
      e.preventDefault();
      state.selectedElement.y -= e.shiftKey ? 10 : 1;
      updateElementPosition(state.selectedElement);
      updateSelectionHandles();
    } else if (e.key === "ArrowDown" && state.selectedElement) {
      e.preventDefault();
      state.selectedElement.y += e.shiftKey ? 10 : 1;
      updateElementPosition(state.selectedElement);
      updateSelectionHandles();
    } else if (e.key === "ArrowLeft" && state.selectedElement) {
      e.preventDefault();
      state.selectedElement.x -= e.shiftKey ? 10 : 1;
      updateElementPosition(state.selectedElement);
      updateSelectionHandles();
    } else if (e.key === "ArrowRight" && state.selectedElement) {
      e.preventDefault();
      state.selectedElement.x += e.shiftKey ? 10 : 1;
      updateElementPosition(state.selectedElement);
      updateSelectionHandles();
    } else if (e.key === "F5") {
      e.preventDefault();
      startPresentation();
    } else if (
      e.key === "PageDown" ||
      (e.key === "ArrowRight" && !state.selectedElement)
    ) {
      e.preventDefault();
      goToSlide(state.currentSlideIndex + 1);
    } else if (
      e.key === "PageUp" ||
      (e.key === "ArrowLeft" && !state.selectedElement)
    ) {
      e.preventDefault();
      goToSlide(state.currentSlideIndex - 1);
    }
  }

  function selectElement(element) {
    state.selectedElement = element;

    document.querySelectorAll(".slide-element.selected").forEach((el) => {
      el.classList.remove("selected");
    });

    const node = document.querySelector(`[data-id="${element.id}"]`);
    if (node) {
      node.classList.add("selected");
    }

    updateSelectionHandles();
    updatePropertiesPanel();
    showPropertiesPanel();
  }

  function clearSelection() {
    state.selectedElement = null;

    document.querySelectorAll(".slide-element.selected").forEach((el) => {
      el.classList.remove("selected");
    });

    hideSelectionHandles();
    updatePropertiesPanel();
  }

  function updateSelectionHandles() {
    if (!state.selectedElement || !elements.selectionHandles) {
      hideSelectionHandles();
      return;
    }

    const el = state.selectedElement;
    elements.selectionHandles.classList.remove("hidden");
    elements.selectionHandles.style.left = `${el.x}px`;
    elements.selectionHandles.style.top = `${el.y}px`;
    elements.selectionHandles.style.width = `${el.width}px`;
    elements.selectionHandles.style.height = `${el.height}px`;
    elements.selectionHandles.style.transform = `rotate(${el.rotation || 0}deg)`;
  }

  function hideSelectionHandles() {
    if (elements.selectionHandles) {
      elements.selectionHandles.classList.add("hidden");
    }
  }

  function updateElementPosition(element) {
    const node = document.querySelector(`[data-id="${element.id}"]`);
    if (node) {
      node.style.left = `${element.x}px`;
      node.style.top = `${element.y}px`;
      node.style.width = `${element.width}px`;
      node.style.height = `${element.height}px`;
      node.style.transform = `rotate(${element.rotation || 0}deg)`;
    }
    state.isDirty = true;
  }

  function updatePropertiesPanel() {
    if (!state.selectedElement) {
      document.getElementById("prop-x").value = "";
      document.getElementById("prop-y").value = "";
      document.getElementById("prop-width").value = "";
      document.getElementById("prop-height").value = "";
      document.getElementById("prop-rotation").value = 0;
      document.getElementById("rotation-value").textContent = "0°";
      document.getElementById("prop-opacity").value = 100;
      document.getElementById("opacity-value").textContent = "100%";
      return;
    }

    const el = state.selectedElement;
    document.getElementById("prop-x").value = Math.round(el.x);
    document.getElementById("prop-y").value = Math.round(el.y);
    document.getElementById("prop-width").value = Math.round(el.width);
    document.getElementById("prop-height").value = Math.round(el.height);
    document.getElementById("prop-rotation").value = el.rotation || 0;
    document.getElementById("rotation-value").textContent =
      `${el.rotation || 0}°`;

    const opacity = (el.style.opacity || 1) * 100;
    document.getElementById("prop-opacity").value = opacity;
    document.getElementById("opacity-value").textContent =
      `${Math.round(opacity)}%`;
  }

  function showPropertiesPanel() {
    if (elements.propertiesPanel) {
      elements.propertiesPanel.classList.remove("collapsed");
    }
  }

  function startTextEditing(element) {
    const node = document.querySelector(`[data-id="${element.id}"]`);
    if (!node) return;

    node.contentEditable = true;
    node.classList.add("editing");
    node.focus();

    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    node.addEventListener(
      "blur",
      () => {
        node.contentEditable = false;
        node.classList.remove("editing");
        element.content.text = node.innerText;
        saveToHistory();
        scheduleAutoSave();
        renderThumbnails();
      },
      { once: true },
    );
  }

  function goToSlide(index) {
    if (index < 0 || index >= state.slides.length) return;

    state.currentSlideIndex = index;
    renderCurrentSlide();
    renderThumbnails();
    updateSlideCounter();
    broadcastChange("slideChange", { slideIndex: index });
  }

  function addSlide(layout = "title-content") {
    const newSlide = createSlide(layout);
    state.slides.splice(state.currentSlideIndex + 1, 0, newSlide);
    state.currentSlideIndex++;
    saveToHistory();
    renderThumbnails();
    renderCurrentSlide();
    updateSlideCounter();
    scheduleAutoSave();
    broadcastChange("slideAdded", { slideIndex: state.currentSlideIndex });
  }

  function duplicateSlide() {
    const currentSlide = state.slides[state.currentSlideIndex];
    const duplicated = JSON.parse(JSON.stringify(currentSlide));
    duplicated.id = generateId();
    duplicated.elements.forEach((el) => {
      el.id = generateId();
    });
    state.slides.splice(state.currentSlideIndex + 1, 0, duplicated);
    state.currentSlideIndex++;
    saveToHistory();
    renderThumbnails();
    renderCurrentSlide();
    updateSlideCounter();
    scheduleAutoSave();
  }

  function deleteSlide() {
    if (state.slides.length <= 1) return;

    state.slides.splice(state.currentSlideIndex, 1);
    if (state.currentSlideIndex >= state.slides.length) {
      state.currentSlideIndex = state.slides.length - 1;
    }
    saveToHistory();
    renderThumbnails();
    renderCurrentSlide();
    updateSlideCounter();
    scheduleAutoSave();
    broadcastChange("slideDeleted", { slideIndex: state.currentSlideIndex });
  }

  function updateSlideCounter() {
    const currentEl = document.getElementById("current-slide-num");
    const totalEl = document.getElementById("total-slides-num");
    if (currentEl) currentEl.textContent = state.currentSlideIndex + 1;
    if (totalEl) totalEl.textContent = state.slides.length;
  }

  function showImageModal() {
    const url = prompt("Enter image URL:");
    if (url) {
      addImage(url);
    }
  }

  function addImage(url) {
    const slide = state.slides[state.currentSlideIndex];
    const imageElement = createImageElement(100, 100, 400, 300, url);
    slide.elements.push(imageElement);
    saveToHistory();
    renderCurrentSlide();
    selectElement(imageElement);
    scheduleAutoSave();
  }

  function showShapeModal() {
    addShape("rectangle");
  }

  function addShape(shapeType) {
    const slide = state.slides[state.currentSlideIndex];
    const shapeElement = createShapeElement(100, 100, 200, 150, shapeType, {
      fill: "#3b82f6",
    });
    slide.elements.push(shapeElement);
    saveToHistory();
    renderCurrentSlide();
    selectElement(shapeElement);
    scheduleAutoSave();
  }

  function showChartModal() {
    alert("Chart insertion coming soon!");
  }

  function addTable() {
    alert("Table insertion coming soon!");
  }

  function setFontFamily(family) {
    if (
      state.selectedElement &&
      state.selectedElement.element_type === "text"
    ) {
      state.selectedElement.style.fontFamily = family;
      renderCurrentSlide();
      scheduleAutoSave();
    }
  }

  function setFontSize(size) {
    if (
      state.selectedElement &&
      state.selectedElement.element_type === "text"
    ) {
      state.selectedElement.style.fontSize = parseInt(size, 10);
      renderCurrentSlide();
      scheduleAutoSave();
    }
  }

  function toggleBold() {
    if (
      state.selectedElement &&
      state.selectedElement.element_type === "text"
    ) {
      state.selectedElement.style.fontWeight =
        state.selectedElement.style.fontWeight === "bold" ? "normal" : "bold";
      renderCurrentSlide();
      scheduleAutoSave();
    }
  }

  function toggleItalic() {
    if (
      state.selectedElement &&
      state.selectedElement.element_type === "text"
    ) {
      state.selectedElement.style.fontStyle =
        state.selectedElement.style.fontStyle === "italic"
          ? "normal"
          : "italic";
      renderCurrentSlide();
      scheduleAutoSave();
    }
  }

  function toggleUnderline() {
    if (
      state.selectedElement &&
      state.selectedElement.element_type === "text"
    ) {
      state.selectedElement.style.textDecoration =
        state.selectedElement.style.textDecoration === "underline"
          ? "none"
          : "underline";
      renderCurrentSlide();
      scheduleAutoSave();
    }
  }

  function startPresentation() {
    state.isPresenting = true;
    if (elements.presenterModal) {
      elements.presenterModal.classList.remove("hidden");
      renderPresenterSlide();
    }
    document.addEventListener("keydown", handlePresenterKeyDown);
  }

  function exitPresentation() {
    state.isPresenting = false;
    if (elements.presenterModal) {
      elements.presenterModal.classList.add("hidden");
    }
    document.removeEventListener("keydown", handlePresenterKeyDown);
  }

  function handlePresenterKeyDown(e) {
    if (e.key === "Escape") {
      exitPresentation();
    } else if (e.key === "ArrowRight" || e.key === " ") {
      navigatePresentation(1);
    } else if (e.key === "ArrowLeft") {
      navigatePresentation(-1);
    }
  }

  function navigatePresentation(direction) {
    const newIndex = state.currentSlideIndex + direction;
    if (newIndex >= 0 && newIndex < state.slides.length) {
      goToSlide(newIndex);
      if (state.isPresenting) {
        renderPresenterSlide();
      }
    }
  }

  function renderPresenterSlide() {
    const presenterSlide = document.getElementById("presenterSlide");
    const presenterSlideNumber = document.getElementById(
      "presenterSlideNumber",
    );
    if (presenterSlide && state.slides[state.currentSlideIndex]) {
      presenterSlide.innerHTML = renderSlideContent(
        state.slides[state.currentSlideIndex],
      );
    }
    if (presenterSlideNumber) {
      presenterSlideNumber.textContent = `${state.currentSlideIndex + 1} / ${state.slides.length}`;
    }
  }

  function renderSlideContent(slide) {
    let html = "";
    if (slide.elements) {
      slide.elements.forEach((el) => {
        html += renderElementHTML(el);
      });
    }
    return html;
  }

  function zoomIn() {
    if (state.zoom < 200) {
      state.zoom += 10;
      applyZoom();
    }
  }

  function zoomOut() {
    if (state.zoom > 50) {
      state.zoom -= 10;
      applyZoom();
    }
  }

  function applyZoom() {
    if (elements.slideCanvas) {
      elements.slideCanvas.style.transform = `scale(${state.zoom / 100})`;
    }
    if (elements.zoomLevel) {
      elements.zoomLevel.textContent = `${state.zoom}%`;
    }
  }

  function toggleChatPanel() {
    state.chatPanelOpen = !state.chatPanelOpen;
    elements.chatPanel?.classList.toggle("collapsed", !state.chatPanelOpen);
  }

  function handleChatSubmit(e) {
    e.preventDefault();
    const message = elements.chatInput?.value.trim();
    if (!message) return;

    addChatMessage("user", message);
    if (elements.chatInput) elements.chatInput.value = "";

    processAICommand(message);
  }

  function handleSuggestionClick(action) {
    const commands = {
      title: "Add a title slide",
      image: "Insert an image",
      duplicate: "Duplicate this slide",
      notes: "Add speaker notes",
    };

    const message = commands[action] || action;
    addChatMessage("user", message);
    processAICommand(message);
  }

  function addChatMessage(role, content) {
    if (!elements.chatMessages) return;
    const div = document.createElement("div");
    div.className = `chat-message ${role}`;
    div.innerHTML = `<div class="message-bubble">${escapeHtml(content)}</div>`;
    elements.chatMessages.appendChild(div);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }

  async function processAICommand(command) {
    const lower = command.toLowerCase();
    let response = "";

    if (lower.includes("title") && lower.includes("slide")) {
      addSlide("title");
      response = "Added a new title slide!";
    } else if (lower.includes("add") && lower.includes("slide")) {
      addSlide();
      response = "Added a new blank slide!";
    } else if (lower.includes("duplicate")) {
      duplicateSlide();
      response = "Duplicated the current slide!";
    } else if (lower.includes("delete") && lower.includes("slide")) {
      if (state.slides.length > 1) {
        deleteSlide();
        response = "Deleted the current slide!";
      } else {
        response = "Cannot delete the only slide in the presentation.";
      }
    } else if (lower.includes("image") || lower.includes("picture")) {
      showModal("imageModal");
      response = "Opening image dialog. Enter the image URL to insert.";
    } else if (lower.includes("shape")) {
      showModal("shapeModal");
      response = "Opening shape picker. Choose a shape to insert.";
    } else if (lower.includes("text") || lower.includes("text box")) {
      addTextBox();
      response = "Added a text box! Double-click to edit the text.";
    } else if (lower.includes("background")) {
      showModal("backgroundModal");
      response = "Opening background settings. Choose a color or image.";
    } else if (lower.includes("notes") || lower.includes("speaker")) {
      showModal("notesModal");
      const currentSlide = state.slides[state.currentSlideIndex];
      const notesInput = document.getElementById("speakerNotes");
      if (notesInput && currentSlide) {
        notesInput.value = currentSlide.notes || "";
      }
      response = "Opening speaker notes. Add notes for this slide.";
    } else if (lower.includes("present") || lower.includes("start")) {
      startPresentation();
      response = "Starting presentation mode! Press Esc to exit.";
    } else if (lower.includes("bigger") || lower.includes("larger")) {
      if (state.selectedElement) {
        state.selectedElement.width =
          (state.selectedElement.width || 200) * 1.2;
        state.selectedElement.height =
          (state.selectedElement.height || 100) * 1.2;
        renderCurrentSlide();
        response = "Made the selected element larger!";
      } else {
        response = "Please select an element first.";
      }
    } else if (lower.includes("smaller")) {
      if (state.selectedElement) {
        state.selectedElement.width =
          (state.selectedElement.width || 200) * 0.8;
        state.selectedElement.height =
          (state.selectedElement.height || 100) * 0.8;
        renderCurrentSlide();
        response = "Made the selected element smaller!";
      } else {
        response = "Please select an element first.";
      }
    } else if (lower.includes("center")) {
      if (state.selectedElement) {
        state.selectedElement.x =
          (CONFIG.CANVAS_WIDTH - (state.selectedElement.width || 200)) / 2;
        state.selectedElement.y =
          (CONFIG.CANVAS_HEIGHT - (state.selectedElement.height || 100)) / 2;
        renderCurrentSlide();
        response = "Centered the selected element!";
      } else {
        response = "Please select an element first.";
      }
    } else if (lower.includes("bold")) {
      toggleBold();
      response = "Toggled bold formatting!";
    } else if (lower.includes("italic")) {
      toggleItalic();
      response = "Toggled italic formatting!";
    } else {
      try {
        const res = await fetch("/api/slides/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command,
            slideIndex: state.currentSlideIndex,
            presentationId: state.presentationId,
          }),
        });
        const data = await res.json();
        response = data.response || "I processed your request.";
      } catch {
        response =
          "I can help you with:\n• Add/duplicate/delete slides\n• Insert text, images, shapes\n• Change slide background\n• Add speaker notes\n• Make elements bigger/smaller\n• Center elements\n• Start presentation";
      }
    }

    addChatMessage("assistant", response);
  }

  function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("hidden");
  }

  function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("hidden");
  }

  function insertImage() {
    const url = document.getElementById("imageUrl")?.value;
    const alt = document.getElementById("imageAlt")?.value || "Image";
    if (url) {
      const slide = state.slides[state.currentSlideIndex];
      if (slide) {
        const imageElement = createImageElement(url, 100, 100, 400, 300);
        slide.elements.push(imageElement);
        renderCurrentSlide();
        renderThumbnails();
        state.isDirty = true;
        scheduleAutoSave();
      }
      hideModal("imageModal");
    }
  }

  function saveNotes() {
    const notes = document.getElementById("speakerNotes")?.value || "";
    const slide = state.slides[state.currentSlideIndex];
    if (slide) {
      slide.notes = notes;
      state.isDirty = true;
      scheduleAutoSave();
    }
    hideModal("notesModal");
    addChatMessage("assistant", "Speaker notes saved!");
  }

  function applyBackground() {
    const color = document.getElementById("bgColor")?.value;
    const imageUrl = document.getElementById("bgImageUrl")?.value;
    const slide = state.slides[state.currentSlideIndex];

    if (slide) {
      if (imageUrl) {
        slide.background = { bg_type: "image", url: imageUrl };
      } else if (color) {
        slide.background = { bg_type: "solid", color };
      }
      renderCurrentSlide();
      renderThumbnails();
      state.isDirty = true;
      scheduleAutoSave();
    }
    hideModal("backgroundModal");
    addChatMessage("assistant", "Slide background updated!");
  }

  function copyShareLink() {
    const linkInput = document.getElementById("shareLink");
    if (linkInput) {
      const shareUrl = `${window.location.origin}${window.location.pathname}#id=${state.presentationId || "new"}`;
      linkInput.value = shareUrl;
      linkInput.select();
      navigator.clipboard.writeText(shareUrl);
      addChatMessage("assistant", "Share link copied to clipboard!");
    }
  }

  function handleContextMenu(e) {
    e.preventDefault();
    const target = e.target.closest(".slide-element");
    const thumbnail = e.target.closest(".slide-thumbnail");

    hideAllContextMenus();

    if (target) {
      const elementId = target.dataset.id;
      selectElement(elementId);
      showContextMenu(elements.contextMenu, e.clientX, e.clientY);
    } else if (thumbnail) {
      showContextMenu(elements.slideContextMenu, e.clientX, e.clientY);
    }
  }

  function hideAllContextMenus() {
    elements.contextMenu?.classList.add("hidden");
    elements.slideContextMenu?.classList.add("hidden");
  }

  function showContextMenu(menu, x, y) {
    if (!menu) return;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove("hidden");
  }

  function handleDocumentClick(e) {
    if (!e.target.closest(".context-menu")) {
      hideAllContextMenus();
    }
  }

  function handleContextAction(action) {
    hideAllContextMenus();

    switch (action) {
      case "cut":
        cutElement();
        break;
      case "copy":
        copyElement();
        break;
      case "paste":
        pasteElement();
        break;
      case "duplicate":
        duplicateElement();
        break;
      case "delete":
        deleteElement();
        break;
      case "bringFront":
        bringToFront();
        break;
      case "sendBack":
        sendToBack();
        break;
      case "newSlide":
        addSlide();
        break;
      case "duplicateSlide":
        duplicateSlide();
        break;
      case "deleteSlide":
        deleteSlide();
        break;
      case "slideBackground":
        showModal("backgroundModal");
        break;
      case "slideNotes":
        showModal("notesModal");
        break;
    }
  }

  function cutElement() {
    if (state.selectedElement) {
      state.clipboard = JSON.parse(JSON.stringify(state.selectedElement));
      deleteElement();
    }
  }

  function copyElement() {
    if (state.selectedElement) {
      state.clipboard = JSON.parse(JSON.stringify(state.selectedElement));
      addChatMessage("assistant", "Element copied!");
    }
  }

  function pasteElement() {
    if (state.clipboard) {
      const slide = state.slides[state.currentSlideIndex];
      if (slide) {
        const newElement = JSON.parse(JSON.stringify(state.clipboard));
        newElement.id = generateId();
        newElement.x += 20;
        newElement.y += 20;
        slide.elements.push(newElement);
        renderCurrentSlide();
        renderThumbnails();
        selectElement(newElement.id);
        state.isDirty = true;
        scheduleAutoSave();
      }
    }
  }

  function duplicateElement() {
    if (state.selectedElement) {
      const slide = state.slides[state.currentSlideIndex];
      if (slide) {
        const newElement = JSON.parse(JSON.stringify(state.selectedElement));
        newElement.id = generateId();
        newElement.x += 20;
        newElement.y += 20;
        slide.elements.push(newElement);
        renderCurrentSlide();
        renderThumbnails();
        selectElement(newElement.id);
        state.isDirty = true;
        scheduleAutoSave();
      }
    }
  }

  function deleteElement() {
    if (state.selectedElement) {
      const slide = state.slides[state.currentSlideIndex];
      if (slide) {
        slide.elements = slide.elements.filter(
          (el) => el.id !== state.selectedElement.id,
        );
        clearSelection();
        renderCurrentSlide();
        renderThumbnails();
        state.isDirty = true;
        scheduleAutoSave();
      }
    }
  }

  function bringToFront() {
    if (state.selectedElement) {
      const slide = state.slides[state.currentSlideIndex];
      if (slide) {
        const index = slide.elements.findIndex(
          (el) => el.id === state.selectedElement.id,
        );
        if (index > -1) {
          const [element] = slide.elements.splice(index, 1);
          slide.elements.push(element);
          renderCurrentSlide();
          state.isDirty = true;
        }
      }
    }
  }

  function sendToBack() {
    if (state.selectedElement) {
      const slide = state.slides[state.currentSlideIndex];
      if (slide) {
        const index = slide.elements.findIndex(
          (el) => el.id === state.selectedElement.id,
        );
        if (index > -1) {
          const [element] = slide.elements.splice(index, 1);
          slide.elements.unshift(element);
          renderCurrentSlide();
          state.isDirty = true;
        }
      }
    }
  }

  function setTextColor(color) {
    if (
      state.selectedElement &&
      state.selectedElement.element_type === "text"
    ) {
      state.selectedElement.style.color = color;
      renderCurrentSlide();
      state.isDirty = true;
      scheduleAutoSave();
    }
    const indicator = document.querySelector("#textColorBtn .color-indicator");
    if (indicator) indicator.style.background = color;
  }

  function setFillColor(color) {
    if (state.selectedElement) {
      if (state.selectedElement.element_type === "shape") {
        state.selectedElement.style.fill = color;
      } else if (state.selectedElement.element_type === "text") {
        state.selectedElement.style.background = color;
      }
      renderCurrentSlide();
      state.isDirty = true;
      scheduleAutoSave();
    }
    const indicator = document.querySelector("#fillColorBtn .fill-indicator");
    if (indicator) indicator.style.background = color;
  }

  function setTextAlign(align) {
    if (
      state.selectedElement &&
      state.selectedElement.element_type === "text"
    ) {
      state.selectedElement.style.textAlign = align;
      renderCurrentSlide();
      state.isDirty = true;
      scheduleAutoSave();
    }
  }

  function undo() {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      restoreFromHistory();
    }
  }

  function redo() {
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++;
      restoreFromHistory();
    }
  }

  function saveToHistory() {
    const snapshot = JSON.stringify(state.slides);
    if (state.history[state.historyIndex] === snapshot) return;

    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    if (state.history.length > CONFIG.MAX_HISTORY) {
      state.history.shift();
    } else {
      state.historyIndex++;
    }
  }

  function restoreFromHistory() {
    if (state.history[state.historyIndex]) {
      state.slides = JSON.parse(state.history[state.historyIndex]);
      renderThumbnails();
      renderCurrentSlide();
      updateSlideCounter();
    }
  }

  function generateId() {
    return "el-" + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function scheduleAutoSave() {
    if (state.autoSaveTimer) {
      clearTimeout(state.autoSaveTimer);
    }
    state.autoSaveTimer = setTimeout(savePresentation, CONFIG.AUTOSAVE_DELAY);
    if (elements.saveStatus) {
      elements.saveStatus.textContent = "Saving...";
    }
  }

  async function savePresentation() {
    if (!state.isDirty) return;

    try {
      const response = await fetch("/api/slides/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: state.presentationId,
          name: state.presentationName,
          slides: state.slides,
          theme: state.theme,
          driveSource: state.driveSource,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.id) {
          state.presentationId = result.id;
          window.history.replaceState({}, "", `#id=${state.presentationId}`);
        }
        state.isDirty = false;
        if (elements.saveStatus) {
          elements.saveStatus.textContent = "Saved";
        }
      } else {
        if (elements.saveStatus) {
          elements.saveStatus.textContent = "Save failed";
        }
      }
    } catch (e) {
      console.error("Save error:", e);
      if (elements.saveStatus) {
        elements.saveStatus.textContent = "Save failed";
      }
    }
  }

  function connectWebSocket() {
    if (!state.presentationId) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/slides/ws/${state.presentationId}`;
      state.ws = new WebSocket(wsUrl);

      state.ws.onopen = () => {
        state.ws.send(
          JSON.stringify({
            type: "join",
            userId: getUserId(),
            userName: getUserName(),
          }),
        );
      };

      state.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          handleWebSocketMessage(msg);
        } catch (err) {
          console.error("WS message error:", err);
        }
      };

      state.ws.onclose = () => {
        setTimeout(connectWebSocket, CONFIG.WS_RECONNECT_DELAY);
      };
    } catch (e) {
      console.error("WebSocket failed:", e);
    }
  }

  function handleWebSocketMessage(msg) {
    switch (msg.type) {
      case "user_joined":
        addCollaborator(msg.user);
        break;
      case "user_left":
        removeCollaborator(msg.userId);
        break;
      case "slide_update":
        if (msg.userId !== getUserId()) {
          state.slides = msg.slides;
          renderThumbnails();
          renderCurrentSlide();
        }
        break;
    }
  }

  function addCollaborator(user) {
    if (!state.collaborators.find((u) => u.id === user.id)) {
      state.collaborators.push(user);
      renderCollaborators();
    }
  }

  function removeCollaborator(userId) {
    state.collaborators = state.collaborators.filter((u) => u.id !== userId);
    renderCollaborators();
  }

  function renderCollaborators() {
    if (!elements.collaborators) return;
    elements.collaborators.innerHTML = state.collaborators
      .slice(0, 4)
      .map(
        (u) => `
        <div class="collaborator-avatar" style="background:${u.color || "#4285f4"}" title="${escapeHtml(u.name)}">
          ${u.name.charAt(0).toUpperCase()}
        </div>
      `,
      )
      .join("");
  }

  function getUserId() {
    let id = localStorage.getItem("gb-user-id");
    if (!id) {
      id = "user-" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("gb-user-id", id);
    }
    return id;
  }

  function getUserName() {
    return localStorage.getItem("gb-user-name") || "Anonymous";
  }

  window.gbSlides = {
    init,
    addSlide,
    addTextBox,
    addShape,
    addImage,
    duplicateSlide,
    deleteSlide,
    goToSlide,
    startPresentation,
    exitPresentation,
    showModal,
    hideModal,
    toggleChatPanel,
    savePresentation,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
