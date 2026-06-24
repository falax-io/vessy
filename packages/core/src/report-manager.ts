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
