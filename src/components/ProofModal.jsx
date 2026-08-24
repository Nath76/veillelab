import React, { useMemo } from 'react'
import Icon from './Icon.jsx'
import { sentenceCase } from '../lib/text.js'

function Highlighted({text,terms}){
  const clean=terms.filter(Boolean).map(x=>String(x).trim()).filter(x=>x.length>2).slice(0,4)
  if(!clean.length) return <>{text}</>
  const esc=clean.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))
  const re=new RegExp(`(${esc.join('|')})`,'gi')
  const parts=String(text).split(re)
  return <>{parts.map((p,i)=>clean.some(t=>t.toLowerCase()===p.toLowerCase())?<mark key={i}>{p}</mark>:p)}</>
}

export default function ProofModal({proof,publication,contents,nodeMap,onClose}){
  const chunks=useMemo(()=>{
    const ids=String(proof?.chunk_id_source||'').split(';').map(x=>x.trim()).filter(Boolean)
    return ids.map(id=>contents.find(c=>c.chunk_id===id)).filter(Boolean)
  },[proof,contents])
  if(!proof)return null
  const isRelation=Boolean(proof?.source_id&&proof?.cible_id&&proof?.type_relation)
  const source=isRelation?nodeMap?.[proof.source_id]:null
  const target=isRelation?nodeMap?.[proof.cible_id]:null
  const terms=isRelation?[source?.libelle,target?.libelle,proof.type_relation]:[proof.libelle]
  return <div className="modal-backdrop explorer-v7-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <section className="proof-modal explorer-v7-proof-modal">
      <button className="icon-btn modal-close explorer-v7-modal-close" onClick={onClose}><Icon name="close"/></button>
      <div className="proof-kicker explorer-v7-proof-kicker">PREUVE COMPLÈTE</div>
      <h2>{sentenceCase(publication?.titre||'')}</h2>
      <p className="proof-summary explorer-v7-proof-summary">{isRelation?<><strong>{source?.libelle}</strong><span className="relation-pill explorer-v7-relation-pill">{proof.type_relation}</span><strong>{target?.libelle}</strong></>:<strong>{proof.libelle}</strong>}</p>
      <div className="proof-meta explorer-v7-proof-meta"><span>Page / timecode : <strong>{proof.page_source||'non renseigné'}</strong></span><span>{chunks.length} extrait{chunks.length>1?'s':''} associé{chunks.length>1?'s':''}</span></div>
      <div className="proof-scroll explorer-v7-proof-scroll">
        {chunks.length?chunks.map(c=><article className="chunk explorer-v7-chunk" key={c.chunk_id}><div className="chunk-head"><span>{c.section||c.chunk_id}</span><span>{c.chunk_id} · p. {c.page_debut}{c.page_fin&&c.page_fin!==c.page_debut?`–${c.page_fin}`:''}</span></div><p><Highlighted text={c.texte} terms={terms}/></p></article>):<div className="empty-proof explorer-v7-empty-proof">Aucun chunk n’est associé à cet élément dans la base.</div>}
      </div>
      <div className="proof-footer explorer-v7-proof-footer"><div><span className="source-label">Source</span><strong>{publication?.organisme_producteur}</strong></div><a className="btn primary" href={publication?.url_contenu||publication?.url_source} target="_blank" rel="noreferrer">Ouvrir le document <Icon name="external" size={16}/></a></div>
    </section>
  </div>
}
