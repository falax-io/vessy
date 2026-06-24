import type { RunEvent, AgentManifest } from '@vessy/sdk'
import type { ParsedPipeline } from './pipeline-parser.js'
import type { ArtifactManager } from './artifact-manager.js'
import type { ReportManager } from './report-manager.js'
import type { AgentLoader } from './agent-loader.js'
import type { AgentRunner } from './agent-runner.js'

export class PipelineExecutor {
  constructor(
    private readonly agentLoader: AgentLoader,
    private readonly artifactManager: ArtifactManager,
    private readonly reportManager: ReportManager,
    private readonly agentRunner: AgentRunner,
  ) {}

  async *execute(pipeline: ParsedPipeline): AsyncGenerator<RunEvent> {
    const completed = new Map<string, string>()   // agentName → folderPath
    const skipped = new Set<string>()
    const remaining = new Set(pipeline.nodes.keys())

    const isReady = (id: string): boolean => {
      const node = pipeline.nodes.get(id)!
      return node.predecessors.every(p => completed.has(p) || skipped.has(p))
    }

    while (remaining.size > 0) {
      const ready = [...remaining].filter(id => !skipped.has(id) && isReady(id)).sort()
      if (ready.length === 0) break

      // Create folders and emit start events before parallel execution
      const folderMap = new Map<string, string>()
      for (const agentName of ready) {
        const folder = await this.artifactManager.createAgentFolder(agentName)
        folderMap.set(agentName, folder)

        const node = pipeline.nodes.get(agentName)!
        const invokedBy = node.predecessors.find(p => completed.has(p)) ?? null
        this.reportManager.startAgent(agentName, invokedBy)
        for (const edge of node.edges) this.reportManager.recordInvocation(agentName, edge.to)

        yield { type: 'agent:start', agent: agentName, folder, session: this.artifactManager.id }
      }

      const results = await Promise.allSettled(
        ready.map(agentName => {
          const folder = folderMap.get(agentName)!
          const node = pipeline.nodes.get(agentName)!
          const predecessorFolders: Record<string, string> = {}
          for (const pred of node.predecessors) {
            const pf = completed.get(pred)
            if (pf) predecessorFolders[pred] = pf
          }
          return this.agentLoader.load(agentName).then(agent =>
            this.agentRunner.run(agent, folder, predecessorFolders),
          )
        }),
      )

      for (let i = 0; i < ready.length; i++) {
        const agentName = ready[i]
        const folder = folderMap.get(agentName)!
        const result = results[i]
        remaining.delete(agentName)

        if (result.status === 'fulfilled') {
          const { status, artifacts } = result.value
          const report = this.reportManager.completeAgent(agentName, status)

          let existingManifest: AgentManifest | undefined
          try {
            existingManifest = await this.artifactManager.readManifest(folder)
          } catch {
            // script agents already validated manifest exists in AgentRunner
          }

          await this.artifactManager.writeManifest(folder, {
            status,
            outputs: existingManifest?.outputs ?? artifacts,
            report,
          })
          await this.artifactManager.updateAgentStatus(agentName, folder, status)

          completed.set(agentName, folder)

          const node = pipeline.nodes.get(agentName)!
          const hasConditionalEdges = node.edges.some(e => e.label !== undefined)
          if (hasConditionalEdges) {
            for (const edge of node.edges) {
              if (edge.label && edge.label !== status) skipped.add(edge.to)
            }
            this.propagateSkips(pipeline, completed, skipped)
          }

          yield { type: 'agent:complete', agent: agentName, status, artifacts, report }
        } else {
          const error = String(result.reason)
          this.reportManager.completeAgent(agentName, 'Failed')
          await this.artifactManager.updateAgentStatus(agentName, folder, 'Failed')

          yield { type: 'agent:error', agent: agentName, error }

          // Fail-fast: if no error handler edge exists, skip all remaining nodes
          const node = pipeline.nodes.get(agentName)!
          const hasFailedHandler = node.edges.some(e => e.label === 'Failed')
          if (!hasFailedHandler) {
            for (const id of remaining) skipped.add(id)
            this.propagateSkips(pipeline, completed, skipped)
          }
        }
      }
    }
  }

  private propagateSkips(
    pipeline: ParsedPipeline,
    completed: Map<string, string>,
    skipped: Set<string>,
  ): void {
    let changed = true
    while (changed) {
      changed = false
      for (const [id, node] of pipeline.nodes) {
        if (skipped.has(id) || completed.has(id)) continue
        const hasSkippedPred = node.predecessors.some(p => skipped.has(p))
        const hasCompletedPred = node.predecessors.some(p => completed.has(p))
        if (hasSkippedPred && !hasCompletedPred) {
          skipped.add(id)
          changed = true
        }
      }
    }
  }
}
