import { parse } from 'yaml'

export interface DagEdge {
  to: string
  label: string | undefined
}

export interface DagNode {
  id: string
  predecessors: string[]
  edges: DagEdge[]
}

export interface ParsedPipeline {
  name: string
  description: string | undefined
  mermaidSource: string
  nodes: Map<string, DagNode>
  startNodes: string[]
}

export function parsePipeline(content: string): ParsedPipeline {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const meta = frontmatterMatch
    ? (parse(frontmatterMatch[1]) as { name?: string; description?: string })
    : {}

  const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)\n```/)
  if (!mermaidMatch) throw new Error('No mermaid block found in pipeline file')

  const mermaidSource = mermaidMatch[1]
  const nodes = buildDag(mermaidSource)
  const startNodes = [...nodes.values()]
    .filter(n => n.predecessors.length === 0)
    .map(n => n.id)
    .sort()

  return {
    name: meta.name ?? 'unnamed',
    description: meta.description,
    mermaidSource,
    nodes,
    startNodes,
  }
}

function buildDag(mermaid: string): Map<string, DagNode> {
  const nodes = new Map<string, DagNode>()

  const getOrCreate = (id: string): DagNode => {
    if (!nodes.has(id)) nodes.set(id, { id, predecessors: [], edges: [] })
    return nodes.get(id)!
  }

  const edgeRe = /([\w-]+)\s*-->(?:\|([^|]+)\|)?\s*([\w-]+)/g
  let match: RegExpExecArray | null
  while ((match = edgeRe.exec(mermaid)) !== null) {
    const [, from, label, to] = match
    const fromNode = getOrCreate(from)
    const toNode = getOrCreate(to)
    fromNode.edges.push({ to, label: label?.trim() })
    if (!toNode.predecessors.includes(from)) toNode.predecessors.push(from)
  }

  return nodes
}
