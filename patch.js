const fs = require('fs');
let code = fs.readFileSync('pathfinder.js', 'utf8');
code = code.replace(
  /if \(rectsOverlapOrTouch\(c, el\)\) \{\s+if \(el\.type === 'waypoint'\) wps\.add\(el\);\s+else others\.add\(el\);\s+\}/,
  `if (rectsOverlapOrTouch(c, el)) {
    const blocked = wallBlocksEdge(c, el, f.id);
    if (blocked) {
      const hasDoorOpening = doorOnSharedEdge(c, el, floorEls);
      if (!hasDoorOpening) return;
    }
    if (el.type === 'waypoint') wps.add(el);
    else others.add(el);
  }`
);
fs.writeFileSync('pathfinder.js', code);
console.log('Patched successfully');
