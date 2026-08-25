import React, { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import ReflectionMap from '../components/ReflectionMap.jsx'
import { generateTreatment } from '../services/treatmentApi.js'
import { normalize } from '../lib/text.js'

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
 if(treatment.traitement_id==='T04') return <RecommendationWorkspace treatment={treatment} data={data} onBack={onBack} initialNeed={initialNeed}/>
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


const RECOMMENDATIONS_SCREEN_STYLES=`
.qvl-reco-v02{padding-top:6px;color:#102a56}
.qvl-reco-v02 .qvl-reco-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin:4px 0 18px}
.qvl-reco-v02 .qvl-reco-title-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.qvl-reco-v02 .qvl-reco-title-row h1{margin:0;color:#102a56;font-size:36px;line-height:1.08;letter-spacing:-.035em}.qvl-reco-v02 .qvl-reco-head p{margin:7px 0 0;color:#405b82;font-size:16px;line-height:1.5;max-width:920px}
.qvl-reco-v02 .qvl-reco-help{border:1px solid #cbdaf1;background:#fff;color:#1d4f9e;border-radius:10px;padding:11px 14px;font-weight:750;display:flex;gap:8px;align-items:center;white-space:nowrap}
.qvl-reco-v02 .qvl-reco-scope{border:1px solid #d6e0ef;border-radius:14px;background:#fff;padding:18px;box-shadow:0 5px 16px rgba(28,52,86,.05);margin-bottom:18px}
.qvl-reco-v02 .qvl-reco-fields{display:grid;grid-template-columns:minmax(230px,.8fr) minmax(330px,1.25fr) minmax(300px,1fr);gap:18px;align-items:end}.qvl-reco-v02 .qvl-reco-field{min-width:0}.qvl-reco-v02 .qvl-reco-field>label{display:flex;align-items:center;gap:6px;margin:0 0 7px;color:#16345e;font-size:13px;font-weight:800}.qvl-reco-v02 .qvl-reco-field input[type='text']{width:100%;height:48px;border:1px solid #cdd9ea;border-radius:9px;padding:0 13px;color:#173354;background:#fff;font:600 15px/1.2 inherit;outline:none}.qvl-reco-v02 .qvl-reco-field input[type='text']:focus{border-color:#6f9ee8;box-shadow:0 0 0 3px rgba(59,130,246,.10)}
.qvl-reco-v02 .qvl-selector{position:relative}.qvl-reco-v02 .qvl-selector-btn{width:100%;height:48px;border:1px solid #cdd9ea;border-radius:9px;background:#fff;color:#173b76;padding:0 13px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-weight:750;cursor:pointer;text-align:left}.qvl-reco-v02 .qvl-selector-btn>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.qvl-reco-v02 .qvl-selector-panel{position:absolute;z-index:35;left:0;right:0;top:54px;background:#fff;border:1px solid #cbd8ea;border-radius:12px;box-shadow:0 18px 42px rgba(28,52,86,.18);padding:10px;max-height:350px;overflow:auto}.qvl-reco-v02 .qvl-selector-panel label{display:flex;align-items:flex-start;gap:9px;padding:9px;border-radius:8px;color:#294465;font-size:13px;line-height:1.35;cursor:pointer}.qvl-reco-v02 .qvl-selector-panel label:hover{background:#f4f8fd}.qvl-reco-v02 .qvl-selector-panel input{margin-top:2px;accent-color:#1d5fc3}
.qvl-reco-v02 .qvl-corpus-search{display:flex;align-items:center;gap:8px;border:1px solid #d9e2ee;border-radius:8px;padding:8px 10px;margin:3px 2px 8px}.qvl-reco-v02 .qvl-corpus-search input{border:0!important;height:auto!important;padding:0!important;box-shadow:none!important;min-width:0;flex:1;font-size:13px!important}.qvl-reco-v02 .qvl-corpus-option{display:grid!important;grid-template-columns:18px minmax(0,1fr);gap:9px!important}.qvl-reco-v02 .qvl-corpus-option b{display:block;color:#214f9b;font-size:11px;margin-bottom:2px}.qvl-reco-v02 .qvl-corpus-option strong{display:block;color:#183453;font-size:12.5px}.qvl-reco-v02 .qvl-corpus-option small{display:block;color:#718099;font-size:11px;margin-top:2px}
.qvl-reco-v02 .qvl-reco-actions{display:flex;gap:10px;align-items:center;margin-top:16px}.qvl-reco-v02 .qvl-reco-primary,.qvl-reco-v02 .qvl-reco-secondary{min-height:42px;border-radius:8px;padding:0 16px;display:inline-flex;align-items:center;gap:8px;font-weight:800;cursor:pointer}.qvl-reco-v02 .qvl-reco-primary{border:1px solid #1b58b8;background:#1c5ec2;color:#fff}.qvl-reco-v02 .qvl-reco-primary:disabled{opacity:.42;cursor:not-allowed}.qvl-reco-v02 .qvl-reco-secondary{border:1px solid #d0dbea;background:#fff;color:#244d89}
.qvl-reco-v02 .qvl-reco-rule{margin-left:auto;display:flex;align-items:center;gap:7px;color:#697a92;font-size:12px;line-height:1.4;max-width:520px}
.qvl-reco-v02 .qvl-reco-result-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:2px 0 13px}.qvl-reco-v02 .qvl-reco-result-count{margin-right:auto}.qvl-reco-v02 .qvl-reco-result-count strong{display:block;color:#122e55;font-size:20px}.qvl-reco-v02 .qvl-reco-result-count span{display:block;color:#60728e;font-size:12.5px;margin-top:3px}.qvl-reco-v02 .qvl-reco-filter{border:1px solid #d8e2ee;border-radius:10px;background:#fff;padding:9px 12px;color:#33506f;cursor:pointer;font-weight:750}.qvl-reco-v02 .qvl-reco-filter.active{background:#edf4ff;border-color:#b9d2fa;color:#1c56a8}.qvl-reco-v02 .qvl-reco-filter.unique.active{background:#effaf2;border-color:#c7ead0;color:#27733c}.qvl-reco-v02 .qvl-reco-sort{height:40px;border:1px solid #d3deeb;border-radius:9px;background:#fff;color:#2f4867;padding:0 10px}
.qvl-reco-v02 .qvl-reco-layout{display:grid;grid-template-columns:minmax(0,1fr) 365px;gap:16px;align-items:start}.qvl-reco-v02 .qvl-reco-list{display:grid;gap:11px;min-width:0}.qvl-reco-v02 .qvl-reco-card{border:1px solid #dbe3ed;border-radius:12px;background:#fff;padding:16px 16px 15px;display:grid;grid-template-columns:minmax(0,1fr) 285px 40px;gap:16px;align-items:center;text-align:left;cursor:pointer;box-shadow:0 3px 10px rgba(28,52,86,.04)}.qvl-reco-v02 .qvl-reco-card:hover,.qvl-reco-v02 .qvl-reco-card.selected{border-color:#a9c6ef;box-shadow:0 8px 20px rgba(28,70,138,.08)}.qvl-reco-v02 .qvl-reco-main h3{margin:0 0 8px;color:#112d54;font-size:17px;line-height:1.32}.qvl-reco-v02 .qvl-reco-main p{margin:0 0 10px;color:#455d7d;font-size:14px;line-height:1.55}.qvl-reco-v02 .qvl-reco-badge{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:10.5px;font-weight:850;letter-spacing:.01em}.qvl-reco-v02 .qvl-reco-badge.convergent{background:#edf4ff;color:#205aaf}.qvl-reco-v02 .qvl-reco-badge.unique{background:#eef9f0;color:#27733c}.qvl-reco-v02 .qvl-reco-source-count{margin-left:9px;color:#60718b;font-size:12px}.qvl-reco-v02 .qvl-reco-sources-mini{border-left:1px solid #e4eaf1;padding-left:15px;display:grid;gap:7px}.qvl-reco-v02 .qvl-reco-source-mini{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;color:#244364;font-size:11.5px}.qvl-reco-v02 .qvl-reco-source-mini strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qvl-reco-v02 .qvl-reco-source-mini span{font-weight:750;color:#526887}.qvl-reco-v02 .qvl-reco-chevron{width:36px;height:36px;border:1px solid #d8e1ec;background:#fff;border-radius:8px;display:grid;place-items:center;color:#27579a}
.qvl-reco-v02 .qvl-reco-detail{border:1px solid #dbe3ed;border-radius:12px;background:#fff;min-height:520px;box-shadow:0 4px 14px rgba(28,52,86,.05);overflow:hidden;position:sticky;top:84px}.qvl-reco-v02 .qvl-reco-detail-head{padding:14px 16px;border-bottom:1px solid #e8edf3;color:#164a99;font-weight:850;font-size:13px}.qvl-reco-v02 .qvl-reco-detail-body{padding:18px}.qvl-reco-v02 .qvl-reco-detail-body h2{margin:10px 0 12px;color:#102c53;font-size:20px;line-height:1.3}.qvl-reco-v02 .qvl-reco-meta{display:grid;grid-template-columns:84px 1fr;gap:6px 9px;color:#4c617e;font-size:12.5px;margin:14px 0}.qvl-reco-v02 .qvl-reco-meta b{color:#18365d}.qvl-reco-v02 .qvl-reco-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:13px 0}.qvl-reco-v02 .qvl-reco-metric{border:1px solid #e0e7ef;border-radius:9px;padding:10px;color:#35516f;font-size:12px}.qvl-reco-v02 .qvl-reco-metric b{font-size:18px;color:#1a4e96;margin-right:5px}.qvl-reco-v02 .qvl-reco-section-title{margin:16px 0 8px;color:#17385f;font-size:12.5px;font-weight:850}.qvl-reco-v02 .qvl-reco-summary{margin:0;color:#435b7a;font-size:13.5px;line-height:1.55}.qvl-reco-v02 .qvl-reco-proof{border:1px solid #e2e8f0;border-radius:9px;margin:8px 0;overflow:hidden}.qvl-reco-v02 .qvl-reco-proof button{width:100%;border:0;background:#fff;padding:10px 11px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;text-align:left;cursor:pointer;color:#264665}.qvl-reco-v02 .qvl-reco-proof button strong{font-size:11.5px}.qvl-reco-v02 .qvl-reco-proof button small{display:block;margin-top:2px;color:#738199;font-size:10.5px}.qvl-reco-v02 .qvl-reco-proof button span{font-size:11px;font-weight:800;color:#536b8d}.qvl-reco-v02 .qvl-reco-proof-excerpt{padding:10px 12px;border-top:1px solid #edf1f5;background:#fbfcfe;color:#496079;font-size:12px;line-height:1.55}.qvl-reco-v02 .qvl-reco-graph-context{margin-top:12px;border:1px solid #dbe5f4;border-radius:9px;background:#f8fbff;padding:10px}.qvl-reco-v02 .qvl-reco-graph-context p{margin:0 0 7px;color:#4b6482;font-size:11.5px}.qvl-reco-v02 .qvl-reco-linked{display:flex;flex-wrap:wrap;gap:6px}.qvl-reco-v02 .qvl-reco-linked span{border:1px solid #d4e0f0;background:#fff;border-radius:999px;padding:5px 7px;color:#315888;font-size:10.5px}
.qvl-reco-v02 .qvl-reco-empty{border:1px dashed #cbd9eb;border-radius:14px;min-height:430px;background:#fbfdff;display:grid;place-items:center;text-align:center;padding:34px}.qvl-reco-v02 .qvl-reco-empty h2{margin:8px 0;color:#17345d;font-size:22px}.qvl-reco-v02 .qvl-reco-empty p{margin:0;max-width:680px;color:#5c6f89;font-size:14px;line-height:1.6}.qvl-reco-v02 .qvl-reco-note{margin-top:14px;border:1px solid #dce6f4;border-radius:9px;background:#f5f9ff;padding:11px 13px;color:#536982;font-size:12px;line-height:1.5;display:flex;gap:8px;align-items:flex-start}
@media(max-width:1180px){.qvl-reco-v02 .qvl-reco-fields{grid-template-columns:1fr 1fr}.qvl-reco-v02 .qvl-reco-field.corpus{grid-column:1/-1}.qvl-reco-v02 .qvl-reco-layout{grid-template-columns:1fr}.qvl-reco-v02 .qvl-reco-detail{position:static}.qvl-reco-v02 .qvl-reco-card{grid-template-columns:minmax(0,1fr) 245px 40px}}
@media(max-width:760px){.qvl-reco-v02 .qvl-reco-head{display:block}.qvl-reco-v02 .qvl-reco-help{margin-top:10px;width:max-content}.qvl-reco-v02 .qvl-reco-title-row h1{font-size:30px}.qvl-reco-v02 .qvl-reco-fields{grid-template-columns:1fr}.qvl-reco-v02 .qvl-reco-field.corpus{grid-column:auto}.qvl-reco-v02 .qvl-reco-actions{align-items:stretch;flex-direction:column}.qvl-reco-v02 .qvl-reco-rule{margin-left:0}.qvl-reco-v02 .qvl-reco-card{grid-template-columns:1fr}.qvl-reco-v02 .qvl-reco-sources-mini{border-left:0;border-top:1px solid #e7ecf2;padding:10px 0 0}.qvl-reco-v02 .qvl-reco-chevron{display:none}}
`

const RECO_STOPWORDS=new Set('le la les un une des du de d et ou en dans sur pour par avec sans au aux ce cet cette ces son sa ses leur leurs plus moins afin vers entre qui que dont est sont etre être a à l d une'.split(/\s+/))
function splitDomains(value){
  if(Array.isArray(value)) return value.flatMap(splitDomains)
  return String(value||'').split(/[;|,]/).map(x=>x.trim()).filter(Boolean)
}
function publicationDomains(pub){return [...new Set([...(splitDomains(pub?.domaine)),...(splitDomains(pub?.domaine_large)),...(splitDomains(pub?.domaines))])]}
function recoTokens(value){return normalize(String(value||'')).split(/[^a-z0-9]+/).filter(x=>x.length>2&&!RECO_STOPWORDS.has(x))}
function recoSimilarity(a,b){const A=new Set(recoTokens(a)),B=new Set(recoTokens(b));if(!A.size||!B.size)return 0;let inter=0;A.forEach(x=>{if(B.has(x))inter++});return inter/Math.max(A.size,B.size)}
function chunkIdsOf(node){return String(node?.chunk_id_source||'').split(';').map(x=>x.trim()).filter(Boolean)}
function pagesOf(node){return String(node?.page_source||'').split(';').map(x=>x.trim()).filter(Boolean)}
function recommendationContext(node,data,nodeMap){
  const chunks=chunkIdsOf(node).map(id=>(data.contents||[]).find(c=>c.chunk_id===id)?.texte||'').join(' ')
  const related=(data.relations||[]).filter(r=>r.source_id===node.node_id||r.cible_id===node.node_id).slice(0,12).map(r=>nodeMap[r.source_id===node.node_id?r.cible_id:r.source_id]?.libelle||'').join(' ')
  return `${node.libelle||''} ${chunks} ${related}`
}
function recommendationScore(node,subject,data,nodeMap,pubMap){
  const context=normalize(`${recommendationContext(node,data,nodeMap)} ${pubMap[node.publication_id]?.titre||''}`)
  const exact=normalize(subject)
  const tokens=[...new Set(recoTokens(subject))]
  let score=exact.length>4&&context.includes(exact)?8:0
  tokens.forEach(t=>{if(context.includes(t))score+=2})
  return score
}
function sourceFromRecoNode(node,data,pubMap){
  const chunkIds=chunkIdsOf(node)
  const chunk=chunkIds.map(id=>(data.contents||[]).find(c=>c.chunk_id===id)).find(Boolean)
  const pub=pubMap[node.publication_id]||{}
  return {node_id:node.node_id,publication_id:node.publication_id,titre:pub.titre||node.publication_id,organisme:pub.organisme_producteur||'',annee:pub.année_publication||'',page:pagesOf(node).join(' ; '),chunk_ids:chunkIds,excerpt:chunk?.texte||'',formulation:node.libelle||''}
}
function groupRecommendationNodes(nodes,data,subject){
  const nodeMap=Object.fromEntries((data.nodes||[]).map(n=>[n.node_id,n]))
  const pubMap=Object.fromEntries((data.publications||[]).map(p=>[p.publication_id,p]))
  const scored=nodes.map(n=>({...n,_score:recommendationScore(n,subject,data,nodeMap,pubMap)})).filter(n=>n._score>0).sort((a,b)=>b._score-a._score)
  const groups=[]
  scored.forEach(node=>{
    let group=groups.find(g=>recoSimilarity(g.label,node.libelle)>=.72)
    if(!group){group={id:`reco-${groups.length+1}`,label:node.libelle||'Recommandation',nodes:[],score:node._score};groups.push(group)}
    group.nodes.push(node);group.score=Math.max(group.score,node._score)
  })
  return groups.map(g=>{
    const sources=g.nodes.map(n=>sourceFromRecoNode(n,data,pubMap))
    const publicationIds=[...new Set(sources.map(s=>s.publication_id).filter(Boolean))]
    return {...g,status:publicationIds.length>1?'convergent':'unique',sources,publicationIds,summary:g.nodes.length>1?'Plusieurs formulations proches ont été rapprochées. Les formulations originales restent accessibles dans les sources.':g.label,linked:[...new Set(g.nodes.flatMap(n=>(data.relations||[]).filter(r=>r.source_id===n.node_id||r.cible_id===n.node_id).slice(0,8).map(r=>nodeMap[r.source_id===n.node_id?r.cible_id:r.source_id]?.libelle).filter(Boolean)))].slice(0,10)}
  })
}

function RecommendationWorkspace({treatment,data,onBack,initialNeed=''}){
  const pubs=useMemo(()=>data.publications.filter(p=>p.chunk_count>0),[data])
  const domainOptions=useMemo(()=>[...new Set(pubs.flatMap(publicationDomains))].sort((a,b)=>a.localeCompare(b,'fr')),[pubs])
  const [domains,setDomains]=useState([])
  const [subject,setSubject]=useState(initialNeed)
  const [selectedPubs,setSelectedPubs]=useState([])
  const [domainOpen,setDomainOpen]=useState(false)
  const [corpusOpen,setCorpusOpen]=useState(false)
  const [corpusSearch,setCorpusSearch]=useState('')
  const [results,setResults]=useState(null)
  const [selectedReco,setSelectedReco]=useState(null)
  const [statusFilter,setStatusFilter]=useState('all')
  const [sort,setSort]=useState('pertinence')
  const [openProofs,setOpenProofs]=useState(new Set())
  const [showGraphContext,setShowGraphContext]=useState(false)

  const pubsInDomains=useMemo(()=>domains.length?pubs.filter(p=>publicationDomains(p).some(d=>domains.includes(d))):[],[pubs,domains])
  const pubMap=useMemo(()=>Object.fromEntries(pubs.map(p=>[p.publication_id,p])),[pubs])
  const selectedSet=useMemo(()=>new Set(selectedPubs),[selectedPubs])
  const corpusMatches=useMemo(()=>{const q=normalize(corpusSearch);return pubsInDomains.filter(p=>!q||normalize(`${p.publication_id} ${p.titre} ${p.organisme_producteur}`).includes(q))},[pubsInDomains,corpusSearch])
  const activePubs=selectedPubs.length?pubsInDomains.filter(p=>selectedSet.has(p.publication_id)):pubsInDomains
  const activeIds=useMemo(()=>new Set(activePubs.map(p=>p.publication_id)),[activePubs])
  const recoNodes=useMemo(()=>(data.nodes||[]).filter(n=>normalize(n.type_noeud)==='recommandation'&&activeIds.has(n.publication_id)),[data,activeIds])

  const toggleDomain=d=>{setDomains(s=>s.includes(d)?s.filter(x=>x!==d):[...s,d]);setSelectedPubs([]);setResults(null);setSelectedReco(null)}
  const togglePub=id=>{setSelectedPubs(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);setResults(null);setSelectedReco(null)}
  const reset=()=>{setDomains([]);setSubject('');setSelectedPubs([]);setResults(null);setSelectedReco(null);setStatusFilter('all');setCorpusSearch('');setOpenProofs(new Set());setShowGraphContext(false)}
  const run=()=>{
    if(!domains.length||!subject.trim())return
    const grouped=groupRecommendationNodes(recoNodes,data,subject.trim())
    setResults(grouped);setSelectedReco(grouped[0]||null);setStatusFilter('all');setOpenProofs(new Set());setShowGraphContext(false);setDomainOpen(false);setCorpusOpen(false)
  }
  const filteredResults=useMemo(()=>{
    if(!results)return []
    let items=statusFilter==='all'?results:results.filter(r=>r.status===statusFilter)
    items=[...items]
    if(sort==='sources')items.sort((a,b)=>b.publicationIds.length-a.publicationIds.length||b.score-a.score)
    else items.sort((a,b)=>b.score-a.score||b.publicationIds.length-a.publicationIds.length)
    return items
  },[results,statusFilter,sort])
  const counts={all:results?.length||0,convergent:results?.filter(r=>r.status==='convergent').length||0,unique:results?.filter(r=>r.status==='unique').length||0}
  const sourcePublicationCount=results?[...new Set(results.flatMap(r=>r.publicationIds))].length:0
  const toggleProof=key=>setOpenProofs(s=>{const n=new Set(s);n.has(key)?n.delete(key):n.add(key);return n})
  const domainLabel=domains.length?domains.length===1?domains[0]:`${domains.length} domaines`:'Choisir un ou plusieurs domaines'
  const corpusLabel=selectedPubs.length?`${selectedPubs.length} publication${selectedPubs.length>1?'s':''} choisie${selectedPubs.length>1?'s':''}`:'Rechercher dans le corpus du domaine'

  return <main className="page qvl-reco-v02">
    <style>{RECOMMENDATIONS_SCREEN_STYLES}</style>
    <button className="back-link" onClick={onBack}><Icon name="back"/>Retour à l’atelier</button>
    <header className="qvl-reco-head"><div><div className="qvl-reco-title-row"><h1>Extraction de recommandations</h1><span className="regime extract">Extraction stricte</span></div><p>Identifiez et comparez les recommandations formulées dans les publications sur un sujet donné.</p></div><button className="qvl-reco-help" type="button" title="T04 mobilise les domaines, le sujet, les nœuds recommandation et leurs preuves."><Icon name="info" size={16}/>Comment ça fonctionne ?</button></header>

    <section className="qvl-reco-scope">
      <div className="qvl-reco-fields">
        <div className="qvl-reco-field"><label>Domaine(s) <Icon name="info" size={14}/></label><div className="qvl-selector"><button type="button" className="qvl-selector-btn" onClick={()=>{setDomainOpen(v=>!v);setCorpusOpen(false)}}><span>{domainLabel}</span><Icon name="chevron" size={15}/></button>{domainOpen&&<div className="qvl-selector-panel">{domainOptions.map(d=><label key={d}><input type="checkbox" checked={domains.includes(d)} onChange={()=>toggleDomain(d)}/><span>{d}</span></label>)}</div>}</div></div>
        <div className="qvl-reco-field"><label>Sujet (obligatoire) <Icon name="info" size={14}/></label><input type="text" value={subject} onChange={e=>{setSubject(e.target.value);setResults(null);setSelectedReco(null)}} placeholder="Ex. : Prévention des violences envers les élus"/></div>
        <div className="qvl-reco-field corpus"><label>Corpus <Icon name="info" size={14}/></label><div className="qvl-selector"><button type="button" className="qvl-selector-btn" disabled={!domains.length} onClick={()=>{setCorpusOpen(v=>!v);setDomainOpen(false)}}><span>{corpusLabel}</span><Icon name="chevron" size={15}/></button>{corpusOpen&&<div className="qvl-selector-panel"><div className="qvl-corpus-search"><Icon name="search" size={15}/><input value={corpusSearch} onChange={e=>setCorpusSearch(e.target.value)} placeholder="Titre, organisme, identifiant…"/></div>{corpusMatches.map(p=><label className="qvl-corpus-option" key={p.publication_id}><input type="checkbox" checked={selectedPubs.includes(p.publication_id)} onChange={()=>togglePub(p.publication_id)}/><span><b>{p.publication_id}</b><strong>{p.titre}</strong><small>{p.organisme_producteur}{p.année_publication?` · ${p.année_publication}`:''}</small></span></label>)}{!corpusMatches.length&&<div className="qvl-reco-note">Aucune publication ne correspond au domaine et à la recherche.</div>}</div>}</div></div>
      </div>
      <div className="qvl-reco-actions"><button className="qvl-reco-primary" type="button" onClick={run} disabled={!domains.length||!subject.trim()}><Icon name="spark" size={16}/>Générer les recommandations</button><button className="qvl-reco-secondary" type="button" onClick={reset}><Icon name="reset" size={16}/>Réinitialiser</button><div className="qvl-reco-rule"><Icon name="info" size={15}/><span>{selectedPubs.length?`Analyse limitée aux ${selectedPubs.length} publications choisies.`:`Sans sélection manuelle, T04 recherche parmi les ${pubsInDomains.length} publications du ou des domaines retenus.`} {recoNodes.length} nœud{recoNodes.length>1?'s':''} « recommandation » disponible{recoNodes.length>1?'s':''} dans ce périmètre.</span></div></div>
    </section>

    {!results?<div className="qvl-reco-empty"><div><span className="generated-kicker">T04 · EXTRACTION STRICTE</span><h2>Cadrez le sujet avant d’extraire</h2><p>Sélectionnez au moins un domaine de la base, formulez votre sujet, puis laissez T04 repérer les nœuds <b>recommandation</b> correspondants et revenir à leurs pages, timecodes et chunks sources.</p></div></div>:<>
      <div className="qvl-reco-result-head"><div className="qvl-reco-result-count"><strong>{counts.all} recommandation{counts.all>1?'s':''} identifiée{counts.all>1?'s':''}</strong><span>dans {sourcePublicationCount} publication{sourcePublicationCount>1?'s':''} · sujet : {subject}</span></div><button type="button" className={`qvl-reco-filter ${statusFilter==='all'?'active':''}`} onClick={()=>setStatusFilter('all')}>{counts.all} Toutes</button><button type="button" className={`qvl-reco-filter ${statusFilter==='convergent'?'active':''}`} onClick={()=>setStatusFilter('convergent')}>{counts.convergent} Convergentes</button><button type="button" className={`qvl-reco-filter unique ${statusFilter==='unique'?'active':''}`} onClick={()=>setStatusFilter('unique')}>{counts.unique} Uniques</button><select className="qvl-reco-sort" value={sort} onChange={e=>setSort(e.target.value)}><option value="pertinence">Pertinence</option><option value="sources">Nombre de sources</option></select></div>
      <div className="qvl-reco-layout">
        <section className="qvl-reco-list">{filteredResults.length?filteredResults.map(r=><button type="button" className={`qvl-reco-card ${selectedReco?.id===r.id?'selected':''}`} key={r.id} onClick={()=>{setSelectedReco(r);setShowGraphContext(false)}}><div className="qvl-reco-main"><h3>{r.label}</h3><p>{r.summary}</p><span className={`qvl-reco-badge ${r.status}`}>{r.status==='convergent'?'RECOMMANDATION CONVERGENTE':'RECOMMANDATION UNIQUE'}</span><span className="qvl-reco-source-count">{r.publicationIds.length} source{r.publicationIds.length>1?'s':''}</span></div><div className="qvl-reco-sources-mini">{r.sources.slice(0,3).map((s,i)=><div className="qvl-reco-source-mini" key={`${s.node_id}-${i}`}><strong>{s.publication_id} — {s.titre}</strong><span>{s.page?`p./TC ${s.page}`:'source'}</span></div>)}</div><span className="qvl-reco-chevron"><Icon name="chevron" size={17}/></span></button>):<div className="qvl-reco-empty"><div><h2>Aucune recommandation dans ce filtre</h2><p>Essayez l’ensemble des résultats ou reformulez le sujet.</p></div></div>}</section>
        <aside className="qvl-reco-detail">{selectedReco?<><div className="qvl-reco-detail-head">Détail de la recommandation</div><div className="qvl-reco-detail-body"><span className={`qvl-reco-badge ${selectedReco.status}`}>{selectedReco.status==='convergent'?'RECOMMANDATION CONVERGENTE':'RECOMMANDATION UNIQUE'}</span><h2>{selectedReco.label}</h2><div className="qvl-reco-meta"><b>Relative à :</b><span>{subject}</span><b>Domaine(s) :</b><span>{domains.join(' · ')}</span></div><div className="qvl-reco-metrics"><div className="qvl-reco-metric"><b>{selectedReco.publicationIds.length}</b>source{selectedReco.publicationIds.length>1?'s':''}</div><div className="qvl-reco-metric"><b>{selectedReco.sources.filter(s=>s.page).length}</b>preuve{selectedReco.sources.filter(s=>s.page).length>1?'s':''} paginée{selectedReco.sources.filter(s=>s.page).length>1?'s':''}</div></div><div className="qvl-reco-section-title">Synthèse de la recommandation</div><p className="qvl-reco-summary">{selectedReco.summary}</p><div className="qvl-reco-section-title">Sources et formulations originales</div>{selectedReco.sources.map((s,i)=>{const key=`${selectedReco.id}-${s.node_id}-${i}`;const open=openProofs.has(key);return <div className="qvl-reco-proof" key={key}><button type="button" onClick={()=>toggleProof(key)}><span><strong>{s.publication_id} — {s.titre}</strong><small>{s.organisme}{s.annee?` · ${s.annee}`:''}</small></span><span>{s.page?`p./TC ${s.page}`:'Preuve'} {open?'⌃':'⌄'}</span></button>{open&&<div className="qvl-reco-proof-excerpt"><b>Formulation structurée :</b> {s.formulation}{s.excerpt&&<><br/><br/><b>Extrait source :</b> {s.excerpt.slice(0,700)}{s.excerpt.length>700?'…':''}</>}</div>}</div>})}<button className="qvl-reco-secondary" type="button" onClick={()=>setShowGraphContext(v=>!v)}><Icon name="graph" size={16}/>{showGraphContext?'Masquer le contexte graphe':'Voir le contexte graphe'}</button>{showGraphContext&&<div className="qvl-reco-graph-context"><p>Entités directement reliées aux nœuds recommandation retenus :</p><div className="qvl-reco-linked">{selectedReco.linked.length?selectedReco.linked.map(x=><span key={x}>{x}</span>):<span>Aucune relation directe disponible</span>}</div></div>}</div></>:<div className="qvl-reco-detail-body"><p>Sélectionnez une recommandation pour afficher ses sources et son contexte.</p></div>}</aside>
      </div>
      <div className="qvl-reco-note"><Icon name="info" size={15}/><span>Les recommandations affichées proviennent des nœuds « recommandation » du graphe et de leurs preuves documentaires. Les formulations très proches ne sont regroupées que lorsque leur similarité est forte ; sinon elles restent séparées afin de ne pas altérer leur sens.</span></div>
    </>}
  </main>
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
