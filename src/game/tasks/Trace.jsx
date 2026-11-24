// Task 3: trace the line. Move the pen from the first dot to the last, through every dot in order.
import { useEffect, useRef, useState } from 'react'
import { ANXIETY } from '../config.js'
import { useKeys, useTaskLoop } from './loop.js'

export const how = () => 'Follow the dotted line to the end.'

// The lines, on a 280 by 130 card. Stand-in shapes: each need gets its own line and picture later.
const LINES = {
  zigzag: [[30, 95], [80, 45], [130, 95], [180, 45], [230, 95], [258, 95]],
  straight: [[30, 65], [105, 65], [180, 65], [255, 65]],
}
const W = 280
const H = 130
const HIT = 12 // how close the pen has to pass a dot
const STRAY = 24 // how far off the line before the pen jumps back
const SPEED = 150 // the pen with keys or the stick, in card units a second
const CHASE = 420 // the pen chasing a finger

// how far point p is from the line between a and b
function off(p, a, b) {
  const vx = b[0] - a[0]
  const vy = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy)))
  return Math.hypot(p[0] - (a[0] + vx * t), p[1] - (a[1] + vy * t))
}

// spec: { line: 'zigzag' | 'straight' }. shake: 0 to 1, how much Dreko's hands shake: the pen wobbles around
// where the player holds it, so it strays off the line more easily.
export default function Trace({ spec, onWin, setSay, shake = 0 }) {
  const dots = LINES[spec.line] ?? LINES.straight
  const svgRef = useRef(null)
  const penRef = useRef(null)
  const inkRef = useRef(null)
  // `hand` is where the player holds the pen; `pen` is where its tip is, wobble and all
  const s = useRef({ hand: dots[0].slice(), pen: dots[0].slice(), next: 1, finger: null, keys: new Set(), over: false, shake: 0, t: 0 }).current
  s.shake = shake
  const [next, setNext] = useState(1) // the dot the pen is heading for

  const show = () => {
    penRef.current?.setAttribute('cx', s.pen[0].toFixed(1))
    penRef.current?.setAttribute('cy', s.pen[1].toFixed(1))
    inkRef.current?.setAttribute('points', [...dots.slice(0, s.next), s.pen].map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' '))
  }

  useTaskLoop((dt, pad) => {
    if (s.over) return
    // the wobble: a slow sway and a quick tremble laid over each other
    s.t += dt / 1000
    const reach = ANXIETY.wobble * s.shake
    const wob = [reach * (0.6 * Math.sin(s.t * 9) + 0.4 * Math.sin(s.t * 23.3)), reach * (0.6 * Math.cos(s.t * 11) + 0.4 * Math.sin(s.t * 19.7))]
    let vx = 0
    let vy = 0
    let speed = SPEED
    if (s.finger) {
      vx = s.finger[0] - s.hand[0]
      vy = s.finger[1] - s.hand[1]
      speed = CHASE
    } else {
      const k = s.keys
      vx = pad.x + (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0)
      vy = pad.y + (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0)
    }
    const len = Math.hypot(vx, vy)
    if (len < 0.01) {
      // standing still: the pen still trembles, but it cannot stray on its own
      s.pen = [s.hand[0] + wob[0], s.hand[1] + wob[1]]
      return show()
    }
    // a finger is followed right up to where it is; keys and the stick push at a steady speed
    const stepBy = s.finger ? Math.min(len, (speed * dt) / 1000) : (speed * Math.min(1, len) * dt) / 1000
    s.hand = [
      Math.max(0, Math.min(W, s.hand[0] + (vx / len) * stepBy)),
      Math.max(0, Math.min(H, s.hand[1] + (vy / len) * stepBy)),
    ]
    s.pen = [s.hand[0] + wob[0], s.hand[1] + wob[1]]
    if (off(s.pen, dots[s.next - 1], dots[s.next]) > STRAY) {
      s.hand = dots[s.next - 1].slice()
      s.pen = s.hand.slice()
      s.finger = null
      setSay('Off the line. Back to the last dot.')
    } else if (Math.hypot(s.pen[0] - dots[s.next][0], s.pen[1] - dots[s.next][1]) < HIT) {
      s.next += 1
      setNext(s.next)
      setSay('')
      if (s.next === dots.length) {
        s.over = true
        s.pen = dots[dots.length - 1].slice()
        show()
        return onWin()
      }
    }
    show()
  })

  useKeys(
    (key, e) => {
      if (!/^(arrow(up|down|left|right)|[wasd])$/.test(key)) return
      e.preventDefault()
      s.keys.add(key)
    },
    (key) => s.keys.delete(key),
  )

  useEffect(() => {
    const svg = svgRef.current
    const at = (e) => {
      const r = svg.getBoundingClientRect()
      return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
    }
    const down = (e) => {
      e.preventDefault()
      svg.setPointerCapture?.(e.pointerId)
      s.finger = at(e)
    }
    const move = (e) => {
      if (s.finger) s.finger = at(e)
    }
    const up = () => { s.finger = null }
    svg.addEventListener('pointerdown', down)
    svg.addEventListener('pointermove', move)
    svg.addEventListener('pointerup', up)
    svg.addEventListener('pointercancel', up)
    return () => {
      svg.removeEventListener('pointerdown', down)
      svg.removeEventListener('pointermove', move)
      svg.removeEventListener('pointerup', up)
      svg.removeEventListener('pointercancel', up)
    }
  }, [s])

  return (
    <>
      <svg ref={svgRef} className="trace" viewBox={`0 0 ${W} ${H}`} data-next={next} role="img" aria-label="A dotted line to follow">
        <polyline className="trace-line" points={dots.map((p) => p.join(',')).join(' ')} />
        <polyline ref={inkRef} className="trace-ink" points={dots[0].join(',')} />
        {dots.map((p, i) => (
          <circle key={i} className={`trace-dot ${i < next ? 'is-passed' : ''} ${i === next ? 'is-next' : ''}`} cx={p[0]} cy={p[1]} r={i === dots.length - 1 ? 9 : 6} />
        ))}
        <circle ref={penRef} className="trace-pen" cx={dots[0][0]} cy={dots[0][1]} r="8" />
      </svg>
      <p className="task-keys" aria-hidden="true">
        <span className="key key-stick-small">●</span> stick or arrows, or drag the pen
      </p>
    </>
  )
}
