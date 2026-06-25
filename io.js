/* =================================================================
   EXPORT / IMPORT
   ================================================================= */
function exportJSON() {
  const data = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
    buildings: state.buildings,
    currBuildingId: state.currBuildingId,
    floors: state.floors,
    stairLinks: state.stairLinks,
    universalLinks: state.universalLinks,
    walls: state.walls
  }, null, 2));
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
        if (!parsed.buildings) state.floors.forEach(f => f.buildingId = 1);
        state.stairLinks = [];
        state.universalLinks = [];
        state.walls = [];
      } else throw new Error('Invalid format');
      state.currFloorId = state.floors[0].id;
      state.currBlockId = state.floors[0].blocks[0].id;
      state.selectedId = null;
      renderAll();
      showToast('Layout loaded!');
    } catch (err) {
      alert('Invalid file: ' + err.message);
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
