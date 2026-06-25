---
description: Create a new pipeline in .vessy/pipelines/
allowed-tools: ["Write"]
---

Create a new pipeline definition by gathering information conversationally, then writing the Markdown file. Do NOT use the CLI for this command.

## Step 1 — Ask for basic information

Ask the user:
- **Name**: What should the pipeline be called? (used as the filename — must contain only lowercase letters, digits, and hyphens; no spaces or special characters)
- **Description** (optional): A one-line description of what the pipeline does

## Step 2 — Define the flow

Ask the user to describe the pipeline flow. Accept either:
- A natural-language description of nodes and edges (Claude builds the Mermaid diagram)
- A ready-made `flowchart LR` Mermaid diagram provided by the user

If building from description, confirm the final diagram with the user before writing.

## Step 3 — Write the file

Write `.vessy/pipelines/<name>.md` using the Write tool. The file must have this structure:

- A YAML frontmatter block with `name:` and optionally `description:`
- A fenced Mermaid code block containing `flowchart LR` and the edges

Example for a pipeline named `research` with description `Fetch and summarize`:

    ---
    name: research
    description: Fetch and summarize
    ---

    ```mermaid
    flowchart LR
        fetch --> summarize
    ```

Omit the `description:` frontmatter line if none was provided.

## Step 4 — Confirm

Report the created file path: `.vessy/pipelines/<name>.md`.
