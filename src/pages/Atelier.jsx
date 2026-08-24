import React, { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { generateTreatment } from '../services/treatmentApi.js'

const regimeClass={'Synthèse stricte':'strict','Extraction stricte':'extract','Enrichissement contrôlé':'enrich'}
const groupOf=t=>['T01','T02','T04'].includes(t.traitement_id)?'Productions d’analyse':['T03','T05','T06','T08','T09'].includes(t.traitement_id)?'Productions de structuration et de veille':'Productions de diffusion et de détection'

export default function Atelier({data}){
 const [selected,setSelected]=useState(null),[need,setNeed]=useState('')
 const groups=useMemo(()=>Object.groupBy?Object.groupBy(data.treatments,groupOf):data.treatments.reduce((a,t)=>((a[groupOf(t)]??=[]).push(t),a),{}),[data])
 if(selected) return <Workspace treatment={selected} data={data} initialNeed={need} onBack={()=>setSelected(null)}/>
 return <main className="page workshop-page"><div className="workshop-grid"><section><div className="page-heading"><h1>Atelier de veille</h1><p>Je pars d’un besoin et je choisis une transformation.</p></div><div className="workshop-hero"><div className="compass-art">✦<div>✧</div></div><div><h2>Transformez vos besoins en productions à forte valeur</h2><p>L’atelier de veille vous aide à choisir la production la plus adaptée à votre besoin, en mobilisant les traitements d’IA les plus pertinents.</p><div className="need-box"><Icon name="spark"/><input value={need} onChange={e=>setNeed(e.target.value)} placeholder="Ex. : Comprendre les signaux faibles autour d’un phénomène…"/><button>Parcourir les productions <Icon name="chevron"/></button></div></div></div>{Object.entries(groups).map(([name,items])=><section className="treatment-group" key={name}><h2>{name}</h2><div className="treatment-grid">{items.map(t=><button className="treatment-card" key={t.traitement_id} onClick={()=>setSelected(t)}><div className="treat-icon"><Icon name={t.traitement_id==='T09'?'pin':t.traitement_id==='T08'?'graph':t.traitement_id==='T10'?'warning':'spark'}/></div><div><small>Fonction : {t.fonction}</small><h3>{t.nom_traitement}</h3><p>{t.objectif}</p><span className={`regime ${regimeClass[t.regime_IA]||''}`}>{t.regime_IA}</span></div><Icon name="chevron"/></button>)}</div></section>)}</section><aside className="regime-panel"><h3>Les régimes IA disponibles <Icon name="info" size={16}/></h3><Regime cls="strict" title="Synthèse stricte">L’IA condense et organise l’information à partir de sources sélectionnées.</Regime><Regime cls="extract" title="Extraction stricte">L’IA extrait des éléments factuels sans interprétation.</Regime><Regime cls="enrich" title="Enrichissement contrôlé">Les propositions de l’IA sont clairement distinguées des informations issues des sources.</Regime></aside></div></main>
}

function Regime({cls,title,children}){return <div className={`regime-info ${cls}`}><div className="regime-icon">✦</div><div><strong>{title}</strong><p>{children}</p><span className={`regime ${cls}`}>{title}</span></div></div>}

function Workspace({treatment,data,onBack,initialNeed=''}){
 const pubs=data.publications.filter(p=>p.chunk_count>0).slice(0,20)
 const isT01=treatment.traitement_id==='T01'
 const [selected,setSelected]=useState(pubs.length?[pubs[0].publication_id]:[])
 const [need,setNeed]=useState(initialNeed)
 const [generation,setGeneration]=useState(null)
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')

 const selectedPubs=pubs.filter(p=>selected.includes(p.publication_id))
 const togglePublication=id=>{
   setGeneration(null);setError('')
   if(isT01){setSelected([id]);return}
   setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])
 }

 const runGeneration=async()=>{
   if(!isT01||!need.trim()||!selectedPubs.length||loading)return
   setLoading(true);setError('')
   try{
     const result=await generateTreatment({treatment,need:need.trim(),publications:selectedPubs,contents:data.contents})
     setGeneration(result)
   }catch(e){setError(e?.message||String(e));setGeneration(null)}finally{setLoading(false)}
 }

 return <main className="page workspace-page"><button className="back-link" onClick={onBack}><Icon name="back"/>Retour à l’atelier</button><div className="workspace-head"><div><h1>{treatment.nom_traitement}</h1><p>{treatment.fonction}</p></div><span className={`regime ${regimeClass[treatment.regime_IA]||''}`}>{treatment.regime_IA}</span></div><div className="workspace-layout"><aside className="corpus-panel"><h3>Corpus sélectionné <span>{selected.length} source{selected.length>1?'s':''}</span></h3>{isT01&&<div className="corpus-scope-note"><Icon name="info" size={15}/><span>T01 est défini pour une publication : choisissez une source.</span></div>}{pubs.map(p=><label className={`corpus-item ${selected.includes(p.publication_id)?'selected':''}`} key={p.publication_id}><input type={isT01?'radio':'checkbox'} name={isT01?'t01-source':undefined} checked={selected.includes(p.publication_id)} onChange={()=>togglePublication(p.publication_id)}/>{p.has_image?<img src={`.${p.image_path}`} alt=""/>:<div className="mini-placeholder">{p.publication_id}</div>}<div><strong>{p.titre}</strong><span>{p.organisme_producteur} · {p.année_publication}</span></div></label>)}</aside><section className="production-panel"><div className="user-need"><label>Besoin utilisateur</label><textarea value={need} onChange={e=>{setNeed(e.target.value);setError('')}} placeholder="Décrivez le besoin, la question ou le livrable attendu…"/></div><div className="production-sheet"><h3>Cadre du traitement</h3><Row label="Objectif" value={treatment.objectif}/><Row label="Périmètre" value={treatment.perimetre}/><Row label="Documents compatibles" value={treatment.type_document_compatible}/><Row label="Données mobilisées" value={treatment.donnees_mobilisees}/><Row label="Format de sortie" value={treatment.format_sortie}/><Row label="Provenance exigée" value={treatment.provenance_exigee}/>{isT01?<GenerationT01 generation={generation} loading={loading} error={error} need={need} selectedCount={selectedPubs.length} onGenerate={runGeneration}/>:<div className="production-placeholder"><Icon name="spark" size={30}/><strong>Génération à connecter</strong><p>Le moteur commun sera branché progressivement après validation de T01.</p><button className="btn primary" disabled>Générer avec le corpus sélectionné</button></div>}</div></section><aside className="source-rules"><h3>Règles de production</h3><p><strong>Régime IA :</strong> {treatment.regime_IA}</p><p><strong>Interaction :</strong> {treatment.interaction_utilisateur}</p><p><strong>Mode :</strong> {treatment.mode_generation}</p><div className="source-rule"><Icon name="book"/><span>Les contenus produits doivent conserver leur provenance lorsque le traitement l’exige.</span></div>{isT01&&<div className="source-rule engine-rule"><Icon name="spark"/><span>Le moteur sélectionne les chunks utiles, puis vérifie chaque provenance avant d’afficher le résumé.</span></div>}</aside></div></main>
}

function GenerationT01({generation,loading,error,need,selectedCount,onGenerate}){
 if(loading)return <div className="generation-state loading"><div className="generation-spinner">✦</div><strong>Sélection des passages et génération…</strong><p>Le moteur prépare un contexte documentaire limité aux chunks utiles et conserve les pages sources.</p></div>
 if(error)return <div className="generation-state error"><Icon name="warning" size={25}/><strong>La génération n’a pas abouti</strong><p>{error}</p><button className="btn primary" onClick={onGenerate}>Réessayer</button></div>
 if(!generation)return <div className="production-placeholder connected"><Icon name="spark" size={30}/><strong>Moteur T01 connecté</strong><p>Le résumé sera produit exclusivement à partir des chunks de la publication sélectionnée, avec provenance contrôlée.</p><button className="btn primary" disabled={!need.trim()||!selectedCount} onClick={onGenerate}>Générer avec la source sélectionnée</button></div>
 return <ResumeAnalytique result={generation} onRegenerate={onGenerate}/>
}

function ResumeAnalytique({result,onRegenerate}){
 const out=result?.output||{}
 return <section className="generated-output"><header className="generated-output-head"><div><span className="generated-kicker">PRODUCTION IA · SYNTHÈSE STRICTE</span><h2>Résumé analytique</h2><p>{result?.corpus?.map(p=>p.titre).join(' · ')}</p></div><div className="generation-metrics"><span>{result?.selection?.chunks_retenus||0} chunks retenus</span><button onClick={onRegenerate}><Icon name="reset" size={15}/>Régénérer</button></div></header><PointSection title="Sujet" point={out.sujet}/><PointSection title="Problématique" point={out.problematique}/><ListSection title="Résultats" items={out.resultats}/><ListSection title="Enseignements" items={out.enseignements}/>{out.nuances?.length>0&&<ListSection title="Nuances et précautions" items={out.nuances} subtle/>}<div className="generated-sources"><h3>Sources</h3>{(result?.corpus||[]).map(pub=><a key={pub.publication_id} href={pub.url||'#'} target="_blank" rel="noreferrer"><Icon name="book" size={15}/><span><strong>{pub.titre}</strong><small>{pub.organisme_producteur}{pub.annee_publication?` · ${pub.annee_publication}`:''}</small></span><Icon name="external" size={14}/></a>)}</div></section>
}

function PointSection({title,point}){
 if(!point?.texte)return null
 return <section className="generated-section"><h3>{title}</h3><p>{point.texte}</p><ProvenanceChips provenances={point.provenances}/></section>
}

function ListSection({title,items=[],subtle=false}){
 if(!items.length)return null
 return <section className={`generated-section ${subtle?'subtle':''}`}><h3>{title}</h3><div className="generated-list">{items.map((item,i)=><article key={i}><span className="generated-index">{i+1}</span><div><p>{item.texte}</p><ProvenanceChips provenances={item.provenances}/></div></article>)}</div></section>
}

function ProvenanceChips({provenances=[]}){
 if(!provenances.length)return null
 const unique=[];const seen=new Set()
 provenances.forEach(p=>{const key=`${p.publication_id}|${p.page}`;if(!seen.has(key)){seen.add(key);unique.push(p)}})
 return <div className="provenance-chips">{unique.map((p,i)=><span key={`${p.publication_id}-${p.page}-${i}`}>{p.publication_id} · p. {p.page}</span>)}</div>
}

function Row({label,value}){return <div className="sheet-row"><strong>{label}</strong><span>{value}</span></div>}
