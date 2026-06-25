---
description: Show a specific agent's YAML definition
argument-hint: "<agent-name>"
allowed-tools: ["Bash(node:*)"]
---

Show the YAML definition for the agent named `$ARGUMENTS`.

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" agent-get "$ARGUMENTS"
```

Display the output with YAML syntax highlighting. If the agent does not exist, report the error.
