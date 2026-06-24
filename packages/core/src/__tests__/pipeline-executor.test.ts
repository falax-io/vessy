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

  it('propagates skip transitively to nodes downstream of a skipped conditional branch', async () => {
    await makeAgent('run', await makeScript('run', 'Failed'))
    await makeAgent('middle', await makeScript('middle'))
    await makeAgent('final', await makeScript('final'))

    // run -->|Passed| middle --> final
    // run returns Failed, so middle is skipped; final must also be skipped
    const events = await run(
      `---\nname: propagate\n---\n\`\`\`mermaid\nflowchart LR\n    run -->|Passed| middle\n    middle --> final\n\`\`\``,
    )
    const agents = events.map(e => (e as { agent?: string }).agent).filter(Boolean)
    expect(agents).not.toContain('middle')
    expect(agents).not.toContain('final')
  })

  it('enriches manifest with report block after agent completes', async () => {
    await makeAgent('fetch', await makeScript('fetch'))
    await makeAgent('done', await makeScript('done'))
    const events = await run(`---\nname: single\n---\n\`\`\`mermaid\nflowchart LR\n    fetch --> done\n\`\`\``)

    const completeEvent = events.find(
      e => e.type === 'agent:complete' && (e as { agent: string }).agent === 'fetch',
    ) as Extract<RunEvent, { type: 'agent:complete' }> | undefined
    expect(completeEvent?.report).toBeDefined()
    expect(completeEvent?.report.agent).toBe('fetch')
  })
})
