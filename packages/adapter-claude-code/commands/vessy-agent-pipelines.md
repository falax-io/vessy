---
description: List all pipelines, or show the Mermaid diagram for a named pipeline
argument-hint: "[pipeline-name]"
allowed-tools: ["Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs:*)"]
---

**Without an argument** — list all pipelines:

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" pipelines
```

Present each pipeline's name and description. If no pipelines are found, report that `.vessy/pipelines/` is empty or does not exist.

---

**With an argument** (`$ARGUMENTS` is set) — show the diagram for that pipeline:

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" diagram $ARGUMENTS
```

Render the output as a Mermaid diagram. Describe the pipeline's flow in one sentence after the diagram.
