# Vessy Core Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@vessy/core` (pipeline execution engine) and `@vessy/sdk` (shared types) as a pnpm monorepo.

**Architecture:** `@vessy/sdk` exports TypeScript interfaces only. `@vessy/core` contains five components — `AgentLoader`, `PipelineParser`, `ArtifactManager`, `ReportManager`, `AgentRunner`, `PipelineExecutor` — wired together via a `runPipeline` async generator. Adapters (Spec 2+) depend on both packages.

**Tech Stack:** TypeScript 5.x (ESM/NodeNext), pnpm workspaces, Turbo, Vitest, `yaml` (YAML parsing), `@anthropic-ai/sdk` (LLM execution).

---

## File Map

```
# Root
package.json
pnpm-workspace.yaml
turbo.json
tsconfig.base.json

# @vessy/sdk
packages/sdk/package.json
packages/sdk/tsconfig.json
packages/sdk/src/types.ts
packages/sdk/src/index.ts

# @vessy/core
packages/core/package.json
packages/core/tsconfig.json
packages/core/vitest.config.ts
packages/core/src/index.ts
packages/core/src/agent-loader.ts
packages/core/src/pipeline-parser.ts
packages/core/src/artifact-manager.ts
packages/core/src/report-manager.ts
packages/core/src/agent-runner.ts
packages/core/src/pipeline-executor.ts
packages/core/src/__tests__/agent-loader.test.ts
packages/core/src/__tests__/pipeline-parser.test.ts
packages/core/src/__tests__/artifact-manager.test.ts
packages/core/src/__tests__/report-manager.test.ts
packages/core/src/__tests__/agent-runner.test.ts
packages/core/src/__tests__/pipeline-executor.test.ts
packages/core/src/__tests__/integration.test.ts
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`

- [ ] **Step 1: Install pnpm globally**

```bash
npm install -g pnpm
```

Expected: `pnpm` command available. Verify with `pnpm --version`.

- [ ] **Step 2: Write root `package.json`**

```json
{
  "name": "vessy",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "typecheck": "turbo typecheck"
  },
  "devDependencies": {
    "turbo": "^2.9.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 4: Write `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

- [ ] **Step 5: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 6: Install root devDependencies**

```bash
pnpm install
```

Expected: `node_modules` at root, `pnpm-lock.yaml` created.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json pnpm-lock.yaml
git commit -m "chore: monorepo scaffold with pnpm workspaces and turbo"
```

---

## Task 2: `@vessy/sdk` Package

**Files:**
- Create: `packages/sdk/package.json`
- Create: `packages/sdk/tsconfig.json`
- Create: `packages/sdk/src/types.ts`
- Create: `packages/sdk/src/index.ts`

- [ ] **Step 1: Create package directories**

```bash
mkdir -p packages/sdk/src
```

- [ ] **Step 2: Write `packages/sdk/package.json`**

```json
{
  "name": "@vessy/sdk",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "*"
  }
}
```

- [ ] **Step 3: Write `packages/sdk/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Write `packages/sdk/src/types.ts`**

```typescript
export type AgentType = 'llm' | 'script' | 'composite'

export interface CompositeStep {
  type: 'llm' | 'script'
  model?: string
  systemPrompt?: string
  tools?: string[]
  script?: string
  args?: string[]
}

export interface AgentDefinition {
  name: string
  type: AgentType
  model?: string
  systemPrompt?: string
  tools?: string[]
  script?: string
  args?: string[]
  steps?: CompositeStep[]
  timeout?: number
  statuses?: string[]
}

export const BASE_STATUSES = ['Passed', 'Failed', 'Skipped'] as const
export type BaseStatus = typeof BASE_STATUSES[number]

export interface AgentSummary {
  name: string
  type: AgentType
  model?: string
}

export interface PipelineSummary {
  name: string
  description?: string
  nodeCount: number
}

export interface TokenUsage {
  input: number
  output: number
  total: number
  costUsd: number
}

export interface AgentReport {
  agent: string
  durationMs: number
  invokedBy: string | null
  invoked: string[]
  tokens: TokenUsage | null
}

export interface PipelineReport {
  totalDurationMs: number
  status: string
  tokens: TokenUsage
  agentSummary: Array<{
    agent: string
    status: string
    durationMs: number
    tokens: TokenUsage | null
  }>
}

export type RunEvent =
  | { type: 'agent:start'; agent: string; folder: string; session: string }
  | { type: 'agent:complete'; agent: string; status: string; artifacts: string[]; report: AgentReport }
  | { type: 'agent:error'; agent: string; error: string }
  | { type: 'pipeline:done'; sessionDir: string; report: PipelineReport }

export interface AgentManifest {
  status: string
  outputs: string[]
  report?: AgentReport
}

export interface PipelineRunState {
  pipeline: string
  sessionId: string
  startedAt: string
  completedAt?: string
  status: string
  agents: Record<string, { folder: string; status: string }>
  report?: PipelineReport
}

export interface RunOptions {
  sessionsDir?: string
  agentsDir?: string
  pipelinesDir?: string
}

export interface VessyAdapter {
  listAgents(): Promise<AgentSummary[]>
  addAgent(definition: AgentDefinition): Promise<void>
  listPipelines(): Promise<PipelineSummary[]>
  getPipelineDiagram(name: string): Promise<string>
  runPipeline(name: string, opts?: RunOptions): AsyncIterable<RunEvent>
}
```

- [ ] **Step 5: Write `packages/sdk/src/index.ts`**

```typescript
export * from './types.js'
```

- [ ] **Step 6: Build the SDK package**

```bash
pnpm --filter @vessy/sdk build
```

Expected: `packages/sdk/dist/` contains `index.js`, `index.d.ts`, and map files.

- [ ] **Step 7: Commit**

```bash
git add packages/sdk
git commit -m "feat: add @vessy/sdk types package"
```

---

## Task 3: `@vessy/core` Setup + `AgentLoader`

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/agent-loader.ts`
- Create: `packages/core/src/__tests__/agent-loader.test.ts`

- [ ] **Step 1: Create package directories**

```bash
mkdir -p packages/core/src/__tests__
```

- [ ] **Step 2: Write `packages/core/package.json`**

```json
{
  "name": "@vessy/core",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.56.0",
    "@vessy/sdk": "workspace:*",
    "yaml": "^2.7.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "*",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 3: Write `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"],
  "references": [
    { "path": "../sdk" }
  ]
}
```

- [ ] **Step 4: Write `packages/core/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 5: Install core dependencies**

```bash
pnpm --filter @vessy/core install
```

Expected: `node_modules` inside `packages/core`, `@anthropic-ai/sdk` and `yaml` present.

- [ ] **Step 6: Write the failing tests for `AgentLoader`**

Create `packages/core/src/__tests__/agent-loader.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { AgentLoader } from '../agent-loader.js'

describe('AgentLoader', () => {
  let agentsDir: string

  beforeEach(async () => {
    agentsDir = join(tmpdir(), `vessy-test-${Date.now()}`)
    await mkdir(agentsDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(agentsDir, { recursive: true, force: true })
  })

  it('loads a valid llm agent', async () => {
    await writeFile(
      join(agentsDir, 'researcher.yaml'),
      'name: researcher\ntype: llm\nmodel: claude-opus-4-7\nsystemPrompt: You are a researcher.\n',
    )
    const loader = new AgentLoader(agentsDir)
    const agent = await loader.load('researcher')
    expect(agent.name).toBe('researcher')
    expect(agent.type).toBe('llm')
    expect(agent.model).toBe('claude-opus-4-7')
  })

  it('loads a valid script agent with timeout and custom statuses', async () => {
    await writeFile(
      join(agentsDir, 'runner.yaml'),
      'name: runner\ntype: script\nscript: ./run.sh\nargs: ["--verbose"]\ntimeout: 60\nstatuses:\n  - Passed\n  - Failed\n  - partial\n',
    )
    const loader = new AgentLoader(agentsDir)
    const agent = await loader.load('runner')
    expect(agent.script).toBe('./run.sh')
    expect(agent.timeout).toBe(60)
    expect(agent.statuses).toContain('partial')
  })

  it('throws when agent file does not exist', async () => {
    const loader = new AgentLoader(agentsDir)
    await expect(loader.load('nonexistent')).rejects.toThrow("Agent 'nonexistent' not found")
  })

  it('throws when llm agent is missing model', async () => {
    await writeFile(join(agentsDir, 'broken.yaml'), 'name: broken\ntype: llm\n')
    const loader = new AgentLoader(agentsDir)
    await expect(loader.load('broken')).rejects.toThrow("llm type requires 'model'")
  })

  it('throws when script agent is missing script field', async () => {
    await writeFile(join(agentsDir, 'broken.yaml'), 'name: broken\ntype: script\n')
    const loader = new AgentLoader(agentsDir)
    await expect(loader.load('broken')).rejects.toThrow("script type requires 'script'")
  })

  it('throws when type is invalid', async () => {
    await writeFile(join(agentsDir, 'broken.yaml'), 'name: broken\ntype: invalid\n')
    const loader = new AgentLoader(agentsDir)
    await expect(loader.load('broken')).rejects.toThrow("invalid type 'invalid'")
  })

  it('lists all agents in directory', async () => {
    await writeFile(join(agentsDir, 'a.yaml'), 'name: a\ntype: script\nscript: ./a.sh\n')
    await writeFile(join(agentsDir, 'b.yaml'), 'name: b\ntype: llm\nmodel: claude-opus-4-7\nsystemPrompt: hi\n')
    const loader = new AgentLoader(agentsDir)
    const agents = await loader.list()
    expect(agents).toHaveLength(2)
    expect(agents.map(a => a.name).sort()).toEqual(['a', 'b'])
  })

  it('returns empty list when directory is empty', async () => {
    const loader = new AgentLoader(agentsDir)
    expect(await loader.list()).toEqual([])
  })
})
```

- [ ] **Step 7: Run tests to verify they fail**

```bash
pnpm --filter @vessy/core test 2>&1 | head -20
```

Expected: FAIL — `Cannot find module '../agent-loader.js'`

- [ ] **Step 8: Write `packages/core/src/agent-loader.ts`**

```typescript
import { readFile, readdir } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'
import { parse } from 'yaml'
import type { AgentDefinition } from '@vessy/sdk'

export class AgentLoader {
  constructor(private readonly agentsDir: string) {}

  async load(name: string): Promise<AgentDefinition> {
    const filePath = join(this.agentsDir, `${name}.yaml`)
    let content: string
    try {
      content = await readFile(filePath, 'utf-8')
    } catch {
      throw new Error(`Agent '${name}' not found at ${filePath}`)
    }
    const raw = parse(content) as AgentDefinition
    this.validate(raw, filePath)
    return raw
  }

  async list(): Promise<AgentDefinition[]> {
    let files: string[]
    try {
      files = await readdir(this.agentsDir)
    } catch {
      return []
    }
    const yamlFiles = files.filter(f => extname(f) === '.yaml')
    return Promise.all(yamlFiles.map(f => this.load(basename(f, '.yaml'))))
  }

  private validate(agent: AgentDefinition, filePath: string): void {
    if (!agent.name) throw new Error(`Agent at ${filePath} is missing 'name'`)
    if (!['llm', 'script', 'composite'].includes(agent.type))
      throw new Error(`Agent '${agent.name}': invalid type '${agent.type}'`)
    if (agent.type === 'llm' && !agent.model)
      throw new Error(`Agent '${agent.name}': llm type requires 'model'`)
    if (agent.type === 'script' && !agent.script)
      throw new Error(`Agent '${agent.name}': script type requires 'script'`)
    if (agent.type === 'composite' && (!agent.steps || agent.steps.length === 0))
      throw new Error(`Agent '${agent.name}': composite type requires non-empty 'steps'`)
  }
}
```

- [ ] **Step 9: Run tests to verify they pass**

```bash
pnpm --filter @vessy/core test
```

Expected: All 8 AgentLoader tests PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/core
git commit -m "feat: add @vessy/core scaffold and AgentLoader"
```

---

## Task 4: `PipelineParser`

**Files:**
- Create: `packages/core/src/pipeline-parser.ts`
- Create: `packages/core/src/__tests__/pipeline-parser.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/__tests__/pipeline-parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parsePipeline } from '../pipeline-parser.js'

const SIMPLE = `---
name: simple
description: A simple pipeline
---

\`\`\`mermaid
flowchart LR
    fetch --> process
    process --> publish
\`\`\``

const PARALLEL = `---
name: parallel
---

\`\`\`mermaid
flowchart LR
    start --> worker_a
    start --> worker_b
    worker_a --> merge
    worker_b --> merge
\`\`\``

const CONDITIONAL = `---
name: conditional
---

\`\`\`mermaid
flowchart LR
    run -->|Passed| publish
    run -->|Failed| error_handler
\`\`\``

describe('parsePipeline', () => {
  it('extracts name and description from frontmatter', () => {
    const r = parsePipeline(SIMPLE)
    expect(r.name).toBe('simple')
    expect(r.description).toBe('A simple pipeline')
  })

  it('builds correct node list for linear pipeline', () => {
    const r = parsePipeline(SIMPLE)
    expect([...r.nodes.keys()].sort()).toEqual(['fetch', 'process', 'publish'])
  })

  it('identifies start nodes (no predecessors)', () => {
    const r = parsePipeline(SIMPLE)
    expect(r.startNodes).toEqual(['fetch'])
  })

  it('sets correct predecessors for each node', () => {
    const r = parsePipeline(SIMPLE)
    expect(r.nodes.get('fetch')!.predecessors).toEqual([])
    expect(r.nodes.get('process')!.predecessors).toEqual(['fetch'])
    expect(r.nodes.get('publish')!.predecessors).toEqual(['process'])
  })

  it('sets correct edges for each node', () => {
    const r = parsePipeline(SIMPLE)
    expect(r.nodes.get('fetch')!.edges).toEqual([{ to: 'process', label: undefined }])
    expect(r.nodes.get('process')!.edges).toEqual([{ to: 'publish', label: undefined }])
    expect(r.nodes.get('publish')!.edges).toEqual([])
  })

  it('handles parallel nodes sharing a predecessor', () => {
    const r = parsePipeline(PARALLEL)
    expect(r.startNodes).toEqual(['start'])
    expect(r.nodes.get('worker_a')!.predecessors).toEqual(['start'])
    expect(r.nodes.get('worker_b')!.predecessors).toEqual(['start'])
    expect(r.nodes.get('merge')!.predecessors.sort()).toEqual(['worker_a', 'worker_b'])
  })

  it('parses conditional edge labels', () => {
    const r = parsePipeline(CONDITIONAL)
    const edges = r.nodes.get('run')!.edges
    expect(edges).toHaveLength(2)
    expect(edges.find(e => e.label === 'Passed')?.to).toBe('publish')
    expect(edges.find(e => e.label === 'Failed')?.to).toBe('error_handler')
  })

  it('throws when no mermaid block is present', () => {
    expect(() => parsePipeline('---\nname: test\n---\nNo diagram here.')).toThrow('No mermaid block found')
  })

  it('uses "unnamed" when name is absent from frontmatter', () => {
    const content = '\`\`\`mermaid\nflowchart LR\n    a --> b\n\`\`\`'
    expect(parsePipeline(content).name).toBe('unnamed')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @vessy/core test 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL — `Cannot find module '../pipeline-parser.js'`

- [ ] **Step 3: Write `packages/core/src/pipeline-parser.ts`**

```typescript
import { parse } from 'yaml'

export interface DagEdge {
  to: string
  label: string | undefined
}

export interface DagNode {
  id: string
  predecessors: string[]
  edges: DagEdge[]
}

export interface ParsedPipeline {
  name: string
  description: string | undefined
  mermaidSource: string
  nodes: Map<string, DagNode>
  startNodes: string[]
}

export function parsePipeline(content: string): ParsedPipeline {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const meta = frontmatterMatch
    ? (parse(frontmatterMatch[1]) as { name?: string; description?: string })
    : {}

  const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)\n```/)
  if (!mermaidMatch) throw new Error('No mermaid block found in pipeline file')

  const mermaidSource = mermaidMatch[1]
  const nodes = buildDag(mermaidSource)
  const startNodes = [...nodes.values()]
    .filter(n => n.predecessors.length === 0)
    .map(n => n.id)
    .sort()

  return {
    name: meta.name ?? 'unnamed',
    description: meta.description,
    mermaidSource,
    nodes,
    startNodes,
  }
}

function buildDag(mermaid: string): Map<string, DagNode> {
  const nodes = new Map<string, DagNode>()

  const getOrCreate = (id: string): DagNode => {
    if (!nodes.has(id)) nodes.set(id, { id, predecessors: [], edges: [] })
    return nodes.get(id)!
  }

  const edgeRe = /(\w+)\s*-->(?:\|([^|]+)\|)?\s*(\w+)/g
  let match: RegExpExecArray | null
  while ((match = edgeRe.exec(mermaid)) !== null) {
    const [, from, label, to] = match
    const fromNode = getOrCreate(from)
    const toNode = getOrCreate(to)
    fromNode.edges.push({ to, label: label?.trim() })
    if (!toNode.predecessors.includes(from)) toNode.predecessors.push(from)
  }

  return nodes
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @vessy/core test
```

Expected: All PipelineParser tests PASS (AgentLoader tests still pass too).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/pipeline-parser.ts packages/core/src/__tests__/pipeline-parser.test.ts
git commit -m "feat: add PipelineParser — Mermaid to DAG"
```

---

## Task 5: `ArtifactManager`

**Files:**
- Create: `packages/core/src/artifact-manager.ts`
- Create: `packages/core/src/__tests__/artifact-manager.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/__tests__/artifact-manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ArtifactManager } from '../artifact-manager.js'
import type { AgentManifest, AgentReport } from '@vessy/sdk'

const DUMMY_REPORT: AgentReport = {
  agent: 'test',
  durationMs: 100,
  invokedBy: null,
  invoked: [],
  tokens: null,
}

describe('ArtifactManager', () => {
  let sessionsDir: string
  let manager: ArtifactManager

  beforeEach(async () => {
    sessionsDir = join(tmpdir(), `vessy-sessions-${Date.now()}`)
    manager = new ArtifactManager(sessionsDir, 3)
    await manager.init('test-pipeline')
  })

  afterEach(async () => {
    await rm(sessionsDir, { recursive: true, force: true })
  })

  it('generates a session id matching session-<hex>', () => {
    expect(manager.id).toMatch(/^session-[a-f0-9]+$/)
  })

  it('session dir path contains the session id', () => {
    expect(manager.dir).toContain(manager.id)
  })

  it('writes pipeline-run.json on init with status running', async () => {
    const state = await manager.readRunState()
    expect(state.pipeline).toBe('test-pipeline')
    expect(state.sessionId).toBe(manager.id)
    expect(state.status).toBe('running')
    expect(state.agents).toEqual({})
  })

  it('creates agent folders with incremental prefix', async () => {
    const f1 = await manager.createAgentFolder('alpha')
    const f2 = await manager.createAgentFolder('beta')
    expect(f1.split('/').pop()).toBe('1-alpha')
    expect(f2.split('/').pop()).toBe('2-beta')
  })

  it('zero-pads prefix to length of total node count', async () => {
    const big = new ArtifactManager(sessionsDir + '-big', 15)
    await big.init('big')
    const f = await big.createAgentFolder('first')
    expect(f.split('/').pop()).toBe('01-first')
    await rm(sessionsDir + '-big', { recursive: true, force: true })
  })

  it('writes and reads manifest.json round-trip', async () => {
    const folder = await manager.createAgentFolder('researcher')
    const manifest: AgentManifest = {
      status: 'Passed',
      outputs: ['report.md'],
      report: DUMMY_REPORT,
    }
    await manager.writeManifest(folder, manifest)
    expect(await manager.readManifest(folder)).toEqual(manifest)
  })

  it('updates agent status in pipeline-run.json', async () => {
    const folder = await manager.createAgentFolder('agent1')
    await manager.updateAgentStatus('agent1', folder, 'Passed')
    const state = await manager.readRunState()
    expect(state.agents['agent1'].status).toBe('Passed')
    expect(state.agents['agent1'].folder).toBe('1-agent1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @vessy/core test 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL — `Cannot find module '../artifact-manager.js'`

- [ ] **Step 3: Write `packages/core/src/artifact-manager.ts`**

```typescript
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { AgentManifest, PipelineRunState } from '@vessy/sdk'

export class ArtifactManager {
  private readonly sessionId: string
  private readonly sessionDir: string
  private counter = 0

  constructor(
    private readonly sessionsDir: string,
    private readonly nodeCount: number,
  ) {
    this.sessionId = `session-${randomUUID().split('-')[0]}`
    this.sessionDir = join(sessionsDir, this.sessionId)
  }

  get id(): string {
    return this.sessionId
  }

  get dir(): string {
    return this.sessionDir
  }

  async init(pipelineName: string): Promise<void> {
    await mkdir(this.sessionDir, { recursive: true })
    const state: PipelineRunState = {
      pipeline: pipelineName,
      sessionId: this.sessionId,
      startedAt: new Date().toISOString(),
      status: 'running',
      agents: {},
    }
    await this.writeRunState(state)
  }

  async createAgentFolder(agentName: string): Promise<string> {
    this.counter++
    const width = String(this.nodeCount).length
    const prefix = String(this.counter).padStart(width, '0')
    const folderName = `${prefix}-${agentName}`
    const folderPath = join(this.sessionDir, folderName)
    await mkdir(folderPath, { recursive: true })
    return folderPath
  }

  async writeManifest(folderPath: string, manifest: AgentManifest): Promise<void> {
    await writeFile(join(folderPath, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')
  }

  async readManifest(folderPath: string): Promise<AgentManifest> {
    const content = await readFile(join(folderPath, 'manifest.json'), 'utf-8')
    return JSON.parse(content) as AgentManifest
  }

  async readRunState(): Promise<PipelineRunState> {
    const content = await readFile(join(this.sessionDir, 'pipeline-run.json'), 'utf-8')
    return JSON.parse(content) as PipelineRunState
  }

  async writeRunState(state: PipelineRunState): Promise<void> {
    await writeFile(
      join(this.sessionDir, 'pipeline-run.json'),
      JSON.stringify(state, null, 2),
      'utf-8',
    )
  }

  async updateAgentStatus(agentName: string, folderPath: string, status: string): Promise<void> {
    const state = await this.readRunState()
    const folderName = folderPath.split('/').pop()!
    state.agents[agentName] = { folder: folderName, status }
    await this.writeRunState(state)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @vessy/core test
```

Expected: All ArtifactManager tests PASS, prior tests still pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/artifact-manager.ts packages/core/src/__tests__/artifact-manager.test.ts
git commit -m "feat: add ArtifactManager — session folder and manifest management"
```

---

## Task 6: `ReportManager`

**Files:**
- Create: `packages/core/src/report-manager.ts`
- Create: `packages/core/src/__tests__/report-manager.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/__tests__/report-manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ReportManager } from '../report-manager.js'

describe('ReportManager', () => {
  let manager: ReportManager

  beforeEach(() => {
    manager = new ReportManager()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('records duration from start to complete', () => {
    vi.setSystemTime(1000)
    manager.startAgent('writer', 'researcher')
    vi.setSystemTime(4200)
    const report = manager.completeAgent('writer', 'Passed')
    expect(report.durationMs).toBe(3200)
    expect(report.agent).toBe('writer')
    expect(report.invokedBy).toBe('researcher')
    expect(report.tokens).toBeNull()
  })

  it('records null invokedBy for start nodes', () => {
    manager.startAgent('fetch', null)
    const report = manager.completeAgent('fetch', 'Passed')
    expect(report.invokedBy).toBeNull()
  })

  it('records token usage', () => {
    manager.startAgent('llm', null)
    manager.recordTokens('llm', { input: 100, output: 50, total: 150, costUsd: 0.01 })
    const report = manager.completeAgent('llm', 'Passed')
    expect(report.tokens).toEqual({ input: 100, output: 50, total: 150, costUsd: 0.01 })
  })

  it('records invocations', () => {
    manager.startAgent('fetch', null)
    manager.recordInvocation('fetch', 'researcher')
    manager.recordInvocation('fetch', 'analyst')
    const report = manager.completeAgent('fetch', 'Passed')
    expect(report.invoked).toEqual(['researcher', 'analyst'])
  })

  it('does not duplicate invocations', () => {
    manager.startAgent('a', null)
    manager.recordInvocation('a', 'b')
    manager.recordInvocation('a', 'b')
    expect(manager.completeAgent('a', 'Passed').invoked).toEqual(['b'])
  })

  it('throws when completing an agent that was not started', () => {
    expect(() => manager.completeAgent('ghost', 'Passed')).toThrow("No entry for agent 'ghost'")
  })

  it('builds pipeline report with aggregated token totals', () => {
    vi.setSystemTime(0)
    manager.startAgent('a', null)
    manager.recordTokens('a', { input: 100, output: 50, total: 150, costUsd: 0.01 })
    vi.setSystemTime(1000)
    manager.completeAgent('a', 'Passed')

    manager.startAgent('b', 'a')
    manager.recordTokens('b', { input: 200, output: 100, total: 300, costUsd: 0.02 })
    vi.setSystemTime(3000)
    manager.completeAgent('b', 'Failed')

    const report = manager.buildPipelineReport('Failed', 3000)
    expect(report.status).toBe('Failed')
    expect(report.totalDurationMs).toBe(3000)
    expect(report.tokens.total).toBe(450)
    expect(report.tokens.costUsd).toBeCloseTo(0.03)
    expect(report.agentSummary).toHaveLength(2)
    expect(report.agentSummary.find(s => s.agent === 'b')?.status).toBe('Failed')
  })

  it('returns zero token totals when no llm agents ran', () => {
    manager.startAgent('script', null)
    manager.completeAgent('script', 'Passed')
    const report = manager.buildPipelineReport('Passed', 500)
    expect(report.tokens).toEqual({ input: 0, output: 0, total: 0, costUsd: 0 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @vessy/core test 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL — `Cannot find module '../report-manager.js'`

- [ ] **Step 3: Write `packages/core/src/report-manager.ts`**

```typescript
import type { AgentReport, PipelineReport, TokenUsage } from '@vessy/sdk'

interface AgentEntry {
  agent: string
  startTime: number
  invokedBy: string | null
  invoked: string[]
  tokens: TokenUsage | null
  durationMs?: number
  status?: string
}

export class ReportManager {
  private readonly entries = new Map<string, AgentEntry>()

  startAgent(agent: string, invokedBy: string | null): void {
    this.entries.set(agent, {
      agent,
      startTime: Date.now(),
      invokedBy,
      invoked: [],
      tokens: null,
    })
  }

  recordInvocation(from: string, to: string): void {
    const entry = this.entries.get(from)
    if (entry && !entry.invoked.includes(to)) entry.invoked.push(to)
  }

  recordTokens(agent: string, tokens: TokenUsage): void {
    const entry = this.entries.get(agent)
    if (entry) entry.tokens = tokens
  }

  completeAgent(agent: string, status: string): AgentReport {
    const entry = this.entries.get(agent)
    if (!entry) throw new Error(`No entry for agent '${agent}'`)
    entry.durationMs = Date.now() - entry.startTime
    entry.status = status
    return {
      agent,
      durationMs: entry.durationMs,
      invokedBy: entry.invokedBy,
      invoked: entry.invoked,
      tokens: entry.tokens,
    }
  }

  buildPipelineReport(status: string, totalDurationMs: number): PipelineReport {
    const summaries = [...this.entries.values()]
      .filter(
        (e): e is AgentEntry & { durationMs: number; status: string } =>
          e.durationMs !== undefined && e.status !== undefined,
      )
      .map(e => ({ agent: e.agent, status: e.status, durationMs: e.durationMs, tokens: e.tokens }))

    const zero: TokenUsage = { input: 0, output: 0, total: 0, costUsd: 0 }
    const totalTokens = summaries.reduce(
      (acc, s) =>
        s.tokens
          ? {
              input: acc.input + s.tokens.input,
              output: acc.output + s.tokens.output,
              total: acc.total + s.tokens.total,
              costUsd: acc.costUsd + s.tokens.costUsd,
            }
          : acc,
      zero,
    )

    return { totalDurationMs, status, tokens: totalTokens, agentSummary: summaries }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @vessy/core test
```

Expected: All ReportManager tests PASS, prior tests still pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/report-manager.ts packages/core/src/__tests__/report-manager.test.ts
git commit -m "feat: add ReportManager — agent and pipeline execution metrics"
```

---

## Task 7: `AgentRunner`

**Files:**
- Create: `packages/core/src/agent-runner.ts`
- Create: `packages/core/src/__tests__/agent-runner.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/__tests__/agent-runner.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, rm, chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ArtifactManager } from '../artifact-manager.js'
import { ReportManager } from '../report-manager.js'
import { AgentRunner } from '../agent-runner.js'
import type { AgentDefinition } from '@vessy/sdk'

describe('AgentRunner — script type', () => {
  let sessionsDir: string
  let scriptsDir: string
  let manager: ArtifactManager
  let reportManager: ReportManager
  let runner: AgentRunner
  let folder: string

  beforeEach(async () => {
    sessionsDir = join(tmpdir(), `vessy-runner-${Date.now()}`)
    scriptsDir = join(tmpdir(), `vessy-scripts-${Date.now()}`)
    await Promise.all([mkdir(scriptsDir, { recursive: true })])
    manager = new ArtifactManager(sessionsDir, 1)
    await manager.init('test')
    reportManager = new ReportManager()
    runner = new AgentRunner(manager, reportManager)
    folder = await manager.createAgentFolder('agent')
    reportManager.startAgent('agent', null)
  })

  afterEach(async () => {
    await Promise.all([
      rm(sessionsDir, { recursive: true, force: true }),
      rm(scriptsDir, { recursive: true, force: true }),
    ])
  })

  async function makeScript(name: string, body: string): Promise<string> {
    const p = join(scriptsDir, name)
    await writeFile(p, body)
    await chmod(p, 0o755)
    return p
  }

  it('runs a script that writes manifest.json and returns Passed', async () => {
    const script = await makeScript('ok.sh', `#!/bin/sh
echo '{"status":"Passed","outputs":["done.txt"]}' > manifest.json
echo done > done.txt
`)
    const agent: AgentDefinition = { name: 'agent', type: 'script', script }
    const result = await runner.run(agent, folder, {})
    expect(result.status).toBe('Passed')
    expect(result.artifacts).toContain('manifest.json')
    expect(result.artifacts).toContain('done.txt')
  })

  it('returns custom status from script manifest', async () => {
    const script = await makeScript('custom.sh', `#!/bin/sh
echo '{"status":"needs_review","outputs":[]}' > manifest.json
`)
    const agent: AgentDefinition = { name: 'agent', type: 'script', script }
    expect((await runner.run(agent, folder, {})).status).toBe('needs_review')
  })

  it('passes predecessor folder paths as VESSY_INPUT_* env vars', async () => {
    const script = await makeScript('env.sh', `#!/bin/sh
echo '{"status":"Passed","outputs":["env.txt"]}' > manifest.json
echo $VESSY_INPUT_UPSTREAM > env.txt
`)
    const agent: AgentDefinition = { name: 'agent', type: 'script', script }
    const result = await runner.run(agent, folder, { upstream: '/some/path' })
    expect(result.status).toBe('Passed')
  })

  it('throws when script exits with non-zero code', async () => {
    const script = await makeScript('fail.sh', '#!/bin/sh\nexit 1')
    const agent: AgentDefinition = { name: 'agent', type: 'script', script }
    await expect(runner.run(agent, folder, {})).rejects.toThrow('Script exited with code 1')
  })

  it('throws timeout_exceeded when script exceeds timeout', async () => {
    const script = await makeScript('slow.sh', '#!/bin/sh\nsleep 10')
    const agent: AgentDefinition = { name: 'agent', type: 'script', script, timeout: 0.1 }
    await expect(runner.run(agent, folder, {})).rejects.toThrow('timeout_exceeded')
  }, 5000)

  it('throws when script does not write manifest.json', async () => {
    const script = await makeScript('no-manifest.sh', '#!/bin/sh\necho hello')
    const agent: AgentDefinition = { name: 'agent', type: 'script', script }
    await expect(runner.run(agent, folder, {})).rejects.toThrow('did not write manifest.json')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @vessy/core test 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL — `Cannot find module '../agent-runner.js'`

- [ ] **Step 3: Write `packages/core/src/agent-runner.ts`**

```typescript
import { spawn } from 'node:child_process'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import type { AgentDefinition, TokenUsage } from '@vessy/sdk'
import type { ArtifactManager } from './artifact-manager.js'
import type { ReportManager } from './report-manager.js'

export interface AgentRunResult {
  status: string
  artifacts: string[]
}

export class AgentRunner {
  private readonly anthropic = new Anthropic()

  constructor(
    private readonly artifactManager: ArtifactManager,
    private readonly reportManager: ReportManager,
  ) {}

  async run(
    agent: AgentDefinition,
    folder: string,
    predecessorFolders: Record<string, string>,
  ): Promise<AgentRunResult> {
    const env = this.buildEnv(folder, predecessorFolders)

    if (agent.type === 'script') {
      return this.runScript(agent, folder, env)
    }
    if (agent.type === 'llm') {
      return this.runLlm(agent, folder, env)
    }
    throw new Error(`Agent type '${agent.type}' is not supported in this version`)
  }

  private buildEnv(folder: string, predecessorFolders: Record<string, string>): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      VESSY_SESSION_DIR: this.artifactManager.dir,
      VESSY_OUTPUT_DIR: folder,
    }
    for (const [name, path] of Object.entries(predecessorFolders)) {
      env[`VESSY_INPUT_${name.toUpperCase()}`] = path
    }
    return env
  }

  private async runScript(
    agent: AgentDefinition,
    folder: string,
    env: NodeJS.ProcessEnv,
  ): Promise<AgentRunResult> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(agent.script!, agent.args ?? [], { env, cwd: folder, stdio: 'inherit' })

      const timer = agent.timeout
        ? setTimeout(() => {
            child.kill()
            reject(new Error('timeout_exceeded'))
          }, agent.timeout * 1000)
        : null

      child.on('close', code => {
        if (timer) clearTimeout(timer)
        if (code === 0) resolve()
        else reject(new Error(`Script exited with code ${code}`))
      })
      child.on('error', err => {
        if (timer) clearTimeout(timer)
        reject(err)
      })
    })

    let manifestContent: string
    try {
      manifestContent = await readFile(join(folder, 'manifest.json'), 'utf-8')
    } catch {
      throw new Error(`Agent '${agent.name}': script did not write manifest.json`)
    }

    const manifest = JSON.parse(manifestContent) as { status: string; outputs: string[] }
    const artifacts = await readdir(folder)
    return { status: manifest.status, artifacts }
  }

  private async runLlm(
    agent: AgentDefinition,
    folder: string,
    env: NodeJS.ProcessEnv,
  ): Promise<AgentRunResult> {
    const contextLines = Object.entries(env)
      .filter(([k]) => k.startsWith('VESSY_INPUT_'))
      .map(([k, v]) => `${k}=${v}`)

    const userMessage =
      contextLines.length > 0
        ? `Available predecessor outputs:\n${contextLines.join('\n')}\n\nComplete your task and write outputs to: ${folder}`
        : `Complete your task and write outputs to: ${folder}`

    const response = await this.anthropic.messages.create({
      model: agent.model!,
      max_tokens: 8192,
      system: agent.systemPrompt!,
      messages: [{ role: 'user', content: userMessage }],
    })

    const tokens: TokenUsage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens,
      costUsd: 0,
    }
    this.reportManager.recordTokens(agent.name, tokens)

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    await writeFile(join(folder, 'response.md'), text, 'utf-8')
    const artifacts = await readdir(folder)
    return { status: 'Passed', artifacts }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @vessy/core test
```

Expected: All AgentRunner tests PASS, prior tests still pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/agent-runner.ts packages/core/src/__tests__/agent-runner.test.ts
git commit -m "feat: add AgentRunner — script subprocess and LLM (Anthropic) execution"
```

---

## Task 8: `PipelineExecutor` + `runPipeline` + Integration Test

**Files:**
- Create: `packages/core/src/pipeline-executor.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/__tests__/pipeline-executor.test.ts`
- Create: `packages/core/src/__tests__/integration.test.ts`

- [ ] **Step 1: Write failing tests for `PipelineExecutor`**

Create `packages/core/src/__tests__/pipeline-executor.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, rm, chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ArtifactManager } from '../artifact-manager.js'
import { ReportManager } from '../report-manager.js'
import { AgentLoader } from '../agent-loader.js'
import { AgentRunner } from '../agent-runner.js'
import { PipelineExecutor } from '../pipeline-executor.js'
import { parsePipeline } from '../pipeline-parser.js'
import type { RunEvent } from '@vessy/sdk'

describe('PipelineExecutor', () => {
  let sessionsDir: string
  let agentsDir: string
  let scriptsDir: string

  beforeEach(async () => {
    sessionsDir = join(tmpdir(), `vessy-exec-s-${Date.now()}`)
    agentsDir = join(tmpdir(), `vessy-exec-a-${Date.now()}`)
    scriptsDir = join(tmpdir(), `vessy-exec-sc-${Date.now()}`)
    await Promise.all([
      mkdir(sessionsDir, { recursive: true }),
      mkdir(agentsDir, { recursive: true }),
      mkdir(scriptsDir, { recursive: true }),
    ])
  })

  afterEach(async () => {
    await Promise.all([
      rm(sessionsDir, { recursive: true, force: true }),
      rm(agentsDir, { recursive: true, force: true }),
      rm(scriptsDir, { recursive: true, force: true }),
    ])
  })

  async function makeScript(name: string, status = 'Passed'): Promise<string> {
    const p = join(scriptsDir, `${name}.sh`)
    await writeFile(p, `#!/bin/sh\necho '{"status":"${status}","outputs":[]}' > manifest.json`)
    await chmod(p, 0o755)
    return p
  }

  async function makeAgent(name: string, scriptPath: string): Promise<void> {
    await writeFile(join(agentsDir, `${name}.yaml`), `name: ${name}\ntype: script\nscript: ${scriptPath}\n`)
  }

  async function run(content: string): Promise<RunEvent[]> {
    const pipeline = parsePipeline(content)
    const artifactManager = new ArtifactManager(sessionsDir, pipeline.nodes.size)
    await artifactManager.init(pipeline.name)
    const reportManager = new ReportManager()
    const agentLoader = new AgentLoader(agentsDir)
    const agentRunner = new AgentRunner(artifactManager, reportManager)
    const executor = new PipelineExecutor(agentLoader, artifactManager, reportManager, agentRunner)
    const events: RunEvent[] = []
    for await (const e of executor.execute(pipeline)) events.push(e)
    return events
  }

  it('emits start and complete events for a linear pipeline', async () => {
    await makeAgent('fetch', await makeScript('fetch'))
    await makeAgent('process', await makeScript('process'))

    const events = await run(`---\nname: linear\n---\n\`\`\`mermaid\nflowchart LR\n    fetch --> process\n\`\`\``)
    const types = events.map(e => `${e.type}:${(e as { agent?: string }).agent ?? ''}`)
    expect(types).toContain('agent:start:fetch')
    expect(types).toContain('agent:complete:fetch')
    expect(types).toContain('agent:start:process')
    expect(types).toContain('agent:complete:process')
  })

  it('executes parallel nodes and emits complete events for all', async () => {
    await makeAgent('start', await makeScript('start'))
    await makeAgent('worker_a', await makeScript('worker_a'))
    await makeAgent('worker_b', await makeScript('worker_b'))

    const events = await run(`---\nname: parallel\n---\n\`\`\`mermaid\nflowchart LR\n    start --> worker_a\n    start --> worker_b\n\`\`\``)
    const completes = events.filter(e => e.type === 'agent:complete')
    expect(completes).toHaveLength(3)
  })

  it('follows the Passed conditional edge and skips the Failed edge', async () => {
    await makeAgent('run', await makeScript('run', 'Passed'))
    await makeAgent('publish', await makeScript('publish'))
    await makeAgent('error_handler', await makeScript('error_handler'))

    const events = await run(`---\nname: cond\n---\n\`\`\`mermaid\nflowchart LR\n    run -->|Passed| publish\n    run -->|Failed| error_handler\n\`\`\``)
    const agents = events.map(e => (e as { agent?: string }).agent).filter(Boolean)
    expect(agents).toContain('publish')
    expect(agents).not.toContain('error_handler')
  })

  it('follows the Failed conditional edge when agent status is Failed', async () => {
    await makeAgent('run', await makeScript('run', 'Failed'))
    await makeAgent('publish', await makeScript('publish'))
    await makeAgent('error_handler', await makeScript('error_handler'))

    const events = await run(`---\nname: cond\n---\n\`\`\`mermaid\nflowchart LR\n    run -->|Passed| publish\n    run -->|Failed| error_handler\n\`\`\``)
    const agents = events.map(e => (e as { agent?: string }).agent).filter(Boolean)
    expect(agents).toContain('error_handler')
    expect(agents).not.toContain('publish')
  })

  it('emits agent:error and stops when script fails without error handler', async () => {
    const failScript = join(scriptsDir, 'boom.sh')
    await writeFile(failScript, '#!/bin/sh\nexit 1')
    await chmod(failScript, 0o755)
    await makeAgent('boom', failScript)
    await makeAgent('next', await makeScript('next'))

    const events = await run(`---\nname: fail\n---\n\`\`\`mermaid\nflowchart LR\n    boom --> next\n\`\`\``)
    expect(events.some(e => e.type === 'agent:error' && (e as { agent: string }).agent === 'boom')).toBe(true)
    expect(events.some(e => (e as { agent?: string }).agent === 'next')).toBe(false)
  })

  it('enriches manifest with report block after agent completes', async () => {
    await makeAgent('fetch', await makeScript('fetch'))
    const events = await run(`---\nname: single\n---\n\`\`\`mermaid\nflowchart LR\n    fetch --> done\n\`\`\``)

    await makeAgent('done', await makeScript('done'))
    const completeEvent = events.find(
      e => e.type === 'agent:complete' && (e as { agent: string }).agent === 'fetch',
    ) as Extract<RunEvent, { type: 'agent:complete' }> | undefined
    expect(completeEvent?.report).toBeDefined()
    expect(completeEvent?.report.agent).toBe('fetch')
  })
})
```

- [ ] **Step 2: Write `packages/core/src/pipeline-executor.ts`**

```typescript
import { readdir } from 'node:fs/promises'
import type { RunEvent, AgentManifest } from '@vessy/sdk'
import type { ParsedPipeline } from './pipeline-parser.js'
import type { ArtifactManager } from './artifact-manager.js'
import type { ReportManager } from './report-manager.js'
import type { AgentLoader } from './agent-loader.js'
import type { AgentRunner } from './agent-runner.js'

export class PipelineExecutor {
  constructor(
    private readonly agentLoader: AgentLoader,
    private readonly artifactManager: ArtifactManager,
    private readonly reportManager: ReportManager,
    private readonly agentRunner: AgentRunner,
  ) {}

  async *execute(pipeline: ParsedPipeline): AsyncGenerator<RunEvent> {
    const completed = new Map<string, string>()
    const skipped = new Set<string>()
    const remaining = new Set(pipeline.nodes.keys())

    const isReady = (id: string): boolean => {
      const node = pipeline.nodes.get(id)!
      return node.predecessors.every(p => completed.has(p) || skipped.has(p))
    }

    while (remaining.size > 0) {
      const ready = [...remaining].filter(id => isReady(id) && !skipped.has(id)).sort()
      if (ready.length === 0) break

      const folderMap = new Map<string, string>()
      for (const agentName of ready) {
        const folder = await this.artifactManager.createAgentFolder(agentName)
        folderMap.set(agentName, folder)

        const node = pipeline.nodes.get(agentName)!
        const invokedBy = node.predecessors.find(p => completed.has(p)) ?? null
        this.reportManager.startAgent(agentName, invokedBy)
        for (const edge of node.edges) this.reportManager.recordInvocation(agentName, edge.to)

        yield { type: 'agent:start', agent: agentName, folder, session: this.artifactManager.id }
      }

      const results = await Promise.allSettled(
        ready.map(agentName => {
          const folder = folderMap.get(agentName)!
          const node = pipeline.nodes.get(agentName)!
          const predecessorFolders: Record<string, string> = {}
          for (const pred of node.predecessors) {
            const pf = completed.get(pred)
            if (pf) predecessorFolders[pred] = pf
          }
          return this.agentLoader.load(agentName).then(agent =>
            this.agentRunner.run(agent, folder, predecessorFolders),
          )
        }),
      )

      for (let i = 0; i < ready.length; i++) {
        const agentName = ready[i]
        const folder = folderMap.get(agentName)!
        const result = results[i]
        remaining.delete(agentName)

        if (result.status === 'fulfilled') {
          const { status, artifacts } = result.value
          const report = this.reportManager.completeAgent(agentName, status)

          let existingManifest: AgentManifest | undefined
          try {
            existingManifest = await this.artifactManager.readManifest(folder)
          } catch {
            // script-type agents that passed but had no manifest are already caught by AgentRunner
          }

          await this.artifactManager.writeManifest(folder, {
            status,
            outputs: existingManifest?.outputs ?? artifacts,
            report,
          })
          await this.artifactManager.updateAgentStatus(agentName, folder, status)

          completed.set(agentName, folder)

          const node = pipeline.nodes.get(agentName)!
          const hasConditionalEdges = node.edges.some(e => e.label !== undefined)
          if (hasConditionalEdges) {
            for (const edge of node.edges) {
              if (edge.label && edge.label !== status) skipped.add(edge.to)
            }
          }

          yield { type: 'agent:complete', agent: agentName, status, artifacts, report }
        } else {
          const error = String(result.reason)
          this.reportManager.completeAgent(agentName, 'Failed')
          await this.artifactManager.updateAgentStatus(agentName, folder, 'Failed')

          yield { type: 'agent:error', agent: agentName, error }

          const node = pipeline.nodes.get(agentName)!
          const hasFailedHandler = node.edges.some(e => e.label === 'Failed')
          if (!hasFailedHandler) {
            for (const id of remaining) skipped.add(id)
          }
        }
      }
    }
  }
}
```

- [ ] **Step 3: Run PipelineExecutor tests to verify they pass**

```bash
pnpm --filter @vessy/core test 2>&1 | grep -E "pass|fail|error" -i | tail -10
```

Expected: All PipelineExecutor tests PASS (or note any failures to fix before proceeding).

- [ ] **Step 4: Write the integration test**

Create `packages/core/src/__tests__/integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, rm, chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runPipeline } from '../index.js'
import type { RunEvent } from '@vessy/sdk'

describe('runPipeline integration', () => {
  let root: string

  beforeEach(async () => {
    root = join(tmpdir(), `vessy-int-${Date.now()}`)
    await Promise.all([
      mkdir(join(root, '.vessy', 'agents'), { recursive: true }),
      mkdir(join(root, '.vessy', 'pipelines'), { recursive: true }),
      mkdir(join(root, '.vessy', 'sessions'), { recursive: true }),
      mkdir(join(root, 'scripts'), { recursive: true }),
    ])
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  async function makeScript(name: string, extraCmds = ''): Promise<string> {
    const p = join(root, 'scripts', `${name}.sh`)
    await writeFile(
      p,
      `#!/bin/sh\n${extraCmds}\necho '{"status":"Passed","outputs":[]}' > manifest.json\n`,
    )
    await chmod(p, 0o755)
    return p
  }

  it('runs a two-step pipeline and yields pipeline:done with report', async () => {
    const fetchScript = await makeScript('fetch', 'echo "raw data" > data.txt')
    const processScript = await makeScript('process', 'echo "processed" > result.txt')

    await writeFile(
      join(root, '.vessy', 'agents', 'fetch.yaml'),
      `name: fetch\ntype: script\nscript: ${fetchScript}\n`,
    )
    await writeFile(
      join(root, '.vessy', 'agents', 'process.yaml'),
      `name: process\ntype: script\nscript: ${processScript}\n`,
    )
    await writeFile(
      join(root, '.vessy', 'pipelines', 'etl.md'),
      `---\nname: etl\ndescription: Extract and process\n---\n\`\`\`mermaid\nflowchart LR\n    fetch --> process\n\`\`\`\n`,
    )

    const events: RunEvent[] = []
    for await (const e of runPipeline('etl', {
      agentsDir: join(root, '.vessy', 'agents'),
      pipelinesDir: join(root, '.vessy', 'pipelines'),
      sessionsDir: join(root, '.vessy', 'sessions'),
    })) {
      events.push(e)
    }

    const done = events.find(e => e.type === 'pipeline:done') as
      | Extract<RunEvent, { type: 'pipeline:done' }>
      | undefined
    expect(done).toBeDefined()
    expect(done!.report.status).toBe('Passed')
    expect(done!.report.agentSummary).toHaveLength(2)
    expect(done!.report.agentSummary.every(s => s.status === 'Passed')).toBe(true)
    expect(done!.sessionDir).toContain('session-')
  })

  it('writes pipeline-run.json with final report to session dir', async () => {
    const script = await makeScript('solo')
    await writeFile(
      join(root, '.vessy', 'agents', 'solo.yaml'),
      `name: solo\ntype: script\nscript: ${script}\n`,
    )
    await writeFile(
      join(root, '.vessy', 'pipelines', 'solo.md'),
      `---\nname: solo-pipeline\n---\n\`\`\`mermaid\nflowchart LR\n    solo --> end_node\n\`\`\`\n`,
    )
    await writeFile(
      join(root, '.vessy', 'agents', 'end_node.yaml'),
      `name: end_node\ntype: script\nscript: ${script}\n`,
    )

    const events: RunEvent[] = []
    for await (const e of runPipeline('solo', {
      agentsDir: join(root, '.vessy', 'agents'),
      pipelinesDir: join(root, '.vessy', 'pipelines'),
      sessionsDir: join(root, '.vessy', 'sessions'),
    })) {
      events.push(e)
    }

    const done = events.find(e => e.type === 'pipeline:done') as Extract<RunEvent, { type: 'pipeline:done' }>
    const { readFile } = await import('node:fs/promises')
    const stateContent = await readFile(join(done.sessionDir, 'pipeline-run.json'), 'utf-8')
    const state = JSON.parse(stateContent)
    expect(state.status).toBe('Passed')
    expect(state.completedAt).toBeDefined()
    expect(state.report).toBeDefined()
  })
})
```

- [ ] **Step 5: Write `packages/core/src/index.ts`**

```typescript
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { RunEvent, RunOptions } from '@vessy/sdk'
import { AgentLoader } from './agent-loader.js'
import { parsePipeline } from './pipeline-parser.js'
import { ArtifactManager } from './artifact-manager.js'
import { ReportManager } from './report-manager.js'
import { AgentRunner } from './agent-runner.js'
import { PipelineExecutor } from './pipeline-executor.js'

export async function* runPipeline(
  name: string,
  opts: RunOptions = {},
): AsyncGenerator<RunEvent> {
  const cwd = process.cwd()
  const agentsDir = opts.agentsDir ?? join(cwd, '.vessy', 'agents')
  const pipelinesDir = opts.pipelinesDir ?? join(cwd, '.vessy', 'pipelines')
  const sessionsDir = opts.sessionsDir ?? join(cwd, '.vessy', 'sessions')

  const content = await readFile(join(pipelinesDir, `${name}.md`), 'utf-8')
  const pipeline = parsePipeline(content)

  const agentLoader = new AgentLoader(agentsDir)
  const artifactManager = new ArtifactManager(sessionsDir, pipeline.nodes.size)
  const reportManager = new ReportManager()
  const agentRunner = new AgentRunner(artifactManager, reportManager)
  const executor = new PipelineExecutor(agentLoader, artifactManager, reportManager, agentRunner)

  await artifactManager.init(pipeline.name)
  const startTime = Date.now()

  for await (const event of executor.execute(pipeline)) {
    yield event
  }

  const totalDurationMs = Date.now() - startTime
  const state = await artifactManager.readRunState()
  const hasFailed = Object.values(state.agents).some(a => a.status === 'Failed')
  const pipelineStatus = hasFailed ? 'Failed' : 'Passed'

  const pipelineReport = reportManager.buildPipelineReport(pipelineStatus, totalDurationMs)
  state.status = pipelineStatus
  state.completedAt = new Date().toISOString()
  state.report = pipelineReport
  await artifactManager.writeRunState(state)

  yield { type: 'pipeline:done', sessionDir: artifactManager.dir, report: pipelineReport }
}

export { AgentLoader } from './agent-loader.js'
export { parsePipeline } from './pipeline-parser.js'
export type { ParsedPipeline, DagNode, DagEdge } from './pipeline-parser.js'
export { ArtifactManager } from './artifact-manager.js'
export { ReportManager } from './report-manager.js'
export { AgentRunner } from './agent-runner.js'
export { PipelineExecutor } from './pipeline-executor.js'
```

- [ ] **Step 6: Run all tests**

```bash
pnpm --filter @vessy/core test
```

Expected: All tests PASS across all test files. Fix any failures before proceeding.

- [ ] **Step 7: Build both packages**

```bash
pnpm build
```

Expected: `packages/sdk/dist/` and `packages/core/dist/` both populated without TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/pipeline-executor.ts packages/core/src/index.ts \
  packages/core/src/__tests__/pipeline-executor.test.ts \
  packages/core/src/__tests__/integration.test.ts
git commit -m "feat: add PipelineExecutor, runPipeline entry point, and integration tests"
```

---

## Self-Review Checklist

After completing all tasks, run:

```bash
pnpm build && pnpm test
```

Expected output: all packages build cleanly, all tests pass.

Verify spec coverage:

| Spec requirement | Covered by |
|---|---|
| Monorepo `@vessy/core` + `@vessy/sdk` | Task 1, 2, 3 |
| Agent types: llm, script, composite (no-op) | Task 3 (`AgentLoader`), Task 7 (`AgentRunner`) |
| Custom statuses in agent YAML | Task 3 (validated and stored in `AgentDefinition`) |
| Base statuses: Passed/Failed/Skipped | `@vessy/sdk` `BASE_STATUSES` constant |
| Mermaid → DAG parser | Task 4 |
| Parallel execution (nodes at same level) | Task 8 `PipelineExecutor` |
| Conditional edge routing via status | Task 8 `PipelineExecutor` |
| Session folder `session-<uuid>` | Task 5 `ArtifactManager` |
| Agent subfolders `NNN-<name>` | Task 5 `ArtifactManager` |
| Env vars: `VESSY_SESSION_DIR`, `VESSY_OUTPUT_DIR`, `VESSY_INPUT_*` | Task 7 `AgentRunner` |
| manifest.json with report block | Task 8 `PipelineExecutor` (enrichment) |
| pipeline-run.json updated in real-time | Task 5, 8 |
| Token tracking per agent + pipeline aggregate | Task 6 `ReportManager`, Task 7 (Anthropic SDK) |
| `runPipeline` async generator entry point | Task 8 `index.ts` |
| `VessyAdapter` interface for adapters | Task 2 `@vessy/sdk` |
| `RunEvent` union with `AgentReport` / `PipelineReport` | Task 2 `@vessy/sdk` |
| Fail-fast without error handler | Task 8 `PipelineExecutor` |
| Timeout support | Task 7 `AgentRunner` |
| `composite` type (throws, deferred) | Task 7 `AgentRunner` |

---

## Out of Scope (this plan)

- Adapter implementations (Claude Code, Copilot, Opencode) — Spec 2+
- `/vessy:agents`, `/vessy:add-agent`, etc. slash commands
- API key management / provider price lookup for `costUsd`
- Tool-calling loop for `llm` type agents
- `composite` agent type execution
- OpenAI / Gemini providers (only Anthropic implemented)
