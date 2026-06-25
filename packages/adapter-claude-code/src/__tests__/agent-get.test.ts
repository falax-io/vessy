import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

describe('agentGetCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(
      (() => { throw new Error('process.exit') }) as never
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
    stdoutSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    exitSpy.mockRestore()
  })

  it('writes raw YAML content to stdout', async () => {
    const { readFile } = await import('node:fs/promises')
    vi.mocked(readFile).mockResolvedValue('name: researcher\ntype: llm\n')

    const { agentGetCommand } = await import('../commands/agent-get.js')
    await agentGetCommand('researcher')

    expect(stdoutSpy).toHaveBeenCalledWith('name: researcher\ntype: llm\n')
    expect(exitSpy).not.toHaveBeenCalled()
  })

  it('prints error to stderr and exits with code 1 when agent not found', async () => {
    const { readFile } = await import('node:fs/promises')
    vi.mocked(readFile).mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    )

    const { agentGetCommand } = await import('../commands/agent-get.js')
    await expect(agentGetCommand('missing')).rejects.toThrow('process.exit')

    expect(consoleErrorSpy).toHaveBeenCalledWith("Agent 'missing' not found.")
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('prints descriptive error to stderr and exits with code 1 for non-ENOENT errors', async () => {
    const { readFile } = await import('node:fs/promises')
    const permErr = Object.assign(new Error('permission denied'), { code: 'EACCES' })
    vi.mocked(readFile).mockRejectedValue(permErr)

    const { agentGetCommand } = await import('../commands/agent-get.js')
    await expect(agentGetCommand('myagent')).rejects.toThrow('process.exit')

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Error reading agent 'myagent': Error: permission denied`
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
