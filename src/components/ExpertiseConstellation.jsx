import React, { useMemo, useRef, useState, useEffect } from 'react'
import Icon from './Icon.jsx'

export const EXPERTISE_CLUSTERS = [
  {id:'cynotech', label:'Cynotechnie et savoirs opérationnels', color:'#7557d9'},
  {id:'cyber', label:'Cyber et influence', color:'#f05a36'},
  {id:'mineurs', label:'Mineurs et statistiques', color:'#2d8fe8'},
  {id:'territorial', label:'Analyse territoriale et sécurité locale', color:'#ffad19'},
  {id:'innovation', label:'Innovation et technologies de sécurité', color:'#20af6e'},
  {id:'metiers', label:'Métiers publics et récits professionnels', color:'#df46c8'},
  {id:'audit', label:'Audit et modernisation', color:'#e13b34'},
  {id:'criminologie', label:'Recherche criminologique appliquée', color:'#777b83'},
  {id:'insecurite', label:'Insécurité et quartiers prioritaires', color:'#13aaa8'},
  {id:'radicalites', label:'Radicalités et terrorisme', color:'#a38c28'},
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
    ;(groups[c.id]||[]).sort((a,b)=>score(b)-score(a)).slice(0,3).forEach(n=>{if(!seen.has(n.id)){seen.add(n.id);chosen.push(n)}})
  })
  ;[...nodes].sort((a,b)=>score(b)-score(a)).forEach(n=>{if(chosen.length<max&&!seen.has(n.id)){seen.add(n.id);chosen.push(n)}})
  return chosen.slice(0,max)
}

const centers={
  mineurs:[360,190], insecurite:[665,125], cynotech:[955,210], territorial:[260,430],
  audit:[600,455], cyber:[890,410], radicalites:[220,655], criminologie:[445,670],
  innovation:[730,660], metiers:[1010,625]
}

function wrap(text,max=23){
  const words=String(text).split(/\s+/); const lines=[]; let line=''
  words.forEach(w=>{const next=(line+' '+w).trim(); if(next.length>max&&line){lines.push(line);line=w}else line=next})
  if(line) lines.push(line); return lines.slice(0,4)
}

function overviewPositions(nodes){
  const by={}; nodes.forEach(n=>(by[expertiseCluster(n)]??=[]).push(n))
  const out={}
  Object.entries(by).forEach(([cluster,list])=>{
    const [cx,cy]=centers[cluster]||[600,380]
    const sorted=[...list].sort((a,b)=>(b.degree+b.publication_count)-(a.degree+a.publication_count))
    sorted.forEach((n,i)=>{
      if(i===0){out[n.id]={x:cx,y:cy,hub:true};return}
      const ring=i<=10?1:2
      const ringIndex=ring===1?i-1:i-11
      const ringCount=ring===1?Math.min(10,Math.max(1,sorted.length-1)):Math.max(1,sorted.length-11)
      const angle=-Math.PI/2+(Math.PI*2*ringIndex/ringCount)+(ring===2?.18:0)
      const r=ring===1?78:122
      out[n.id]={x:cx+Math.cos(angle)*r,y:cy+Math.sin(angle)*r,hub:false}
    })
  })
  return out
}

function focusPositions(nodes,selectedId){
  const out={}; const cx=585,cy=390
  const selected=nodes.find(n=>n.id===selectedId)
  if(!selected) return overviewPositions(nodes)
  out[selected.id]={x:cx,y:cy,hub:true}
  const rest=nodes.filter(n=>n.id!==selected.id)
  rest.forEach((n,i)=>{
    const angle=-Math.PI/2+(Math.PI*2*i/Math.max(1,rest.length))
    const r=210+(i%2)*18
    out[n.id]={x:cx+Math.cos(angle)*r,y:cy+Math.sin(angle)*r,hub:false}
  })
  return out
}

export default function ExpertiseConstellation({nodes,edges,selected,onSelect,nodeSize=1,linkDensity=1,resetToken=0,fitToken=0}){
  const [scale,setScale]=useState(1),[pan,setPan]=useState({x:0,y:0})
  const drag=useRef(null)
  useEffect(()=>{setScale(1);setPan({x:0,y:0})},[resetToken,fitToken,selected?.id])

  const visible=useMemo(()=>{
    if(selected){
      const ids=new Set([selected.id,...(selected.associated||[]).slice(0,10).map(a=>a.id)])
      return nodes.filter(n=>ids.has(n.id))
    }
    return selectOverviewExpertises(nodes,60)
  },[nodes,selected])
  const ids=new Set(visible.map(n=>n.id))
  const visibleEdges=useMemo(()=>edges.filter(e=>ids.has(e.source)&&ids.has(e.target)).sort((a,b)=>b.count-a.count).slice(0,120),[edges,visible])
  const positions=useMemo(()=>selected?focusPositions(visible,selected.id):overviewPositions(visible),[visible,selected])
  const activeCluster=selected?expertiseCluster(selected):null

  const viewNodes=selected ? visible : visible
  return <div className="constellation-shell">
    <svg className="constellation-svg" viewBox="0 0 1180 760"
      onWheel={e=>{e.preventDefault();setScale(s=>Math.max(.55,Math.min(1.8,s+(e.deltaY<0?.08:-.08))))}}
      onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY,pan};e.currentTarget.setPointerCapture?.(e.pointerId)}}
      onPointerMove={e=>{if(drag.current&&e.buttons){setPan({x:drag.current.pan.x+(e.clientX-drag.current.x),y:drag.current.pan.y+(e.clientY-drag.current.y)})}}}
      onPointerUp={()=>drag.current=null} onPointerLeave={()=>drag.current=null}>
      <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
        {!selected && EXPERTISE_CLUSTERS.map((c,idx)=>{
          const [x,y]=centers[c.id]
          return <g className="cluster-label" key={c.id} transform={`translate(${x-112},${y-126})`} pointerEvents="none">
            <rect width="31" height="31" rx="6" fill={c.color}/><text x="15.5" y="21" textAnchor="middle" className="cluster-number">{idx+1}</text>
            <text x="42" y="14" className="cluster-name">{wrap(c.label,22).map((line,i)=><tspan key={i} x="42" dy={i?23:0}>{line}</tspan>)}</text>
          </g>
        })}
        {selected && [...EXPERTISE_CLUSTERS].filter(c=>c.id!==activeCluster).slice(0,7).map((c,idx)=>{
          const p=centers[c.id]; return <g key={c.id} className="ghost-cluster" transform={`translate(${p[0]},${p[1]})`}><circle r="24" fill={c.color}/>{[0,1,2,3,4,5].map(i=><circle key={i} cx={Math.cos(i*Math.PI/3)*52} cy={Math.sin(i*Math.PI/3)*52} r="9" fill={c.color}/>)}</g>
        })}
        {visibleEdges.map(e=>{const a=positions[e.source],b=positions[e.target]; if(!a||!b)return null; const active=selected&&(e.source===selected.id||e.target===selected.id); return <line pointerEvents="none" key={`${e.source}-${e.target}`} className={`constellation-edge ${active?'active':''}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} style={{opacity:selected?(active?.96:.28):Math.min(.92,.48*linkDensity)}}/>})}
        {viewNodes.map(n=>{
          const p=positions[n.id]; if(!p)return null
          const c=clusterMap[expertiseCluster(n)]||EXPERTISE_CLUSTERS[0]
          const isSel=selected?.id===n.id
          const r=(p.hub?25:12)*nodeSize*(isSel?1.45:1)
          const lines=wrap(n.label,26)
          return <g key={n.id} className={`constellation-node ${isSel?'selected':''}`} role="button" tabIndex="0" aria-label={n.label}
            onPointerDown={e=>e.stopPropagation()}
            onClick={e=>{e.stopPropagation();onSelect(n)}}
            onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(n)}}}>
            <circle className="node-hit-target" cx={p.x} cy={p.y} r={Math.max(r+10,24)} fill="transparent"/>
            {!selected&&p.hub&&<circle className="cluster-halo halo-outer" cx={p.x} cy={p.y} r={r+48} fill={c.color} opacity=".07" pointerEvents="none"/>}
            {!selected&&p.hub&&<circle className="cluster-halo halo-inner" cx={p.x} cy={p.y} r={r+31} fill={c.color} opacity=".09" pointerEvents="none"/>}
            {isSel&&<circle className="cluster-halo selected-halo" cx={p.x} cy={p.y} r={r+23} fill={c.color} opacity=".14" pointerEvents="none"/>}
            <circle cx={p.x} cy={p.y} r={r} fill={c.color} pointerEvents="none"/>
            {selected&&<text x={p.x+(p.x<585?-18:18)} y={p.y+(p.y<390?-18:30)} textAnchor={p.x<585?'end':'start'} className={`node-label ${isSel?'selected-label':''}`}>{lines.map((line,i)=><tspan key={i} x={p.x+(p.x<585?-18:18)} dy={i?17:0}>{line}</tspan>)}</text>}
          </g>
        })}
      </g>
    </svg>
    <div className="graph-tools vertical"><button onClick={()=>setScale(s=>Math.min(1.8,s+.12))}><Icon name="plus"/></button><button onClick={()=>setScale(s=>Math.max(.55,s-.12))}><Icon name="minus"/></button><button onClick={()=>{setScale(1);setPan({x:0,y:0})}}><Icon name="target"/></button></div>
  </div>
}
