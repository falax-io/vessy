import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
}))

vi.mock('@vessy/core', () => ({
  parsePipeline: vi.fn(),
}))

describe('pipelinesCommand', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    logSpy.mockRestore()
  })

  it('prints name and description for each pipeline', async () => {
    const { readdir, readFile } = await import('node:fs/promises')
    const { parsePipeline } = await import('@vessy/core')

    vi.mocked(readdir).mockResolvedValue(['etl.md', 'analyze.md'] as unknown as Awaited<ReturnType<typeof readdir>>)
    vi.mocked(readFile).mockResolvedValue('dummy content')
    vi.mocked(parsePipeline)
      .mockReturnValueOnce({ name: 'etl', description: 'Extract and process data', mermaidSource: '', nodes: new Map(), startNodes: [] })
      .mockReturnValueOnce({ name: 'analyze', description: undefined, mermaidSource: '', nodes: new Map(), startNodes: [] })

    const { pipelinesCommand } = await import('../commands/pipelines.js')
    await pipelinesCommand()

    expect(logSpy).toHaveBeenCalledTimes(2)
    const calls = logSpy.mock.calls.map(c => c[0] as string)
    expect(calls[0]).toMatch(/^etl\s+Extract and process data$/)
    expect(calls[1]).toMatch(/^analyze\s*$/)
  })

  it('prints "No pipelines found." when directory is empty', async () => {
    const { readdir } = await import('node:fs/promises')
    vi.mocked(readdir).mockResolvedValue([] as unknown as Awaited<ReturnType<typeof readdir>>)

    const { pipelinesCommand } = await import('../commands/pipelines.js')
    await pipelinesCommand()

    expect(logSpy).toHaveBeenCalledWith('No pipelines found.')
  })

  it('prints "No pipelines found." when directory does not exist', async () => {
    const { readdir } = await import('node:fs/promises')
    vi.mocked(readdir).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

    const { pipelinesCommand } = await import('../commands/pipelines.js')
    await pipelinesCommand()

    expect(logSpy).toHaveBeenCalledWith('No pipelines found.')
  })
})
