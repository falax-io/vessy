---
description: Delete a pipeline from .vessy/pipelines/
argument-hint: "<pipeline-name>"
allowed-tools: ["Read", "Bash(rm .vessy/pipelines/*.md)"]
---

Delete the pipeline named `$ARGUMENTS`.

## Step 1 — Show what will be deleted

Read `.vessy/pipelines/$ARGUMENTS.md` using the Read tool and display a preview of its content.

## Step 2 — Ask for confirmation

Ask: "Are you sure you want to delete the pipeline `$ARGUMENTS`? Type the exact word **yes** to confirm. Any other response will abort."

Wait for the user to reply with the exact word `yes` (case-sensitive). Any other response — including `y`, `Y`, `Yes`, or `sure` — must be treated as a cancellation. If the user does not confirm, abort and report: "Deletion cancelled."

## Step 3 — Delete

On confirmation, run:

```!
rm .vessy/pipelines/"$ARGUMENTS".md
```

## Step 4 — Confirm

Report: "Pipeline `$ARGUMENTS` deleted."
