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
