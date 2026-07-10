import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { api } from '../services/api'
import { GraphData, GraphNode, GraphLink } from '../types/api'

interface Props { 
  mini?: boolean
  userId?: string
}

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

export default function GraphMode({ mini = false, userId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchGraph = useCallback(async () => {
    try {
      setError('')
      const data = await api.getGraph(userId)
      if (!data || !data.nodes || data.nodes.length === 0) { 
        setGraphData({ nodes: [], links: [] })
        setLoading(false)
        return
      }
      setGraphData(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Initial fetch
  useEffect(() => { fetchGraph() }, [fetchGraph])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchGraph, 5000)
    return () => clearInterval(interval)
  }, [fetchGraph])

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
          <button className="ctrl-btn" onClick={fetchGraph} style={{ marginTop: 8 }}>↻ Retry</button>
        </div>
      )}
      {!loading && !error && graphData.nodes.length === 0 && (
        <div className="graph-empty">
          <p style={{ color: 'var(--text-muted)', fontSize: '2rem' }}>🕸️</p>
          <p>No concepts yet. Start chatting to build the graph!</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>The graph auto-refreshes every 5 seconds</p>
        </div>
      )}
      <svg ref={svgRef} className="graph-svg" />
      <div ref={tooltipRef} className="graph-tooltip" />
      {!mini && (
        <>
          <div className="graph-controls">
            <button className="ctrl-btn" onClick={fetchGraph}>↻ Refresh</button>
            <span className="ctrl-btn" style={{ cursor: 'default', opacity: 0.6 }}>
              {graphData.nodes.length} nodes · {graphData.links.length} bonds
            </span>
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
