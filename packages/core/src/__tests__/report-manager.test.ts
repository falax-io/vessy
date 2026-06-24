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
