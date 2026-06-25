import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AgentDefinition } from '@vessy/sdk'

vi.mock('@vessy/core', () => ({
  AgentLoader: vi.fn().mockImplementation(() => ({
    list: vi.fn().mockResolvedValue([
      { name: 'researcher', type: 'llm', model: 'claude-opus-4-7' } as AgentDefinition,
      { name: 'analyst', type: 'llm', model: 'claude-haiku-4-5' } as AgentDefinition,
      { name: 'runner', type: 'script' } as AgentDefinition,
    ]),
  })),
}))

describe('agentsCommand', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    vi.resetModules()
  })

  it('prints one line per agent with name, type, and model', async () => {
    const { agentsCommand } = await import('../commands/agents.js')
    await agentsCommand()
    expect(logSpy).toHaveBeenCalledTimes(3)
    const calls = logSpy.mock.calls.map(c => c[0] as string)
    expect(calls[0]).toMatch(/^researcher\s+llm\s+claude-opus-4-7$/)
    expect(calls[1]).toMatch(/^analyst\s+llm\s+claude-haiku-4-5$/)
    expect(calls[2]).toMatch(/^runner\s+script\s*$/)
  })

  it('prints "No agents found." when list is empty', async () => {
    vi.mocked(
      (await import('@vessy/core')).AgentLoader as unknown as ReturnType<typeof vi.fn>
    ).mockImplementationOnce(() => ({ list: vi.fn().mockResolvedValue([]) }))

    const { agentsCommand } = await import('../commands/agents.js')
    await agentsCommand()
    expect(logSpy).toHaveBeenCalledWith('No agents found.')
  })
})
