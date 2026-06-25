let _wallToolActive = false;

function snap(val) {
  if (!document.getElementById('snapToggle').checked) return val;
  return Math.round(val / state.gridSize) * state.gridSize;
}


/* =================================================================
   DRAG & RESIZE (GPU optimized)
   ================================================================= */
function startDrag(e, el) {
  if (state.is3D) return;
  if (e.target.classList.contains('resize')) return;
  e.preventDefault();
  
  if (e.shiftKey) {
    if (state.selectedIds.includes(el.id)) {
      state.selectedIds = state.selectedIds.filter(id => id !== el.id);
    } else {
      state.selectedIds.push(el.id);
    }
  } else {
    if (!state.selectedIds.includes(el.id)) {
      state.selectedIds = [el.id];
    }
  }
  
  if (el.groupId) {
     const block = curBlock();
     if (block) {
       block.elements.forEach(e => {
         if (e.groupId === el.groupId && !state.selectedIds.includes(e.id)) {
           state.selectedIds.push(e.id);
         }
       });
     }
  }
  
  renderAll();

  if (!state.selectedIds.includes(el.id)) return;

  const startX = e.clientX, startY = e.clientY;
  
  const selectedEls = getSelectedElements();
  const initials = selectedEls.map(se => ({ el: se, x: se.x, y: se.y, div: document.getElementById('el-' + se.id) }));
  
  initials.forEach(item => { if (item.div) item.div.classList.add('dragging'); });
  const initialEl = initials.find(item => item.el.id === el.id);
  let rAF = null;

  const onMove = evt => {
    if (rAF) return;
    rAF = requestAnimationFrame(() => {
      const dx = (evt.clientX - startX) / state.zoom;
      const dy = (evt.clientY - startY) / state.zoom;
      
      const block = curBlock();
      const canvasEl = getCanvas();
      
      let snapDx = dx;
      let snapDy = dy;
      
      let guideX = null;
      let guideY = null;
      
      if (block && initialEl) {
        const otherEls = block.elements.filter(item => !state.selectedIds.includes(item.id));
        const threshold = 8;
        
        let targetNx = initialEl.x + dx;
        let targetNy = initialEl.y + dy;
        
        let isSnappedX = false;
        let isSnappedY = false;

        // X Snapping
        for (const other of otherEls) {
          const oL = other.x, oR = other.x + other.w, oC = other.x + other.w / 2;
          const candidates = [oL, oR, oC];

          for (const val of candidates) {
            if (Math.abs(targetNx - val) < threshold) {
              targetNx = val;
              guideX = val;
              isSnappedX = true;
              break;
            }
            if (Math.abs((targetNx + el.w) - val) < threshold) {
              targetNx = val - el.w;
              guideX = val;
              isSnappedX = true;
              break;
            }
            if (Math.abs((targetNx + el.w / 2) - val) < threshold) {
              targetNx = val - el.w / 2;
              guideX = val;
              isSnappedX = true;
              break;
            }
          }
          if (isSnappedX) break;
        }

        // Y Snapping
        for (const other of otherEls) {
          const oT = other.y, oB = other.y + other.h, oC = other.y + other.h / 2;
          const candidates = [oT, oB, oC];

          for (const val of candidates) {
            if (Math.abs(targetNy - val) < threshold) {
              targetNy = val;
              guideY = val;
              isSnappedY = true;
              break;
            }
            if (Math.abs((targetNy + el.h) - val) < threshold) {
              targetNy = val - el.h;
              guideY = val;
              isSnappedY = true;
              break;
            }
            if (Math.abs((targetNy + el.h / 2) - val) < threshold) {
              targetNy = val - el.h / 2;
              guideY = val;
              isSnappedY = true;
              break;
            }
          }
          if (isSnappedY) break;
        }

        // Grid Snap fallback
        if (document.getElementById('snapToggle').checked) {
          if (!isSnappedX) {
            targetNx = Math.round(targetNx / state.gridSize) * state.gridSize;
          }
          if (!isSnappedY) {
            targetNy = Math.round(targetNy / state.gridSize) * state.gridSize;
          }
        }
        
        snapDx = targetNx - initialEl.x;
        snapDy = targetNy - initialEl.y;
      } else {
        if (document.getElementById('snapToggle').checked) {
          snapDx = Math.round((initialEl.x + dx) / state.gridSize) * state.gridSize - initialEl.x;
          snapDy = Math.round((initialEl.y + dy) / state.gridSize) * state.gridSize - initialEl.y;
        }
      }

      // Draw Guide Lines
      const oldGuides = document.querySelectorAll('.snap-guide-v, .snap-guide-h');
      oldGuides.forEach(g => g.remove());

      if (canvasEl) {
        if (guideX !== null) {
          const vLine = document.createElement('div');
          vLine.className = 'snap-guide-v';
          vLine.style.left = guideX + 'px';
          canvasEl.appendChild(vLine);
        }
        if (guideY !== null) {
          const hLine = document.createElement('div');
          hLine.className = 'snap-guide-h';
          hLine.style.top = guideY + 'px';
          canvasEl.appendChild(hLine);
        }
      }

      initials.forEach(item => {
        const nx = item.x + snapDx;
        const ny = item.y + snapDy;
        if (item.div) {
           item.div.style.transform = `translate3d(${nx - item.x}px,${ny - item.y}px,0) rotate(${item.el.r || 0}deg)`;
        }
        if (item.el.id === el.id) {
           const px = document.getElementById('px');
           const py = document.getElementById('py');
           if (px) { px.value = Math.round(nx); py.value = Math.round(ny); }
        }
      });
      rAF = null;
    });
  };

  const onUp = evt => {
    if (rAF) cancelAnimationFrame(rAF);
    
    // Clear Guide Lines
    const oldGuides = document.querySelectorAll('.snap-guide-v, .snap-guide-h');
    oldGuides.forEach(g => g.remove());

    initials.forEach(item => { if (item.div) item.div.classList.remove('dragging'); });
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    
    const dx = (evt.clientX - startX) / state.zoom;
    const dy = (evt.clientY - startY) / state.zoom;
    
    let snapDx = dx;
    let snapDy = dy;
    
    const block = curBlock();
    if (block && initialEl) {
      const otherEls = block.elements.filter(item => !state.selectedIds.includes(item.id));
      const threshold = 8;
      
      let targetNx = initialEl.x + dx;
      let targetNy = initialEl.y + dy;
      
      let isSnappedX = false;
      let isSnappedY = false;

      // X Snapping
      for (const other of otherEls) {
        const oL = other.x, oR = other.x + other.w, oC = other.x + other.w / 2;
        const candidates = [oL, oR, oC];

        for (const val of candidates) {
          if (Math.abs(targetNx - val) < threshold) {
            targetNx = val;
            isSnappedX = true;
            break;
          }
          if (Math.abs((targetNx + el.w) - val) < threshold) {
            targetNx = val - el.w;
            isSnappedX = true;
            break;
          }
          if (Math.abs((targetNx + el.w / 2) - val) < threshold) {
            targetNx = val - el.w / 2;
            isSnappedX = true;
            break;
          }
        }
        if (isSnappedX) break;
      }

      // Y Snapping
      for (const other of otherEls) {
        const oT = other.y, oB = other.y + other.h, oC = other.y + other.h / 2;
        const candidates = [oT, oB, oC];

        for (const val of candidates) {
          if (Math.abs(targetNy - val) < threshold) {
            targetNy = val;
            isSnappedY = true;
            break;
          }
          if (Math.abs((targetNy + el.h) - val) < threshold) {
            targetNy = val - el.h;
            isSnappedY = true;
            break;
          }
          if (Math.abs((targetNy + el.h / 2) - val) < threshold) {
            targetNy = val - el.h / 2;
            isSnappedY = true;
            break;
          }
        }
        if (isSnappedY) break;
      }

      // Grid Snap fallback
      if (document.getElementById('snapToggle').checked) {
        if (!isSnappedX) {
          targetNx = Math.round(targetNx / state.gridSize) * state.gridSize;
        }
        if (!isSnappedY) {
          targetNy = Math.round(targetNy / state.gridSize) * state.gridSize;
        }
      }
      
      snapDx = targetNx - initialEl.x;
      snapDy = targetNy - initialEl.y;
    } else {
      if (document.getElementById('snapToggle').checked) {
        snapDx = Math.round((initialEl.x + dx) / state.gridSize) * state.gridSize - initialEl.x;
        snapDy = Math.round((initialEl.y + dy) / state.gridSize) * state.gridSize - initialEl.y;
      }
    }
    
    let moved = false;
    initials.forEach(item => {
      let fx = item.x + snapDx;
      let fy = item.y + snapDy;
      if (item.el.x !== fx || item.el.y !== fy) moved = true;
      item.el.x = fx; item.el.y = fy;
      if (item.div) {
         item.div.style.transform = `rotate(${item.el.r || 0}deg)`;
         item.div.style.left = item.el.x + 'px'; item.div.style.top = item.el.y + 'px';
      }
    });
    
    if (moved) {
      pushHistory();
      autoExpandCanvas();
    }
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function startResize(e, el, dir) {
  if (state.is3D) return;
  e.stopPropagation(); e.preventDefault();
  const startX = e.clientX, startY = e.clientY;
  const origX = el.x, origY = el.y, origW = el.w, origH = el.h;
  const div = document.getElementById('el-' + el.id);
  if (!div) return;
  div.classList.add('resizing');
  const dimTag = document.getElementById('dims-' + el.id);

  const onMove = evt => {
    const dx = (evt.clientX - startX) / state.zoom;
    const dy = (evt.clientY - startY) / state.zoom;

    if (dir.includes('e')) {
      el.w = Math.max(20, snap(origW + dx));
    }
    if (dir.includes('w')) {
      const newW = Math.max(20, snap(origW - dx));
      el.x = origX + (origW - newW);
      el.w = newW;
    }
    if (dir.includes('s')) {
      el.h = Math.max(20, snap(origH + dy));
    }
    if (dir.includes('n')) {
      const newH = Math.max(20, snap(origH - dy));
      el.y = origY + (origH - newH);
      el.h = newH;
    }

    div.style.left = el.x + 'px'; div.style.top = el.y + 'px';
    div.style.width = el.w + 'px'; div.style.height = el.h + 'px';
    if (el.type === 'Corridor-Triangle' || el.type === 'Corridor-Circle' || el.type === 'Corridor-Cross') {
      const oldSvg = div.querySelector('svg');
      if (oldSvg) oldSvg.remove();
      const newSvg = buildCorridorSvg(el);
      div.insertBefore(newSvg, div.firstChild);
    }
    if (dimTag) dimTag.textContent = `${Math.round(el.w)} × ${Math.round(el.h)}`;
    const pw = document.getElementById('pwidth');
    const ph = document.getElementById('pheight');
    const px = document.getElementById('px');
    const py = document.getElementById('py');
    if (pw) { pw.value = Math.round(el.w); ph.value = Math.round(el.h); }
    if (px) { px.value = Math.round(el.x); py.value = Math.round(el.y); }
  };

  const onUp = () => {
    div.classList.remove('resizing');
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    if (el.w !== origW || el.h !== origH || el.x !== origX || el.y !== origY) {
      pushHistory();
      autoExpandCanvas();
    }
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function startWallDrag(e, wall) {
  if (state.is3D) return;
  e.preventDefault();
  const startX = e.clientX, startY = e.clientY;
  const origX = wall.x, origY = wall.y;

  const onMove = ev => {
    let nx = origX + (ev.clientX - startX) / state.zoom;
    let ny = origY + (ev.clientY - startY) / state.zoom;
    if (document.getElementById('snapToggle').checked) {
      nx = Math.round(nx / state.gridSize) * state.gridSize;
      ny = Math.round(ny / state.gridSize) * state.gridSize;
    }
    wall.x = nx; wall.y = ny;
    const div = document.getElementById('wall-' + wall.id);
    if (div) { div.style.left = nx + 'px'; div.style.top = ny + 'px'; }
  };

  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    pushHistory();
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function startWallResize(e, wall, axis) {
  if (state.is3D) return;
  e.stopPropagation(); e.preventDefault();
  const startX = e.clientX, startY = e.clientY;
  const origW = wall.w, origH = wall.h;

  const onMove = ev => {
    if (axis === 'h') {
      wall.w = Math.max(8, snap(origW + (ev.clientX - startX) / state.zoom));
    } else {
      wall.h = Math.max(8, snap(origH + (ev.clientY - startY) / state.zoom));
    }
    const div = document.getElementById('wall-' + wall.id);
    if (div) { div.style.width = wall.w + 'px'; div.style.height = wall.h + 'px'; }
  };

  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    pushHistory();
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

/* =================================================================
   ZOOM & PAN
   ================================================================= */
function applyCanvasTransform() {
  const canvasWrapEl = getCanvasWrap();
  if (!canvasWrapEl) return;
  canvasWrapEl.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  const viewport = document.getElementById('canvas3dViewport');
  if (viewport) {
    if (state.is3D) {
      const rx = state.rotX !== undefined ? state.rotX : 52;
      const rz = state.rotZ !== undefined ? state.rotZ : -30;
      viewport.style.transform = `rotateX(${rx}deg) rotateZ(${rz}deg)`;
      viewport.style.setProperty('--cam-rx', `${rx}deg`);
      viewport.style.setProperty('--cam-rz', `${rz}deg`);
    } else {
      viewport.style.transform = '';
      viewport.style.removeProperty('--cam-rx');
      viewport.style.removeProperty('--cam-rz');
    }
  }
}

function autoExpandCanvas() {
  let maxX = 0, maxY = 0;
  const block = curBlock();
  if (!block) return;
  block.elements.forEach(el => {
    maxX = Math.max(maxX, el.x + el.w + 100);
    maxY = Math.max(maxY, el.y + el.h + 100);
  });
  const canvasEl = getCanvas();
  if (!canvasEl) return;
  const curW = parseInt(canvasEl.style.width) || 3000;
  const curH = parseInt(canvasEl.style.height) || 2400;
  if (maxX > curW || maxY > curH) {
    const newW = Math.max(curW, Math.ceil(maxX / 200) * 200);
    const newH = Math.max(curH, Math.ceil(maxY / 200) * 200);
    canvasEl.style.width = newW + 'px';
    canvasEl.style.height = newH + 'px';
    document.getElementById('canvasW').value = newW;
    document.getElementById('canvasH').value = newH;
  }
}

function toggle3DMode() {
  state.is3D = !state.is3D;
  const container = document.getElementById('canvasContainer');
  const wrap = document.getElementById('canvasWrap');
  const btn = document.getElementById('viewModeBtn');
  const rotBtn = document.getElementById('rotate3DBtn');

  if (state.is3D) {
    if (_wallToolActive) {
      toggleWallTool();
    }
    if (container) container.classList.add('mode-3d');
    if (wrap) wrap.classList.add('mode-3d');
    if (btn) btn.innerHTML = '<i data-lucide="layout"></i><span>2D Design</span>';
    state.selectedIds = [];
    state.selectedWallId = null;
    renderAll();
    applyCanvasTransform();
    if (rotBtn) rotBtn.style.display = 'inline-flex';
    showToast('Switched to 3D View');
  } else {
    if (container) {
      container.classList.remove('mode-3d');
      container.classList.remove('rotate-180');
    }
    if (wrap) wrap.classList.remove('mode-3d');
    if (btn) btn.innerHTML = '<i data-lucide="box"></i><span>3D View</span>';
    if (rotBtn) rotBtn.style.display = 'none';
    renderAll();
    applyCanvasTransform();
    showToast('Switched to 2D Design');
  }
  if (window.lucide) window.lucide.createIcons();
}

/* =================================================================
   WALL TOOL
   ================================================================= */
function toggleWallTool() {
  if (state.is3D) {
    showToast('Cannot draw walls in 3D View');
    return;
  }
  _wallToolActive = !_wallToolActive;
  const btn = document.getElementById('wallToolBtn');
  const hint = document.getElementById('wallHint');
  const canvasEl = getCanvas();
  if (_wallToolActive) {
    if (btn) {
      btn.classList.add('active');
      btn.textContent = '🧱 Drawing Wall…';
    }
    if (hint) hint.style.display = 'block';
    if (canvasEl) canvasEl.style.cursor = 'crosshair';
  } else {
    if (btn) {
      btn.classList.remove('active');
      btn.textContent = '🧱 Draw Wall';
    }
    if (hint) hint.style.display = 'none';
    if (canvasEl) canvasEl.style.cursor = '';
  }
}

function deleteSelectedWall() {
  if (!state.selectedWallId) { showToast('Select a wall first'); return; }
  pushHistory();
  state.walls = state.walls.filter(w => w.id !== state.selectedWallId);
  state.selectedWallId = null;
  renderAll();
}

/* =================================================================
   PANNING & ZOOMING EVENT LISTENERS (IIFE SETUP)
   ================================================================= */
(function setupPanZoom() {
  const container = document.getElementById('canvasContainer');
  if (!container) return;
  let isPanning = false, panStartX = 0, panStartY = 0, panOrigX = 0, panOrigY = 0;
  let isRotating = false, rotStartX = 0, rotStartY = 0, rotOrigX = 0, rotOrigZ = 0;

  function isCanvasBg(target) {
    const canvasEl = getCanvas();
    const canvasWrapEl = getCanvasWrap();
    return target === canvasEl ||
      target === canvasWrapEl ||
      target === container ||
      target.id === 'wallDrawPreview' ||
      target.id === 'pathArrowSvg';
  }

  function startPan(e) {
    if (state.is3D && e.button === 0) {
      isRotating = true;
      rotStartX = e.clientX;
      rotStartY = e.clientY;
      rotOrigX = state.rotX !== undefined ? state.rotX : 52;
      rotOrigZ = state.rotZ !== undefined ? state.rotZ : -30;
      container.style.cursor = 'grab';
    } else {
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      panOrigX = state.panX;
      panOrigY = state.panY;
      container.style.cursor = 'grabbing';
    }
    container.classList.add('is-dragging');
    window._lastPanMoved = false;
    e.preventDefault();
    e.stopPropagation();
  }

  function stopPan() {
    isPanning = false;
    isRotating = false;
    container.style.cursor = '';
    container.classList.remove('is-dragging');
  }

  window._lastPanMoved = false;

  container.addEventListener('mousedown', function (e) {
    if (e.button === 1) {
      startPan(e);
    } else if (e.button === 0 && isCanvasBg(e.target) && !_wallToolActive) {
      startPan(e);
    }
  }, true);

  window.addEventListener('mousemove', function (e) {
    if (isRotating) {
      const dx = e.clientX - rotStartX, dy = e.clientY - rotStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) window._lastPanMoved = true;
      state.rotZ = rotOrigZ - dx * 0.5;
      state.rotX = rotOrigX - dy * 0.5;
      state.rotX = Math.max(0, Math.min(90, state.rotX));
      applyCanvasTransform();
    } else if (isPanning) {
      const dx = e.clientX - panStartX, dy = e.clientY - panStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) window._lastPanMoved = true;
      state.panX = panOrigX + dx;
      state.panY = panOrigY + dy;
      applyCanvasTransform();
    }
  });

  window.addEventListener('mouseup', function () {
    stopPan();
  });

  container.addEventListener('contextmenu', function (e) {
    if (e.button === 1) e.preventDefault();
  });

  container.addEventListener('wheel', function (e) {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldZoom = state.zoom;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(3, Math.max(0.15, oldZoom * factor));
    state.panX = mx - (mx - state.panX) * (newZoom / oldZoom);
    state.panY = my - (my - state.panY) * (newZoom / oldZoom);
    state.zoom = newZoom;
    const sl = document.getElementById('zoomSlider');
    if (sl) { sl.value = state.zoom; }
    const zv = document.getElementById('zoomVal');
    if (zv) zv.textContent = Math.round(state.zoom * 100) + '%';
    applyCanvasTransform();
  }, { passive: false });
})();

/* =================================================================
   PROPERTY LISTENERS (SETUP)
   ================================================================= */
(function setupPropertyListeners() {
  const listen = (id, eventName, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(eventName, handler);
  };

  listen('pname', 'input', function () {
    const el = getSelected();
    if (el) { el.name = this.value; renderCanvas(); }
  });

  listen('pwidth', 'change', function () {
    pushHistory();
    const el = getSelected();
    if (el) { el.w = parseInt(this.value); renderCanvas(); }
  });

  listen('pheight', 'change', function () {
    pushHistory();
    const el = getSelected();
    if (el) { el.h = parseInt(this.value); renderCanvas(); }
  });

  listen('px', 'change', function () {
    pushHistory();
    const el = getSelected();
    if (el) { el.x = parseInt(this.value); renderCanvas(); }
  });

  listen('py', 'change', function () {
    pushHistory();
    const el = getSelected();
    if (el) { el.y = parseInt(this.value); renderCanvas(); }
  });

  listen('prot', 'input', function () {
    const el = getSelected();
    if (el) { el.r = parseInt(this.value); renderCanvas(); }
  });

  listen('prot', 'change', function () {
    pushHistory();
  });

  listen('pstairDir', 'change', function () {
    pushHistory();
    const el = getSelected();
    if (el) { el.stairDir = this.value; renderCanvas(); }
  });

  listen('pstairElevation', 'change', function () {
    pushHistory();
    const el = getSelected();
    if (el) { el.stairElevation = parseInt(this.value) || 0; renderCanvas(); }
  });

  listen('pcolor', 'change', function () {
    pushHistory();
    const el = getSelected();
    if (el) { el.color = this.value; renderCanvas(); }
  });

  listen('pisStairs', 'change', function () {
    pushHistory();
    const el = getSelected();
    if (el) { el.isStairs = this.checked; renderCanvas(); }
  });

  const canvasEl = getCanvas();
  const canvasWrapEl = getCanvasWrap();
  if (canvasEl) {
    canvasEl.addEventListener('click', function (e) {
      if (window._lastPanMoved) return;
      if (window._marqueeMoved) return;
      if (e.target === canvasEl || e.target.id === 'wallDrawPreview' || e.target === canvasWrapEl) {
        state.selectedIds = [];
        state.selectedWallId = null;
        renderAll();
      }
    });

    canvasEl.addEventListener('mousedown', function (e) {
      if (state.is3D) return;
      if (e.target !== canvasEl && e.target.id !== 'wallDrawPreview') return;
      
      if (!_wallToolActive) {
        if (e.button !== 0) return;
        e.preventDefault();
        window._marqueeMoved = false;
        const rect = canvasEl.getBoundingClientRect();
        const startX = (e.clientX - rect.left) / state.zoom;
        const startY = (e.clientY - rect.top) / state.zoom;
        
        const marquee = document.createElement('div');
        marquee.className = 'marquee-selection';
        marquee.style.cssText = `position:absolute; border: 1px dashed #2196f3; background: rgba(33, 150, 243, 0.1); left:${startX}px; top:${startY}px; width:0; height:0; pointer-events:none; z-index:999;`;
        canvasEl.appendChild(marquee);
        
        const onMove = ev => {
           window._marqueeMoved = true;
           const currX = (ev.clientX - rect.left) / state.zoom;
           const currY = (ev.clientY - rect.top) / state.zoom;
           const x = Math.min(startX, currX);
           const y = Math.min(startY, currY);
           const w = Math.abs(currX - startX);
           const h = Math.abs(currY - startY);
           marquee.style.left = x + 'px';
           marquee.style.top = y + 'px';
           marquee.style.width = w + 'px';
           marquee.style.height = h + 'px';
        };
        
        const onUp = ev => {
           window.removeEventListener('mousemove', onMove);
           window.removeEventListener('mouseup', onUp);
           marquee.remove();
           
           if (!window._marqueeMoved) return;
           
           const currX = (ev.clientX - rect.left) / state.zoom;
           const currY = (ev.clientY - rect.top) / state.zoom;
           const rx1 = Math.min(startX, currX);
           const ry1 = Math.min(startY, currY);
           const rx2 = Math.max(startX, currX);
           const ry2 = Math.max(startY, currY);
           
           if (!e.shiftKey) state.selectedIds = [];
           
           const block = curBlock();
           if (block) {
             block.elements.forEach(el => {
                if (el.x < rx2 && el.x + el.w > rx1 && el.y < ry2 && el.y + el.h > ry1) {
                   if (!state.selectedIds.includes(el.id)) state.selectedIds.push(el.id);
                   if (el.groupId) {
                       block.elements.forEach(gel => {
                          if (gel.groupId === el.groupId && !state.selectedIds.includes(gel.id)) state.selectedIds.push(gel.id);
                       });
                   }
                }
             });
           }
           renderAll();
           setTimeout(() => window._marqueeMoved = false, 50);
        };
        
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const rect = canvasEl.getBoundingClientRect();
      let sx = (e.clientX - rect.left) / state.zoom;
      let sy = (e.clientY - rect.top) / state.zoom;
      if (document.getElementById('snapToggle').checked) {
        sx = Math.round(sx / state.gridSize) * state.gridSize;
        sy = Math.round(sy / state.gridSize) * state.gridSize;
      }

      const WALL_THICKNESS = 8;
      const preview = document.getElementById('wallDrawPreview');
      if (!preview) return;
      preview.style.display = 'block';
      preview.style.left = sx + 'px';
      preview.style.top = (sy - WALL_THICKNESS / 2) + 'px';
      preview.style.width = '0px';
      preview.style.height = WALL_THICKNESS + 'px';
      preview._wall = null;

      const onMove = ev => {
        let ex = (ev.clientX - rect.left) / state.zoom;
        let ey = (ev.clientY - rect.top) / state.zoom;
        if (document.getElementById('snapToggle').checked) {
          ex = Math.round(ex / state.gridSize) * state.gridSize;
          ey = Math.round(ey / state.gridSize) * state.gridSize;
        }
        const dx = ex - sx, dy = ey - sy;
        let wx, wy, ww, wh;
        if (Math.abs(dx) >= Math.abs(dy)) {
          wx = Math.min(sx, ex);
          wy = sy - WALL_THICKNESS / 2;
          ww = Math.max(Math.abs(dx), 1);
          wh = WALL_THICKNESS;
        } else {
          wx = sx - WALL_THICKNESS / 2;
          wy = Math.min(sy, ey);
          ww = WALL_THICKNESS;
          wh = Math.max(Math.abs(dy), 1);
        }
        preview.style.left = wx + 'px';
        preview.style.top = wy + 'px';
        preview.style.width = ww + 'px';
        preview.style.height = wh + 'px';
        preview._wall = { wx, wy, ww, wh };
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        preview.style.display = 'none';
        const w = preview._wall;
        if (!w || (w.ww < 20 && w.wh < 20)) { showToast('Drag longer to draw a wall'); return; }
        pushHistory();
        state.walls.push({
          id: Date.now(),
          floorId: state.currFloorId,
          x: Math.round(w.wx),
          y: Math.round(w.wy),
          w: Math.round(w.ww),
          h: Math.round(w.wh)
        });
        renderCanvas();
        showToast('Wall added — press Esc to exit wall mode');
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }
})();

/* =================================================================
   KEYBOARD shortcuts
   ================================================================= */
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (state.selectedWallId) {
      deleteSelectedWall();
    } else {
      deleteSelected();
    }
  }
  if (e.key === 'Escape') {
    state.selectedIds = [];
    state.selectedWallId = null;
    if (_wallToolActive) toggleWallTool();
    renderAll();
  }
  if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
    e.preventDefault();
    copyElements();
  }
  if (e.ctrlKey && (e.key === 'x' || e.key === 'X')) {
    e.preventDefault();
    cutElements();
  }
  if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
    e.preventDefault();
    pasteElements();
  }
  if (e.ctrlKey && !e.shiftKey && (e.key === 'g' || e.key === 'G')) {
    e.preventDefault();
    groupElements();
  }
  if (e.ctrlKey && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
    e.preventDefault();
    ungroupElements();
  }
  if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    undo();
  }
  if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
    e.preventDefault();
    redo();
  }
  if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
    e.preventDefault();
    duplicateSelected();
  }
  if (state.selectedIds && state.selectedIds.length > 0) {
    const els = getSelectedElements();
    let moved = false;
    if (e.key === 'ArrowRight') { els.forEach(el => el.x += 1); moved = true; }
    if (e.key === 'ArrowLeft') { els.forEach(el => el.x -= 1); moved = true; }
    if (e.key === 'ArrowUp') { els.forEach(el => el.y -= 1); moved = true; }
    if (e.key === 'ArrowDown') { els.forEach(el => el.y += 1); moved = true; }
    if (moved) {
      e.preventDefault();
      renderCanvas();
      updatePropsPanel();
    }
  }
});
