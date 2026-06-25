import { AgentLoader } from '@vessy/core'
import { join } from 'node:path'

const NAME_WIDTH = 14
const TYPE_WIDTH = 8

export async function agentsCommand(): Promise<void> {
  const agentsDir = join(process.cwd(), '.vessy', 'agents')
  const loader = new AgentLoader(agentsDir)
  const agents = await loader.list()

  if (agents.length === 0) {
    console.log('No agents found.')
    return
  }

  for (const agent of agents) {
    const parts: string[] = [agent.name.padEnd(NAME_WIDTH), agent.type.padEnd(TYPE_WIDTH)]
    if (agent.model) parts.push(agent.model)
    console.log(parts.join('').trimEnd())
  }
}
