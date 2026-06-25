import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function agentGetCommand(name: string): Promise<void> {
  const filePath = join(process.cwd(), '.vessy', 'agents', `${name}.yaml`)
  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    console.error(`Agent '${name}' not found.`)
    process.exit(1)
  }
  process.stdout.write(content)
}
