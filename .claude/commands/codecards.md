Read all .js files in the project folder: $ARGUMENTS (skip node_modules) and generate a single self-contained HTML file where each file is a card in a responsive grid.

Each card should show:
- The filename and full path
- Its purpose, inferred from the code and any comments (written in plain English, not copied verbatim)
- The functions and values it exports, as green chips
- What it imports from other files, grouped by source file, as blue chips

Use a clean dark grid layout. No external dependencies.

- Colour-accent each card by module type: entry point (orange), local module (blue), shared config (purple), npm (grey)
- Create a `viz/` folder in the project root if it doesn't exist, and save the file there as `viz/code-cards.html`
