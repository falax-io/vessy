import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { AgentManifest, PipelineRunState } from '@vessy/sdk'

const MANIFEST_FILE = 'manifest.json'
const RUN_STATE_FILE = 'pipeline-run.json'

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
    await this.writeJson(join(folderPath, MANIFEST_FILE), manifest)
  }

  async readManifest(folderPath: string): Promise<AgentManifest> {
    return this.readJson<AgentManifest>(join(folderPath, MANIFEST_FILE))
  }

  async readRunState(): Promise<PipelineRunState> {
    return this.readJson<PipelineRunState>(join(this.sessionDir, RUN_STATE_FILE))
  }

  async writeRunState(state: PipelineRunState): Promise<void> {
    await this.writeJson(join(this.sessionDir, RUN_STATE_FILE), state)
  }

  async updateAgentStatus(agentName: string, folderPath: string, status: string): Promise<void> {
    const state = await this.readRunState()
    state.agents[agentName] = { folder: basename(folderPath), status }
    await this.writeRunState(state)
  }

  private async readJson<T>(filePath: string): Promise<T> {
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  }

  private async writeJson(filePath: string, value: unknown): Promise<void> {
    await writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8')
  }
}
