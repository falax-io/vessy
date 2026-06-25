---
description: List all agents in .vessy/agents/
allowed-tools: ["Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs:*)"]
---

List all agents defined in the current project's `.vessy/agents/` directory.

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" agents
```

Present the output as a table. Each row shows: agent name, type (`llm` / `script` / `composite`), and model (for LLM agents only). If no agents are found, report that `.vessy/agents/` is empty or does not exist.
