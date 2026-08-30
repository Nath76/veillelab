import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  expertiseGephiLayout,
  expertiseClusters,
} from './expertiseGephiLayout.js'

const FAMILY_COLORS = {
  'Instrument / dispositif': '#7258d9',
  'Méthode / savoir-faire': '#ffb20e',
  'Problème public': '#14af75',
}

const DEFAULT_CLUSTER_COLOR = '#cfd5dd'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function nodeScore(node) {
  const layout = expertiseGephiLayout[node.id]
  return Number(layout?.size || 0)
}

export function selectOverviewExpertises(nodes, limit = 80) {
  const eligible = (nodes || []).filter(node => expertiseGephiLayout[node.id])

  if (eligible.length <= limit) {
    return eligible
  }

  const sorted = [...eligible].sort((a, b) => nodeScore(b) - nodeScore(a))
  const selected = []
  const selectedIds = new Set()
  const representedClusters = new Set()

  for (const node of sorted) {
    const cluster = expertiseGephiLayout[node.id]?.cluster
    if (!representedClusters.has(cluster)) {
      representedClusters.add(cluster)
      selectedIds.add(node.id)
      selected.push(node)
    }
  }

  for (const node of sorted) {
    if (selected.length >= limit) break
    if (selectedIds.has(node.id)) continue
    selectedIds.add(node.id)
    selected.push(node)
  }

  return selected
}

function wrapLabel(label, maxChars = 32) {
  const words = String(label || '').split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''

  words.forEach(word => {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  })

  if (current) lines.push(current)
  return lines.slice(0, 3)
}

function familyColor(family) {
  return FAMILY_COLORS[family] || '#64748b'
}

export default function ExpertiseConstellation({
  nodes,
  edges,
  selected,
  onSelect,
  nodeSize = 1,
  linkDensity = 1,
  resetToken = 0,
  fitToken = 0,
}) {
  const svgRef = useRef(null)
  const dragRef = useRef(null)

  const [mode, setMode] = useState('cluster')
  const [activeCluster, setActiveCluster] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const overviewNodes = useMemo(
    () => selectOverviewExpertises(nodes, 80),
    [nodes]
  )

  const displayedNodes = useMemo(() => {
    if (!selected || overviewNodes.some(node => node.id === selected.id)) {
      return overviewNodes
    }

    if (!expertiseGephiLayout[selected.id]) {
      return overviewNodes
    }

    return [...overviewNodes, selected]
  }, [overviewNodes, selected])

  const positionedNodes = useMemo(
    () =>
      displayedNodes
        .map(node => {
          const layout = expertiseGephiLayout[node.id]
          if (!layout) return null
          return {
            ...node,
            x: layout.x,
            y: layout.y,
            gephiSize: layout.size,
            clusterId: layout.cluster,
          }
        })
        .filter(Boolean),
    [displayedNodes]
  )

  const byId = useMemo(
    () => new Map(positionedNodes.map(node => [node.id, node])),
    [positionedNodes]
  )

  const visibleEdges = useMemo(
    () =>
      (edges || []).filter(
        edge => byId.has(edge.source) && byId.has(edge.target)
      ),
    [edges, byId]
  )

  const bounds = useMemo(() => {
    const xs = []
    const ys = []

    positionedNodes.forEach(node => {
      xs.push(node.x)
      ys.push(node.y)
    })

    expertiseClusters.forEach(cluster => {
      if (positionedNodes.some(node => node.clusterId === cluster.id)) {
        xs.push(cluster.labelX)
        ys.push(cluster.labelY)
      }
    })

    if (!xs.length) {
      return { minX: -900, maxX: 900, minY: -650, maxY: 950 }
    }

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    }
  }, [positionedNodes])

  const view = useMemo(() => {
    const width = Math.max(1, bounds.maxX - bounds.minX)
    const height = Math.max(1, bounds.maxY - bounds.minY)
    const padX = width * 0.08
    const padY = height * 0.09

    return {
      x: bounds.minX - padX,
      y: bounds.minY - padY,
      w: width + padX * 2,
      h: height + padY * 2,
    }
  }, [bounds])

  const viewCenter = useMemo(
    () => ({
      x: view.x + view.w / 2,
      y: view.y + view.h / 2,
    }),
    [view]
  )

  const clusterStats = useMemo(() => {
    const grouped = new Map()

    positionedNodes.forEach(node => {
      if (!grouped.has(node.clusterId)) {
        grouped.set(node.clusterId, [])
      }
      grouped.get(node.clusterId).push(node)
    })

    return expertiseClusters
      .filter(cluster => grouped.has(cluster.id))
      .map(cluster => {
        const clusterNodes = grouped.get(cluster.id)
        return {
          ...cluster,
          nodeIds: new Set(clusterNodes.map(node => node.id)),
          radius: 92 + Math.sqrt(clusterNodes.length) * 26,
        }
      })
  }, [positionedNodes])

  const selectedId = selected?.id || null

  const neighbourIds = useMemo(() => {
    if (!selectedId) return new Set()
    const ids = new Set([selectedId])

    visibleEdges.forEach(edge => {
      if (edge.source === selectedId) ids.add(edge.target)
      if (edge.target === selectedId) ids.add(edge.source)
    })

    return ids
  }, [selectedId, visibleEdges])

  useEffect(() => {
    setActiveCluster(null)
    setHoveredId(null)
    setScale(1)
    setPan({ x: 0, y: 0 })
    setMode('cluster')
  }, [resetToken])

  useEffect(() => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }, [fitToken])

  const zoom = factor => {
    setScale(current => clamp(current * factor, 0.72, 3))
  }

  const resetView = () => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  const onPointerDown = event => {
    if (event.button !== 0) return

    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
      rectWidth: rect.width,
      rectHeight: rect.height,
    }

    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = event => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const dx =
      (event.clientX - drag.startX) *
      (view.w / Math.max(1, drag.rectWidth)) /
      scale

    const dy =
      (event.clientY - drag.startY) *
      (view.h / Math.max(1, drag.rectHeight)) /
      scale

    setPan({
      x: drag.panX + dx,
      y: drag.panY + dy,
    })
  }

  const endDrag = event => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const zoomTransform = [
    `translate(${viewCenter.x + pan.x} ${viewCenter.y + pan.y})`,
    `scale(${scale})`,
    `translate(${-viewCenter.x} ${-viewCenter.y})`,
  ].join(' ')

  const hoveredNode = hoveredId ? byId.get(hoveredId) : null
  const labelNode = selected && byId.get(selected.id)
    ? byId.get(selected.id)
    : hoveredNode

  return (
    <section className="constellation-shell gephi-entry-shell">
      <div className="gephi-view-switch" aria-label="Mode de lecture du graphe">
        <button
          type="button"
          className={mode === 'cluster' ? 'active' : ''}
          onClick={() => {
            setMode('cluster')
            setActiveCluster(null)
          }}
        >
          Clusters d’expertises
        </button>

        <button
          type="button"
          className={mode === 'category' ? 'active' : ''}
          onClick={() => {
            setMode('category')
            setActiveCluster(null)
          }}
        >
          Catégories d’expertise
        </button>
      </div>

      <div className="gephi-zoom-tools" aria-label="Zoom du graphe">
        <button type="button" onClick={() => zoom(1.18)} aria-label="Zoom avant">+</button>
        <button type="button" onClick={() => zoom(0.86)} aria-label="Zoom arrière">−</button>
        <button type="button" onClick={resetView} aria-label="Recentrer">⌾</button>
      </div>

      {activeCluster !== null && mode === 'cluster' && (
        <button
          type="button"
          className="gephi-back-cluster"
          onClick={() => setActiveCluster(null)}
        >
          Retour à la carte complète
        </button>
      )}

      <svg
        ref={svgRef}
        className="gephi-entry-svg"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        role="img"
        aria-label="Carte des expertises ministérielles"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={event => {
          if (event.deltaY < 0) zoom(1.08)
          if (event.deltaY > 0) zoom(0.92)
        }}
      >
        <defs>
          <filter id="cluster-blur-entry">
            <feGaussianBlur stdDeviation="34" />
          </filter>
        </defs>

        <g transform={zoomTransform}>
          {mode === 'cluster' && (
            <g className="entry-cluster-halos" aria-hidden="true">
              {clusterStats.map(cluster => {
                const clusterNodes = positionedNodes.filter(
                  node => node.clusterId === cluster.id
                )
                const xs = clusterNodes.map(node => node.x)
                const ys = clusterNodes.map(node => node.y)
                const cx = (Math.min(...xs) + Math.max(...xs)) / 2
                const cy = (Math.min(...ys) + Math.max(...ys)) / 2

                const dim =
                  activeCluster !== null &&
                  activeCluster !== cluster.id

                return (
                  <circle
                    key={`halo-${cluster.id}`}
                    cx={cx}
                    cy={cy}
                    r={cluster.radius}
                    fill={cluster.color || DEFAULT_CLUSTER_COLOR}
                    opacity={dim ? 0.03 : 0.19}
                    filter="url(#cluster-blur-entry)"
                  />
                )
              })}
            </g>
          )}

          <g className="entry-edges">
            {visibleEdges.map((edge, index) => {
              const source = byId.get(edge.source)
              const target = byId.get(edge.target)
              if (!source || !target) return null

              const selectedActive =
                !selectedId ||
                (
                  neighbourIds.has(edge.source) &&
                  neighbourIds.has(edge.target)
                )

              const clusterActive =
                activeCluster === null ||
                (
                  source.clusterId === activeCluster &&
                  target.clusterId === activeCluster
                )

              const sameCluster = source.clusterId === target.clusterId

              return (
                <line
                  key={`${edge.source}-${edge.target}-${index}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  className={
                    selectedId &&
                    (
                      edge.source === selectedId ||
                      edge.target === selectedId
                    )
                      ? 'entry-edge active'
                      : 'entry-edge'
                  }
                  opacity={
                    selectedActive && clusterActive
                      ? (sameCluster ? 0.33 : 0.08) * linkDensity
                      : 0.028
                  }
                />
              )
            })}
          </g>

          <g className="entry-nodes">
            {positionedNodes.map(node => {
              const isSelected = selectedId === node.id
              const selectedActive =
                !selectedId || neighbourIds.has(node.id)

              const clusterActive =
                activeCluster === null ||
                node.clusterId === activeCluster

              const cluster = expertiseClusters.find(
                item => item.id === node.clusterId
              )

              const fill =
                mode === 'category'
                  ? familyColor(node.family)
                  : cluster?.color || DEFAULT_CLUSTER_COLOR

              const radius =
                Math.max(13, 10 + node.gephiSize * 1.12) *
                nodeSize

              return (
                <g
                  key={node.id}
                  className="constellation-node"
                  onPointerDown={event => event.stopPropagation()}
                >
                  <circle
                    className="node-hit-target"
                    cx={node.x}
                    cy={node.y}
                    r={radius + 7}
                    fill="transparent"
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onFocus={() => setHoveredId(node.id)}
                    onBlur={() => setHoveredId(null)}
                    onClick={() => onSelect?.(node)}
                    tabIndex="0"
                    role="button"
                    aria-label={node.label}
                  />

                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={fill}
                    stroke={isSelected ? '#0b2545' : '#ffffff'}
                    strokeWidth={isSelected ? 4.2 : 1.65}
                    opacity={
                      selectedActive && clusterActive
                        ? 0.97
                        : 0.13
                    }
                    pointerEvents="none"
                  />
                </g>
              )
            })}
          </g>

          {mode === 'cluster' && (
            <g className="entry-cluster-labels">
              {clusterStats.map(cluster => {
                const dim =
                  activeCluster !== null &&
                  activeCluster !== cluster.id

                const width = cluster.labelWidth || 240
                const height = cluster.transdirectional ? 84 : 62

                return (
                  <foreignObject
                    key={`label-${cluster.id}`}
                    x={cluster.labelX - width / 2}
                    y={cluster.labelY - height / 2}
                    width={width}
                    height={height}
                    opacity={dim ? 0.22 : 1}
                    onPointerDown={event => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="entry-cluster-card"
                      aria-label={
                        cluster.transdirectional
                          ? `${cluster.label}, Cluster transdirectionnel`
                          : cluster.label
                      }
                      onClick={() =>
                        setActiveCluster(current =>
                          current === cluster.id ? null : cluster.id
                        )
                      }
                    >
                      <strong>{cluster.label}</strong>
                      {cluster.transdirectional && (
                        <span>Cluster transdirectionnel</span>
                      )}
                    </button>
                  </foreignObject>
                )
              })}
            </g>
          )}

          {labelNode && (
            <g className="entry-node-label" pointerEvents="none">
              <text
                x={labelNode.x + 16}
                y={labelNode.y - 15}
                textAnchor="start"
              >
                {labelNode.label}
              </text>
            </g>
          )}
        </g>
      </svg>

      {mode === 'category' && (
        <div className="entry-family-legend" aria-label="Catégories d’expertise">
          {Object.entries(FAMILY_COLORS).map(([label, color]) => (
            <span key={label}>
              <i style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      )}

      <style>{`
        .gephi-entry-shell{
          position:relative;
          min-height:620px;
          overflow:hidden;
          border-radius:18px;
          background:
            radial-gradient(circle at 50% 40%,rgba(241,245,251,.92),rgba(255,255,255,0) 44%),
            linear-gradient(180deg,#ffffff 0%,#fbfcfe 100%);
        }

        .gephi-entry-svg{
          display:block;
          width:100%;
          height:620px;
          touch-action:none;
          user-select:none;
          cursor:grab;
        }

        .gephi-entry-svg:active{
          cursor:grabbing;
        }

        .entry-edge{
          stroke:#a9b6c7;
          stroke-width:1.45;
          stroke-linecap:round;
          vector-effect:non-scaling-stroke;
        }

        .entry-edge.active{
          stroke:#f39a00;
          stroke-width:3;
        }

        .gephi-view-switch{
          position:absolute;
          z-index:6;
          left:14px;
          top:14px;
          display:flex;
          gap:5px;
          padding:4px;
          border:1px solid #dbe4f0;
          border-radius:10px;
          background:rgba(255,255,255,.95);
          box-shadow:0 4px 14px rgba(15,46,85,.07);
        }

        .gephi-view-switch button{
          border:0;
          border-radius:7px;
          padding:7px 10px;
          background:transparent;
          color:#536686;
          font:750 10px/1.2 inherit;
          cursor:pointer;
        }

        .gephi-view-switch button.active{
          background:#eef3fb;
          color:#123567;
        }

        .gephi-zoom-tools{
          position:absolute;
          z-index:6;
          right:14px;
          bottom:16px;
          display:flex;
          flex-direction:column;
          overflow:hidden;
          border:1px solid #dbe4f0;
          border-radius:10px;
          background:#fff;
          box-shadow:0 4px 14px rgba(15,46,85,.07);
        }

        .gephi-zoom-tools button{
          width:42px;
          height:39px;
          border:0;
          border-bottom:1px solid #e5ebf3;
          background:#fff;
          color:#17376e;
          font:800 17px/1 inherit;
          cursor:pointer;
        }

        .gephi-zoom-tools button:last-child{
          border-bottom:0;
        }

        .gephi-back-cluster{
          position:absolute;
          z-index:6;
          left:14px;
          top:60px;
          border:1px solid #ccd9ea;
          border-radius:8px;
          padding:7px 10px;
          background:rgba(255,255,255,.96);
          color:#315b91;
          font:750 10px/1.2 inherit;
          cursor:pointer;
        }

        .entry-cluster-label{
          cursor:pointer;
          outline:none;
        }

        .entry-cluster-name{
          fill:#203653;
          font-size:19px;
          font-weight:860;
          letter-spacing:-.2px;
          paint-order:stroke;
          stroke:#ffffff;
          stroke-width:5px;
          stroke-linejoin:round;
          pointer-events:none;
        }

        .entry-cluster-transdirectional{
          fill:#6b7b91;
          font-size:12px;
          font-style:italic;
          font-weight:680;
          paint-order:stroke;
          stroke:#ffffff;
          stroke-width:4px;
          pointer-events:none;
        }

        .entry-node-label text{
          fill:#142d52;
          font-size:12px;
          font-weight:800;
          paint-order:stroke;
          stroke:#fff;
          stroke-width:4px;
          stroke-linejoin:round;
        }

        .entry-family-legend{
          position:absolute;
          z-index:6;
          left:14px;
          bottom:14px;
          display:flex;
          flex-wrap:wrap;
          gap:8px 12px;
          max-width:72%;
          padding:8px 11px;
          border:1px solid #dbe4f0;
          border-radius:9px;
          background:rgba(255,255,255,.94);
          color:#536686;
          font-size:9px;
          font-weight:700;
        }

        .entry-family-legend span{
          display:flex;
          align-items:center;
          gap:5px;
        }

        .entry-family-legend i{
          width:9px;
          height:9px;
          border-radius:50%;
        }


        .entry-cluster-card{
          width:100%;
          height:100%;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:4px;
          padding:7px 10px;
          border:0;
          border-radius:0;
          background:transparent;
          box-shadow:none;
          color:#203653;
          font-family:inherit;
          text-align:center;
          cursor:pointer;
        }

        .entry-cluster-card strong{
          font-size:15px;
          line-height:1.12;
          font-weight:860;
          letter-spacing:-.15px;
        }

        .entry-cluster-card span{
          color:#6b7b91;
          font-size:10.5px;
          line-height:1.1;
          font-style:italic;
          font-weight:680;
        }

        @media(max-width:1380px){
          .gephi-entry-svg{
            height:560px;
          }

          .entry-cluster-card strong{
            font-size:14px;
          }
        }

        @media(max-width:820px){
          .gephi-entry-svg{
            height:500px;
          }

          .gephi-view-switch{
            max-width:calc(100% - 28px);
          }

          .gephi-view-switch button{
            padding:6px 8px;
            font-size:9px;
          }

          .entry-cluster-card strong{
            font-size:13px;
          }

          .entry-cluster-card span{
            font-size:9px;
          }
        }
      `}</style>
    </section>
  )
}
