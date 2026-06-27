
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
    const transformStr = state.is3D
      ? `rotate(${wall.r || 0}deg) translateZ(var(--z-depth))`
      : `rotate(${wall.r || 0}deg)`;
    div.style.cssText = `left:${wall.x}px;top:${wall.y}px;width:${displayW}px;height:${displayH}px;transform:${transformStr};`;
    div.style.setProperty('--z-depth', `${wall.height3D !== undefined ? wall.height3D : 40}px`);
    if (wall.color) {
      div.style.backgroundColor = wall.color;
    }
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

    if (wall.id === state.selectedWallId) {
      const rotHandle = document.createElement('div');
      rotHandle.className = 'rotate-handle';
      rotHandle.onmousedown = e => {
        e.stopPropagation();
        startWallRotate(e, wall);
      };
      div.appendChild(rotHandle);
    }

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

          const isHoriz = el.stairOrientation && el.stairOrientation !== 'auto'
            ? el.stairOrientation === 'horizontal'
            : el.w >= el.h;
          const steps = el.stepCount || 6;
          const isUp = el.stairDir !== 'down';
          const maxStairHeight = el.height3D !== undefined ? el.height3D : 40;
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
            const zHeight = (heightIdx / steps) * maxStairHeight;
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

        let zDepth = 12;
        if (el.type === 'door' || el.name === 'Door') zDepth = el.height3D !== undefined ? el.height3D : 80;
        else if (el.type === 'window' || el.name === 'Window') zDepth = el.height3D !== undefined ? el.height3D : 50;
        else if (el.type === 'entry_exit' || el.name === 'Entry/Exit') zDepth = el.height3D !== undefined ? el.height3D : 1;
        else if (el.type === 'waypoint' || el.name === 'Waypoint') zDepth = el.height3D !== undefined ? el.height3D : 1;
        else if (el.type === 'text' || el.name === 'Text Label') zDepth = el.height3D !== undefined ? el.height3D : 1;
        else if (el.isStairs || el.type === 'Staircase') zDepth = el.height3D !== undefined ? el.height3D : 0;
        else if (['cooler', 'wash_area', 'dustbin', 'sofa', 'plant', 'restroom_marker', 'restroom_male', 'restroom_female'].includes(el.type)) zDepth = 0;
        else if (el.height3D !== undefined) zDepth = el.height3D;

        const transformStr = state.is3D
          ? `rotate(${el.r || 0}deg) translateZ(calc(var(--z-depth, 12px) + ${elevation}px))`
          : `rotate(${el.r || 0}deg)`;
        div.style.cssText = `left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;background-color:${el.color};transform:${transformStr};z-index:${state.selectedIds.includes(el.id) ? 100 : 1};`;

        div.style.setProperty('--z-depth', `${zDepth}px`);

        const faces = document.createElement('div');
        faces.className = 'faces';
        div.appendChild(faces);

        if (el.type === 'cooler') {
          div.classList.add('cooler-element');
          div.appendChild(createCoolerSvg());
        } else if (el.type === 'wash_area') {
          div.classList.add('wash-area-element');
          div.appendChild(createWashAreaSvg());
        } else if (el.type === 'dustbin') {
          div.classList.add('dustbin-element');
          div.appendChild(createDustbinSvg());
        } else if (el.type === 'sofa') {
          div.classList.add('sofa-element');
          div.appendChild(createSofaSvg());
        } else if (el.type === 'plant') {
          div.classList.add('plant-element');
          div.appendChild(createPlantSvg());
        } else if (el.type === 'restroom_marker') {
          div.classList.add('restroom-marker-element');
          div.appendChild(createRestroomMarkerSvg());
        } else if (el.type === 'restroom_male') {
          div.classList.add('restroom-male-element');
          div.appendChild(createRestroomMaleSvg());
        } else if (el.type === 'restroom_female') {
          div.classList.add('restroom-female-element');
          div.appendChild(createRestroomFemaleSvg());
        }

        if (state.is3D) {
          if (el.type === 'cooler') renderCooler3D(div, el);
          else if (el.type === 'wash_area') renderWashArea3D(div, el);
          else if (el.type === 'restroom_marker') renderRestroomSign3D(div, el, 'both');
          else if (el.type === 'restroom_male') renderRestroomSign3D(div, el, 'male');
          else if (el.type === 'restroom_female') renderRestroomSign3D(div, el, 'female');
          else if (el.type === 'sofa') renderSofa3D(div, el);
          else if (el.type === 'dustbin') renderDustbin3D(div, el);
          else if (el.type === 'plant') renderPlant3D(div, el);
        }

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
        const isDoorOrWindow = ['door', 'window', 'entry_exit', 'waypoint', 'cooler', 'wash_area', 'dustbin', 'sofa', 'plant', 'restroom_marker', 'restroom_male', 'restroom_female'].includes(el.type);

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

        if (state.selectedIds.includes(el.id)) {
          const rotHandle = document.createElement('div');
          rotHandle.className = 'rotate-handle';
          rotHandle.onmousedown = e => {
            e.stopPropagation();
            startRotate(e, el);
          };
          div.appendChild(rotHandle);
        }

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

  if (actionsPanel) {
    if ((state.selectedIds && state.selectedIds.length > 0) || state.selectedWallId) {
      actionsPanel.style.display = 'block';
    } else {
      actionsPanel.style.display = 'none';
    }
  }

  // Handle multi-selection
  if (state.selectedIds && state.selectedIds.length > 1) {
    panel.style.display = 'none';
    return;
  }

  // Helper for hiding/showing elements safely
  const setDisplay = (id, value) => {
    const target = document.getElementById(id);
    if (target) target.style.display = value;
  };

  // Wall selection properties
  if (state.selectedWallId && (!state.selectedIds || state.selectedIds.length === 0)) {
    const wall = state.walls.find(w => w.id === state.selectedWallId);
    if (wall) {
      panel.style.display = 'block';
      
      let shapeInfo = document.getElementById('pShapeInfo');
      if (shapeInfo) shapeInfo.style.display = 'none';
      
      document.getElementById('pname').value = wall.name || `Wall ${wall.id}`;
      document.getElementById('pwidth').value = wall.w;
      document.getElementById('pheight').value = wall.h; // length in 2D is h
      document.getElementById('px').value = wall.x;
      document.getElementById('py').value = wall.y;
      document.getElementById('prot').value = wall.r || 0;
      document.getElementById('pcolor').value = wall.color || '#334155';
      document.getElementById('pheight3d').value = wall.height3D !== undefined ? wall.height3D : 40;
      
      // Hide staircase/link features for walls
      document.getElementById('pisStairs').parentNode.style.display = 'none';
      setDisplay('stairDirRow', 'none');
      setDisplay('stairElevationRow', 'none');
      setDisplay('stairExtraRow', 'none');
      setDisplay('stairLinkSection', 'none');
      setDisplay('universalLinkSection', 'none');
      return;
    }
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
  document.getElementById('prot').value = el.r || 0;
  document.getElementById('pcolor').value = el.color;
  
  // Show standard fields
  document.getElementById('pisStairs').parentNode.style.display = 'block';
  document.getElementById('pisStairs').checked = el.isStairs || false;
  setDisplay('universalLinkSection', 'block');

  // Load 3D Height
  let defaultHeight = 12;
  if (el.type === 'door' || el.name === 'Door') defaultHeight = 80;
  else if (el.type === 'window' || el.name === 'Window') defaultHeight = 50;
  else if (el.type === 'entry_exit' || el.name === 'Entry/Exit') defaultHeight = 1;
  else if (el.type === 'waypoint' || el.name === 'Waypoint') defaultHeight = 1;
  else if (el.type === 'text' || el.name === 'Text Label') defaultHeight = 1;
  else if (el.isStairs || el.type === 'Staircase') defaultHeight = 0;
  else if (el.type === 'cooler') defaultHeight = 60;
  else if (el.type === 'wash_area') defaultHeight = 30;
  else if (el.type === 'dustbin') defaultHeight = 40;
  else if (el.type === 'sofa') defaultHeight = 25;
  else if (el.type === 'plant') defaultHeight = 35;
  else if (['restroom_marker', 'restroom_male', 'restroom_female'].includes(el.type)) defaultHeight = 50;
  
  document.getElementById('pheight3d').value = el.height3D !== undefined ? el.height3D : defaultHeight;

  const stairDirRow = document.getElementById('stairDirRow');
  const stairElevationRow = document.getElementById('stairElevationRow');
  const stairExtraRow = document.getElementById('stairExtraRow');
  
  if (el.type === 'Staircase' || el.isStairs) {
    if (stairDirRow) stairDirRow.style.display = 'flex';
    if (stairElevationRow) stairElevationRow.style.display = 'flex';
    if (stairExtraRow) stairExtraRow.style.display = 'flex';
    document.getElementById('pstairDir').value = el.stairDir || 'up';
    document.getElementById('pstairElevation').value = el.stairElevation || 0;
    document.getElementById('pstairStepCount').value = el.stepCount || 6;
    document.getElementById('pstairOrientation').value = el.stairOrientation || 'auto';
  } else {
    if (stairDirRow) stairDirRow.style.display = 'none';
    if (stairElevationRow) stairElevationRow.style.display = 'none';
    if (stairExtraRow) stairExtraRow.style.display = 'none';
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


function getDoorOnSharedEdge(a, b, floorEls) {
  const gate = getSharedWallMidpoint(a, b);
  if (!gate) return null;

  for (const item of floorEls) {
    if (
      item.type !== 'door' &&
      item.name !== 'Door' &&
      item.type !== 'entry_exit'
    ) continue;

    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;

    if (gate.axis === 'v') {
      if (Math.abs(cx - gate.x) < 15) {
        return { x: cx, y: cy, axis: gate.axis };
      }
    }

    if (gate.axis === 'h') {
      if (Math.abs(cy - gate.y) < 15) {
        return { x: cx, y: cy, axis: gate.axis };
      }
    }
  }

  return gate;
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
        const gate = getDoorOnSharedEdge(el, nel, floorEls);
        let ncx, ncy;

        const nextIsCorridor =
          nel.type === 'Corridor' ||
          ((nel.type || '').startsWith('Corridor-'));

        if (nextIsCorridor) {
          const corridorPt = exitPoint(nel, gate, i + 1);
          ncx = corridorPt.x;
          ncy = corridorPt.y;
        } else {
          const roomEntry = exitPoint(nel, gate, i + 1);
          ncx = roomEntry.x;
          ncy = roomEntry.y;
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
          pts.push({
            x: gate.x,
            y: gate.y,
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

function createCoolerSvg() {
  const container = document.createElement('div');
  container.className = 'element-graphic';
  container.innerHTML = `<svg viewBox="0 0 40 40" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <rect x="10" y="20" width="20" height="18" rx="2" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
    <rect x="14" y="24" width="12" height="8" rx="1" fill="#cbd5e1"/>
    <line x1="20" y1="25" x2="20" y2="28" stroke="#475569" stroke-width="1.5"/>
    <circle cx="20" cy="25" r="1.5" fill="#3b82f6"/>
    <rect x="13" y="15" width="14" height="6" fill="#0ea5e9" opacity="0.6"/>
    <path d="M13,15 C13,6 27,6 27,15 Z" fill="#0ea5e9" opacity="0.75" stroke="#0284c7" stroke-width="1"/>
    <rect x="18" y="17" width="4" height="4" fill="#38bdf8"/>
  </svg>`;
  return container;
}

function createWashAreaSvg() {
  const container = document.createElement('div');
  container.className = 'element-graphic';
  container.innerHTML = `<svg viewBox="0 0 40 40" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <rect x="6" y="8" width="28" height="24" rx="6" fill="#f1f5f9" stroke="#64748b" stroke-width="1.5"/>
    <rect x="10" y="12" width="20" height="16" rx="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
    <circle cx="20" cy="20" r="2.5" fill="#64748b"/>
    <path d="M20,4 L20,10 M17,4 L23,4" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
    <path d="M20,8 L20,11 L18,11" stroke="#475569" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
    <circle cx="20" cy="15" r="1.5" fill="#3b82f6"/>
  </svg>`;
  return container;
}

function createDustbinSvg() {
  const container = document.createElement('div');
  container.className = 'element-graphic';
  container.innerHTML = `<svg viewBox="0 0 40 40" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <path d="M10,12 L30,12 L27,36 L13,36 Z" fill="#64748b" stroke="#334155" stroke-width="1.5" stroke-linejoin="round"/>
    <line x1="16" y1="16" x2="18" y2="32" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="20" y1="16" x2="20" y2="32" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="24" y1="16" x2="22" y2="32" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="8" y="8" width="24" height="4" rx="1" fill="#475569" stroke="#334155" stroke-width="1.5"/>
    <path d="M16,8 L16,5 L24,5 L24,8" stroke="#334155" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </svg>`;
  return container;
}

function createSofaSvg() {
  const container = document.createElement('div');
  container.className = 'element-graphic';
  container.innerHTML = `<svg viewBox="0 0 50 30" width="100%" height="100%" preserveAspectRatio="none">
    <rect x="4" y="2" width="42" height="8" rx="2" fill="#d97706" stroke="#78350f" stroke-width="1.5"/>
    <rect x="1" y="6" width="6" height="22" rx="2" fill="#b45309" stroke="#78350f" stroke-width="1.5"/>
    <rect x="43" y="6" width="6" height="22" rx="2" fill="#b45309" stroke="#78350f" stroke-width="1.5"/>
    <rect x="7" y="10" width="18" height="18" rx="2" fill="#f59e0b" stroke="#78350f" stroke-width="1"/>
    <rect x="25" y="10" width="18" height="18" rx="2" fill="#f59e0b" stroke="#78350f" stroke-width="1"/>
  </svg>`;
  return container;
}

function createPlantSvg() {
  const container = document.createElement('div');
  container.className = 'element-graphic';
  container.innerHTML = `<svg viewBox="0 0 40 40" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <ellipse cx="20" cy="30" rx="10" ry="7" fill="#c2410c" stroke="#7c2d12" stroke-width="1.5"/>
    <path d="M12,30 L28,30 L25,37 L15,37 Z" fill="#ea580c" stroke="#7c2d12" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M20,30 Q20,10 20,4 Q24,10 20,30" fill="#22c55e" stroke="#15803d" stroke-width="1"/>
    <path d="M20,30 Q12,14 6,10 Q14,19 20,30" fill="#16a34a" stroke="#15803d" stroke-width="1"/>
    <path d="M20,30 Q28,14 34,10 Q26,19 20,30" fill="#16a34a" stroke="#15803d" stroke-width="1"/>
    <path d="M20,30 Q10,25 4,24 Q11,28 20,30" fill="#15803d" stroke="#166534" stroke-width="1"/>
    <path d="M20,30 Q30,25 36,24 Q29,28 20,30" fill="#15803d" stroke="#166534" stroke-width="1"/>
    <circle cx="20" cy="30" r="3" fill="#78350f"/>
  </svg>`;
  return container;
}

function createRestroomMarkerSvg() {
  const container = document.createElement('div');
  container.className = 'element-graphic';
  container.innerHTML = `<svg viewBox="0 0 40 40" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <rect x="4" y="4" width="32" height="32" rx="4" fill="#0f172a" stroke="#3b82f6" stroke-width="2"/>
    <circle cx="14" cy="14" r="3" fill="#cbd5e1"/>
    <path d="M10,28 L10,21 C10,19 12,18 14,18 C16,18 18,19 18,21 L18,28" stroke="#cbd5e1" stroke-width="2" fill="none"/>
    <line x1="12" y1="28" x2="12" y2="33" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
    <line x1="16" y1="28" x2="16" y2="33" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
    <circle cx="26" cy="14" r="3" fill="#f43f5e"/>
    <path d="M22,28 L23,20 C23,19 24,18 26,18 C28,18 29,19 29,20 L30,28 Z" fill="#f43f5e"/>
    <line x1="24" y1="28" x2="24" y2="33" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
    <line x1="28" y1="28" x2="28" y2="33" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
  return container;
}

function createRestroomMaleSvg() {
  const container = document.createElement('div');
  container.className = 'element-graphic';
  container.innerHTML = `<svg viewBox="0 0 40 40" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <rect x="4" y="4" width="32" height="32" rx="4" fill="#0f172a" stroke="#3b82f6" stroke-width="2"/>
    <circle cx="20" cy="12" r="4" fill="#3b82f6"/>
    <path d="M14,30 L14,21 C14,18 16,17 20,17 C24,17 26,18 26,21 L26,30" stroke="#3b82f6" stroke-width="2.5" fill="none"/>
    <line x1="17" y1="30" x2="17" y2="36" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="23" y1="30" x2="23" y2="36" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
  return container;
}

function createRestroomFemaleSvg() {
  const container = document.createElement('div');
  container.className = 'element-graphic';
  container.innerHTML = `<svg viewBox="0 0 40 40" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <rect x="4" y="4" width="32" height="32" rx="4" fill="#0f172a" stroke="#f43f5e" stroke-width="2"/>
    <circle cx="20" cy="12" r="4" fill="#f43f5e"/>
    <path d="M15,30 L17,19 C17,18 18,17 20,17 C22,17 23,18 23,19 L25,30 Z" fill="#f43f5e"/>
    <line x1="17" y1="30" x2="17" y2="36" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="23" y1="30" x2="23" y2="36" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
  return container;
}

function create3DBox(x, y, z, w, h, d, color) {
  const box = document.createElement('div');
  box.className = 'custom-3d-box';
  box.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;--box-h:${d}px;--box-color:${color};transform:translateZ(${z}px);`;
  
  const faces = document.createElement('div');
  faces.className = 'custom-3d-box-faces';
  box.appendChild(faces);
  
  return box;
}

function renderCooler3D(div, el) {
  const w = el.w;
  const h = el.h;
  const d = el.height3D !== undefined ? el.height3D : 60;
  
  // Cabinet (gray base) - Z from 0 to baseD
  const baseW = w * 0.7;
  const baseH = h * 0.7;
  const baseX = (w - baseW) / 2;
  const baseY = (h - baseH) / 2;
  const baseD = d * 0.6;
  div.appendChild(create3DBox(baseX, baseY, baseD, baseW, baseH, baseD, '#94a3b8'));
  
  // Water bottle (blue top) - Z from baseD to baseD + botD
  const botW = w * 0.5;
  const botH = h * 0.5;
  const botX = (w - botW) / 2;
  const botY = (h - botH) / 2;
  const botD = d * 0.35;
  div.appendChild(create3DBox(botX, botY, baseD + botD, botW, botH, botD, 'rgba(14, 165, 233, 0.7)'));
  
  // Bottle neck/cap (white cap) - Z from baseD + botD to baseD + botD + capD
  const capW = w * 0.2;
  const capH = h * 0.2;
  const capX = (w - capW) / 2;
  const capY = (h - capH) / 2;
  const capD = d * 0.05;
  div.appendChild(create3DBox(capX, capY, baseD + botD + capD, capW, capH, capD, '#ffffff'));
  
  // Faucet (blue tap) - Z from tapZ to tapZ + tapD
  const tapW = 4;
  const tapH = 4;
  const tapD = 4;
  const tapX = (w - tapW) / 2;
  const tapY = baseY - 2; // protruding slightly forward
  const tapZ = baseD * 0.7;
  div.appendChild(create3DBox(tapX, tapY, tapZ + tapD, tapW, tapH, tapD, '#3b82f6'));
}

function renderWashArea3D(div, el) {
  const w = el.w;
  const h = el.h;
  const d = el.height3D !== undefined ? el.height3D : 30;
  
  // Cabinet Base (dark grey) - Z from 0 to cabD
  const cabW = w * 0.9;
  const cabH = h * 0.9;
  const cabX = (w - cabW) / 2;
  const cabY = (h - cabH) / 2;
  const cabD = d * 0.8;
  div.appendChild(create3DBox(cabX, cabY, cabD, cabW, cabH, cabD, '#475569'));
  
  // Ceramic Basin Top (white) - Z from cabD to cabD + basD
  const basW = w * 0.95;
  const basH = h * 0.95;
  const basX = (w - basW) / 2;
  const basY = (h - basH) / 2;
  const basD = d * 0.2;
  div.appendChild(create3DBox(basX, basY, cabD + basD, basW, basH, basD, '#f8fafc'));
  
  // Faucet Tap (chrome) - Z from cabD + basD to cabD + basD + tapD
  const tapW = 3;
  const tapH = 3;
  const tapD = 8;
  const tapX = (w - tapW) / 2;
  const tapY = basY + basH * 0.2;
  div.appendChild(create3DBox(tapX, tapY, cabD + basD + tapD, tapW, tapH, tapD, '#cbd5e1'));
  
  // Faucet Spout (chrome, extending forward)
  const spW = 3;
  const spH = 6;
  const spD = 2;
  const spX = tapX;
  const spY = tapY + tapH;
  div.appendChild(create3DBox(spX, spY, cabD + basD + tapD, spW, spH, spD, '#cbd5e1'));
}

function renderRestroomSign3D(div, el, gender) {
  const w = el.w;
  const h = el.h;
  const d = el.height3D !== undefined ? el.height3D : 50;
  
  // Sign panel (vertical slate board, elevated in Z space)
  const signW = 4;
  const signH = h * 0.8;
  const signX = (w - signW) / 2;
  const signY = (h - signH) / 2;
  const signD = 20;
  const signZ = d; 
  
  const signBox = create3DBox(signX, signY, signZ, signW, signH, signD, '#0f172a');
  div.appendChild(signBox);
  
  // Bracket rod (connecting sign to base)
  const brW = w * 0.3;
  const brH = 4;
  const brX = 0;
  const brY = (h - brH) / 2;
  const brD = 4;
  const brZ = d - (signD - brD) / 2;
  div.appendChild(create3DBox(brX, brY, brZ, brW, brH, brD, '#64748b'));
  
  let iconSvg = '';
  if (gender === 'male') {
    iconSvg = `<svg viewBox="0 0 40 40" style="width:75%;height:75%;">
      <circle cx="20" cy="10" r="4" fill="#3b82f6"/>
      <path d="M14,26 L14,19 C14,16 16,15 20,15 C24,15 26,16 26,19 L26,26" stroke="#3b82f6" stroke-width="2.5" fill="none"/>
      <line x1="17" y1="26" x2="17" y2="32" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="23" y1="26" x2="23" y2="32" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;
  } else if (gender === 'female') {
    iconSvg = `<svg viewBox="0 0 40 40" style="width:75%;height:75%;">
      <circle cx="20" cy="10" r="4" fill="#f43f5e"/>
      <path d="M15,26 L17,17 C17,16 18,15 20,15 C22,15 23,16 23,17 L25,26 Z" fill="#f43f5e"/>
      <line x1="17" y1="26" x2="17" y2="32" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="23" y1="26" x2="23" y2="32" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;
  } else {
    iconSvg = `<svg viewBox="0 0 40 40" style="width:75%;height:75%;">
      <circle cx="13" cy="12" r="3" fill="#cbd5e1"/>
      <path d="M9,26 L9,19 C9,17 11,16 13,16 C15,16 17,17 17,19 L17,26" stroke="#cbd5e1" stroke-width="2" fill="none"/>
      <circle cx="27" cy="12" r="3" fill="#f43f5e"/>
      <path d="M23,26 L24,18 C24,17 25,16 27,16 C29,16 30,17 30,18 L31,26 Z" fill="#f43f5e"/>
    </svg>`;
  }
  
  const leftFace = document.createElement('div');
  leftFace.style.cssText = `position:absolute;left:-0.5px;top:0;width:100%;height:100%;transform:rotateY(-90deg);transform-origin:left;display:flex;align-items:center;justify-content:center;`;
  leftFace.innerHTML = iconSvg;
  signBox.appendChild(leftFace);

  const rightFace = document.createElement('div');
  rightFace.style.cssText = `position:absolute;right:-0.5px;top:0;width:100%;height:100%;transform:rotateY(90deg);transform-origin:right;display:flex;align-items:center;justify-content:center;`;
  rightFace.innerHTML = iconSvg;
  signBox.appendChild(rightFace);
}

function renderSofa3D(div, el) {
  const w = el.w;
  const h = el.h;
  const d = el.height3D !== undefined ? el.height3D : 25;
  
  const baseColor = el.color || '#f59e0b';
  const armColor = '#b45309';
  
  // Seat Base - Z from 0 to seatD
  const seatW = w * 0.88;
  const seatH = h * 0.8;
  const seatX = (w - seatW) / 2;
  const seatY = h * 0.18;
  const seatD = d * 0.55;
  div.appendChild(create3DBox(seatX, seatY, seatD, seatW, seatH, seatD, baseColor));
  
  // Backrest (rear) - Z from 0 to backD
  const backW = w;
  const backH = h * 0.2;
  const backX = 0;
  const backY = 0;
  const backD = d;
  div.appendChild(create3DBox(backX, backY, backD, backW, backH, backD, armColor));
  
  // Left Armrest - Z from 0 to lArmD
  const lArmW = w * 0.12;
  const lArmH = h * 0.8;
  const lArmX = 0;
  const lArmY = h * 0.2;
  const lArmD = d * 0.75;
  div.appendChild(create3DBox(lArmX, lArmY, lArmD, lArmW, lArmH, lArmD, armColor));
  
  // Right Armrest - Z from 0 to rArmD
  const rArmW = w * 0.12;
  const rArmH = h * 0.8;
  const rArmX = w - rArmW;
  const rArmY = h * 0.2;
  const rArmD = d * 0.75;
  div.appendChild(create3DBox(rArmX, rArmY, rArmD, rArmW, rArmH, rArmD, armColor));
}

function renderDustbin3D(div, el) {
  const w = el.w;
  const h = el.h;
  const d = el.height3D !== undefined ? el.height3D : 40;
  
  // Main bin body - Z from 0 to bodyD
  const bodyW = w * 0.8;
  const bodyH = h * 0.8;
  const bodyX = (w - bodyW) / 2;
  const bodyY = (h - bodyH) / 2;
  const bodyD = d * 0.85;
  div.appendChild(create3DBox(bodyX, bodyY, bodyD, bodyW, bodyH, bodyD, '#64748b'));
  
  // Lid rim - Z from bodyD to bodyD + lidD
  const lidW = w * 0.88;
  const lidH = h * 0.88;
  const lidX = (w - lidW) / 2;
  const lidY = (h - lidH) / 2;
  const lidD = d * 0.1;
  div.appendChild(create3DBox(lidX, lidY, bodyD + lidD, lidW, lidH, lidD, '#475569'));
  
  // Lid handle - Z from bodyD + lidD to bodyD + lidD + hanD
  const hanW = w * 0.3;
  const hanH = 4;
  const hanX = (w - hanW) / 2;
  const hanY = (h - hanH) / 2;
  const hanD = d * 0.05;
  div.appendChild(create3DBox(hanX, hanY, bodyD + lidD + hanD, hanW, hanH, hanD, '#334155'));
}

function renderPlant3D(div, el) {
  const w = el.w;
  const h = el.h;
  const d = el.height3D !== undefined ? el.height3D : 35;
  
  // Terracotta Pot - Z from 0 to potD
  const potW = w * 0.6;
  const potH = h * 0.6;
  const potX = (w - potW) / 2;
  const potY = (h - potH) / 2;
  const potD = d * 0.45;
  div.appendChild(create3DBox(potX, potY, potD, potW, potH, potD, '#ea580c'));
  
  // Soil Top - Z from potD - 1 to potD
  const soilW = w * 0.52;
  const soilH = h * 0.52;
  const soilX = (w - soilW) / 2;
  const soilY = (h - soilH) / 2;
  div.appendChild(create3DBox(soilX, soilY, potD, soilW, soilH, 1, '#451a03'));
  
  // Leaves container
  const leavesContainer = document.createElement('div');
  leavesContainer.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform-style:preserve-3d;transform:translateZ(${potD}px);pointer-events:none;`;
  
  const leafHeight = d * 0.7;
  const leafWidth = w * 0.95;
  const leafLeft = (w - leafWidth) / 2;
  
  const leafSvgHtml = `<svg viewBox="0 0 100 80" style="width:100%;height:100%;overflow:visible;">
    <path d="M50,80 Q50,40 50,0 Q65,30 50,80" fill="#22c55e" stroke="#15803d" stroke-width="1"/>
    <path d="M50,80 Q35,45 10,25 Q35,55 50,80" fill="#16a34a" stroke="#15803d" stroke-width="1"/>
    <path d="M50,80 Q65,45 90,25 Q65,55 50,80" fill="#16a34a" stroke="#15803d" stroke-width="1"/>
    <path d="M50,80 Q25,60 5,50 Q20,68 50,80" fill="#15803d" stroke="#166534" stroke-width="1"/>
    <path d="M50,80 Q75,60 95,50 Q80,68 50,80" fill="#15803d" stroke="#166534" stroke-width="1"/>
  </svg>`;
  
  const rotations = [0, 45, 90, 135];
  rotations.forEach(rot => {
    const panel = document.createElement('div');
    panel.className = 'plant-leaf-panel';
    panel.style.cssText = `position:absolute;left:${leafLeft}px;top:${(h - leafHeight)/2}px;width:${leafWidth}px;height:${leafHeight}px;transform:rotateX(90deg) rotateZ(${rot}deg);transform-style:flat;pointer-events:none;background:transparent;`;
    panel.innerHTML = leafSvgHtml;
    leavesContainer.appendChild(panel);
  });
  
  div.appendChild(leavesContainer);
}

