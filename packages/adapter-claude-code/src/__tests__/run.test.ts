import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { RunEvent, PipelineReport } from '@vessy/sdk'

vi.mock('@vessy/core', () => ({
  runPipeline: vi.fn(),
}))

vi.mock('../format.js', () => ({
  formatEvent: vi.fn((e: RunEvent) => `EVENT:${e.type}`),
  formatDone: vi.fn((_r: PipelineReport, dir: string) => `DONE:${dir}`),
}))

async function* makeGenerator(events: RunEvent[]) {
  for (const e of events) yield e
}

describe('runCommand', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    logSpy.mockRestore()
  })

  it('prints formatted events and final summary', async () => {
    const { runPipeline } = await import('@vessy/core')
    const report: PipelineReport = {
      totalDurationMs: 1000,
      status: 'Passed',
      tokens: { input: 0, output: 0, total: 0, costUsd: 0 },
      agentSummary: [],
    }
    const events: RunEvent[] = [
      { type: 'agent:start', agent: 'fetch', folder: '1-fetch', session: 'sess-abc' },
      {
        type: 'agent:complete',
        agent: 'fetch',
        status: 'Passed',
        artifacts: [],
        report: { agent: 'fetch', durationMs: 1000, invokedBy: null, invoked: [], tokens: null },
      },
      { type: 'pipeline:done', sessionDir: '.vessy/sessions/sess-abc', report },
    ]
    vi.mocked(runPipeline).mockReturnValue(makeGenerator(events))

    const { runCommand } = await import('../commands/run.js')
    await runCommand('etl')

    expect(logSpy).toHaveBeenCalledWith('EVENT:agent:start')
    expect(logSpy).toHaveBeenCalledWith('EVENT:agent:complete')
    expect(logSpy).toHaveBeenCalledWith('DONE:.vessy/sessions/sess-abc')
  })

  it('skips printing empty strings from formatEvent', async () => {
    const { runPipeline } = await import('@vessy/core')
    const { formatEvent } = await import('../format.js')
    const report: PipelineReport = {
      totalDurationMs: 1000,
      status: 'Passed',
      tokens: { input: 0, output: 0, total: 0, costUsd: 0 },
      agentSummary: [],
    }
    vi.mocked(formatEvent).mockReturnValue('')
    const events: RunEvent[] = [
      { type: 'pipeline:done', sessionDir: '.vessy/sessions/sess-abc', report },
    ]
    vi.mocked(runPipeline).mockReturnValue(makeGenerator(events))

    const { runCommand } = await import('../commands/run.js')
    await runCommand('etl')

    // formatDone is called for pipeline:done; formatEvent returning '' is not printed
    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith('DONE:.vessy/sessions/sess-abc')
  })
})
