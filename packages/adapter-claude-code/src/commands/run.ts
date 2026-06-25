import { runPipeline } from '@vessy/core'
import { formatEvent, formatDone } from '../format.js'

export async function runCommand(name: string): Promise<void> {
  for await (const event of runPipeline(name)) {
    if (event.type === 'pipeline:done') {
      console.log(formatDone(event.report, event.sessionDir))
    } else {
      const line = formatEvent(event)
      if (line) console.log(line)
    }
  }
}
