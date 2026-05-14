# CLAUDE.md

## About me

I am a developer with a Python background who is now reasonably confident with JavaScript.
I understand programming concepts well and am comfortable with JS syntax and patterns.
Python comparisons are no longer needed by default — only use them as a fallback for
genuinely difficult concepts where the analogy would add real clarity.

---

## Modes

I work in two modes. Always check which mode applies before writing code or comments.

---

## Mode 1: Normal developer mode (default)

This is the default mode for all coding work unless I explicitly trigger Learn mode.

### Code style
- Write clean, readable code
- Add comments only where the logic is non-obvious or the intent isn't clear from the code itself
- Do not over-comment — trust that I can read code
- Do not add docstrings, type annotations, or comments to code you did not change

### Communication style
- Be concise and direct
- Lead with the answer or the change, not the reasoning
- Skip preamble and filler
- Explain tradeoffs briefly when there are multiple valid options
- Point out gotchas or non-obvious JavaScript behaviour when it genuinely matters
- When explaining syntax, concepts, or logic — reach for a mental model or analogy whenever one fits naturally. A good mental model is worth more than a precise definition.

### Before significant changes
- Briefly explain the plan
- State which files will be touched
- Wait for confirmation before large rewrites

### After changes
- Say what changed and why
- Tell me how to test it and what to expect

### Terminal commands
- Explain what a command does before I run it
- Warn me if it modifies, deletes, installs, or overwrites something

---

## Mode 2: Help mode

Triggered when I ask for a file using the pattern `FILENAME-help.EXTENSION`
(for example: `app-help.js`, `config-help.ts`, `handlers-help.js`).

### What to do

1. Read the original file (`FILENAME.EXTENSION`) in the same directory
2. Create `FILENAME-help.EXTENSION` in the same directory
3. Copy every line of code exactly — do NOT change any logic or syntax
4. Add comments that explain the code to someone who is reasonably confident with JavaScript

### Comment rules

- Add a comment after every line or small logical section (2–4 lines that belong together)
- Place comments BELOW or AFTER the code they explain, not above
- Add a header block at the top explaining the file's overall purpose

### What each comment must cover (where relevant)

- What this line or block does in plain English
- Why it exists — what problem it solves
- The data type of every variable, argument, and return value (string, number, boolean, array, object, null, undefined)
- Any JavaScript syntax a Python developer would not recognise — explain the syntax itself, not just what it does
- A Python comparison only as a last resort for genuinely difficult concepts — skip it if JS alone is clear enough

### JavaScript concepts that always need explanation when they appear

- `async` / `await` / `Promise`
- Arrow functions (`=>`)
- Destructuring (`const { a, b } = obj` / `const [x] = arr`)
- Spread operator (`...`)
- Template literals (backtick strings with `${}`)
- Optional chaining (`?.`) and nullish coalescing (`??`)
- `export` / `import` and ES module system
- Array methods: `.map()`, `.filter()`, `.reduce()`, `.find()`, `.some()`, `.forEach()`
- `const` vs `let` vs `var`
- `JSON.stringify()` / `JSON.parse()`
- `try` / `catch` / `throw`
- Callbacks and higher-order functions
- `process.env` and environment variables
- `fetch()` and HTTP requests
- `fs/promises` file system methods
- **Object-as-instance pattern** — a factory function that returns a plain object with methods, used instead of a class. When you see this, explicitly call it out: explain that the object is not a class instance, that the dot is just property access, and that this is a deliberate JS pattern for bundling behaviour without the overhead of `class`.

### What not to do in Learn mode

- Do not change any code — not even formatting
- Do not skip lines because they "look obvious"
- Do not use Python comparisons unless JS alone cannot make the concept clear
- Do not write a wall of text — keep each comment focused and readable

---

## Mode 3: Distill mode

Triggered when I say **"distill"** and provide a filename (e.g. `"distill to s01e03-qa1.md"`).

### What to do

1. Review the entire conversation and extract the key lessons learned
2. Create the file I specified in the root of the working directory
3. Reorder and reformat the lessons thematically — not in the order they came up

### What to include

- Every concept that was genuinely clarified or understood for the first time
- **Aha moments** — mark them explicitly, they are the most valuable part
- **Mental models and analogies** used during the conversation — preserve these word-for-word or close to it, they are intentional teaching tools not throwaway chat
- Code examples that illustrate the concept clearly
- Python comparisons only where they added real clarity
- **JS patterns that replace class-based thinking** — whenever a factory function, closure, or plain object is used where a Python developer would expect a class, flag it explicitly and explain the pattern and why JS code is written this way

### Format rules

- Use `## N. Title` headings for each lesson
- Lead with a brief explanation, then the code example, then the mental model or aha moment
- Mental models go in a **Mental model:** callout after the code
- Aha moments go in a **The aha moment:** callout
- Keep each section self-contained — a reader should understand it without reading the others
- Do not summarise — give enough detail that the lesson is actually useful later

### What not to include

- Conversational back-and-forth that didn't produce a real insight
- Corrections that were immediately superseded
- Anything already obvious from the code itself
