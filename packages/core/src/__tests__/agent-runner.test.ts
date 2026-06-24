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
