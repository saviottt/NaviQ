// Attach functions to window for index.html inline event compatibility
window.undo = undo;
window.redo = redo;
window.confirmClearCanvas = confirmClearCanvas;
window.clearCanvas = clearCanvas;

window.addBuilding = addBuilding;
window.renameBuilding = renameBuilding;
window.renameFloor = renameFloor;
window.renameBlock = renameBlock;
window.deleteBuilding = deleteBuilding;
window.moveFloor = moveFloor;
window.deleteFloor = deleteFloor;
window.deleteBlock = deleteBlock;
window.addFloor = addFloor;
window.addBlock = addBlock;

window.addEl = addEl;
window.addRoom = addRoom;
window.buildStairHall = buildStairHall;
window.deleteSelected = deleteSelected;
window.duplicateSelected = duplicateSelected;
window.copyElements = copyElements;
window.cutElements = cutElements;
window.pasteElements = pasteElements;
window.groupElements = groupElements;
window.ungroupElements = ungroupElements;

window.openLinkThisStair = openLinkThisStair;
window.populateTargetStairs = populateTargetStairs;
window.confirmStairLink = confirmStairLink;
window.closeStairLinkModal = closeStairLinkModal;
window.removeStairLinkByIndex = removeStairLinkByIndex;
window.removeStairLink = removeStairLink;
window.openStairManager = openStairManager;

window.openUniversalLinkModal = openUniversalLinkModal;
window.populateUniversalTargets = populateUniversalTargets;
window.confirmUniversalLink = confirmUniversalLink;
window.closeUniversalLinkModal = closeUniversalLinkModal;
window.removeUniversalLinkById = removeUniversalLinkById;
window.removeUniversalLinkByIndex = removeUniversalLinkByIndex;
window.openUniversalLinkManager = openUniversalLinkManager;

window.openPathFinder = openPathFinder;
window.closePathModal = closePathModal;
window.clearPathResult = clearPathResult;
window.clearPathHighlights = clearPathHighlights;
window.runPathFinder = runPathFinder;

// Window bindings for tools
window.toggle3DMode = toggle3DMode;
window.toggleWallTool = toggleWallTool;
window.deleteSelectedWall = deleteSelectedWall;
window.toggleTheme = toggleTheme;
window.toggleOrbit = toggleOrbit;

window.getExportData = getExportData;
window.exportJSON = exportJSON;
window.importJSON = importJSON;
window.handleJSONImport = handleJSONImport;
window.mergeJSON = mergeJSON;
window.handleJSONMerge = handleJSONMerge;
window.exportPDF = exportPDF;

// Zoom and Canvas Resize actions
window.updateZoom = function () {
  const sl = document.getElementById('zoomSlider');
  if (sl) {
    state.zoom = parseFloat(sl.value);
    const zv = document.getElementById('zoomVal');
    if (zv) zv.textContent = Math.round(state.zoom * 100) + '%';
    applyCanvasTransform();
  }
};

window.resizeCanvas = function () {
  const cw = document.getElementById('canvasW');
  const ch = document.getElementById('canvasH');
  const w = Math.max(800, parseInt(cw?.value) || 3000);
  const h = Math.max(600, parseInt(ch?.value) || 2400);
  const canvasEl = document.getElementById('canvas');
  if (canvasEl) {
    canvasEl.style.width = w + 'px';
    canvasEl.style.height = h + 'px';
  }
};

window.toggleWaypointsVisibility = function () {
  const show = document.getElementById('waypointToggle')?.checked !== false;
  const canvas = document.getElementById('canvas');
  if (canvas) {
    if (show) {
      canvas.classList.remove('hide-waypoints');
    } else {
      canvas.classList.add('hide-waypoints');
    }
  }
};

/* =================================================================
   BOOTSTRAP INITIALIZATION
   ================================================================= */
loadSavedState();
applyCanvasTransform();
renderAll();
window.toggleWaypointsVisibility();

// Init Theme on load
(function initTheme() {
  const savedTheme = localStorage.getItem('layoutProTheme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.innerHTML = '<i data-lucide="moon"></i><span>Theme</span>';
      if (window.lucide) window.lucide.createIcons();
    }
  }
})();

