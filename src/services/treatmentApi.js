const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

// T01 Cloud Run — première intégration réelle.
// Le chatbot et les autres fonctions de l'application ne sont pas modifiés.
const CLOUD_T01_URL = 'https://veillelab-cloud-backend2-633342872265.europe-west9.run.app'

function getTreatmentUrl() {
  const configured = import.meta.env.VITE_TREATMENT_API_URL?.trim()
  return (configured || CLOUD_T01_URL).replace(/\/+$/, '')
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
    try {
      const payload = await response.json()
      detail = payload?.error ? ` ${payload.error}` : ''
    } catch {}
    throw new Error(`Le service IA a répondu ${response.status}.${detail}`)
  }

  return response.json()
}

async function pollCloudJob(baseUrl, jobId) {
  // Le traitement vit côté serveur : une interruption du navigateur
  // ne détruit plus le job. Le front ne fait que relire son état.
  const maxAttempts = 400

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await wait(attempt === 0 ? 1200 : 3000)

    try {
      const payload = await fetchJson(`${baseUrl}/jobs/${jobId}`)
      const job = payload?.job

      if (job?.status === 'completed' && job.result) {
        sessionStorage.removeItem('quirites:t01:activeJob')
        return job.result
      }

      if (job?.status === 'error') {
        sessionStorage.removeItem('quirites:t01:activeJob')
        throw new Error(job.error_message || 'La génération T01 a échoué.')
      }
    } catch (error) {
      const message = String(error?.message || '')
      // Les erreurs métier sont remontées immédiatement.
      // Une simple coupure réseau pendant le polling est tolérée.
      if (/a échoué|Anthropic|chunk|corpus|provenance|secret|invalide|inaccessible/i.test(message)) {
        throw error
      }
    }
  }

  throw new Error(
    "Le traitement est toujours en cours côté serveur. Son résultat n'est pas perdu ; rechargez la page puis relancez la même demande pour reprendre le suivi."
  )
}

async function generateViaCloud({ url, treatment, need, corpus }) {
  const body = {
    treatment_id: treatment.traitement_id,
    need,
    treatment: {
      traitement_id: treatment.traitement_id,
      nom_traitement: treatment.nom_traitement,
      objectif: treatment.objectif,
      regime_IA: treatment.regime_IA,
      format_sortie: treatment.format_sortie,
      provenance_exigee: treatment.provenance_exigee,
      prompt_systeme: treatment.prompt_systeme,
    },
    corpus,
  }

  const signature = JSON.stringify({
    treatment_id: treatment.traitement_id,
    need,
    publications: corpus.map(p => p.publication_id),
  })

  // Si exactement le même T01 a déjà été lancé dans cette session,
  // on reprend le suivi au lieu de créer un doublon.
  try {
    const saved = JSON.parse(sessionStorage.getItem('quirites:t01:activeJob') || 'null')
    if (saved?.job_id && saved?.signature === signature && saved?.base_url === url) {
      return await pollCloudJob(url, saved.job_id)
    }
  } catch {}

  const created = await fetchJson(`${url}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!created?.ok || !created?.job_id) {
    throw new Error(created?.error || "Le job T01 n'a pas pu être créé.")
  }

  sessionStorage.setItem('quirites:t01:activeJob', JSON.stringify({
    job_id: created.job_id,
    signature,
    base_url: url,
    created_at: Date.now(),
  }))

  return pollCloudJob(url, created.job_id)
}

export async function generateTreatment({ treatment, need, publications, contents }) {
  if (treatment?.traitement_id !== 'T01') {
    throw new Error('Cette branche Cloud est actuellement réservée au résumé analytique T01.')
  }

  const url = getTreatmentUrl()
  const corpus = buildCorpus(publications, contents)

  return generateViaCloud({ url, treatment, need, corpus })
}
