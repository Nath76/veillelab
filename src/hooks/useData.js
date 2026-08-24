import { useEffect, useState } from 'react'

const FILES = ['publications','nodes','relations','contents','treatments','expertise_nodes','expertise_edges','manifest']

export function useData() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let alive = true
    Promise.all(FILES.map(async (name) => {
      const r = await fetch(`./data/${name}.json`)
      if (!r.ok) throw new Error(`Impossible de charger ${name}.json`)
      return [name, await r.json()]
    })).then(entries => {
      if (alive) setData(Object.fromEntries(entries))
    }).catch(e => alive && setError(e))
    return () => { alive = false }
  }, [])
  return { data, error }
}
