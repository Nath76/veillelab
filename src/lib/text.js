export function sentenceCase(value='') {
  const s = String(value).trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

export function normalize(value='') {
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s-]/g,' ').replace(/\s+/g,' ').trim()
}

export function queryTokens(value='') {
  const stop = new Set(['quelle','quelles','quel','quels','dans','pour','avec','cette','sont','est','une','des','les','que','qui','quoi','fait','faire','matiere','sujet','sur','aux','par','du','de','la','le','en','et','un','au'])
  return normalize(value).split(' ').filter(x => x.length >= 3 && !stop.has(x))
}

export function clip(value='', n=165) {
  const s=String(value).trim()
  return s.length > n ? s.slice(0,n-1).trim()+'…' : s
}
