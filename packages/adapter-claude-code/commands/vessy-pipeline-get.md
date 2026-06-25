---
description: Show the Mermaid diagram for a named pipeline
argument-hint: "<pipeline-name>"
allowed-tools: ["Bash(node:*)"]
---

Show the diagram for the pipeline named `$ARGUMENTS`.

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" diagram "$ARGUMENTS"
```

Render the output as a Mermaid diagram. Describe the pipeline's flow in one sentence after the diagram.
