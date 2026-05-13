/**
 * tools.js — Native tool definitions for the MCP Native Demo.
 *
 * This file defines two things for each native tool:
 *   1. The schema (nativeTools) — sent to the LLM so it knows what tools exist
 *      and what arguments they take. The LLM never runs any code.
 *   2. The handler (nativeHandlers) — the actual JS functions that run when
 *      the LLM decides to call a tool.
 *
 * "Native" means these tools run directly in this process, unlike MCP tools
 * which communicate through a protocol layer.
 */

export const nativeTools = [
// export makes nativeTools available to other files that import it.
// const declares a variable that cannot be reassigned.
// nativeTools is an array (square brackets) — it holds multiple tool schema objects.

  {
    type: "function",
    // Every tool the LLM can call must have type: "function" — this is OpenAI's format.
    // It tells the LLM API "this is a callable function, not some other kind of tool".

    name: "calculate",
    // The name the LLM will use when it decides to call this tool.
    // Must match the key in nativeHandlers exactly — that's how the agent finds the right function.

    description: "Perform a basic math calculation",
    // A plain English description sent to the LLM so it knows when to use this tool.
    // The LLM reads this to decide which tool fits the user's request.

    parameters: {
      type: "object",
      // The LLM always passes tool arguments as one object — never as separate positional values.

      properties: {
        // properties lists every argument this tool accepts.

        operation: {
          type: "string",
          // The LLM must pass a string for this argument.

          enum: ["add", "subtract", "multiply", "divide"],
          // enum restricts the value to this exact list — the LLM cannot pass anything else.
          // This prevents the LLM from inventing operation names like "modulo" or "power".

          description: "The math operation to perform"
          // Helps the LLM understand what to put here.
        },

        a: { type: "number", description: "First operand" },
        // a and b are the two numbers to operate on.
        // type: "number" means integer or decimal — not a string like "5".

        b: { type: "number", description: "Second operand" }
      },

      required: ["operation", "a", "b"],
      // All three arguments must be present — the LLM cannot omit any of them.
      // If required were empty, the LLM could call the tool with no arguments at all.

      additionalProperties: false
      // The LLM cannot pass extra arguments beyond the ones listed in properties.
      // Prevents unexpected keys from sneaking through.
    },

    strict: true
    // Tells the OpenAI API to enforce the schema strictly — no extra or missing fields allowed.
    // Works together with additionalProperties: false and required to lock down the input shape.
  },

  {
    type: "function",
    name: "uppercase",
    description: "Convert text to uppercase",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to convert" }
        // One argument: text — must be a string. The tool will uppercase it.
      },
      required: ["text"],
      additionalProperties: false
    },
    strict: true
  }
];
// End of nativeTools array. This array is sent to the LLM API with every request
// so the model knows which tools are available and how to call them.

export const nativeHandlers = {
// nativeHandlers is an object (curly braces) — its keys are tool names, its values are functions.
// export makes it available to other files.

  calculate({ operation, a, b }) {
  // Shorthand method syntax — equivalent to: calculate: function({ operation, a, b }) { ... }
  // The argument is destructured: instead of receiving one object and writing args.operation,
  // we unpack operation, a, and b directly from the incoming object.
  // These names must match the property names defined in the schema above.

    const ops = {
      add:      () => a + b,
      subtract: () => a - b,
      multiply: () => a * b,
      divide:   () => (b === 0 ? { error: "Division by zero" } : a / b)
      // ops is an object where each key is an operation name and each value is an arrow function.
      // Each arrow function takes no arguments — it uses a and b from the outer scope (closure).
      //
      // The divide entry uses a ternary: condition ? valueIfTrue : valueIfFalse
      // If b is 0, return an error object. Otherwise return the result of a / b.
      // This guards against division by zero, which would produce Infinity in JS (not a crash).
    };

    const result = ops[operation]?.();
    // ops[operation] looks up the function by name — e.g. ops["add"] returns () => a + b.
    // The ?. is optional chaining — if operation doesn't match any key, ops[operation] is undefined,
    // and ?. prevents a crash by returning undefined instead of trying to call undefined().
    // () at the end actually calls the function that was looked up.
    // result is the return value: a number, or an error object if division by zero.

    return typeof result === "object" ? result : { result, expression: `${a} ${operation} ${b}` };
    // typeof result === "object" checks if result is an object (i.e. the division by zero error).
    // If it is, return it as-is.
    // If not (result is a number), wrap it in a response object with two keys:
    //   result — the number (shorthand property: { result } is the same as { result: result })
    //   expression — a human-readable string like "42 multiply 17", built with a template literal.
    // Template literal: backtick string with ${} placeholders that insert variable values.
  },

  uppercase({ text }) {
  // Same shorthand method syntax. Destructures the text argument from the incoming object.

    return { result: text.toUpperCase() };
    // .toUpperCase() is a built-in string method — returns a new string with all letters uppercased.
    // Returns an object with a result key so the response has a consistent shape.
  }
};
// End of nativeHandlers. The agent uses this object to look up and call the right function
// when the LLM returns a tool call decision.
