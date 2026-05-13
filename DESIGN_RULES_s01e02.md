# Reliable LLM App Rules -  from course AI_devs-4 s01e02

1. Keep execution deterministic. The model proposes actions, application code executes them.
2. Do not expose internal APIs 1:1 as tools. Build LLM specific tool interfaces.
3. Optimize for minimum step count per task. Merge related operations where possible.
4. Keep tool names unique, explicit, and collision resistant.
5. Keep tool descriptions short, high signal, and selection oriented.
6. Expose only inputs the model must supply. Fill the rest in code.
7. Never let the model set security critical fields such as user identity, ownership, or permission scope.
8. Omit low value, rare, or dangerous actions from the toolset unless strictly required.
9. Prefer unified tools over fragmented resource lookups when fragmentation adds extra model steps.
10. Return minimal tool output required for the next decision.
11. Make all validation machine recoverable: explicit failure reason, offending field, accepted format, next valid action.
12. Do not emit generic errors. Every error must be actionable.
13. Add corrective hints for predictable invalid values, aliases, and near misses where safe.
14. Use defaults aggressively for routine parameters, but only where semantics remain stable.
15. Load user context such as timezone, account defaults, and auth state from the system, not from model inference.
16. Accept multiple safe input representations when it reduces retries, for example name or ID.
17. Enforce permissions in code, never in prompts.
18. Route irreversible or external side effects through deterministic approval gates.
19. Use UI forms for exact values and UI controls for consent when precision is mandatory.
20. Support dry run for high risk mutations when full deterministic approval is not available.
21. Treat the system prompt as stable infrastructure. Avoid dynamic values that break prompt caching.
22. Treat context budget as a hard systems constraint. Tool schemas, outputs, and history must stay compact.
23. Prefer storing large intermediate results outside the active prompt and reload only required fragments.
24. Keep the active toolset small. Target roughly 10 to 15 tools per agent context when possible.
25. If more capabilities are needed, split by sub agents, progressive disclosure, or code execution environments.
26. Provide explicit discovery mechanisms for tools and knowledge sources such as indexes, metadata, or maps.
27. Use workflows for stable, bounded processes. Use agent loops only where dynamic adaptation is required.
28. Do not use unconstrained agent logic where 100 percent correctness is a hard requirement unless guarded by deterministic checks or human review.
29. Assume tool use is a multi call loop. Design for retry, continuation, and bounded step limits.
30. Optimize for latency by reducing calls, enabling parallelizable actions, using smaller models where sufficient, and preserving prompt cache.
31. Do not duplicate large generated content across tools. Pass references, files, or handles instead of regenerating payloads.
32. Treat reasoning as an optimization layer, not a reliability guarantee. Reliability comes from architecture, validation, and control surfaces.
33. Design every path for recovery from wrong tool choice, partial arguments, bad assumptions, and hallucinated values.
34. Assume prompt injection is unsolved. Do not combine untrusted content access with high risk tool permissions unless damage is strongly contained by environment design.
35. Evaluate the system by failure containment, not just success rate.