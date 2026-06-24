import { spawn } from 'node:child_process'
import { readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import type { AgentDefinition, AgentManifest, TokenUsage } from '@vessy/sdk'
import type { ArtifactManager } from './artifact-manager.js'
import type { ReportManager } from './report-manager.js'

export interface AgentRunResult {
  status: string
  artifacts: string[]
}

export class AgentRunner {
  private readonly anthropic = new Anthropic()

  constructor(
    private readonly artifactManager: ArtifactManager,
    private readonly reportManager: ReportManager,
  ) {}

  async run(
    agent: AgentDefinition,
    folder: string,
    predecessorFolders: Record<string, string>,
  ): Promise<AgentRunResult> {
    const env = this.buildEnv(folder, predecessorFolders)

    if (agent.type === 'script') {
      return this.runScript(agent, folder, env)
    }
    if (agent.type === 'llm') {
      return this.runLlm(agent, folder, predecessorFolders)
    }
    throw new Error(`Agent type '${agent.type}' is not supported in this version`)
  }

  private buildEnv(folder: string, predecessorFolders: Record<string, string>): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      VESSY_SESSION_DIR: this.artifactManager.dir,
      VESSY_OUTPUT_DIR: folder,
    }
    for (const [name, path] of Object.entries(predecessorFolders)) {
      env[`VESSY_INPUT_${name.toUpperCase()}`] = path
    }
    return env
  }

  private async runScript(
    agent: AgentDefinition,
    folder: string,
    env: NodeJS.ProcessEnv,
  ): Promise<AgentRunResult> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(agent.script!, agent.args ?? [], { env, cwd: folder, stdio: 'inherit' })

      const timer = agent.timeout
        ? setTimeout(() => {
            child.kill()
            reject(new Error('timeout_exceeded'))
          }, agent.timeout * 1000)
        : null

      child.on('close', code => {
        if (timer) clearTimeout(timer)
        if (code === 0) resolve()
        else reject(new Error(`Script exited with code ${code}`))
      })
      child.on('error', err => {
        if (timer) clearTimeout(timer)
        reject(err)
      })
    })

    let manifest: AgentManifest
    try {
      manifest = await this.artifactManager.readManifest(folder)
    } catch {
      throw new Error(`Agent '${agent.name}': script did not write manifest.json`)
    }

    const artifacts = await readdir(folder)
    return { status: manifest.status, artifacts }
  }

  private async runLlm(
    agent: AgentDefinition,
    folder: string,
    predecessorFolders: Record<string, string>,
  ): Promise<AgentRunResult> {
    const contextLines = Object.entries(predecessorFolders).map(
      ([name, path]) => `VESSY_INPUT_${name.toUpperCase()}=${path}`,
    )

    const userMessage =
      contextLines.length > 0
        ? `Available predecessor outputs:\n${contextLines.join('\n')}\n\nComplete your task and write outputs to: ${folder}`
        : `Complete your task and write outputs to: ${folder}`

    const response = await this.anthropic.messages.create({
      model: agent.model!,
      max_tokens: 8192,
      system: agent.systemPrompt!,
      messages: [{ role: 'user', content: userMessage }],
    })

    const tokens: TokenUsage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens,
      costUsd: 0,
    }
    this.reportManager.recordTokens(agent.name, tokens)

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    await writeFile(join(folder, 'response.md'), text, 'utf-8')
    const artifacts = await readdir(folder)
    return { status: 'Passed', artifacts }
  }
}
