import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, rm, chmod, readFile } from 'node:fs/promises'
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
      join(root, '.vessy', 'agents', 'end_node.yaml'),
      `name: end_node\ntype: script\nscript: ${script}\n`,
    )
    await writeFile(
      join(root, '.vessy', 'pipelines', 'solo.md'),
      `---\nname: solo-pipeline\n---\n\`\`\`mermaid\nflowchart LR\n    solo --> end_node\n\`\`\`\n`,
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
    const stateContent = await readFile(join(done.sessionDir, 'pipeline-run.json'), 'utf-8')
    const state = JSON.parse(stateContent)
    expect(state.status).toBe('Passed')
    expect(state.completedAt).toBeDefined()
    expect(state.report).toBeDefined()
  })
})
