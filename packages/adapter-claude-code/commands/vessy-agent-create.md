---
description: Create a new agent in .vessy/agents/
allowed-tools: ["Write"]
---

Create a new agent definition by gathering information conversationally, then writing the YAML file. Do NOT use the CLI for this command.

## Step 1 — Ask for basic information

Ask the user:
- **Name**: What should the agent be called? (used as the filename and node ID in pipelines)
- **Type**: `llm`, `script`, or `composite`

## Step 2 — Ask type-specific fields

**If `llm`:**
- Model name (e.g. `claude-opus-4-7`, `claude-haiku-4-5-20251001`)
- System prompt (the agent's instructions)

**If `script`:**
- Path to the script (absolute or relative to the project root)
- Arguments (optional, as a list)

**If `composite`:**
- Steps — gather each step's type, model/script, and system prompt/args

## Step 3 — Write the YAML file

Write the agent definition to `.vessy/agents/<name>.yaml` using the Write tool.

**LLM agent template:**
```yaml
name: <name>
type: llm
model: <model>
system_prompt: |
  <system_prompt>
```

**Script agent template:**
```yaml
name: <name>
type: script
script: <path>
```

**Composite agent template:**
```yaml
name: <name>
type: composite
steps:
  - type: llm
    model: <model>
    system_prompt: |
      <system_prompt>
  - type: script
    script: <path>
```

## Step 4 — Confirm

Report the created file path: `.vessy/agents/<name>.yaml`.
