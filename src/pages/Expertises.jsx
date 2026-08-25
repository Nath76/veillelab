import React, { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import ExpertiseConstellation, {
  selectOverviewExpertises,
} from '../components/ExpertiseConstellation.jsx'
import { normalize, sentenceCase } from '../lib/text.js'
import '../expertises-fenetres-originales.css'

const familyColor = {
  'Instrument / dispositif': '#7258d9',
  'Méthode / savoir-faire': '#ffb20e',
  'Problème public': '#14af75',
}


const EXPERTISE_INTRO_STYLES = `
.expertise-screen .expertise-transition-banner{
  display:grid;
  grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);
  gap:26px;
  align-items:center;
  margin:0 0 22px;
  padding:23px 26px;
  border:1px solid #d9e3ef;
  border-radius:16px;
  background:linear-gradient(110deg,#ffffff 0%,#fbfdff 66%,#f7faff 100%);
  box-shadow:0 5px 16px rgba(28,52,86,.05);
  overflow:hidden;
}
.expertise-screen .expertise-transition-copy{min-width:0}
.expertise-screen .expertise-transition-kicker{
  display:block;margin:0 0 8px;color:#2563d8;font-size:12px;line-height:1;
  font-weight:850;letter-spacing:.08em;
}
.expertise-screen .expertise-transition-copy h2{
  margin:0 0 11px;color:#102a56;font-size:29px;line-height:1.13;
  letter-spacing:-.025em;font-weight:850;
}
.expertise-screen .expertise-transition-copy p{
  margin:0;max-width:790px;color:#35506f;font-size:16px;line-height:1.62;
}
.expertise-screen .expertise-transition-copy strong{color:#163b70;font-weight:850}
.expertise-screen .expertise-transition-art{
  min-width:0;height:150px;display:flex;justify-content:flex-end;align-items:center;overflow:hidden;
}
.expertise-screen .expertise-transition-art img{
  display:block;width:100%;max-width:500px;height:100%;object-fit:contain;object-position:center right;
}
.expertise-screen .expertise-intro .intro-summary{
  margin:0;color:#314a6b;font-size:14.5px;line-height:1.62;
}
.expertise-screen .expertise-intro .intro-full p{
  font-size:14px;line-height:1.58;
}
.expertise-screen .expertise-intro-toggle{
  appearance:none;border:0;background:transparent;padding:0;margin:12px 0 0;color:#1f5fc4;
  font:800 12.5px/1.3 inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px;
}
.expertise-screen .expertise-intro-toggle:hover{text-decoration:underline}
@media(max-width:1180px){
  .expertise-screen .expertise-transition-banner{grid-template-columns:1fr}
  .expertise-screen .expertise-transition-art{height:112px;justify-content:flex-start}
  .expertise-screen .expertise-transition-art img{max-width:540px;object-position:left center}
}
@media(max-width:820px){
  .expertise-screen .expertise-transition-banner{padding:20px}
  .expertise-screen .expertise-transition-copy h2{font-size:25px}
  .expertise-screen .expertise-transition-copy p{font-size:15px}
}
`

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`ui-accordion ${open ? 'open' : ''}`}>
      <button onClick={() => setOpen(v => !v)}>
        <span>{title}</span>
        <span>{open ? '⌃' : '⌄'}</span>
      </button>

      {open && (
        <div className="accordion-body">
          {children}
        </div>
      )}
    </div>
  )
}


function ExpertiseIntroBanner() {
  return (
    <section
      className="expertise-transition-banner"
      aria-label="Introduction aux expertises ministérielles"
    >
      <div className="expertise-transition-copy">
        <span className="expertise-transition-kicker">
          EXPERTISES MINISTÉRIELLES
        </span>

        <h2>Des publications aux savoir-faire du ministère</h2>

        <p>
          Le ministère de l’Intérieur produit chaque année une grande variété
          de travaux qui combinent <strong>culture de l’action</strong> et mise
          en perspective des politiques publiques. Cette carte donne à voir les
          expertises mobilisées par cette production.
        </p>
      </div>

      <div className="expertise-transition-art" aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}images/expertises-intro-sobre.png`} alt="" />
      </div>
    </section>
  )
}

export default function Expertises({ data }) {
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [entity, setEntity] = useState('Toutes les entités')
  const [family, setFamily] = useState('Tous')
  const [introExpanded, setIntroExpanded] = useState(false)

  const [nodeSize, setNodeSize] = useState(1)
  const [linkDensity, setLinkDensity] = useState(1)
  const [resetToken, setResetToken] = useState(0)
  const [fitToken, setFitToken] = useState(0)

  const entities = useMemo(
    () => [
      'Toutes les entités',
      ...new Set(
        data.expertise_nodes.flatMap(n => n.entities || [])
      ),
    ].sort((a, b) => a.localeCompare(b, 'fr')),
    [data]
  )

  const filtered = useMemo(
    () =>
      data.expertise_nodes.filter(
        n =>
          (
            entity === 'Toutes les entités' ||
            (n.entities || []).includes(entity)
          ) &&
          (
            family === 'Tous' ||
            n.family === family
          )
      ),
    [data, entity, family]
  )

  const found = useMemo(() => {
    const q = normalize(search)

    return q
      ? filtered
          .filter(n =>
            normalize(
              `${n.label} ${n.definition} ${(n.entities || []).join(' ')}`
            ).includes(q)
          )
          .slice(0, 8)
      : []
  }, [search, filtered])

  const visibleEdges = useMemo(() => {
    const ids = new Set(filtered.map(n => n.id))

    return data.expertise_edges.filter(
      e => ids.has(e.source) && ids.has(e.target)
    )
  }, [filtered, data])

  const overviewNodes = selectOverviewExpertises(filtered, 80)

  const overviewIds = new Set(
    overviewNodes.map(n => n.id)
  )

  const overviewLinks = visibleEdges
    .filter(
      e =>
        overviewIds.has(e.source) &&
        overviewIds.has(e.target)
    )
    .slice(0, 220)

  const clear = () => {
    setSelected(null)
    setSearch('')
    setEntity('Toutes les entités')
    setFamily('Tous')
    setResetToken(x => x + 1)
  }

  return (
    <main
      className={`screen graph-screen expertise-screen ${
        selected ? 'has-drawer' : ''
      }`}
    >
      <style>{EXPERTISE_INTRO_STYLES}</style>

      <aside className="left-rail">

        <section className="rail-section expertise-intro">
          <h3>Pourquoi cette carte ?</h3>

          {!introExpanded ? (
            <p className="intro-summary">
              Les publications du ministère mobilisent un très large éventail
              d’expertises. Cette carte permet d’explorer ces savoir-faire,
              leurs proximités et les entités qui les mobilisent.
            </p>
          ) : (
            <div className="intro-full">
              <p>
                Le ministère de l’Intérieur produit chaque année une grande
                variété de travaux sur les sujets relevant de ses domaines
                d’intervention. Il combine ainsi, d’une manière unique,{' '}
                <strong>culture de l’action</strong> et capacité collective à
                mettre en perspective les politiques publiques.
              </p>

              <p>
                Cette production intellectuelle fait du ministère un
                contributeur fondamental au débat public sur des sujets très
                divers : sécurité (intérieure ; publique ; civile, routière),
                migrations et citoyenneté, protection des populations,
                anticipation et gestion des crises, cultes et laïcité, action
                publique territoriale.
              </p>

              <p>
                Ces publications mobilisent un très large éventail d’expertises
                que nous souhaitons montrer ici. Vous pourrez y voir et
                peut-être même y découvrir les savoir-faire spécifiques d’une
                large diversité de métiers.
              </p>
            </div>
          )}

          <button
            type="button"
            className="expertise-intro-toggle"
            onClick={() => setIntroExpanded(v => !v)}
          >
            {introExpanded
              ? 'Réduire l’introduction'
              : 'Lire l’introduction complète'}
            <span aria-hidden="true">{introExpanded ? '⌃' : '›'}</span>
          </button>
        </section>

        <section className="rail-section">
          <h3>
            <Icon name="search" size={19} />
            Rechercher
          </h3>

          <div className="rail-search">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une expertise, mot-clé…"
            />
            <Icon name="search" size={18} />
          </div>

          {found.length > 0 && (
            <div className="rail-results">
              {found.map(n => (
                <button
                  key={n.id}
                  onClick={() => {
                    setSelected(n)
                    setSearch('')
                  }}
                >
                  {n.label}
                  <small>{n.family}</small>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rail-section">
          <h3>Afficher</h3>

          <label className="radio-row">
            <input
              type="radio"
              checked
              readOnly
            />
            Toutes les expertises
          </label>

          <label
            className="radio-row muted-option"
            title="Disponible avec un profil utilisateur"
          >
            <input
              type="radio"
              disabled
            />
            Mes expertises uniquement
          </label>
        </section>

        <section className="rail-section">
          <h3>Entité(s)</h3>

          <select
            value={entity}
            onChange={e => {
              setEntity(e.target.value)
              setSelected(null)
            }}
          >
            {entities.map(x => (
              <option key={x}>
                {x}
              </option>
            ))}
          </select>
        </section>

        <section className="rail-section">
          <h3>Type d’expertise</h3>

          <select
            value={family}
            onChange={e => {
              setFamily(e.target.value)
              setSelected(null)
            }}
          >
            <option>Tous</option>
            <option>Instrument / dispositif</option>
            <option>Méthode / savoir-faire</option>
            <option>Problème public</option>
          </select>
        </section>

        <section className="rail-section display-section">
          <h3>Affichage</h3>

          <label>
            Taille des nœuds

            <input
              type="range"
              min="0.8"
              max="1.35"
              step="0.05"
              value={nodeSize}
              onChange={e =>
                setNodeSize(Number(e.target.value))
              }
            />

            <span>
              <small>Petite</small>
              <small>Grande</small>
            </span>
          </label>

          <label>
            Densité des liens

            <input
              type="range"
              min="0.6"
              max="1.8"
              step="0.1"
              value={linkDensity}
              onChange={e =>
                setLinkDensity(Number(e.target.value))
              }
            />

            <span>
              <small>Faible</small>
              <small>Élevée</small>
            </span>
          </label>
        </section>

      </aside>

      <section className="graph-workspace">

        <ExpertiseIntroBanner />

        <div className="workspace-toolbar">

          <div>
            <h1>Carte des expertises ministérielles</h1>

            <p className="workspace-subtitle">
              Explorez les expertises mobilisées par les entités du ministère
              de l’Intérieur.
            </p>

            <div className="big-count">
              <strong>{filtered.length}</strong>

              <span>
                nœuds ({overviewNodes.length} affichés) ·{' '}
                {visibleEdges.length} relations ({overviewLinks.length} affichées)
              </span>

              <Icon
                name="info"
                size={17}
              />
            </div>
          </div>

          <div className="toolbar-actions">

            <button onClick={clear}>
              <Icon
                name="reset"
                size={17}
              />
              Réinitialiser
            </button>

            <button
              onClick={() =>
                setFitToken(x => x + 1)
              }
            >
              <Icon
                name="target"
                size={17}
              />
              Ajuster à l’écran
            </button>

          </div>

        </div>

        <ExpertiseConstellation
          nodes={filtered}
          edges={visibleEdges}
          selected={selected}
          onSelect={setSelected}
          nodeSize={nodeSize}
          linkDensity={linkDensity}
          resetToken={resetToken}
          fitToken={fitToken}
        />

      </section>

      {selected && (
        <aside className="detail-drawer">

          <button
            className="drawer-close"
            onClick={() => setSelected(null)}
          >
            <Icon name="close" />
          </button>

          <div className="drawer-type">
            <i
              style={{
                background:
                  familyColor[selected.family] ||
                  '#ffb20e',
              }}
            />
            {selected.family}
          </div>

          <h2>{selected.label}</h2>

          <p className="drawer-definition">
            {selected.definition}
          </p>

          <h4>Entité(s)</h4>

          <div className="chips">
            {(selected.entities || []).map(x => (
              <span
                className="chip"
                key={x}
              >
                {x}
              </span>
            ))}
          </div>

          <h4>Publications associées</h4>

          <div className="publication-mini-list">
            {(selected.publications || [])
              .slice(0, 4)
              .map(p => (
                <article key={p.publication_id}>

                  {p.image_path ? (
                    <img
                      src={`.${p.image_path}`}
                      alt=""
                    />
                  ) : (
                    <div className="mini-placeholder">
                      {p.publication_id}
                    </div>
                  )}

                  <div>
                    <strong>
                      {sentenceCase(p.titre)}
                    </strong>

                    <small>
                      {p.organisme} · {p.annee}
                    </small>
                  </div>

                </article>
              ))}
          </div>

          <Accordion title="Expertises directement associées">
            <div className="chips">

              {(selected.associated || [])
                .slice(0, 12)
                .map(a => {
                  const n = data.expertise_nodes.find(
                    x => x.id === a.id
                  )

                  return n ? (
                    <button
                      className="chip clickable"
                      key={a.id}
                      onClick={() => setSelected(n)}
                    >
                      {n.label}
                    </button>
                  ) : null
                })}

            </div>
          </Accordion>

          <Accordion title="Domaines mobilisés">
            <div className="chips">

              {(selected.domains || []).map(x => (
                <span
                  className="chip"
                  key={x}
                >
                  {x}
                </span>
              ))}

            </div>
          </Accordion>

        </aside>
      )}

    </main>
  )
}
