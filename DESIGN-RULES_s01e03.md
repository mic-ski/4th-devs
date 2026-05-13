# DESIGN RULES — Tools & APIs for AI Agents
Based on course: AI_devs-4 s01e03

Universal principles for designing Function Calling tools, MCP servers,
and APIs intended for integration with AI agents.

---

## 1. Audit the API before designing any tool

Before writing a single schema, answer these questions:

- Does the API support all actions the agent will need (full CRUD)?
- Are resources identified by ID or by name? If by ID — the agent must have a way to map human-readable names to IDs.
- Is naming consistent across the API? (`content` vs `body` for the same concept is a design bug.)
- Do success responses return enough data? A bare `201 Created` is not enough.
- Are there operations that require multiple API calls for a single logical task? Consider wrapping them in one tool.
- Does the API have polling, rate limiting, or pagination? Handle these in tool code — do not delegate them to the agent.

---

## 2. Number and scope of tools

**Do not minimize tool count for its own sake. Find the right level of abstraction.**

- Group actions with similar responsibility into one tool using a `mode` or `action` parameter.
- Avoid separate tools for operations that differ by only one parameter.
- Each tool should have one clear responsibility — the model must know when to reach for it without guessing.
- Prefer 4–6 well-designed tools over 13 narrowly specialized ones.
- Sanity check: can a mid-tier model correctly select this tool without additional context?

---

## 3. Schema naming

- Tool names: short, verb- or noun-prefixed, e.g. `fs_read`, `email_send`, `task_manage`.
- Parameter names: unambiguous, no abbreviations — `targetPath` not `tp`, `maxResults` not `max`.
- Avoid generic names like `get`, `send`, `run` without a domain prefix — they collide in multi-server setups.
- In MCP: tools are namespaced by the host (e.g. `gmail__search`), but name them as if they are not — clarity first.
- Boolean flags should read as assertions: `dryRun`, `force`, `recursive`, `caseSensitive`.

---

## 4. Input schema design

- Provide sensible defaults for every optional parameter — the model should not have to guess.
- Use enums for parameters with a fixed set of valid values; list all options in the description.
- If a parameter is only relevant in certain modes, document that clearly in the field description.
- Avoid deeply nested input objects — flat structures are easier for models to populate correctly.
- When a parameter accepts multiple formats (e.g. a path or a filename), document resolution priority explicitly.

---

## 5. Output schema design

- Always return the identifier or path of the affected resource — the agent needs it for follow-up actions.
- Return only the data the agent needs for its next step, not a full object dump.
- Split response shapes when modes differ significantly (e.g. file vs. directory result), but keep the top-level structure consistent.
- Include a checksum or version token whenever the resource can change between reads and writes.
- For list results, always include a total count and a flag indicating whether results were truncated.

---

## 6. Error messages and hints

**Design error messages for the model, not for a human reading logs.**

- Every error must answer two questions: *what went wrong* and *what to do next*.
- Embed concrete values in messages: not "line range invalid" but "requested lines 48–70, document has 59 lines — returning 48–59."
- On success, include a `hint` when the next step is non-obvious: "File updated. Re-read it before making further edits."
- On resource conflicts, list the available options: "Invalid label. Available labels: X, Y, Z."
- On ambiguous input (e.g. a filename matching multiple paths), return the candidate list instead of failing.
- Use specific error codes (`CHECKSUM_MISMATCH`, `OUT_OF_SCOPE`) in addition to prose — they are easier to handle programmatically.

---

## 7. Safety for destructive operations

- Add a `dryRun` flag to any tool that modifies or deletes data. The model can preview the effect before committing.
- Use checksum validation to prevent overwriting a resource that changed since the last read.
- Restrict recursive or bulk destructive operations — deleting a directory should require it to be empty.
- Consider an archive or soft-delete pattern before allowing permanent removal.
- Maintain a change history in code, not in the agent's context — recovery should not require agent involvement.

---

## 8. Handle edge cases in code, not in prompts

- Resolve partial paths automatically (filename → full path) rather than asking the model to be precise.
- Enforce permission boundaries in code and return a clear error (`OUT_OF_SCOPE`) when violated.
- When output would exceed context limits, truncate it and tell the agent exactly how to fetch the rest.
- Handle rate limits and retries transparently — the agent should never need to implement a wait loop.
- Correct recoverable mistakes silently and report the correction in the response (e.g. "Adjusted line range to available 48–59").

---

## 9. MCP architecture decisions

- Default to **Streamable HTTP** for any server that will be deployed remotely or serve multiple users.
- Use **STDIO** only for local processes tied to a single machine (desktop apps, CLI tools).
- An MCP host does not need a UI — a backend process with an agentic loop qualifies as a host.
- Tools, Resources, Prompts, Sampling, and Elicitation are distinct MCP primitives; use the right one for the job.
- Native tools and MCP tools can coexist in the same host — MCP is not a replacement, it is an additional delivery layer.

---

## 10. Security and permissions

- Apply access controls, action restrictions, rate limits, and input validation in code — not in the system prompt.
- Decide upfront which resources and actions should never be exposed to an agent, regardless of permissions.
- When building internal tools: you control the full stack — use that advantage with tight scoping.
- When building public MCP servers: assume adversarial input, including prompt injection from external content.
- OAuth in MCP requires: discovery, PKCE, encrypted token storage, automatic refresh, and permission enforcement on every call.

---

## 11. Tool quality checklist

A well-designed tool passes all of these:

- [ ] A smaller/weaker model can use it correctly without extra guidance.
- [ ] Every error response tells the agent what to do next.
- [ ] No destructive action can be taken without an explicit confirmation mechanism (`dryRun`, `force`, checksum).
- [ ] The tool handles the top 3 likely model mistakes gracefully (wrong path format, out-of-bounds range, missing required context).
- [ ] Success responses include enough data for the agent to continue without an extra round-trip.
- [ ] Parameter names and descriptions are unambiguous without reading the implementation.
