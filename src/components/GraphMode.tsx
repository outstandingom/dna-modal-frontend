import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { api } from '../services/api'
import { GraphData, GraphNode, GraphLink } from '../types/api'

interface Props { mini?: boolean }

const COLOR_MAP: Record<string, string> = {
  IS_A: '#6366f1',
  CAUSES: '#ef4444',
  HAS: '#10b981',
  RELATED: '#8b5cf6',
  default: '#06b6d4',
}

const DOMAIN_COLOR: Record<string, string> = {
  technical: '#6366f1',
  billing: '#f59e0b',
  security: '#ef4444',
  general: '#06b6d4',
  default: '#8b5cf6',
}

export default function GraphMode({ mini = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchGraph = useCallback(async () => {
    try {
      setError('')
      const concepts = await api.getConcepts()
      const keys = Object.keys(concepts)
      if (keys.length === 0) { setLoading(false); return }

      const nodes: GraphNode[] = keys.map(k => ({
        id: k,
        domain: concepts[k]?.domain || 'general',
        importance: concepts[k]?.importance || 1,
      }))

      // Build links by sampling predictions for top nodes
      const links: GraphLink[] = []
      const sampleNodes = keys.slice(0, 10)
      await Promise.allSettled(
        sampleNodes.map(async (concept) => {
          try {
            const pred = await api.predict(concept)
            Object.entries(pred.fuzzy_predictions || {}).forEach(([target, score]) => {
              if (target !== concept && score > 0.2 && keys.includes(target)) {
                links.push({ source: concept, target, weight: score as number, color: 'RELATED' })
              }
            })
          } catch { /* skip */ }
        })
      )

      setGraphData({ nodes, links })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchGraph() }, [fetchGraph])

  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return
    const container = containerRef.current!
    const width = container.clientWidth
    const height = container.clientHeight

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(graphData.links)
        .id(d => d.id)
        .distance(mini ? 60 : 100)
        .strength(0.4))
      .force('charge', d3.forceManyBody().strength(mini ? -80 : -200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(mini ? 20 : 30))

    // Links
    const link = g.append('g').selectAll('line')
      .data(graphData.links).enter().append('line')
      .attr('stroke', d => COLOR_MAP[d.color] || COLOR_MAP.default)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', d => Math.max(0.5, (d.weight as number) * 2))

    // Nodes
    const node = g.append('g').selectAll('g')
      .data(graphData.nodes).enter().append('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
      )

    node.append('circle')
      .attr('r', d => mini ? Math.max(5, d.importance * 5) : Math.max(8, d.importance * 8))
      .attr('fill', d => DOMAIN_COLOR[d.domain] || DOMAIN_COLOR.default)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('fill-opacity', 0.85)

    if (!mini) {
      node.append('text')
        .text(d => d.id.length > 14 ? d.id.slice(0, 14) + '…' : d.id)
        .attr('dy', d => Math.max(8, d.importance * 8) + 12)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-family', "'JetBrains Mono', monospace")
    }

    // Tooltip
    node.on('mouseover', (event: MouseEvent, d: GraphNode) => {
      if (!tooltipRef.current) return
      tooltipRef.current.innerHTML = `<div class="graph-tooltip-name">${d.id}</div><div class="graph-tooltip-domain">${d.domain} · importance: ${d.importance.toFixed(2)}</div>`
      tooltipRef.current.style.left = (event.offsetX + 14) + 'px'
      tooltipRef.current.style.top = (event.offsetY - 14) + 'px'
      tooltipRef.current.classList.add('visible')
    }).on('mouseout', () => {
      tooltipRef.current?.classList.remove('visible')
    })

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0)
      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => { simulation.stop() }
  }, [graphData, mini])

  return (
    <div className="graph-mode" ref={containerRef}>
      {loading && (
        <div className="graph-empty">
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading knowledge graph...</p>
        </div>
      )}
      {!loading && error && (
        <div className="graph-empty">
          <p style={{ color: 'var(--danger)' }}>⚠️ {error}</p>
        </div>
      )}
      {!loading && !error && graphData.nodes.length === 0 && (
        <div className="graph-empty">
          <p style={{ color: 'var(--text-muted)', fontSize: '2rem' }}>🕸️</p>
          <p>No concepts yet. Start chatting to build the graph!</p>
        </div>
      )}
      <svg ref={svgRef} className="graph-svg" />
      <div ref={tooltipRef} className="graph-tooltip" />
      {!mini && (
        <>
          <div className="graph-controls">
            <button className="ctrl-btn" onClick={fetchGraph}>↻ Refresh</button>
          </div>
          <div className="graph-legend">
            <div className="legend-title">Relationship Types</div>
            {Object.entries(COLOR_MAP).filter(([k]) => k !== 'default').map(([k, v]) => (
              <div key={k} className="legend-item">
                <div className="legend-dot" style={{ background: v }} />
                {k}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
