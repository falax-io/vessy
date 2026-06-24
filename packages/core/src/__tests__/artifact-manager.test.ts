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
