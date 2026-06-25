---
description: Run a vessy pipeline by name
argument-hint: "<pipeline-name>"
allowed-tools: ["Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs:*)"]
---

Run the pipeline named `$ARGUMENTS`:

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" run $ARGUMENTS
```

Present the output as-is. When the pipeline finishes, highlight:
- The final status (`Passed` / `Failed`)
- The session directory path where artifacts are stored

If `$ARGUMENTS` is empty, ask the user for the pipeline name before running.
