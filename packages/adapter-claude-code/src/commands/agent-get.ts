import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function agentGetCommand(name: string): Promise<void> {
  const filePath = join(process.cwd(), '.vessy', 'agents', `${name}.yaml`)
  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch (err) {
    const isNotFound = (err as NodeJS.ErrnoException).code === 'ENOENT'
    console.error(
      isNotFound ? `Agent '${name}' not found.` : `Error reading agent '${name}': ${String(err)}`
    )
    process.exit(1)
  }
  process.stdout.write(content)
}
