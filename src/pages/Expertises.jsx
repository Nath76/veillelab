import React, { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import ExpertiseConstellation, { selectOverviewExpertises } from '../components/ExpertiseConstellation.jsx'
import { normalize, sentenceCase } from '../lib/text.js'

const familyColor={
  'Instrument / dispositif':'#77639B',
  'Méthode / savoir-faire':'#AE895F',
  'Problème public':'#648879',
}

function Accordion({title,children}){
  const [open,setOpen]=useState(false)
  return <div className={`ui-accordion ${open?'open':''}`}><button onClick={()=>setOpen(v=>!v)}><span>{title}</span><span>{open?'⌃':'⌄'}</span></button>{open&&<div className="accordion-body">{children}</div>}</div>
}

export default function Expertises({data}){
  const [selected,setSelected]=useState(null)
  const [search,setSearch]=useState('')
  const [entity,setEntity]=useState('Toutes les entités')
  const [family,setFamily]=useState('Tous')
  const [resetToken,setResetToken]=useState(0)
  const [fitToken,setFitToken]=useState(0)

  const entities=useMemo(()=>['Toutes les entités',...new Set(data.expertise_nodes.flatMap(n=>n.entities||[]))].sort((a,b)=>a.localeCompare(b,'fr')),[data])
  const filtered=useMemo(()=>data.expertise_nodes.filter(n=>(entity==='Toutes les entités'||(n.entities||[]).includes(entity))&&(family==='Tous'||n.family===family)),[data,entity,family])
  const found=useMemo(()=>{const q=normalize(search);return q?filtered.filter(n=>normalize(`${n.label} ${n.definition} ${(n.entities||[]).join(' ')}`).includes(q)).slice(0,8):[]},[search,filtered])
  const visibleEdges=useMemo(()=>{const ids=new Set(filtered.map(n=>n.id));return data.expertise_edges.filter(e=>ids.has(e.source)&&ids.has(e.target))},[filtered,data])
  const overviewNodes=useMemo(()=>selectOverviewExpertises(filtered,80),[filtered])
  const overviewIds=useMemo(()=>new Set(overviewNodes.map(n=>n.id)),[overviewNodes])
  const overviewLinks=useMemo(()=>visibleEdges.filter(e=>overviewIds.has(e.source)&&overviewIds.has(e.target)).slice(0,220),[visibleEdges,overviewIds])

  const publicationCount=useMemo(()=>new Set(data.expertise_nodes.flatMap(n=>(n.publications||[]).map(p=>p.publication_id))).size,[data])
  const domainCount=useMemo(()=>new Set(data.expertise_nodes.flatMap(n=>n.domains||[])).size,[data])
  const entityCount=useMemo(()=>new Set(data.expertise_nodes.flatMap(n=>n.entities||[])).size,[data])

  const clear=()=>{setSelected(null);setSearch('');setEntity('Toutes les entités');setFamily('Tous');setResetToken(x=>x+1)}

  return <main className="expertise-guided-v02 has-drawer">
    <aside className="expertise-guide-column">
      <section className="expertise-intro-card">
        <span className="expertise-kicker">EXPERTISES MINISTÉRIELLES</span>
        <h2>Pourquoi cette carte ?</h2>
        <p>Le ministère de l’Intérieur produit chaque année une grande variété de travaux sur les sujets relevant de ses domaines d’intervention. Il combine ainsi, d’une manière unique, <strong>culture de l’action</strong> et capacité collective à mettre en perspective les politiques publiques.</p>
        <p>Cette production intellectuelle fait du ministère un contributeur fondamental au débat public sur des sujets très divers : sécurité intérieure, publique, civile et routière ; migrations et citoyenneté ; protection des populations ; anticipation et gestion des crises ; cultes et laïcité ; action publique territoriale.</p>
        <p>Ces publications mobilisent un très large éventail d’expertises. Cette carte les rend visibles dans une perspective de <strong>management de la connaissance</strong> et permet de découvrir les savoir-faire spécifiques d’une grande diversité de métiers.</p>
      </section>

      <section className="expertise-reading-card">
        <div className="expertise-reading-icon"><Icon name="info" size={18}/></div>
        <div><strong>Comment lire cette carte ?</strong><p>Les expertises sont regroupées en constellations stables. Les trois familles — <b>Instrument / dispositif</b>, <b>Méthode / savoir-faire</b> et <b>Problème public</b> — se déclinent en micro-expertises. Cliquez sur un nœud pour explorer ses associations.</p></div>
      </section>

      <section className="expertise-filter-card">
        <h3>Explorer la carte</h3>
        <div className="expertise-search-wrap"><Icon name="search" size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une expertise…"/></div>
        {found.length>0&&<div className="expertise-search-results">{found.map(n=><button key={n.id} onClick={()=>{setSelected(n);setSearch('')}}><span>{n.label}</span><small>{n.family}</small></button>)}</div>}
        <label><span>Entité(s)</span><select value={entity} onChange={e=>{setEntity(e.target.value);setSelected(null)}}>{entities.map(x=><option key={x}>{x}</option>)}</select></label>
        <label><span>Type d’expertise</span><select value={family} onChange={e=>{setFamily(e.target.value);setSelected(null)}}><option>Tous</option><option>Instrument / dispositif</option><option>Méthode / savoir-faire</option><option>Problème public</option></select></label>
      </section>

      <section className="expertise-stats-card">
        <h3>La carte en quelques chiffres</h3>
        <div className="expertise-stats-grid">
          <div><strong>{entityCount}</strong><span>Entités ministérielles</span></div>
          <div><strong>{data.expertise_nodes.length}</strong><span>Micro-expertises</span></div>
          <div><strong>{publicationCount}</strong><span>Publications associées</span></div>
          <div><strong>{domainCount}</strong><span>Domaines couverts</span></div>
        </div>
      </section>
    </aside>

    <section className="expertise-map-column">
      <header className="expertise-map-heading">
        <div><span className="expertise-kicker">CARTE DES EXPERTISES</span><h1>Carte des expertises ministérielles</h1><p>Explorez les expertises mobilisées par les entités du ministère de l’Intérieur.</p></div>
        <div className="expertise-map-actions"><button onClick={clear}><Icon name="reset" size={16}/>Réinitialiser</button><button onClick={()=>setFitToken(x=>x+1)}><Icon name="target" size={16}/>Ajuster</button></div>
      </header>

      <div className="expertise-map-status">
        <div><strong>{overviewNodes.length}</strong><span>nœuds affichés</span></div>
        <div><strong>{Math.min(220,overviewLinks.length)}</strong><span>liens visibles</span></div>
        <p>{selected?'Vue locale : les expertises associées au nœud sélectionné sont mises en avant.':'Vue globale : seuls les noms des constellations sont affichés. Cliquez sur un nœud pour entrer dans le détail.'}</p>
      </div>

      <div className="expertise-map-frame">
        <ExpertiseConstellation nodes={filtered} edges={visibleEdges} selected={selected} onSelect={setSelected} nodeSize={1} linkDensity={1} resetToken={resetToken} fitToken={fitToken}/>
      </div>
    </section>

    <aside className="detail-drawer expertise-detail-drawer">
      {selected?<>
        <button className="drawer-close" onClick={()=>setSelected(null)}><Icon name="close"/></button>
        <div className="drawer-type"><i style={{background:familyColor[selected.family]||'#AE895F'}}></i>{selected.family}</div>
        <h2>{selected.label}</h2>
        <p className="drawer-definition">{selected.definition}</p>
        <h4>Entité(s)</h4><div className="chips">{(selected.entities||[]).map(x=><span className="chip" key={x}>{x}</span>)}</div>
        <h4>Publications associées</h4><div className="publication-mini-list">{selected.publications.slice(0,4).map(p=><article key={p.publication_id}>{p.image_path?<img src={`.${p.image_path}`} alt=""/>:<div className="mini-placeholder">{p.publication_id}</div>}<div><strong>{sentenceCase(p.titre)}</strong><small>{p.organisme} · {p.annee}</small></div></article>)}</div>
        <Accordion title="Expertises directement associées"><div className="chips">{selected.associated.slice(0,12).map(a=>{const n=data.expertise_nodes.find(x=>x.id===a.id);return n?<button className="chip clickable" key={a.id} onClick={()=>setSelected(n)}>{n.label}</button>:null})}</div></Accordion>
        <Accordion title="Domaines mobilisés"><div className="chips">{(selected.domains||[]).map(x=><span className="chip" key={x}>{x}</span>)}</div></Accordion>
      </>:<>
        <div className="drawer-placeholder">
          <span className="expertise-kicker">CONSULTATION</span>
          <h2>Sélectionnez une expertise</h2>
          <p className="drawer-definition">Cliquez sur un cluster ou sur un nœud pour afficher sa fiche détaillée, les entités qui la mobilisent, ses publications associées et ses domaines d’usage.</p>
          <div className="drawer-empty-state">
            <div className="empty-step"><strong>1</strong><span>Commencez par une constellation dans la carte centrale.</span></div>
            <div className="empty-step"><strong>2</strong><span>Zoomez ou cliquez sur un nœud pour faire apparaître ses micro-expertises.</span></div>
            <div className="empty-step"><strong>3</strong><span>Consultez ici la fiche complète de l’expertise sélectionnée.</span></div>
          </div>
        </div>
      </>}
    </aside>
  </main>
}
