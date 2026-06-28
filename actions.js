let _pendingStairSource = null;
let _pendingUniversalSource = null;

/* =================================================================
   BUILDING & FLOOR ACTIONS
   ================================================================= */
function addBuilding() {
  pushHistory();
  const id = Date.now();
  state.buildings.push({ id, name: 'Building ' + (state.buildings.length + 1) });
  state.currBuildingId = id;
  state.currFloorId = null;
  state.currBlockId = null;
  renderAll();
  showToast('Building added');
}

function renameBuilding(e, id) {
  e.stopPropagation();
  const bldg = state.buildings.find(b => b.id === id);
  if (!bldg) return;
  const newName = prompt("Enter new building name:", bldg.name);
  if (newName && newName.trim() !== "") {
    pushHistory();
    bldg.name = newName.trim();
    renderAll();
    showToast("Building renamed");
  }
}

function renameFloor(e, id) {
  e.stopPropagation();
  const f = state.floors.find(f => f.id === id);
  if (!f) return;
  const newName = prompt("Enter new floor name:", f.name);
  if (newName && newName.trim() !== "") {
    pushHistory();
    f.name = newName.trim();
    renderAll();
    showToast("Floor renamed");
  }
}

function renameBlock(e, floorId, blockId) {
  e.stopPropagation();
  const f = state.floors.find(fl => fl.id === floorId);
  if (!f) return;
  const b = f.blocks.find(bl => bl.id === blockId);
  if (!b) return;
  const newName = prompt("Enter new block name:", b.name);
  if (newName && newName.trim() !== "") {
    pushHistory();
    b.name = newName.trim();
    renderAll();
    showToast("Block renamed");
  }
}

function deleteBuilding(e, id) {
  e.stopPropagation();
  if (state.buildings.length <= 1) {
    showToast("Cannot delete the last building.");
    return;
  }
  if (!confirm("Are you sure you want to delete this building and all its floors?")) return;

  pushHistory();
  const deletedFloorIds = state.floors.filter(f => f.buildingId === id).map(f => f.id);

  state.buildings = state.buildings.filter(b => b.id !== id);
  state.floors = state.floors.filter(f => f.buildingId !== id);

  state.stairLinks = state.stairLinks.filter(lk => !deletedFloorIds.includes(lk.fromFloorId) && !deletedFloorIds.includes(lk.toFloorId));
  state.universalLinks = state.universalLinks.filter(lk => !deletedFloorIds.includes(lk.fromFloorId) && !deletedFloorIds.includes(lk.toFloorId));
  state.walls = state.walls.filter(w => !deletedFloorIds.includes(w.floorId));

  if (state.currBuildingId === id) {
    state.currBuildingId = state.buildings[0].id;
    const bldgFloors = state.floors.filter(f => f.buildingId === state.currBuildingId);
    if (bldgFloors.length > 0) {
      state.currFloorId = bldgFloors[0].id;
      state.currBlockId = bldgFloors[0].blocks[0].id;
    } else {
      state.currFloorId = null;
      state.currBlockId = null;
    }
  }
  renderAll();
  showToast("Building deleted");
}

function moveFloor(e, floorId, direction) {
  e.stopPropagation();
  const floor = state.floors.find(f => f.id === floorId);
  if (!floor) return;

  const buildingFloors = state.floors.filter(f => f.buildingId === floor.buildingId);
  const currentOrderIndex = buildingFloors.findIndex(f => f.id === floorId);
  const targetOrderIndex = currentOrderIndex + direction;

  if (targetOrderIndex < 0 || targetOrderIndex >= buildingFloors.length) return;

  pushHistory();
  const reordered = [...buildingFloors];
  const [moved] = reordered.splice(currentOrderIndex, 1);
  reordered.splice(targetOrderIndex, 0, moved);

  const queuesByBuilding = new Map();
  queuesByBuilding.set(floor.buildingId, reordered);
  state.floors = state.floors.map(existing => {
    if (existing.buildingId !== floor.buildingId) return existing;
    return queuesByBuilding.get(floor.buildingId).shift();
  });

  state.currBuildingId = moved.buildingId;
  state.currFloorId = moved.id;
  state.currBlockId = moved.blocks[0]?.id || state.currBlockId;
  state.selectedIds = [];
  renderAll();
  showToast("Floor moved");
}

function deleteFloor(e, id) {
  e.stopPropagation();
  const f = state.floors.find(f => f.id === id);
  if (!f) return;
  const bldgFloors = state.floors.filter(fl => fl.buildingId === f.buildingId);
  if (bldgFloors.length <= 1) {
    showToast("Cannot delete the last floor of a building.");
    return;
  }
  if (!confirm("Are you sure you want to delete this floor and all its contents?")) return;

  pushHistory();
  state.floors = state.floors.filter(fl => fl.id !== id);
  state.stairLinks = state.stairLinks.filter(lk => lk.fromFloorId !== id && lk.toFloorId !== id);
  state.universalLinks = state.universalLinks.filter(lk => lk.fromFloorId !== id && lk.toFloorId !== id);
  state.walls = state.walls.filter(w => w.floorId !== id);

  if (state.currFloorId === id) {
    const remainingFloors = state.floors.filter(fl => fl.buildingId === f.buildingId);
    state.currFloorId = remainingFloors[0].id;
    state.currBlockId = remainingFloors[0].blocks[0].id;
  }
  renderAll();
  showToast("Floor deleted");
}

function deleteBlock(e, floorId, blockId) {
  e.stopPropagation();
  const f = state.floors.find(fl => fl.id === floorId);
  if (!f) return;
  if (f.blocks.length <= 1) {
    showToast("Cannot delete the last block of a floor.");
    return;
  }
  if (!confirm("Are you sure you want to delete this block and all its elements?")) return;

  pushHistory();
  const block = f.blocks.find(b => b.id === blockId);
  if (block) {
    const elIds = block.elements.map(el => el.id);
    state.stairLinks = state.stairLinks.filter(lk => !elIds.includes(lk.fromElId) && !elIds.includes(lk.toElId));
    state.universalLinks = state.universalLinks.filter(lk => !elIds.includes(lk.fromElId) && !elIds.includes(lk.toElId));
  }

  f.blocks = f.blocks.filter(b => b.id !== blockId);
  if (state.currBlockId === blockId) {
    state.currBlockId = f.blocks[0].id;
  }
  renderAll();
  showToast("Block deleted");
}

function addFloor() {
  pushHistory();
  const id = Date.now();
  const bldgFloors = state.floors.filter(f => f.buildingId === state.currBuildingId);
  const newFloorName = bldgFloors.length === 0 ? 'Ground Floor' : 'Floor ' + bldgFloors.length;
  state.floors.push({ id, buildingId: state.currBuildingId, name: newFloorName, blocks: [{ id: id + 1, name: 'Block A', elements: [] }] });
  state.currFloorId = id;
  state.currBlockId = id + 1;
  renderAll();
  showToast('Floor added');
}

function addBlock() {
  const floor = curFloor();
  if (!floor) { showToast('Add a floor first'); return; }
  pushHistory();
  const id = Date.now();
  floor.blocks.push({ id, name: 'Block ' + String.fromCharCode(65 + floor.blocks.length), elements: [] });
  state.currBlockId = id;
  renderAll();
}

/* =================================================================
   ELEMENT ACTIONS
   ================================================================= */
function addEl(type, w, h, color, defaultName) {
  const block = curBlock();
  if (!block) { showToast('Add a floor and block first'); return; }
  pushHistory();

  const lockChecked = document.getElementById('lockSizeToggle')?.checked;
  if (lockChecked) {
    const selectedEl = getSelected();
    if (selectedEl) {
      w = selectedEl.w;
      h = selectedEl.h;
    } else if (state.lastAddedSize) {
      w = state.lastAddedSize.w;
      h = state.lastAddedSize.h;
    }
  }

  const id = Date.now();
  const newEl = { id, type, name: defaultName || type, x: 20, y: 20, w, h, r: 0, color, isStairs: false };
  block.elements.push(newEl);
  state.lastAddedSize = { w, h };
  state.selectedIds = [id];
  renderAll();
}

function addRoom() {
  const type = document.getElementById('roomType').value;
  const map = {
    Room: [150, 100, '#fff'],
    Classroom: [200, 160, '#eef7fa'],
    Office: [120, 100, '#f5f5dc'],
    Corridor: [300, 60, '#f0f0f0'],
    'Corridor-Square': [200, 200, '#e8f4fd'],
    'Corridor-Rect': [280, 160, '#e8f4fd'],
    'Corridor-Circle': [200, 200, '#e8f4fd'],
    'Corridor-Triangle': [220, 180, '#e8f4fd'],
    'Corridor-L': [220, 220, '#e8f4fd'],
    'Corridor-T': [240, 200, '#e8f4fd'],
    'Corridor-U': [240, 220, '#e8f4fd'],
    'Corridor-H': [240, 220, '#e8f4fd'],
    'Corridor-E': [220, 220, '#e8f4fd'],
    'Corridor-Y': [220, 240, '#e8f4fd'],
    'Corridor-Cross': [220, 220, '#e8f4fd'],
    'Corridor-Courtyard': [240, 240, '#e8f4fd'],
    Staircase: [100, 140, '#eafaf1'],
    Restroom: [100, 80, '#e8f5e9'],
    Hall: [250, 180, '#fff9e6'],
    Elevator: [80, 80, '#d5e8f5'],
    WaterCooler: [60, 60, '#2196F3'],
    Bridge: [200, 60, '#f59e0b'],
  };
  const [w, h, color] = map[type] || [150, 100, '#fff'];
  addEl(type, w, h, color, type);
  const created = curBlock().elements[curBlock().elements.length - 1];
  if (type === 'Staircase') created.isStairs = true;
  renderAll();
}

function buildStairHall() {
  const block = curBlock();
  if (!block) { showToast("Add a floor first"); return; }

  const countInput = document.getElementById("stairHallCount");
  const requested = parseInt(countInput?.value, 10);
  const stairCount = Math.max(1, Math.min(12, Number.isFinite(requested) ? requested : 4));

  pushHistory();

  const idBase = Date.now();
  const existingEls = block.elements;
  const maxBottom = existingEls.reduce((max, el) => Math.max(max, (el.y || 0) + (el.h || 0)), 0);
  const hall = {
    id: idBase,
    type: "Hall",
    name: "Stair Hall",
    x: 190,
    y: Math.max(150, maxBottom + 150),
    w: 280,
    h: 180,
    r: 0,
    color: "#fff9e6",
    isStairs: false
  };

  block.elements.push(hall);

  const stairW = 96;
  const stairH = 96;

  for (let i = 0; i < stairCount; i++) {
    const side = i % 4;
    const lane = Math.floor(i / 4);
    let x = hall.x;
    let y = hall.y;

    if (side === 0) {
      x = hall.x + 20 + (lane % 3) * 90;
      y = hall.y - stairH;
    } else if (side === 1) {
      x = hall.x + hall.w;
      y = hall.y + 10 + (lane % 2) * 84;
    } else if (side === 2) {
      x = hall.x + 20 + (lane % 3) * 90;
      y = hall.y + hall.h;
    } else {
      x = hall.x - stairW;
      y = hall.y + 10 + (lane % 2) * 84;
    }

    const stair = {
      id: idBase + i + 1,
      type: "Staircase",
      name: "Stair " + (i + 1),
      x,
      y,
      w: stairW,
      h: stairH,
      r: 0,
      color: "#eafaf1",
      isStairs: true,
      stairDir: i === 0 ? "down" : "up",
      stairElevation: 0
    };

    block.elements.push(stair);
    state.stairLinks.push({
      fromElId: hall.id,
      fromFloorId: state.currFloorId,
      fromBlockId: state.currBlockId,
      toElId: stair.id,
      toFloorId: state.currFloorId,
      toBlockId: state.currBlockId
    });
  }

  state.selectedIds = [hall.id];
  renderAll();
  showToast("Stair Hall created with " + stairCount + " stair" + (stairCount === 1 ? "" : "s"));
}

function deleteSelected() {
  if (!state.selectedIds || state.selectedIds.length === 0) return;
  pushHistory();
  const toDelete = [...state.selectedIds];
  
  state.stairLinks = state.stairLinks.filter(lk => !toDelete.includes(lk.fromElId) && !toDelete.includes(lk.toElId));
  state.universalLinks = state.universalLinks.filter(lk => !toDelete.includes(lk.fromElId) && !toDelete.includes(lk.toElId));
  state.bridgeLinks = (state.bridgeLinks || []).filter(lk => !toDelete.includes(lk.fromElId) && !toDelete.includes(lk.toElId));

  for (let b of (curFloor()?.blocks || [])) {
    b.elements = b.elements.filter(e => !toDelete.includes(e.id));
  }

  state.selectedIds = [];
  renderAll();
}

function duplicateSelected() {
  const els = getSelectedElements();
  if (!els || els.length === 0) return;
  pushHistory();
  const newIds = [];
  els.forEach((el, index) => {
    const clone = JSON.parse(JSON.stringify(el));
    clone.id = Date.now() + index;
    clone.x += 20;
    clone.y += 20;
    clone.name += ' (Copy)';

    const b = (curFloor()?.blocks || []).find(block => block.elements.some(e => e.id === el.id)) || curBlock();
    if (b) b.elements.push(clone);
    newIds.push(clone.id);
  });

  state.selectedIds = newIds;
  renderAll();
}

/* =================================================================
   CLIPBOARD & GROUPING ACTIONS
   ================================================================= */
function copyElements() {
  const els = getSelectedElements();
  if (els.length === 0) return;
  state.clipboard = els.map(el => JSON.parse(JSON.stringify(el)));
  showToast(els.length + ' element(s) copied');
}

function cutElements() {
  const els = getSelectedElements();
  if (els.length === 0) return;
  state.clipboard = els.map(el => JSON.parse(JSON.stringify(el)));
  deleteSelected();
  showToast(els.length + ' element(s) cut');
}

function pasteElements() {
  if (!state.clipboard || state.clipboard.length === 0) return;
  const block = curBlock();
  if (!block) { showToast('Add a floor and block first'); return; }
  
  pushHistory();
  const newIds = [];
  state.clipboard.forEach((el, index) => {
    const clone = JSON.parse(JSON.stringify(el));
    clone.id = Date.now() + index;
    clone.x += 20;
    clone.y += 20;
    if (!clone.name.includes('(Copy)')) {
      clone.name += ' (Copy)';
    }
    // If we're pasting something that was grouped, generate a new groupId if we want distinct groups,
    // but for now let's just clear groupId so they paste as individuals, or keep them if they all have same?
    // Let's clear groupId on paste to avoid conflicts unless we write logic to remap groupIds.
    delete clone.groupId;
    
    block.elements.push(clone);
    newIds.push(clone.id);
  });
  
  state.clipboard = state.clipboard.map(el => {
    el.x += 20;
    el.y += 20;
    return el;
  });

  state.selectedIds = newIds;
  renderAll();
  showToast(newIds.length + ' element(s) pasted');
}

function groupElements() {
  const els = getSelectedElements();
  if (els.length < 2) { showToast('Select at least 2 elements to group'); return; }
  pushHistory();
  const groupId = 'group-' + Date.now();
  els.forEach(el => el.groupId = groupId);
  renderAll();
  showToast('Grouped ' + els.length + ' elements');
}

function ungroupElements() {
  const els = getSelectedElements();
  const groupedEls = els.filter(el => el.groupId);
  if (groupedEls.length === 0) { showToast('No grouped elements selected'); return; }
  pushHistory();
  groupedEls.forEach(el => delete el.groupId);
  renderAll();
  showToast('Ungrouped elements');
}


/* =================================================================
   STAIR LINKING ACTIONS
   ================================================================= */
function openLinkThisStair() {
  const el = getSelected();
  if (!el) return;
  _pendingStairSource = { elId: el.id, floorId: state.currFloorId, blockId: state.currBlockId };
  openStairLinkModal(_pendingStairSource);
}

function openStairLinkModal(source) {
  const sourceRec = getElById(source.elId);
  const sourceFloor = state.floors.find(f => f.id === source.floorId);
  document.getElementById('slSourceName').textContent = sourceRec ? sourceRec.el.name : '?';
  document.getElementById('slSourceFloor').textContent = sourceFloor ? sourceFloor.name : '?';

  const tfSelect = document.getElementById('slTargetFloor');
  tfSelect.innerHTML = '';
  state.floors.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    tfSelect.appendChild(opt);
  });

  populateTargetStairs();
  document.getElementById('stairLinkModal').classList.remove('hidden');
}

function populateTargetStairs() {
  const floorId = parseInt(document.getElementById('slTargetFloor').value);
  const floor = state.floors.find(f => f.id === floorId);
  const tsSelect = document.getElementById('slTargetStair');
  tsSelect.innerHTML = '';
  if (!floor) return;
  const stairs = [];
  floor.blocks.forEach(b => {
    b.elements.forEach(el => {
      if (isVerticalConnector(el) && el.id !== _pendingStairSource.elId) {
        stairs.push({ el, blockId: b.id, floorId });
      }
    });
  });
  if (stairs.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— No staircases, elevators, or Stair Halls on this floor —';
    tsSelect.appendChild(opt);
  } else {
    stairs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.el.id;
      opt.textContent = s.el.name;
      tsSelect.appendChild(opt);
    });
  }
}

function confirmStairLink() {
  const toElId = parseInt(document.getElementById('slTargetStair').value);
  const toFloorId = parseInt(document.getElementById('slTargetFloor').value);
  if (!toElId) { alert('No target connector available on that floor.'); return; }

  const toFloor = state.floors.find(f => f.id === toFloorId);
  let toBlockId = null;
  toFloor.blocks.forEach(b => { if (b.elements.find(e => e.id === toElId)) toBlockId = b.id; });

  const exists = state.stairLinks.some(lk =>
    (lk.fromElId === _pendingStairSource.elId && lk.toElId === toElId) ||
    (lk.fromElId === toElId && lk.toElId === _pendingStairSource.elId)
  );
  if (exists) { showToast('Link already exists!'); closeStairLinkModal(); return; }

  pushHistory();
  state.stairLinks.push({
    fromElId: _pendingStairSource.elId,
    fromFloorId: _pendingStairSource.floorId,
    fromBlockId: _pendingStairSource.blockId,
    toElId,
    toFloorId,
    toBlockId
  });
  closeStairLinkModal();
  renderAll();
  showToast('Vertical connector linked!');
}

function closeStairLinkModal() {
  document.getElementById('stairLinkModal').classList.add('hidden');
}

function removeStairLinkByIndex(i) {
  pushHistory();
  state.stairLinks.splice(i, 1);
  renderAll();
  showToast('Link removed');
}

function removeStairLink(lkStr) {
  try {
    const lk = typeof lkStr === 'object' ? lkStr : JSON.parse(lkStr.replace(/'/g, '"'));
    const idx = state.stairLinks.findIndex(l => l.fromElId === lk.fromElId && l.toElId === lk.toElId);
    if (idx >= 0) {
      pushHistory();
      state.stairLinks.splice(idx, 1);
      renderAll();
      showToast('Link removed');
    }
  } catch (e) {
    console.error(e);
  }
}

function openStairManager() {
  const content = document.getElementById('stairManagerContent');
  if (!content) return;
  if (state.stairLinks.length === 0) {
    content.innerHTML = '<div class="path-empty">No stair connections have been created yet.</div>';
  } else {
    content.innerHTML = '';
    state.stairLinks.forEach((lk, i) => {
      const fromEl = getElById(lk.fromElId);
      const toEl = getElById(lk.toElId);
      const fromFloor = state.floors.find(f => f.id === lk.fromFloorId);
      const toFloor = state.floors.find(f => f.id === lk.toFloorId);
      const row = document.createElement('div');
      row.className = 'stair-link-row';
      row.innerHTML = `<span class="link-icon"><i data-lucide="chevrons-up-down" style="width:14px;height:14px;color:var(--accent-purple);"></i></span>
        <span style="flex:1;font-size:13px;">
          <b>${fromEl ? fromEl.el.name : '?'}</b> on ${fromFloor ? fromFloor.name : '?'}
          &nbsp;↔&nbsp;
          <b>${toEl ? toEl.el.name : '?'}</b> on ${toFloor ? toFloor.name : '?'}
        </span>
        <button class="danger" onclick="removeStairLinkByIndex(${i});openStairManager();"><i data-lucide="trash-2"></i> Remove</button>`;
      content.appendChild(row);
    });
  }
  document.getElementById('stairManagerModal').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

/* =================================================================
   UNIVERSAL LINKING ACTIONS
   ================================================================= */
function openUniversalLinkModal() {
  const el = getSelected();
  if (!el) { showToast('Select an element first'); return; }
  _pendingUniversalSource = { elId: el.id, floorId: state.currFloorId, blockId: state.currBlockId };

  const sourceRec = getElById(el.id);
  const sourceFloor = state.floors.find(f => f.id === state.currFloorId);
  document.getElementById('ulSourceName').textContent = sourceRec ? sourceRec.el.name : '?';
  document.getElementById('ulSourceFloor').textContent = sourceFloor ? sourceFloor.name : '?';

  const tfSelect = document.getElementById('ulTargetFloor');
  tfSelect.innerHTML = '';
  state.floors.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    tfSelect.appendChild(opt);
  });

  if (!tfSelect.options.length) {
    alert('No floors available.');
    return;
  }

  const otherFloor = state.floors.find(f => f.id !== state.currFloorId);
  if (otherFloor) tfSelect.value = otherFloor.id;

  populateUniversalTargets();
  document.getElementById('universalLinkModal').classList.remove('hidden');
}

function populateUniversalTargets() {
  const floorId = parseInt(document.getElementById('ulTargetFloor').value);
  const floor = state.floors.find(f => f.id === floorId);
  const teSelect = document.getElementById('ulTargetElement');
  teSelect.innerHTML = '';
  if (!floor) return;
  const targets = [];
  floor.blocks.forEach(b => {
    b.elements.forEach(el => {
      if (_pendingUniversalSource && el.id === _pendingUniversalSource.elId) return;
      targets.push({ el, blockId: b.id, blockName: b.name, floorId });
    });
  });
  if (targets.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— No elements on this floor —';
    teSelect.appendChild(opt);
  } else {
    targets.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.el.id;
      opt.textContent = `${t.el.name} (${t.el.type}) — ${t.blockName}`;
      teSelect.appendChild(opt);
    });
  }
}

function confirmUniversalLink() {
  const toElId = parseInt(document.getElementById('ulTargetElement').value);
  const toFloorId = parseInt(document.getElementById('ulTargetFloor').value);
  if (!toElId) { alert('No target element available.'); return; }

  const toFloor = state.floors.find(f => f.id === toFloorId);
  let toBlockId = null;
  toFloor.blocks.forEach(b => { if (b.elements.find(e => e.id === toElId)) toBlockId = b.id; });

  const exists = state.universalLinks.some(lk =>
    (lk.fromElId === _pendingUniversalSource.elId && lk.toElId === toElId) ||
    (lk.fromElId === toElId && lk.toElId === _pendingUniversalSource.elId)
  );
  const existsStair = state.stairLinks.some(lk =>
    (lk.fromElId === _pendingUniversalSource.elId && lk.toElId === toElId) ||
    (lk.fromElId === toElId && lk.toElId === _pendingUniversalSource.elId)
  );
  if (exists || existsStair) { showToast('Link already exists!'); closeUniversalLinkModal(); return; }

  pushHistory();
  state.universalLinks.push({
    id: Date.now(),
    fromElId: _pendingUniversalSource.elId,
    fromFloorId: _pendingUniversalSource.floorId,
    fromBlockId: _pendingUniversalSource.blockId,
    toElId,
    toFloorId,
    toBlockId
  });
  closeUniversalLinkModal();
  renderAll();
  showToast('Elements linked!');
}

function closeUniversalLinkModal() {
  document.getElementById('universalLinkModal').classList.add('hidden');
}

function removeUniversalLinkById(linkId) {
  pushHistory();
  state.universalLinks = state.universalLinks.filter(lk => lk.id !== linkId);
  renderAll();
  showToast('Link removed');
}

function removeUniversalLinkByIndex(i) {
  pushHistory();
  state.universalLinks.splice(i, 1);
  renderAll();
  showToast('Link removed');
}

function openUniversalLinkManager() {
  const content = document.getElementById('universalLinkManagerContent');
  if (!content) return;
  if (state.universalLinks.length === 0) {
    content.innerHTML = '<div class="path-empty">No element links have been created yet.</div>';
  } else {
    content.innerHTML = '';
    state.universalLinks.forEach((lk, i) => {
      const fromEl = getElById(lk.fromElId);
      const toEl = getElById(lk.toElId);
      const fromFloor = state.floors.find(f => f.id === lk.fromFloorId);
      const toFloor = state.floors.find(f => f.id === lk.toFloorId);
      const row = document.createElement('div');
      row.className = 'universal-link-row';
      row.innerHTML = `<span class="link-icon"><i data-lucide="link-2" style="width:14px;height:14px;color:var(--accent-teal);"></i></span>
        <span style="flex:1;font-size:13px;">
          <b>${fromEl ? fromEl.el.name : '?'}</b> on ${fromFloor ? fromFloor.name : '?'}
          &nbsp;↔&nbsp;
          <b>${toEl ? toEl.el.name : '?'}</b> on ${toFloor ? toFloor.name : '?'}
        </span>
        <button class="danger" onclick="removeUniversalLinkByIndex(${i});openUniversalLinkManager();"><i data-lucide="trash-2"></i> Remove</button>`;
      content.appendChild(row);
    });
  }
  document.getElementById('universalLinkManagerModal').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

/* =================================================================
   COLOR PRESET ACTIONS
   ================================================================= */
function setPresetColor(color) {
  const el = getSelected();
  if (el) {
    pushHistory();
    el.color = color;
    const picker = document.getElementById('pcolor');
    if (picker) picker.value = color;
    renderCanvas();
    showToast('Color updated');
  } else {
    showToast('Select an element first');
  }
}

/* =================================================================
   BRIDGE LINKING ACTIONS
   ================================================================= */
let _pendingBridgeSource = null;

function openLinkThisBridge() {
  const el = getSelected();
  if (!el) return;
  if (el.type !== 'Bridge') { showToast('Select a Bridge element first'); return; }

  const srcRec = getElById(el.id);
  const srcFloor = state.floors.find(f => f.id === state.currFloorId);
  const srcBldg = state.buildings.find(b => b.id === state.currBuildingId);

  _pendingBridgeSource = {
    elId: el.id,
    floorId: state.currFloorId,
    buildingId: state.currBuildingId
  };

  document.getElementById('blSourceName').textContent = el.name;
  document.getElementById('blSourceBuilding').textContent = srcBldg ? srcBldg.name : '?';

  // Populate target buildings (all except source building)
  const blBldgSel = document.getElementById('blTargetBuilding');
  blBldgSel.innerHTML = '';
  state.buildings.filter(b => b.id !== state.currBuildingId).forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.name;
    blBldgSel.appendChild(opt);
  });

  if (!blBldgSel.options.length) {
    alert('You need at least 2 buildings to create a bridge link. Use the Structure panel to add a second building.');
    return;
  }

  populateBridgeTargets();
  document.getElementById('bridgeLinkModal').classList.remove('hidden');
}

function populateBridgeTargets() {
  const bldgId = parseInt(document.getElementById('blTargetBuilding').value);
  const bldgFloors = state.floors.filter(f => f.buildingId === bldgId);

  const floorSel = document.getElementById('blTargetFloor');
  floorSel.innerHTML = '';
  bldgFloors.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    floorSel.appendChild(opt);
  });

  populateBridgeTargetsEl();
}

function populateBridgeTargetsEl() {
  const floorId = parseInt(document.getElementById('blTargetFloor').value);
  const bldgId  = parseInt(document.getElementById('blTargetBuilding').value);
  const floor   = state.floors.find(f => f.id === floorId);
  const elSel   = document.getElementById('blTargetElement');
  elSel.innerHTML = '';

  if (!floor) return;

  const bridges = [];
  floor.blocks.forEach(b => {
    b.elements.forEach(el => {
      if (el.type === 'Bridge' && el.id !== (_pendingBridgeSource?.elId)) {
        bridges.push({ el, blockId: b.id, floorId, buildingId: bldgId });
      }
    });
  });

  if (bridges.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— No Bridge elements on this floor —';
    elSel.appendChild(opt);
  } else {
    bridges.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.el.id;
      opt.textContent = s.el.name;
      elSel.appendChild(opt);
    });
  }
}

function confirmBridgeLink() {
  const toElId      = parseInt(document.getElementById('blTargetElement').value);
  const toFloorId   = parseInt(document.getElementById('blTargetFloor').value);
  const toBuildingId = parseInt(document.getElementById('blTargetBuilding').value);

  if (!toElId) { alert('No Bridge element available on that floor.'); return; }

  const exists = (state.bridgeLinks || []).some(lk =>
    (lk.fromElId === _pendingBridgeSource.elId && lk.toElId === toElId) ||
    (lk.fromElId === toElId && lk.toElId === _pendingBridgeSource.elId)
  );
  if (exists) { showToast('Bridge link already exists!'); closeBridgeLinkModal(); return; }

  pushHistory();
  state.bridgeLinks = state.bridgeLinks || [];
  state.bridgeLinks.push({
    id: Date.now(),
    fromElId:      _pendingBridgeSource.elId,
    fromFloorId:   _pendingBridgeSource.floorId,
    fromBuildingId: _pendingBridgeSource.buildingId,
    toElId,
    toFloorId,
    toBuildingId
  });

  closeBridgeLinkModal();
  renderAll();
  showToast('Buildings bridged! 🌉');
}

function closeBridgeLinkModal() {
  document.getElementById('bridgeLinkModal').classList.add('hidden');
}

function removeBridgeLinkById(linkId) {
  pushHistory();
  state.bridgeLinks = (state.bridgeLinks || []).filter(lk => lk.id !== linkId);
  renderAll();
  showToast('Bridge link removed');
}

function removeBridgeLinkByIndex(i) {
  pushHistory();
  (state.bridgeLinks || []).splice(i, 1);
  renderAll();
  showToast('Bridge link removed');
}

function openBridgeLinkManager() {
  const content = document.getElementById('bridgeLinkManagerContent');
  if (!content) return;
  const links = state.bridgeLinks || [];
  if (links.length === 0) {
    content.innerHTML = '<div class="path-empty">No bridge connections have been created yet.</div>';
  } else {
    content.innerHTML = '';
    links.forEach((lk, i) => {
      const fromEl   = getElById(lk.fromElId);
      const toEl     = getElById(lk.toElId);
      const fromBldg = state.buildings.find(b => b.id === lk.fromBuildingId);
      const toBldg   = state.buildings.find(b => b.id === lk.toBuildingId);
      const row = document.createElement('div');
      row.className = 'stair-link-row';
      row.innerHTML = `<span class="link-icon" style="font-size:18px;">🌉</span>
        <span style="flex:1;font-size:13px;">
          <b>${fromEl ? fromEl.el.name : '?'}</b> (${fromBldg ? fromBldg.name : '?'})
          &nbsp;↔&nbsp;
          <b>${toEl ? toEl.el.name : '?'}</b> (${toBldg ? toBldg.name : '?'})
        </span>
        <button class="danger" onclick="removeBridgeLinkByIndex(${i});openBridgeLinkManager();"><i data-lucide="trash-2"></i> Remove</button>`;
      content.appendChild(row);
    });
  }
  document.getElementById('bridgeLinkManagerModal').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

