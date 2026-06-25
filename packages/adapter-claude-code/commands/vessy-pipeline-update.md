---
description: Update an existing pipeline's definition
argument-hint: "<pipeline-name>"
allowed-tools: ["Read", "Write"]
---

Update the pipeline named `$ARGUMENTS`.

## Step 1 — Show current definition

Read `.vessy/pipelines/$ARGUMENTS.md` using the Read tool and display its current content (frontmatter + Mermaid diagram).

## Step 2 — Ask what to change

Ask: "What would you like to change?"

Collect the changes conversationally — description, node names, edges, or the entire diagram. Only modify what the user mentions; keep everything else unchanged.

## Step 3 — Rewrite the file

Write the updated content to `.vessy/pipelines/$ARGUMENTS.md` using the Write tool.

## Step 4 — Confirm

Report: "Pipeline `<name>` updated at `.vessy/pipelines/<name>.md`." (substitute the actual pipeline name).
