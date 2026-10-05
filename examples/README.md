# Focused CLI examples

Start with Node.js >=22 and `npm install -g vornariq`. Run commands from a
trusted repository directory. Commands are single lines suitable for PowerShell,
Bash, and zsh. Read the [quick start](../README.md#quick-start) first.

1. [Read-only review](01-read-only-review.md): the safest first real invocation.
2. [Explicit writes](02-explicit-write.md): requirement versus permission.
3. [JSON routing](03-json-routing.md): a no-model routing result and provider
   order.

Only the explicitly marked unroutable examples and free diagnostics avoid model
execution. Real `run` commands can consume provider quota. No example was used
to invoke a model during TASK-016. The write example is documentation only.

Prefer a guided walkthrough? Use the [five-minute demo](../docs/DEMO.md).

Library examples remain in the root [README](../README.md). Those fragments
require the caller's Task, Agent, and configured adapters; automated execution
must use fakes. No standalone sample application is shipped.
