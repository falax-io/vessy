import { agentsCommand } from './commands/agents.js'
import { agentGetCommand } from './commands/agent-get.js'
import { pipelinesCommand } from './commands/pipelines.js'
import { diagramCommand } from './commands/diagram.js'
import { runCommand } from './commands/run.js'

const [, , command, ...args] = process.argv

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

async function main(): Promise<void> {
  switch (command) {
    case 'agents':
      return agentsCommand()
    case 'agent-get':
      if (!args[0]) fail('Usage: cli.js agent-get <agent-name>')
      return agentGetCommand(args[0])
    case 'pipelines':
      return pipelinesCommand()
    case 'diagram':
      if (!args[0]) fail('Usage: cli.js diagram <pipeline-name>')
      return diagramCommand(args[0])
    case 'run':
      if (!args[0]) fail('Usage: cli.js run <pipeline-name>')
      return runCommand(args[0])
    default:
      fail(
        `Unknown command: ${command ?? '(none)'}. Available: agents, agent-get, pipelines, diagram, run`
      )
  }
}

main().catch(err => {
  console.error(String(err))
  process.exit(1)
})
