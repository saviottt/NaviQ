# Horizontal & Vertical Wall Resize Handle Implementation

## 1. Overview
This document explains the technical implementation for positioning wall extend/resize handles on the **left edge** (for horizontal walls) and **top edge** (for vertical walls), alongside the mathematical formulation required for rotation-safe 2D canvas transformation.

---

## 2. UI & DOM Structural Layout (`renderer.js`)

When wall elements are rendered into the DOM canvas, handle elements are attached based on wall orientation:

### Horizontal Walls (`axis === 'h'`)
- **Extend / Resize Handle (`.wall-extend-handle`)**: Positioned at `left: -6px`, `top: 50%` (centered vertically on the left edge). Dragging this handle modifies the wall length from the left edge.
- **Action / Delete Handle (`.wall-cancel-btn`)**: Positioned at `right: -10px`, `top: 50%` (on the right edge) to allow wall deletion without visual collision with the resize handle.

### Vertical Walls (`axis === 'v'`)
- **Extend / Resize Handle (`.wall-extend-handle`)**: Positioned at `top: -6px`, `left: 50%` (centered horizontally on the top edge). Dragging this handle modifies the wall height from the top edge.
- **Action / Delete Handle (`.wall-cancel-btn`)**: Positioned at `bottom: -10px`, `left: 50%` (on the bottom edge).

---

## 3. Interaction & Event Handling (`interactions.js`)

Mouse interactions are initialized via `startWallResize(e, wall, axis)` on `mousedown`:
1. `e.stopPropagation()` and `e.preventDefault()` prevent canvas panning or selection triggers.
2. Initial positions `startX, startY`, initial dimensions `origW, origH`, and initial coordinates `origX, origY` are stored.
3. A global `mousemove` listener tracks drag deltas until `mouseup`.

---

## 4. Mathematical Formulation for Rotation-Safe Resizing

Because elements in the DOM are rendered with `transform-origin: center`, changing the element's width ($W$) or height ($H$) shifts its geometric center. To keep the opposite edge anchored stationary in global 2D world coordinates while dragging the left/top edge, the origin coordinates $(x, y)$ must undergo exact trigonometric translation.

### Step A: Screen Delta to Canvas Delta
$$\text{dx} = \frac{\text{clientX} - \text{startX}}{\text{state.zoom}}$$
$$\text{dy} = \frac{\text{clientY} - \text{startY}}{\text{state.zoom}}$$

### Step B: Angle Conversion & Trigonometric Terms
Let $\theta$ be the wall rotation angle in degrees (`wall.r || 0`).
$$\text{rad} = \theta \times \frac{\pi}{180}$$
$$\text{cos} = \cos(\text{rad}), \quad \text{sin} = \sin(\text{rad})$$

### Step C: Horizontal Wall Resizing (Left Edge)
1. **Projection onto Wall Local Vector**:
   $$ds = \text{dx} \cdot \cos + \text{dy} \cdot \sin$$
2. **New Width Calculation & Snap**:
   $$W_{\text{new}} = \max(8, \text{snap}(W_{\text{orig}} - ds))$$
   $$dw = W_{\text{orig}} - W_{\text{new}}$$
3. **Rotation-Safe Coordinate Translation**:
   $$\text{wall.w} = W_{\text{new}}$$
   $$\text{wall.x} = \text{origX} + \left(\frac{dw}{2}\right) \cdot (1 + \cos)$$
   $$\text{wall.y} = \text{origY} + \left(\frac{dw}{2}\right) \cdot \sin$$

### Step D: Vertical Wall Resizing (Top Edge)
1. **Projection onto Wall Local Vector**:
   $$ds = -\text{dx} \cdot \sin + \text{dy} \cdot \cos$$
2. **New Height Calculation & Snap**:
   $$H_{\text{new}} = \max(8, \text{snap}(H_{\text{orig}} + ds))$$
   $$dh = H_{\text{orig}} - H_{\text{new}}$$
3. **Rotation-Safe Coordinate Translation**:
   $$\text{wall.h} = H_{\text{new}}$$
   $$\text{wall.x} = \text{origX} + \left(\frac{dh}{2}\right) \cdot \sin$$
   $$\text{wall.y} = \text{origY} + \left(\frac{dh}{2}\right) \cdot (1 - \cos)$$

---

## 5. JavaScript Reference Code (`interactions.js`)

```javascript
function startWallResize(e, wall, axis) {
  e.stopPropagation(); e.preventDefault();
  const startX = e.clientX, startY = e.clientY;
  const origW = wall.w, origH = wall.h;
  const origX = wall.x, origY = wall.y;

  const onMove = ev => {
    const dx = (ev.clientX - startX) / state.zoom;
    const dy = (ev.clientY - startY) / state.zoom;
    const rad = (wall.r || 0) * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    if (axis === 'h') {
      const ds = dx * cos + dy * sin;
      const newW = Math.max(8, snap(origW - ds));
      const dw = origW - newW;
      wall.w = newW;
      wall.x = origX + (dw / 2) * (1 + cos);
      wall.y = origY + (dw / 2) * sin;
    } else {
      const ds = -dx * sin + dy * cos;
      const newH = Math.max(8, snap(origH + ds));
      const dh = origH - newH;
      wall.h = newH;
      wall.x = origX + (dh / 2) * sin;
      wall.y = origY + (dh / 2) * (1 - cos);
    }

    const div = document.getElementById('wall-' + wall.id);
    if (div) {
      div.style.left = wall.x + 'px';
      div.style.top = wall.y + 'px';
      div.style.width = wall.w + 'px';
      div.style.height = wall.h + 'px';
      div.style.transform = `rotate(${wall.r || 0}deg)`;
    }
  };
  // ... event listeners for mousemove and mouseup
}
```
