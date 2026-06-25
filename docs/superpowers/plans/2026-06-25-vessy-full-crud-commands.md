# vessy Full CRUD Slash Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four existing vessy slash commands with eleven normalized commands (`vessy:agent-*` / `vessy:pipeline-*`) covering full CRUD for agents and pipelines plus pipeline run.

**Architecture:** Hybrid — read/list/run operations delegate to `dist/cli.cjs`; create/update/delete operations are handled conversationally in the command files using Read/Write/Bash tools. The only new TypeScript is the `agent-get` CLI subcommand; everything else is command file authoring and file deletion.

**Tech Stack:** TypeScript 5.x, Vitest, esbuild, Claude Code plugin `commands/*.md` with YAML frontmatter

---

## File Map

```
packages/adapter-claude-code/
├── src/
│   ├── commands/
│   │   └── agent-get.ts          ← CREATE
│   ├── __tests__/
│   │   └── agent-get.test.ts     ← CREATE
│   └── cli.ts                    ← MODIFY (add agent-get case + import)
├── commands/
│   ├── vessy-agent-list.md       ← CREATE
│   ├── vessy-agent-get.md        ← CREATE
│   ├── vessy-agent-create.md     ← CREATE
│   ├── vessy-agent-update.md     ← CREATE
│   ├── vessy-agent-delete.md     ← CREATE
│   ├── vessy-pipeline-list.md    ← CREATE
│   ├── vessy-pipeline-get.md     ← CREATE
│   ├── vessy-pipeline-create.md  ← CREATE
│   ├── vessy-pipeline-update.md  ← CREATE
│   ├── vessy-pipeline-delete.md  ← CREATE
│   ├── vessy-pipeline-run.md     ← CREATE
│   ├── vessy-agents.md           ← DELETE
│   ├── vessy-add-agent.md        ← DELETE
│   ├── vessy-agent-pipelines.md  ← DELETE
│   └── vessy-run-pipeline.md     ← DELETE
└── skills/                       ← DELETE (entire directory)
```

---

## Task 1: `agent-get` CLI command (TDD)

**Files:**
- Create: `packages/adapter-claude-code/src/__tests__/agent-get.test.ts`
- Create: `packages/adapter-claude-code/src/commands/agent-get.ts`

All commands are run from `packages/adapter-claude-code/`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/agent-get.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

describe('agentGetCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(
      (() => { throw new Error('process.exit') }) as never
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
    stdoutSpy.mockRestore()
    stderrSpy.mockRestore()
    exitSpy.mockRestore()
  })

  it('writes raw YAML content to stdout', async () => {
    const { readFile } = await import('node:fs/promises')
    vi.mocked(readFile).mockResolvedValue('name: researcher\ntype: llm\n')

    const { agentGetCommand } = await import('../commands/agent-get.js')
    await agentGetCommand('researcher')

    expect(stdoutSpy).toHaveBeenCalledWith('name: researcher\ntype: llm\n')
    expect(exitSpy).not.toHaveBeenCalled()
  })

  it('prints error to stderr and exits with code 1 when agent not found', async () => {
    const { readFile } = await import('node:fs/promises')
    vi.mocked(readFile).mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    )

    const { agentGetCommand } = await import('../commands/agent-get.js')
    await expect(agentGetCommand('missing')).rejects.toThrow('process.exit')

    expect(stderrSpy).toHaveBeenCalledWith("Agent 'missing' not found.")
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `Cannot find module '../commands/agent-get.js'`

- [ ] **Step 3: Implement `agent-get.ts`**

Create `src/commands/agent-get.ts`:

```typescript
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function agentGetCommand(name: string): Promise<void> {
  const filePath = join(process.cwd(), '.vessy', 'agents', `${name}.yaml`)
  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    console.error(`Agent '${name}' not found.`)
    process.exit(1)
  }
  process.stdout.write(content)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: all tests PASS including the 2 new `agentGetCommand` tests.

- [ ] **Step 5: Commit**

```bash
git add src/commands/agent-get.ts src/__tests__/agent-get.test.ts
git commit -m "feat(adapter-claude-code): add agent-get CLI command"
```

---

## Task 2: Wire `agent-get` into CLI, build, smoke test

**Files:**
- Modify: `packages/adapter-claude-code/src/cli.ts`

- [ ] **Step 1: Update `cli.ts`**

Replace the entire contents of `src/cli.ts` with:

```typescript
import { agentsCommand } from './commands/agents.js'
import { agentGetCommand } from './commands/agent-get.js'
import { pipelinesCommand } from './commands/pipelines.js'
import { diagramCommand } from './commands/diagram.js'
import { runCommand } from './commands/run.js'

const [, , command, ...args] = process.argv

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

async function main(): Promise<void> {
  switch (command) {
    case 'agents':
      return agentsCommand()
    case 'agent-get':
      if (!args[0]) fail('Usage: cli.js agent-get <agent-name>')
      return agentGetCommand(args[0])
    case 'pipelines':
      return pipelinesCommand()
    case 'diagram':
      if (!args[0]) fail('Usage: cli.js diagram <pipeline-name>')
      return diagramCommand(args[0])
    case 'run':
      if (!args[0]) fail('Usage: cli.js run <pipeline-name>')
      return runCommand(args[0])
    default:
      fail(
        `Unknown command: ${command ?? '(none)'}. Available: agents, agent-get, pipelines, diagram, run`
      )
  }
}

main().catch(err => {
  console.error(String(err))
  process.exit(1)
})
```

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected: all tests PASS (no regressions).

- [ ] **Step 3: Build the bundle**

```bash
pnpm build
```

Expected: `Built dist/cli.cjs` — no errors.

- [ ] **Step 4: Smoke test `agent-get`**

Run against a nonexistent agent to verify the error path:

```bash
node dist/cli.cjs agent-get nonexistent
echo "Exit: $?"
```

Expected:
```
Agent 'nonexistent' not found.
Exit: 1
```

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts
git commit -m "feat(adapter-claude-code): wire agent-get into CLI"
```

---

## Task 3: Remove old command files and `skills/` directory

**Files:**
- Delete: `packages/adapter-claude-code/commands/vessy-agents.md`
- Delete: `packages/adapter-claude-code/commands/vessy-add-agent.md`
- Delete: `packages/adapter-claude-code/commands/vessy-agent-pipelines.md`
- Delete: `packages/adapter-claude-code/commands/vessy-run-pipeline.md`
- Delete: `packages/adapter-claude-code/skills/` (entire directory)

- [ ] **Step 1: Delete the old command files**

```bash
rm commands/vessy-agents.md \
   commands/vessy-add-agent.md \
   commands/vessy-agent-pipelines.md \
   commands/vessy-run-pipeline.md
```

- [ ] **Step 2: Delete the `skills/` directory**

```bash
rm -rf skills/
```

- [ ] **Step 3: Verify only the `.claude-plugin/` manifest remains from old structure**

```bash
ls commands/
```

Expected: empty (no files).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(adapter-claude-code): remove old command files and skills directory"
```

---

## Task 4: Write agent command files

**Files:**
- Create: `packages/adapter-claude-code/commands/vessy-agent-list.md`
- Create: `packages/adapter-claude-code/commands/vessy-agent-get.md`
- Create: `packages/adapter-claude-code/commands/vessy-agent-create.md`
- Create: `packages/adapter-claude-code/commands/vessy-agent-update.md`
- Create: `packages/adapter-claude-code/commands/vessy-agent-delete.md`

- [ ] **Step 1: Create `commands/vessy-agent-list.md`**

```markdown
---
description: List all agents in .vessy/agents/
allowed-tools: ["Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs:*)"]
---

List all agents defined in the current project's `.vessy/agents/` directory.

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" agents
```

Present the output as a table. Each row shows: agent name, type (`llm` / `script` / `composite`), and model (for LLM agents only). If no agents are found, report that `.vessy/agents/` is empty or does not exist.
```

- [ ] **Step 2: Create `commands/vessy-agent-get.md`**

```markdown
---
description: Show a specific agent's YAML definition
argument-hint: "<agent-name>"
allowed-tools: ["Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs:*)"]
---

Show the YAML definition for the agent named `$ARGUMENTS`.

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" agent-get $ARGUMENTS
```

Display the output with YAML syntax highlighting. If the agent does not exist, report the error.
```

- [ ] **Step 3: Create `commands/vessy-agent-create.md`**

```markdown
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
```

- [ ] **Step 4: Create `commands/vessy-agent-update.md`**

```markdown
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
```

- [ ] **Step 5: Create `commands/vessy-agent-delete.md`**

```markdown
---
description: Delete an agent from .vessy/agents/
argument-hint: "<agent-name>"
allowed-tools: ["Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs:*)", "Bash(rm .vessy/agents/*.yaml)"]
---

Delete the agent named `$ARGUMENTS`.

## Step 1 — Show what will be deleted

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" agent-get $ARGUMENTS
```

Display the current YAML as a preview.

## Step 2 — Ask for confirmation

Ask: "Are you sure you want to delete the agent `$ARGUMENTS`? Type 'yes' to confirm."

Wait for an explicit confirmation before proceeding. If the user does not confirm, abort.

## Step 3 — Delete

On confirmation, run:

```!
rm .vessy/agents/$ARGUMENTS.yaml
```

## Step 4 — Confirm

Report: "Agent `$ARGUMENTS` deleted."
```

- [ ] **Step 6: Validate the plugin**

```bash
claude plugin validate .
```

Expected: `✔ Validation passed`

- [ ] **Step 7: Commit**

```bash
git add commands/
git commit -m "feat(adapter-claude-code): add agent CRUD command files"
```

---

## Task 5: Write pipeline command files

**Files:**
- Create: `packages/adapter-claude-code/commands/vessy-pipeline-list.md`
- Create: `packages/adapter-claude-code/commands/vessy-pipeline-get.md`
- Create: `packages/adapter-claude-code/commands/vessy-pipeline-create.md`
- Create: `packages/adapter-claude-code/commands/vessy-pipeline-update.md`
- Create: `packages/adapter-claude-code/commands/vessy-pipeline-delete.md`
- Create: `packages/adapter-claude-code/commands/vessy-pipeline-run.md`

- [ ] **Step 1: Create `commands/vessy-pipeline-list.md`**

```markdown
---
description: List all pipelines in .vessy/pipelines/
allowed-tools: ["Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs:*)"]
---

List all pipelines in the current project's `.vessy/pipelines/` directory.

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" pipelines
```

Present each pipeline's name and description. If no pipelines are found, report that `.vessy/pipelines/` is empty or does not exist.
```

- [ ] **Step 2: Create `commands/vessy-pipeline-get.md`**

```markdown
---
description: Show the Mermaid diagram for a named pipeline
argument-hint: "<pipeline-name>"
allowed-tools: ["Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs:*)"]
---

Show the diagram for the pipeline named `$ARGUMENTS`.

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" diagram $ARGUMENTS
```

Render the output as a Mermaid diagram. Describe the pipeline's flow in one sentence after the diagram.
```

- [ ] **Step 3: Create `commands/vessy-pipeline-create.md`**

```markdown
---
description: Create a new pipeline in .vessy/pipelines/
allowed-tools: ["Write"]
---

Create a new pipeline definition by gathering information conversationally, then writing the Markdown file. Do NOT use the CLI for this command.

## Step 1 — Ask for basic information

Ask the user:
- **Name**: What should the pipeline be called? (used as the filename)
- **Description** (optional): A one-line description of what the pipeline does

## Step 2 — Define the flow

Ask the user to describe the pipeline flow. Accept either:
- A natural-language description of nodes and edges (Claude builds the Mermaid diagram)
- A ready-made `flowchart LR` Mermaid diagram provided by the user

If building from description, confirm the final diagram with the user before writing.

## Step 3 — Write the file

Write `.vessy/pipelines/<name>.md` using the Write tool:

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

Omit the `description:` frontmatter line if none was provided.

## Step 4 — Confirm

Report the created file path: `.vessy/pipelines/<name>.md`.
```

- [ ] **Step 4: Create `commands/vessy-pipeline-update.md`**

```markdown
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

Report the updated file path: `.vessy/pipelines/$ARGUMENTS.md`.
```

- [ ] **Step 5: Create `commands/vessy-pipeline-delete.md`**

```markdown
---
description: Delete a pipeline from .vessy/pipelines/
argument-hint: "<pipeline-name>"
allowed-tools: ["Read", "Bash(rm .vessy/pipelines/*.md)"]
---

Delete the pipeline named `$ARGUMENTS`.

## Step 1 — Show what will be deleted

Read `.vessy/pipelines/$ARGUMENTS.md` using the Read tool and display a preview of its content.

## Step 2 — Ask for confirmation

Ask: "Are you sure you want to delete the pipeline `$ARGUMENTS`? Type 'yes' to confirm."

Wait for an explicit confirmation before proceeding. If the user does not confirm, abort.

## Step 3 — Delete

On confirmation, run:

```!
rm .vessy/pipelines/$ARGUMENTS.md
```

## Step 4 — Confirm

Report: "Pipeline `$ARGUMENTS` deleted."
```

- [ ] **Step 6: Create `commands/vessy-pipeline-run.md`**

```markdown
---
description: Run a vessy pipeline by name
argument-hint: "<pipeline-name>"
allowed-tools: ["Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs:*)"]
---

Run the pipeline named `$ARGUMENTS`:

```!
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.cjs" run $ARGUMENTS
```

Present the output as-is. When the pipeline finishes, highlight:
- The final status (`Passed` / `Failed`)
- The session directory path where artifacts are stored

If `$ARGUMENTS` is empty, ask the user for the pipeline name before running.
```

- [ ] **Step 7: Validate the plugin**

```bash
claude plugin validate .
```

Expected: `✔ Validation passed`

- [ ] **Step 8: Commit**

```bash
git add commands/
git commit -m "feat(adapter-claude-code): add pipeline CRUD command files"
```
