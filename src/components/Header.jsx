import React from 'react'
import Icon from './Icon.jsx'

const tabs=[
  {id:'expertises',label:'Expertises ministérielles',icon:'graph'},
  {id:'explorer',label:'Explorer une publication',icon:'compass'},
  {id:'atelier',label:'Atelier IA',icon:'spark'},
  {id:'about',label:'La veille à l’IHEMI',icon:'building'},
]

export default function Header({active,onChange}){
  return <header className="topbar">
    <button className="brand" onClick={()=>onChange('expertises')} aria-label="Accueil Quiritès Veille Lab">
      <span className="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <span className="brand-copy"><strong>Quiritès</strong><b>Veille Lab</b></span>
    </button>
    <nav className="topnav" aria-label="Navigation principale">
      {tabs.map(t=><button key={t.id} className={`navtab ${active===t.id?'active':''}`} onClick={()=>onChange(t.id)}>
        <Icon name={t.icon} size={17}/><span>{t.label}</span>
      </button>)}
    </nav>
    <div className="top-actions">
      <button className="round-action" aria-label="Aide">?</button>
      <div className="avatar">NK</div>
    </div>
  </header>
}
