import type { RunEvent, PipelineReport } from '@vessy/sdk'

const NAME_WIDTH = 15

function padName(name: string): string {
  return name.padEnd(NAME_WIDTH)
}

function formatDuration(ms: number): string {
  return (ms / 1000).toFixed(1) + 's'
}

export function formatEvent(event: RunEvent): string {
  switch (event.type) {
    case 'agent:start': {
      const padded = padName(event.agent)
      return `▶  ${padded}${event.session} / ${event.folder}`
    }

    case 'agent:complete': {
      const padded = padName(event.agent)
      const duration = formatDuration(event.report.durationMs)

      if (event.status === 'Passed') {
        let line = `✓  ${padded}${event.status}`
        line = line.padEnd(line.length + 5) // Pad status to align duration
        line += duration

        if (event.report.tokens && event.report.tokens.total > 0) {
          line += `  ${event.report.tokens.total} tok`
          line += `  $${event.report.tokens.costUsd.toFixed(3)}`
        }
        return line
      } else {
        // Non-Passed status
        return `✗  ${padded}${event.status} ${duration}`
      }
    }

    case 'agent:error': {
      const padded = padName(event.agent)
      return `✗  ${padded}${event.error}`
    }

    case 'pipeline:done': {
      return ''
    }
  }
}

export function formatDone(report: PipelineReport, sessionDir: string): string {
  const lines: string[] = []

  // Separator line
  lines.push('─'.repeat(80))

  // Pipeline summary line
  let pipelineLine = 'Pipeline'
  pipelineLine = pipelineLine.padEnd(16) // "Pipeline" (8 chars) + 8 spaces
  pipelineLine += report.status
  pipelineLine = pipelineLine.padEnd(pipelineLine.length + 3) // 3 spaces after status
  pipelineLine += formatDuration(report.totalDurationMs)

  if (report.tokens.costUsd > 0) {
    pipelineLine += `  $${report.tokens.costUsd.toFixed(3)}`
  }

  lines.push(pipelineLine)

  // Session line
  let sessionLine = 'Session'
  sessionLine = sessionLine.padEnd(16) // "Session" (7 chars) + 9 spaces
  sessionLine += sessionDir

  lines.push(sessionLine)

  return lines.join('\n')
}
