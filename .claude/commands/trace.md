Read all .js files in the project folder: $ARGUMENTS (skip node_modules, skip files matching *-help.js). Ask me which query to trace if I haven't specified one, then generate a self-contained HTML file tracing that single query end-to-end through the system.

Each stage in the execution is a card showing:
- The module name, file path, and type (colour-accented by type)
- A numbered step badge
- A title for what happens at this stage
- A plain-English description of the logic at this stage for this specific query
- A syntax-tinted code block with the real data values at this point (not placeholders)

Between cards: connector pills showing the exact function call or data value crossing that boundary.

Layout rules:
- Single centered column, max ~700px wide
- No external dependencies
- Syntax-tint code blocks manually: keys in green, strings in blue, MCP values in cyan
- Create a `viz/` folder in the project root if it doesn't exist, and save as `viz/traced-flow.html`
