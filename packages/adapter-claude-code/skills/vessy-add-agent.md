# `/vessy:add-agent`

Adds a new agent definition to the current project by gathering details conversationally and writing the YAML file.

## Instructions

Do NOT use the CLI for this skill. Gather information conversationally, then write the file directly.

### Step 1 — Ask for basic information

Ask the user:
- **Name**: What should the agent be called? (used as the filename and node ID in pipelines)
- **Type**: `llm`, `script`, or `composite`

### Step 2 — Ask type-specific fields

**If `llm`:**
- Model name (e.g. `claude-opus-4-7`, `claude-haiku-4-5-20251001`)
- System prompt (the agent's instructions)

**If `script`:**
- Path to the script (absolute or relative to the project root)
- Arguments (optional, as a list)

**If `composite`:**
- Steps — gather each step's type, model/script, and system prompt/args

### Step 3 — Write the YAML file

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

### Step 4 — Confirm

Report the created file path: `.vessy/agents/<name>.yaml`.
