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
        const labelHalfWidth = (cluster.labelWidth || 240) / 2
        const labelHalfHeight = cluster.transdirectional ? 54 : 42

        xs.push(cluster.labelX - labelHalfWidth)
        xs.push(cluster.labelX + labelHalfWidth)
        ys.push(cluster.labelY - labelHalfHeight)
        ys.push(cluster.labelY + labelHalfHeight)
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
    const padX = width * 0.035
    const padY = height * 0.04

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
        const xs = clusterNodes.map(node => node.x)
        const ys = clusterNodes.map(node => node.y)

        return {
          ...cluster,
          nodeIds: new Set(clusterNodes.map(node => node.id)),
          minX: Math.min(...xs),
          maxX: Math.max(...xs),
          minY: Math.min(...ys),
          maxY: Math.max(...ys),
          centerX: (Math.min(...xs) + Math.max(...xs)) / 2,
          centerY: (Math.min(...ys) + Math.max(...ys)) / 2,
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

  const closeCluster = () => {
    setActiveCluster(null)
    onSelect?.(null)
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  const focusCluster = cluster => {
    if (!cluster) return

    if (activeCluster === cluster.id) {
      closeCluster()
      return
    }

    // A cluster focus must not inherit a previous node selection.
    onSelect?.(null)
    setActiveCluster(cluster.id)

    const clusterNodes = positionedNodes.filter(
      node => node.clusterId === cluster.id
    )

    if (!clusterNodes.length) return

    const xs = clusterNodes.map(node => node.x)
    const ys = clusterNodes.map(node => node.y)
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2

    const nextScale = clusterNodes.length >= 12 ? 1.55 : 1.85
    setScale(nextScale)
    setPan({
      x: nextScale * (viewCenter.x - centerX),
      y: nextScale * (viewCenter.y - centerY),
    })
  }

  const activeNodeLabels = useMemo(() => {
    if (activeCluster === null) return []

    const cluster = clusterStats.find(item => item.id === activeCluster)
    if (!cluster) return []

    const clusterNodes = positionedNodes.filter(
      node => node.clusterId === activeCluster
    )

    const left = clusterNodes
      .filter(node => node.x < cluster.centerX)
      .sort((a, b) => a.y - b.y)

    const right = clusterNodes
      .filter(node => node.x >= cluster.centerX)
      .sort((a, b) => a.y - b.y)

    const distribute = (items, side) => {
      if (!items.length) return []

      const gap = 45
      const original = items.map(node => node.y)
      const placed = []

      items.forEach((node, index) => {
        const wanted = node.y
        const y =
          index === 0
            ? wanted
            : Math.max(wanted, placed[index - 1].y + gap)

        placed.push({ node, y })
      })

      const avgOriginal =
        original.reduce((sum, value) => sum + value, 0) / original.length

      const avgPlaced =
        placed.reduce((sum, item) => sum + item.y, 0) / placed.length

      const shift = avgOriginal - avgPlaced
      const x =
        side === 'left'
          ? cluster.minX - 58
          : cluster.maxX + 58

      return placed.map(item => ({
        node: item.node,
        x,
        y: item.y + shift,
        side,
      }))
    }

    return [
      ...distribute(left, 'left'),
      ...distribute(right, 'right'),
    ]
  }, [activeCluster, clusterStats, positionedNodes])

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

  useEffect(() => {
    // On réutilise l’illustration déjà présente dans le bandeau d’introduction,
    // puis on masque ce bandeau supérieur.
    const topBanner = document.querySelector('.expertise-transition-banner')
    const topBannerImage = topBanner?.querySelector('img') || null

    // Réécriture légère de la carte latérale d’introduction
    const allEls = Array.from(document.querySelectorAll('aside h1, aside h2, aside h3, aside p, aside a, aside label, aside div, aside span, .expertise-sidebar h1, .expertise-sidebar h2, .expertise-sidebar h3, .expertise-sidebar p, .expertise-sidebar a, .expertise-sidebar label, .expertise-sidebar div, .expertise-sidebar span'))
    const titleEl = allEls.find(el => (el.textContent || '').trim() === 'Pourquoi cette carte ?')
    if (titleEl) {
      // On supprime uniquement le petit sur-titre.
      titleEl.style.display = 'none'

      const introContainer = titleEl.parentElement
      const siblings = Array.from(introContainer ? introContainer.children : [])
      const firstParagraph = siblings.find(el => /^Les publications du ministère/i.test((el.textContent || '').trim()))

      if (introContainer && topBannerImage && !introContainer.querySelector('.sidebar-intro-visual')) {
        const visual = topBannerImage.cloneNode(true)
        visual.className = 'sidebar-intro-visual'
        visual.removeAttribute('width')
        visual.removeAttribute('height')

        if (firstParagraph) {
          introContainer.insertBefore(visual, firstParagraph)
        } else {
          introContainer.prepend(visual)
        }
      }

      if (firstParagraph) {
        firstParagraph.textContent = 'Des publications aux savoir-faire du ministère'
        firstParagraph.classList.add('sidebar-intro-title')
        firstParagraph.style.fontSize = '22px'
        firstParagraph.style.lineHeight = '1.12'
        firstParagraph.style.fontWeight = '800'
        firstParagraph.style.color = '#14345d'
        firstParagraph.style.marginTop = '0'
        firstParagraph.style.marginBottom = '12px'
      }

      // On garde le lien d'introduction, on masque seulement les autres paragraphes explicatifs.
      siblings.forEach(el => {
        if (el !== titleEl && el !== firstParagraph) {
          const txt = (el.textContent || '').trim()
          if (
            txt &&
            !/lire l’introduction complète|lire l'introduction complète|rechercher|afficher|entité|type d’expertise/i.test(txt)
          ) {
            if (el.tagName.toLowerCase() === 'p') {
              el.style.display = 'none'
            }
          }
        }
      })
    }

    if (topBanner) {
      topBanner.style.display = 'none'
    }

    // Masquer la rubrique "Afficher" et ses deux options pour faire remonter le filtre Entité(s).
    const hideTextBlock = text => {
      const el = allEls.find(node => (node.textContent || '').trim() === text)
      if (!el) return
      el.style.display = 'none'
      const parent = el.parentElement
      if (parent && parent !== document.body) {
        const txt = (parent.textContent || '').trim()
        if (txt && txt.length < 180) {
          parent.style.display = 'none'
        }
      }
    }

    hideTextBlock('Afficher')
    hideTextBlock('Toutes les expertises')
    hideTextBlock('Mes expertises uniquement')

  }, [])

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
          onClick={closeCluster}
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
          {(mode === 'cluster' || mode === 'category') && (
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
                    opacity={dim ? 0.015 : 0.21}
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
                      ? (sameCluster ? 0.31 : 0.045) * linkDensity
                      : activeCluster !== null ? 0.012 : 0.028
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
                Math.max(15, 11.5 + node.gephiSize * 1.30) *
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
                        ? 0.98
                        : activeCluster !== null
                          ? 0.08
                          : 0.15
                    }
                    pointerEvents="none"
                  />
                </g>
              )
            })}
          </g>

          {(mode === 'cluster' || mode === 'category') && (
            <g className="entry-cluster-labels">
              {clusterStats.map(cluster => {
                const dim =
                  activeCluster !== null &&
                  activeCluster !== cluster.id

                const lines = wrapLabel(cluster.label, mode === 'category' ? 22 : 24)
                const lineHeight = 22
                const totalHeight = (lines.length - 1) * lineHeight

                return (
                  <g
                    key={`label-${cluster.id}`}
                    className="entry-cluster-label"
                    opacity={dim ? 0.12 : 1}
                    role="button"
                    tabIndex="0"
                    aria-label={
                      cluster.transdirectional
                        ? `${cluster.label}, Cluster transdirectionnel`
                        : cluster.label
                    }
                    onPointerDown={event => event.stopPropagation()}
                    onClick={() => focusCluster(cluster)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        focusCluster(cluster)
                      }
                    }}
                  >
                    <rect
                      x={cluster.labelX - (cluster.labelWidth || 240) / 2}
                      y={cluster.labelY - totalHeight / 2 - 18}
                      width={cluster.labelWidth || 240}
                      height={
                        totalHeight +
                        (cluster.transdirectional ? 58 : 38)
                      }
                      fill="transparent"
                    />

                    <text
                      x={cluster.labelX}
                      y={cluster.labelY - totalHeight / 2}
                      textAnchor="middle"
                      className="entry-cluster-title-svg"
                    >
                      {lines.map((line, index) => (
                        <tspan
                          key={`${cluster.id}-${index}`}
                          x={cluster.labelX}
                          dy={index === 0 ? 0 : lineHeight}
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>

                    {cluster.transdirectional && (
                      <text
                        x={cluster.labelX}
                        y={cluster.labelY + totalHeight / 2 + 26}
                        textAnchor="middle"
                        className="entry-cluster-transdirectional-svg"
                      >
                        Cluster transdirectionnel
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )}

          {activeCluster !== null && (
            <g className="entry-node-labels-open-cluster" pointerEvents="none">
              {activeNodeLabels.map(item => {
                const lines = wrapLabel(item.node.label, 28)
                const boxWidth = 230
                const boxHeight = Math.max(34, 14 + lines.length * 14)
                const boxX =
                  item.side === 'left'
                    ? item.x - boxWidth
                    : item.x
                const boxY = item.y - boxHeight / 2

                const textX =
                  item.side === 'left'
                    ? item.x - 9
                    : item.x + 9

                return (
                  <g key={`open-label-${item.node.id}`}>
                    <line
                      x1={item.node.x}
                      y1={item.node.y}
                      x2={item.x}
                      y2={item.y}
                      className="entry-open-label-link"
                    />

                    <rect
                      x={boxX}
                      y={boxY}
                      width={boxWidth}
                      height={boxHeight}
                      rx="8"
                      className="entry-open-label-bg"
                    />

                    <text
                      x={textX}
                      y={item.y - ((lines.length - 1) * 14) / 2}
                      textAnchor={item.side === 'left' ? 'end' : 'start'}
                      className="entry-open-node-label"
                    >
                      {lines.map((line, index) => (
                        <tspan
                          key={`${item.node.id}-${index}`}
                          x={textX}
                          dy={index === 0 ? 0 : 14}
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                )
              })}
            </g>
          )}

          {labelNode && (
            <g className="entry-node-label" pointerEvents="none">
              <text
                x={labelNode.x + 18}
                y={labelNode.y - 16}
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
          min-height:700px;
          overflow:hidden;
          border-radius:18px;
          background:
            radial-gradient(circle at 50% 40%,rgba(241,245,251,.92),rgba(255,255,255,0) 44%),
            linear-gradient(180deg,#ffffff 0%,#fbfcfe 100%);
        }

        .gephi-entry-svg{
          display:block;
          width:100%;
          height:clamp(690px,76vh,820px);
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
          font-size:22px;
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
          font-size:13px;
          font-style:italic;
          font-weight:680;
          paint-order:stroke;
          stroke:#ffffff;
          stroke-width:4px;
          pointer-events:none;
        }

        .entry-cluster-label{
          cursor:pointer;
          outline:none;
        }

        .entry-cluster-title-svg{
          fill:#142f55;
          font-size:28px;
          font-weight:880;
          letter-spacing:-.15px;
          paint-order:stroke;
          stroke:#ffffff;
          stroke-width:5px;
          stroke-linejoin:round;
          pointer-events:none;
        }

        .entry-cluster-transdirectional-svg{
          fill:#61738c;
          font-size:12px;
          font-style:italic;
          font-weight:750;
          paint-order:stroke;
          stroke:#ffffff;
          stroke-width:4px;
          pointer-events:none;
        }

        .entry-open-label-link{
          stroke:#8295ad;
          stroke-width:1.1;
          opacity:.65;
          vector-effect:non-scaling-stroke;
        }

        .entry-open-label-bg{
          fill:rgba(255,255,255,.94);
          stroke:rgba(203,213,225,.9);
          stroke-width:1;
          vector-effect:non-scaling-stroke;
        }

        .entry-node-label text{
          fill:#0f2748;
          font-size:13px;
          font-weight:850;
          paint-order:stroke;
          stroke:#ffffff;
          stroke-width:5px;
          stroke-linejoin:round;
        }

        .entry-open-node-label{
          fill:#0b2447;
          font-size:12px;
          font-weight:840;
          paint-order:normal;
          stroke:none;
        }

        .entry-family-legend{
          position:absolute;
          z-index:6;
          top:72px;
          right:68px;
          left:auto;
          bottom:auto;
          display:flex;
          flex-wrap:wrap;
          justify-content:flex-end;
          gap:10px 15px;
          max-width:min(62%, 760px);
          padding:10px 13px;
          border:1px solid #dbe4f0;
          border-radius:11px;
          background:rgba(255,255,255,.96);
          color:#46607f;
          font-size:11px;
          font-weight:740;
          box-shadow:0 4px 14px rgba(15,46,85,.07);
        }

        .entry-family-legend span{
          display:flex;
          align-items:center;
          gap:6px;
        }

        .entry-family-legend i{
          width:11px;
          height:11px;
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
          font-size:28px;
          line-height:1.06;
          font-weight:860;
          letter-spacing:-.15px;
        }

        .entry-cluster-card span{
          color:#6b7b91;
          font-size:15px;
          line-height:1.12;
          font-style:italic;
          font-weight:680;
        }


        /* Bloc d'introduction latéral — proportions validées */
        .sidebar-intro-visual{
          display:block!important;
          width:118px!important;
          max-width:62%!important;
          height:auto!important;
          object-fit:contain!important;
          margin:2px auto 16px!important;
        }

        .sidebar-intro-title{
          display:block!important;
          max-width:210px!important;
          margin-left:auto!important;
          margin-right:auto!important;
          text-align:left!important;
        }

        /* ONGLET 1 — finalisation lisibilité */
        .expertise-screen .expertise-transition-banner{
          display:none!important;
        }

        .expertise-screen>.graph-workspace{
          padding-top:10px!important;
        }

        .expertise-screen aside,
        .expertise-screen .sidebar,
        .expertise-screen .left-sidebar,
        .expertise-screen .workspace-sidebar{
          padding-top:12px!important;
        }

        .expertise-screen aside h1,
        .expertise-screen aside h2,
        .expertise-screen aside h3{
          word-break:normal!important;
        }

        .expertise-screen aside{
          overflow-wrap:anywhere;
        }

        .expertise-screen aside .sidebar-section,
        .expertise-screen .workspace-sidebar .sidebar-section{
          margin-bottom:10px!important;
        }



                /* ONGLET 1 — entrée immersive : priorité visuelle au graphe */
        .expertise-screen>.graph-workspace{
          padding:14px 18px 10px!important;
        }

        .expertise-screen .expertise-transition-banner{
          grid-template-columns:minmax(0,1fr) 190px!important;
          gap:14px!important;
          margin:0 0 10px!important;
          padding:11px 16px!important;
          min-height:0!important;
          border-radius:12px!important;
        }

        .expertise-screen .expertise-transition-kicker{
          margin:0 0 4px!important;
          font-size:9px!important;
        }

        .expertise-screen .expertise-transition-copy h2{
          margin:0 0 4px!important;
          font-size:21px!important;
          line-height:1.08!important;
        }

        .expertise-screen .expertise-transition-copy p{
          max-width:900px!important;
          font-size:12.5px!important;
          line-height:1.35!important;
        }

        .expertise-screen .expertise-transition-art{
          height:72px!important;
        }

        .expertise-screen .expertise-transition-art img{
          max-width:240px!important;
        }

        .expertise-screen .workspace-toolbar{
          margin-bottom:2px!important;
        }

        .expertise-screen .workspace-toolbar h1{
          font-size:26px!important;
          margin-bottom:4px!important;
        }

        .expertise-screen .workspace-subtitle{
          margin-bottom:5px!important;
        }

        @media(max-width:1180px){
          .expertise-screen .expertise-transition-banner{
            grid-template-columns:minmax(0,1fr) 150px!important;
          }
          .expertise-screen .expertise-transition-art{
            height:62px!important;
            justify-content:flex-end!important;
          }
        }

        @media(max-width:1380px){
          .entry-cluster-title-svg{
            font-size:24px;
          }
          .entry-cluster-transdirectional-svg{
            font-size:11px;
          }

          .gephi-entry-svg{
            height:700px;
          }

          .entry-cluster-card strong{
            font-size:22px;
          }
        }

        @media(max-width:820px){
          .gephi-entry-svg{
            height:570px;
          }

          .entry-family-legend{
            top:auto;
            right:14px;
            left:14px;
            bottom:14px;
            max-width:none;
            justify-content:flex-start;
          }

          .gephi-view-switch{
            max-width:calc(100% - 28px);
          }

          .gephi-view-switch button{
            padding:6px 8px;
            font-size:9px;
          }

          .entry-cluster-card strong{
            font-size:18px;
          }

          .entry-cluster-card span{
            font-size:10px;
          }
        }
      `}</style>
    </section>
  )
}
