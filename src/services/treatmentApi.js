const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

function getTreatmentUrl() {
  const cloudUrl = import.meta.env.VITE_TREATMENT_API_URL?.trim()
  if (cloudUrl) return cloudUrl.replace(/\/+$/, '')

  // Fallback temporaire : tant que la variable Cloud n'est pas configurée,
  // l'ancienne branche Apps Script reste disponible.
  const legacyUrl = import.meta.env.VITE_GRAPH_CHAT_URL?.trim()
  if (legacyUrl) return legacyUrl.replace(/\/+$/, '')

  throw new Error("L'URL du service IA n'est pas configurée.")
}

function isCloudRunUrl(url) {
  return /\.run\.app(?:\/|$)/i.test(url)
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
  // 20 minutes : le front n'impose plus la durée du traitement,
  // mais évite une attente infinie si un job est réellement bloqué.
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
      // Une coupure de réseau pendant le polling ne fait pas perdre le job.
      // On continue, sauf erreur métier explicite.
      if (/a échoué|HTTP|Anthropic|chunk|corpus|provenance|secret/i.test(String(error?.message || ''))) {
        throw error
      }
    }
  }

  throw new Error(
    "Le traitement est toujours en cours côté serveur. Son résultat n'est pas perdu, mais l'attente dans cette page a expiré."
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

  // Si la même génération a été lancée dans cette session et n'a pas fini,
  // on reprend le polling au lieu de créer un doublon.
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

async function generateViaLegacyAppsScript({ url, treatment, need, corpus }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'generateTreatment',
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
    }),
  })

  if (!response.ok) {
    throw new Error(`Le service IA a répondu ${response.status}.`)
  }

  const payload = await response.json()
  if (!payload?.ok) {
    throw new Error(payload?.error || 'Le service IA a retourné une erreur.')
  }

  return payload.data
}

export async function generateTreatment({ treatment, need, publications, contents }) {
  const url = getTreatmentUrl()
  const corpus = buildCorpus(publications, contents)

  if (isCloudRunUrl(url)) {
    return generateViaCloud({ url, treatment, need, corpus })
  }

  return generateViaLegacyAppsScript({ url, treatment, need, corpus })
}
