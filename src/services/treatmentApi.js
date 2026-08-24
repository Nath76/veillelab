function makeRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `t01-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
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

function isNetworkError(error) {
  const message = String(error?.message || error || '')
  return error instanceof TypeError || /NetworkError|Failed to fetch|fetch resource/i.test(message)
}

async function recoverGeneratedResult(url, requestId) {
  // Si la réponse HTTP a été perdue après la fin du calcul, Apps Script conserve
  // temporairement le résultat. On le récupère sans relancer Claude.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await wait(attempt === 0 ? 1200 : 3000)
    try {
      const state = await postJson(url, {
        action: 'getTreatmentResult',
        request_id: requestId,
      })
      if (state?.status === 'done' && state.result) return state.result
      if (state?.status === 'error') {
        throw new Error(state.error || 'La génération a échoué côté service IA.')
      }
    } catch (error) {
      if (!isNetworkError(error)) throw error
      // Une coupure réseau peut aussi toucher l'appel de récupération : on poursuit brièvement.
    }
  }
  return null
}

export async function generateTreatment({ treatment, need, publications, contents }) {
  const url = import.meta.env.VITE_GRAPH_CHAT_URL?.trim()
  if (!url) throw new Error("L'URL du service IA n'est pas configurée.")

  const corpus = publications.map(pub => ({
    publication_id: pub.publication_id,
    titre: pub.titre,
    organisme_producteur: pub.organisme_producteur,
    annee_publication: pub.année_publication,
    type_document: pub.type_document,
    url_contenu: pub.url_contenu,
    url_source: pub.url_source,
    chunks: contents.filter(c => c.publication_id === pub.publication_id),
  }))

  const requestId = makeRequestId()
  const body = {
    action: 'generateTreatment',
    request_id: requestId,
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

  try {
    return await postJson(url, body)
  } catch (error) {
    if (!isNetworkError(error)) throw error

    const recovered = await recoverGeneratedResult(url, requestId)
    if (recovered) return recovered

    throw new Error(
      'La connexion avec le service IA a été interrompue avant la réception du résultat. ' +
      'La génération n’est pas relancée automatiquement pour éviter un doublon ; utilisez « Réessayer ».',
    )
  }
}
