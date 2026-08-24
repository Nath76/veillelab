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
