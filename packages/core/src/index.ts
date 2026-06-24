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
  const agentRunner = new AgentRunner(artifactManager, reportManager)
  const executor = new PipelineExecutor(agentLoader, artifactManager, reportManager, agentRunner)

  await artifactManager.init(pipeline.name)
  const startTime = Date.now()

  for await (const event of executor.execute(pipeline)) {
    yield event
  }

  const totalDurationMs = Date.now() - startTime
  const state = await artifactManager.readRunState()
  const hasFailed = Object.values(state.agents).some(a => a.status === 'Failed')
  const pipelineStatus = hasFailed ? 'Failed' : 'Passed'

  const pipelineReport = reportManager.buildPipelineReport(pipelineStatus, totalDurationMs)
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
