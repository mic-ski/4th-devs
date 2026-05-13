Read all .js files in the project folder: $ARGUMENTS (skip node_modules) and generate a Mermaid sequence diagram showing the runtime message flow — user input → which function handles it → which tools get called → what returns to the user.

- Participants should be the actual module files, not generic labels
- Use autonumber for step references
- Use loop blocks for agent rounds (show the round limit)
- Use alt blocks to branch MCP vs native tool paths
- Show return values as dashed arrows
- Create a `viz/` folder in the project root if it doesn't exist, and render as a self-contained HTML file using Mermaid.js from a CDN, saved as `viz/sequence.html`
