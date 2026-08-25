import './LandingPage.css'

export default function LandingPage({ onEnter }) {
  return (
    <div className="qlab-landing">
      <div className="qlab-landing__overlay" />

      <div className="qlab-landing__left">
        <div className="qlab-landing__scene">
          <div className="qlab-landing__stars" />

          <div className="qlab-landing__sea" />
          <div className="qlab-landing__shore" />

          <div className="qlab-landing__lighthouse">
            <div className="qlab-landing__lighthouse-top" />
            <div className="qlab-landing__lighthouse-body" />
            <div className="qlab-landing__lighthouse-light" />
          </div>

          <div className="qlab-landing__beam-wrap">
            <div className="qlab-landing__beam-core" />
            <div className="qlab-landing__beam-glow" />
          </div>

          <div className="qlab-landing__network">
            <span className="node node-1">Sécurité</span>
            <span className="node node-2">Migrations</span>
            <span className="node node-3">Citoyenneté</span>
            <span className="node node-4">Criminalités</span>
            <span className="node node-5">Crises</span>
            <span className="node node-6">Risques</span>
          </div>
        </div>
      </div>

      <div className="qlab-landing__right">
        <div className="qlab-landing__content">
          <div className="qlab-landing__brand">Quiritès Lab</div>

          <p className="qlab-landing__lead">
            <strong>
              Le bulletin de veille Quiritès donne à voir chaque mois l’actualité éditoriale
              sur la sécurité, les migrations et la citoyenneté, les criminalités,
              l’anticipation des crises et la gestion des risques.
            </strong>
          </p>

          <p className="qlab-landing__text">
            <strong>Quiritès Veille Lab vous propose d’aller plus loin.</strong><br />
            Entrez dans les publications repérées par la veille, explorez leurs contenus
            et leurs relations, identifiez les expertises qu’elles révèlent et mobilisez-les
            pour vos propres travaux.
          </p>

          <div className="qlab-landing__baseline">
            Explorer · Relier · Travailler
          </div>

          <button className="qlab-landing__button" onClick={onEnter}>
            Entrer dans Quiritès Lab
          </button>
        </div>
      </div>
    </div>
  )
}
