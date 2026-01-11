/* =============================================================================
   GB SHEET - Modern Spreadsheet with AI Chat
   ============================================================================= */

(function () {
  "use strict";

  const CONFIG = {
    COLS: 26,
    ROWS: 100,
    COL_WIDTH: 100,
    ROW_HEIGHT: 24,
    MAX_HISTORY: 50,
    AUTOSAVE_DELAY: 3000,
    WS_RECONNECT_DELAY: 3000,
  };

  const state = {
    sheetId: null,
    sheetName: "Untitled Spreadsheet",
    worksheets: [{ name: "Sheet1", data: {} }],
    activeWorksheet: 0,
    selection: {
      start: { row: 0, col: 0 },
      end: { row: 0, col: 0 },
    },
    activeCell: { row: 0, col: 0 },
    clipboard: null,
    clipboardMode: null,
    history: [],
    historyIndex: -1,
    zoom: 100,
    collaborators: [],
    ws: null,
    isEditing: false,
    isSelecting: false,
    isDirty: false,
    autoSaveTimer: null,
    chatPanelOpen: true,
  };

  const elements = {};

  function init() {
    cacheElements();
    renderGrid();
    bindEvents();
    loadFromUrlParams();
    connectWebSocket();
    connectChatWebSocket();
    selectCell(0, 0);
    updateCellAddress();
  }

  function cacheElements() {
    elements.app = document.getElementById("sheet-app");
    elements.sheetName = document.getElementById("sheetName");
    elements.columnHeaders = document.getElementById("columnHeaders");
    elements.rowHeaders = document.getElementById("rowHeaders");
    elements.cells = document.getElementById("cells");
    elements.cellsContainer = document.getElementById("cellsContainer");
    elements.formulaInput = document.getElementById("formulaInput");
    elements.cellAddress = document.getElementById("cellAddress");
    elements.worksheetTabs = document.getElementById("worksheetTabs");
    elements.collaborators = document.getElementById("collaborators");
    elements.contextMenu = document.getElementById("contextMenu");
    elements.shareModal = document.getElementById("shareModal");
    elements.chartModal = document.getElementById("chartModal");
    elements.cursorIndicators = document.getElementById("cursorIndicators");
    elements.selectionBox = document.getElementById("selectionBox");
    elements.selectionInfo = document.getElementById("selectionInfo");
    elements.calculationResult = document.getElementById("calculationResult");
    elements.saveStatus = document.getElementById("saveStatus");
    elements.zoomLevel = document.getElementById("zoomLevel");
    elements.chatPanel = document.getElementById("chatPanel");
    elements.chatMessages = document.getElementById("chatMessages");
    elements.chatInput = document.getElementById("chatInput");
    elements.chatForm = document.getElementById("chatForm");
  }

  function renderGrid() {
    elements.columnHeaders.innerHTML = "";
    for (let col = 0; col < CONFIG.COLS; col++) {
      const header = document.createElement("div");
      header.className = "column-header";
      header.textContent = getColName(col);
      header.dataset.col = col;
      elements.columnHeaders.appendChild(header);
    }

    elements.rowHeaders.innerHTML = "";
    for (let row = 0; row < CONFIG.ROWS; row++) {
      const header = document.createElement("div");
      header.className = "row-header";
      header.textContent = row + 1;
      header.dataset.row = row;
      elements.rowHeaders.appendChild(header);
    }

    elements.cells.innerHTML = "";
    elements.cells.style.gridTemplateColumns = `repeat(${CONFIG.COLS}, ${CONFIG.COL_WIDTH}px)`;
    for (let row = 0; row < CONFIG.ROWS; row++) {
      for (let col = 0; col < CONFIG.COLS; col++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = row;
        cell.dataset.col = col;
        elements.cells.appendChild(cell);
      }
    }

    renderAllCells();
  }

  function renderAllCells() {
    const ws = state.worksheets[state.activeWorksheet];
    if (!ws) return;

    const cells = elements.cells.querySelectorAll(".cell");
    cells.forEach((cell) => {
      const row = parseInt(cell.dataset.row);
      const col = parseInt(cell.dataset.col);
      renderCell(row, col);
    });
  }

  function renderCell(row, col) {
    const cell = elements.cells.querySelector(
      `[data-row="${row}"][data-col="${col}"]`,
    );
    if (!cell) return;

    const data = getCellData(row, col);
    let displayValue = "";

    if (data) {
      if (data.formula) {
        displayValue = evaluateFormula(data.formula, row, col);
      } else if (data.value !== undefined) {
        displayValue = data.value;
      }
      applyFormatToCell(cell, data.style);
    } else {
      cell.style.cssText = "";
    }

    cell.textContent = displayValue;
  }

  function applyFormatToCell(cell, style) {
    if (!style) return;
    if (style.fontFamily) cell.style.fontFamily = style.fontFamily;
    if (style.fontSize) cell.style.fontSize = style.fontSize + "px";
    if (style.fontWeight) cell.style.fontWeight = style.fontWeight;
    if (style.fontStyle) cell.style.fontStyle = style.fontStyle;
    if (style.textDecoration) cell.style.textDecoration = style.textDecoration;
    if (style.color) cell.style.color = style.color;
    if (style.background) cell.style.backgroundColor = style.background;
    if (style.textAlign) cell.style.textAlign = style.textAlign;
  }

  function getColName(col) {
    let name = "";
    col++;
    while (col > 0) {
      col--;
      name = String.fromCharCode(65 + (col % 26)) + name;
      col = Math.floor(col / 26);
    }
    return name;
  }

  function parseColName(name) {
    let col = 0;
    for (let i = 0; i < name.length; i++) {
      col = col * 26 + (name.charCodeAt(i) - 64);
    }
    return col - 1;
  }

  function getCellRef(row, col) {
    return getColName(col) + (row + 1);
  }

  function parseCellRef(ref) {
    const match = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return null;
    return {
      row: parseInt(match[2]) - 1,
      col: parseColName(match[1].toUpperCase()),
    };
  }

  function bindEvents() {
    elements.cells.addEventListener("mousedown", handleCellMouseDown);
    elements.cells.addEventListener("dblclick", handleCellDoubleClick);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("contextmenu", handleContextMenu);

    elements.columnHeaders.addEventListener("click", handleColumnHeaderClick);
    elements.rowHeaders.addEventListener("click", handleRowHeaderClick);

    elements.formulaInput.addEventListener("keydown", handleFormulaKey);
    elements.formulaInput.addEventListener("input", updateFormulaPreview);

    document.getElementById("undoBtn")?.addEventListener("click", undo);
    document.getElementById("redoBtn")?.addEventListener("click", redo);
    document
      .getElementById("boldBtn")
      ?.addEventListener("click", () => formatCells("bold"));
    document
      .getElementById("italicBtn")
      ?.addEventListener("click", () => formatCells("italic"));
    document
      .getElementById("underlineBtn")
      ?.addEventListener("click", () => formatCells("underline"));
    document
      .getElementById("strikeBtn")
      ?.addEventListener("click", () => formatCells("strikethrough"));
    document
      .getElementById("alignLeftBtn")
      ?.addEventListener("click", () => formatCells("alignLeft"));
    document
      .getElementById("alignCenterBtn")
      ?.addEventListener("click", () => formatCells("alignCenter"));
    document
      .getElementById("alignRightBtn")
      ?.addEventListener("click", () => formatCells("alignRight"));
    document
      .getElementById("mergeCellsBtn")
      ?.addEventListener("click", mergeCells);
    document
      .getElementById("formatCurrencyBtn")
      ?.addEventListener("click", () => formatCells("currency"));
    document
      .getElementById("formatPercentBtn")
      ?.addEventListener("click", () => formatCells("percent"));

    document
      .getElementById("textColorInput")
      ?.addEventListener("input", (e) => {
        formatCells("color", e.target.value);
        document.getElementById("textColorIndicator").style.background =
          e.target.value;
      });
    document.getElementById("bgColorInput")?.addEventListener("input", (e) => {
      formatCells("backgroundColor", e.target.value);
      document.getElementById("bgColorIndicator").style.background =
        e.target.value;
    });

    document
      .getElementById("fontFamily")
      ?.addEventListener("change", (e) =>
        formatCells("fontFamily", e.target.value),
      );
    document
      .getElementById("fontSize")
      ?.addEventListener("change", (e) =>
        formatCells("fontSize", e.target.value),
      );

    document
      .getElementById("shareBtn")
      ?.addEventListener("click", showShareModal);
    document
      .getElementById("closeShareModal")
      ?.addEventListener("click", () => hideModal("shareModal"));
    document
      .getElementById("closeChartModal")
      ?.addEventListener("click", () => hideModal("chartModal"));
    document
      .getElementById("copyLinkBtn")
      ?.addEventListener("click", copyShareLink);

    document
      .getElementById("addSheetBtn")
      ?.addEventListener("click", addWorksheet);
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

    document.querySelectorAll(".context-item").forEach((item) => {
      item.addEventListener("click", () =>
        handleContextAction(item.dataset.action),
      );
    });

    elements.sheetName?.addEventListener("change", (e) => {
      state.sheetName = e.target.value;
      scheduleAutoSave();
    });

    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  function handleCellMouseDown(e) {
    const cell = e.target.closest(".cell");
    if (!cell) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (state.isEditing) {
      finishEditing();
    }

    if (e.shiftKey) {
      extendSelection(row, col);
    } else {
      selectCell(row, col);
      state.isSelecting = true;
    }
  }

  function handleMouseMove(e) {
    if (!state.isSelecting) return;

    const cell = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest(".cell");
    if (cell) {
      const row = parseInt(cell.dataset.row);
      const col = parseInt(cell.dataset.col);
      extendSelection(row, col);
    }
  }

  function handleMouseUp() {
    state.isSelecting = false;
  }

  function handleCellDoubleClick(e) {
    const cell = e.target.closest(".cell");
    if (!cell) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    startEditing(row, col);
  }

  function selectCell(row, col) {
    clearSelection();

    state.activeCell = { row, col };
    state.selection = {
      start: { row, col },
      end: { row, col },
    };

    const cell = elements.cells.querySelector(
      `[data-row="${row}"][data-col="${col}"]`,
    );
    if (cell) {
      cell.classList.add("selected");
      cell.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    updateCellAddress();
    updateFormulaBar();
    updateSelectionInfo();
  }

  function extendSelection(row, col) {
    clearSelection();

    const start = state.activeCell;
    state.selection = {
      start: {
        row: Math.min(start.row, row),
        col: Math.min(start.col, col),
      },
      end: {
        row: Math.max(start.row, row),
        col: Math.max(start.col, col),
      },
    };

    for (let r = state.selection.start.row; r <= state.selection.end.row; r++) {
      for (
        let c = state.selection.start.col;
        c <= state.selection.end.col;
        c++
      ) {
        const cell = elements.cells.querySelector(
          `[data-row="${r}"][data-col="${c}"]`,
        );
        if (cell) {
          if (r === state.activeCell.row && c === state.activeCell.col) {
            cell.classList.add("selected");
          } else {
            cell.classList.add("in-range");
          }
        }
      }
    }

    updateSelectionInfo();
    updateCalculationResult();
  }

  function clearSelection() {
    elements.cells
      .querySelectorAll(".cell.selected, .cell.in-range")
      .forEach((cell) => {
        cell.classList.remove("selected", "in-range");
      });
  }

  function handleColumnHeaderClick(e) {
    const header = e.target.closest(".column-header");
    if (!header) return;

    const col = parseInt(header.dataset.col);
    clearSelection();

    state.activeCell = { row: 0, col };
    state.selection = {
      start: { row: 0, col },
      end: { row: CONFIG.ROWS - 1, col },
    };

    for (let row = 0; row < CONFIG.ROWS; row++) {
      const cell = elements.cells.querySelector(
        `[data-row="${row}"][data-col="${col}"]`,
      );
      if (cell) cell.classList.add("in-range");
    }

    header.classList.add("selected");
    updateSelectionInfo();
  }

  function handleRowHeaderClick(e) {
    const header = e.target.closest(".row-header");
    if (!header) return;

    const row = parseInt(header.dataset.row);
    clearSelection();

    state.activeCell = { row, col: 0 };
    state.selection = {
      start: { row, col: 0 },
      end: { row, col: CONFIG.COLS - 1 },
    };

    for (let col = 0; col < CONFIG.COLS; col++) {
      const cell = elements.cells.querySelector(
        `[data-row="${row}"][data-col="${col}"]`,
      );
      if (cell) cell.classList.add("in-range");
    }

    header.classList.add("selected");
    updateSelectionInfo();
  }

  function startEditing(row, col) {
    const cell = elements.cells.querySelector(
      `[data-row="${row}"][data-col="${col}"]`,
    );
    if (!cell) return;

    state.isEditing = true;
    const data = getCellData(row, col);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "cell-input";
    input.value = data?.formula || data?.value || "";
    cell.textContent = "";
    cell.classList.add("editing");
    cell.appendChild(input);
    input.focus();
    input.select();

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        finishEditing(true);
        navigateCell(1, 0);
      } else if (e.key === "Tab") {
        e.preventDefault();
        finishEditing(true);
        navigateCell(0, e.shiftKey ? -1 : 1);
      } else if (e.key === "Escape") {
        cancelEditing();
      }
    });

    input.addEventListener("blur", () => {
      if (state.isEditing) finishEditing(true);
    });
  }

  function finishEditing(save = true) {
    if (!state.isEditing) return;

    const { row, col } = state.activeCell;
    const cell = elements.cells.querySelector(
      `[data-row="${row}"][data-col="${col}"]`,
    );
    const input = cell?.querySelector(".cell-input");

    if (input && save) {
      const value = input.value.trim();
      setCellValue(row, col, value);
    }

    state.isEditing = false;
    cell?.classList.remove("editing");
    renderCell(row, col);
    updateFormulaBar();
  }

  function cancelEditing() {
    state.isEditing = false;
    const { row, col } = state.activeCell;
    const cell = elements.cells.querySelector(
      `[data-row="${row}"][data-col="${col}"]`,
    );
    cell?.classList.remove("editing");
    renderCell(row, col);
  }

  function setCellValue(row, col, value) {
    const ws = state.worksheets[state.activeWorksheet];
    const key = `${row},${col}`;

    saveToHistory();

    if (!value) {
      delete ws.data[key];
    } else if (value.startsWith("=")) {
      ws.data[key] = { formula: value };
    } else {
      ws.data[key] = { value };
    }

    state.isDirty = true;
    scheduleAutoSave();
    broadcastChange("cell", { row, col, value });
  }

  function getCellData(row, col) {
    const ws = state.worksheets[state.activeWorksheet];
    return ws?.data[`${row},${col}`];
  }

  function getCellValue(row, col) {
    const data = getCellData(row, col);
    if (!data) return "";
    if (data.formula) return evaluateFormula(data.formula, row, col);
    return data.value || "";
  }

  function evaluateFormula(formula, sourceRow, sourceCol) {
    if (!formula.startsWith("=")) return formula;

    try {
      let expr = formula.substring(1).toUpperCase();

      expr = expr.replace(/([A-Z]+)(\d+)/g, (match, col, row) => {
        const r = parseInt(row) - 1;
        const c = parseColName(col);
        const val = getCellValue(r, c);
        const num = parseFloat(val);
        return isNaN(num) ? `"${val}"` : num;
      });

      if (expr.startsWith("SUM(")) {
        return evaluateSum(expr);
      } else if (expr.startsWith("AVERAGE(")) {
        return evaluateAverage(expr);
      } else if (expr.startsWith("COUNT(")) {
        return evaluateCount(expr);
      } else if (expr.startsWith("MAX(")) {
        return evaluateMax(expr);
      } else if (expr.startsWith("MIN(")) {
        return evaluateMin(expr);
      } else if (expr.startsWith("IF(")) {
        return evaluateIf(expr);
      }

      const result = new Function("return " + expr)();
      return typeof result === "number"
        ? Math.round(result * 1000000) / 1000000
        : result;
    } catch (e) {
      return "#ERROR";
    }
  }

  function evaluateSum(expr) {
    const match = expr.match(/SUM\(([^)]+)\)/i);
    if (!match) return "#ERROR";
    const values = parseRange(match[1]);
    return values.reduce((a, b) => a + b, 0);
  }

  function evaluateAverage(expr) {
    const match = expr.match(/AVERAGE\(([^)]+)\)/i);
    if (!match) return "#ERROR";
    const values = parseRange(match[1]);
    return values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }

  function evaluateCount(expr) {
    const match = expr.match(/COUNT\(([^)]+)\)/i);
    if (!match) return "#ERROR";
    const values = parseRange(match[1]);
    return values.length;
  }

  function evaluateMax(expr) {
    const match = expr.match(/MAX\(([^)]+)\)/i);
    if (!match) return "#ERROR";
    const values = parseRange(match[1]);
    return values.length ? Math.max(...values) : 0;
  }

  function evaluateMin(expr) {
    const match = expr.match(/MIN\(([^)]+)\)/i);
    if (!match) return "#ERROR";
    const values = parseRange(match[1]);
    return values.length ? Math.min(...values) : 0;
  }

  function evaluateIf(expr) {
    const match = expr.match(/IF\(([^,]+),([^,]+),([^)]+)\)/i);
    if (!match) return "#ERROR";
    try {
      const condition = new Function("return " + match[1])();
      return condition
        ? new Function("return " + match[2])()
        : new Function("return " + match[3])();
    } catch {
      return "#ERROR";
    }
  }

  function parseRange(rangeStr) {
    const values = [];
    const parts = rangeStr.split(":");

    if (parts.length === 2) {
      const start = parseCellRef(parts[0].trim());
      const end = parseCellRef(parts[1].trim());
      if (start && end) {
        for (let r = start.row; r <= end.row; r++) {
          for (let c = start.col; c <= end.col; c++) {
            const val = parseFloat(getCellValue(r, c));
            if (!isNaN(val)) values.push(val);
          }
        }
      }
    } else {
      const ref = parseCellRef(parts[0].trim());
      if (ref) {
        const val = parseFloat(getCellValue(ref.row, ref.col));
        if (!isNaN(val)) values.push(val);
      }
    }

    return values;
  }

  function handleKeyDown(e) {
    if (e.target.closest(".chat-input, .modal input, .sheet-name-input"))
      return;

    const { row, col } = state.activeCell;

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "c":
          copySelection();
          return;
        case "x":
          cutSelection();
          return;
        case "v":
          pasteSelection();
          return;
        case "z":
          e.shiftKey ? redo() : undo();
          e.preventDefault();
          return;
        case "y":
          redo();
          e.preventDefault();
          return;
        case "b":
          formatCells("bold");
          e.preventDefault();
          return;
        case "i":
          formatCells("italic");
          e.preventDefault();
          return;
        case "u":
          formatCells("underline");
          e.preventDefault();
          return;
        case "a":
          selectAll();
          e.preventDefault();
          return;
      }
    }

    if (state.isEditing) return;

    switch (e.key) {
      case "ArrowUp":
        navigateCell(-1, 0);
        e.preventDefault();
        break;
      case "ArrowDown":
        navigateCell(1, 0);
        e.preventDefault();
        break;
      case "ArrowLeft":
        navigateCell(0, -1);
        e.preventDefault();
        break;
      case "ArrowRight":
        navigateCell(0, 1);
        e.preventDefault();
        break;
      case "Tab":
        navigateCell(0, e.shiftKey ? -1 : 1);
        e.preventDefault();
        break;
      case "Enter":
        if (e.shiftKey) {
          navigateCell(-1, 0);
        } else {
          startEditing(row, col);
        }
        e.preventDefault();
        break;
      case "Delete":
      case "Backspace":
        clearCells();
        e.preventDefault();
        break;
      case "F2":
        startEditing(row, col);
        e.preventDefault();
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          startEditing(row, col);
          const cell = elements.cells.querySelector(
            `[data-row="${row}"][data-col="${col}"]`,
          );
          const input = cell?.querySelector(".cell-input");
          if (input) input.value = e.key;
        }
    }
  }

  function navigateCell(dRow, dCol) {
    const newRow = Math.max(
      0,
      Math.min(CONFIG.ROWS - 1, state.activeCell.row + dRow),
    );
    const newCol = Math.max(
      0,
      Math.min(CONFIG.COLS - 1, state.activeCell.col + dCol),
    );
    selectCell(newRow, newCol);
  }

  function selectAll() {
    clearSelection();
    state.selection = {
      start: { row: 0, col: 0 },
      end: { row: CONFIG.ROWS - 1, col: CONFIG.COLS - 1 },
    };

    elements.cells.querySelectorAll(".cell").forEach((cell) => {
      cell.classList.add("in-range");
    });

    const activeCell = elements.cells.querySelector(
      `[data-row="${state.activeCell.row}"][data-col="${state.activeCell.col}"]`,
    );
    if (activeCell) {
      activeCell.classList.remove("in-range");
      activeCell.classList.add("selected");
    }

    updateSelectionInfo();
  }

  function handleFormulaKey(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = elements.formulaInput.value;
      const { row, col } = state.activeCell;
      setCellValue(row, col, value);
      renderCell(row, col);
      elements.formulaInput.blur();
    } else if (e.key === "Escape") {
      updateFormulaBar();
      elements.formulaInput.blur();
    }
  }

  function updateFormulaPreview() {
    const value = elements.formulaInput.value;
    if (value.startsWith("=")) {
      const result = evaluateFormula(
        value,
        state.activeCell.row,
        state.activeCell.col,
      );
      elements.calculationResult.textContent = `= ${result}`;
    } else {
      elements.calculationResult.textContent = "";
    }
  }

  function updateCellAddress() {
    const ref = getCellRef(state.activeCell.row, state.activeCell.col);
    elements.cellAddress.textContent = ref;
  }

  function updateFormulaBar() {
    const data = getCellData(state.activeCell.row, state.activeCell.col);
    elements.formulaInput.value = data?.formula || data?.value || "";
  }

  function updateSelectionInfo() {
    const { start, end } = state.selection;
    const rows = end.row - start.row + 1;
    const cols = end.col - start.col + 1;
    const count = rows * cols;

    if (count === 1) {
      elements.selectionInfo.textContent = "Ready";
    } else {
      elements.selectionInfo.textContent = `${rows}R × ${cols}C = ${count} cells`;
    }
  }

  function updateCalculationResult() {
    const { start, end } = state.selection;
    const values = [];

    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const val = parseFloat(getCellValue(r, c));
        if (!isNaN(val)) values.push(val);
      }
    }

    if (values.length > 1) {
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      elements.calculationResult.textContent = `Sum: ${sum.toFixed(2)} | Avg: ${avg.toFixed(2)} | Count: ${values.length}`;
    } else {
      elements.calculationResult.textContent = "";
    }
  }

  function copySelection() {
    state.clipboard = getSelectionData();
    state.clipboardMode = "copy";
    showCopyBox();
  }

  function cutSelection() {
    state.clipboard = getSelectionData();
    state.clipboardMode = "cut";
    showCopyBox();
  }

  function pasteSelection() {
    if (!state.clipboard) return;

    saveToHistory();
    const { row, col } = state.activeCell;
    const ws = state.worksheets[state.activeWorksheet];

    state.clipboard.forEach((rowData, rOffset) => {
      rowData.forEach((cellData, cOffset) => {
        const targetRow = row + rOffset;
        const targetCol = col + cOffset;
        const key = `${targetRow},${targetCol}`;

        if (cellData) {
          ws.data[key] = { ...cellData };
        }

        renderCell(targetRow, targetCol);
      });
    });

    if (state.clipboardMode === "cut") {
      clearSourceCells();
      state.clipboardMode = null;
    }

    hideCopyBox();
    state.isDirty = true;
    scheduleAutoSave();
  }

  function getSelectionData() {
    const { start, end } = state.selection;
    const data = [];

    for (let r = start.row; r <= end.row; r++) {
      const rowData = [];
      for (let c = start.col; c <= end.col; c++) {
        rowData.push(getCellData(r, c) || null);
      }
      data.push(rowData);
    }

    return data;
  }

  function clearSourceCells() {
    const { start, end } = state.selection;
    const ws = state.worksheets[state.activeWorksheet];

    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        delete ws.data[`${r},${c}`];
        renderCell(r, c);
      }
    }
  }

  function clearCells() {
    saveToHistory();
    const { start, end } = state.selection;
    const ws = state.worksheets[state.activeWorksheet];

    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        delete ws.data[`${r},${c}`];
        renderCell(r, c);
      }
    }

    state.isDirty = true;
    scheduleAutoSave();
  }

  function showCopyBox() {
    const copyBox = document.getElementById("copyBox");
    if (copyBox) copyBox.classList.remove("hidden");
  }

  function hideCopyBox() {
    const copyBox = document.getElementById("copyBox");
    if (copyBox) copyBox.classList.add("hidden");
  }

  function formatCells(format, value) {
    saveToHistory();
    const { start, end } = state.selection;
    const ws = state.worksheets[state.activeWorksheet];

    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const key = `${r},${c}`;
        if (!ws.data[key]) ws.data[key] = { value: "" };
        if (!ws.data[key].style) ws.data[key].style = {};

        const style = ws.data[key].style;

        switch (format) {
          case "bold":
            style.fontWeight = style.fontWeight === "bold" ? "normal" : "bold";
            break;
          case "italic":
            style.fontStyle =
              style.fontStyle === "italic" ? "normal" : "italic";
            break;
          case "underline":
            style.textDecoration =
              style.textDecoration === "underline" ? "none" : "underline";
            break;
          case "strikethrough":
            style.textDecoration =
              style.textDecoration === "line-through" ? "none" : "line-through";
            break;
          case "alignLeft":
            style.textAlign = "left";
            break;
          case "alignCenter":
            style.textAlign = "center";
            break;
          case "alignRight":
            style.textAlign = "right";
            break;
          case "fontFamily":
            style.fontFamily = value;
            break;
          case "fontSize":
            style.fontSize = value;
            break;
          case "color":
            style.color = value;
            break;
          case "backgroundColor":
            style.background = value;
            break;
          case "currency":
            if (ws.data[key].value) {
              const num = parseFloat(ws.data[key].value);
              if (!isNaN(num)) ws.data[key].value = "$" + num.toFixed(2);
            }
            break;
          case "percent":
            if (ws.data[key].value) {
              const num = parseFloat(ws.data[key].value);
              if (!isNaN(num))
                ws.data[key].value = (num * 100).toFixed(0) + "%";
            }
            break;
        }

        renderCell(r, c);
      }
    }

    state.isDirty = true;
    scheduleAutoSave();
  }

  function mergeCells() {
    addChatMessage("assistant", "Merge cells feature coming soon!");
  }

  function saveToHistory() {
    const snapshot = JSON.stringify(state.worksheets);
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    if (state.history.length > CONFIG.MAX_HISTORY) state.history.shift();
    state.historyIndex = state.history.length - 1;
  }

  function undo() {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      state.worksheets = JSON.parse(state.history[state.historyIndex]);
      renderAllCells();
      state.isDirty = true;
    }
  }

  function redo() {
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++;
      state.worksheets = JSON.parse(state.history[state.historyIndex]);
      renderAllCells();
      state.isDirty = true;
    }
  }

  function handleContextMenu(e) {
    const cell = e.target.closest(".cell");
    if (!cell) return;

    e.preventDefault();
    elements.contextMenu.style.left = e.clientX + "px";
    elements.contextMenu.style.top = e.clientY + "px";
    elements.contextMenu.classList.remove("hidden");
  }

  function handleDocumentClick(e) {
    if (!e.target.closest(".context-menu")) {
      elements.contextMenu?.classList.add("hidden");
    }
  }

  function handleContextAction(action) {
    elements.contextMenu.classList.add("hidden");

    switch (action) {
      case "cut":
        cutSelection();
        break;
      case "copy":
        copySelection();
        break;
      case "paste":
        pasteSelection();
        break;
      case "insertRowAbove":
        insertRow(state.activeCell.row);
        break;
      case "insertRowBelow":
        insertRow(state.activeCell.row + 1);
        break;
      case "insertColLeft":
        insertColumn(state.activeCell.col);
        break;
      case "insertColRight":
        insertColumn(state.activeCell.col + 1);
        break;
      case "deleteRow":
        deleteRow(state.activeCell.row);
        break;
      case "deleteCol":
        deleteColumn(state.activeCell.col);
        break;
      case "clearContents":
        clearCells();
        break;
      case "clearFormatting":
        clearFormatting();
        break;
    }
  }

  function insertRow(atRow) {
    saveToHistory();
    const ws = state.worksheets[state.activeWorksheet];
    const newData = {};

    for (const key in ws.data) {
      const [r, c] = key.split(",").map(Number);
      if (r >= atRow) {
        newData[`${r + 1},${c}`] = ws.data[key];
      } else {
        newData[key] = ws.data[key];
      }
    }

    ws.data = newData;
    renderAllCells();
    state.isDirty = true;
    scheduleAutoSave();
  }

  function insertColumn(atCol) {
    saveToHistory();
    const ws = state.worksheets[state.activeWorksheet];
    const newData = {};

    for (const key in ws.data) {
      const [r, c] = key.split(",").map(Number);
      if (c >= atCol) {
        newData[`${r},${c + 1}`] = ws.data[key];
      } else {
        newData[key] = ws.data[key];
      }
    }

    ws.data = newData;
    renderAllCells();
    state.isDirty = true;
    scheduleAutoSave();
  }

  function deleteRow(row) {
    saveToHistory();
    const ws = state.worksheets[state.activeWorksheet];
    const newData = {};

    for (const key in ws.data) {
      const [r, c] = key.split(",").map(Number);
      if (r < row) {
        newData[key] = ws.data[key];
      } else if (r > row) {
        newData[`${r - 1},${c}`] = ws.data[key];
      }
    }

    ws.data = newData;
    renderAllCells();
    state.isDirty = true;
    scheduleAutoSave();
  }

  function deleteColumn(col) {
    saveToHistory();
    const ws = state.worksheets[state.activeWorksheet];
    const newData = {};

    for (const key in ws.data) {
      const [r, c] = key.split(",").map(Number);
      if (c < col) {
        newData[key] = ws.data[key];
      } else if (c > col) {
        newData[`${r},${c - 1}`] = ws.data[key];
      }
    }

    ws.data = newData;
    renderAllCells();
    state.isDirty = true;
    scheduleAutoSave();
  }

  function clearFormatting() {
    const { start, end } = state.selection;
    const ws = state.worksheets[state.activeWorksheet];

    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const key = `${r},${c}`;
        if (ws.data[key]) {
          delete ws.data[key].style;
          renderCell(r, c);
        }
      }
    }

    state.isDirty = true;
    scheduleAutoSave();
  }

  function addWorksheet() {
    const num = state.worksheets.length + 1;
    state.worksheets.push({ name: `Sheet${num}`, data: {} });
    state.activeWorksheet = state.worksheets.length - 1;
    renderWorksheetTabs();
    renderAllCells();
    selectCell(0, 0);
    state.isDirty = true;
    scheduleAutoSave();
  }

  function switchWorksheet(index) {
    if (index < 0 || index >= state.worksheets.length) return;
    state.activeWorksheet = index;
    renderWorksheetTabs();
    renderAllCells();
    selectCell(0, 0);
  }

  function renderWorksheetTabs() {
    elements.worksheetTabs.innerHTML = state.worksheets
      .map(
        (ws, i) => `
                <div class="sheet-tab ${i === state.activeWorksheet ? "active" : ""}" data-index="${i}">
                    <span>${escapeHtml(ws.name)}</span>
                    <button class="tab-menu-btn">▼</button>
                </div>
            `,
      )
      .join("");

    elements.worksheetTabs.querySelectorAll(".sheet-tab").forEach((tab) => {
      tab.addEventListener("click", () =>
        switchWorksheet(parseInt(tab.dataset.index)),
      );
    });
  }

  function zoomIn() {
    state.zoom = Math.min(200, state.zoom + 10);
    applyZoom();
  }

  function zoomOut() {
    state.zoom = Math.max(50, state.zoom - 10);
    applyZoom();
  }

  function applyZoom() {
    const scale = state.zoom / 100;
    elements.cells.style.transform = `scale(${scale})`;
    elements.cells.style.transformOrigin = "top left";
    elements.zoomLevel.textContent = state.zoom + "%";
  }

  function showModal(id) {
    document.getElementById(id)?.classList.remove("hidden");
  }

  function hideModal(id) {
    document.getElementById(id)?.classList.add("hidden");
  }

  function showShareModal() {
    const link = document.getElementById("shareLink");
    if (link) link.value = window.location.href;
    showModal("shareModal");
  }

  function copyShareLink() {
    const input = document.getElementById("shareLink");
    if (input) {
      navigator.clipboard.writeText(input.value);
    }
  }

  function scheduleAutoSave() {
    if (state.autoSaveTimer) clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = setTimeout(() => {
      if (state.isDirty) saveSheet();
    }, CONFIG.AUTOSAVE_DELAY);
  }

  async function saveSheet() {
    elements.saveStatus.textContent = "Saving...";

    try {
      const response = await fetch("/api/sheet/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: state.sheetId,
          name: state.sheetName,
          worksheets: state.worksheets,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.id) {
          state.sheetId = result.id;
          window.history.replaceState({}, "", `#id=${state.sheetId}`);
        }
        state.isDirty = false;
        elements.saveStatus.textContent = "Saved";
      } else {
        elements.saveStatus.textContent = "Save failed";
      }
    } catch (e) {
      elements.saveStatus.textContent = "Save failed";
    }
  }

  async function loadFromUrlParams() {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.substring(1));
    const sheetId = params.get("id");

    if (sheetId) {
      try {
        const response = await fetch(`/api/sheet/${sheetId}`);
        if (response.ok) {
          const data = await response.json();
          state.sheetId = sheetId;
          state.sheetName = data.name || "Untitled Spreadsheet";
          state.worksheets = data.worksheets || [{ name: "Sheet1", data: {} }];

          if (elements.sheetName) elements.sheetName.value = state.sheetName;

          renderWorksheetTabs();
          renderAllCells();
        }
      } catch (e) {
        console.error("Load failed:", e);
      }
    }
  }

  function handleBeforeUnload(e) {
    if (state.isDirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  }

  function connectWebSocket() {
    if (!state.sheetId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/sheet/ws/${state.sheetId}`;

    try {
      state.ws = new WebSocket(wsUrl);

      state.ws.onopen = () => {
        state.ws.send(
          JSON.stringify({
            type: "join",
            sheetId: state.sheetId,
            userId: getUserId(),
            userName: getUserName(),
          }),
        );
      };

      state.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handleWebSocketMessage(msg);
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
      case "cellChange":
        if (msg.userId !== getUserId()) {
          const ws = state.worksheets[state.activeWorksheet];
          const key = `${msg.row},${msg.col}`;
          if (msg.value) {
            ws.data[key] = { value: msg.value };
          } else {
            delete ws.data[key];
          }
          renderCell(msg.row, msg.col);
        }
        break;
      case "cursor":
        updateRemoteCursor(msg);
        break;
      case "userJoined":
        addCollaborator(msg.user);
        break;
      case "userLeft":
        removeCollaborator(msg.userId);
        break;
    }
  }

  function broadcastChange(type, data) {
    if (state.ws?.readyState === WebSocket.OPEN) {
      state.ws.send(
        JSON.stringify({
          type,
          sheetId: state.sheetId,
          userId: getUserId(),
          ...data,
        }),
      );
    }
  }

  function updateRemoteCursor(msg) {
    let cursor = document.getElementById(`cursor-${msg.userId}`);
    if (!cursor) {
      cursor = document.createElement("div");
      cursor.id = `cursor-${msg.userId}`;
      cursor.className = "cursor-indicator";
      cursor.style.borderColor = msg.color || "#4285f4";
      cursor.innerHTML = `<div class="cursor-label" style="background:${msg.color || "#4285f4"}">${escapeHtml(msg.userName)}</div>`;
      elements.cursorIndicators?.appendChild(cursor);
    }

    const cell = elements.cells.querySelector(
      `[data-row="${msg.row}"][data-col="${msg.col}"]`,
    );
    if (cell) {
      const rect = cell.getBoundingClientRect();
      const container = elements.cellsContainer.getBoundingClientRect();
      cursor.style.left = rect.left - container.left + "px";
      cursor.style.top = rect.top - container.top + "px";
      cursor.style.width = rect.width + "px";
      cursor.style.height = rect.height + "px";
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
    document.getElementById(`cursor-${userId}`)?.remove();
    renderCollaborators();
  }

  function renderCollaborators() {
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

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function toggleChatPanel() {
    state.chatPanelOpen = !state.chatPanelOpen;
    elements.chatPanel.classList.toggle("collapsed", !state.chatPanelOpen);
  }

  function handleChatSubmit(e) {
    e.preventDefault();
    const message = elements.chatInput.value.trim();
    if (!message) return;

    addChatMessage("user", message);
    elements.chatInput.value = "";

    processAICommand(message);
  }

  function handleSuggestionClick(action) {
    const commands = {
      sum: "Sum column B",
      format: "Format selected cells as currency",
      chart: "Create a bar chart from selected data",
      sort: "Sort selected column A to Z",
    };

    const message = commands[action] || action;
    addChatMessage("user", message);
    processAICommand(message);
  }

  function addChatMessage(role, content) {
    const div = document.createElement("div");
    div.className = `chat-message ${role}`;
    div.innerHTML = `<div class="message-bubble">${escapeHtml(content)}</div>`;
    elements.chatMessages.appendChild(div);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }

  async function processAICommand(command) {
    const lower = command.toLowerCase();
    let response = "";

    if (lower.includes("sum")) {
      const { start, end } = state.selection;
      const colLetter = getColName(start.col);
      const formula = `=SUM(${colLetter}${start.row + 1}:${colLetter}${end.row + 1})`;

      const resultRow = end.row + 1;
      if (resultRow < CONFIG.ROWS) {
        setCellValue(resultRow, start.col, formula);
        renderCell(resultRow, start.col);
        selectCell(resultRow, start.col);
        response = `Done! Added SUM formula in cell ${getColName(start.col)}${resultRow + 1}`;
      } else {
        response = "Cannot add sum - no row available below selection";
      }
    } else if (lower.includes("currency") || lower.includes("$")) {
      formatCells("currency");
      response = "Formatted selected cells as currency";
    } else if (lower.includes("percent") || lower.includes("%")) {
      formatCells("percent");
      response = "Formatted selected cells as percentage";
    } else if (lower.includes("bold")) {
      formatCells("bold");
      response = "Applied bold formatting to selected cells";
    } else if (lower.includes("italic")) {
      formatCells("italic");
      response = "Applied italic formatting to selected cells";
    } else if (lower.includes("sort") && lower.includes("z")) {
      sortDescending();
      response = "Sorted selection Z to A";
    } else if (lower.includes("sort")) {
      sortAscending();
      response = "Sorted selection A to Z";
    } else if (lower.includes("chart")) {
      showModal("chartModal");
      response =
        "Opening chart dialog. Select chart type and configure options.";
    } else if (lower.includes("clear")) {
      clearCells();
      response = "Cleared selected cells";
    } else if (lower.includes("average") || lower.includes("avg")) {
      const { start, end } = state.selection;
      const colLetter = getColName(start.col);
      const formula = `=AVERAGE(${colLetter}${start.row + 1}:${colLetter}${end.row + 1})`;
      const resultRow = end.row + 1;
      if (resultRow < CONFIG.ROWS) {
        setCellValue(resultRow, start.col, formula);
        renderCell(resultRow, start.col);
        selectCell(resultRow, start.col);
        response = `Done! Added AVERAGE formula in cell ${getColName(start.col)}${resultRow + 1}`;
      }
    } else {
      try {
        const res = await fetch("/api/sheet/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command,
            selection: state.selection,
            activeCell: state.activeCell,
            sheetId: state.sheetId,
          }),
        });
        const data = await res.json();
        response = data.response || "I processed your request";
      } catch {
        response =
          "I can help you with:\n• Sum/Average a column\n• Format as currency or percent\n• Bold/Italic formatting\n• Sort data\n• Create charts\n• Clear cells";
      }
    }

    addChatMessage("assistant", response);
  }

  function sortAscending() {
    sortSelection(true);
  }

  function sortDescending() {
    sortSelection(false);
  }

  function sortSelection(ascending) {
    saveToHistory();
    const { start, end } = state.selection;
    const ws = state.worksheets[state.activeWorksheet];

    const rows = [];
    for (let r = start.row; r <= end.row; r++) {
      const rowData = [];
      for (let c = start.col; c <= end.col; c++) {
        rowData.push(getCellData(r, c));
      }
      rows.push({ row: r, data: rowData });
    }

    rows.sort((a, b) => {
      const valA = a.data[0]?.value || a.data[0]?.formula || "";
      const valB = b.data[0]?.value || b.data[0]?.formula || "";
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return ascending ? numA - numB : numB - numA;
      }
      return ascending
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    rows.forEach((rowObj, i) => {
      const targetRow = start.row + i;
      rowObj.data.forEach((cellData, j) => {
        const targetCol = start.col + j;
        const key = `${targetRow},${targetCol}`;
        if (cellData) {
          ws.data[key] = cellData;
        } else {
          delete ws.data[key];
        }
      });
    });

    renderAllCells();
    state.isDirty = true;
    scheduleAutoSave();
  }

  function connectChatWebSocket() {
    // Chat uses main WebSocket connection
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
