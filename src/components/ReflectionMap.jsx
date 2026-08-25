import React, { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'

const WORLD={w:1900,h:1180,cx:950,cy:590}
const branchColors={
  question:'#3157d8',enjeux:'#7c3aed',acteurs:'#0e7490',faisceaux:'#d97706',leviers:'#059669',tensions:'#d94f70',prolongements:'#5367c9'
}
const kindLabels={documente:'Documenté',suggestion:'Suggestion IA',question:'Question',user:'Votre ajout'}

function anglePoint(angleDeg,radius){const a=angleDeg*Math.PI/180;return{x:WORLD.cx+Math.cos(a)*radius,y:WORLD.cy+Math.sin(a)*radius}}
function uid(prefix='u'){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`}

function buildLayout(map){
 const branches=(map?.branches||[]).filter(b=>(map?.nodes||[]).some(n=>n.branch_id===b.id))
 const nodes=[]
 nodes.push({id:'__central',kind:'central',label:map?.central_question||'Question centrale',x:WORLD.cx,y:WORLD.cy,w:300,h:112,locked:true})
 const angleStart=-92
 branches.forEach((branch,bi)=>{
   const angle=angleStart+(360/branches.length)*bi
   const bp=anglePoint(angle,270)
   nodes.push({id:`__branch_${branch.id}`,branch_id:branch.id,kind:'branch',label:branch.label,x:bp.x,y:bp.y,w:220,h:66,locked:true})
   const group=(map.nodes||[]).filter(n=>n.branch_id===branch.id)
   const byId=new Map(group.map(n=>[n.id,n]))
   const pos=new Map()
   group.forEach((n,i)=>{
     const parent=byId.get(n.parent_id)
     let p
     if(parent&&pos.has(parent.id)){
       const pp=pos.get(parent.id);const a=(angle+(i%2?9:-9))*Math.PI/180
       p={x:pp.x+Math.cos(a)*210,y:pp.y+Math.sin(a)*210}
     }else{
       const ring=Math.floor(i/3)
       const spread=(i%3)-1
       p=anglePoint(angle+spread*11,510+ring*190)
     }
     pos.set(n.id,p)
     nodes.push({...n,x:p.x,y:p.y,w:236,h:86})
   })
 })
 return nodes
}

function edgesFor(nodes,map){
 const byId=new Map(nodes.map(n=>[n.id,n]))
 const out=[]
 ;(map?.branches||[]).forEach(branch=>{
   const b=byId.get(`__branch_${branch.id}`);const c=byId.get('__central');if(b&&c)out.push({id:`e_c_${branch.id}`,source:c.id,target:b.id,branch_id:branch.id})
 })
 ;(map?.nodes||[]).forEach(n=>{
   const source=byId.get(n.parent_id)||byId.get(`__branch_${n.branch_id}`);const target=byId.get(n.id)
   if(source&&target)out.push({id:`e_${source.id}_${target.id}`,source:source.id,target:target.id,branch_id:n.branch_id})
 })
 return out
}

function curve(a,b){
 const dx=b.x-a.x,dy=b.y-a.y
 const c1={x:a.x+dx*.42,y:a.y+dy*.12},c2={x:a.x+dx*.74,y:a.y+dy*.88}
 return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`
}

function crossCurve(a,b){
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy))
 const mx=(a.x+b.x)/2,my=(a.y+b.y)/2
 const bend=Math.min(135,Math.max(55,len*.16))
 const nx=-dy/len,ny=dx/len
 return {path:`M ${a.x} ${a.y} Q ${mx+nx*bend} ${my+ny*bend} ${b.x} ${b.y}`,labelX:mx+nx*bend*.48,labelY:my+ny*bend*.48}
}

export default function ReflectionMap({result,onChange}){
 const [map,setMap]=useState(()=>result?.map||{})
 const [layout,setLayout]=useState(()=>buildLayout(result?.map||{}))
 const [selectedId,setSelectedId]=useState('__central')
 const [view,setView]=useState({x:0,y:0,scale:.76})
 const shellRef=useRef(null)
 const panRef=useRef(null)
 const dragRef=useRef(null)

 useEffect(()=>{
   const next=result?.map||{}
   const nextLayout=buildLayout(next)
   setMap(next);setLayout(nextLayout);setSelectedId('__central')
   const raf=requestAnimationFrame(()=>fit(nextLayout))
   return ()=>cancelAnimationFrame(raf)
 },[result])
 useEffect(()=>{onChange?.(map)},[map,onChange])
 const byId=useMemo(()=>new Map(layout.map(n=>[n.id,n])),[layout])
 const edges=useMemo(()=>edgesFor(layout,map),[layout,map])
 const selected=byId.get(selectedId)
 const crossLinks=map?.cross_links||[]
 const rebuildKeepingPositions=(nextMap,previous=layout)=>{
   const old=new Map((previous||[]).map(n=>[n.id,n]))
   return buildLayout(nextMap).map(n=>{const prev=old.get(n.id);return prev?{...n,x:prev.x,y:prev.y}:n})
 }

 const fit=(nodesToFit=layout)=>{
   const shell=shellRef.current;if(!shell||!Array.isArray(nodesToFit)||!nodesToFit.length)return
   const xs=nodesToFit.map(n=>n.x),ys=nodesToFit.map(n=>n.y)
   const minX=Math.min(...xs)-180,maxX=Math.max(...xs)+180,minY=Math.min(...ys)-120,maxY=Math.max(...ys)+120
   const rect=shell.getBoundingClientRect();const scale=Math.min(.95,Math.max(.42,Math.min(rect.width/(maxX-minX),rect.height/(maxY-minY))))
   setView({scale,x:rect.width/2-((minX+maxX)/2)*scale,y:rect.height/2-((minY+maxY)/2)*scale})
 }
 const zoom=delta=>setView(v=>({...v,scale:Math.max(.35,Math.min(1.35,v.scale+delta))}))
 const startPan=e=>{if(e.target.closest('.reflection-node'))return;panRef.current={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y};e.currentTarget.setPointerCapture?.(e.pointerId)}
 const movePan=e=>{if(!panRef.current)return;setView(v=>({...v,x:panRef.current.vx+e.clientX-panRef.current.x,y:panRef.current.vy+e.clientY-panRef.current.y}))}
 const endPan=()=>{panRef.current=null}
 const wheel=e=>{e.preventDefault();const d=e.deltaY>0?-.08:.08;setView(v=>({...v,scale:Math.max(.35,Math.min(1.35,v.scale+d))}))}
 const startDrag=(e,id)=>{const n=byId.get(id);if(!n||n.locked)return;e.stopPropagation();dragRef.current={id,x:e.clientX,y:e.clientY,nx:n.x,ny:n.y,scale:view.scale};window.addEventListener('pointermove',dragMove);window.addEventListener('pointerup',dragEnd,{once:true})}
 const dragMove=e=>{const d=dragRef.current;if(!d)return;setLayout(arr=>arr.map(n=>n.id===d.id?{...n,x:d.nx+(e.clientX-d.x)/d.scale,y:d.ny+(e.clientY-d.y)/d.scale}:n))}
 const dragEnd=()=>{dragRef.current=null;window.removeEventListener('pointermove',dragMove)}
 const patchNode=(id,patch)=>{
   const current=byId.get(id)
   if(!current)return
   if(patch.branch_id!==undefined&&patch.branch_id!==current.branch_id){
     const nextMap={...map,nodes:(map.nodes||[]).map(n=>n.id===id?{...n,...patch}:n)}
     setMap(nextMap);setLayout(prev=>rebuildKeepingPositions(nextMap,prev));return
   }
   const labelEdited=patch.label!==undefined&&patch.label!==current.label
   const turnsUser=labelEdited&&!['user','central','branch'].includes(current.kind)
   const layoutPatch=turnsUser?{...patch,kind:'user',origin_kind:current.kind,origin_provenances:current.kind==='documente'?(current.provenances||[]):[],provenances:[],chunk_ids:[]}:patch
   setMap(m=>({...m,nodes:(m.nodes||[]).map(n=>{
     if(n.id!==id)return n
     const next={...n,...patch}
     if(patch.label!==undefined&&patch.label!==n.label&&!['user','central','branch'].includes(n.kind)){
       next.origin_kind=n.kind
       if(n.kind==='documente')next.origin_provenances=n.provenances||[]
       next.kind='user';next.provenances=[];next.chunk_ids=[]
     }
     return next
   })}))
   setLayout(arr=>arr.map(n=>n.id===id?{...n,...layoutPatch}:n))
 }
 const deleteNode=id=>{
   if(id.startsWith('__'))return
   const nextMap={...map,
     nodes:(map.nodes||[]).filter(n=>n.id!==id).map(n=>n.parent_id===id?{...n,parent_id:''}:n),
     cross_links:(map.cross_links||[]).filter(l=>l.source!==id&&l.target!==id)
   }
   setMap(nextMap);setLayout(prev=>rebuildKeepingPositions(nextMap,prev));setSelectedId('__central')
 }
 const addChild=()=>{
   const base=selected&&!selected.id.startsWith('__')?selected:null
   const branchId=base?.branch_id||(selected?.branch_id)||map.branches?.[0]?.id||'question';const id=uid()
   const node={id,branch_id:branchId,parent_id:base?.id||'',kind:'user',label:'Nouvelle piste',chunk_ids:[],provenances:[]}
   const nextMap={...map,nodes:[...(map.nodes||[]),node]}
   setMap(nextMap);setLayout(prev=>rebuildKeepingPositions(nextMap,prev));setSelectedId(id)
 }
 const addNextStep=label=>{
   const clean=String(label||'').trim();if(!clean)return
   const branchId=(map.branches||[]).some(b=>b.id==='prolongements')?'prolongements':(map.branches?.[0]?.id||'question')
   const id=uid('ia');const node={id,branch_id:branchId,parent_id:'',kind:'suggestion',label:clean,chunk_ids:[],provenances:[]}
   const nextMap={...map,nodes:[...(map.nodes||[]),node],next_steps:(map.next_steps||[]).filter(s=>s!==label)}
   setMap(nextMap);setLayout(prev=>rebuildKeepingPositions(nextMap,prev));setSelectedId(id)
 }
 const addCrossLink=(source,target,label='')=>{
   if(!source||!target||source===target)return
   setMap(m=>{
     const links=m.cross_links||[]
     const duplicate=links.some(l=>(l.source===source&&l.target===target)||(l.source===target&&l.target===source))
     if(duplicate)return m
     return {...m,cross_links:[...links,{id:uid('link'),source,target,label:label.trim(),kind:'user'}]}
   })
 }
 const deleteCrossLink=id=>setMap(m=>({...m,cross_links:(m.cross_links||[]).filter(l=>l.id!==id)}))

 return <div className="reflection-shell">
   <div className="reflection-toolbar">
     <div className="reflection-legend"><span><i className="dot documented"/>Documenté</span><span><i className="dot suggestion"/>Suggestion IA</span><span><i className="dot question"/>Question</span><span><i className="dot user"/>Votre ajout</span><span><i className="link-sample"/>Lien transversal</span></div>
     <div className="reflection-tools"><button onClick={()=>zoom(.1)} title="Zoom avant"><Icon name="plus"/></button><button onClick={()=>zoom(-.1)} title="Zoom arrière"><Icon name="minus"/></button><button onClick={()=>fit()} title="Ajuster"><Icon name="target"/></button><button onClick={addChild} className="reflection-add"><Icon name="plus" size={17}/> Ajouter une idée</button></div>
   </div>
   <div className="reflection-canvas" ref={shellRef} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onWheel={wheel}>
     <div className="reflection-world" style={{width:WORLD.w,height:WORLD.h,transform:`translate(${view.x}px,${view.y}px) scale(${view.scale})`}}>
       <svg className="reflection-edges" width={WORLD.w} height={WORLD.h} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}>
         {edges.map(e=>{const a=byId.get(e.source),b=byId.get(e.target);if(!a||!b)return null;return <path className="structural-edge" key={e.id} d={curve(a,b)} style={{stroke:branchColors[e.branch_id]||'#9fb1c8'}}/>})}
         {crossLinks.map(link=>{
           const a=byId.get(link.source),b=byId.get(link.target);if(!a||!b)return null
           const g=crossCurve(a,b);const color=branchColors[a.branch_id]||'#64748b'
           return <g key={link.id} className="cross-link-group"><path className="cross-link-edge" d={g.path} style={{stroke:color}}/>{link.label&&<text className="cross-link-label" x={g.labelX} y={g.labelY} textAnchor="middle">{link.label}</text>}</g>
         })}
       </svg>
       {layout.map(n=>{
         const count=n.id.startsWith('__')?0:crossLinks.filter(l=>l.source===n.id||l.target===n.id).length
         return <MapNode key={n.id} node={n} selected={selectedId===n.id} linkCount={count} onSelect={()=>setSelectedId(n.id)} onDrag={e=>startDrag(e,n.id)}/>
       })}
     </div>
     <div className="reflection-hint">Glissez pour déplacer la carte · Molette pour zoomer · Déplacez les nœuds · Créez des liens transversaux depuis la fiche d’une idée</div>
   </div>
   <Inspector node={selected} map={map} onPatch={patchNode} onDelete={deleteNode} onAdd={addChild} onAddNextStep={addNextStep} onAddLink={addCrossLink} onDeleteLink={deleteCrossLink}/>
 </div>
}

function MapNode({node,selected,linkCount,onSelect,onDrag}){
 const color=branchColors[node.branch_id]||'#4967d9'
 const status=node.kind==='documente'?'●':node.kind==='suggestion'?'✦':node.kind==='question'?'?':node.kind==='user'?'+':''
 const cls=`reflection-node kind-${node.kind||'user'} ${selected?'selected':''}`
 return <button className={cls} style={{left:node.x-node.w/2,top:node.y-node.h/2,width:node.w,minHeight:node.h,'--branch-color':color}} onClick={onSelect} onPointerDown={e=>{onSelect();onDrag(e)}}>
   {node.kind==='branch'&&<span className="branch-accent"/>}
   {!['central','branch'].includes(node.kind)&&<span className="node-status" aria-hidden="true">{status}</span>}
   <span className="node-label-text">{node.label}</span>
   <span className="node-footer">
     {node.kind==='documente'&&node.provenances?.length>0&&<span className="node-source-count">{new Set(node.provenances.map(p=>p.publication_id)).size} source{new Set(node.provenances.map(p=>p.publication_id)).size>1?'s':''}</span>}
     {linkCount>0&&<span className="node-link-count"><Icon name="link" size={11}/>{linkCount}</span>}
   </span>
 </button>
}

function Inspector({node,map,onPatch,onDelete,onAdd,onAddNextStep,onAddLink,onDeleteLink}){
 const [targetId,setTargetId]=useState('')
 const [linkLabel,setLinkLabel]=useState('')
 useEffect(()=>{setTargetId('');setLinkLabel('')},[node?.id])
 if(!node)return <aside className="reflection-inspector"><div className="reflection-empty-inspector"><span>✦</span><strong>Sélectionnez un nœud</strong><p>Vous pourrez le modifier, le déplacer, ajouter une sous-idée, créer un lien transversal ou consulter ses sources.</p></div></aside>
 if(node.kind==='central')return <aside className="reflection-inspector"><span className="inspector-kicker">BESOIN CENTRAL</span><h3>{node.label}</h3><p className="inspector-help">La carte est un point de départ. Déplacez, supprimez, reliez ou complétez les pistes proposées.</p>{map.next_steps?.length>0&&<><h4>Prochaines directions possibles</h4><div className="next-step-list">{map.next_steps.map((s,i)=><button key={i} onClick={()=>onAddNextStep?.(s)} title="Ajouter cette piste à la carte">{s}</button>)}</div></>}</aside>
 if(node.kind==='branch')return <aside className="reflection-inspector"><span className="inspector-kicker">BRANCHE</span><h3>{node.label}</h3><p className="inspector-help">Cette branche peut rester légère : la carte ne cherche pas à remplir toutes les catégories à tout prix.</p><button className="btn primary full" onClick={onAdd}><Icon name="plus" size={16}/>Ajouter une piste</button></aside>
 const kind=node.kind||'user';const sources=node.provenances||[];const origins=node.origin_provenances||[]
 const nodeLinks=(map.cross_links||[]).filter(l=>l.source===node.id||l.target===node.id)
 const candidates=(map.nodes||[]).filter(n=>n.id!==node.id)
 const branchLabel=id=>(map.branches||[]).find(b=>b.id===id)?.label||id
 const nodeById=id=>(map.nodes||[]).find(n=>n.id===id)
 return <aside className="reflection-inspector">
   <div className="inspector-top"><span className={`map-kind-chip ${kind}`}>{kindLabels[kind]||kind}</span><button className="icon-delete" onClick={()=>onDelete(node.id)} title="Supprimer"><Icon name="close" size={17}/></button></div>
   <label className="inspector-label">Intitulé</label><textarea className="node-editor" value={node.label||''} onChange={e=>onPatch(node.id,{label:e.target.value})}/>
   <label className="inspector-label">Branche</label><select value={node.branch_id||''} onChange={e=>onPatch(node.id,{branch_id:e.target.value,parent_id:''})}>{(map.branches||[]).map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select>
   <button className="btn reflection-secondary full" onClick={onAdd}><Icon name="plus" size={16}/>Ajouter une sous-idée</button>

   <div className="cross-link-builder">
     <div className="cross-link-title"><span><Icon name="link" size={15}/></span><div><h4>Liens transversaux</h4><p>Reliez cette idée à une autre composante de la réflexion, sans imposer de causalité.</p></div></div>
     <label className="inspector-label">Relier à</label>
     <select value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">Choisir une idée…</option>{(map.branches||[]).map(branch=>{
       const group=candidates.filter(n=>n.branch_id===branch.id);if(!group.length)return null
       return <optgroup key={branch.id} label={branch.label}>{group.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}</optgroup>
     })}</select>
     <label className="inspector-label">Nom du lien <span className="optional">facultatif</span></label>
     <input className="link-label-input" value={linkLabel} onChange={e=>setLinkLabel(e.target.value)} placeholder="ex. à mettre en regard avec"/>
     <button className="btn link-create full" disabled={!targetId} onClick={()=>{onAddLink(node.id,targetId,linkLabel);setTargetId('');setLinkLabel('')}}><Icon name="link" size={15}/>Créer le lien</button>
     {nodeLinks.length>0&&<div className="existing-links">{nodeLinks.map(link=>{
       const other=nodeById(link.source===node.id?link.target:link.source);if(!other)return null
       return <div className="existing-link" key={link.id}><span className="link-branch-dot" style={{background:branchColors[other.branch_id]||'#64748b'}}/><div><strong>{other.label}</strong><small>{link.label||`Lien avec ${branchLabel(other.branch_id)}`}</small></div><button onClick={()=>onDeleteLink(link.id)} title="Supprimer le lien"><Icon name="close" size={13}/></button></div>
     })}</div>}
   </div>

   {sources.length>0&&<SourceList title="Preuves documentaires" sources={sources}/>} 
   {!sources.length&&origins.length>0&&<SourceList title="Sources d’origine avant modification" sources={origins} muted/>}
   {kind==='user'&&node.origin_kind==='suggestion'&&<div className="controlled-note"><span>+</span><p>Cette idée provient d’une suggestion IA que vous avez modifiée. Elle est désormais considérée comme votre contribution.</p></div>}
   {kind==='user'&&node.origin_kind==='question'&&<div className="controlled-note question"><span>+</span><p>Cette idée provient d’une question IA que vous avez reformulée. Elle est désormais considérée comme votre contribution.</p></div>}
   {kind==='suggestion'&&<div className="controlled-note"><span>✦</span><p>Cette piste est proposée par l’IA pour stimuler la réflexion. Elle n’est pas présentée comme un fait documenté.</p></div>}
   {kind==='question'&&<div className="controlled-note question"><span>?</span><p>Cette question sert à ouvrir ou déplacer la réflexion. Elle n’est pas une conclusion du corpus.</p></div>}
 </aside>
}

function SourceList({title,sources,muted=false}){
 const grouped=[];const seen=new Set()
 sources.forEach(p=>{const label=p.type==='timecode'?(p.label||''):(p.label?`p. ${p.label}`:(p.page?`p. ${p.page}`:''));const key=`${p.publication_id}|${label}`;if(seen.has(key))return;seen.add(key);grouped.push({...p,_label:label})})
 return <div className={`map-sources ${muted?'muted':''}`}><h4>{title}</h4>{grouped.map((p,i)=><a key={i} href={p.url||'#'} target="_blank" rel="noreferrer"><span className="source-id">{p.publication_id}</span><span><strong>{p._label||'Source'}</strong><small>{p.titre}</small></span><Icon name="external" size={15}/></a>)}</div>
}
