export const NODE_META = {
  acteur: { label:'Acteur', className:'actor' },
  expert_public: { label:'Expert public', className:'actor' },
  action: { label:'Action', className:'action' },
  notion_idee: { label:'Notion', className:'concept' },
  probleme: { label:'Problème', className:'concept' },
  'Problème': { label:'Problème', className:'concept' },
  localisation: { label:'Localisation', className:'location' },
  signal_faible: { label:'Signal faible', className:'signal' },
  recommandation: { label:'Recommandation', className:'recommendation' },
}

export function nodeMeta(type='notion_idee') {
  return NODE_META[type] || { label:type || 'Élément', className:'concept' }
}

export function buildAdjacency(nodes, relations) {
  const adj = new Map(nodes.map(n => [n.node_id, []]))
  relations.forEach(r => {
    if (adj.has(r.source_id)) adj.get(r.source_id).push({ id:r.cible_id, relation:r })
    if (adj.has(r.cible_id)) adj.get(r.cible_id).push({ id:r.source_id, relation:r })
  })
  return adj
}

export function selectVisibleGraph(nodes, relations, focusId, showAll=false, maxNodes=30) {
  if (!nodes.length) return { nodes:[], relations:[] }
  const adj=buildAdjacency(nodes, relations)
  let focus=focusId && adj.has(focusId) ? focusId : [...adj.entries()].sort((a,b)=>b[1].length-a[1].length)[0]?.[0]
  if (showAll || nodes.length <= maxNodes) return { nodes, relations, focus }
  const chosen=new Set([focus]); const queue=[focus]
  while(queue.length && chosen.size < maxNodes){
    const id=queue.shift()
    const neighbours=(adj.get(id)||[]).sort((a,b)=>(adj.get(b.id)?.length||0)-(adj.get(a.id)?.length||0))
    for(const x of neighbours){ if(chosen.size>=maxNodes) break; if(!chosen.has(x.id)){chosen.add(x.id); queue.push(x.id)} }
  }
  const outNodes=nodes.filter(n=>chosen.has(n.node_id))
  const outRelations=relations.filter(r=>chosen.has(r.source_id)&&chosen.has(r.cible_id))
  return { nodes:outNodes, relations:outRelations, focus }
}

export function radialLayout(nodes, relations, focusId, width=950, height=650) {
  const adj=buildAdjacency(nodes,relations)
  const center=focusId && adj.has(focusId) ? focusId : nodes[0]?.node_id
  const levels=new Map([[center,0]]); const queue=[center]
  while(queue.length){ const id=queue.shift(); const l=levels.get(id); for(const n of (adj.get(id)||[])){if(!levels.has(n.id)){levels.set(n.id,l+1);queue.push(n.id)}} }
  nodes.forEach(n=>{ if(!levels.has(n.node_id)) levels.set(n.node_id,3) })
  const buckets=new Map()
  nodes.forEach(n=>{const l=Math.min(levels.get(n.node_id)||0,3); if(!buckets.has(l))buckets.set(l,[]);buckets.get(l).push(n)})
  const positions={}; const cx=width/2, cy=height/2
  positions[center]={x:cx,y:cy}
  const radii=[0,185,310,410]
  for(const [level,list] of buckets){
    if(level===0) continue
    const radius=radii[level] || 410
    list.sort((a,b)=>a.node_id.localeCompare(b.node_id))
    list.forEach((n,i)=>{
      const angle=(-Math.PI/2)+(Math.PI*2*i/list.length)+(level===2?0.12:level===3?0.24:0)
      positions[n.node_id]={x:cx+Math.cos(angle)*radius,y:cy+Math.sin(angle)*radius}
    })
  }
  return positions
}
