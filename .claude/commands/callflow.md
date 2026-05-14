Read all .js files in the project folder: $ARGUMENTS (skip node_modules, skip files matching *-help.js) and produce a Mermaid flowchart diagram showing the call flow — starting from the entry point, which functions call which, and where any MCP tool calls happen.

- Use subgraphs to group related stages (setup, agent loop, tool execution, response)
- Colour-code with classDef: entry point (orange), MCP calls (cyan), native calls (green), external HTTP (dashed grey)
- Create a `viz/` folder in the project root if it doesn't exist
- Render as a self-contained HTML file using Mermaid.js from a CDN, saved as `viz/call-flow.html`
- Also save the raw Mermaid code block (no HTML) as `viz/call-flow.md` so it can be pasted into Obsidian
