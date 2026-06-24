import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { AgentLoader } from '../agent-loader.js'

describe('AgentLoader', () => {
  let agentsDir: string

  beforeEach(async () => {
    agentsDir = join(tmpdir(), `vessy-test-${Date.now()}`)
    await mkdir(agentsDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(agentsDir, { recursive: true, force: true })
  })

  it('loads a valid llm agent', async () => {
    await writeFile(
      join(agentsDir, 'researcher.yaml'),
      'name: researcher\ntype: llm\nmodel: claude-opus-4-7\nsystemPrompt: You are a researcher.\n',
    )
    const loader = new AgentLoader(agentsDir)
    const agent = await loader.load('researcher')
    expect(agent.name).toBe('researcher')
    expect(agent.type).toBe('llm')
    expect(agent.model).toBe('claude-opus-4-7')
  })

  it('loads a valid script agent with timeout and custom statuses', async () => {
    await writeFile(
      join(agentsDir, 'runner.yaml'),
      'name: runner\ntype: script\nscript: ./run.sh\nargs: ["--verbose"]\ntimeout: 60\nstatuses:\n  - Passed\n  - Failed\n  - partial\n',
    )
    const loader = new AgentLoader(agentsDir)
    const agent = await loader.load('runner')
    expect(agent.script).toBe('./run.sh')
    expect(agent.timeout).toBe(60)
    expect(agent.statuses).toContain('partial')
  })

  it('throws when agent file does not exist', async () => {
    const loader = new AgentLoader(agentsDir)
    await expect(loader.load('nonexistent')).rejects.toThrow("Agent 'nonexistent' not found")
  })

  it('throws when llm agent is missing model', async () => {
    await writeFile(join(agentsDir, 'broken.yaml'), 'name: broken\ntype: llm\n')
    const loader = new AgentLoader(agentsDir)
    await expect(loader.load('broken')).rejects.toThrow("llm type requires 'model'")
  })

  it('throws when script agent is missing script field', async () => {
    await writeFile(join(agentsDir, 'broken.yaml'), 'name: broken\ntype: script\n')
    const loader = new AgentLoader(agentsDir)
    await expect(loader.load('broken')).rejects.toThrow("script type requires 'script'")
  })

  it('throws when type is invalid', async () => {
    await writeFile(join(agentsDir, 'broken.yaml'), 'name: broken\ntype: invalid\n')
    const loader = new AgentLoader(agentsDir)
    await expect(loader.load('broken')).rejects.toThrow("invalid type 'invalid'")
  })

  it('lists all agents in directory', async () => {
    await writeFile(join(agentsDir, 'a.yaml'), 'name: a\ntype: script\nscript: ./a.sh\n')
    await writeFile(join(agentsDir, 'b.yaml'), 'name: b\ntype: llm\nmodel: claude-opus-4-7\nsystemPrompt: hi\n')
    const loader = new AgentLoader(agentsDir)
    const agents = await loader.list()
    expect(agents).toHaveLength(2)
    expect(agents.map(a => a.name).sort()).toEqual(['a', 'b'])
  })

  it('returns empty list when directory is empty', async () => {
    const loader = new AgentLoader(agentsDir)
    expect(await loader.list()).toEqual([])
  })
})
