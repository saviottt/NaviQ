/* =================================================================
   EXPORT / IMPORT
   ================================================================= */
function getExportData() {
  return {
    buildings: state.buildings,
    currBuildingId: state.currBuildingId,
    floors: state.floors,
    stairLinks: state.stairLinks,
    universalLinks: state.universalLinks,
    walls: state.walls
  };
}

function exportJSON() {
  const data = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(getExportData(), null, 2));
  const a = document.createElement('a');
  a.href = data;
  a.download = 'building_layout.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('JSON downloaded');
}

function importJSON() {
  const input = document.getElementById('jsonFileInput');
  if (input) input.click();
}

function handleJSONImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const parsed = JSON.parse(e.target.result);
      pushHistory();
      if (parsed.buildings) {
        state.buildings = parsed.buildings;
        state.currBuildingId = parsed.currBuildingId || parsed.buildings[0].id;
      } else {
        state.buildings = [{ id: 1, name: 'Main Building' }];
        state.currBuildingId = 1;
      }
      if (parsed.floors) {
        state.floors = parsed.floors;
        if (!parsed.buildings) state.floors.forEach(f => f.buildingId = 1);
        state.stairLinks = parsed.stairLinks || [];
        state.universalLinks = parsed.universalLinks || [];
        state.walls = parsed.walls || [];
      } else if (Array.isArray(parsed)) {
        state.floors = parsed;
        state.floors.forEach(f => f.buildingId = 1);
        state.stairLinks = [];
        state.universalLinks = [];
        state.walls = [];
      } else throw new Error('Invalid format');
      state.currFloorId = state.floors[0]?.id ?? null;
      state.currBlockId = state.floors[0]?.blocks?.[0]?.id ?? null;
      state.selectedIds = [];
      renderAll();
      showToast('Layout loaded!');
    } catch (err) {
      alert('Invalid file: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

/* =================================================================
   MERGE LAYOUT
   Appends another person's JSON layout into the current canvas
   without replacing anything. Every ID is remapped to a fresh
   unique value to prevent any collision with existing elements.
   ================================================================= */
function mergeJSON() {
  const input = document.getElementById('jsonMergeInput');
  if (input) input.click();
}

function handleJSONMerge(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const parsed = JSON.parse(e.target.result);

      // Normalise: support both { buildings, floors, ... } and legacy array format
      let srcBuildings = parsed.buildings || [{ id: 1, name: 'Merged Building' }];
      let srcFloors;
      if (parsed.floors) {
        srcFloors = parsed.floors;
        if (!parsed.buildings) srcFloors.forEach(f => f.buildingId = srcBuildings[0].id);
      } else if (Array.isArray(parsed)) {
        srcFloors = parsed;
        srcFloors.forEach(f => f.buildingId = srcBuildings[0].id);
      } else {
        throw new Error('Invalid format — expected { buildings, floors } or an array of floors');
      }
      const srcStairLinks = parsed.stairLinks || [];
      const srcUniversalLinks = parsed.universalLinks || [];
      const srcWalls = parsed.walls || [];

      // ------------------------------------------------------------------
      // Step 1: Build a remap table  oldId → fresh unique ID
      // Using Date.now() + counter so every ID is unique even if this
      // function is called multiple times in the same session.
      // ------------------------------------------------------------------
      const remap = new Map();
      let counter = 1;
      const freshId = (oldId) => {
        if (!remap.has(oldId)) remap.set(oldId, Date.now() + counter++);
        return remap.get(oldId);
      };
      const remapRef = (id) => remap.has(id) ? remap.get(id) : id;

      // Pre-register all IDs before rewriting so counter stays consistent
      srcBuildings.forEach(b => freshId(b.id));
      srcFloors.forEach(f => {
        freshId(f.id);
        (f.blocks || []).forEach(b => {
          freshId(b.id);
          (b.elements || []).forEach(el => freshId(el.id));
        });
      });

      // ------------------------------------------------------------------
      // Step 2: Deep-rewrite imported data using the remap table
      // ------------------------------------------------------------------
      const remappedBuildings = srcBuildings.map(b => ({ ...b, id: remap.get(b.id) }));

      const remappedFloors = srcFloors.map(f => ({
        ...f,
        id: remap.get(f.id),
        buildingId: remap.get(f.buildingId) ?? remap.get(srcBuildings[0].id),
        blocks: (f.blocks || []).map(b => ({
          ...b,
          id: remap.get(b.id),
          elements: (b.elements || []).map(el => ({ ...el, id: remap.get(el.id) }))
        }))
      }));

      // ------------------------------------------------------------------
      // Step 3: Rewrite stairLinks & universalLinks cross-references
      // ------------------------------------------------------------------
      const remappedStairLinks = srcStairLinks.map(link => ({
        ...link,
        fromFloorId: remapRef(link.fromFloorId),
        fromElId: remapRef(link.fromElId),
        toFloorId: remapRef(link.toFloorId),
        toElId: remapRef(link.toElId)
      }));

      const remappedUniversalLinks = srcUniversalLinks.map(link => ({
        ...link,
        fromFloorId: remapRef(link.fromFloorId),
        fromElId: remapRef(link.fromElId),
        toFloorId: remapRef(link.toFloorId),
        toElId: remapRef(link.toElId)
      }));

      // Walls only carry positional data — just remap their floorId
      const remappedWalls = srcWalls.map(w => ({
        ...w,
        floorId: remapRef(w.floorId)
      }));

      // ------------------------------------------------------------------
      // Step 4: Append to existing state — never replaces
      // ------------------------------------------------------------------
      pushHistory();
      state.buildings.push(...remappedBuildings);
      state.floors.push(...remappedFloors);
      state.stairLinks.push(...remappedStairLinks);
      state.universalLinks.push(...remappedUniversalLinks);
      state.walls.push(...remappedWalls);

      // Jump view to the first merged building/floor so the user sees it
      state.currBuildingId = remappedBuildings[0].id;
      state.currFloorId = remappedFloors[0].id;
      state.currBlockId = remappedFloors[0].blocks?.[0]?.id ?? null;
      state.selectedIds = [];

      renderAll();
      const bCount = remappedBuildings.length;
      const fCount = remappedFloors.length;
      showToast(`Merged: ${bCount} building${bCount !== 1 ? 's' : ''}, ${fCount} floor${fCount !== 1 ? 's' : ''} added`);
    } catch (err) {
      alert('Merge failed: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

async function exportPDF() {
  if (!window.jspdf) {
    alert('PDF library still loading...');
    return;
  }
  const oldZoom = state.zoom;
  state.zoom = 1;
  applyCanvasTransform();
  document.querySelectorAll('.resize,.dims-tag').forEach(el => {
    el.style.display = 'none';
  });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('l', 'px', [1300, 1000]);
  const canvasEl = document.getElementById('canvas');
  if (!canvasEl) return;
  await html2canvas(canvasEl, { scale: 2 }).then(c => {
    pdf.addImage(c.toDataURL('image/png'), 'PNG', 20, 20, 1200, 900);
    pdf.save('building_layout.pdf');
  });
  state.zoom = oldZoom;
  applyCanvasTransform();
  renderAll();
}
