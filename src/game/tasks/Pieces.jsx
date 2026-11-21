// Task 2: put the pieces in place. Pieces come one at a time; pick the spot each one belongs in.
import { useRef, useState } from 'react'
import { DROP_KEYS, LEFT_KEYS, RIGHT_KEYS, useKeys, useTaskLoop } from './loop.js'

export const how = (spec) => (spec.kind === 'order' ? 'Drop each one on its number.' : 'Drop each piece on its match.')

// The stand-in pieces: plain shapes to match, or numbers to put in order. Each need gets its own pictures later.
const SHAPES = [
  <circle key="c" cx="20" cy="20" r="13" />,
  <rect key="s" x="8" y="8" width="24" height="24" rx="2" />,
  <path key="t" d="M20 6l15 27H5z" />,
  <path key="d" d="M20 4l14 16-14 16L6 20z" />,
  <path key="h" d="M7 9h26v9a13 13 0 0 1-26 0z" />,
]

function Mark({ kind, id, solid }) {
  if (kind === 'order') return <span className={`mark-num ${solid ? 'is-solid' : ''}`}>{id + 1}</span>
  return (
    <svg className={`mark ${solid ? 'is-solid' : ''}`} viewBox="0 0 40 40" aria-hidden="true">
      {SHAPES[id % SHAPES.length]}
    </svg>
  )
}

function shuffled(n) {
  const out = Array.from({ length: n }, (_, i) => i)
  do {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
  } while (out[0] === 0) // the first piece never belongs in the spot the cursor starts on
  return out
}

// spec: { count, kind: 'shapes' | 'order' }
export default function Pieces({ spec, onWin, setSay }) {
  const [queue] = useState(() => shuffled(spec.count)) // the order the pieces come up in
  const [at, setAt] = useState(0) // how many are in place
  const [cursor, setCursor] = useState(0) // the spot that is picked
  const [miss, setMiss] = useState({ spot: -1, n: 0 })
  const now = useRef({})
  now.current = { at, cursor }

  const open = (spot, placed) => !queue.slice(0, placed).includes(spot)
  const move = (dir) => {
    const { at: placed, cursor: c } = now.current
    for (let i = c + dir; i >= 0 && i < spec.count; i += dir) {
      if (open(i, placed)) return setCursor(i)
    }
  }
  const drop = (spot) => {
    const { at: placed } = now.current
    if (placed >= queue.length || !open(spot, placed)) return
    if (spot !== queue[placed]) {
      setCursor(spot)
      setMiss((m) => ({ spot, n: m.n + 1 }))
      return setSay('Not there. Try again.')
    }
    setSay('')
    setAt(placed + 1)
    now.current.at = placed + 1
    if (placed + 1 === queue.length) return onWin()
    for (let i = 0; i < spec.count; i++) {
      if (open(i, placed + 1)) return setCursor(i)
    }
  }

  useTaskLoop((dt, pad, taps) => {
    if (taps.left) move(-1)
    if (taps.right) move(1)
    if (taps.a) drop(now.current.cursor)
  })
  useKeys((key, e) => {
    if (LEFT_KEYS.includes(key)) move(-1)
    else if (RIGHT_KEYS.includes(key)) move(1)
    else if (DROP_KEYS.includes(key) && !e.repeat) drop(now.current.cursor)
    else return
    e.preventDefault()
  })

  const piece = queue[at]
  return (
    <div className="pieces">
      <div className="piece-now" data-id={piece ?? ''}>
        {piece != null && <Mark kind={spec.kind} id={piece} solid />}
      </div>
      <div className="spots">
        {queue.map((_, spot) => {
          const full = !open(spot, at)
          return (
            <button
              key={spot === miss.spot ? `${spot}-${miss.n}` : spot}
              type="button"
              data-id={spot}
              className={`spot ${full ? 'spot-full' : ''} ${cursor === spot && piece != null ? 'spot-cursor' : ''} ${spot === miss.spot && !full ? 'spot-miss' : ''}`}
              aria-label={`Spot ${spot + 1}${full ? ', done' : ''}`}
              onClick={() => drop(spot)}
            >
              <Mark kind={spec.kind} id={spot} solid={full} />
            </button>
          )
        })}
      </div>
      <p className="task-keys" aria-hidden="true">
        <span className="key key-stick-small">◀▶</span> pick <span className="key key-a">A</span> drop, or tap a spot
      </p>
    </div>
  )
}
