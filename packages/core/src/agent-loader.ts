import { readFile, readdir } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'
import { parse } from 'yaml'
import type { AgentDefinition } from '@vessy/sdk'

export class AgentLoader {
  constructor(private readonly agentsDir: string) {}

  async load(name: string): Promise<AgentDefinition> {
    const filePath = join(this.agentsDir, `${name}.yaml`)
    let content: string
    try {
      content = await readFile(filePath, 'utf-8')
    } catch {
      throw new Error(`Agent '${name}' not found at ${filePath}`)
    }
    const raw = parse(content) as AgentDefinition
    this.validate(raw, filePath)
    return raw
  }

  async list(): Promise<AgentDefinition[]> {
    let files: string[]
    try {
      files = await readdir(this.agentsDir)
    } catch {
      return []
    }
    const yamlFiles = files.filter(f => extname(f) === '.yaml')
    return Promise.all(yamlFiles.map(f => this.load(basename(f, '.yaml'))))
  }

  private validate(agent: AgentDefinition, filePath: string): void {
    if (!agent.name) throw new Error(`Agent at ${filePath} is missing 'name'`)
    if (!['llm', 'script', 'composite'].includes(agent.type))
      throw new Error(`Agent '${agent.name}': invalid type '${agent.type}'`)
    if (agent.type === 'llm' && !agent.model)
      throw new Error(`Agent '${agent.name}': llm type requires 'model'`)
    if (agent.type === 'script' && !agent.script)
      throw new Error(`Agent '${agent.name}': script type requires 'script'`)
    if (agent.type === 'composite' && (!agent.steps || agent.steps.length === 0))
      throw new Error(`Agent '${agent.name}': composite type requires non-empty 'steps'`)
  }
}
