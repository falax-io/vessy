import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { RunEvent, RunOptions } from '@vessy/sdk'
import { AgentLoader } from './agent-loader.js'
import { parsePipeline } from './pipeline-parser.js'
import { ArtifactManager } from './artifact-manager.js'
import { ReportManager } from './report-manager.js'
import { AgentRunner } from './agent-runner.js'
import { PipelineExecutor } from './pipeline-executor.js'

export async function* runPipeline(
  name: string,
  opts: RunOptions = {},
): AsyncGenerator<RunEvent> {
  const cwd = process.cwd()
  const agentsDir = opts.agentsDir ?? join(cwd, '.vessy', 'agents')
  const pipelinesDir = opts.pipelinesDir ?? join(cwd, '.vessy', 'pipelines')
  const sessionsDir = opts.sessionsDir ?? join(cwd, '.vessy', 'sessions')

  const content = await readFile(join(pipelinesDir, `${name}.md`), 'utf-8')
  const pipeline = parsePipeline(content)

  const agentLoader = new AgentLoader(agentsDir)
  const artifactManager = new ArtifactManager(sessionsDir, pipeline.nodes.size)
  const reportManager = new ReportManager()
  const agentRunner = new AgentRunner(artifactManager, reportManager, cwd)
  const executor = new PipelineExecutor(agentLoader, artifactManager, reportManager, agentRunner)

  // Validate all agents exist before starting execution
  await Promise.all([...pipeline.nodes.keys()].map(n => agentLoader.load(n)))

  await artifactManager.init(pipeline.name)
  const startTime = Date.now()

  let hasFailed = false
  for await (const event of executor.execute(pipeline)) {
    if (event.type === 'agent:error' || (event.type === 'agent:complete' && event.status === 'Failed')) {
      hasFailed = true
    }
    yield event
  }

  const totalDurationMs = Date.now() - startTime
  const pipelineStatus = hasFailed ? 'Failed' : 'Passed'

  const pipelineReport = reportManager.buildPipelineReport(pipelineStatus, totalDurationMs)
  const state = await artifactManager.readRunState()
  state.status = pipelineStatus
  state.completedAt = new Date().toISOString()
  state.report = pipelineReport
  await artifactManager.writeRunState(state)

  yield { type: 'pipeline:done', sessionDir: artifactManager.dir, report: pipelineReport }
}

export { AgentLoader } from './agent-loader.js'
export { parsePipeline } from './pipeline-parser.js'
export type { ParsedPipeline, DagNode, DagEdge } from './pipeline-parser.js'
export { ArtifactManager } from './artifact-manager.js'
export { ReportManager } from './report-manager.js'
export { AgentRunner } from './agent-runner.js'
export { PipelineExecutor } from './pipeline-executor.js'
