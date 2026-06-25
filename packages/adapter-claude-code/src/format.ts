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
        let line = `✓  ${padded}Passed     ${duration}`
        if (event.report.tokens && event.report.tokens.total > 0) {
          line += `  ${event.report.tokens.total} tok  $${event.report.tokens.costUsd.toFixed(3)}`
        }
        return line
      } else {
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

const LABEL_WIDTH = 16

export function formatDone(report: PipelineReport, sessionDir: string): string {
  const duration = formatDuration(report.totalDurationMs)
  let pipelineLine = `${'Pipeline'.padEnd(LABEL_WIDTH)}${report.status}   ${duration}`
  if (report.tokens.costUsd > 0) {
    pipelineLine += `  $${report.tokens.costUsd.toFixed(3)}`
  }
  const sessionLine = `${'Session'.padEnd(LABEL_WIDTH)}${sessionDir}`
  return ['─'.repeat(80), pipelineLine, sessionLine].join('\n')
}
