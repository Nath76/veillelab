import React, { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import KnowledgeGraph from '../components/KnowledgeGraph.jsx'
import ProofModal from '../components/ProofModal.jsx'
import { askGraph } from '../services/chatApi.js'
import { buildAdjacency, nodeMeta } from '../lib/graph.js'
import { normalize, sentenceCase } from '../lib/text.js'

const legendTypes=['acteur','expert_public','action','notion_idee','probleme','localisation','signal_faible','recommandation']
const typeColor={actor:'#3F5275',action:'#d97745',concept:'#8265a9',location:'#3f8d89',signal:'#9b8d3d',recommendation:'#b95f86'}

function chunkFor(proof,contents){
  const ids=String(proof?.chunk_id_source||'').split(';').map(x=>x.trim()).filter(Boolean)
  return ids.map(id=>contents.find(c=>c.chunk_id===id)).find(Boolean)
}

function KnowledgeIllustration(){
  return <div className="explorer-knowledge-illustration" aria-hidden="true">
    <svg viewBox="0 0 360 230" role="img">
      <defs>
        <linearGradient id="qvlBook" x1="0" x2="1"><stop offset="0" stopColor="#eef2f8"/><stop offset="1" stopColor="#dfe6f1"/></linearGradient>
      </defs>
      <path d="M72 178 Q132 149 180 174 Q228 149 288 178 L276 207 Q226 186 180 207 Q134 186 84 207 Z" fill="url(#qvlBook)" stroke="#9dabc0" strokeWidth="2"/>
      <path d="M180 174 V207" stroke="#9dabc0" strokeWidth="2"/>
      <g stroke="#7587a5" strokeWidth="2" opacity=".72">
        <line x1="180" y1="134" x2="116" y2="92"/><line x1="180" y1="134" x2="245" y2="92"/>
        <line x1="116" y1="92" x2="72" y2="51"/><line x1="116" y1="92" x2="155" y2="44"/>
        <line x1="245" y1="92" x2="284" y2="48"/><line x1="245" y1="92" x2="302" y2="116"/>
        <line x1="180" y1="134" x2="136" y2="145"/><line x1="180" y1="134" x2="224" y2="145"/>
      </g>
      <g fill="#3F5275">
        <circle cx="180" cy="134" r="17"/><circle cx="116" cy="92" r="13"/><circle cx="245" cy="92" r="13"/>
      </g>
      <g fill="#617497">
        <circle cx="72" cy="51" r="10"/><circle cx="155" cy="44" r="9"/><circle cx="284" cy="48" r="10"/><circle cx="302" cy="116" r="9"/>
      </g>
      <g fill="#a9b5c8"><circle cx="136" cy="145" r="7"/><circle cx="224" cy="145" r="7"/></g>
    </svg>
  </div>
}

function PublicationDrawer({open,onClose,publications,search,setSearch,onSelect,selectedId}){
  const matches=useMemo(()=>{
    const q=normalize(search)
    if(!q)return publications
    return publications.filter(p=>normalize(`${p.titre} ${p.organisme_producteur} ${p.domaine||''} ${p.année_publication||''}`).includes(q))
  },[search,publications])
  return <>
    <button className={`explorer-drawer-scrim ${open?'open':''}`} aria-label="Fermer le volet publications" onClick={onClose}/>
    <aside className={`explorer-publication-drawer ${open?'open':''}`} aria-hidden={!open}>
      <div className="explorer-drawer-head">
        <div><span className="explorer-kicker">CORPUS</span><h2>Choisir une publication</h2><p>{publications.length} publication{publications.length>1?'s':''} avec graphe</p></div>
        <button onClick={onClose} className="explorer-drawer-close" title="Fermer"><Icon name="close" size={18}/></button>
      </div>
      <div className="explorer-drawer-search"><Icon name="search" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Titre, organisme, domaine…"/>{search&&<button onClick={()=>setSearch('')}><Icon name="close" size={14}/></button>}</div>
      <div className="explorer-drawer-results"><span>{matches.length} résultat{matches.length>1?'s':''}</span></div>
      <div className="explorer-publication-list">
        {matches.map(p=><button key={p.publication_id} className={`explorer-publication-item ${selectedId===p.publication_id?'selected':''}`} onClick={()=>onSelect(p)}>
          {p.has_image?<img src={`.${p.image_path}`} alt=""/>:<div className="explorer-mini-placeholder">{p.publication_id}</div>}
          <div><b>{p.publication_id}</b><strong>{sentenceCase(p.titre)}</strong><span>{p.organisme_producteur}{p.année_publication?` · ${p.année_publication}`:''}</span></div>
          <Icon name="chevron" size={17}/>
        </button>)}
      </div>
    </aside>
  </>
}

function ExplorerIntro({onChoose}){
  return <main className="page explorer-v02-home">
    <section className="explorer-v02-hero">
      <div className="explorer-v02-copy">
        <span className="explorer-kicker">EXPLORER</span>
        <h1>Explorer les connaissances contenues dans une publication, et les relations qui leur donnent sens.</h1>
        <p><strong>À la différence d’un graphe de réseaux</strong>, qui met principalement en évidence des connexions entre acteurs ou objets, le graphe de connaissances organise l’information sous la forme d’entités — idées, personnes, lieux, événements, dispositifs, etc. — reliées entre elles par des relations sémantiques explicites, souvent formulées à l’aide de verbes d’action.</p>
        <p>Il permet ainsi de <strong>naviguer à l’intérieur d’un texte et des connaissances qu’il mobilise</strong>, en passant d’une entité à une autre et en suivant les relations qui les relient.</p>
        <p>Le <strong>GraphRAG</strong> prolonge cette logique en permettant d’interroger les contenus documentaires et d’en extraire des objets spécifiques : <strong>acteurs, recommandations, localisations, actions, enjeux, concepts</strong>, etc.</p>
      </div>
      <KnowledgeIllustration/>
    </section>

    <section className="explorer-v02-empty">
      <div className="explorer-empty-icon"><Icon name="graph" size={30}/></div>
      <span className="explorer-kicker">ESPACE D’EXPLORATION</span>
      <h2>Aucun graphe affiché pour le moment</h2>
      <p>Sélectionnez une publication pour explorer son graphe de connaissances, suivre les relations entre les entités et revenir aux preuves documentaires.</p>
      <button className="btn explorer-primary" onClick={onChoose}><Icon name="file" size={17}/>Choisir une publication</button>
    </section>

    <aside className="explorer-howto">
      <div className="explorer-howto-title"><span>✦</span><div><span className="explorer-kicker">EXPLORER</span><h3>Comment fonctionne cet espace ?</h3></div></div>
      <div className="explorer-howto-step"><b>1</b><div><strong>Choisissez une publication</strong><p>Ouvrez le volet et recherchez rapidement une source dans le corpus.</p></div></div>
      <div className="explorer-howto-step"><b>2</b><div><strong>Explorez son graphe</strong><p>Naviguez entre les entités et les relations sémantiques qui les relient.</p></div></div>
      <div className="explorer-howto-step"><b>3</b><div><strong>Consultez les preuves</strong><p>Revenez aux pages ou timecodes qui étayent les connaissances affichées.</p></div></div>
      <div className="explorer-howto-step"><b>4</b><div><strong>Interrogez le graphe</strong><p>Le chatbot reste disponible dans la vue graphe pour poser vos questions en langage naturel.</p></div></div>
    </aside>
  </main>
}

export default function Explorer({data}){
  const graphPubs=useMemo(()=>data.publications.filter(p=>p.has_graph),[data])
  const [selectedPub,setSelectedPub]=useState(null),[search,setSearch]=useState(''),[nodeSearch,setNodeSearch]=useState('')
  const [drawerOpen,setDrawerOpen]=useState(false)
  const [selectedNode,setSelectedNode]=useState(null),[proof,setProof]=useState(null),[showWeak,setShowWeak]=useState(true)
  const [enabledTypes,setEnabledTypes]=useState(legendTypes),[nodeScale,setNodeScale]=useState(1),[linkDensity,setLinkDensity]=useState(1),[resetToken,setResetToken]=useState(0),[fitToken,setFitToken]=useState(0)
  const [question,setQuestion]=useState(''),[chat,setChat]=useState(null),[loading,setLoading]=useState(false),[chatOpen,setChatOpen]=useState(false)

  const choosePublication=p=>{setSelectedPub(p);setSelectedNode(null);setChat(null);setQuestion('');setNodeSearch('');setDrawerOpen(false)}

  if(!selectedPub)return <div className="explorer-v02-shell"><ExplorerIntro onChoose={()=>setDrawerOpen(true)}/><PublicationDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} publications={graphPubs} search={search} setSearch={setSearch} onSelect={choosePublication}/></div>

  const nodes=data.nodes.filter(n=>n.publication_id===selectedPub.publication_id)
  const relations=data.relations.filter(r=>r.publication_id===selectedPub.publication_id)
  const nodeMap=Object.fromEntries(nodes.map(n=>[n.node_id,n]))
  const highlighted=chat?.noeuds_selectionnes || []
  const nodeRelations=selectedNode?relations.filter(r=>r.source_id===selectedNode.node_id||r.cible_id===selectedNode.node_id):[]
  const linkedNodes=selectedNode?nodeRelations.map(r=>nodeMap[r.source_id===selectedNode.node_id?r.cible_id:r.source_id]).filter(Boolean).slice(0,6):[]
  const qNode=normalize(nodeSearch); const nodeMatches=qNode?nodes.filter(n=>normalize(n.libelle).includes(qNode)).slice(0,8):[]
  const adj=buildAdjacency(nodes,relations); const defaultFocus=[...nodes].sort((a,b)=>(adj.get(b.node_id)?.length||0)-(adj.get(a.node_id)?.length||0))[0]
  const currentNode=selectedNode||defaultFocus
  const evidence=currentNode?chunkFor(currentNode,data.contents):null
  const currentLinked=currentNode?(selectedNode?linkedNodes:(adj.get(currentNode.node_id)||[]).map(x=>nodeMap[x.id]).filter(Boolean).slice(0,6)):[]
  const visibleTypeIds=new Set(nodes.filter(n=>enabledTypes.includes(n.type_noeud)).map(n=>n.node_id))
  const typedRelations=relations.filter(r=>visibleTypeIds.has(r.source_id)&&visibleTypeIds.has(r.cible_id))
  const visibleRelationCount=showWeak?typedRelations.length:typedRelations.filter(r=>r.source_id===currentNode?.node_id||r.cible_id===currentNode?.node_id).length

  const toggleType=t=>{if(selectedNode?.type_noeud===t&&enabledTypes.includes(t))setSelectedNode(null);setEnabledTypes(s=>s.includes(t)?s.filter(x=>x!==t):[...s,t])}
  const reset=()=>{setSelectedNode(null);setChat(null);setQuestion('');setNodeSearch('');setEnabledTypes(legendTypes);setShowWeak(true);setResetToken(x=>x+1)}
  async function submit(e){e.preventDefault();if(!question.trim()||loading)return;setLoading(true);setChatOpen(true);try{setChat(await askGraph(question,selectedPub,nodes,relations))}catch(err){setChat({error:err.message,reponse:'Le service de dialogue n’est pas disponible.',noeuds_selectionnes:[]})}finally{setLoading(false)}}

  return <div className="explorer-v02-shell"><main className="screen graph-screen publication-screen explorer-v02-graph">
    <aside className="left-rail explorer-rail">
      <button className="explorer-change-publication" onClick={()=>setDrawerOpen(true)}><Icon name="file" size={17}/><span><small>Publication</small><strong>Changer de publication</strong></span><Icon name="chevron" size={17}/></button>
      <section className="rail-section"><h4>Publication sélectionnée</h4><article className="selected-publication-card">{selectedPub.has_image?<img src={`.${selectedPub.image_path}`} alt=""/>:<div className="mini-placeholder">{selectedPub.publication_id}</div>}<div><strong>{sentenceCase(selectedPub.titre)}</strong><small>{selectedPub.organisme_producteur} · {selectedPub.année_publication}</small></div></article></section>
      <section className="rail-section"><h4>Rechercher dans la publication</h4><div className="rail-search"><input value={nodeSearch} onChange={e=>setNodeSearch(e.target.value)} placeholder="Rechercher un terme, une entité…"/><Icon name="search" size={18}/></div>{nodeMatches.length>0&&<div className="rail-results">{nodeMatches.map(n=><button key={n.node_id} onClick={()=>{setSelectedNode(n);setNodeSearch('')}}>{n.libelle}<small>{nodeMeta(n.type_noeud).label}</small></button>)}</div>}</section>
      <section className="rail-section"><h4>Type de nœud</h4><div className="type-filter-list">{legendTypes.map(t=>{const m=nodeMeta(t),count=nodes.filter(n=>n.type_noeud===t).length;return <label key={t}><input type="checkbox" checked={enabledTypes.includes(t)} onChange={()=>toggleType(t)}/><i style={{background:typeColor[m.className]||'#8265a9'}}></i><span>{m.label}</span><b>{count}</b></label>})}</div></section>
      <section className="rail-section weak-row"><label><span>Afficher les liens faibles <Icon name="info" size={15}/></span><input className="switch" type="checkbox" checked={showWeak} onChange={e=>setShowWeak(e.target.checked)}/></label></section>
      <section className="rail-section display-section"><h4>Affichage</h4><label>Taille des nœuds<input type="range" min="0.8" max="1.35" step="0.05" value={nodeScale} onChange={e=>setNodeScale(Number(e.target.value))}/><span><small>Petite</small><small>Grande</small></span></label><label>Densité des liens<input type="range" min="0.6" max="1.8" step="0.1" value={linkDensity} onChange={e=>setLinkDensity(Number(e.target.value))}/><span><small>Faible</small><small>Élevée</small></span></label></section>
    </aside>

    <section className="graph-workspace publication-workspace">
      <div className="workspace-toolbar"><div><span className="explorer-kicker">EXPLORER</span><h1>Explorateur de publication</h1><p className="workspace-subtitle">{sentenceCase(selectedPub.titre)}</p><div className="big-count"><strong>{visibleTypeIds.size}</strong><span>nœuds · {visibleRelationCount} liens visibles</span><Icon name="info" size={17}/></div></div><div className="toolbar-actions"><button onClick={reset}><Icon name="reset" size={17}/>Réinitialiser</button><button onClick={()=>setFitToken(x=>x+1)}><Icon name="target" size={17}/>Ajuster à l’écran</button></div></div>
      <KnowledgeGraph nodes={nodes} relations={relations} selectedId={currentNode?.node_id} onSelectNode={setSelectedNode} onSelectRelation={setProof} highlightIds={highlighted} enabledTypes={enabledTypes} showWeak={showWeak} nodeScale={nodeScale} linkDensity={linkDensity} resetToken={resetToken} fitToken={fitToken}/>
      <div className={`chat-dock explorer-chat ${chatOpen?'open':''}`}>
        <button className="chat-dock-title" onClick={()=>setChatOpen(v=>!v)}><span>✦</span><strong>Interroger le graphe</strong><small>{chatOpen?'Réduire':'Ouvrir'}</small></button>
        {chatOpen&&<div className="chat-dock-body">{chat&&<div className="chat-response"><p>{chat.reponse}</p>{highlighted.length>0&&<div className="chat-evidence-links">{highlighted.slice(0,6).map(id=>nodeMap[id]?<button key={id} onClick={()=>setSelectedNode(nodeMap[id])}>{nodeMap[id].libelle}</button>:null)}</div>}</div>}<form onSubmit={submit}><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Posez une question sur cette publication…"/><button disabled={loading||!question.trim()}><Icon name="send" size={18}/></button></form></div>}
      </div>
    </section>

    <aside className="detail-drawer publication-drawer">
      <div className="drawer-type node-type"><i style={{background:typeColor[nodeMeta(currentNode?.type_noeud).className]||'#8265a9'}}></i>{nodeMeta(currentNode?.type_noeud).label}</div>
      {selectedNode&&<button className="drawer-close" onClick={()=>setSelectedNode(null)}><Icon name="close"/></button>}
      {currentNode?<><h2>{currentNode.libelle}</h2><p className="drawer-definition">Élément documenté dans la publication. Consultez les relations et la preuve ci-dessous pour vérifier son contexte source.</p>
        <h4>Nœuds liés ({currentLinked.length})</h4><div className="linked-node-list">{currentLinked.map(n=>{const m=nodeMeta(n.type_noeud);return <button key={n.node_id} onClick={()=>setSelectedNode(n)}><i style={{background:typeColor[m.className]||'#8265a9'}}></i><span>{n.libelle}</span><b style={{color:typeColor[m.className]||'#8265a9'}}>{m.label}</b></button>})}</div>
        <h4>Preuve documentaire</h4><article className="proof-source-card">{selectedPub.has_image?<img src={`.${selectedPub.image_path}`} alt=""/>:<div className="mini-placeholder">{selectedPub.publication_id}</div>}<div><strong>{sentenceCase(selectedPub.titre)}</strong><small>{selectedPub.organisme_producteur} · {selectedPub.année_publication}</small></div></article>
        <div className="inline-proof"><strong>{currentNode.page_source?`Page / timecode ${currentNode.page_source}`:'Page / timecode non renseigné'}</strong>{evidence?<p>{evidence.texte.slice(0,420)}{evidence.texte.length>420?'…':''}</p>:<p>Aucun extrait associé n’est disponible pour cet élément.</p>}<button onClick={()=>setProof(currentNode)}><Icon name="eye" size={16}/>Voir la preuve complète</button></div>
      </>:<div className="drawer-empty">Sélectionnez un nœud pour afficher ses relations et sa preuve.</div>}
    </aside>
    <ProofModal proof={proof} publication={selectedPub} contents={data.contents} nodeMap={nodeMap} onClose={()=>setProof(null)}/>
  </main>
  <PublicationDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} publications={graphPubs} search={search} setSearch={setSearch} onSelect={choosePublication} selectedId={selectedPub.publication_id}/>
  </div>
}
