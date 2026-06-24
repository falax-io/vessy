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
