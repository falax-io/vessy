---
description: Update an existing agent's definition
argument-hint: "<agent-name>"
allowed-tools: ["Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs:*)", "Write"]
---

Update the agent named `$ARGUMENTS`.

## Step 1 — Show current definition

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" agent-get $ARGUMENTS
```

Display the current YAML to the user.

## Step 2 — Ask what to change

Ask: "What would you like to change?"

Collect the changes conversationally. Only modify the fields the user mentions — keep everything else unchanged.

## Step 3 — Rewrite the file

Write the updated YAML to `.vessy/agents/$ARGUMENTS.yaml` using the Write tool, incorporating only the changes specified.

## Step 4 — Confirm

Report the updated file path: `.vessy/agents/$ARGUMENTS.yaml`.
