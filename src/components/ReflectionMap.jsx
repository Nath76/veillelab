import React, { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'

const WORLD={w:1540,h:1080}
const LATE_BRANCHES=new Set(['tensions','prolongements'])
const DEFAULT_PREVIEW_OPEN=new Set(['question','enjeux'])
const branchColors={question:'#175ee5',enjeux:'#175ee5',acteurs:'#4f83e9',faisceaux:'#4f83e9',leviers:'#4f83e9',tensions:'#98a2b3',prolongements:'#98a2b3'}
const branchIcons={question:'?',enjeux:'⚖',acteurs:'◎',faisceaux:'⌘',leviers:'↗',tensions:'◌',prolongements:'↗'}
const kindLabels={documente:'Documenté',suggestion:'Suggestion IA',question:'Question',user:'Votre ajout'}
const branchSummaries={
  question:'Cette rubrique pose le cadre et clarifie les contours du problème à traiter. Elle structure les sous-questions et les incertitudes clés à instruire.',
  enjeux:'Cette rubrique met en évidence ce qui est en jeu : effets attendus, tensions d’action publique, arbitrages et points de vigilance.',
  acteurs:'Cette rubrique fait apparaître les acteurs documentés, leurs rôles et les positions utiles à la réflexion.',
  faisceaux:'Cette rubrique rassemble des éléments explicatifs ou associés sans imposer de causalité non établie.',
  leviers:'Cette rubrique organise les pistes d’action, moyens d’intervention et possibilités à examiner.',
  tensions:'Cette rubrique ouvre les limites, contradictions, incertitudes et dimensions encore peu documentées.',
  prolongements:'Cette rubrique ouvre la réflexion vers de nouvelles questions, comparaisons, échelles ou hypothèses à explorer.'
}

const MAP_STYLES=`
.qvl-map-shell{height:650px;display:grid;grid-template-columns:minmax(0,1fr) 292px;border:1px solid #d8e1ee;border-radius:12px;background:#fff;overflow:hidden;box-shadow:0 3px 12px rgba(31,55,91,.05)}
.qvl-map-main{min-width:0;display:flex;flex-direction:column;border-right:1px solid #e4e9f1}
.qvl-map-toolbar{height:52px;flex:0 0 52px;display:flex;justify-content:space-between;align-items:center;padding:0 18px;border-bottom:1px solid #e7ecf3;background:#fff}
.qvl-map-toolbar-left{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.04em;color:#203a65}.qvl-map-toolbar-left b{color:#26804a}
.qvl-map-metric{display:flex;align-items:center;gap:7px;color:#344c70;font-size:11px}
.qvl-map-tools{display:flex;align-items:center;gap:0;margin-left:12px;border:1px solid #d7dfeb;border-radius:7px;overflow:hidden;background:#fff}.qvl-map-tools button{width:38px;height:30px;border:0;border-right:1px solid #e1e6ed;background:#fff;color:#153b78;cursor:pointer;font-weight:800}.qvl-map-tools button:last-child{border-right:0}.qvl-map-tools .pct{width:54px;font-size:10px;color:#334a6d;display:grid;place-items:center}
.qvl-map-canvas{position:relative;flex:1;overflow:hidden;background:linear-gradient(#fff,#fff),radial-gradient(circle,#dfe7f2 1px,transparent 1px);background-size:auto,24px 24px;touch-action:none;cursor:grab}.qvl-map-canvas:active{cursor:grabbing}
.qvl-map-world{position:absolute;left:0;top:0;transform-origin:0 0}.qvl-map-edges{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}.qvl-struct-edge{fill:none;stroke-width:2.2;opacity:.95}.qvl-struct-edge.late{stroke:#bcc4cf!important;stroke-dasharray:8 7}.qvl-child-edge{fill:none;stroke-width:1.7;opacity:.58}
.qvl-ref-node{position:absolute;box-sizing:border-box;border:1px solid #c8d9fa;border-radius:12px;background:#fff;color:#15305a;box-shadow:0 3px 10px rgba(35,71,127,.06);user-select:none}.qvl-ref-node.selected{border-color:#2166ee;box-shadow:0 0 0 2px rgba(33,102,238,.10),0 8px 18px rgba(35,71,127,.08)}
.qvl-ref-central{padding:16px 15px;background:#f8fbff;border-color:#b9d0f8;font-size:12px;font-weight:700;line-height:1.42;display:flex;align-items:center}.qvl-ref-central:after{content:'';position:absolute;right:-44px;top:50%;width:42px;border-top:2px solid #78a5f7}
.qvl-branch-card{padding:0;overflow:hidden}.qvl-branch-head{display:grid;grid-template-columns:46px minmax(0,1fr) auto;align-items:center;gap:10px;padding:12px 13px;cursor:pointer}.qvl-branch-icon{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#1252c7;color:#fff;font-size:17px;font-weight:800}.qvl-branch-title{font-size:16px;line-height:1.15;font-weight:800;color:#102e61}.qvl-branch-count{min-width:34px;height:26px;padding:0 8px;border:1px solid #cbdaf3;border-radius:7px;display:flex;align-items:center;justify-content:center;gap:6px;color:#31517f;font-size:11px;background:#fff}.qvl-branch-count.replie{border:0;border-radius:999px;background:#f0f1f3;color:#697386;font-weight:700}.qvl-branch-chevron{border:0;background:transparent;color:#164d9f;cursor:pointer;font-size:18px;padding:3px 2px}
.qvl-branch-preview{padding:0 22px 13px 59px}.qvl-branch-preview ul{padding:0;margin:0;list-style:none}.qvl-branch-preview li{position:relative;margin:5px 0;color:#334b6e;font-size:10.7px;line-height:1.3}.qvl-branch-preview li:before{content:'•';position:absolute;left:-13px;color:#1760e9;font-size:16px;line-height:10px}.qvl-view-elements{border:0;background:transparent;padding:5px 0 0;color:#1760e9;font-size:10.5px;font-weight:800;cursor:pointer}
.qvl-branch-card.compact .qvl-branch-head{padding-top:9px;padding-bottom:9px}.qvl-branch-card.compact .qvl-branch-icon{width:34px;height:34px;font-size:15px}.qvl-branch-card.compact .qvl-branch-title{font-size:14px}.qvl-branch-card.late{border-color:#d9dde4;background:#fbfbfc}.qvl-branch-card.late .qvl-branch-icon{background:#fff;color:#778191;border:1px solid #d8dde5}.qvl-branch-card.late .qvl-branch-title{color:#46546a}
.qvl-child-node{padding:11px 12px;cursor:pointer;font-size:11px;line-height:1.3}.qvl-child-node .kind-dot{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;margin-right:7px;background:#eff4ff;color:#185ecb;font-size:9px;font-weight:900}.qvl-child-node.documente{border-left:4px solid #1e65da}.qvl-child-node.suggestion{border-left:4px solid #7c3aed}.qvl-child-node.question{border-left:4px solid #d97706}.qvl-child-node.user{border-left:4px solid #059669}.qvl-child-node small{display:block;margin-top:7px;color:#718096;font-size:9px}
.qvl-map-hint{position:absolute;left:18px;bottom:12px;padding:6px 9px;border-radius:7px;background:rgba(255,255,255,.92);color:#738198;font-size:9.5px;box-shadow:0 2px 7px rgba(34,52,78,.05);pointer-events:none}
.qvl-inspector{min-width:0;background:#fff;overflow:auto}.qvl-inspector-head{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid #e7ecf3}.qvl-inspector-head strong{font-size:13px;color:#18345e}.qvl-inspector-close{border:0;background:transparent;font-size:18px;color:#35506f;cursor:pointer}.qvl-inspector-body{padding:16px}.qvl-inspector-label{display:block;margin:0 0 8px;color:#52617a;font-size:10px;font-weight:700}.qvl-selected-card{display:flex;align-items:center;gap:10px;padding:10px;border-radius:9px;background:#f4f7fb;color:#164eae;margin-bottom:16px}.qvl-selected-card .qvl-branch-icon{width:35px;height:35px;font-size:14px}.qvl-selected-card strong{display:block;font-size:12px}.qvl-selected-card span{font-size:10px}.qvl-inspector h4{margin:16px 0 7px;color:#253c60;font-size:11px}.qvl-inspector p{margin:0;color:#4b5c75;font-size:10.5px;line-height:1.48}.qvl-info-box{display:flex;gap:9px;margin-top:15px;padding:12px;border:1px solid #cfe0f8;border-radius:9px;background:#f7fbff;color:#3b5576;font-size:10px;line-height:1.48}.qvl-info-i{flex:0 0 20px;width:20px;height:20px;border-radius:50%;border:1px solid #9bb8e5;display:grid;place-items:center;color:#2a62b5;font-weight:800}
.qvl-folded-list{display:grid;gap:8px}.qvl-folded-row{display:grid;grid-template-columns:24px 1fr auto;align-items:center;gap:8px;border:1px solid #e0e4eb;border-radius:8px;padding:9px;background:#fff;color:#30435f;cursor:pointer;text-align:left}.qvl-folded-row b{font-size:10px;line-height:1.25}.qvl-folded-row span{font-size:9px;padding:3px 7px;border-radius:999px;background:#f0f1f3;color:#697386}
.qvl-node-list{display:grid;gap:7px;margin-top:10px}.qvl-node-list button{border:1px solid #e0e6ef;border-radius:8px;background:#fff;padding:8px 9px;text-align:left;color:#334b6e;font-size:10px;line-height:1.35;cursor:pointer}.qvl-node-list button:hover{border-color:#b8cef4;background:#f9fbff}
.qvl-node-editor{width:100%;min-height:88px;resize:vertical;border:1px solid #d7e0ed;border-radius:8px;padding:9px;font:11px/1.4 inherit;color:#213b63;box-sizing:border-box}.qvl-node-select,.qvl-link-input{width:100%;height:34px;border:1px solid #d7e0ed;border-radius:7px;background:#fff;padding:0 8px;font:10px inherit;color:#2d4568;box-sizing:border-box}.qvl-inspector-btn{width:100%;margin-top:8px;border:1px solid #c9d8f0;border-radius:7px;background:#f7faff;color:#1855aa;padding:9px;font-size:10px;font-weight:800;cursor:pointer}.qvl-inspector-btn.primary{background:#175ccb;color:#fff;border-color:#175ccb}.qvl-inspector-btn.danger{color:#b43a3a;border-color:#f0cccc;background:#fffafa}
.qvl-map-sources{margin-top:14px}.qvl-map-sources h4{margin-bottom:8px}.qvl-map-sources a{display:flex;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #edf0f4;text-decoration:none;color:#314969}.qvl-source-id{font-size:9px;font-weight:800;color:#1f5cb7}.qvl-map-sources strong{display:block;font-size:9.5px}.qvl-map-sources small{display:block;color:#728096;font-size:8.5px;margin-top:2px}
@media(max-width:1000px){.qvl-map-shell{grid-template-columns:1fr;height:720px}.qvl-inspector{display:none}}
`

function uid(prefix='u'){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`}
function branchIndex(map,id){return Math.max(0,(map?.branches||[]).findIndex(b=>b.id===id))}

function branchGeometry(id){
  const geo={
    question:{x:650,y:158,w:470,h:160},
    enjeux:{x:650,y:350,w:470,h:160},
    acteurs:{x:650,y:522,w:470,h:66},
    faisceaux:{x:650,y:606,w:470,h:66},
    leviers:{x:650,y:690,w:470,h:66},
    tensions:{x:650,y:786,w:470,h:66},
    prolongements:{x:650,y:870,w:470,h:66}
  }
  return geo[id]||{x:650,y:520,w:470,h:66}
}

function buildLayout(map,previewOpen,lateCollapsed,detailBranchId){
  const nodes=[{id:'__central',kind:'central',label:map?.central_question||'Question centrale',x:185,y:455,w:210,h:120,locked:true}]
  ;(map?.branches||[]).forEach((branch)=>{
    const group=(map?.nodes||[]).filter(n=>n.branch_id===branch.id)
    if(!group.length)return
    const g=branchGeometry(branch.id)
    const isLate=LATE_BRANCHES.has(branch.id)
    const isCollapsed=isLate&&lateCollapsed.has(branch.id)
    const isPreview=previewOpen.has(branch.id)&&!isCollapsed
    nodes.push({id:`__branch_${branch.id}`,branch_id:branch.id,kind:'branch',label:branch.label,x:g.x,y:g.y,w:g.w,h:isPreview?g.h:66,locked:true,childCount:group.length,preview:isPreview?group.slice(0,3).map(n=>n.label):[],isLate,isCollapsed,index:branchIndex(map,branch.id)+1})
    if(detailBranchId===branch.id&&!isCollapsed){
      const visible=group.slice(0,7)
      const startY=Math.max(95,g.y-(visible.length-1)*42)
      visible.forEach((n,i)=>nodes.push({...n,x:1210,y:startY+i*84,w:270,h:66}))
    }
  })
  return nodes
}

function edgesFor(layout,map,detailBranchId){
  const byId=new Map(layout.map(n=>[n.id,n]));const out=[]
  ;(map?.branches||[]).forEach(branch=>{const c=byId.get('__central'),b=byId.get(`__branch_${branch.id}`);if(c&&b)out.push({id:`c_${branch.id}`,source:c.id,target:b.id,branch_id:branch.id,late:LATE_BRANCHES.has(branch.id)})})
  if(detailBranchId){
    ;(map?.nodes||[]).filter(n=>n.branch_id===detailBranchId).forEach(n=>{const target=byId.get(n.id);if(!target)return;const source=byId.get(n.parent_id)||byId.get(`__branch_${n.branch_id}`);if(source)out.push({id:`n_${n.id}`,source:source.id,target:target.id,branch_id:n.branch_id,child:true})})
  }
  return out
}

function linkCurve(a,b){
  const ax=a.x+(a.w||0)/2,ay=a.y,bx=b.x-(b.w||0)/2,by=b.y
  const mid=ax+(bx-ax)*.45
  return `M ${ax} ${ay} C ${mid} ${ay}, ${mid} ${by}, ${bx} ${by}`
}

export default function ReflectionMap({result,onChange}){
  const [map,setMap]=useState(()=>result?.map||{})
  const [previewOpen,setPreviewOpen]=useState(()=>new Set(DEFAULT_PREVIEW_OPEN))
  const [lateCollapsed,setLateCollapsed]=useState(()=>new Set(LATE_BRANCHES))
  const [detailBranchId,setDetailBranchId]=useState(null)
  const [selectedId,setSelectedId]=useState('__branch_question')
  const [view,setView]=useState({x:0,y:0,scale:.72})
  const [animating,setAnimating]=useState(false)
  const shellRef=useRef(null),panRef=useRef(null),dragRef=useRef(null),timers=useRef([]),positions=useRef(new Map())

  const layout=useMemo(()=>buildLayout(map,previewOpen,lateCollapsed,detailBranchId).map(n=>{const p=positions.current.get(n.id);return p&&!n.locked?{...n,...p}:n}),[map,previewOpen,lateCollapsed,detailBranchId])
  const byId=useMemo(()=>new Map(layout.map(n=>[n.id,n])),[layout])
  const edges=useMemo(()=>edgesFor(layout,map,detailBranchId),[layout,map,detailBranchId])
  const selected=byId.get(selectedId)||(map?.nodes||[]).find(n=>n.id===selectedId)||null

  const computeView=(nodes,maxScale=.98,padX=90,padY=70)=>{
    const shell=shellRef.current;if(!shell||!nodes.length)return null
    const rect=shell.getBoundingClientRect();if(!rect.width||!rect.height)return null
    const minX=Math.min(...nodes.map(n=>n.x-(n.w||0)/2))-padX,maxX=Math.max(...nodes.map(n=>n.x+(n.w||0)/2))+padX
    const minY=Math.min(...nodes.map(n=>n.y-(n.h||0)/2))-padY,maxY=Math.max(...nodes.map(n=>n.y+(n.h||0)/2))+padY
    const scale=Math.min(maxScale,Math.max(.38,Math.min(rect.width/(maxX-minX),rect.height/(maxY-minY))))
    return {scale,x:rect.width/2-((minX+maxX)/2)*scale,y:rect.height/2-((minY+maxY)/2)*scale}
  }
  const moveView=(target,duration=820)=>{if(!target)return;setAnimating(true);setView(target);const t=setTimeout(()=>setAnimating(false),duration+40);timers.current.push(t)}
  const focusProblemAndEnjeux=(arr=layout)=>moveView(computeView(arr.filter(n=>n.id==='__central'||n.branch_id==='question'||n.branch_id==='enjeux'),1.03,72,58))
  const fit=(arr=layout)=>moveView(computeView(arr,.9,120,95))
  const focusBranch=(id,arr=layout)=>moveView(computeView(arr.filter(n=>n.id==='__central'||n.branch_id===id),1.0,80,65))

  useEffect(()=>{
    timers.current.forEach(clearTimeout);timers.current=[];positions.current.clear()
    const next=result?.map||{}
    setMap(next);setPreviewOpen(new Set(DEFAULT_PREVIEW_OPEN));setLateCollapsed(new Set(LATE_BRANCHES));setDetailBranchId(null);setSelectedId('__branch_question')
    const temp=buildLayout(next,new Set(DEFAULT_PREVIEW_OPEN),new Set(LATE_BRANCHES),null)
    const t1=setTimeout(()=>{const ov=computeView(temp,.72,130,105);if(ov)setView(ov);const t2=setTimeout(()=>focusProblemAndEnjeux(temp),190);timers.current.push(t2)},60);timers.current.push(t1)
    return()=>{timers.current.forEach(clearTimeout);timers.current=[]}
  },[result])
  useEffect(()=>{onChange?.(map)},[map,onChange])

  const zoom=d=>{setAnimating(false);setView(v=>({...v,scale:Math.max(.38,Math.min(1.35,v.scale+d))}))}
  const startPan=e=>{if(e.target.closest('.qvl-ref-node'))return;setAnimating(false);panRef.current={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y};e.currentTarget.setPointerCapture?.(e.pointerId)}
  const movePan=e=>{const p=panRef.current;if(!p)return;setView(v=>({...v,x:p.vx+e.clientX-p.x,y:p.vy+e.clientY-p.y}))}
  const endPan=()=>{panRef.current=null}
  const wheel=e=>{e.preventDefault();zoom(e.deltaY>0?-.07:.07)}
  const startDrag=(e,id)=>{const n=byId.get(id);if(!n||n.locked)return;e.stopPropagation();dragRef.current={id,x:e.clientX,y:e.clientY,nx:n.x,ny:n.y,scale:view.scale};window.addEventListener('pointermove',dragMove);window.addEventListener('pointerup',dragEnd,{once:true})}
  const dragMove=e=>{const d=dragRef.current;if(!d)return;positions.current.set(d.id,{x:d.nx+(e.clientX-d.x)/d.scale,y:d.ny+(e.clientY-d.y)/d.scale});setMap(m=>({...m}))}
  const dragEnd=()=>{dragRef.current=null;window.removeEventListener('pointermove',dragMove)}

  const selectBranch=id=>setSelectedId(`__branch_${id}`)
  const togglePreview=id=>{
    if(LATE_BRANCHES.has(id)&&lateCollapsed.has(id)){
      const c=new Set(lateCollapsed);c.delete(id);setLateCollapsed(c);const p=new Set(previewOpen);p.add(id);setPreviewOpen(p);setSelectedId(`__branch_${id}`);setTimeout(()=>focusBranch(id),50);return
    }
    const p=new Set(previewOpen);p.has(id)?p.delete(id):p.add(id);setPreviewOpen(p);setSelectedId(`__branch_${id}`)
  }
  const openDetails=id=>{if(lateCollapsed.has(id))togglePreview(id);setDetailBranchId(id);setSelectedId(`__branch_${id}`);setTimeout(()=>focusBranch(id,buildLayout(map,previewOpen,lateCollapsed,id)),60)}
  const closeDetails=()=>{const id=detailBranchId;setDetailBranchId(null);if(id)setTimeout(()=>focusBranch(id),40)}

  const patchNode=(id,patch)=>setMap(m=>({...m,nodes:(m.nodes||[]).map(n=>{if(n.id!==id)return n;const next={...n,...patch};if(n.kind==='documente'&&patch.label!==undefined&&patch.label!==n.label){next.origin_provenances=n.provenances||[];next.kind='user';next.provenances=[];next.chunk_ids=[]}return next})}))
  const deleteNode=id=>{if(String(id).startsWith('__'))return;setMap(m=>({...m,nodes:(m.nodes||[]).filter(n=>n.id!==id).map(n=>n.parent_id===id?{...n,parent_id:''}:n),cross_links:(m.cross_links||[]).filter(l=>l.source!==id&&l.target!==id)}));setSelectedId(`__branch_${selected?.branch_id||'question'}`)}
  const addChild=()=>{const base=selected&&!String(selected.id||'').startsWith('__')?selected:null;const branchId=base?.branch_id||selected?.branch_id||'question';const id=uid();const node={id,branch_id:branchId,parent_id:base?.id||'',kind:'user',label:'Nouvelle piste',chunk_ids:[],provenances:[]};setMap(m=>({...m,nodes:[...(m.nodes||[]),node]}));setDetailBranchId(branchId);setSelectedId(id)}
  const addCrossLink=(source,target,label='')=>{if(!source||!target||source===target)return;setMap(m=>{const links=m.cross_links||[];if(links.some(l=>(l.source===source&&l.target===target)||(l.source===target&&l.target===source)))return m;return {...m,cross_links:[...links,{id:uid('link'),source,target,label:label.trim(),kind:'user'}]}})}
  const deleteCrossLink=id=>setMap(m=>({...m,cross_links:(m.cross_links||[]).filter(l=>l.id!==id)}))

  return <div className="qvl-map-shell">
    <style>{MAP_STYLES}</style>
    <div className="qvl-map-main">
      <div className="qvl-map-toolbar">
        <div className="qvl-map-toolbar-left"><span>CARTE ASSISTÉE</span><span>·</span><b>ENRICHISSEMENT CONTRÔLÉ</b></div>
        <div style={{display:'flex',alignItems:'center'}}><div className="qvl-map-metric"><Icon name="book" size={14}/><span>{result?.selection?.chunks_mobilises||0} passages mobilisés</span></div><div className="qvl-map-tools"><button onClick={()=>zoom(-.08)}>−</button><span className="pct">{Math.round(view.scale*100)} %</span><button onClick={()=>zoom(.08)}>+</button><button onClick={()=>fit()} title="Ajuster">⌗</button></div></div>
      </div>
      <div className="qvl-map-canvas" ref={shellRef} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onWheel={wheel}>
        <div className="qvl-map-world" style={{width:WORLD.w,height:WORLD.h,transform:`translate(${view.x}px,${view.y}px) scale(${view.scale})`,transition:animating?'transform 820ms cubic-bezier(.22,.8,.25,1)':'none'}}>
          <svg className="qvl-map-edges" width={WORLD.w} height={WORLD.h} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}>{edges.map(e=>{const a=byId.get(e.source),b=byId.get(e.target);if(!a||!b)return null;return <path key={e.id} d={linkCurve(a,b)} className={`${e.child?'qvl-child-edge':'qvl-struct-edge'} ${e.late?'late':''}`} style={{stroke:branchColors[e.branch_id]||'#7ea7ef'}}/>})}</svg>
          {layout.map(n=><MapNode key={n.id} node={n} selected={selectedId===n.id} map={map} onSelect={()=>setSelectedId(n.id)} onSelectBranch={selectBranch} onTogglePreview={togglePreview} onOpenDetails={openDetails} onDrag={e=>startDrag(e,n.id)}/>) }
        </div>
        <div className="qvl-map-hint">Le parcours s’ouvre sur le problème et les enjeux · Les rubriques de fin de parcours restent repliées jusqu’à ce que vous choisissiez de les ouvrir.</div>
      </div>
    </div>
    <Inspector node={selected} map={map} detailBranchId={detailBranchId} lateCollapsed={lateCollapsed} onClose={()=>setSelectedId(null)} onSelectNode={id=>setSelectedId(id)} onOpenDetails={openDetails} onCloseDetails={closeDetails} onTogglePreview={togglePreview} onPatch={patchNode} onDelete={deleteNode} onAdd={addChild} onAddLink={addCrossLink} onDeleteLink={deleteCrossLink}/>
  </div>
}

function MapNode({node,selected,map,onSelect,onSelectBranch,onTogglePreview,onOpenDetails,onDrag}){
  if(node.kind==='central')return <div className={`qvl-ref-node qvl-ref-central ${selected?'selected':''}`} style={{left:node.x-node.w/2,top:node.y-node.h/2,width:node.w,minHeight:node.h}} onClick={onSelect}>{node.label}</div>
  if(node.kind==='branch'){
    return <div className={`qvl-ref-node qvl-branch-card ${node.preview?.length?'':'compact'} ${node.isLate?'late':''} ${selected?'selected':''}`} style={{left:node.x-node.w/2,top:node.y-node.h/2,width:node.w,minHeight:node.h}} onClick={()=>onSelectBranch(node.branch_id)}>
      <div className="qvl-branch-head"><span className="qvl-branch-icon">{branchIcons[node.branch_id]||'•'}</span><span className="qvl-branch-title">{node.index}. {node.label}</span><span style={{display:'flex',alignItems:'center',gap:4}}>{node.isCollapsed?<span className="qvl-branch-count replie">Replié</span>:<span className="qvl-branch-count">{node.childCount}</span>}<button className="qvl-branch-chevron" onClick={e=>{e.stopPropagation();onTogglePreview(node.branch_id)}}>{node.preview?.length?'⌃':'⌄'}</button></span></div>
      {node.preview?.length>0&&<div className="qvl-branch-preview"><ul>{node.preview.map((x,i)=><li key={i}>{x}</li>)}</ul><button className="qvl-view-elements" onClick={e=>{e.stopPropagation();onOpenDetails(node.branch_id)}}>Voir les éléments ({node.childCount}) ›</button></div>}
    </div>
  }
  const sourceCount=new Set((node.provenances||[]).map(p=>p.publication_id)).size
  return <div className={`qvl-ref-node qvl-child-node ${node.kind||'user'} ${selected?'selected':''}`} style={{left:node.x-node.w/2,top:node.y-node.h/2,width:node.w,minHeight:node.h}} onClick={onSelect} onPointerDown={onDrag}><span className="kind-dot">{node.kind==='documente'?'●':node.kind==='suggestion'?'✦':node.kind==='question'?'?':'+'}</span>{node.label}{sourceCount>0&&<small>{sourceCount} source{sourceCount>1?'s':''}</small>}</div>
}

function Inspector({node,map,detailBranchId,lateCollapsed,onClose,onSelectNode,onOpenDetails,onCloseDetails,onTogglePreview,onPatch,onDelete,onAdd,onAddLink,onDeleteLink}){
  const [targetId,setTargetId]=useState(''),[linkLabel,setLinkLabel]=useState('')
  useEffect(()=>{setTargetId('');setLinkLabel('')},[node?.id])
  const branchForNode=node?.kind==='branch'?node.branch_id:node?.branch_id
  const branch=(map?.branches||[]).find(b=>b.id===branchForNode)
  const group=branchForNode?(map?.nodes||[]).filter(n=>n.branch_id===branchForNode):[]
  const folded=(map?.branches||[]).filter(b=>LATE_BRANCHES.has(b.id)&&lateCollapsed.has(b.id))

  return <aside className="qvl-inspector">
    <div className="qvl-inspector-head"><strong>Panneau de réflexion</strong><button className="qvl-inspector-close" onClick={onClose}>×</button></div>
    <div className="qvl-inspector-body">
      {!node?<><span className="qvl-inspector-label">Élément sélectionné</span><p>Sélectionnez une rubrique ou une piste pour poursuivre le parcours.</p></>:String(node.id||'').startsWith('__branch_')?<>
        <span className="qvl-inspector-label">Élément sélectionné</span>
        <div className="qvl-selected-card"><span className="qvl-branch-icon">{branchIcons[node.branch_id]||'•'}</span><span><strong>{node.index}. {node.label}</strong><span>{node.childCount} élément{node.childCount>1?'s':''}</span></span></div>
        <h4>Résumé</h4><p>{branchSummaries[node.branch_id]||'Une étape du parcours de réflexion.'}</p>
        <div className="qvl-info-box"><span className="qvl-info-i">i</span><span>Les rubriques en fin de parcours (<b>Tensions, limites et angles morts</b> et <b>Prolongements</b>) sont repliées à l’ouverture.<br/><br/>Vous pouvez les développer à tout moment pour approfondir votre réflexion.</span></div>
        <button className="qvl-inspector-btn primary" onClick={()=>detailBranchId===node.branch_id?onCloseDetails():onOpenDetails(node.branch_id)}>{detailBranchId===node.branch_id?'Masquer les éléments':`Voir les éléments (${node.childCount})`}</button>
        <button className="qvl-inspector-btn" onClick={onAdd}>+ Ajouter une piste</button>
        {detailBranchId===node.branch_id&&<div className="qvl-node-list">{group.map(n=><button key={n.id} onClick={()=>onSelectNode(n.id)}>{n.label}</button>)}</div>}
        {folded.length>0&&<><h4>Rubriques repliées</h4><div className="qvl-folded-list">{folded.map(b=><button className="qvl-folded-row" key={b.id} onClick={()=>onTogglePreview(b.id)}><span>{branchIcons[b.id]}</span><b>{branchIndex(map,b.id)+1}. {b.label}</b><span>Replié</span></button>)}</div></>}
      </>:node.kind==='central'?<><span className="qvl-inspector-label">QUESTION CENTRALE — TEXTE INTÉGRAL</span><p style={{fontWeight:700,color:'#18345e'}}>{node.label}</p><div className="qvl-info-box"><span className="qvl-info-i">i</span><span>La carte reprend votre prompt intégral. Elle ne reformule pas la question centrale.</span></div></>:<NodeEditor node={node} map={map} branch={branch} targetId={targetId} setTargetId={setTargetId} linkLabel={linkLabel} setLinkLabel={setLinkLabel} onPatch={onPatch} onDelete={onDelete} onAdd={onAdd} onAddLink={onAddLink} onDeleteLink={onDeleteLink} onBack={()=>onSelectNode(`__branch_${node.branch_id}`)}/>}      
    </div>
  </aside>
}

function NodeEditor({node,map,branch,targetId,setTargetId,linkLabel,setLinkLabel,onPatch,onDelete,onAdd,onAddLink,onDeleteLink,onBack}){
  const kind=node.kind||'user',sources=node.provenances||[],origins=node.origin_provenances||[]
  const nodeLinks=(map.cross_links||[]).filter(l=>l.source===node.id||l.target===node.id)
  const candidates=(map.nodes||[]).filter(n=>n.id!==node.id)
  const nodeById=id=>(map.nodes||[]).find(n=>n.id===id)
  return <>
    <button className="qvl-inspector-btn" style={{marginTop:0,marginBottom:12}} onClick={onBack}>← Retour à {branch?.label||'la rubrique'}</button>
    <span className="qvl-inspector-label">{kindLabels[kind]||kind}</span>
    <textarea className="qvl-node-editor" value={node.label||''} onChange={e=>onPatch(node.id,{label:e.target.value})}/>
    <h4>Rubrique</h4><select className="qvl-node-select" value={node.branch_id||''} onChange={e=>onPatch(node.id,{branch_id:e.target.value,parent_id:''})}>{(map.branches||[]).map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select>
    <button className="qvl-inspector-btn" onClick={onAdd}>+ Ajouter une sous-idée</button>
    <h4>Liens transversaux</h4><select className="qvl-node-select" value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">Choisir une idée…</option>{candidates.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}</select><input className="qvl-link-input" style={{marginTop:7}} value={linkLabel} onChange={e=>setLinkLabel(e.target.value)} placeholder="Nom du lien (facultatif)"/><button className="qvl-inspector-btn" disabled={!targetId} onClick={()=>{onAddLink(node.id,targetId,linkLabel);setTargetId('');setLinkLabel('')}}>Créer le lien</button>
    {nodeLinks.length>0&&<div className="qvl-node-list">{nodeLinks.map(l=>{const other=nodeById(l.source===node.id?l.target:l.source);return other?<button key={l.id} onClick={()=>onDeleteLink(l.id)} title="Cliquer pour supprimer">↔ {other.label}{l.label?` — ${l.label}`:''}</button>:null})}</div>}
    {sources.length>0&&<SourceList title="Preuves documentaires" sources={sources}/>} {!sources.length&&origins.length>0&&<SourceList title="Sources d’origine avant modification" sources={origins}/>}    
    {kind==='suggestion'&&<div className="qvl-info-box"><span>✦</span><span>Cette piste est proposée par l’IA pour stimuler la réflexion. Elle n’est pas présentée comme un fait documenté.</span></div>}
    {kind==='question'&&<div className="qvl-info-box"><span>?</span><span>Cette question ouvre la réflexion ; elle ne constitue pas une conclusion du corpus.</span></div>}
    <button className="qvl-inspector-btn danger" onClick={()=>onDelete(node.id)}>Supprimer cette piste</button>
  </>
}

function SourceList({title,sources}){
  const grouped=[];const seen=new Set()
  sources.forEach(p=>{const label=p.type==='timecode'?(p.label||''):(p.label?`p. ${p.label}`:(p.page?`p. ${p.page}`:''));const key=`${p.publication_id}|${label}`;if(seen.has(key))return;seen.add(key);grouped.push({...p,_label:label})})
  return <div className="qvl-map-sources"><h4>{title}</h4>{grouped.map((p,i)=><a key={i} href={p.url||'#'} target="_blank" rel="noreferrer"><span className="qvl-source-id">{p.publication_id}</span><span><strong>{p._label||'Source'}</strong><small>{p.titre}</small></span></a>)}</div>
}
