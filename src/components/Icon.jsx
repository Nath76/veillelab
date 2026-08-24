import React from 'react'

const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

export default function Icon({ name, size = 20 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true }
  const paths = {
    search: <><circle cx="11" cy="11" r="7" {...common}/><path d="m20 20-3.5-3.5" {...common}/></>,
    graph: <><circle cx="5" cy="6" r="2" {...common}/><circle cx="18" cy="5" r="2" {...common}/><circle cx="12" cy="18" r="2" {...common}/><path d="M7 6.2 16 5.3M6.2 7.7l4.7 8.6M17.2 6.7l-4 9.5" {...common}/></>,
    compass: <><circle cx="12" cy="12" r="9" {...common}/><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" {...common}/></>,
    spark: <><path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" {...common}/><circle cx="12" cy="12" r="3" {...common}/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21.5v-16Z" {...common}/></>,
    info: <><circle cx="12" cy="12" r="9" {...common}/><path d="M12 10v6M12 7h.01" {...common}/></>,
    external: <><path d="M14 4h6v6M20 4l-9 9" {...common}/><path d="M18 13v6H5V6h6" {...common}/></>,
    back: <><path d="m15 18-6-6 6-6" {...common}/></>,
    plus: <><path d="M12 5v14M5 12h14" {...common}/></>,
    minus: <><path d="M5 12h14" {...common}/></>,
    target: <><circle cx="12" cy="12" r="7" {...common}/><circle cx="12" cy="12" r="2" {...common}/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" {...common}/></>,
    reset: <><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6" {...common}/><path d="M4 4v4.6h4.6" {...common}/></>,
    close: <><path d="M5 5l14 14M19 5 5 19" {...common}/></>,
    send: <><path d="m3 11 17-8-6.5 18-2.2-7.3L3 11Z" {...common}/><path d="m11.3 13.7 3.2-3.2" {...common}/></>,
    pin: <><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" {...common}/><circle cx="12" cy="10" r="2" {...common}/></>,
    warning: <><path d="M12 3 2.8 20h18.4L12 3Z" {...common}/><path d="M12 9v5M12 17h.01" {...common}/></>,
    file: <><path d="M6 2h8l4 4v16H6V2Z" {...common}/><path d="M14 2v5h5M9 12h6M9 16h6" {...common}/></>,
    building: <><path d="M3 21h18M5 18V9h14v9M3 9l9-6 9 6H3ZM8 12v4M12 12v4M16 12v4" {...common}/></>,
    chevron: <><path d="m9 6 6 6-6 6" {...common}/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" {...common}/><path d="m3 12 9 5 9-5M3 16l9 5 9-5" {...common}/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" {...common}/><circle cx="12" cy="12" r="2.5" {...common}/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" {...common}/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" {...common}/></>,
  }
  return <svg {...props}>{paths[name] || paths.info}</svg>
}
