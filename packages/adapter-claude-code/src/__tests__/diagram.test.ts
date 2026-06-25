import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

vi.mock('@vessy/core', () => ({
  parsePipeline: vi.fn(),
}))

describe('diagramCommand', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    logSpy.mockRestore()
  })

  it('prints mermaid source wrapped in a fenced code block', async () => {
    const { readFile } = await import('node:fs/promises')
    const { parsePipeline } = await import('@vessy/core')

    vi.mocked(readFile).mockResolvedValue('dummy content')
    vi.mocked(parsePipeline).mockReturnValue({
      name: 'etl',
      description: undefined,
      mermaidSource: 'flowchart LR\n    fetch --> process',
      nodes: new Map(),
      startNodes: [],
    })

    const { diagramCommand } = await import('../commands/diagram.js')
    await diagramCommand('etl')

    const calls = logSpy.mock.calls.map(c => c[0] as string)
    expect(calls[0]).toBe('```mermaid')
    expect(calls[1]).toBe('flowchart LR\n    fetch --> process')
    expect(calls[2]).toBe('```')
  })
})
