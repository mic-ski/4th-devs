Read all .js files in the project folder: $ARGUMENTS (skip node_modules, skip files matching *-help.js) and generate a single self-contained HTML file that shows an interactive graph of how modules import each other, and what functions each file exports.

Use D3.js (loaded from its CDN) for the force-directed layout and SVG rendering. All module parsing, node classification, and tooltip logic should be written from scratch based on the files read.

- Colour-code nodes by type: entry point (orange), local module (blue), shared config (purple), npm package (grey)
- Directed edges show import direction
- Hovering a node shows its exports and which other modules import from it, with the exact names
- Support zoom, pan, and drag
- Create a `viz/` folder in the project root if it doesn't exist, and save the file there as `viz/module-graph.html`
