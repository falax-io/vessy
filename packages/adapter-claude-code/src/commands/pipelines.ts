import { parsePipeline } from '@vessy/core'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const NAME_WIDTH = 20

export async function pipelinesCommand(): Promise<void> {
  const pipelinesDir = join(process.cwd(), '.vessy', 'pipelines')

  let files: string[]
  try {
    files = await readdir(pipelinesDir)
  } catch {
    console.log('No pipelines found.')
    return
  }

  const mdFiles = files.filter(f => f.endsWith('.md')).sort()
  if (mdFiles.length === 0) {
    console.log('No pipelines found.')
    return
  }

  for (const file of mdFiles) {
    const content = await readFile(join(pipelinesDir, file), 'utf-8')
    const pipeline = parsePipeline(content as string)
    const line = pipeline.description
      ? `${pipeline.name.padEnd(NAME_WIDTH)}${pipeline.description}`
      : pipeline.name
    console.log(line)
  }
}
