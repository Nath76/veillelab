import React from 'react'
import Icon from './Icon.jsx'
import { sentenceCase, clip } from '../lib/text.js'

export default function PublicationCard({publication,onExplore}){
  const p=publication
  return <article className="pub-card">
    <div className="pub-card-body">
      <div className="pub-cover-wrap">
        {p.has_image ? <img className="pub-cover" src={`.${p.image_path}`} alt=""/> : <div className="pub-cover placeholder"><Icon name="file" size={32}/><span>{p.publication_id}</span></div>}
      </div>
      <div className="pub-info">
        <h3>{sentenceCase(p.titre)}</h3>
        <p className="org">{p.organisme_producteur}</p>
        <div className="pub-meta"><span>▣ {p.année_publication}</span><span>▤ {p.type_document}</span></div>
        <p>{clip(p.domaine ? `Domaine : ${p.domaine}. ${p.node_count} nœuds et ${p.relation_count} relations documentées.` : `${p.node_count} nœuds et ${p.relation_count} relations documentées.`,150)}</p>
      </div>
    </div>
    <div className="pub-actions">
      <a className="btn ghost" href={p.url_contenu || p.url_source} target="_blank" rel="noreferrer"><Icon name="file" size={17}/>Consulter la source</a>
      <button className="btn primary" onClick={()=>onExplore(p)}><Icon name="graph" size={17}/>Explorer</button>
    </div>
  </article>
}
