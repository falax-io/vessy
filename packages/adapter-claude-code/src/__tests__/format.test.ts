import { describe, it, expect } from 'vitest'
import type { RunEvent, PipelineReport, AgentReport } from '@vessy/sdk'
import { formatEvent, formatDone } from '../format.js'

const baseReport: AgentReport = {
  agent: 'fetch',
  durationMs: 4200,
  invokedBy: null,
  invoked: [],
  tokens: null,
}

describe('formatEvent', () => {
  it('formats agent:start', () => {
    const event: RunEvent = {
      type: 'agent:start',
      agent: 'fetch',
      folder: '1-fetch',
      session: 'session-abc123',
    }
    expect(formatEvent(event)).toBe('▶  fetch          session-abc123 / 1-fetch')
  })

  it('formats agent:complete Passed without tokens', () => {
    const event: RunEvent = {
      type: 'agent:complete',
      agent: 'fetch',
      status: 'Passed',
      artifacts: [],
      report: { ...baseReport, agent: 'fetch', durationMs: 4200 },
    }
    expect(formatEvent(event)).toBe('✓  fetch          Passed     4.2s')
  })

  it('formats agent:complete Passed with tokens', () => {
    const event: RunEvent = {
      type: 'agent:complete',
      agent: 'researcher',
      status: 'Passed',
      artifacts: [],
      report: {
        agent: 'researcher',
        durationMs: 8100,
        invokedBy: null,
        invoked: [],
        tokens: { input: 1000, output: 540, total: 1540, costUsd: 0.012 },
      },
    }
    expect(formatEvent(event)).toBe('✓  researcher     Passed     8.1s  1540 tok  $0.012')
  })

  it('formats agent:complete with non-Passed status', () => {
    const event: RunEvent = {
      type: 'agent:complete',
      agent: 'writer',
      status: 'NeedsRevision',
      artifacts: [],
      report: { ...baseReport, agent: 'writer', durationMs: 3200 },
    }
    expect(formatEvent(event)).toBe('✗  writer         NeedsRevision 3.2s')
  })

  it('formats agent:error', () => {
    const event: RunEvent = {
      type: 'agent:error',
      agent: 'writer',
      error: 'Error: Script exited with code 1',
    }
    expect(formatEvent(event)).toBe('✗  writer         Error: Script exited with code 1')
  })

  it('returns empty string for pipeline:done', () => {
    const report: PipelineReport = {
      totalDurationMs: 32000,
      status: 'Passed',
      tokens: { input: 0, output: 0, total: 0, costUsd: 0 },
      agentSummary: [],
    }
    const event: RunEvent = {
      type: 'pipeline:done',
      sessionDir: '.vessy/sessions/abc',
      report,
    }
    expect(formatEvent(event)).toBe('')
  })
})

describe('formatDone', () => {
  it('formats pipeline summary without cost', () => {
    const report: PipelineReport = {
      totalDurationMs: 32000,
      status: 'Failed',
      tokens: { input: 0, output: 0, total: 0, costUsd: 0 },
      agentSummary: [],
    }
    const result = formatDone(report, '.vessy/sessions/session-a3f7bc92')
    const lines = result.split('\n')
    expect(lines[0]).toMatch(/^─+$/)
    expect(lines[1]).toContain('Pipeline')
    expect(lines[1]).toContain('Failed')
    expect(lines[1]).toContain('32.0s')
    expect(lines[1]).not.toContain('$')
    expect(lines[2]).toBe('Session         .vessy/sessions/session-a3f7bc92')
  })

  it('includes cost when non-zero', () => {
    const report: PipelineReport = {
      totalDurationMs: 32000,
      status: 'Passed',
      tokens: { input: 0, output: 0, total: 0, costUsd: 0.03 },
      agentSummary: [],
    }
    const result = formatDone(report, '.vessy/sessions/abc')
    expect(result).toContain('$0.030')
  })
})
