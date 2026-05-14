Read all .js files in the project folder: $ARGUMENTS (skip node_modules, skip files matching *-help.js) and generate a single self-contained HTML file where each file is a card in a responsive grid.

Before generating, read `.claude/templates/code-cards.html` and match its style exactly:
- Same CSS (colours, typography, spacing, chip styles, card structure)
- Same data-driven JS approach: a `files` array rendered by a `renderCard` function
- Same card layout: head (badge + filename + filepath) / purpose / exports section / imports section
- Same `--accent` CSS custom property pattern with `.type-entry`, `.type-local`, `.type-config`, `.type-npm`
- Same muted monospaced header (`PROJECT / code cards` + file count subtitle)

Each card should show:
- The filename and full relative path
- Its purpose, inferred from the code (plain English, not copied verbatim)
- The functions and values it exports, as green chips (`chip-export`)
- What it imports from other files, grouped by source, as blue chips (`chip-import`)

Classify each file as one of:
- `entry` (orange) — application entry point, no exports
- `local` (blue) — regular local module
- `config` (purple) — shared configuration
- `npm` (grey) — thin wrapper around an npm package

Create a `viz/` folder in the project root if it doesn't exist, and save the file there as `viz/code-cards.html`.
