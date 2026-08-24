import React, { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import KnowledgeGraph from '../components/KnowledgeGraph.jsx'
import ProofModal from '../components/ProofModal.jsx'
import { askGraph } from '../services/chatApi.js'
import { buildAdjacency, nodeMeta } from '../lib/graph.js'
import { normalize, sentenceCase } from '../lib/text.js'

const LEGEND_TYPES=['acteur','expert_public','action','notion_idee','probleme','Problème','localisation','signal_faible','recommandation']
const TYPE_COLOR={actor:'#2d8fe8',action:'#f05a36',concept:'#7557d9',location:'#13aaa8',signal:'#ffad19',recommendation:'#df46c8'}
function colorForType(type){if(type==='probleme'||type==='Problème')return '#e13b34';if(type==='expert_public')return '#0e66c6';const meta=nodeMeta(type);return TYPE_COLOR[meta.className]||TYPE_COLOR.concept}
const SUGGESTED_QUESTIONS=[
  'Quels sont les nœuds les plus structurants ?',
  'Quels acteurs sont présents dans cette publication ?',
  'Quelles actions sont documentées ?',
]

function chunksFor(item,contents){
  const ids=String(item?.chunk_id_source||'').split(';').map(x=>x.trim()).filter(Boolean)
  return ids.map(id=>contents.find(c=>c.chunk_id===id)).filter(Boolean)
}

function relationLabel(type=''){
  const labels={
    REPOND_A:'Répond à',REPOSE_SUR:'Repose sur',SE_DECLINE_EN:'Se décline en',PERMET_DE:'Permet de',CARACTERISE:'Caractérise',ILLUSTRE:'Illustre',CONTRIBUE_A:'Contribue à',S_INSCRIT_DANS:'S’inscrit dans',MENE:'Mène',MET_EN_OEUVRE:'Met en œuvre',S_APPUIE_SUR:'S’appuie sur',CONCERNE:'Concerne',LOCALISE_DANS:'Localisé dans',EST_DESTINATAIRE_DE:'Est destinataire de',MOBILISE:'Mobilise',PRESIDE:'Préside',S_APPLIQUE_A:'S’applique à',PILOTE:'Pilote',RESPONSABLE_DE:'Responsable de',IMPULSE:'Impulse',ASSOCIATION:'Association',A_POUR_OBJECTIF:'A pour objectif',ASSOCIE_A:'Associé à',COLLABORE_AVEC:'Collabore avec',PARTICIPE_A:'Participe à',PRECONISE:'Préconise',PORTE:'Porte',DEVELOPPE:'Développe',ENCADRE:'Encadre',FINANCE:'Finance',UTILISE_POUR:'Utilise pour',INTERVIENT_SUR:'Intervient sur',SPECIALISE_DANS:'Spécialisé dans',EXPERTISE_SUR:'Expertise sur',FAIT_SUITE_A:'Fait suite à',COMPREND:'Comprend',OBSERVEE_DANS:'Observée dans',RENFORCE:'Renforce',INFLUENCE:'Influence'
  }
  return labels[type] || String(type||'').replace(/_/g,' ').toLowerCase().replace(/^./,c=>c.toUpperCase())
}

function InlineMarkdown({text=''}){
  const parts=String(text).split(/(\*\*[^*]+\*\*)/g)
  return <>{parts.map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:<React.Fragment key={i}>{part}</React.Fragment>)}</>
}

function MarkdownAnswer({text=''}){
  const lines=String(text).replace(/\\([#*_])/g,'$1').split(/\r?\n/)
  const out=[]
  let bullets=[]
  let numbered=[]
  const flush=()=>{
    if(bullets.length){out.push(<ul key={`u-${out.length}`}>{bullets.map((x,i)=><li key={i}><InlineMarkdown text={x}/></li>)}</ul>);bullets=[]}
    if(numbered.length){out.push(<ol key={`o-${out.length}`}>{numbered.map((x,i)=><li key={i}><InlineMarkdown text={x}/></li>)}</ol>);numbered=[]}
  }
  lines.forEach((raw,idx)=>{
    const line=raw.trim()
    if(!line){flush();return}
    const bullet=line.match(/^[-•]\s+(.*)$/)
    const num=line.match(/^\d+[.)]\s+(.*)$/)
    if(bullet){numbered=[];bullets.push(bullet[1]);return}
    if(num){bullets=[];numbered.push(num[1]);return}
    flush()
    if(/^---+$/.test(line)){out.push(<hr key={`hr-${idx}`}/>);return}
    const h=line.match(/^(#{1,3})\s+(.*)$/)
    if(h){const Tag=h[1].length===1?'h3':h[1].length===2?'h4':'h5';out.push(<Tag key={`h-${idx}`}><InlineMarkdown text={h[2]}/></Tag>);return}
    out.push(<p key={`p-${idx}`}><InlineMarkdown text={line}/></p>)
  })
  flush()
  return <div className="explorer-v7-markdown">{out}</div>
}

function PublicationThumb({publication}){
  return publication?.has_image
    ? <img src={`.${publication.image_path}`} alt=""/>
    : <div className="explorer-v7-thumb-placeholder"><Icon name="file" size={19}/></div>
}

function groupPublications(publications,mode){
  const getKey=mode==='year' ? p=>String(p.année_publication||'Sans année') : mode==='format' ? p=>p.type_document||'Autre format' : p=>p.organisme_producteur||'Autre source'
  const groups={}
  publications.forEach(p=>{const k=getKey(p);(groups[k]??=[]).push(p)})
  const keys=Object.keys(groups).sort((a,b)=>mode==='year'?String(b).localeCompare(String(a),'fr',{numeric:true}):a.localeCompare(b,'fr'))
  return keys.map(key=>({key,items:groups[key].sort((a,b)=>String(b.année_publication).localeCompare(String(a.année_publication),'fr',{numeric:true})||String(a.titre).localeCompare(String(b.titre),'fr'))}))
}

function SelectionView({publications,onSelect}){
  const [search,setSearch]=useState('')
  const [mode,setMode]=useState('source')
  const filtered=useMemo(()=>{
    const q=normalize(search)
    return q?publications.filter(p=>normalize(`${p.titre} ${p.organisme_producteur} ${p.type_document} ${p.année_publication}`).includes(q)):publications
  },[publications,search])
  const groups=useMemo(()=>groupPublications(filtered,mode),[filtered,mode])
  return <main className="page explorer-v7-selection">
    <section className="explorer-v7-selection-head">
      <div><h1>Explorer une publication</h1><p>Choisissez une publication pour ouvrir son graphe de connaissances.</p></div>
      <div className="explorer-v7-selection-search"><Icon name="search" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Titre, organisme, année…"/></div>
    </section>
    <div className="explorer-v7-selection-tabs"><button className={mode==='source'?'active':''} onClick={()=>setMode('source')}>Par source</button><button className={mode==='year'?'active':''} onClick={()=>setMode('year')}>Par année</button><button className={mode==='format'?'active':''} onClick={()=>setMode('format')}>Par format</button></div>
    <div className="explorer-v7-selection-list">{groups.map(group=><section key={group.key}><header><strong>{group.key}</strong><b>{group.items.length}</b></header><div>{group.items.map(pub=><button key={pub.publication_id} onClick={()=>onSelect(pub)}><PublicationThumb publication={pub}/><span><strong>{sentenceCase(pub.titre)}</strong><small>{pub.organisme_producteur}</small><small>{pub.année_publication} · {pub.type_document}</small></span><Icon name="chevron" size={17}/></button>)}</div></section>)}</div>
  </main>
}

function RelationInfo({relation,nodeMap,onSelectNode}){
  if(!relation)return null
  const source=nodeMap[relation.source_id],target=nodeMap[relation.cible_id]
  return <div className="explorer-v7-relation-info"><span>Relation documentée</span><h2>{relationLabel(relation.type_relation)}</h2><div><button onClick={()=>source&&onSelectNode(source)}>{source?.libelle||relation.source_id}</button><b>{relation.type_relation}</b><button onClick={()=>target&&onSelectNode(target)}>{target?.libelle||relation.cible_id}</button></div></div>
}

export default function Explorer({data}){
  const graphPubs=useMemo(()=>data.publications.filter(p=>p.has_graph).sort((a,b)=>String(b.année_publication).localeCompare(String(a.année_publication),'fr',{numeric:true})||String(a.titre).localeCompare(String(b.titre),'fr')),[data])
  const [selectedPub,setSelectedPub]=useState(null)
  const [selectedNode,setSelectedNode]=useState(null)
  const [selectedRelation,setSelectedRelation]=useState(null)
  const [proofItem,setProofItem]=useState(null)
  const [question,setQuestion]=useState('')
  const [chat,setChat]=useState(null)
  const [loading,setLoading]=useState(false)
  const [assistantOpen,setAssistantOpen]=useState(false)
  const [settingsOpen,setSettingsOpen]=useState(false)
  const [nodeSearch,setNodeSearch]=useState('')
  const [enabledTypes,setEnabledTypes]=useState(LEGEND_TYPES)
  const [showWeak,setShowWeak]=useState(false)
  const [nodeScale,setNodeScale]=useState(1.08)
  const [linkDensity,setLinkDensity]=useState(1.1)
  const [resetToken,setResetToken]=useState(0)
  const [fitToken,setFitToken]=useState(0)

  if(!selectedPub) return <SelectionView publications={graphPubs} onSelect={pub=>{setSelectedPub(pub);setSelectedNode(null);setSelectedRelation(null);setChat(null);setQuestion('');setAssistantOpen(false)}}/>

  const allNodes=data.nodes.filter(n=>n.publication_id===selectedPub.publication_id)
  const allRelations=data.relations.filter(r=>r.publication_id===selectedPub.publication_id)
  const enabledSet=new Set(enabledTypes)
  const nodes=allNodes.filter(n=>enabledSet.has(n.type_noeud))
  const allowedIds=new Set(nodes.map(n=>n.node_id))
  const relations=allRelations.filter(r=>allowedIds.has(r.source_id)&&allowedIds.has(r.cible_id))
  const nodeMap=Object.fromEntries(allNodes.map(n=>[n.node_id,n]))
  const adjacency=buildAdjacency(allNodes,allRelations)
  const defaultFocus=[...allNodes].sort((a,b)=>(adjacency.get(b.node_id)?.length||0)-(adjacency.get(a.node_id)?.length||0))[0]
  const currentNode=selectedNode||defaultFocus
  const currentItem=selectedRelation||currentNode
  const currentMeta=currentNode?nodeMeta(currentNode.type_noeud):null
  const currentColor=currentNode?colorForType(currentNode.type_noeud):'#2d8fe8'
  const currentLinked=currentNode?(adjacency.get(currentNode.node_id)||[]).map(x=>nodeMap[x.id]).filter(Boolean).slice(0,8):[]
  const evidenceList=chunksFor(currentItem,data.contents)
  const evidence=evidenceList[0]||null
  const highlighted=chat?.noeuds_selectionnes||[]
  const focusId=selectedRelation?.source_id || currentNode?.node_id || highlighted[0]
  const nodeQuery=normalize(nodeSearch)
  const nodeMatches=nodeQuery?allNodes.filter(n=>normalize(n.libelle).includes(nodeQuery)).slice(0,8):[]
  const visibleRelCount=showWeak?relations.length:relations.filter(r=>r.source_id===focusId||r.cible_id===focusId).length

  const selectNode=node=>{setSelectedNode(node);setSelectedRelation(null);setProofItem(null)}
  const selectRelation=relation=>{setSelectedRelation(relation);setSelectedNode(nodeMap[relation.source_id]||null);setProofItem(null)}
  const reset=()=>{setSelectedNode(null);setSelectedRelation(null);setChat(null);setQuestion('');setAssistantOpen(false);setNodeSearch('');setEnabledTypes(LEGEND_TYPES);setShowWeak(false);setNodeScale(1.08);setLinkDensity(1.1);setResetToken(x=>x+1)}
  const toggleType=type=>setEnabledTypes(list=>list.includes(type)?list.filter(x=>x!==type):[...list,type])

  async function runQuestion(text){
    const q=String(text||'').trim()
    if(!q||loading)return
    setQuestion(q)
    setLoading(true)
    try{setChat(await askGraph(q,selectedPub,allNodes,allRelations))}
    catch(err){setChat({error:err.message,reponse:`Le service de dialogue n’est pas disponible : ${err.message}`,noeuds_selectionnes:[]})}
    finally{setLoading(false)}
  }
  function submit(e){e.preventDefault();runQuestion(question)}

  return <main className="page explorer-v7-page">
    <header className="explorer-v7-topbar">
      <button className="explorer-v7-back" onClick={()=>{setSelectedPub(null);setSelectedNode(null);setSelectedRelation(null);setChat(null);setQuestion('');setAssistantOpen(false)}}><Icon name="back" size={17}/>Retour aux publications</button>
      <div className="explorer-v7-pubtitle"><span><Icon name="graph" size={22}/></span><div><h1>{sentenceCase(selectedPub.titre)}</h1><p>{selectedPub.organisme_producteur} · {selectedPub.année_publication} · {selectedPub.type_document}</p></div></div>
      <div className="explorer-v7-actions"><button onClick={()=>setSettingsOpen(v=>!v)}><Icon name="layers" size={17}/>Ajuster le graphe</button><button onClick={()=>setFitToken(x=>x+1)}><Icon name="target" size={17}/>Ajuster à l’écran</button></div>
    </header>

    <div className="explorer-v7-layout">
      <section className="explorer-v7-graph-panel">
        <div className="explorer-v7-mode"><strong>Vue synthétique</strong><span>Le graphe occupe tout l’espace disponible. Cliquez-glissez pour le déplacer, puis cliquez sur un nœud pour recentrer l’exploration.</span></div>
        {settingsOpen&&<aside className="explorer-v7-settings">
          <h3>Réglages du graphe</h3>
          <label>Rechercher un nœud</label><div className="explorer-v7-node-search"><input value={nodeSearch} onChange={e=>setNodeSearch(e.target.value)} placeholder="Terme, entité, problème…"/><Icon name="search" size={17}/></div>
          {nodeMatches.length>0&&<div className="explorer-v7-node-results">{nodeMatches.map(n=><button key={n.node_id} onClick={()=>{selectNode(n);setNodeSearch('')}}>{n.libelle}<small>{nodeMeta(n.type_noeud).label}</small></button>)}</div>}
          <div className="explorer-v7-range-grid"><label><span>Taille des nœuds</span><input type="range" min=".85" max="1.35" step=".05" value={nodeScale} onChange={e=>setNodeScale(Number(e.target.value))}/></label><label><span>Densité des liens</span><input type="range" min=".7" max="1.8" step=".1" value={linkDensity} onChange={e=>setLinkDensity(Number(e.target.value))}/></label></div>
          <div className="explorer-v7-switch"><span>Afficher les liens faibles</span><input className="switch" type="checkbox" checked={showWeak} onChange={e=>setShowWeak(e.target.checked)}/></div>
          <label>Types visibles</label><div className="explorer-v7-type-grid">{[...new Set(allNodes.map(n=>n.type_noeud))].map(type=>{const meta=nodeMeta(type),count=allNodes.filter(n=>n.type_noeud===type).length;return <button key={type} className={enabledTypes.includes(type)?'active':''} onClick={()=>toggleType(type)}><i style={{background:colorForType(type)}}/><span>{meta.label}</span><b>{count}</b></button>})}</div>
          <button className="explorer-v7-reset" onClick={reset}><Icon name="reset" size={15}/>Réinitialiser</button>
        </aside>}
        <KnowledgeGraph nodes={nodes} relations={relations} selectedId={focusId} selectedRelationId={selectedRelation?.relation_id} onSelectNode={selectNode} onSelectRelation={selectRelation} highlightIds={highlighted} nodeScale={nodeScale} linkDensity={linkDensity} showWeak={showWeak} maxNodes={20} resetToken={resetToken} fitToken={fitToken}/>
        <div className="explorer-v7-count"><strong>{allNodes.length}</strong><span>nœuds dans la publication · {allRelations.length} liens documentés</span></div>
      </section>

      <aside className="explorer-v7-right">
        <section className="explorer-v7-info">
          {selectedRelation?<RelationInfo relation={selectedRelation} nodeMap={nodeMap} onSelectNode={selectNode}/>:<>
            <div className="explorer-v7-type"><i style={{background:currentColor}}/><span>{currentMeta?.label||'Élément'}</span>{selectedNode&&<button onClick={()=>setSelectedNode(null)}><Icon name="close" size={14}/></button>}</div>
            <h2>{currentNode?.libelle||'Sélectionnez un nœud'}</h2>
            <p className="explorer-v7-info-copy">La fiche contextuelle reste visible en priorité. L’assistant d’exploration s’ouvre à la demande depuis le bouton ci-dessous.</p>
            <h4>Nœuds liés ({currentLinked.length})</h4><div className="explorer-v7-linked">{currentLinked.map(n=>{const meta=nodeMeta(n.type_noeud),color=colorForType(n.type_noeud);return <button key={n.node_id} onClick={()=>selectNode(n)}><i style={{background:color}}/><span>{n.libelle}</span><b style={{color}}>{meta.label}</b></button>})}</div>
          </>}

          <details className="explorer-v7-proof-doc" open><summary><Icon name="file" size={16}/><span>Preuve documentaire</span><Icon name="chevron" size={15}/></summary><div><article><PublicationThumb publication={selectedPub}/><span><strong>{sentenceCase(selectedPub.titre)}</strong><small>{selectedPub.organisme_producteur} · {selectedPub.année_publication}</small></span></article><div className="explorer-v7-proof-excerpt"><strong>{currentItem?.page_source?`Page / timecode ${currentItem.page_source}`:'Page / timecode non renseigné'}</strong><p>{evidence?`${evidence.texte.slice(0,240)}${evidence.texte.length>240?'…':''}`:'Aucun extrait associé n’est disponible pour cet élément.'}</p></div></div></details>

          <div className="explorer-v7-proof-full"><div><strong>Preuve complète</strong><small>{evidenceList.length?`${evidenceList.length} extrait${evidenceList.length>1?'s':''} disponible${evidenceList.length>1?'s':''}`:'Aucun extrait associé'}</small></div><button onClick={()=>setProofItem(currentItem)}><Icon name="book" size={16}/>Ouvrir</button></div>

          <button className="explorer-v7-assistant-launch" onClick={()=>setAssistantOpen(true)}>
            <span className="explorer-v7-assistant-launch-icon">✦</span>
            <span><strong>Assistant d’exploration</strong><small>Interroger cette publication</small></span>
            <Icon name="chevron" size={18}/>
          </button>
        </section>
      </aside>
    </div>

    {assistantOpen&&<div className="explorer-v7-assistant-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setAssistantOpen(false)}>
      <section className="explorer-v7-assistant-modal">
        <button className="explorer-v7-assistant-close" onClick={()=>setAssistantOpen(false)}><Icon name="close" size={19}/></button>
        <header>
          <span className="explorer-v7-assistant-modal-mark">✦</span>
          <div><span className="explorer-v7-assistant-kicker">ASSISTANT D’EXPLORATION</span><h2>Interroger la publication</h2><p>{sentenceCase(selectedPub.titre)}</p></div>
        </header>
        <form className="explorer-v7-assistant-form" onSubmit={submit}>
          <textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Posez une question sur cette publication…" rows="3" autoFocus/>
          <button disabled={loading||!question.trim()}><Icon name="send" size={19}/>Interroger</button>
        </form>
        {!chat&&!loading&&<div className="explorer-v7-assistant-modal-suggestions"><span>Questions suggérées</span>{SUGGESTED_QUESTIONS.map(q=><button key={q} onClick={()=>runQuestion(q)}>{q}</button>)}</div>}
        {loading&&<div className="explorer-v7-assistant-modal-loading">Interrogation du graphe…</div>}
        {chat&&<div className="explorer-v7-assistant-modal-answer">
          <div className="explorer-v7-assistant-answer-scroll"><MarkdownAnswer text={chat.reponse}/>{highlighted.length>0&&<div className="explorer-v7-answer-nodes">{highlighted.slice(0,6).map(id=>nodeMap[id]?<button key={id} onClick={()=>{selectNode(nodeMap[id]);setAssistantOpen(false)}}>{nodeMap[id].libelle}</button>:null)}</div>}</div>
          <footer><button className="explorer-v7-new-question" onClick={()=>{setChat(null);setQuestion('')}}>Nouvelle question</button><button className="explorer-v7-return-graph" onClick={()=>setAssistantOpen(false)}>Retour au graphe</button></footer>
        </div>}
      </section>
    </div>}

    <ProofModal proof={proofItem} publication={selectedPub} contents={data.contents} nodeMap={nodeMap} onClose={()=>setProofItem(null)}/>
  </main>
}
