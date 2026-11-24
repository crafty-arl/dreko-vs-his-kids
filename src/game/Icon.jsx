// Every icon in the game, drawn once here as plain line shapes on a 32 by 32 grid.
// With UI.icons set to 'inked' each one gets a pen wobble and a soft wash of colour behind it.
import { UI } from './config.js'

const dot = { fill: 'currentColor', stroke: 'none' }

const SHAPES = {
  // the needs
  lunch: (<><path d="M6 11l2-3 2 3 2-3 2 3 2-3 2 3v16H6z" /><path d="M10 17h4" /><circle cx="24" cy="22" r="4.5" /><path d="M24 17.500c0-1.500 1-2.500 2-3" /></>),
  slip: (<><path d="M7 4h12l6 6v18H7z" /><path d="M19 4v6h6" /><path d="M11 15h10M11 19h6" /><path d="M11 24c2-3 3 2 5-1s2 1 5 0" /></>),
  braids: (<><circle cx="16" cy="4" r="2" {...dot} /><path d="M16 6c-6 3-6 5 0 8s6 5 0 8-6 4 0 7" /><path d="M16 6c6 3 6 5 0 8s-6 5 0 8 6 4 0 7" /><path d="M12 29h8" /></>),
  homework: (<><path d="M16 9c-4-3-8-3-12-1v17c4-2 8-2 12 1z" /><path d="M16 9c4-3 8-3 12-1v17c-4-2-8-2-12 1z" /><path d="M8 13c2-.600 3-.600 5 0M8 17c2-.600 3-.600 5 0M19 13c2-.600 3-.600 5 0" /></>),
  socks: (<><path d="M11 4h9v12l6 5.500a4.200 4.200 0 0 1-5.600 6.300L11 20z" /><path d="M11 9h9" /><path d="M4 14v6M4 24v.500" /></>),
  teeth: (<><path d="M10 6c3-2 4.500 0 6 0s3-2 6 0c3.500 2.300 2.500 7 1.500 10s-1 10-3 10-1.500-6.500-4.500-6.500S13.500 26 11.500 26s-2-7-3-10S6.500 8.300 10 6z" /><path d="M26 3v4M24 5h4" /></>),
  jacket: (<><path d="M12 4l4 4 4-4 8 5-2 7-3-1v13H9V15l-3 1-2-7z" /><path d="M16 8v20" /><path d="M19 19h2" /></>),
  show: (<><path d="M16 4l3.200 7.200 7.800.800-5.900 5.200 1.800 7.700L16 20.800 9.100 24.900l1.800-7.700L5 12l7.800-.800z" /><path d="M5 28h22" /></>),
  breakfast: (<><path d="M4 15h24a12 12 0 0 1-24 0z" /><path d="M20 15l6-11" /><circle cx="10" cy="11" r="1.400" {...dot} /><circle cx="14.500" cy="9" r="1.400" {...dot} /><circle cx="16" cy="12.500" r="1.400" {...dot} /></>),
  backpack: (<><path d="M8 14a8 8 0 0 1 16 0v12a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" /><path d="M13 6.500a3 3 0 0 1 6 0" /><path d="M11 19h10v6H11z" /><path d="M12 14h8" /></>),
  shoes: (<><path d="M4 24V11c2 1.500 5 1 6-1l5 6c4 1.500 9 1 12 5v3z" /><path d="M3 27.500h25" /><path d="M11.500 14l-2.500 2.200M14.500 17l-2.500 2.200" /></>),
  // the overlay
  ask: (<><path d="M11 11.500c0-3.300 2.200-5.500 5.200-5.500 2.900 0 4.900 1.900 4.900 4.500 0 2.200-1.200 3.400-2.700 4.400-1.500 1-2.200 1.900-2.200 3.600" strokeWidth="3.600" /><circle cx="15.200" cy="25" r="2.300" {...dot} /></>),
  clock: (<><circle cx="16" cy="18" r="10" /><path d="M16 12v6l4 3" /><path d="M7 6L4 9M25 6l3 3" /></>),
  bus: (<><path d="M4 9a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v14H4z" /><path d="M4 15h24M12 6v9M20 6v9" /><circle cx="10" cy="24" r="2.600" fill="currentColor" /><circle cx="22" cy="24" r="2.600" fill="currentColor" /></>),
  sweat: (<><path d="M16 4c5 7 8 10.500 8 15a8 8 0 0 1-16 0c0-4.500 3-8 8-15z" /><path d="M12.500 20a3.600 3.600 0 0 0 3 3.400" /></>),
  tick: (<path d="M6 17l6.500 6.500L26 9" strokeWidth="3.400" />),
  stick: (<><circle cx="16" cy="16" r="12" /><circle cx="16" cy="16" r="5" fill="currentColor" /></>),
  // the things from the market (painted on Nov 23; these line shapes are what the 'inked' and 'plain' looks use)
  skates: (<><path d="M9 4h8v9l7 2.500a4 4 0 0 1 3 3.800V21H9z" /><path d="M9 9h5M9 13h5" /><path d="M6 21h23" /><circle cx="11" cy="26" r="2.800" /><circle cx="24" cy="26" r="2.800" /></>),
  watch: (<><circle cx="16" cy="19" r="9.500" /><path d="M16 9.500V7" /><circle cx="16" cy="4.500" r="2.300" /><path d="M16 13.500V19l3.500 2.500" /><circle cx="16" cy="19" r="1" {...dot} /></>),
  whistle: (<><circle cx="12" cy="20" r="7.500" /><path d="M16 13.500h12v5.500h-8.500" /><circle cx="12" cy="20" r="2.200" {...dot} /><path d="M10 12.800V9" /><circle cx="10" cy="6.500" r="2.300" /></>),
  coin: (<><circle cx="16" cy="16" r="11.500" /><circle cx="16" cy="16" r="7.500" /><path d="M14 13.500l2.200-2v9M13.500 20.500h5" /></>),
  candy: (<><circle cx="16" cy="16" r="6.500" /><path d="M10 13.500L3.500 9.500v13L10 18.500" /><path d="M22 13.500l6.500-4v13L22 18.500" /><path d="M12.500 17.500c1-4 5.500-4.500 7-1" /></>),
}

// Painted icons (pen and watercolour pictures in public/art/icons/). List a name here once its picture is in;
// anything not listed falls back to the line shape above ('shoes' has no painted picture yet).
const PAINTED = ['lunch', 'slip', 'braids', 'homework', 'socks', 'teeth', 'jacket', 'show', 'breakfast', 'backpack', 'ask', 'clock', 'bus', 'sweat', 'tick', 'stick', 'skates', 'watch', 'whistle', 'coin', 'candy']

// wash: which colour sits behind an inked icon ('need', 'gold', 'red', 'green'), or nothing
export function Icon({ name, wash, className = '' }) {
  if (UI.icons === 'painted' && PAINTED.includes(name)) {
    return <img className={`icon icon-painted ${className}`} src={`${import.meta.env.BASE_URL}art/icons/${name}.webp`} alt="" />
  }
  const inked = UI.icons !== 'plain'
  return (
    <svg className={`icon ${className}`} viewBox="0 0 32 32" aria-hidden="true">
      {inked && wash && (
        <path className={`wash wash-${wash}`} d="M16 1.500c7.500-.800 13 4.600 13.500 12.500.500 8.400-5.200 15-13.300 15.600C8 30.200 2.300 24 2.500 15.800 2.700 8.300 8.200 2.300 16 1.500z" />
      )}
      <g className="line" filter={inked ? 'url(#ink)' : undefined}>{SHAPES[name]}</g>
    </svg>
  )
}

// The pen wobble every inked icon shares. Put this on the page once.
export function InkFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="ink" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  )
}
