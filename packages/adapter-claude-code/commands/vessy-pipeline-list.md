---
description: List all pipelines in .vessy/pipelines/
allowed-tools: ["Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs:*)"]
---

List all pipelines in the current project's `.vessy/pipelines/` directory.

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" pipelines
```

Present each pipeline's name and description. If no pipelines are found, report that `.vessy/pipelines/` is empty or does not exist.
