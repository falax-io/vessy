import { describe, it, expect } from 'vitest'
import { parsePipeline } from '../pipeline-parser.js'

const SIMPLE = `---
name: simple
description: A simple pipeline
---

\`\`\`mermaid
flowchart LR
    fetch --> process
    process --> publish
\`\`\``

const PARALLEL = `---
name: parallel
---

\`\`\`mermaid
flowchart LR
    start --> worker_a
    start --> worker_b
    worker_a --> merge
    worker_b --> merge
\`\`\``

const CONDITIONAL = `---
name: conditional
---

\`\`\`mermaid
flowchart LR
    run -->|Passed| publish
    run -->|Failed| error_handler
\`\`\``

describe('parsePipeline', () => {
  it('extracts name and description from frontmatter', () => {
    const r = parsePipeline(SIMPLE)
    expect(r.name).toBe('simple')
    expect(r.description).toBe('A simple pipeline')
  })

  it('builds correct node list for linear pipeline', () => {
    const r = parsePipeline(SIMPLE)
    expect([...r.nodes.keys()].sort()).toEqual(['fetch', 'process', 'publish'])
  })

  it('identifies start nodes (no predecessors)', () => {
    const r = parsePipeline(SIMPLE)
    expect(r.startNodes).toEqual(['fetch'])
  })

  it('sets correct predecessors for each node', () => {
    const r = parsePipeline(SIMPLE)
    expect(r.nodes.get('fetch')!.predecessors).toEqual([])
    expect(r.nodes.get('process')!.predecessors).toEqual(['fetch'])
    expect(r.nodes.get('publish')!.predecessors).toEqual(['process'])
  })

  it('sets correct edges for each node', () => {
    const r = parsePipeline(SIMPLE)
    expect(r.nodes.get('fetch')!.edges).toEqual([{ to: 'process', label: undefined }])
    expect(r.nodes.get('process')!.edges).toEqual([{ to: 'publish', label: undefined }])
    expect(r.nodes.get('publish')!.edges).toEqual([])
  })

  it('handles parallel nodes sharing a predecessor', () => {
    const r = parsePipeline(PARALLEL)
    expect(r.startNodes).toEqual(['start'])
    expect(r.nodes.get('worker_a')!.predecessors).toEqual(['start'])
    expect(r.nodes.get('worker_b')!.predecessors).toEqual(['start'])
    expect(r.nodes.get('merge')!.predecessors.sort()).toEqual(['worker_a', 'worker_b'])
  })

  it('parses conditional edge labels', () => {
    const r = parsePipeline(CONDITIONAL)
    const edges = r.nodes.get('run')!.edges
    expect(edges).toHaveLength(2)
    expect(edges.find(e => e.label === 'Passed')?.to).toBe('publish')
    expect(edges.find(e => e.label === 'Failed')?.to).toBe('error_handler')
  })

  it('throws when no mermaid block is present', () => {
    expect(() => parsePipeline('---\nname: test\n---\nNo diagram here.')).toThrow('No mermaid block found')
  })

  it('uses "unnamed" when name is absent from frontmatter', () => {
    const content = '\`\`\`mermaid\nflowchart LR\n    a --> b\n\`\`\`'
    expect(parsePipeline(content).name).toBe('unnamed')
  })
})
