import { parsePipeline } from '@vessy/core'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function diagramCommand(name: string): Promise<void> {
  const pipelinesDir = join(process.cwd(), '.vessy', 'pipelines')
  const content = await readFile(join(pipelinesDir, `${name}.md`), 'utf-8')
  const pipeline = parsePipeline(content)
  console.log('```mermaid')
  console.log(pipeline.mermaidSource)
  console.log('```')
}
