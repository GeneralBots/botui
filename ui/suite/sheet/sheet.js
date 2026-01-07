/* =============================================================================
   GB SHEET - Excel-like Spreadsheet JavaScript
   General Bots Suite Component
   ============================================================================= */

(function () {
  "use strict";

  // =============================================================================
  // CONFIGURATION
  // =============================================================================

  const CONFIG = {
    COLS: 26,
    ROWS: 100,
    COL_WIDTH: 100,
    ROW_HEIGHT: 24,
    MAX_HISTORY: 50,
    AUTOSAVE_DELAY: 3000,
    WS_RECONNECT_DELAY: 5000,
  };

  // =============================================================================
  // STATE
  // =============================================================================

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
    zoom: 1,
    collaborators: [],
    ws: null,
    isEditing: false,
    isSelecting: false,
    selectionStart: null,
    isDirty: false,
    autoSaveTimer: null,
  };

  // =============================================================================
  // DOM ELEMENTS
  // =============================================================================

  const elements = {
    container: null,
    sidebar: null,
    sheetList: null,
    sheetName: null,
    columnHeaders: null,
    rowHeaders: null,
    cells: null,
    cellsContainer: null,
    formulaInput: null,
    cellAddress: null,
    formulaPreview: null,
    worksheetTabs: null,
    collaborators: null,
    contextMenu: null,
    tabContextMenu: null,
    shareModal: null,
    functionModal: null,
    chartModal: null,
    cursorIndicators: null,
  };

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  function init() {
    cacheElements();
    renderGrid();
    bindEvents();
    loadFromUrlParams();
    connectWebSocket();
    updateCellAddress();
    renderWorksheetTabs();
  }

  function cacheElements() {
    elements.container = document.querySelector(".sheet-container");
    elements.sidebar = document.getElementById("sheet-sidebar");
    elements.sheetList = document.getElementById("sheet-list");
    elements.sheetName = document.getElementById("sheet-name");
    elements.columnHeaders = document.getElementById("column-headers");
    elements.rowHeaders = document.getElementById("row-headers");
    elements.cells = document.getElementById("cells");
    elements.cellsContainer = document.getElementById("cells-container");
    elements.formulaInput = document.getElementById("formula-input");
    elements.cellAddress = document.getElementById("cell-address");
    elements.formulaPreview = document.getElementById("formula-preview");
    elements.worksheetTabs = document.getElementById("worksheet-tabs");
    elements.collaborators = document.getElementById("collaborators");
    elements.contextMenu = document.getElementById("context-menu");
    elements.tabContextMenu = document.getElementById("tab-context-menu");
    elements.shareModal = document.getElementById("share-modal");
    elements.functionModal = document.getElementById("function-modal");
    elements.chartModal = document.getElementById("chart-modal");
    elements.cursorIndicators = document.getElementById("cursor-indicators");
  }

  // =============================================================================
  // GRID RENDERING
  // =============================================================================

  function renderGrid() {
    if (!elements.columnHeaders || !elements.rowHeaders || !elements.cells)
      return;

    elements.columnHeaders.innerHTML = "";
    for (let c = 0; c < CONFIG.COLS; c++) {
      const header = document.createElement("div");
      header.className = "column-header";
      header.textContent = getColName(c);
      header.dataset.col = c;
      header.innerHTML += '<div class="column-resize"></div>';
      elements.columnHeaders.appendChild(header);
    }

    elements.rowHeaders.innerHTML = "";
    for (let r = 0; r < CONFIG.ROWS; r++) {
      const header = document.createElement("div");
      header.className = "row-header";
      header.textContent = r + 1;
      header.dataset.row = r;
      elements.rowHeaders.appendChild(header);
    }

    elements.cells.innerHTML = "";
    elements.cells.style.gridTemplateColumns = `repeat(${CONFIG.COLS}, ${CONFIG.COL_WIDTH}px)`;

    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.id = `cell-${r}-${c}`;
        elements.cells.appendChild(cell);
      }
    }

    selectCell(0, 0);
  }

  function renderAllCells() {
    const ws = state.worksheets[state.activeWorksheet];
    if (!ws) return;

    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        renderCell(r, c);
      }
    }
  }

  function renderCell(row, col) {
    const cell = document.getElementById(`cell-${row}-${col}`);
    if (!cell) return;

    const data = getCellData(row, col);
    if (data) {
      let displayValue = data.value || "";
      if (displayValue.startsWith("=")) {
        displayValue = evaluateFormula(displayValue, row, col);
      }
      cell.textContent = displayValue;

      if (data.format) {
        applyFormatToCell(cell, data.format);
      }
    } else {
      cell.textContent = "";
      cell.style.cssText = "";
    }
  }

  function applyFormatToCell(cell, format) {
    if (format.bold) cell.style.fontWeight = "bold";
    if (format.italic) cell.style.fontStyle = "italic";
    if (format.underline) cell.style.textDecoration = "underline";
    if (format.strikethrough) {
      cell.style.textDecoration = cell.style.textDecoration
        ? cell.style.textDecoration + " line-through"
        : "line-through";
    }
    if (format.fontFamily) cell.style.fontFamily = format.fontFamily;
    if (format.fontSize) cell.style.fontSize = format.fontSize + "px";
    if (format.color) cell.style.color = format.color;
    if (format.backgroundColor)
      cell.style.backgroundColor = format.backgroundColor;
    if (format.textAlign) cell.style.textAlign = format.textAlign;
  }

  // =============================================================================
  // COLUMN/ROW UTILITIES
  // =============================================================================

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

  // =============================================================================
  // EVENT BINDING
  // =============================================================================

  function bindEvents() {
    if (elements.cells) {
      elements.cells.addEventListener("mousedown", handleCellMouseDown);
      elements.cells.addEventListener("dblclick", handleCellDoubleClick);
      elements.cells.addEventListener("contextmenu", handleContextMenu);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", hideContextMenus);

    if (elements.formulaInput) {
      elements.formulaInput.addEventListener("keydown", handleFormulaKey);
      elements.formulaInput.addEventListener("input", updateFormulaPreview);
    }

    if (elements.columnHeaders) {
      elements.columnHeaders.addEventListener("click", handleColumnHeaderClick);
    }

    if (elements.rowHeaders) {
      elements.rowHeaders.addEventListener("click", handleRowHeaderClick);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  // =============================================================================
  // CELL SELECTION
  // =============================================================================

  function handleCellMouseDown(e) {
    const cell = e.target.closest(".cell");
    if (!cell) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (e.shiftKey) {
      extendSelection(row, col);
    } else {
      state.isSelecting = true;
      state.selectionStart = { row, col };
      selectCell(row, col);
    }
  }

  function handleMouseMove(e) {
    if (!state.isSelecting || !state.selectionStart) return;

    const cell = document.elementFromPoint(e.clientX, e.clientY);
    if (!cell || !cell.classList.contains("cell")) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    extendSelection(row, col);
  }

  function handleMouseUp() {
    state.isSelecting = false;
    state.selectionStart = null;
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

    const cell = document.getElementById(`cell-${row}-${col}`);
    if (cell) {
      cell.classList.add("selected");
    }

    updateCellAddress();
    updateFormulaBar();
    updateSelectionInfo();
  }

  function extendSelection(row, col) {
    if (!state.selectionStart) {
      state.selectionStart = { ...state.activeCell };
    }

    const start = state.selectionStart;
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

    clearSelection();

    for (let r = state.selection.start.row; r <= state.selection.end.row; r++) {
      for (
        let c = state.selection.start.col;
        c <= state.selection.end.col;
        c++
      ) {
        const cell = document.getElementById(`cell-${r}-${c}`);
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
    document
      .querySelectorAll(".cell.selected, .cell.in-range")
      .forEach((cell) => {
        cell.classList.remove("selected", "in-range");
      });
  }

  function handleColumnHeaderClick(e) {
    const header = e.target.closest(".column-header");
    if (!header) return;

    const col = parseInt(header.dataset.col);
    state.selection = {
      start: { row: 0, col },
      end: { row: CONFIG.ROWS - 1, col },
    };
    state.activeCell = { row: 0, col };

    clearSelection();
    for (let r = 0; r < CONFIG.ROWS; r++) {
      const cell = document.getElementById(`cell-${r}-${col}`);
      if (cell) {
        cell.classList.add(r === 0 ? "selected" : "in-range");
      }
    }

    header.classList.add("selected");
    updateCellAddress();
    updateCalculationResult();
  }

  function handleRowHeaderClick(e) {
    const header = e.target.closest(".row-header");
    if (!header) return;

    const row = parseInt(header.dataset.row);
    state.selection = {
      start: { row, col: 0 },
      end: { row, col: CONFIG.COLS - 1 },
    };
    state.activeCell = { row, col: 0 };

    clearSelection();
    for (let c = 0; c < CONFIG.COLS; c++) {
      const cell = document.getElementById(`cell-${row}-${c}`);
      if (cell) {
        cell.classList.add(c === 0 ? "selected" : "in-range");
      }
    }

    header.classList.add("selected");
    updateCellAddress();
    updateCalculationResult();
  }

  // =============================================================================
  // CELL EDITING
  // =============================================================================

  function startEditing(row, col) {
    const cell = document.getElementById(`cell-${row}-${col}`);
    if (!cell) return;

    state.isEditing = true;
    const data = getCellData(row, col);

    cell.classList.add("editing");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "cell-input";
    input.value = data ? data.value || "" : "";

    input.addEventListener("blur", () => finishEditing(row, col));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        finishEditing(row, col);
        navigateCell(1, 0);
      } else if (e.key === "Tab") {
        e.preventDefault();
        finishEditing(row, col);
        navigateCell(0, e.shiftKey ? -1 : 1);
      } else if (e.key === "Escape") {
        cancelEditing(row, col);
      }
    });

    cell.innerHTML = "";
    cell.appendChild(input);
    input.focus();
    input.select();
  }

  function finishEditing(row, col) {
    const cell = document.getElementById(`cell-${row}-${col}`);
    if (!cell) return;

    const input = cell.querySelector(".cell-input");
    if (input) {
      const value = input.value;
      setCellValue(row, col, value);
      broadcastChange(row, col, value);
    }

    cell.classList.remove("editing");
    state.isEditing = false;
    renderCell(row, col);
  }

  function cancelEditing(row, col) {
    const cell = document.getElementById(`cell-${row}-${col}`);
    if (!cell) return;

    cell.classList.remove("editing");
    state.isEditing = false;
    renderCell(row, col);
  }

  // =============================================================================
  // CELL DATA
  // =============================================================================

  function setCellValue(row, col, value) {
    const ws = state.worksheets[state.activeWorksheet];
    const key = `${row},${col}`;

    if (!value && ws.data[key]) {
      delete ws.data[key];
    } else if (value) {
      if (!ws.data[key]) {
        ws.data[key] = {};
      }
      ws.data[key].value = value;
    }

    state.isDirty = true;
    scheduleAutoSave();
    saveToHistory();
  }

  function getCellData(row, col) {
    const ws = state.worksheets[state.activeWorksheet];
    return ws ? ws.data[`${row},${col}`] : null;
  }

  function getCellValue(row, col) {
    const data = getCellData(row, col);
    return data ? data.value || "" : "";
  }

  // =============================================================================
  // FORMULA EVALUATION
  // =============================================================================

  function evaluateFormula(formula, sourceRow, sourceCol) {
    if (!formula.startsWith("=")) return formula;

    try {
      let expr = formula.substring(1);

      expr = expr.replace(/([A-Z]+\d+):([A-Z]+\d+)/gi, (match, start, end) => {
        return JSON.stringify(parseRange(start, end));
      });

      expr = expr.replace(/([A-Z]+)(\d+)/gi, (match, col, row) => {
        const r = parseInt(row) - 1;
        const c = parseColName(col.toUpperCase());
        const val = getCellValue(r, c);
        const num = parseFloat(val);
        return isNaN(num) ? `"${val}"` : num;
      });

      expr = expr.replace(/SUM\s*\(\s*(\[.*?\])\s*\)/gi, (match, arr) => {
        return `sumRange(${arr})`;
      });

      expr = expr.replace(/AVERAGE\s*\(\s*(\[.*?\])\s*\)/gi, (match, arr) => {
        return `averageRange(${arr})`;
      });

      expr = expr.replace(/COUNT\s*\(\s*(\[.*?\])\s*\)/gi, (match, arr) => {
        return `countRange(${arr})`;
      });

      expr = expr.replace(/MAX\s*\(\s*(\[.*?\])\s*\)/gi, (match, arr) => {
        return `maxRange(${arr})`;
      });

      expr = expr.replace(/MIN\s*\(\s*(\[.*?\])\s*\)/gi, (match, arr) => {
        return `minRange(${arr})`;
      });

      expr = expr.replace(
        /IF\s*\(\s*(.*?)\s*,\s*(.*?)\s*,\s*(.*?)\s*\)/gi,
        (match, cond, t, f) => {
          return `(${cond} ? ${t} : ${f})`;
        },
      );

      const result = new Function(
        "sumRange",
        "averageRange",
        "countRange",
        "maxRange",
        "minRange",
        `return ${expr}`,
      )(sumRange, averageRange, countRange, maxRange, minRange);

      return isNaN(result) ? result : Math.round(result * 1000000) / 1000000;
    } catch (e) {
      return "#ERROR!";
    }
  }

  function parseRange(startRef, endRef) {
    const start = parseCellRef(startRef);
    const end = parseCellRef(endRef);
    if (!start || !end) return [];

    const values = [];
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const val = getCellValue(r, c);
        const num = parseFloat(val);
        if (!isNaN(num)) values.push(num);
      }
    }
    return values;
  }

  function sumRange(values) {
    return values.reduce((a, b) => a + b, 0);
  }

  function averageRange(values) {
    if (values.length === 0) return 0;
    return sumRange(values) / values.length;
  }

  function countRange(values) {
    return values.length;
  }

  function maxRange(values) {
    return values.length > 0 ? Math.max(...values) : 0;
  }

  function minRange(values) {
    return values.length > 0 ? Math.min(...values) : 0;
  }

  // =============================================================================
  // KEYBOARD HANDLING
  // =============================================================================

  function handleKeyDown(e) {
    if (state.isEditing) return;

    const { row, col } = state.activeCell;

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case "c":
          e.preventDefault();
          copySelection();
          break;
        case "x":
          e.preventDefault();
          cutSelection();
          break;
        case "v":
          e.preventDefault();
          pasteSelection();
          break;
        case "z":
          e.preventDefault();
          undo();
          break;
        case "y":
          e.preventDefault();
          redo();
          break;
        case "b":
          e.preventDefault();
          formatCells("bold");
          break;
        case "i":
          e.preventDefault();
          formatCells("italic");
          break;
        case "u":
          e.preventDefault();
          formatCells("underline");
          break;
        case "s":
          e.preventDefault();
          saveSheet();
          break;
        case "a":
          e.preventDefault();
          selectAll();
          break;
      }
      return;
    }

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        if (e.shiftKey) {
          extendSelection(
            Math.max(0, state.selection.end.row - 1),
            state.selection.end.col,
          );
        } else {
          navigateCell(-1, 0);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (e.shiftKey) {
          extendSelection(
            Math.min(CONFIG.ROWS - 1, state.selection.end.row + 1),
            state.selection.end.col,
          );
        } else {
          navigateCell(1, 0);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (e.shiftKey) {
          extendSelection(
            state.selection.end.row,
            Math.max(0, state.selection.end.col - 1),
          );
        } else {
          navigateCell(0, -1);
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        if (e.shiftKey) {
          extendSelection(
            state.selection.end.row,
            Math.min(CONFIG.COLS - 1, state.selection.end.col + 1),
          );
        } else {
          navigateCell(0, 1);
        }
        break;
      case "Enter":
        e.preventDefault();
        startEditing(row, col);
        break;
      case "Tab":
        e.preventDefault();
        navigateCell(0, e.shiftKey ? -1 : 1);
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        clearCells();
        break;
      case "F2":
        e.preventDefault();
        startEditing(row, col);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          startEditing(row, col);
          const cell = document.getElementById(`cell-${row}-${col}`);
          const input = cell ? cell.querySelector(".cell-input") : null;
          if (input) {
            input.value = e.key;
          }
        }
    }
  }

  function navigateCell(deltaRow, deltaCol) {
    const newRow = Math.max(
      0,
      Math.min(CONFIG.ROWS - 1, state.activeCell.row + deltaRow),
    );
    const newCol = Math.max(
      0,
      Math.min(CONFIG.COLS - 1, state.activeCell.col + deltaCol),
    );
    selectCell(newRow, newCol);
    scrollCellIntoView(newRow, newCol);
  }

  function scrollCellIntoView(row, col) {
    const cell = document.getElementById(`cell-${row}-${col}`);
    if (cell) {
      cell.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  function selectAll() {
    state.selection = {
      start: { row: 0, col: 0 },
      end: { row: CONFIG.ROWS - 1, col: CONFIG.COLS - 1 },
    };
    clearSelection();
    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        const cell = document.getElementById(`cell-${r}-${c}`);
        if (cell) {
          cell.classList.add(r === 0 && c === 0 ? "selected" : "in-range");
        }
      }
    }
  }

  // =============================================================================
  // FORMULA BAR
  // =============================================================================

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
    if (!elements.formulaInput || !elements.formulaPreview) return;

    const value = elements.formulaInput.value;
    if (value.startsWith("=")) {
      const result = evaluateFormula(
        value,
        state.activeCell.row,
        state.activeCell.col,
      );
      elements.formulaPreview.textContent = `= ${result}`;
    } else {
      elements.formulaPreview.textContent = "";
    }
  }

  function updateCellAddress() {
    if (!elements.cellAddress) return;
    const ref = getCellRef(state.activeCell.row, state.activeCell.col);
    elements.cellAddress.textContent = ref;
  }

  function updateFormulaBar() {
    if (!elements.formulaInput) return;
    const data = getCellData(state.activeCell.row, state.activeCell.col);
    elements.formulaInput.value = data ? data.value || "" : "";
    updateFormulaPreview();
  }

  function updateSelectionInfo() {
    const info = document.getElementById("selection-info");
    if (!info) return;

    const { start, end } = state.selection;
    const rows = end.row - start.row + 1;
    const cols = end.col - start.col + 1;
    const count = rows * cols;

    if (count > 1) {
      info.textContent = `${rows}R × ${cols}C`;
    } else {
      info.textContent = "";
    }
  }

  function updateCalculationResult() {
    const result = document.getElementById("calculation-result");
    if (!result) return;

    const { start, end } = state.selection;
    const values = [];

    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const val = getCellValue(r, c);
        const num = parseFloat(val);
        if (!isNaN(num)) values.push(num);
      }
    }

    if (values.length > 1) {
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      result.textContent = `Sum: ${sum.toFixed(2)} | Avg: ${avg.toFixed(2)} | Count: ${values.length}`;
    } else {
      result.textContent = "";
    }
  }

  // =============================================================================
  // CLIPBOARD OPERATIONS
  // =============================================================================

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

    const { row, col } = state.activeCell;
    const data = state.clipboard;

    saveToHistory();

    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const targetRow = row + r;
        const targetCol = col + c;
        if (targetRow < CONFIG.ROWS && targetCol < CONFIG.COLS) {
          const cellData = data[r][c];
          if (cellData) {
            const ws = state.worksheets[state.activeWorksheet];
            ws.data[`${targetRow},${targetCol}`] = { ...cellData };
          }
          renderCell(targetRow, targetCol);
        }
      }
    }

    if (state.clipboardMode === "cut") {
      clearSourceCells();
      state.clipboard = null;
      state.clipboardMode = null;
      hideCopyBox();
    }

    state.isDirty = true;
    scheduleAutoSave();
  }

  function getSelectionData() {
    const { start, end } = state.selection;
    const data = [];

    for (let r = start.row; r <= end.row; r++) {
      const rowData = [];
      for (let c = start.col; c <= end.col; c++) {
        rowData.push(getCellData(r, c) ? { ...getCellData(r, c) } : null);
      }
      data.push(rowData);
    }

    return data;
  }

  function clearSourceCells() {
    const { start, end } = state.selection;
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        setCellValue(r, c, "");
        renderCell(r, c);
      }
    }
  }

  function clearCells() {
    const { start, end } = state.selection;
    saveToHistory();

    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        setCellValue(r, c, "");
        renderCell(r, c);
      }
    }
  }

  function showCopyBox() {
    const box = document.getElementById("copy-box");
    if (!box) return;

    const { start, end } = state.selection;
    const startCell = document.getElementById(`cell-${start.row}-${start.col}`);
    const endCell = document.getElementById(`cell-${end.row}-${end.col}`);

    if (!startCell || !endCell || !elements.cellsContainer) return;

    const containerRect = elements.cellsContainer.getBoundingClientRect();
    const startRect = startCell.getBoundingClientRect();
    const endRect = endCell.getBoundingClientRect();

    box.style.left = startRect.left - containerRect.left + "px";
    box.style.top = startRect.top - containerRect.top + "px";
    box.style.width = endRect.right - startRect.left + "px";
    box.style.height = endRect.bottom - startRect.top + "px";
    box.classList.remove("hidden");
  }

  function hideCopyBox() {
    const box = document.getElementById("copy-box");
    if (box) box.classList.add("hidden");
  }

  // =============================================================================
  // FORMATTING
  // =============================================================================

  function formatCells(format, value) {
    const { start, end } = state.selection;
    const ws = state.worksheets[state.activeWorksheet];

    saveToHistory();

    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const key = `${r},${c}`;
        if (!ws.data[key]) {
          ws.data[key] = { value: "", format: {} };
        }
        if (!ws.data[key].format) {
          ws.data[key].format = {};
        }

        switch (format) {
          case "bold":
            ws.data[key].format.bold = !ws.data[key].format.bold;
            break;
          case "italic":
            ws.data[key].format.italic = !ws.data[key].format.italic;
            break;
          case "underline":
            ws.data[key].format.underline = !ws.data[key].format.underline;
            break;
          case "strikethrough":
            ws.data[key].format.strikethrough =
              !ws.data[key].format.strikethrough;
            break;
          case "fontFamily":
            ws.data[key].format.fontFamily = value;
            break;
          case "fontSize":
            ws.data[key].format.fontSize = value;
            break;
          case "color":
            ws.data[key].format.color = value;
            break;
          case "backgroundColor":
            ws.data[key].format.backgroundColor = value;
            break;
          case "alignLeft":
            ws.data[key].format.textAlign = "left";
            break;
          case "alignCenter":
            ws.data[key].format.textAlign = "center";
            break;
          case "alignRight":
            ws.data[key].format.textAlign = "right";
            break;
        }

        renderCell(r, c);
      }
    }

    state.isDirty = true;
    scheduleAutoSave();
  }

  // =============================================================================
  // HISTORY (UNDO/REDO)
  // =============================================================================

  function saveToHistory() {
    const snapshot = JSON.stringify(state.worksheets);
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    if (state.history.length > CONFIG.MAX_HISTORY) {
      state.history.shift();
    }
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

  // =============================================================================
  // CONTEXT MENU
  // =============================================================================

  function handleContextMenu(e) {
    e.preventDefault();
    const menu = elements.contextMenu;
    if (!menu) return;

    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    menu.classList.remove("hidden");
  }

  function hideContextMenus() {
    if (elements.contextMenu) elements.contextMenu.classList.add("hidden");
    if (elements.tabContextMenu)
      elements.tabContextMenu.classList.add("hidden");
  }

  // =============================================================================
  // ROW/COLUMN OPERATIONS
  // =============================================================================

  function insertRow() {
    const row = state.activeCell.row;
    const ws = state.worksheets[state.activeWorksheet];
    const newData = {};

    saveToHistory();

    for (const key in ws.data) {
      const [r, c] = key.split(",").map(Number);
      if (r >= row) {
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

  function insertColumn() {
    const col = state.activeCell.col;
    const ws = state.worksheets[state.activeWorksheet];
    const newData = {};

    saveToHistory();

    for (const key in ws.data) {
      const [r, c] = key.split(",").map(Number);
      if (c >= col) {
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

  function deleteRow() {
    const row = state.activeCell.row;
    const ws = state.worksheets[state.activeWorksheet];
    const newData = {};

    saveToHistory();

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

  function deleteColumn() {
    const col = state.activeCell.col;
    const ws = state.worksheets[state.activeWorksheet];
    const newData = {};

    saveToHistory();

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

  // =============================================================================
  // SORTING
  // =============================================================================

  function sortAscending() {
    sortSelection(true);
  }

  function sortDescending() {
    sortSelection(false);
  }

  function sortSelection(ascending) {
    const { start, end } = state.selection;
    const ws = state.worksheets[state.activeWorksheet];
    const rows = [];

    saveToHistory();

    for (let r = start.row; r <= end.row; r++) {
      const rowData = [];
      for (let c = start.col; c <= end.col; c++) {
        rowData.push(getCellData(r, c));
      }
      rows.push({ row: r, data: rowData });
    }

    rows.sort((a, b) => {
      const valA = a.data[0]?.value || "";
      const valB = b.data[0]?.value || "";
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return ascending ? numA - numB : numB - numA;
      }
      return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
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

  // =============================================================================
  // WORKSHEETS
  // =============================================================================

  function addWorksheet() {
    const num = state.worksheets.length + 1;
    state.worksheets.push({ name: `Sheet${num}`, data: {} });
    state.activeWorksheet = state.worksheets.length - 1;
    renderWorksheetTabs();
    renderAllCells();
    selectCell(0, 0);
  }

  function switchWorksheet(index) {
    if (index < 0 || index >= state.worksheets.length) return;
    state.activeWorksheet = index;
    renderWorksheetTabs();
    renderAllCells();
    selectCell(0, 0);
  }

  function renderWorksheetTabs() {
    if (!elements.worksheetTabs) return;

    elements.worksheetTabs.innerHTML = state.worksheets
      .map(
        (ws, i) => `
            <div class="sheet-tab ${i === state.activeWorksheet ? "active" : ""}"
                 onclick="window.gbSheet.switchWorksheet(${i})">
                ${escapeHtml(ws.name)}
                <button class="tab-menu-btn" onclick="event.stopPropagation(); window.gbSheet.showTabMenu(event, ${i})">▼</button>
            </div>
        `,
      )
      .join("");
  }

  function showTabMenu(e, index) {
    if (!elements.tabContextMenu) return;
    elements.tabContextMenu.style.left = e.clientX + "px";
    elements.tabContextMenu.style.top = e.clientY + "px";
    elements.tabContextMenu.dataset.index = index;
    elements.tabContextMenu.classList.remove("hidden");
  }

  function renameWorksheet(index, name) {
    if (index >= 0 && index < state.worksheets.length) {
      state.worksheets[index].name = name;
      renderWorksheetTabs();
      state.isDirty = true;
    }
  }

  function deleteWorksheet(index) {
    if (state.worksheets.length <= 1) return;
    state.worksheets.splice(index, 1);
    if (state.activeWorksheet >= state.worksheets.length) {
      state.activeWorksheet = state.worksheets.length - 1;
    }
    renderWorksheetTabs();
    renderAllCells();
    state.isDirty = true;
  }

  // =============================================================================
  // ZOOM
  // =============================================================================

  function zoomIn() {
    state.zoom = Math.min(2, state.zoom + 0.1);
    applyZoom();
  }

  function zoomOut() {
    state.zoom = Math.max(0.5, state.zoom - 0.1);
    applyZoom();
  }

  function applyZoom() {
    if (!elements.cells) return;
    elements.cells.style.transform = `scale(${state.zoom})`;
    elements.cells.style.transformOrigin = "top left";

    const zoomDisplay = document.getElementById("zoom-level");
    if (zoomDisplay) {
      zoomDisplay.textContent = Math.round(state.zoom * 100) + "%";
    }
  }

  // =============================================================================
  // SIDEBAR
  // =============================================================================

  function toggleSidebar() {
    if (elements.sidebar) {
      elements.sidebar.classList.toggle("collapsed");
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

  function showShareModal() {
    const link = document.getElementById("share-link");
    if (link) {
      link.value = window.location.href;
    }
    showModal("share-modal");
  }

  function copyShareLink() {
    const input = document.getElementById("share-link");
    if (input) {
      input.select();
      navigator.clipboard.writeText(input.value);
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
        saveSheet();
      }
    }, CONFIG.AUTOSAVE_DELAY);
  }

  async function saveSheet() {
    const btn = document.getElementById("save-btn");
    if (btn) btn.disabled = true;

    try {
      const data = {
        name: state.sheetName,
        worksheets: state.worksheets,
      };

      const response = await fetch("/api/sheet/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.id) {
          state.sheetId = result.id;
          window.history.replaceState({}, "", `#id=${state.sheetId}`);
        }
        state.isDirty = false;
        showSaveStatus("saved");
      } else {
        showSaveStatus("error");
      }
    } catch (e) {
      console.error("Save failed:", e);
      showSaveStatus("error");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function showSaveStatus(status) {
    const statusEl = document.getElementById("save-status");
    if (!statusEl) return;

    statusEl.className = "save-status " + status;
    statusEl.textContent =
      status === "saved"
        ? "Saved"
        : status === "error"
          ? "Save failed"
          : "Saving...";

    if (status === "saved") {
      setTimeout(() => {
        statusEl.textContent = "";
        statusEl.className = "save-status";
      }, 2000);
    }
  }

  async function loadFromUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    let sheetId = urlParams.get("id");

    if (!sheetId && hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      sheetId = hashParams.get("id");
    }

    if (sheetId) {
      try {
        const response = await fetch(`/api/sheet/${sheetId}`);
        if (response.ok) {
          const data = await response.json();
          state.sheetId = sheetId;
          state.sheetName = data.name || "Untitled Spreadsheet";
          state.worksheets = data.worksheets || [{ name: "Sheet1", data: {} }];

          if (elements.sheetName) {
            elements.sheetName.value = state.sheetName;
          }

          renderWorksheetTabs();
          renderAllCells();
          selectCell(0, 0);
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
      return "";
    }
  }

  // =============================================================================
  // WEBSOCKET (COLLABORATION)
  // =============================================================================

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

      state.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (e) {
      console.error("WebSocket connection failed:", e);
    }
  }

  function handleWebSocketMessage(msg) {
    switch (msg.type) {
      case "cellChange":
        if (msg.userId !== getUserId()) {
          setCellValue(msg.row, msg.col, msg.value);
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

  function broadcastChange(row, col, value) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(
        JSON.stringify({
          type: "cellChange",
          sheetId: state.sheetId,
          row,
          col,
          value,
          userId: getUserId(),
        }),
      );
    }
  }

  function updateRemoteCursor(msg) {
    if (!elements.cursorIndicators) return;

    let cursor = document.getElementById(`cursor-${msg.userId}`);
    if (!cursor) {
      cursor = document.createElement("div");
      cursor.id = `cursor-${msg.userId}`;
      cursor.className = "cursor-indicator";
      cursor.style.borderColor = msg.color || "#10b981";
      cursor.innerHTML = `<div class="cursor-label" style="background:${msg.color || "#10b981"}">${escapeHtml(msg.userName)}</div>`;
      elements.cursorIndicators.appendChild(cursor);
    }

    const cell = document.getElementById(`cell-${msg.row}-${msg.col}`);
    if (cell && elements.cellsContainer) {
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
    const cursor = document.getElementById(`cursor-${userId}`);
    if (cursor) cursor.remove();
    renderCollaborators();
  }

  function renderCollaborators() {
    if (!elements.collaborators) return;

    elements.collaborators.innerHTML = state.collaborators
      .slice(0, 5)
      .map(
        (u) => `
                <div class="collaborator-avatar" style="background:${u.color || "#3b82f6"}" title="${escapeHtml(u.name)}">
                    ${u.name.charAt(0).toUpperCase()}
                </div>
            `,
      )
      .join("");

    if (state.collaborators.length > 5) {
      elements.collaborators.innerHTML += `
                <div class="collaborator-avatar" style="background:#64748b">
                    +${state.collaborators.length - 5}
                </div>
            `;
    }
  }

  // =============================================================================
  // UTILITIES
  // =============================================================================

  function getUserId() {
    let id = localStorage.getItem("sheet-user-id");
    if (!id) {
      id = "user-" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("sheet-user-id", id);
    }
    return id;
  }

  function getUserName() {
    return localStorage.getItem("sheet-user-name") || "Anonymous";
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renameSheet(name) {
    state.sheetName = name;
    state.isDirty = true;
    scheduleAutoSave();
  }

  function createNewSheet() {
    state.sheetId = null;
    state.sheetName = "Untitled Spreadsheet";
    state.worksheets = [{ name: "Sheet1", data: {} }];
    state.activeWorksheet = 0;
    state.history = [];
    state.historyIndex = -1;
    state.isDirty = false;

    if (elements.sheetName) {
      elements.sheetName.value = state.sheetName;
    }

    window.history.replaceState({}, "", window.location.pathname);
    renderWorksheetTabs();
    renderAllCells();
    selectCell(0, 0);
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  window.gbSheet = {
    init,
    toggleSidebar,
    createNewSheet,
    saveSheet,
    undo,
    redo,
    formatCells,
    insertRow,
    insertColumn,
    deleteRow,
    deleteColumn,
    sortAscending,
    sortDescending,
    addWorksheet,
    switchWorksheet,
    showTabMenu,
    renameWorksheet,
    deleteWorksheet,
    zoomIn,
    zoomOut,
    showModal,
    hideModal,
    showShareModal,
    copyShareLink,
    renameSheet,
    copySelection,
    cutSelection,
    pasteSelection,
    clearCells,
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
