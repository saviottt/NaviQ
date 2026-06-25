
/* =================================================================
   RENDERING
   ================================================================= */
function renderAll() {
  renderStructure();
  renderCanvas();
  updatePropsPanel();
  renderStairLinksPanel();
  renderUniversalLinksPanel();
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderStructure() {
  const list = document.getElementById('floorsList');
  if (!list) return;
  list.innerHTML = '';
  state.buildings.forEach(bldg => {
    const bDiv = document.createElement('div');
    bDiv.className = 'item' + (bldg.id === state.currBuildingId ? ' current' : '');
    bDiv.innerHTML = `
      <div style="display:flex;align-items:center;width:100%;">
        <i data-lucide="building" style="width:14px;height:14px;opacity:0.8;margin-right:8px;"></i>
        <span style="flex:1;">${bldg.name}</span>
        <button class="icon-btn" style="background:transparent;border:none;color:var(--text-color);cursor:pointer;padding:2px;" onclick="renameBuilding(event, ${bldg.id})" title="Rename Building">
          <i data-lucide="edit-2" style="width:12px;height:12px;"></i>
        </button>
        <button class="icon-btn" style="background:transparent;border:none;color:var(--text-color);cursor:pointer;padding:2px;" onclick="deleteBuilding(event, ${bldg.id})" title="Delete Building">
          <i data-lucide="trash-2" style="width:12px;height:12px;color:#ef4444;"></i>
        </button>
      </div>
    `;
    bDiv.onclick = () => {
      state.currBuildingId = bldg.id;
      const bldgFloors = state.floors.filter(f => f.buildingId === bldg.id);
      if (bldgFloors.length > 0) {
        state.currFloorId = bldgFloors[0].id;
        state.currBlockId = bldgFloors[0].blocks[0].id;
      } else {
        state.currFloorId = null;
        state.currBlockId = null;
      }
      state.selectedIds = [];
      renderAll();
    };
    list.appendChild(bDiv);

    if (bldg.id === state.currBuildingId) {
      const bldgFloors = state.floors.filter(f => f.buildingId === bldg.id);
      bldgFloors.forEach((f, floorIndex) => {
        const canMoveUp = floorIndex > 0;
        const canMoveDown = floorIndex < bldgFloors.length - 1;
        const moveUpDisabled = canMoveUp ? "" : "disabled";
        const moveDownDisabled = canMoveDown ? "" : "disabled";
        const fDiv = document.createElement('div');
        fDiv.className = 'item item-sub' + (f.id === state.currFloorId ? ' current' : '');
        fDiv.innerHTML = `
          <div style="display:flex;align-items:center;width:100%;">
            <i data-lucide="layers" style="width:14px;height:14px;opacity:0.8;margin-right:8px;"></i>
            <span style="flex:1;">${f.name}</span>
            <button class="icon-btn" style="background:transparent;border:none;color:var(--text-color);cursor:pointer;padding:2px;opacity:${canMoveUp ? 1 : 0.35};" onclick="moveFloor(event, ${f.id}, -1)" title="Move Floor Up" ${moveUpDisabled}>
              <i data-lucide="chevron-up" style="width:12px;height:12px;"></i>
            </button>
            <button class="icon-btn" style="background:transparent;border:none;color:var(--text-color);cursor:pointer;padding:2px;opacity:${canMoveDown ? 1 : 0.35};" onclick="moveFloor(event, ${f.id}, 1)" title="Move Floor Down" ${moveDownDisabled}>
              <i data-lucide="chevron-down" style="width:12px;height:12px;"></i>
            </button>
            <button class="icon-btn" style="background:transparent;border:none;color:var(--text-color);cursor:pointer;padding:2px;" onclick="renameFloor(event, ${f.id})" title="Rename Floor">
              <i data-lucide="edit-2" style="width:12px;height:12px;"></i>
            </button>
            <button class="icon-btn" style="background:transparent;border:none;color:var(--text-color);cursor:pointer;padding:2px;" onclick="deleteFloor(event, ${f.id})" title="Delete Floor">
              <i data-lucide="trash-2" style="width:12px;height:12px;color:#ef4444;"></i>
            </button>
          </div>
        `;
        fDiv.onclick = (e) => {
          e.stopPropagation();
          state.currFloorId = f.id;
          state.currBlockId = f.blocks[0].id;
          state.selectedIds = [];
          renderAll();
        };
        list.appendChild(fDiv);
      });
    }
  });
}

function renderCanvas() {
  const canvasEl = getCanvas();
  if (!canvasEl) return;
  const svg = document.getElementById('pathArrowSvg');
  const svgHtml = svg ? svg.outerHTML : '';
  canvasEl.innerHTML = svgHtml || '<svg id="pathArrowSvg" xmlns="http://www.w3.org/2000/svg"></svg>';

  const preview = document.createElement('div');
  preview.id = 'wallDrawPreview';
  canvasEl.appendChild(preview);

  const fragment = document.createDocumentFragment();

  const floorWalls = state.walls.filter(w => w.floorId === state.currFloorId);
  floorWalls.forEach(wall => {
    const div = document.createElement('div');
    div.className = 'wall-element';
    if (wall.id === state.selectedWallId) div.classList.add('selected');
    div.id = 'wall-' + wall.id;
    const isHoriz = wall.w >= wall.h;
    const displayW = isHoriz ? wall.w : Math.max(wall.w, 8);
    const displayH = isHoriz ? Math.max(wall.h, 8) : wall.h;
    div.style.cssText = `left:${wall.x}px;top:${wall.y}px;width:${displayW}px;height:${displayH}px;`;
    div.title = 'Wall — click to select, Del to delete';

    const delBtn = document.createElement('button');
    delBtn.className = 'wall-del-btn';
    delBtn.textContent = '✕';
    delBtn.title = 'Delete wall';
    delBtn.onmousedown = e => { e.stopPropagation(); };
    delBtn.onclick = e => {
      e.stopPropagation();
      state.selectedWallId = wall.id;
      deleteSelectedWall();
    };
    div.appendChild(delBtn);

    const faces = document.createElement('div');
    faces.className = 'faces';
    div.appendChild(faces);

    const re = document.createElement('div');
    re.className = 'wall-resize-end';
    if (isHoriz) {
      re.style.cssText = 'right:-5px;top:50%;transform:translateY(-50%);cursor:ew-resize;';
    } else {
      re.style.cssText = 'bottom:-5px;left:50%;transform:translateX(-50%);cursor:ns-resize;';
    }
    re.onmousedown = e => startWallResize(e, wall, isHoriz ? 'h' : 'v');
    div.appendChild(re);

    div.onmousedown = e => {
      if (e.target === re || e.target === delBtn) return;
      e.stopPropagation();
      state.selectedIds = [];
      state.selectedWallId = wall.id;
      if (state.is3D) {
        renderAll();
        return;
      }
      renderAll();
      startWallDrag(e, wall);
    };
    fragment.appendChild(div);
  });

  const currentFloor = curFloor();
  if (currentFloor) {
    currentFloor.blocks.forEach(block => {
      block.elements.forEach(el => {
        const div = document.createElement('div');
        div.className = 'element';
        if (state.selectedIds.includes(el.id)) div.classList.add('selected');
        if (el.isStairs || el.type === 'Staircase') {
          div.classList.add('staircase-pattern', 'staircase-element');

          const isHoriz = el.w >= el.h;
          const steps = 6;
          const isUp = el.stairDir !== 'down';
          for (let s = 0; s < steps; s++) {
            const step = document.createElement('div');
            step.className = 'stair-step-block staircase-pattern';
            step.style.backgroundColor = el.color;
            if (isHoriz) {
              step.style.width = (el.w / steps) + 'px';
              step.style.height = '100%';
              step.style.left = (s * (el.w / steps)) + 'px';
              step.style.top = '0';
            } else {
              step.style.width = '100%';
              step.style.height = (el.h / steps) + 'px';
              step.style.left = '0';
              step.style.top = (s * (el.h / steps)) + 'px';
            }
            const heightIdx = isUp ? (s + 1) : (steps - s);
            const zHeight = (heightIdx / steps) * 40;
            step.style.setProperty('--z-depth', `${zHeight}px`);
            step.style.transform = `translateZ(${zHeight}px)`;

            const sFaces = document.createElement('div');
            sFaces.className = 'faces';
            step.appendChild(sFaces);
            div.appendChild(step);
          }
        }
        if (el.type === 'door' || el.name === 'Door') div.classList.add('door-element');
        if (el.type === 'window' || el.name === 'Window') div.classList.add('window-element');
        if (el.type === 'entry_exit' || el.name === 'Entry/Exit') div.classList.add('entry-exit-element');
        if (el.type === 'waypoint' || el.name === 'Waypoint') div.classList.add('waypoint-element');
        if (el.type === 'text' || el.name === 'Text Label') div.classList.add('text-element');

        const hasLinks = state.stairLinks.some(lk => lk.fromElId === el.id || lk.toElId === el.id);
        if (hasLinks) div.classList.add('stair-linked');

        const hasULinks = state.universalLinks.some(lk => lk.fromElId === el.id || lk.toElId === el.id);
        if (hasULinks) div.classList.add('universal-linked');

        div.id = 'el-' + el.id;
        let elevation = 0;
        if (el.isStairs || el.type === 'Staircase') {
          elevation = (el.stairElevation || 0);
        }
        const transformStr = state.is3D
          ? `rotate(${el.r || 0}deg) translateZ(calc(var(--z-depth, 12px) + ${elevation}px))`
          : `rotate(${el.r || 0}deg)`;
        div.style.cssText = `left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;background-color:${el.color};transform:${transformStr};z-index:${state.selectedIds.includes(el.id) ? 100 : 1};`;

        const faces = document.createElement('div');
        faces.className = 'faces';
        div.appendChild(faces);

        if (el.type && el.type.startsWith('Corridor-')) {
          div.classList.add('corridor-shaped');
          div.style.backgroundColor = 'transparent';
          div.style.border = 'none';
          div.style.outline = 'none';
          div.style.boxShadow = 'none';
          const svg = buildCorridorSvg(el);
          div.appendChild(svg);
        }

        if (hasLinks) {
          const links = state.stairLinks.filter(lk => lk.fromElId === el.id || lk.toElId === el.id);
          const badge = document.createElement('div');
          badge.className = 'stair-badge';
          const floorNums = new Set();
          links.forEach(lk => {
            const otherFloorId = lk.fromElId === el.id ? lk.toFloorId : lk.fromFloorId;
            const f = state.floors.find(fl => fl.id === otherFloorId);
            if (f) floorNums.add(f.name.replace('Floor', 'Fl').replace('Ground', 'G'));
          });
          badge.textContent = '🪜 ' + [...floorNums].join(', ');
          div.appendChild(badge);
        }

        if (hasULinks) {
          const ulinks = state.universalLinks.filter(lk => lk.fromElId === el.id || lk.toElId === el.id);
          const ubadge = document.createElement('div');
          ubadge.className = 'universal-badge';
          const ufloorNums = new Set();
          ulinks.forEach(lk => {
            const otherFloorId = lk.fromElId === el.id ? lk.toFloorId : lk.fromFloorId;
            const otherElId = lk.fromElId === el.id ? lk.toElId : lk.fromElId;
            const f = state.floors.find(fl => fl.id === otherFloorId);
            const otherEl = getElById(otherElId);
            if (f) ufloorNums.add((otherEl ? otherEl.el.name : '?') + ' (' + f.name.replace('Floor', 'Fl').replace('Ground', 'G') + ')');
          });
          ubadge.textContent = '🔗 ' + [...ufloorNums].join(', ');
          div.appendChild(ubadge);
        }

        const isCorridor = el.type === 'Corridor' || (el.type && el.type.startsWith('Corridor-'));
        const isStair = el.isStairs || el.type === 'Staircase';
        const isDoorOrWindow = el.type === 'door' || el.type === 'window' || el.type === 'entry_exit' || el.type === 'waypoint';

        if (!isCorridor && !isStair && !isDoorOrWindow) {
          const lbl = document.createElement('div');
          lbl.className = 'label';
          lbl.textContent = el.name;
          lbl.dataset.rot = el.r || 0;
          lbl.style.setProperty('--el-rot', `${el.r || 0}deg`);
          div.appendChild(lbl);
        }

        const dims = document.createElement('div');
        dims.className = 'dims-tag';
        dims.id = 'dims-' + el.id;
        dims.textContent = `${el.w} × ${el.h}`;
        div.appendChild(dims);

        ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].forEach(dir => {
          const h = document.createElement('div');
          h.className = 'resize ' + dir;
          h.onmousedown = e => startResize(e, el, dir);
          div.appendChild(h);
        });

        div.onmousedown = e => {
          state.currBlockId = block.id;
          if (state.is3D) {
            state.selectedIds = [el.id];
            state.selectedWallId = null;
            renderAll();
            e.stopPropagation();
            return;
          }
          startDrag(e, el);
        };
        fragment.appendChild(div);
      });
    });
  }
  canvasEl.appendChild(fragment);
  applyCanvasTransform();
}

function updatePropsPanel() {
  const panel = document.getElementById('propsPanel');
  const actionsPanel = document.getElementById('actionsPanel');

  if (actionsPanel) {
    if (state.selectedIds && state.selectedIds.length > 0) {
      actionsPanel.style.display = 'block';
    } else {
      actionsPanel.style.display = 'none';
    }
  }

  if (!panel) return;
  if (state.selectedIds && state.selectedIds.length > 1) {
    panel.style.display = 'none';
    return;
  }
  const el = getSelected();
  if (!el) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  document.getElementById('pname').value = el.name;

  let shapeInfo = document.getElementById('pShapeInfo');
  if (!shapeInfo) {
    shapeInfo = document.createElement('div');
    shapeInfo.id = 'pShapeInfo';
    shapeInfo.style.cssText = 'font-size:11px;background:#e8f4fd;border:1px solid #a0c4e8;border-radius:4px;padding:4px 8px;margin-bottom:8px;color:#1a6aaa;font-weight:600;display:none;';
    document.getElementById('pname').parentNode.insertBefore(shapeInfo, document.getElementById('pname'));
  }
  const shapeNames = { 'Corridor-Triangle': '▲ Triangle Corridor', 'Corridor-Circle': '◯ Oval Corridor', 'Corridor-Cross': '✚ Cross Corridor' };
  if (shapeNames[el.type]) {
    shapeInfo.textContent = shapeNames[el.type];
    shapeInfo.style.display = 'block';
  } else {
    shapeInfo.style.display = 'none';
  }
  document.getElementById('pwidth').value = el.w;
  document.getElementById('pheight').value = el.h;
  document.getElementById('px').value = el.x;
  document.getElementById('py').value = el.y;
  document.getElementById('prot').value = el.r;
  document.getElementById('pcolor').value = el.color;
  document.getElementById('pisStairs').checked = el.isStairs || false;

  const stairDirRow = document.getElementById('stairDirRow');
  const stairElevationRow = document.getElementById('stairElevationRow');
  if (el.type === 'Staircase' || el.isStairs) {
    stairDirRow.style.display = 'flex';
    stairElevationRow.style.display = 'flex';
    document.getElementById('pstairDir').value = el.stairDir || 'up';
    document.getElementById('pstairElevation').value = el.stairElevation || 0;
  } else {
    stairDirRow.style.display = 'none';
    stairElevationRow.style.display = 'none';
  }

  const stairSection = document.getElementById('stairLinkSection');
  if (isVerticalConnector(el)) {
    stairSection.style.display = 'block';
    renderCurrentStairLinks(el);
  } else {
    stairSection.style.display = 'none';
  }

  renderCurrentUniversalLinks(el);
}

function renderCurrentStairLinks(el) {
  const container = document.getElementById('stairCurrentLinks');
  if (!container) return;
  container.innerHTML = '';
  const links = state.stairLinks.filter(lk => lk.fromElId === el.id || lk.toElId === el.id);
  if (links.length === 0) {
    container.innerHTML = '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">No connections yet.</div>';
    return;
  }
  links.forEach(lk => {
    const isFrom = lk.fromElId === el.id;
    const otherElId = isFrom ? lk.toElId : lk.fromElId;
    const otherFloorId = isFrom ? lk.toFloorId : lk.fromFloorId;
    const otherEl = getElById(otherElId);
    const otherFloor = state.floors.find(f => f.id === otherFloorId);
    const chip = document.createElement('div');
    chip.className = 'stair-link-chip';
    chip.innerHTML = `<i data-lucide="chevrons-up-down" style="width:12px;height:12px;color:var(--accent-purple);"></i> <span>${otherEl ? otherEl.el.name : '?'} on ${otherFloor ? otherFloor.name : '?'}</span>
      <span class="remove-link" onclick="removeStairLink(${JSON.stringify(lk).replace(/"/g, "'")})">✕</span>`;
    container.appendChild(chip);
  });
}

function renderStairLinksPanel() {
  const panel = document.getElementById('stairLinksList');
  if (!panel) return;
  if (state.stairLinks.length === 0) {
    panel.innerHTML = '<div class="empty-state">No vertical connections yet. Select a Staircase, Elevator, or Stair Hall on the canvas.</div>';
    return;
  }
  panel.innerHTML = '';
  state.stairLinks.forEach((lk, i) => {
    const fromEl = getElById(lk.fromElId);
    const toEl = getElById(lk.toElId);
    const fromFloor = state.floors.find(f => f.id === lk.fromFloorId);
    const toFloor = state.floors.find(f => f.id === lk.toFloorId);
    const row = document.createElement('div');
    row.className = 'stair-link-row';
    row.innerHTML = `<span class="link-icon"><i data-lucide="chevrons-up-down" style="width:14px;height:14px;color:var(--accent-purple);"></i></span>
      <span style="flex:1;font-size:12px;line-height:1.4;">
        <b>${fromEl ? fromEl.el.name : '?'}</b> (${fromFloor ? fromFloor.name : '?'})
        <br><span style="color:var(--text-muted);">↕</span> <b>${toEl ? toEl.el.name : '?'}</b> (${toFloor ? toFloor.name : '?'})
      </span>
      <button class="danger" style="padding:4px;width:24px;height:24px;" onclick="removeStairLinkByIndex(${i})"><i data-lucide="trash-2"></i></button>`;
    panel.appendChild(row);
  });
}

function renderCurrentUniversalLinks(el) {
  const container = document.getElementById('universalCurrentLinks');
  if (!container) return;
  container.innerHTML = '';
  const links = state.universalLinks.filter(lk => lk.fromElId === el.id || lk.toElId === el.id);
  if (links.length === 0) {
    container.innerHTML = '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">No element links yet.</div>';
    return;
  }
  links.forEach(lk => {
    const isFrom = lk.fromElId === el.id;
    const otherElId = isFrom ? lk.toElId : lk.fromElId;
    const otherFloorId = isFrom ? lk.toFloorId : lk.fromFloorId;
    const otherEl = getElById(otherElId);
    const otherFloor = state.floors.find(f => f.id === otherFloorId);
    const chip = document.createElement('div');
    chip.className = 'universal-link-chip';
    chip.innerHTML = `<i data-lucide="link-2" style="width:12px;height:12px;color:var(--accent-teal);"></i> <span>${otherEl ? otherEl.el.name : '?'} on ${otherFloor ? otherFloor.name : '?'}</span>
      <span class="remove-link" onclick="removeUniversalLinkById(${lk.id})">✕</span>`;
    container.appendChild(chip);
  });
}

function renderUniversalLinksPanel() {
  const panel = document.getElementById('universalLinksList');
  if (!panel) return;
  if (state.universalLinks.length === 0) {
    panel.innerHTML = '<div class="empty-state">No element links yet. Select any element and use \"Link to Element\".</div>';
    return;
  }
  panel.innerHTML = '';
  state.universalLinks.forEach((lk, i) => {
    const fromEl = getElById(lk.fromElId);
    const toEl = getElById(lk.toElId);
    const fromFloor = state.floors.find(f => f.id === lk.fromFloorId);
    const toFloor = state.floors.find(f => f.id === lk.toFloorId);
    const row = document.createElement('div');
    row.className = 'universal-link-row';
    row.innerHTML = `<span class="link-icon"><i data-lucide="link-2" style="width:14px;height:14px;color:var(--accent-teal);"></i></span>
      <span style="flex:1;font-size:12px;line-height:1.4;">
        <b>${fromEl ? fromEl.el.name : '?'}</b> (${fromFloor ? fromFloor.name : '?'})
        <br><span style="color:var(--text-muted);">↔</span> <b>${toEl ? toEl.el.name : '?'}</b> (${toFloor ? toFloor.name : '?'})
      </span>
      <button class="danger" style="padding:4px;width:24px;height:24px;" onclick="removeUniversalLinkByIndex(${i})"><i data-lucide="trash-2"></i></button>`;
    panel.appendChild(row);
  });
}

function drawPathArrows(path, edges, activeFloorId, animateLines) {
  const svg = document.getElementById('pathArrowSvg');
  if (!svg) return;
  svg.innerHTML = '';

  let visualPath = [...path];
  if (visualPath.length > 2) {
    const startRec = getElById(visualPath[0]);
    const nextRec = getElById(visualPath[1]);
    if (startRec && !['door', 'window', 'corridor'].includes((startRec.el.type || '').toLowerCase()) && !startRec.el.isStairs) {
      if (nextRec && ['door', 'window'].includes((nextRec.el.type || '').toLowerCase())) {
        visualPath.shift();
      }
    }
    const endRec = getElById(visualPath[visualPath.length - 1]);
    const prevRec = getElById(visualPath[visualPath.length - 2]);
    if (endRec && !['door', 'window', 'corridor'].includes((endRec.el.type || '').toLowerCase()) && !endRec.el.isStairs) {
      if (prevRec && ['door', 'window'].includes((prevRec.el.type || '').toLowerCase())) {
        visualPath.pop();
      }
    }
  }
  path = visualPath;

  const R = 14;

  const onFloor = path.filter(elId => {
    const rec = getElById(elId);
    return rec && rec.floorId === activeFloorId;
  });
  if (onFloor.length === 0) return;

  let stairExitElId = null;
  let nextFloorId = null;
  let exitEdgeType = null;
  for (let i = 0; i < path.length - 1; i++) {
    const fromRec = getElById(path[i]);
    const toRec = getElById(path[i + 1]);
    const edge = edges.find(e => e.to === path[i + 1]);
    if (fromRec && fromRec.floorId === activeFloorId &&
      toRec && toRec.floorId !== activeFloorId &&
      edge && (edge.type === 'stair' || edge.type === 'universal')) {
      stairExitElId = path[i];
      nextFloorId = toRec.floorId;
      exitEdgeType = edge.type;
      break;
    }
  }

  function buildPolyline() {
    const pts = [];

    function clampToRect(px, py, el) {
      return {
        x: Math.max(el.x, Math.min(el.x + el.w, px)),
        y: Math.max(el.y, Math.min(el.y + el.h, py))
      };
    }

    function exitPoint(el, gate, idx) {
      let cx, cy;

      const prevRec = idx > 0
        ? getElById(onFloor[idx - 1])
        : null;

      const nextRec = idx < onFloor.length - 1
        ? getElById(onFloor[idx + 1])
        : null;

      const isCorridor =
        (el.type === 'Corridor') ||
        ((el.type || '').startsWith('Corridor-'));

      // Special handling for corridor: stay on corridor lane
      if (isCorridor && prevRec && nextRec) {
        const gate1 = getSharedWallMidpoint(prevRec.el, el);
        const gate2 = getSharedWallMidpoint(el, nextRec.el);

        if (
          gate1 &&
          gate2 &&
          Math.abs(gate1.x - gate2.x) >= Math.abs(gate1.y - gate2.y)
        ) {
          cx = (gate1.x + gate2.x) / 2;
          cy = gate1.y;
        } else if (gate1 && gate2) {
          cx = gate1.x;
          cy = (gate1.y + gate2.y) / 2;
        } else {
          cx = el.x + el.w / 2;
          cy = el.y + el.h / 2;
        }
      } else {
        cx = el.x + el.w / 2;
        cy = el.y + el.h / 2;
      }

      // Entry/Exit override
      const rec = getElById(el.id);
      if (rec) {
        const floor = state.floors.find(f => f.id === rec.floorId);
        const floorEls = floor ? floor.blocks.flatMap(bl => bl.elements) : [];

        const customPt = floorEls.find(item =>
          (item.type === 'entry_exit' || item.name === 'Entry/Exit') &&
          rectsOverlapOrTouch(item, el, 6)
        );

        if (customPt) {
          cx = customPt.x + customPt.w / 2;
          cy = customPt.y + customPt.h / 2;
        }
      }

      if (!gate) {
        return { x: cx, y: cy };
      }

      if (gate.axis === 'v') {
        const ex = (gate.x <= cx) ? el.x : el.x + el.w;
        const ey = Math.max(el.y, Math.min(el.y + el.h, gate.y));
        return { x: ex, y: ey };
      }

      if (gate.axis === 'h') {
        const ey = (gate.y <= cy) ? el.y : el.y + el.h;
        const ex = Math.max(el.x, Math.min(el.x + el.w, gate.x));
        return { x: ex, y: ey };
      }

      return { x: cx, y: cy };
    }

    for (let i = 0; i < onFloor.length; i++) {
      const rec = getElById(onFloor[i]);
      if (!rec) continue;
      const el = rec.el;
      let cx = el.x + el.w / 2, cy = el.y + el.h / 2;

      // Find if this space has an Entry/Exit point inside/touching it
      const floor = state.floors.find(f => f.id === rec.floorId);
      const floorEls = floor ? floor.blocks.flatMap(bl => bl.elements) : [];
      const customPt = floorEls.find(item =>
        (item.type === 'entry_exit' || item.name === 'Entry/Exit') &&
        rectsOverlapOrTouch(item, el, 6)
      );
      if (customPt) {
        cx = customPt.x + customPt.w / 2;
        cy = customPt.y + customPt.h / 2;
      }

      if (i === 0) {
        pts.push({ x: cx, y: cy, elId: onFloor[i], isGate: false });
      }

      if (i < onFloor.length - 1) {
        const nextRec = getElById(onFloor[i + 1]);
        if (!nextRec) continue;
        const nel = nextRec.el;
        const gate = getSharedWallMidpoint(el, nel);
        let ncx, ncy;

        const nextIsCorridor =
          nel.type === 'Corridor' ||
          ((nel.type || '').startsWith('Corridor-'));

        if (nextIsCorridor) {
          const corridorPt = exitPoint(nel, gate, i + 1);
          ncx = corridorPt.x;
          ncy = corridorPt.y;
        } else {
          ncx = nel.x + nel.w / 2;
          ncy = nel.y + nel.h / 2;
        }

        // Find if next space has an Entry/Exit point inside/touching it
        const ncustomPt = floorEls.find(item =>
          (item.type === 'entry_exit' || item.name === 'Entry/Exit') &&
          rectsOverlapOrTouch(item, nel, 6)
        );
        if (ncustomPt) {
          ncx = ncustomPt.x + ncustomPt.w / 2;
          ncy = ncustomPt.y + ncustomPt.h / 2;
        }



        if (gate.axis === 'o' || gate.axis === 'f') {
          pts.push({
            x: gate.x ?? ncx,
            y: gate.y ?? ncy,
            isGate: true
          });
        } else {
          const exitA = exitPoint(el, gate, i);
          const entryB = exitPoint(nel, gate, i + 1);

          pts.push({
            x: (exitA.x + entryB.x) / 2,
            y: (exitA.y + entryB.y) / 2,
            isGate: true
          });
        }

        pts.push({ x: ncx, y: ncy, elId: onFloor[i + 1], isGate: false });
      }
    }

    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i], prev = out[out.length - 1];
      if (Math.abs(p.x - prev.x) > 0.5 || Math.abs(p.y - prev.y) > 0.5) out.push(p);
    }
    return out;
  }

  const polyPts = buildPolyline();

  const segments = [];
  let segStart = 0;
  for (let i = 1; i < polyPts.length; i++) {
    if (!polyPts[i].isGate) {
      const segPts = polyPts.slice(segStart, i + 1);
      const srcElId = polyPts[segStart].elId;
      const destElId = polyPts[i].elId;
      const isStairSeg = !!(destElId && destElId === stairExitElId && exitEdgeType === 'stair');
      const isUniversalSeg = !!(destElId && destElId === stairExitElId && exitEdgeType === 'universal');

      const srcIsGlobalFirst = (srcElId === path[0]);
      const destIsGlobalLast = (destElId === path[path.length - 1]);

      const subSegs = [];
      for (let k = 0; k < segPts.length - 1; k++) {
        let x1 = segPts[k].x, y1 = segPts[k].y;
        let x2 = segPts[k + 1].x, y2 = segPts[k + 1].y;
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len, uy = dy / len;
        if (k === 0 && !segPts[k].isGate && srcIsGlobalFirst) { x1 += ux * R; y1 += uy * R; }
        const isLast = k === segPts.length - 2;
        if (isLast && !segPts[k + 1].isGate && destIsGlobalLast) { x2 -= ux * (R + 2); y2 -= uy * (R + 2); }
        const segLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        if (segLen > 0.5) subSegs.push({ x1, y1, x2, y2, segLen });
      }

      segments.push({
        subSegs, destElId, isStairSeg, isUniversalSeg,
        totalLen: subSegs.reduce((s, ss) => s + ss.segLen, 0)
      });
      segStart = i;
    }
  }

  const nodeGs = [];
  onFloor.forEach(elId => {
    const rec = getElById(elId);
    if (!rec) return;
    const pathIdx = path.indexOf(elId);
    const isFirst = (pathIdx === 0);
    const isLast = (pathIdx === path.length - 1);
    if (!isFirst && !isLast) {
      nodeGs.push({ g: null, elId, pathIdx });
      return;
    }
    let cx = rec.el.x + rec.el.w / 2, cy = rec.el.y + rec.el.h / 2;
    const floor = state.floors.find(f => f.id === rec.floorId);
    const floorEls = floor ? floor.blocks.flatMap(bl => bl.elements) : [];
    const customPt = floorEls.find(item =>
      (item.type === 'entry_exit' || item.name === 'Entry/Exit') &&
      rectsOverlapOrTouch(item, rec.el, 6)
    );
    if (customPt) {
      cx = customPt.x + customPt.w / 2;
      cy = customPt.y + customPt.h / 2;
    }
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    if (animateLines) g.style.opacity = '0';
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', R);
    circle.className.baseVal = 'path-node-circle ' + (isFirst ? 'start-circle' : 'end-circle');
    g.appendChild(circle);
    if (isFirst) {
      const iconG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      iconG.setAttribute('transform', `translate(${cx - 7}, ${cy - 9}) scale(0.875)`);
      iconG.setAttribute('fill', '#27ae60');
      const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      head.setAttribute('cx', '8'); head.setAttribute('cy', '4'); head.setAttribute('r', '3.5');
      iconG.appendChild(head);
      const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      body.setAttribute('d', 'M3,20 C3,13 13,13 13,20');
      iconG.appendChild(body);
      g.appendChild(iconG);
    } else {
      const iconG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      iconG.setAttribute('transform', `translate(${cx - 6}, ${cy - 10}) scale(0.75)`);
      iconG.setAttribute('fill', '#e74c3c');
      const pin = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pin.setAttribute('d', 'M8,0 C4.7,0 2,2.7 2,6 C2,10.5 8,16 8,16 C8,16 14,10.5 14,6 C14,2.7 11.3,0 8,0 Z');
      iconG.appendChild(pin);
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', '8'); dot.setAttribute('cy', '6'); dot.setAttribute('r', '2.2');
      dot.setAttribute('fill', '#fff');
      iconG.appendChild(dot);
      g.appendChild(iconG);
    }
    svg.appendChild(g);
    nodeGs.push({ g, elId, pathIdx });
  });

  let stairLabelEl = null;
  if (stairExitElId) {
    const exitRec = getElById(stairExitElId);
    const toFloor = state.floors.find(f => f.id === nextFloorId);
    if (exitRec) {
      const cx = exitRec.el.x + exitRec.el.w / 2;
      const cy = exitRec.el.y + exitRec.el.h / 2;
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('x', cx); lbl.setAttribute('y', cy + 28);
      lbl.className.baseVal = 'path-floor-badge';
      const exitIcon = exitEdgeType === 'universal' ? '\ud83d\udd17' : '\ud83e\ude9c';
      lbl.textContent = exitIcon + ' \u2192 ' + (toFloor?.name || 'Next Floor');
      if (animateLines) lbl.style.opacity = '0';
      svg.appendChild(lbl);
      stairLabelEl = lbl;
    }
  }

  if (!animateLines) {
    segments.forEach(({ subSegs, isStairSeg, isUniversalSeg }) => {
      subSegs.forEach(ss => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', ss.x1); line.setAttribute('y1', ss.y1);
        line.setAttribute('x2', ss.x2); line.setAttribute('y2', ss.y2);
        const lineClass = isStairSeg ? ' stair-line' : isUniversalSeg ? ' universal-line' : '';
        line.className.baseVal = 'path-arrow-line' + lineClass;
        svg.appendChild(line);
      });
    });
    nodeGs.forEach(({ g }) => { if (g) g.style.opacity = '1'; });
    if (stairLabelEl) stairLabelEl.style.opacity = '1';
    return;
  }

  const firstNodeG = nodeGs.find(n => n.elId === onFloor[0]);
  if (firstNodeG && firstNodeG.g) firstNodeG.g.style.opacity = '1';

  const SPEED_PX_PER_MS = 0.35;
  let segIdx = 0;

  function animateSegment() {
    if (segIdx >= segments.length) {
      nodeGs.forEach(({ g }) => { if (g) g.style.opacity = '1'; });
      if (stairLabelEl) stairLabelEl.style.opacity = '1';
      return;
    }

    const seg = segments[segIdx];
    let subIdx = 0;

    function animateSubSeg() {
      if (subIdx >= seg.subSegs.length) {
        if (seg.destElId) {
          const nodeG = nodeGs.find(n => n.elId === seg.destElId);
          if (nodeG && nodeG.g) nodeG.g.style.opacity = '1';
        }
        segIdx++;

        if ((seg.isStairSeg || seg.isUniversalSeg) && nextFloorId !== null) {
          if (stairLabelEl) stairLabelEl.style.opacity = '1';
          setTimeout(() => {
            const nextFloor = state.floors.find(f => f.id === nextFloorId);
            const canvasEl = document.getElementById('canvas');
            canvasEl.style.transition = 'opacity 0.3s';
            canvasEl.style.opacity = '0';
            setTimeout(() => {
              state.currFloorId = nextFloorId;
              state.currBlockId = nextFloor?.blocks[0]?.id || state.currBlockId;
              state.selectedIds = [];
              renderAll();
              setTimeout(() => {
                canvasEl.style.opacity = '1';
                drawPathArrows(_pathState.path, _pathState.edges, nextFloorId, true);
                applyPathHighlights(_pathState.path, nextFloorId);
                buildFloorBar(_pathState.path, _pathState.edges, nextFloorId);
              }, 60);
            }, 300);
          }, 600);
          return;
        }

        animateSegment();
        return;
      }

      const ss = seg.subSegs[subIdx];
      const duration = ss.segLen / SPEED_PX_PER_MS;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', ss.x1); line.setAttribute('y1', ss.y1);
      line.setAttribute('x2', ss.x2); line.setAttribute('y2', ss.y2);
      const lineClass = seg.isStairSeg ? ' stair-line' : seg.isUniversalSeg ? ' universal-line' : '';
      line.className.baseVal = 'path-arrow-line' + lineClass;
      line.style.strokeDasharray = `${ss.segLen} ${ss.segLen}`;
      line.style.strokeDashoffset = `${ss.segLen}`;
      line.style.animation = 'none';
      svg.appendChild(line);

      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        line.style.strokeDashoffset = ss.segLen * (1 - progress);
        if (progress < 1) { requestAnimationFrame(step); return; }

        line.style.strokeDasharray = '';
        line.style.strokeDashoffset = '';
        line.style.animation = '';

        subIdx++;
        animateSubSeg();
      }
      requestAnimationFrame(step);
    }

    animateSubSeg();
  }

  animateSegment();
}

function buildFloorBar(path, edges, activeFloorId) {
  const bar = document.getElementById('pathFloorBar');
  if (!bar) return;
  const floorsSeen = [];
  const floorSet = new Set();
  path.forEach(elId => {
    const rec = getElById(elId);
    if (rec && !floorSet.has(rec.floorId)) {
      floorSet.add(rec.floorId);
      const floor = state.floors.find(f => f.id === rec.floorId);
      floorsSeen.push({ id: rec.floorId, name: floor?.name || 'Floor' });
    }
  });

  if (floorsSeen.length <= 1) { bar.style.display = 'none'; return; }

  bar.innerHTML = '<span style="display:flex;align-items:center;gap:6px;color:var(--text-secondary);font-weight:600;"><i data-lucide="map" style="width:14px;height:14px;color:var(--accent-primary);"></i> Floor:</span>';
  floorsSeen.forEach(f => {
    const btn = document.createElement('button');
    btn.textContent = f.name;
    if (f.id === activeFloorId) btn.classList.add('active');
    btn.onclick = () => {
      if (!_pathState) return;
      const floor = state.floors.find(fl => fl.id === f.id);
      state.currFloorId = f.id;
      state.currBlockId = floor?.blocks[0]?.id || state.currBlockId;
      state.selectedIds = [];
      renderAll();
      setTimeout(() => {
        drawPathArrows(_pathState.path, _pathState.edges, f.id, false);
        applyPathHighlights(_pathState.path, f.id);
        buildFloorBar(_pathState.path, _pathState.edges, f.id);
      }, 60);
    };
    bar.appendChild(btn);
  });
  bar.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons();
}

function applyPathHighlights(path, floorId) {
  document.querySelectorAll('.element').forEach(el => {
    el.classList.remove('path-highlight', 'path-start', 'path-end');
    const badge = el.querySelector('.path-num');
    if (badge) badge.remove();
  });
  path.forEach((elId, idx) => {
    const rec = getElById(elId);
    if (!rec || rec.floorId !== floorId) return;
    const domEl = document.getElementById('el-' + elId);
    if (!domEl) return;
    if (idx === 0) domEl.classList.add('path-start');
    else if (idx === path.length - 1) domEl.classList.add('path-end');
    else domEl.classList.add('path-highlight');
  });
}
