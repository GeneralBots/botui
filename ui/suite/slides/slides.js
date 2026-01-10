/* =============================================================================
   GB SLIDES - PowerPoint-like Presentation JavaScript
   General Bots Suite Component
   ============================================================================= */

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
    zoom: 1,
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
  };

  const elements = {
    container: null,
    sidebar: null,
    thumbnails: null,
    canvas: null,
    canvasContainer: null,
    selectionHandles: null,
    propertiesPanel: null,
    presentationName: null,
    collaborators: null,
    contextMenu: null,
    slideContextMenu: null,
    cursorIndicators: null,
  };

  function init() {
    cacheElements();
    bindEvents();
    loadFromUrlParams();
    connectWebSocket();
  }

  async function loadFromUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    let presentationId = urlParams.get("id");
    let bucket = urlParams.get("bucket");
    let path = urlParams.get("path");

    if (hash) {
      const hashQueryIndex = hash.indexOf("?");
      if (hashQueryIndex !== -1) {
        const hashParams = new URLSearchParams(
          hash.substring(hashQueryIndex + 1),
        );
        presentationId = presentationId || hashParams.get("id");
        bucket = bucket || hashParams.get("bucket");
        path = path || hashParams.get("path");
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

  function toggleSidebar() {
    if (elements.sidebar) {
      elements.sidebar.classList.toggle("open");
    }
  }

  function renamePresentation(name) {
    state.presentationName = name;
    scheduleAutoSave();
  }

  function searchPresentations(query) {
    console.log("Searching:", query);
  }

  function startPresentation() {
    state.isPresenting = true;
    document.body.classList.add("presenting");
    renderCurrentSlide();
  }

  function exitPresentation() {
    state.isPresenting = false;
    document.body.classList.remove("presenting");
    renderCurrentSlide();
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose functions globally
  window.addSlide = addSlide;
  window.addTextBox = addTextBox;
  window.showImageModal = showImageModal;
  window.showShapeModal = showShapeModal;
  window.showChartModal = showChartModal;
  window.addTable = addTable;
  window.setFontFamily = setFontFamily;
  window.setFontSize = setFontSize;
  window.toggleBold = toggleBold;
  window.toggleItalic = toggleItalic;
  window.toggleUnderline = toggleUnderline;
  window.toggleSidebar = toggleSidebar;
  window.renamePresentation = renamePresentation;
  window.searchPresentations = searchPresentations;
  window.duplicateSlide = duplicateSlide;
  window.deleteSlide = deleteSlide;
  window.startPresentation = startPresentation;
  window.exitPresentation = exitPresentation;
})();
