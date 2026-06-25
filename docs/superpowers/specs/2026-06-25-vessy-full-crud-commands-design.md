# vessy Full CRUD Slash Commands Design

**Goal:** Replace the four existing vessy slash commands with eleven normalized commands covering full CRUD for agents and pipelines, plus pipeline run.

**Architecture:** Hybrid — read/list/run operations delegate to `dist/cli.cjs`; create/update/delete operations are handled conversationally inside the command files using Read/Write/Bash tools. The only new TypeScript code is the `agent-get` CLI subcommand.

**Tech Stack:** TypeScript 5.x, esbuild (bundle), Vitest (tests), Claude Code plugin system (`commands/*.md` with YAML frontmatter, `${CLAUDE_PLUGIN_ROOT}`)

---

## Breaking Changes

The following old commands are deleted:

| Old command | Replaced by |
|---|---|
| `vessy:agents` | `vessy:agent-list` |
| `vessy:add-agent` | `vessy:agent-create` |
| `vessy:agent-pipelines` | `vessy:pipeline-list` + `vessy:pipeline-get` |
| `vessy:run-pipeline` | `vessy:pipeline-run` |

The `skills/` directory is removed entirely — it was not auto-discoverable and is superseded by `commands/`.

---

## Command Inventory

| Command | Argument | Mechanism |
|---|---|---|
| `vessy:agent-list` | — | CLI: `agents` (existing) |
| `vessy:agent-get` | `<name>` | CLI: `agent-get` (new) |
| `vessy:agent-create` | — | Command file: conversational + Write |
| `vessy:agent-update` | `<name>` | Command file: Read + conversational + Write |
| `vessy:agent-delete` | `<name>` | Command file: Read (preview) + confirm + Bash(rm) |
| `vessy:pipeline-list` | — | CLI: `pipelines` (existing) |
| `vessy:pipeline-get` | `<name>` | CLI: `diagram` (existing) |
| `vessy:pipeline-create` | — | Command file: conversational + Write |
| `vessy:pipeline-update` | `<name>` | Command file: Read + conversational + Write |
| `vessy:pipeline-delete` | `<name>` | Command file: Read (preview) + confirm + Bash(rm) |
| `vessy:pipeline-run` | `<name>` | CLI: `run` (existing) |

---

## CLI Changes

### New subcommand: `agent-get <name>`

**File:** `src/commands/agent-get.ts`

Reads `.vessy/agents/<name>.yaml` and prints the raw YAML to stdout. If the file does not exist, prints an error to stderr and exits with code 1.

```
$ node dist/cli.cjs agent-get researcher
name: researcher
type: llm
model: claude-opus-4-7
system_prompt: |
  You are a research assistant...
```

No parsing or transformation — raw file contents only. The command file is responsible for presenting the output to the user.

**`src/cli.ts` change:** add `case 'agent-get'` that validates one argument is present, then calls `agentGetCommand(args[0])`.

---

## Command File Behaviors

### `vessy:agent-list`

Runs `node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" agents` and presents the output as a table (name, type, model).

### `vessy:agent-get <name>`

Runs `node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" agent-get $ARGUMENTS` and displays the YAML with syntax highlighting. If the agent does not exist, reports the error.

### `vessy:agent-create`

Conversational — no CLI involved.

1. Ask for name and type (`llm` / `script` / `composite`)
2. Ask type-specific fields:
   - `llm`: model name, system prompt
   - `script`: script path, optional args list
   - `composite`: repeat steps (type + model/script + prompt/args)
3. Write `.vessy/agents/<name>.yaml` with the Write tool
4. Confirm: *"Agent `<name>` created at `.vessy/agents/<name>.yaml`."*

### `vessy:agent-update <name>`

1. Run `node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" agent-get $ARGUMENTS` to fetch current content and display it
2. Ask: *"Cosa vuoi cambiare?"*
3. Apply changes conversationally — only modify the fields the user mentions, keep everything else
4. Rewrite `.vessy/agents/<name>.yaml` with the Write tool
5. Confirm the updated file path

### `vessy:agent-delete <name>`

1. Run `node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" agent-get $ARGUMENTS` to show a preview of what will be deleted
2. Ask: *"Sei sicuro di voler eliminare l'agente `<name>`? Digita 'sì' per confermare."*
3. On confirmation: `rm .vessy/agents/<name>.yaml`
4. Confirm deletion

`allowed-tools` includes `Bash(rm .vessy/agents/*.yaml)`.

### `vessy:pipeline-list`

Runs `node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" pipelines` and presents each pipeline's name and description.

### `vessy:pipeline-get <name>`

Runs `node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" diagram $ARGUMENTS`, renders the Mermaid diagram, and describes the flow in one sentence.

### `vessy:pipeline-create`

Conversational — no CLI involved.

1. Ask for pipeline name
2. Ask for optional description
3. Help the user define the flow: ask about nodes and edges, or accept a complete Mermaid diagram if the user provides one
4. Write `.vessy/pipelines/<name>.md` with frontmatter + fenced Mermaid block
5. Confirm: *"Pipeline `<name>` created at `.vessy/pipelines/<name>.md`."*

Pipeline file format:
```markdown
---
name: <name>
description: <description>
---

```mermaid
flowchart LR
    <edges>
```
```

### `vessy:pipeline-update <name>`

1. Read `.vessy/pipelines/<name>.md` directly with the Read tool (not via CLI — we need raw markdown including frontmatter) and display current content
2. Ask: *"Cosa vuoi cambiare?"*
3. Apply changes — description, node names, edges — conversationally
4. Rewrite `.vessy/pipelines/<name>.md` with the Write tool
5. Confirm the updated file path

### `vessy:pipeline-delete <name>`

1. Read `.vessy/pipelines/<name>.md` and show a preview
2. Ask: *"Sei sicuro di voler eliminare la pipeline `<name>`? Digita 'sì' per confermare."*
3. On confirmation: `rm .vessy/pipelines/<name>.md`
4. Confirm deletion

`allowed-tools` includes `Bash(rm .vessy/pipelines/*.md)`.

### `vessy:pipeline-run <name>`

Runs `node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" run $ARGUMENTS` and streams output as-is. Highlights final status and session directory path on completion.

---

## File Structure

```
packages/adapter-claude-code/
├── src/
│   ├── commands/
│   │   ├── agents.ts           (existing)
│   │   ├── agent-get.ts        ← new
│   │   ├── pipelines.ts        (existing)
│   │   ├── diagram.ts          (existing)
│   │   └── run.ts              (existing)
│   ├── __tests__/
│   │   ├── agents.test.ts      (existing)
│   │   ├── agent-get.test.ts   ← new
│   │   ├── pipelines.test.ts   (existing)
│   │   ├── diagram.test.ts     (existing)
│   │   ├── format.test.ts      (existing)
│   │   └── run.test.ts         (existing)
│   ├── format.ts               (existing)
│   └── cli.ts                  ← modified (add agent-get case)
├── commands/
│   ├── vessy-agent-list.md     ← new
│   ├── vessy-agent-get.md      ← new
│   ├── vessy-agent-create.md   ← new
│   ├── vessy-agent-update.md   ← new
│   ├── vessy-agent-delete.md   ← new
│   ├── vessy-pipeline-list.md  ← new
│   ├── vessy-pipeline-get.md   ← new
│   ├── vessy-pipeline-create.md ← new
│   ├── vessy-pipeline-update.md ← new
│   ├── vessy-pipeline-delete.md ← new
│   ├── vessy-pipeline-run.md   ← new
│   ├── vessy-agents.md         ← deleted
│   ├── vessy-add-agent.md      ← deleted
│   ├── vessy-agent-pipelines.md ← deleted
│   └── vessy-run-pipeline.md   ← deleted
└── skills/                     ← deleted entirely
```

---

## Testing

`agent-get.test.ts` follows the same pattern as `agents.test.ts`:

- Mock `node:fs/promises` via `vi.mock`
- Test: prints raw YAML to stdout when file exists
- Test: exits with code 1 and stderr message when file does not exist
- Test: validates that exactly one argument is required

All existing tests remain unchanged.
