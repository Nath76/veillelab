import React, { useMemo, useRef, useState, useEffect } from 'react'
import Icon from './Icon.jsx'

// Modèle B — constellations contrôlées.
// Les centres de clusters sont fixes : le graphe conserve la même géographie
// d'une ouverture à l'autre. Les nœuds d'un cluster occupent des orbites
// déterministes autour de leur hub.
export const EXPERTISE_CLUSTERS = [
  {id:'cynotech', label:'Cynotechnie et savoirs opérationnels', color:'#7C5CFA'},
  {id:'cyber', label:'Cyber et influence', color:'#3B82F6'},
  {id:'mineurs', label:'Mineurs et statistiques', color:'#06B6D4'},
  {id:'territorial', label:'Analyse territoriale et sécurité locale', color:'#F59E0B'},
  {id:'innovation', label:'Innovation et technologies de sécurité', color:'#14B86A'},
  {id:'metiers', label:'Métiers publics et récits professionnels', color:'#EC4899'},
  {id:'audit', label:'Audit et modernisation', color:'#EF4444'},
  {id:'criminologie', label:'Recherche criminologique appliquée', color:'#64748B'},
  {id:'insecurite', label:'Insécurité et quartiers prioritaires', color:'#0F766E'},
  {id:'radicalites', label:'Radicalités et terrorisme', color:'#D97706'},
]

const clusterMap=Object.fromEntries(EXPERTISE_CLUSTERS.map(x=>[x.id,x]))

export function expertiseCluster(node){
  const text=`${node.label} ${(node.domains||[]).join(' ')}`.toLowerCase()
  const has=(...parts)=>parts.some(p=>text.includes(p))
  if(has('radical','terror')) return 'radicalites'
  if(has('cynoph','savoir-faire opérationnel','capacité opérationnelle','subaquatique')) return 'cynotech'
  if(has('mineur','juvén','victimes et mis en cause','nomenclatures infractionnelles','séries statistiques','statistique')) return 'mineurs'
  if(has('cyber','hacktiv','informationnel','influence','numérique','intrusion','espaces cybercriminels')) return 'cyber'
  if(has('innovation','technolog','ia ',' ia','intelligence artificielle','industrialisation','partenariats public-académique','actifs immatériels')) return 'innovation'
  if(has('métier','parcours professionnel','podcast','culture professionnelle','visibilité de l’action préfectorale','situations professionnelles')) return 'metiers'
  if(has('audit','recommandations interadministratives','doctrines de prévention','gouvernance multi-niveaux','changement climatique','tourisme')) return 'audit'
  if(has('criminolog','recherche appliquée','profils sociodémographiques','données policières à des fins de recherche')) return 'criminologie'
  if(has('insécurité','quartiers prioritaires','victimation','ressentis de sécurité')) return 'insecurite'
  return 'territorial'
}

export function selectOverviewExpertises(nodes,max=60){
  const score=n=>(n.degree||0)+(n.publication_count||0)
  const groups={}; nodes.forEach(n=>(groups[expertiseCluster(n)]??=[]).push(n))
  const chosen=[]; const seen=new Set()
  EXPERTISE_CLUSTERS.forEach(c=>{
    ;(groups[c.id]||[]).sort((a,b)=>score(b)-score(a)).slice(0,8).forEach(n=>{if(!seen.has(n.id)){seen.add(n.id);chosen.push(n)}})
  })
  ;[...nodes].sort((a,b)=>score(b)-score(a)).forEach(n=>{if(chosen.length<max&&!seen.has(n.id)){seen.add(n.id);chosen.push(n)}})
  return chosen.slice(0,Math.max(max,80))
}

// Géographie stable du modèle B, pensée pour le viewBox 1180 × 760.
const centers={
  mineurs:[210,155],
  insecurite:[470,135],
  cynotech:[760,150],
  territorial:[980,215],
  audit:[185,425],
  cyber:[470,400],
  radicalites:[785,405],
  criminologie:[1010,465],
  innovation:[345,650],
  metiers:[720,640],
}

const clusterRadius={
  mineurs:104, insecurite:105, cynotech:108, territorial:104,
  audit:108, cyber:112, radicalites:110, criminologie:104,
  innovation:108, metiers:110,
}

function wrap(text,max=24){
  const words=String(text).split(/\s+/); const lines=[]; let line=''
  words.forEach(w=>{const next=(line+' '+w).trim(); if(next.length>max&&line){lines.push(line);line=w}else line=next})
  if(line) lines.push(line); return lines.slice(0,4)
}

function scoreNode(n){return (n.degree||0)+(n.publication_count||0)}

function overviewPositions(nodes){
  const by={}; nodes.forEach(n=>(by[expertiseCluster(n)]??=[]).push(n))
  const out={}
  Object.entries(by).forEach(([cluster,list])=>{
    const [cx,cy]=centers[cluster]||[590,380]
    const sorted=[...list].sort((a,b)=>scoreNode(b)-scoreNode(a)||String(a.id).localeCompare(String(b.id)))
    sorted.forEach((n,i)=>{
      if(i===0){out[n.id]={x:cx,y:cy,hub:true,cluster};return}
      // Deux couronnes fixes. Le nombre de points de chaque couronne ne dépend
      // que du rang du nœud, ce qui stabilise la perception du cluster.
      const ring=i<=7?1:2
      const ringIndex=ring===1?i-1:i-8
      const ringCount=ring===1?7:Math.max(1,Math.min(10,sorted.length-8))
      const phase=(cluster.length%7)*0.11
      const angle=-Math.PI/2+phase+(Math.PI*2*ringIndex/ringCount)
      const r=ring===1?58:90
      out[n.id]={x:cx+Math.cos(angle)*r,y:cy+Math.sin(angle)*r,hub:false,cluster}
    })
  })
  return out
}

function focusPositions(nodes,selectedId){
  const out={}; const cx=590,cy=385
  const selected=nodes.find(n=>n.id===selectedId)
  if(!selected) return overviewPositions(nodes)
  out[selected.id]={x:cx,y:cy,hub:true,cluster:expertiseCluster(selected)}
  const rest=nodes.filter(n=>n.id!==selected.id).sort((a,b)=>scoreNode(b)-scoreNode(a))
  rest.forEach((n,i)=>{
    const ring=i<8?1:2
    const ringIndex=ring===1?i:i-8
    const ringCount=ring===1?Math.min(8,rest.length):Math.max(1,rest.length-8)
    const angle=-Math.PI/2+(Math.PI*2*ringIndex/ringCount)+(ring===2?.16:0)
    const r=ring===1?182:245
    out[n.id]={x:cx+Math.cos(angle)*r,y:cy+Math.sin(angle)*r,hub:false,cluster:expertiseCluster(n)}
  })
  return out
}

function clusterLabelPosition(id){
  const [x,y]=centers[id]||[590,380]
  const r=clusterRadius[id]||105
  return {x,y:y-r-23}
}

function overviewStructureEdges(visible,positions){
  const by={}
  visible.forEach(n=>{const c=expertiseCluster(n);(by[c]??=[]).push(n)})
  const out=[]
  Object.entries(by).forEach(([cluster,list])=>{
    const sorted=[...list].sort((a,b)=>scoreNode(b)-scoreNode(a)||String(a.id).localeCompare(String(b.id)))
    if(!sorted.length) return
    const hub=sorted[0]
    const satellites=sorted.slice(1,8)
    satellites.forEach((n,idx)=>{
      out.push({source:hub.id,target:n.id,cluster,kind:'hub'})
      if(satellites.length>2){
        const next=satellites[(idx+1)%satellites.length]
        out.push({source:n.id,target:next.id,cluster,kind:'ring'})
      }
      if(satellites.length>4){
        const far=satellites[(idx+3)%satellites.length]
        if(n.id<far.id) out.push({source:n.id,target:far.id,cluster,kind:'mesh'})
      }
    })
  })
  return out
}

export default function ExpertiseConstellation({nodes,edges,selected,onSelect,nodeSize=1,linkDensity=1,resetToken=0,fitToken=0}){
  const [scale,setScale]=useState(1),[pan,setPan]=useState({x:0,y:0})
  const drag=useRef(null)
  useEffect(()=>{setScale(1);setPan({x:0,y:0})},[resetToken,fitToken,selected?.id])

  const visible=useMemo(()=>{
    if(selected){
      const ids=new Set([selected.id,...(selected.associated||[]).slice(0,14).map(a=>a.id)])
      return nodes.filter(n=>ids.has(n.id))
    }
    return selectOverviewExpertises(nodes,80)
  },[nodes,selected])

  const ids=useMemo(()=>new Set(visible.map(n=>n.id)),[visible])
  const visibleEdges=useMemo(()=>edges
    .filter(e=>ids.has(e.source)&&ids.has(e.target))
    .sort((a,b)=>(b.count||0)-(a.count||0))
    .slice(0,220),[edges,ids])
  const positions=useMemo(()=>selected?focusPositions(visible,selected.id):overviewPositions(visible),[visible,selected])
  const activeCluster=selected?expertiseCluster(selected):null
  const visibleClusters=useMemo(()=>new Set(visible.map(expertiseCluster)),[visible])
  const structureEdges=useMemo(()=>selected?[]:overviewStructureEdges(visible,positions),[selected,visible,positions])

  return <div className="constellation-shell model-b">
    <svg className="constellation-svg" viewBox="0 0 1180 760"
      onWheel={e=>{e.preventDefault();setScale(s=>Math.max(.58,Math.min(1.7,s+(e.deltaY<0?.08:-.08))))}}
      onPointerDown={e=>{
        const interactive=e.target.closest?.('.constellation-node, .constellation-edge, .graph-tools')
        if(interactive) return
        drag.current={x:e.clientX,y:e.clientY,pan}
        e.currentTarget.setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={e=>{if(drag.current&&e.buttons){setPan({x:drag.current.pan.x+(e.clientX-drag.current.x),y:drag.current.pan.y+(e.clientY-drag.current.y)})}}}
      onPointerUp={e=>{drag.current=null;try{e.currentTarget.releasePointerCapture?.(e.pointerId)}catch{}}}
      onPointerCancel={()=>drag.current=null}
      onPointerLeave={()=>drag.current=null}>
      <defs>
        <filter id="expertise-halo-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14"/>
        </filter>
        <filter id="expertise-halo-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7"/>
        </filter>
        {EXPERTISE_CLUSTERS.map(c=><radialGradient key={`gradient-${c.id}`} id={`expertise-halo-${c.id}`} cx="50%" cy="48%" r="52%">
          <stop offset="0%" stopColor={c.color} stopOpacity="0.44"/>
          <stop offset="28%" stopColor={c.color} stopOpacity="0.34"/>
          <stop offset="56%" stopColor={c.color} stopOpacity="0.20"/>
          <stop offset="84%" stopColor={c.color} stopOpacity="0.09"/>
          <stop offset="100%" stopColor={c.color} stopOpacity="0"/>
        </radialGradient>)}
      </defs>
      <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>

        {!selected && EXPERTISE_CLUSTERS.filter(c=>visibleClusters.has(c.id)).map(c=>{
          const [x,y]=centers[c.id]
          const r=clusterRadius[c.id]
          const label=clusterLabelPosition(c.id)
          return <g key={`halo-${c.id}`} className="controlled-cluster">
            <ellipse className="cluster-halo halo-shadow" cx={x} cy={y+3} rx={r+42} ry={r+38} fill={`url(#expertise-halo-${c.id})`} filter="url(#expertise-halo-blur)"/>
            <ellipse className="cluster-halo halo-core" cx={x} cy={y} rx={r+16} ry={r+12} fill={`url(#expertise-halo-${c.id})`} filter="url(#expertise-halo-soft)"/>
            <text className="controlled-cluster-name pointer-pass" x={label.x} y={label.y} textAnchor="middle">
              {wrap(c.label,27).map((line,i)=><tspan key={i} x={label.x} dy={i?18:0}>{line}</tspan>)}
            </text>
          </g>
        })}

        {!selected && structureEdges.map((e,idx)=>{
          const a=positions[e.source],b=positions[e.target]; if(!a||!b) return null
          const clusterColor=clusterMap[e.cluster]?.color || '#9AA9BD'
          return <line key={`structure-${idx}-${e.source}-${e.target}`}
            className={`constellation-edge structure-edge pointer-pass ${e.kind}`}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            style={{stroke:clusterColor,opacity:e.kind==='hub'?0.72:(e.kind==='ring'?0.46:0.32)}}/>
        })}

        {visibleEdges.map(e=>{
          const a=positions[e.source],b=positions[e.target]; if(!a||!b)return null
          const active=selected&&(e.source===selected.id||e.target===selected.id)
          const sameCluster=a.cluster===b.cluster
          const relationColor=active?'#2E4F8D':sameCluster?(clusterMap[a.cluster]?.color||'#8FA4C2'):'#9AA9BD'
          return <line key={`${e.source}-${e.target}`}
            className={`constellation-edge pointer-pass ${active?'active':''} ${sameCluster?'intra':'inter'}`}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            style={{stroke:relationColor,opacity:selected?(active?.98:.34):sameCluster?Math.min(.78,.52*linkDensity):Math.min(.48,.29*linkDensity)}}/>
        })}

        {visible.map(n=>{
          const p=positions[n.id]; if(!p)return null
          const c=clusterMap[expertiseCluster(n)]||EXPERTISE_CLUSTERS[0]
          const isSel=selected?.id===n.id
          const base=p.hub?19:8.5
          const r=base*nodeSize*(isSel?1.45:1)
          const lines=wrap(n.label,28)
          const lx=p.x+(p.x<590?-18:18)
          const ly=p.y+(p.y<385?-18:28)
          return <g key={n.id} className={`constellation-node ${p.hub?'hub':''} ${isSel?'selected':''}`}
            role="button" tabIndex={0}
            onPointerDown={e=>e.stopPropagation()}
            onClick={e=>{e.stopPropagation();onSelect(n)}}
            onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onSelect(n)}}}>
            <title>{n.label}</title>
            <circle className="node-hit-target" cx={p.x} cy={p.y} r={Math.max(r+10,18)} fill="transparent"/>
            {p.hub&&!selected&&<circle className="hub-ring pointer-pass" cx={p.x} cy={p.y} r={r+9} fill="none" stroke={c.color}/>} 
            {isSel&&<circle className="selection-halo pointer-pass" cx={p.x} cy={p.y} r={r+20} fill={c.color}/>} 
            <circle cx={p.x} cy={p.y} r={r} fill={c.color}/>
            {selected&&<text x={lx} y={ly} textAnchor={p.x<590?'end':'start'} className={`node-label pointer-pass ${isSel?'selected-label':''}`}>
              {lines.map((line,i)=><tspan key={i} x={lx} dy={i?17:0}>{line}</tspan>)}
            </text>}
          </g>
        })}
      </g>
    </svg>
    <div className="graph-tools vertical"><button onClick={()=>setScale(s=>Math.min(1.7,s+.12))} title="Zoom avant"><Icon name="plus"/></button><button onClick={()=>setScale(s=>Math.max(.58,s-.12))} title="Zoom arrière"><Icon name="minus"/></button><button onClick={()=>{setScale(1);setPan({x:0,y:0})}} title="Ajuster"><Icon name="target"/></button></div>
  </div>
}
