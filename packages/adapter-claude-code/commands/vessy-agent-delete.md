---
description: Delete an agent from .vessy/agents/
argument-hint: "<agent-name>"
allowed-tools: ["Bash(node:*)", "Bash(rm .vessy/agents/*.yaml)"]
---

Delete the agent named `$ARGUMENTS`.

## Step 1 — Show what will be deleted

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" agent-get "$ARGUMENTS"
```

Display the current YAML as a preview.

## Step 2 — Ask for confirmation

Ask: "Are you sure you want to delete the agent `$ARGUMENTS`? Type the exact word **yes** to confirm. Any other response will abort."

Wait for the user to reply with the exact word `yes` (case-sensitive). Any other response — including `y`, `Y`, `Yes`, or `sure` — must be treated as a cancellation. If the user does not confirm, abort and report: "Deletion cancelled."

## Step 3 — Delete

On confirmation, run:

```!
rm .vessy/agents/"$ARGUMENTS".yaml
```

## Step 4 — Confirm

Report: "Agent `$ARGUMENTS` deleted."
