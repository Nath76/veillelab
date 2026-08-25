import React, { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import ReflectionMap from '../components/ReflectionMap.jsx'
import { generateTreatment } from '../services/treatmentApi.js'

const regimeClass={'Synthèse stricte':'strict','Extraction stricte':'extract','Enrichissement contrôlé':'enrich'}
const ALLOWED_TREATMENTS=[
  {key:'resume',title:'Résumé analytique',ids:['T01'],icon:'spark',fallbackRegime:'Synthèse stricte',description:'Obtenez une synthèse structurée et neutre d’une publication sélectionnée.'},
  {key:'glossaire',title:'Glossaire',ids:['T02'],icon:'book',fallbackRegime:'Enrichissement contrôlé',description:'Générez un glossaire des termes clés et notions importantes du sujet.'},
  {key:'carte',title:'Carte de réflexion assistée',ids:['T03'],icon:'graph',fallbackRegime:'Enrichissement contrôlé',description:'Structurez vos idées, établissez des liens et explorez de nouvelles perspectives avec l’IA.'},
  {key:'recommandations',title:'Extraction de recommandations',ids:['T04'],icon:'spark',fallbackRegime:'Extraction stricte',description:'Identifiez et extrayez les recommandations clés des rapports et documents.'},
  {key:'experts',title:'Experts ministériels',ids:['T06','T08'],match:/expert/i,icon:'spark',fallbackRegime:'Enrichissement contrôlé',description:'Repérez des experts ministériels et leurs domaines d’expertise sur vos sujets.'},
  {key:'scenario',title:'Scénario de veille',ids:['T05'],match:/sc[eé]nario/i,icon:'pin',fallbackRegime:'Enrichissement contrôlé',description:'Élaborez votre scénario de veille avec l’appui de l’IA générative, étape par étape.'}
]

const ATELIER_SCREEN_STYLES=`
.workshop-page.qvl-v02{padding-top:8px}
.qvl-v02 .qvl-workshop-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:start}
.qvl-v02 .qvl-workshop-main{min-width:0}
.qvl-v02 .qvl-page-heading{margin:0 0 16px}
.qvl-v02 .qvl-page-heading h1{margin:0;color:#102a56;font-size:36px;line-height:1.06;letter-spacing:-.03em}
.qvl-v02 .qvl-page-heading p{margin:7px 0 0;color:#173b76;font-size:15px}
.qvl-v02 .qvl-promise{position:relative;overflow:hidden;display:grid;grid-template-columns:54px minmax(0,1fr) 330px;gap:18px;align-items:center;padding:24px 26px;border:1px solid #bfd4fa;border-radius:14px;background:linear-gradient(100deg,#f7fbff 0%,#edf6ff 65%,#f7fbff 100%);box-shadow:0 6px 18px rgba(32,77,145,.08)}
.qvl-v02 .qvl-promise-icon{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:#0f3f9d;color:#fff;font-size:25px;box-shadow:0 8px 18px rgba(15,63,157,.18)}
.qvl-v02 .qvl-promise-copy{position:relative;z-index:2}
.qvl-v02 .qvl-promise-lead{margin:0 0 14px;color:#102a56;font-weight:800;font-size:16px;line-height:1.45;max-width:720px}
.qvl-v02 .qvl-promise-point{display:flex;gap:10px;align-items:flex-start;margin:9px 0;color:#243e67;font-size:13.5px;line-height:1.42}
.qvl-v02 .qvl-promise-check{flex:0 0 auto;margin-top:2px;width:17px;height:17px;border-radius:50%;display:grid;place-items:center;background:#1557c8;color:#fff;font-size:11px;font-weight:900}
.qvl-v02 .qvl-promise-art{height:160px;position:relative;min-width:250px}
.qvl-v02 .qvl-promise-art:before{content:'';position:absolute;inset:14px 5px 8px 35px;border-radius:50% 45% 40% 55%;background:radial-gradient(circle at 60% 48%,rgba(40,113,224,.21),rgba(40,113,224,.04) 52%,transparent 70%)}
.qvl-v02 .qvl-route{position:absolute;left:8px;bottom:12px;width:210px;height:78px;border:14px solid rgba(59,130,246,.11);border-right-color:transparent;border-top-color:transparent;border-radius:50%;transform:rotate(-12deg)}
.qvl-v02 .qvl-compass{position:absolute;left:112px;bottom:19px;width:72px;height:72px;border-radius:50%;border:9px solid #d5e6ff;background:#fff;box-shadow:0 10px 20px rgba(35,83,156,.14);display:grid;place-items:center;color:#2052a4;font-size:29px;font-weight:900}
.qvl-v02 .qvl-doc-stack{position:absolute;right:24px;top:28px;width:104px;height:112px;border-radius:11px;background:rgba(255,255,255,.9);border:1px solid #d7e6fb;box-shadow:0 10px 24px rgba(37,91,166,.12)}
.qvl-v02 .qvl-doc-stack:before,.qvl-v02 .qvl-doc-stack:after{content:'';position:absolute;left:15px;right:15px;height:6px;border-radius:4px;background:#cbdffd}
.qvl-v02 .qvl-doc-stack:before{top:28px;box-shadow:0 17px 0 #d9e8fc,0 34px 0 #cbdffd,0 51px 0 #e1ecfb}
.qvl-v02 .qvl-doc-stack:after{top:15px;right:35px}
.qvl-v02 .qvl-transform-title{margin:22px 4px 12px;color:#102a56;font-size:18px}
.qvl-v02 .qvl-treatment-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.qvl-v02 .qvl-treatment-card{appearance:none;text-align:left;min-height:154px;padding:18px;border:1px solid #dbe3ef;border-radius:14px;background:#fff;box-shadow:0 4px 12px rgba(28,52,86,.06);cursor:pointer;display:grid;grid-template-columns:58px 1fr;gap:14px;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
.qvl-v02 .qvl-treatment-card:hover{transform:translateY(-2px);border-color:#b7cdf3;box-shadow:0 10px 22px rgba(28,70,138,.10)}
.qvl-v02 .qvl-card-icon{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:#eef5ff;color:#1656ad}
.qvl-v02 .qvl-treatment-card[data-key='carte'] .qvl-card-icon{background:#f3edff;color:#7c3aed}
.qvl-v02 .qvl-treatment-card[data-key='recommandations'] .qvl-card-icon{background:#fff3e8;color:#dc6a00}
.qvl-v02 .qvl-treatment-card[data-key='scenario'] .qvl-card-icon{background:#ebf8f7;color:#0e7490}
.qvl-v02 .qvl-treatment-card h3{margin:1px 0 7px;color:#122a50;font-size:16px;line-height:1.2}
.qvl-v02 .qvl-treatment-card p{margin:0 0 12px;color:#465a77;font-size:13px;line-height:1.45}
.qvl-v02 .qvl-treatment-card .regime{display:inline-flex;font-size:11px}
.qvl-v02 .qvl-regime-panel{border:1px solid #dbe3ef;border-radius:14px;background:#fff;padding:18px 15px;box-shadow:0 4px 14px rgba(28,52,86,.05)}
.qvl-v02 .qvl-regime-panel>h3{margin:0 0 14px;color:#112a50;font-size:16px;display:flex;align-items:center;gap:8px}
.qvl-v02 .qvl-regime-info{padding:15px 14px;border-radius:12px;margin:0 0 12px;border:1px solid #e8edf4}
.qvl-v02 .qvl-regime-info.strict{background:#f6faff}.qvl-v02 .qvl-regime-info.extract{background:#fffaf3}.qvl-v02 .qvl-regime-info.enrich{background:#f7fcf7}
.qvl-v02 .qvl-regime-info strong{display:block;margin-bottom:7px;color:#173b76;font-size:14px}.qvl-v02 .qvl-regime-info.extract strong{color:#c75a00}.qvl-v02 .qvl-regime-info.enrich strong{color:#24713a}
.qvl-v02 .qvl-regime-info p{margin:0;color:#485b78;font-size:12.5px;line-height:1.5}
@media(max-width:1100px){.qvl-v02 .qvl-workshop-grid{grid-template-columns:1fr}.qvl-v02 .qvl-regime-panel{display:none}.qvl-v02 .qvl-promise{grid-template-columns:48px 1fr}.qvl-v02 .qvl-promise-art{display:none}}
@media(max-width:800px){.qvl-v02 .qvl-treatment-grid{grid-template-columns:1fr}.qvl-v02 .qvl-page-heading h1{font-size:30px}.qvl-v02 .qvl-promise{padding:18px;grid-template-columns:1fr}.qvl-v02 .qvl-promise-icon{display:none}}
`

function treatmentText(t){return `${t?.nom_traitement||''} ${t?.fonction||''} ${t?.objectif||''}`}
function resolveSixTreatments(treatments=[]){
  const used=new Set()
  return ALLOWED_TREATMENTS.map(spec=>{
    let t=spec.match?treatments.find(x=>!used.has(x.traitement_id)&&spec.match.test(treatmentText(x))):null
    if(!t)t=(spec.ids||[]).map(id=>treatments.find(x=>!used.has(x.traitement_id)&&x.traitement_id===id)).find(Boolean)
    if(t)used.add(t.traitement_id)
    return t?{spec,t}:null
  }).filter(Boolean)
}

export default function Atelier({data}){
  const [selected,setSelected]=useState(null),[need,setNeed]=useState('')
  const six=useMemo(()=>resolveSixTreatments(data?.treatments||[]),[data])
  if(selected) return <Workspace treatment={selected} data={data} initialNeed={need} onBack={()=>setSelected(null)}/>
  return <main className="page workshop-page qvl-v02">
    <style>{ATELIER_SCREEN_STYLES}</style>
    <div className="qvl-workshop-grid">
      <section className="qvl-workshop-main">
        <div className="qvl-page-heading"><h1>Atelier de veille</h1><p>Je pars d’un besoin et je choisis une transformation.</p></div>
        <section className="qvl-promise" aria-label="Promesse de l’Atelier de veille">
          <div className="qvl-promise-icon">✦</div>
          <div className="qvl-promise-copy">
            <p className="qvl-promise-lead">Si l’onglet <b>Explorer</b> favorise l’exploration, ce troisième onglet vous invite à mobiliser les publications recensées dans le bulletin de veille dans vos travaux personnels.</p>
            <div className="qvl-promise-point"><span className="qvl-promise-check">✓</span><span>Vous pouvez identifier des experts ministériels sur les sujets qui vous intéressent, extraire des recommandations des rapports et être accompagné par l’IA générative dans l’élaboration de votre scénario de veille.</span></div>
            <div className="qvl-promise-point"><span className="qvl-promise-check">✓</span><span>La carte de réflexion assistée prolonge vos travaux et stimule vos capacités cognitives.</span></div>
            <div className="qvl-promise-point"><span className="qvl-promise-check">✓</span><span><b>La cognition est distribuée</b> : votre question, le corpus, le graphe, l’interface et l’IA participent ensemble au parcours de réflexion.</span></div>
          </div>
          <div className="qvl-promise-art" aria-hidden="true"><span className="qvl-route"/><span className="qvl-compass">◇</span><span className="qvl-doc-stack"/></div>
        </section>

        <h2 className="qvl-transform-title">Choisir une transformation</h2>
        <div className="qvl-treatment-grid">
          {six.map(({spec,t})=><button key={spec.key} data-key={spec.key} className="qvl-treatment-card" onClick={()=>setSelected(t)}>
            <span className="qvl-card-icon"><Icon name={spec.icon} size={26}/></span>
            <span><h3>{spec.title}</h3><p>{spec.description}</p><span className={`regime ${regimeClass[t.regime_IA||spec.fallbackRegime]||''}`}>{t.regime_IA||spec.fallbackRegime}</span></span>
          </button>)}
        </div>
      </section>
      <aside className="qvl-regime-panel">
        <h3><Icon name="info" size={17}/>Les régimes IA disponibles</h3>
        <Regime cls="strict" title="Synthèse stricte">L’IA se limite à résumer fidèlement les contenus sélectionnés, sans ajouter d’informations externes ni d’interprétation.</Regime>
        <Regime cls="extract" title="Extraction stricte">L’IA extrait uniquement des éléments présents dans les documents, sans interprétation ni ajout.</Regime>
        <Regime cls="enrich" title="Enrichissement contrôlé">L’IA peut enrichir et structurer la réflexion, en distinguant clairement ses propositions des informations documentées.</Regime>
      </aside>
    </div>
  </main>
}

function Regime({cls,title,children}){return <div className={`qvl-regime-info ${cls}`}><strong>{title}</strong><p>{children}</p></div>}

function Workspace({treatment,data,onBack,initialNeed=''}){
 if(treatment.traitement_id==='T03') return <ReflectionWorkspace treatment={treatment} data={data} onBack={onBack} initialNeed={initialNeed}/>
 const pubs=data.publications.filter(p=>p.chunk_count>0).slice(0,20)
 const isT01=treatment.traitement_id==='T01'
 const [selected,setSelected]=useState(pubs.length?[pubs[0].publication_id]:[])
 const [need,setNeed]=useState(initialNeed)
 const [generation,setGeneration]=useState(null)
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const selectedPubs=pubs.filter(p=>selected.includes(p.publication_id))
 const togglePublication=id=>{setGeneration(null);setError('');if(isT01){setSelected([id]);return}setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])}
 const runGeneration=async()=>{if(!isT01||!need.trim()||!selectedPubs.length||loading)return;setLoading(true);setError('');try{const result=await generateTreatment({treatment,need:need.trim(),publications:selectedPubs,contents:data.contents,nodes:data.nodes,relations:data.relations});setGeneration(result)}catch(e){setError(e?.message||String(e));setGeneration(null)}finally{setLoading(false)}}
 return <main className="page workspace-page"><button className="back-link" onClick={onBack}><Icon name="back"/>Retour à l’atelier</button><div className="workspace-head"><div><h1>{treatment.nom_traitement}</h1><p>{treatment.fonction}</p></div><span className={`regime ${regimeClass[treatment.regime_IA]||''}`}>{treatment.regime_IA}</span></div><div className="workspace-layout"><aside className="corpus-panel"><h3>Corpus sélectionné <span>{selected.length} source{selected.length>1?'s':''}</span></h3>{isT01&&<div className="corpus-scope-note"><Icon name="info" size={15}/><span>T01 est défini pour une publication : choisissez une source.</span></div>}{pubs.map(p=><label className={`corpus-item ${selected.includes(p.publication_id)?'selected':''}`} key={p.publication_id}><input type={isT01?'radio':'checkbox'} name={isT01?'t01-source':undefined} checked={selected.includes(p.publication_id)} onChange={()=>togglePublication(p.publication_id)}/>{p.has_image?<img src={`.${p.image_path}`} alt=""/>:<div className="mini-placeholder">{p.publication_id}</div>}<div><strong>{p.titre}</strong><span>{p.organisme_producteur} · {p.année_publication}</span></div></label>)}</aside><section className="production-panel"><div className="user-need"><label>Besoin utilisateur</label><textarea value={need} onChange={e=>{setNeed(e.target.value);setError('')}} placeholder="Décrivez le besoin, la question ou le livrable attendu…"/></div><div className="production-sheet"><h3>Cadre du traitement</h3><Row label="Objectif" value={treatment.objectif}/><Row label="Périmètre" value={treatment.perimetre}/><Row label="Documents compatibles" value={treatment.type_document_compatible}/><Row label="Données mobilisées" value={treatment.donnees_mobilisees}/><Row label="Format de sortie" value={treatment.format_sortie}/><Row label="Provenance exigée" value={treatment.provenance_exigee}/>{isT01?<GenerationT01 generation={generation} loading={loading} error={error} need={need} selectedCount={selectedPubs.length} onGenerate={runGeneration}/>:<div className="production-placeholder"><Icon name="spark" size={30}/><strong>Génération à connecter</strong><p>Le moteur commun sera branché progressivement.</p><button className="btn primary" disabled>Générer avec le corpus sélectionné</button></div>}</div></section><aside className="source-rules"><h3>Règles de production</h3><p><strong>Régime IA :</strong> {treatment.regime_IA}</p><p><strong>Interaction :</strong> {treatment.interaction_utilisateur}</p><p><strong>Mode :</strong> {treatment.mode_generation}</p><div className="source-rule"><Icon name="book"/><span>Les contenus produits doivent conserver leur provenance lorsque le traitement l’exige.</span></div>{isT01&&<div className="source-rule engine-rule"><Icon name="spark"/><span>Le moteur parcourt la matière documentaire nécessaire, puis vérifie chaque provenance avant d’afficher le résumé.</span></div>}</aside></div></main>
}

const REFLECTION_SCREEN_STYLES=`
.reflection-page.qvl-reflection-v02{padding-top:6px}
.qvl-reflection-v02 .qvl-reflection-head{margin-bottom:12px}
.qvl-reflection-v02 .qvl-reflection-title-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.qvl-reflection-v02 .qvl-reflection-title-row h1{margin:0;color:#102a56;font-size:34px;letter-spacing:-.03em}.qvl-reflection-v02 .qvl-reflection-head p{margin:6px 0 0;color:#3157a4;font-size:14px}
.qvl-reflection-v02 .qvl-question-bar{display:grid;grid-template-columns:145px minmax(0,1fr) 150px;align-items:stretch;border:1px solid #c9daf8;border-radius:10px;background:#fff;overflow:hidden;margin:14px 0 18px;box-shadow:0 2px 8px rgba(30,70,125,.03)}
.qvl-reflection-v02 .qvl-question-label{display:flex;align-items:center;padding:0 18px;border-right:1px solid #dbe7f8;color:#1e5bc0;font-size:12.5px;font-weight:700;background:#f8fbff}
.qvl-reflection-v02 .qvl-question-input{border:0;resize:none;min-height:46px;padding:13px 16px;font:600 13.5px/1.4 inherit;color:#142b52;outline:none;background:#fff}
.qvl-reflection-v02 .qvl-question-action{margin:7px;border:0;border-radius:8px;background:#174fae;color:#fff;font-weight:700;cursor:pointer;padding:0 14px}.qvl-reflection-v02 .qvl-question-action:disabled{opacity:.45;cursor:not-allowed}
.qvl-reflection-v02 .qvl-reflection-grid{display:grid;grid-template-columns:118px minmax(0,1fr);gap:14px;min-height:650px}
.qvl-reflection-v02 .qvl-corpus-rail{border:1px solid #dbe3ef;border-radius:12px;background:#fff;display:flex;flex-direction:column;min-height:650px;overflow:hidden}
.qvl-reflection-v02 .qvl-corpus-rail-head{padding:16px 12px;border-bottom:1px solid #edf1f6;color:#15305a;font-size:13px;font-weight:800;display:flex;justify-content:space-between;gap:8px;align-items:center}
.qvl-reflection-v02 .qvl-corpus-stat{padding:17px 13px;border-bottom:1px solid #f0f3f7;color:#324a6d}.qvl-reflection-v02 .qvl-corpus-stat b{display:block;font-size:20px;color:#143b78;margin-bottom:3px}.qvl-reflection-v02 .qvl-corpus-stat span{font-size:11px}
.qvl-reflection-v02 .qvl-corpus-mode{padding:14px 12px;color:#60708a;font-size:10.5px;line-height:1.35}.qvl-reflection-v02 .qvl-corpus-open{margin-top:auto;border:0;border-top:1px solid #edf1f6;background:#fff;padding:14px 10px;color:#1e4b91;font-weight:700;cursor:pointer}
.qvl-reflection-v02 .qvl-corpus-expanded{grid-column:1/2;position:absolute;z-index:20;width:340px;max-height:620px;overflow:auto;border:1px solid #ccd9ee;border-radius:12px;background:#fff;box-shadow:0 18px 40px rgba(28,52,86,.16);padding:12px}
.qvl-reflection-v02 .qvl-corpus-expanded .reflection-corpus-list{max-height:500px;overflow:auto}
.qvl-reflection-v02 .qvl-map-stage{min-width:0}
.qvl-reflection-v02 .qvl-reflection-empty{border:1px dashed #cbd9ef;border-radius:14px;min-height:650px;display:grid;place-items:center;text-align:center;padding:40px;background:#fbfdff}.qvl-reflection-v02 .qvl-reflection-empty h2{color:#15305a;margin:8px 0}.qvl-reflection-v02 .qvl-reflection-empty p{max-width:680px;color:#5a6c86;line-height:1.55}
@media(max-width:900px){.qvl-reflection-v02 .qvl-reflection-grid{grid-template-columns:1fr}.qvl-reflection-v02 .qvl-corpus-rail{min-height:auto;display:grid;grid-template-columns:repeat(3,1fr)}.qvl-reflection-v02 .qvl-question-bar{grid-template-columns:1fr}.qvl-reflection-v02 .qvl-question-label{border-right:0;border-bottom:1px solid #dbe7f8;padding:9px 12px}.qvl-reflection-v02 .qvl-question-action{height:38px}}
`

function ReflectionWorkspace({treatment,data,onBack,initialNeed=''}){
  const pubs=data.publications.filter(p=>p.chunk_count>0)
  const [selected,setSelected]=useState([])
  const [need,setNeed]=useState(initialNeed)
  const [generation,setGeneration]=useState(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [corpusOpen,setCorpusOpen]=useState(false)
  const selectedPubs=pubs.filter(p=>selected.includes(p.publication_id))

  const toggle=id=>{setError('');setGeneration(null);setSelected(s=>s.includes(id)?s.filter(x=>x!==id):(s.length>=4?s:[...s,id]))}
  const run=async()=>{
    if(!need.trim()||loading)return
    setLoading(true);setError('')
    try{
      const publicationsForRag=selectedPubs.length?selectedPubs:pubs
      const result=await generateTreatment({treatment,need:need.trim(),publications:publicationsForRag,contents:data.contents,nodes:data.nodes,relations:data.relations})
      setGeneration(result);setCorpusOpen(false)
    }catch(e){setError(e?.message||String(e));setGeneration(null)}finally{setLoading(false)}
  }
  const ragMode=!selected.length
  const usedCount=generation?.corpus?.length||selected.length||0

  return <main className="page reflection-page qvl-reflection-v02">
    <style>{REFLECTION_SCREEN_STYLES}</style>
    <button className="back-link" onClick={onBack}><Icon name="back"/>Retour à l’atelier</button>
    <header className="qvl-reflection-head"><div className="qvl-reflection-title-row"><h1>Carte de réflexion assistée</h1><span className="regime enrich">Enrichissement contrôlé</span></div><p>Structurez vos idées, établissez des liens et explorez de nouvelles perspectives avec l’IA.</p></header>

    <div className="qvl-question-bar">
      <div className="qvl-question-label">Question centrale</div>
      <textarea className="qvl-question-input" value={need} onChange={e=>{setNeed(e.target.value);setError('')}} placeholder="Ex. : Comment mieux anticiper les transformations de la délinquance des mineurs ?"/>
      <button className="qvl-question-action" onClick={run} disabled={!need.trim()||loading}>{loading?'Construction…':generation?'Recomposer':'Construire la carte'}</button>
    </div>

    <div className="qvl-reflection-grid">
      <aside className="qvl-corpus-rail">
        <div className="qvl-corpus-rail-head">Corpus actif <button type="button" onClick={()=>setCorpusOpen(v=>!v)} style={{border:0,background:'transparent',cursor:'pointer',fontSize:18,color:'#1c4c9b'}}>»</button></div>
        <div className="qvl-corpus-stat"><b>{pubs.length}</b><span>publications</span></div>
        <div className="qvl-corpus-stat"><b>{generation?usedCount:(selected.length||'RAG')}</b><span>{generation?'mobilisées':selected.length?'sélectionnées':'recherche globale'}</span></div>
        <div className="qvl-corpus-mode">{ragMode?'Le prompt suffit : le moteur cherche ses appuis dans le RAG.':'Jusqu’à 4 publications peuvent être imposées.'}</div>
        <button className="qvl-corpus-open" type="button" onClick={()=>setCorpusOpen(v=>!v)}>{corpusOpen?'Réduire':'Ouvrir'}</button>
        {corpusOpen&&<div className="qvl-corpus-expanded"><div className="reflection-side-head"><div><strong>Publications</strong><span>{selected.length?`${selected.length} sélectionnée${selected.length>1?'s':''}`:'Aucune imposée'}</span></div><small>0 à 4 sources</small></div><div className="reflection-corpus-list">{pubs.map(p=><label key={p.publication_id} className={`reflection-corpus-item ${selected.includes(p.publication_id)?'selected':''}`}><input type="checkbox" checked={selected.includes(p.publication_id)} onChange={()=>toggle(p.publication_id)}/>{p.has_image?<img src={`.${p.image_path}`} alt=""/>:<div className="mini-placeholder">{p.publication_id}</div>}<div><b>{p.publication_id}</b><strong>{p.titre}</strong><span>{p.organisme_producteur} · {p.année_publication}</span></div></label>)}</div></div>}
      </aside>

      <section className="qvl-map-stage">
        {loading?<ReflectionLoading/>:error?<div className="reflection-state error"><span>⚠</span><strong>La carte n’a pas pu être générée</strong><p>{error}</p><button className="btn primary" onClick={run}>Réessayer</button></div>:generation?<ReflectionMap result={generation}/>:<ReflectionEmpty onGenerate={run} disabled={!need.trim()}/>}      
      </section>
    </div>
  </main>
}

function ReflectionEmpty({onGenerate,disabled}){return <div className="qvl-reflection-empty"><div><span className="generated-kicker">ESPACE DE TRAVAIL</span><h2>Donnez une forme à votre réflexion</h2><p>Le prompt suffit pour commencer. La carte s’appuie sur le corpus RAG, conserve votre question intégrale et ouvre le parcours sur <b>Question / problème</b> et <b>Enjeux</b>. Les rubriques <b>Tensions, limites et angles morts</b> et <b>Prolongements</b> restent repliées à l’ouverture.</p><button className="btn primary" onClick={onGenerate} disabled={disabled}><Icon name="spark" size={17}/>Construire ma première carte</button></div></div>}
function ReflectionLoading(){return <div className="reflection-state loading"><div className="generation-spinner">✦</div><strong>La réflexion prend forme…</strong><p>Le moteur sélectionne les passages utiles, distingue ce qui est documenté de ce qui relève d’une piste IA, puis construit le parcours de réflexion.</p><div className="thinking-steps"><span className="active">Structurer le problème</span><span>Éclairer les enjeux</span><span>Ouvrir les autres dimensions</span></div></div>}

function GenerationT01({generation,loading,error,need,selectedCount,onGenerate}){if(loading)return <div className="generation-state loading"><div className="generation-spinner">✦</div><strong>Couverture documentaire et génération…</strong><p>Le moteur couvre la publication selon sa longueur et conserve les pages ou timecodes sources.</p></div>;if(error)return <div className="generation-state error"><span aria-hidden="true">⚠</span><strong>La génération n’a pas abouti</strong><p>{error}</p><button className="btn primary" onClick={onGenerate}>Réessayer</button></div>;if(!generation)return <div className="production-placeholder connected"><Icon name="spark" size={30}/><strong>Moteur T01 connecté</strong><p>Le résumé sera produit exclusivement à partir des chunks de la publication sélectionnée, avec pages ou timecodes contrôlés.</p><button className="btn primary" disabled={!need.trim()||!selectedCount} onClick={onGenerate}>Générer avec la source sélectionnée</button></div>;return <ResumeAnalytique result={generation} onRegenerate={onGenerate}/>}
function ResumeAnalytique({result,onRegenerate}){const out=result?.output||{};return <section className="generated-output"><header className="generated-output-head"><div><span className="generated-kicker">PRODUCTION IA · SYNTHÈSE STRICTE</span><h2>Résumé analytique</h2><p>{result?.corpus?.map(p=>p.titre).join(' · ')}</p></div><div className="generation-metrics"><span>{result?.selection?.chunks_retenus||0} chunks retenus</span><button onClick={onRegenerate}>↻ Régénérer</button></div></header><PointSection title="Sujet" point={out.sujet}/><PointSection title="Problématique" point={out.problematique}/><ListSection title="Résultats" items={out.resultats}/><ListSection title="Enseignements" items={out.enseignements}/>{out.nuances?.length>0&&<ListSection title="Nuances et précautions" items={out.nuances} subtle/>}<div className="generated-sources"><h3>Sources</h3>{(result?.corpus||[]).map(pub=><a key={pub.publication_id} href={pub.url||'#'} target="_blank" rel="noreferrer"><span aria-hidden="true">↗</span><span><strong>{pub.titre}</strong><small>{pub.organisme_producteur}{pub.annee_publication?` · ${pub.annee_publication}`:''}</small></span></a>)}</div></section>}
function PointSection({title,point}){if(!point?.texte)return null;return <section className="generated-section"><h3>{title}</h3><p>{point.texte}</p><ProvenanceChips provenances={point.provenances}/></section>}
function ListSection({title,items=[],subtle=false}){if(!items.length)return null;return <section className={`generated-section ${subtle?'subtle':''}`}><h3>{title}</h3><div className="generated-list">{items.map((item,i)=><article key={i}><span className="generated-index">{i+1}</span><div><p>{item.texte}</p><ProvenanceChips provenances={item.provenances}/></div></article>)}</div></section>}
function ProvenanceChips({provenances=[]}){if(!provenances.length)return null;const groups=new Map();provenances.forEach(p=>{const pub=p.publication_id||'Source';if(!groups.has(pub))groups.set(pub,{pages:[],timecodes:[],seen:new Set()});const g=groups.get(pub);const isTimecode=p.type==='timecode'||Boolean(p.timecode_debut)||Boolean(p.timecode_fin);const value=isTimecode?(p.label||[p.timecode_debut,p.timecode_fin].filter(Boolean).join('–')):String(p.page||p.label||'').trim();if(!value)return;const key=`${isTimecode?'t':'p'}|${value}`;if(g.seen.has(key))return;g.seen.add(key);(isTimecode?g.timecodes:g.pages).push(value)});const labels=[];groups.forEach((g,pub)=>{if(g.pages.length)labels.push(`${pub} · ${g.pages.map(p=>`p. ${p}`).join(' ; ')}`);if(g.timecodes.length)labels.push(`${pub} · ${g.timecodes.join(' ; ')}`)});if(!labels.length)return null;return <div className="provenance-chips">{labels.map((label,i)=><span key={`${label}-${i}`}>{label}</span>)}</div>}
function Row({label,value}){return <div className="sheet-row"><strong>{label}</strong><span>{value}</span></div>}
