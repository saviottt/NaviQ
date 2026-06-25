# 3D Design Plan: Hybrid 2D / 3D Editor

We can achieve a fully functional 3D rendering of the building layout editor **without touching any logical coordinates, state management, or drag-drop calculations** by utilizing **CSS 3D Transforms (`perspective`, `transform-style: preserve-3d`)**.

---

## Architectural Approach

We will implement a **2D Design / 3D View Mode** toggle:
1. **2D Design Mode (Default)**: Standard flat top-down view. Editing, drawing walls, and resizing work perfectly with mouse coordinates.
2. **3D View Mode**: The canvas tilts back into a 3D isometric perspective using a smooth transition. Walls and rooms extrude vertically along the Z-axis. Path lines float in 3D space above the floor. Editing/dragging is disabled or locked in 3D mode to avoid projection coordinate mapping errors.

---

## Component-Level Details

### 1. Canvas 3D Perspective Wrapper
- We wrap the canvas in a perspective view:
  ```css
  .canvas-container.mode-3d {
    perspective: 1500px;
    perspective-origin: 50% 50%;
  }
  .canvas-wrap.mode-3d {
    transform: translate(var(--pan-x), var(--pan-y)) scale(var(--zoom)) rotateX(55deg) rotateZ(-35deg);
    transform-style: preserve-3d;
    transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1);
  }
  ```

### 2. Room Extrusion (CSS 3D blocks)
- Rooms (`.element`) in 3D mode are given a base height and standard CSS pseudo-elements (`::before` / `::after`) or drop-shadow offsets to simulate a solid 3D box.
- Example:
  ```css
  .mode-3d .element {
    transform: translateZ(10px);
    box-shadow: 
      -1px 1px 0px #d1d5db,
      -2px 2px 0px #d1d5db,
      -3px 3px 0px #caccce,
      -4px 4px 10px rgba(0,0,0,0.3);
  }
  ```

### 3. Wall Extrusion (Standing 3D Walls)
- Walls (`.wall-element`) rise up from the floor.
- By using CSS `transform: rotateX(-90deg) origin-bottom` or `translateZ`, we can raise the 2D wall block into a standing 3D partition!
- Example:
  ```css
  .mode-3d .wall-element {
    transform-style: preserve-3d;
    transform: translateZ(40px); /* Raise wall center */
    /* Add standing face elements via CSS */
  }
  ```

### 4. Floating Paths
- The SVG path finder overlay (`#pathArrowSvg`) is translated upwards along the Z-axis in 3D mode:
  ```css
  .mode-3d #pathArrowSvg {
    transform: translateZ(20px);
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
  }
  ```

---

## Tech Stack Requirements
- **Core CSS 3D Transforms**: `perspective`, `transform-style`, `backface-visibility`, `translateZ`.
- **Vanilla Javascript**: A simple mode switch state toggling the `.mode-3d` class on `#canvasContainer` and `#canvasWrap`.
