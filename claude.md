# Claude Prompt: Implement 3D Mode in Layout Editor

Copy and paste the prompt below into Claude to implement the 3D mode upgrade in your codebase.

---

```markdown
Please upgrade our Building Layout Editor codebase to support a **3D View Mode** alongside the existing **2D Design Mode** using **CSS 3D Transforms** without breaking any layout, wall, or pathfinding logic.

Here are the specific implementation details:

### 1. HTML Upgrades (index.html)
- Add a Toggle button in the header toolbar (near the Zoom slider or PDF button):
  ```html
  <button id="viewModeBtn" onclick="toggle3DMode()" title="Toggle 2D / 3D View">
    <i data-lucide="box"></i><span>3D View</span>
  </button>
  ```

### 2. State & JS Updates (script.js)
- Add `is3D: false` to the `state` object.
- Implement the toggle function:
  ```javascript
  window.toggle3DMode = function() {
    state.is3D = !state.is3D;
    const container = document.getElementById('canvasContainer');
    const wrap = document.getElementById('canvasWrap');
    const btn = document.getElementById('viewModeBtn');
    
    if (state.is3D) {
      container.classList.add('mode-3d');
      wrap.classList.add('mode-3d');
      btn.innerHTML = '<i data-lucide="layout"></i><span>2D Design</span>';
      // Disable editing actions while in 3D Mode to prevent coordinate bugs
      state.selectedId = null;
      state.selectedWallId = null;
      renderAll();
      showToast('Switched to 3D View');
    } else {
      container.classList.remove('mode-3d');
      wrap.classList.remove('mode-3d');
      btn.innerHTML = '<i data-lucide="box"></i><span>3D View</span>';
      renderAll();
      showToast('Switched to 2D Design');
    }
    if (window.lucide) window.lucide.createIcons();
  };
  ```
- Ensure dynamic functions like `clearCanvas` reset `state.is3D` back to false if needed.

### 3. Styling Upgrades (style.css)
Add these styles at the bottom of `style.css` to handle the transition and visual depth:
- **Perspective Wrapper**:
  ```css
  .canvas-container.mode-3d {
    perspective: 1600px;
    perspective-origin: 50% 50%;
  }
  .canvas-wrap.mode-3d {
    transform-style: preserve-3d;
    /* Apply rotation combined with pan and zoom. Match the current applyCanvasTransform translation scheme */
    transform: translate3d(var(--pan-x), var(--pan-y), 0) scale(var(--zoom)) rotateX(50deg) rotateZ(-30deg) !important;
    transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1);
  }
  ```
- **Room Extrusion**:
  ```css
  .canvas-container.mode-3d .element {
    transform-style: preserve-3d;
    transform: translateZ(12px);
    transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1);
    box-shadow: 
      -1px 1px 0px rgba(0, 0, 0, 0.2),
      -2px 2px 0px rgba(0, 0, 0, 0.2),
      -3px 3px 0px rgba(0, 0, 0, 0.2),
      -4px 4px 0px rgba(0, 0, 0, 0.2),
      -5px 5px 0px rgba(0, 0, 0, 0.2),
      -6px 6px 12px rgba(0, 0, 0, 0.4);
  }
  ```
- **Wall Extrusion**:
  Give standing height to walls when in 3D:
  ```css
  .canvas-container.mode-3d .wall-element {
    transform-style: preserve-3d;
    transform: translateZ(35px);
    background: #475569;
    transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1);
    box-shadow: 
      -1px 1px 0px rgba(0, 0, 0, 0.3),
      -2px 2px 0px rgba(0, 0, 0, 0.3),
      -3px 3px 0px rgba(0, 0, 0, 0.3),
      -4px 4px 0px rgba(0, 0, 0, 0.3),
      -5px 5px 10px rgba(0, 0, 0, 0.5);
  }
  ```
- **Floating Paths**:
  Move SVG arrows upwards so they hover above the extruded rooms:
  ```css
  .canvas-container.mode-3d #pathArrowSvg {
    transform: translateZ(30px);
    filter: drop-shadow(0 8px 12px rgba(244, 63, 94, 0.35));
  }
  ```
- **Lock Interactions**:
  When in 3D mode, disable pointer events on room resize handles and draw functions to prevent coordinate mismatching:
  ```css
  .canvas-container.mode-3d .resize {
    display: none !important;
  }
  ```

Run these modifications cleanly to give a stunning visual pop to the application when toggled!
```
