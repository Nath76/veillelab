import { normalize, queryTokens } from '../lib/text.js'

export async function askGraph(question, publication, nodes, relations) {
  const url = import.meta.env.VITE_GRAPH_CHAT_URL?.trim()

  if (url) {
    let r

    try {
      r = await fetch(url, {
        method: 'POST',
        // Apps Script ne gère pas le pré-vol CORS OPTIONS.
        // text/plain garde la requête "simple" tout en permettant
        // à doPost(e) de lire et parser le JSON envoyé dans le corps.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'askPublication',
          question,
          publication_id: publication?.publication_id || '',
          publication_titre: publication?.titre || '',
          graph: {
            nodes: nodes.map(n => ({
              node_id: n.node_id,
              publication_id: n.publication_id,
              type_noeud: n.type_noeud,
              libelle: n.libelle,
              libelle_normalise: n.libelle_normalise,
              page_source: n.page_source,
            })),
            relations: relations.map(r => ({
              relation_id: r.relation_id,
              source_id: r.source_id,
              cible_id: r.cible_id,
              type_relation: r.type_relation,
              page_source: r.page_source,
            })),
          },
        }),
      })
    } catch (error) {
      throw new Error(
        `Impossible de joindre l’API Apps Script. ${error?.message || error}`
      )
    }

    if (!r.ok) {
      throw new Error(`Le service de dialogue a répondu HTTP ${r.status}.`)
    }

    let payload
    try {
      payload = await r.json()
    } catch (error) {
      throw new Error('La réponse Apps Script n’est pas un JSON valide.')
    }

    if (payload?.ok === false) {
      throw new Error(payload.error || 'Erreur Apps Script.')
    }

    // L’API de l’onglet 2 renvoie { ok:true, data:{...} }.
    // Le composant attend directement reponse, resultats,
    // noeuds_selectionnes, etc.
    return {
      mode: 'api',
      ...(payload?.data || payload),
    }
  }

  // Fallback local uniquement si aucune URL Apps Script n’est configurée.
  const tokens = queryTokens(question)
  const scored = nodes
    .map(n => {
      const hay = normalize(`${n.libelle} ${n.libelle_normalise} ${n.type_noeud}`)
      let score = 0
      tokens.forEach(t => {
        if (hay.includes(t)) score += 2
      })
      if (normalize(n.libelle).includes(normalize(question))) score += 8
      return { n, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  const ids = new Set(scored.map(x => x.n.node_id))
  const related = relations
    .filter(r => ids.has(r.source_id) || ids.has(r.cible_id))
    .slice(0, 8)

  return {
    mode: 'local',
    reponse: scored.length
      ? "Mode de démonstration locale : les éléments ci-dessous correspondent lexicalement à la question. Branchez l’URL Apps Script pour tester la réponse Neo4j + Claude."
      : "Mode de démonstration locale : aucun élément n’a été repéré avec suffisamment de correspondance lexicale. Branchez l’URL Apps Script pour tester l’interrogation sémantique.",
    noeuds_selectionnes: scored.map(x => x.n.node_id),
    resultats: related,
  }
}
