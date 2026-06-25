let _pathState = null;

function setPathState(val) {
  _pathState = val;
}

/* =================================================================
   PATH FINDER (Dijkstra across floors)
   ================================================================= */
function rectCenter(el) {
  return { x: el.x + el.w / 2, y: el.y + el.h / 2 };
}

function rectsOverlapOrTouch(a, b, tolerance = 5) {
  return !(a.x + a.w + tolerance < b.x ||
    b.x + b.w + tolerance < a.x ||
    a.y + a.h + tolerance < b.y ||
    b.y + b.h + tolerance < a.y);
}

function dist(a, b) {
  const ca = rectCenter(a), cb = rectCenter(b);
  return Math.sqrt((ca.x - cb.x) ** 2 + (ca.y - cb.y) ** 2);
}

// Passage types — path can only travel THROUGH these element types
const PASSAGE_TYPES = new Set(['corridor', 'door', 'elevator', 'staircase', 'hall', 'window', 'entry_exit', 'waypoint']);

function isPassage(el) {
  const t = (el.type || '').toLowerCase();
  return PASSAGE_TYPES.has(t) || t.startsWith('corridor') || el.isStairs;
}

// Returns the shared edge region between two touching rects, or null if not touching
function getSharedEdge(a, b, tolerance = 8) {
  const aR = a.x + a.w, aB = a.y + a.h;
  const bR = b.x + b.w, bB = b.y + b.h;

  // Vertical shared edge (left-right)
  if (Math.abs(aR - b.x) <= tolerance || Math.abs(bR - a.x) <= tolerance) {
    const edgeX = Math.abs(aR - b.x) <= tolerance ? (aR + b.x) / 2 : (bR + a.x) / 2;
    const y0 = Math.max(a.y, b.y), y1 = Math.min(aB, bB);
    if (y1 > y0) return { x: edgeX, y: (y0 + y1) / 2, y0, y1, x0: edgeX, x1: edgeX, axis: 'v' };
  }
  // Horizontal shared edge (top-bottom)
  if (Math.abs(aB - b.y) <= tolerance || Math.abs(bB - a.y) <= tolerance) {
    const edgeY = Math.abs(aB - b.y) <= tolerance ? (aB + b.y) / 2 : (bB + a.y) / 2;
    const x0 = Math.max(a.x, b.x), x1 = Math.min(aR, bR);
    if (x1 > x0) return { x: (x0 + x1) / 2, y: edgeY, x0, x1, y0: edgeY, y1: edgeY, axis: 'h' };
  }
  // Overlapping
  const ox0 = Math.max(a.x, b.x), ox1 = Math.min(aR, bR);
  const oy0 = Math.max(a.y, b.y), oy1 = Math.min(aB, bB);
  if (ox1 > ox0 && oy1 > oy0) return { x: (ox0 + ox1) / 2, y: (oy0 + oy1) / 2, axis: 'o' };
  return null;
}

// Check if any door/passage element from the block's elements sits on the shared edge between a and b
function doorOnSharedEdge(a, b, blockEls, tolerance = 20) {
  const edge = getSharedEdge(a, b);
  if (!edge) return false;

  for (const el of blockEls) {
    if (!(['door', 'window', 'entry_exit'].includes((el.type || '').toLowerCase()))) continue;
    const er = el.x + el.w, eb = el.y + el.h;

    if (edge.axis === 'v') {
      const doorCx = el.x + el.w / 2;
      if (Math.abs(doorCx - edge.x) <= tolerance) {
        const dy0 = Math.max(el.y, edge.y0), dy1 = Math.min(eb, edge.y1);
        if (dy1 > dy0) return true;
      }
    } else if (edge.axis === 'h') {
      const doorCy = el.y + el.h / 2;
      if (Math.abs(doorCy - edge.y) <= tolerance) {
        const dx0 = Math.max(el.x, edge.x0), dx1 = Math.min(er, edge.x1);
        if (dx1 > dx0) return true;
      }
    } else if (edge.axis === 'o') {
      if (Math.abs((el.x + el.w / 2) - edge.x) <= tolerance &&
        Math.abs((el.y + el.h / 2) - edge.y) <= tolerance) return true;
    }
  }
  return false;
}

// Check if a wall on the current floor blocks the shared boundary between two elements
function wallBlocksEdge(a, b, floorId) {
  const edge = getSharedEdge(a, b);
  if (!edge) return false;

  const floorWalls = state.walls.filter(w => w.floorId === floorId);
  if (floorWalls.length === 0) return false;

  for (const wall of floorWalls) {
    const wR = wall.x + wall.w, wB = wall.y + wall.h;

    if (edge.axis === 'v') {
      if (wall.x <= edge.x + 8 && wR >= edge.x - 8) {
        const wy0 = Math.max(wall.y, edge.y0), wy1 = Math.min(wB, edge.y1);
        const overlapLen = wy1 - wy0;
        const edgeLen = edge.y1 - edge.y0;
        if (overlapLen > edgeLen * 0.4) return true;
      }
    } else if (edge.axis === 'h') {
      if (wall.y <= edge.y + 8 && wB >= edge.y - 8) {
        const wx0 = Math.max(wall.x, edge.x0), wx1 = Math.min(wR, edge.x1);
        const overlapLen = wx1 - wx0;
        const edgeLen = edge.x1 - edge.x0;
        if (overlapLen > edgeLen * 0.4) return true;
      }
    } else if (edge.axis === 'o') {
      if (wall.x < edge.x + 10 && wR > edge.x - 10 && wall.y < edge.y + 10 && wB > edge.y - 10) return true;
    }
  }
  return false;
}

function buildGraph() {
  const adj = new Map();
  const allEls = allElements().filter(r => r.el.type !== 'text');

  allEls.forEach(r => adj.set(r.el.id, []));

  state.floors.forEach(f => {
    const floorEls = f.blocks.flatMap(b => b.elements).filter(el => el.type !== 'text');

    for (let i = 0; i < floorEls.length; i++) {
      for (let j = i + 1; j < floorEls.length; j++) {
        const a = floorEls[i], bEl = floorEls[j];
        if (!rectsOverlapOrTouch(a, bEl)) continue;

        const blocked = wallBlocksEdge(a, bEl, f.id);
        if (blocked) {
          const hasDoorOpening = doorOnSharedEdge(a, bEl, floorEls);
          if (!hasDoorOpening) continue;
        }

        const edgePoint = getSharedWallMidpoint(a, bEl);

        const aCenter = rectCenter(a);

        const d = Math.sqrt(
          (aCenter.x - edgePoint.x) ** 2 +
          (aCenter.y - edgePoint.y) ** 2
        );
        adj.get(a.id).push({
          neighborId: bEl.id,
          cost: d,
          type: 'same',
          meta: {
            floorId: f.id,
            floorName: f.name,
            transition: edgePoint
          }
        });

        adj.get(bEl.id).push({
          neighborId: a.id,
          cost: d,
          type: 'same',
          meta: {
            floorId: f.id,
            floorName: f.name,
            transition: edgePoint
          }
        });
      }
    }
  });

  const STAIR_COST = 120;
  const JUNCTION_COST = 35;
  state.stairLinks.forEach(lk => {
    if (adj.has(lk.fromElId) && adj.has(lk.toElId)) {
      const fromFloor = state.floors.find(f => f.id === lk.fromFloorId);
      const toFloor = state.floors.find(f => f.id === lk.toFloorId);
      const fromRec = getElById(lk.fromElId);
      const toRec = getElById(lk.toElId);
      const isCrossFloor = lk.fromFloorId !== lk.toFloorId;
      const usesJunction = !!(fromRec && toRec && (isVerticalJunction(fromRec.el) || isVerticalJunction(toRec.el)));
      const linkCost = isCrossFloor ? STAIR_COST : JUNCTION_COST;
      const baseMeta = { usesJunction, isCrossFloor };

      adj.get(lk.fromElId).push({
        neighborId: lk.toElId, cost: linkCost, type: 'stair',
        meta: { ...baseMeta, fromFloorName: fromFloor?.name, toFloorName: toFloor?.name }
      });
      adj.get(lk.toElId).push({
        neighborId: lk.fromElId, cost: linkCost, type: 'stair',
        meta: { ...baseMeta, fromFloorName: toFloor?.name, toFloorName: fromFloor?.name }
      });
    }
  });

  const LINK_COST = 100;
  state.universalLinks.forEach(lk => {
    if (adj.has(lk.fromElId) && adj.has(lk.toElId)) {
      const fromFloor = state.floors.find(f => f.id === lk.fromFloorId);
      const toFloor = state.floors.find(f => f.id === lk.toFloorId);
      const isCrossFloor = lk.fromFloorId !== lk.toFloorId;
      adj.get(lk.fromElId).push({
        neighborId: lk.toElId, cost: LINK_COST, type: isCrossFloor ? 'universal' : 'same',
        meta: { fromFloorName: fromFloor?.name, toFloorName: toFloor?.name, floorId: lk.toFloorId, floorName: toFloor?.name, isUniversalLink: true }
      });
      adj.get(lk.toElId).push({
        neighborId: lk.fromElId, cost: LINK_COST, type: isCrossFloor ? 'universal' : 'same',
        meta: { fromFloorName: toFloor?.name, toFloorName: fromFloor?.name, floorId: lk.fromFloorId, floorName: fromFloor?.name, isUniversalLink: true }
      });
    }
  });

  return adj;
}

function dijkstra(adj, startId, endId) {
  const dist2 = new Map();
  const prev = new Map();
  const edgeMeta = new Map();
  const visited = new Set();
  const pq = [];

  adj.forEach((_, id) => dist2.set(id, Infinity));
  dist2.set(startId, 0);
  pq.push({ cost: 0, id: startId });

  while (pq.length) {
    pq.sort((a, b) => a.cost - b.cost);
    const { cost, id } = pq.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    if (id === endId) break;

    const neighbors = adj.get(id) || [];
    neighbors.forEach(({ neighborId, cost: edgeCost, type, meta }) => {
      const newCost = cost + edgeCost;
      if (newCost < dist2.get(neighborId)) {
        dist2.set(neighborId, newCost);
        prev.set(neighborId, id);
        edgeMeta.set(neighborId, { type, meta });
        pq.push({ cost: newCost, id: neighborId });
      }
    });
  }

  if (dist2.get(endId) === Infinity) return null;

  const path = [];
  const edges = [];
  let cur = endId;
  while (cur !== undefined) {
    path.unshift(cur);
    const meta = edgeMeta.get(cur);
    if (meta) edges.unshift({ to: cur, from: prev.get(cur), ...meta });
    cur = prev.get(cur);
  }
  return { path, cost: dist2.get(endId), edges };
}

function clearPathfinderStops() {
  const container = document.getElementById('pfStopsContainer');
  if (container) container.innerHTML = '';
}

function addPathfinderStop() {
  const container = document.getElementById('pfStopsContainer');
  if (!container) return;

  const allEls = allElements();
  const rooms = allEls.filter(r =>
    !['door', 'window', 'entry_exit', 'text'].includes(r.el.type?.toLowerCase()) &&
    !r.el.type?.startsWith('Corridor-') &&
    r.el.type !== 'Corridor'
  );

  const row = document.createElement('div');
  row.className = 'pathfinder-stop-row';
  row.style.cssText = 'display:flex; gap:6px; align-items:center; margin-top:4px;';

  const select = document.createElement('select');
  select.className = 'pf-stop-select';
  select.style.cssText = 'flex:1; margin-bottom:0;';
  select.onchange = clearPathResult;

  rooms.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.el.id;
    opt.textContent = elLabel(r);
    select.appendChild(opt);
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'danger';
  delBtn.style.cssText = 'padding:6px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; flex-shrink:0;';
  delBtn.innerHTML = '✕';
  delBtn.onclick = () => {
    row.remove();
    clearPathResult();
  };

  row.appendChild(select);
  row.appendChild(delBtn);
  container.appendChild(row);

  if (window.lucide) window.lucide.createIcons();
}

function openPathFinder() {
  clearPathHighlights();
  clearPathfinderStops();
  const allEls = allElements();
  const rooms = allEls.filter(r => !['door', 'window', 'entry_exit', 'text'].includes(r.el.type?.toLowerCase()) && !r.el.type?.startsWith('Corridor-') && r.el.type !== 'Corridor');

  const fromSel = document.getElementById('pfFrom');
  const toSel = document.getElementById('pfTo');
  fromSel.innerHTML = '';
  toSel.innerHTML = '';

  rooms.forEach(r => {
    const opt1 = document.createElement('option');
    opt1.value = r.el.id;
    opt1.textContent = elLabel(r);
    fromSel.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = r.el.id;
    opt2.textContent = elLabel(r);
    toSel.appendChild(opt2);
  });

  if (toSel.options.length > 1) toSel.selectedIndex = 1;

  clearPathResult();
  document.getElementById('pathModal').classList.remove('hidden');
}

function closePathModal() {
  document.getElementById('pathModal').classList.add('hidden');
}

function clearPathResult() {
  document.getElementById('pathResult').innerHTML = '';
}

function clearPathHighlights() {
  _pathState = null;
  document.querySelectorAll('.element').forEach(el => {
    el.classList.remove('path-highlight', 'path-start', 'path-end');
    const badge = el.querySelector('.path-num');
    if (badge) badge.remove();
  });
  const svg = document.getElementById('pathArrowSvg');
  if (svg) svg.innerHTML = '';
  const bar = document.getElementById('pathFloorBar');
  if (bar) { bar.innerHTML = ''; bar.style.display = 'none'; }
  const cb = document.getElementById('pathClearBtn');
  if (cb) cb.style.display = 'none';
}

function findTransitionElement(a, b, floorEls) {
  for (const el of floorEls) {
    if (el.id === a.id || el.id === b.id) continue;
    const type = (el.type || '').toLowerCase();
    if (['door', 'window', 'entry_exit'].includes(type)) {
      if (rectsOverlapOrTouch(el, a, 12) && rectsOverlapOrTouch(el, b, 12)) {
        return el;
      }
    }
  }
  return null;
}

function getSharedWallMidpoint(a, b) {
  const rec = getElById(a.id);
  const isAPassage = isPassage(a);
  const isBPassage = isPassage(b);
  const isAOpen = ['door', 'window', 'entry_exit', 'waypoint'].includes((a.type || '').toLowerCase());
  const isBOpen = ['door', 'window', 'entry_exit', 'waypoint'].includes((b.type || '').toLowerCase());

  if (rec && !isAOpen && !isBOpen && (!isAPassage || !isBPassage)) {
    const floor = state.floors.find(f => f.id === rec.floorId);
    const floorEls = floor ? floor.blocks.flatMap(bl => bl.elements) : [];
    const transitionEl = findTransitionElement(a, b, floorEls);
    if (transitionEl) {
      const edge = getSharedEdge(a, b, 12);
      return {
        x: transitionEl.x + transitionEl.w / 2,
        y: transitionEl.y + transitionEl.h / 2,
        axis: edge ? edge.axis : 'f'
      };
    }
  }

  const edge = getSharedEdge(a, b, 10);
  if (edge) return edge;

  return {
    x: (a.x + a.w / 2 + b.x + b.w / 2) / 2,
    y: (a.y + a.h / 2 + b.y + b.h / 2) / 2,
    axis: 'f'
  };
}

function runPathFinder() {
  clearPathHighlights();
  const fromId = parseInt(document.getElementById('pfFrom').value);
  const toId = parseInt(document.getElementById('pfTo').value);

  if (fromId === toId) {
    document.getElementById('pathResult').innerHTML = '<div class="path-empty">Start and end are the same room!</div>';
    return;
  }

  const stopSelects = document.querySelectorAll('.pf-stop-select');
  const stopIds = Array.from(stopSelects).map(sel => parseInt(sel.value));
  const sequence = [fromId, ...stopIds, toId];

  const adj = buildGraph();
  let combinedPath = [];
  let combinedEdges = [];
  let success = true;

  for (let i = 0; i < sequence.length - 1; i++) {
    const sId = sequence[i];
    const eId = sequence[i + 1];
    if (sId === eId) continue;
    const res = dijkstra(adj, sId, eId);
    if (!res) {
      success = false;
      break;
    }
    if (i === 0) {
      combinedPath.push(...res.path);
    } else {
      combinedPath.push(...res.path.slice(1));
    }
    combinedEdges.push(...res.edges);
  }

  const result = success ? { path: combinedPath, edges: combinedEdges } : null;
  const resultDiv = document.getElementById('pathResult');

  if (!result) {
    const fromRec = getElById(fromId);
    const toRec = getElById(toId);
    const sameFloor = fromRec && toRec && fromRec.floorId === toRec.floorId;

    let reason = '';
    let fix = '';

    if (!sameFloor) {
      const fromFloorHasLinks = state.stairLinks.some(lk => lk.fromFloorId === fromRec?.floorId || lk.toFloorId === fromRec?.floorId)
        || state.universalLinks.some(lk => lk.fromFloorId === fromRec?.floorId || lk.toFloorId === fromRec?.floorId);
      const toFloorHasLinks = state.stairLinks.some(lk => lk.fromFloorId === toRec?.floorId || lk.toFloorId === toRec?.floorId)
        || state.universalLinks.some(lk => lk.fromFloorId === toRec?.floorId || lk.toFloorId === toRec?.floorId);
      const totalLinks = state.stairLinks.length + state.universalLinks.length;

      if (totalLinks === 0) {
        reason = 'No connections exist between any floors.';
        fix = 'Select any element on the canvas → click <b>🔗 Link to Any Element</b> in the Properties panel to connect elements across floors. You can also use Staircase, Elevator, or Stair Hall linking.';
      } else if (!fromFloorHasLinks) {
        reason = `<b>${fromRec?.floorName}</b> has no cross-floor links.`;
        fix = `Go to <b>${fromRec?.floorName}</b>, select any element → click <b>🔗 Link to Any Element</b> to connect it to an element on another floor.`;
      } else if (!toFloorHasLinks) {
        reason = `<b>${toRec?.floorName}</b> has no cross-floor links.`;
        fix = `Go to <b>${toRec?.floorName}</b>, select any element → click <b>🔗 Link to Any Element</b> to connect it to an element on another floor.`;
      } else {
        reason = 'The linked elements on each floor are not connected to the rooms in the path.';
        fix = 'Make sure the linked elements are touching (overlapping) corridors or rooms on their floor, forming a connected chain.';
      }
    } else {
      reason = 'The rooms are on the same floor but no connected path exists between them.';
      fix = 'Paths travel through <b>Corridors</b>, <b>Doors</b>, <b>Elevators</b>, <b>Staircases</b>, <b>Stair Halls</b>, and <b>Element Links</b>. Make sure each room touches a Corridor or has a Door element on its shared wall, or use <b>🔗 Link to Any Element</b> to directly connect them.';
    }

    resultDiv.innerHTML = `<div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:8px;padding:12px;font-size:13px;line-height:1.6;">
      <div style="font-weight:700;color:#dc2626;margin-bottom:6px;">❌ No path found</div>
      <div style="color:#7f1d1d;margin-bottom:8px;">${reason}</div>
      <div style="background:#fef2f2;border-radius:6px;padding:8px;color:#991b1b;">
        <b>How to fix:</b><br>${fix}
      </div>
    </div>`;
    return;
  }

  const { path, edges } = result;
  const numFloors = new Set(path.map(id => getElById(id)?.floorId)).size;

  resultDiv.innerHTML = `<div class="path-summary" style="margin-bottom:8px;">
    ✅ Path found — <strong>${path.length} spaces</strong> across <strong>${numFloors} floor(s)</strong>
    ${numFloors > 1 ? '<br><span style="font-size:12px;color:#8e44ad;">Use the floor switcher on the map to see each floor.</span>' : ''}
  </div>`;

  _pathState = { path, edges };

  const startRec = getElById(fromId);
  if (startRec) {
    state.currFloorId = startRec.floorId;
    state.currBlockId = startRec.blockId;
    state.selectedId = null;
    renderAll();
  }

  document.getElementById('pathModal').classList.add('hidden');

  setTimeout(() => {
    const activeFloor = startRec ? startRec.floorId : state.currFloorId;
    drawPathArrows(path, edges, activeFloor, true);
    applyPathHighlights(path, activeFloor);
    buildFloorBar(path, edges, activeFloor);
    const cb = document.getElementById('pathClearBtn');
    if (cb) cb.style.display = 'block';
    showToast(`Path found: ${path.length} steps — animating on map`);
  }, 60);
}
