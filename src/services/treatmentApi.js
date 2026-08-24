const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const CLOUD_TREATMENT_URL = 'https://veillelab-cloud-backend2-633342872265.europe-west9.run.app'

function getTreatmentUrl() {
  // T01 et T03 utilisent désormais explicitement Cloud Run.
  // On n'autorise plus une ancienne variable VITE_TREATMENT_API_URL
  // à rediriger silencieusement les traitements vers Apps Script.
  return CLOUD_TREATMENT_URL
}

function buildCorpus(publications, contents) {
  return publications.map(pub => ({
    publication_id: pub.publication_id,
    titre: pub.titre,
    organisme_producteur: pub.organisme_producteur,
    annee_publication: pub.année_publication,
    type_document: pub.type_document,
    url_contenu: pub.url_contenu,
    url_source: pub.url_source,
    chunks: contents.filter(c => c.publication_id === pub.publication_id),
  }))
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  if (!response.ok) {
    let detail = ''
    try { const payload = await response.json(); detail = payload?.error ? ` ${payload.error}` : '' } catch {}
    throw new Error(`Le service IA a répondu ${response.status}.${detail}`)
  }
  return response.json()
}

async function pollCloudJob(baseUrl, jobId, treatmentId) {
  const maxAttempts = treatmentId === 'T01' ? 400 : 180
  const storageKey = `quirites:${treatmentId.toLowerCase()}:activeJob`
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await wait(attempt === 0 ? 1200 : 2500)
    try {
      const payload = await fetchJson(`${baseUrl}/jobs/${jobId}`)
      const job = payload?.job
      if (job?.status === 'completed' && job.result) { sessionStorage.removeItem(storageKey); return job.result }
      if (job?.status === 'error') { sessionStorage.removeItem(storageKey); throw new Error(job.error_message || `La génération ${treatmentId} a échoué.`) }
    } catch (error) {
      const message = String(error?.message || '')
      if (/a échoué|Anthropic|chunk|corpus|provenance|secret|invalide|inaccessible|insuffisamment/i.test(message)) throw error
    }
  }
  throw new Error("Le traitement est toujours en cours côté serveur. Son résultat n'est pas perdu ; relancez la même demande pour reprendre le suivi.")
}

async function generateViaCloud({ url, treatment, need, corpus, graphNodes = [], graphRelations = [] }) {
  const treatmentId = treatment.traitement_id
  const body = {
    treatment_id: treatmentId,
    need,
    treatment: {
      traitement_id: treatmentId,
      nom_traitement: treatment.nom_traitement,
      objectif: treatment.objectif,
      regime_IA: treatment.regime_IA,
      format_sortie: treatment.format_sortie,
      provenance_exigee: treatment.provenance_exigee,
      prompt_systeme: treatment.prompt_systeme,
    },
    corpus,
    graph_nodes: treatmentId === 'T03' ? graphNodes : [],
    graph_relations: treatmentId === 'T03' ? graphRelations : [],
  }

  const signature = JSON.stringify({ treatment_id: treatmentId, need, publications: corpus.map(p => p.publication_id) })
  const storageKey = `quirites:${treatmentId.toLowerCase()}:activeJob`
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null')
    if (saved?.job_id && saved?.signature === signature && saved?.base_url === url) return await pollCloudJob(url, saved.job_id, treatmentId)
  } catch {}

  const created = await fetchJson(`${url}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!created?.ok || !created?.job_id) throw new Error(created?.error || `Le job ${treatmentId} n'a pas pu être créé.`)

  sessionStorage.setItem(storageKey, JSON.stringify({ job_id: created.job_id, signature, base_url: url, created_at: Date.now() }))
  return pollCloudJob(url, created.job_id, treatmentId)
}

export async function generateTreatment({ treatment, need, publications, contents, nodes = [], relations = [] }) {
  const treatmentId = treatment?.traitement_id
  if (!['T01','T03'].includes(treatmentId)) throw new Error('Cette branche Cloud est actuellement disponible pour T01 et T03.')
  const url = getTreatmentUrl()
  const corpus = buildCorpus(publications, contents)
  const publicationIds = new Set(publications.map(p => p.publication_id))
  const graphNodes = treatmentId === 'T03' ? nodes.filter(n => publicationIds.has(n.publication_id)) : []
  const graphRelations = treatmentId === 'T03' ? relations.filter(r => publicationIds.has(r.publication_id)) : []
  return generateViaCloud({ url, treatment, need, corpus, graphNodes, graphRelations })
}
