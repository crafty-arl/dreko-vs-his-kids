// Task 4: left and right in order. Press the side that lights up, step by step.
import { useRef, useState } from 'react'
import { LEFT_KEYS, RIGHT_KEYS, useKeys, useTaskLoop } from './loop.js'

export const how = () => 'Press the side that lights up.'

// spec: { steps, mixed }. Plain is left, right, left, right. Mixed is random, never three of a side in a row.
function build(spec) {
  const out = []
  for (let i = 0; i < spec.steps; i++) {
    if (!spec.mixed) out.push(i % 2 ? 'R' : 'L')
    else if (i > 1 && out[i - 1] === out[i - 2]) out.push(out[i - 1] === 'L' ? 'R' : 'L')
    else out.push(Math.random() < 0.5 ? 'L' : 'R')
  }
  return out
}

export default function Sides({ spec, onWin, setSay }) {
  const [steps] = useState(() => build(spec))
  const [at, setAt] = useState(0)
  const [miss, setMiss] = useState(0)
  const now = useRef(0)
  now.current = at

  const press = (side) => {
    const i = now.current
    if (i >= steps.length) return
    if (side !== steps[i]) {
      setMiss((n) => n + 1)
      return setSay('Other side.')
    }
    setSay('')
    now.current = i + 1
    setAt(i + 1)
    if (i + 1 === steps.length) onWin()
  }

  useTaskLoop((dt, pad, taps) => {
    if (taps.lb || taps.left) press('L')
    if (taps.rb || taps.right) press('R')
  })
  useKeys((key, e) => {
    if (LEFT_KEYS.includes(key)) press('L')
    else if (RIGHT_KEYS.includes(key)) press('R')
    else return
    e.preventDefault()
  })

  return (
    <>
      <ol className="steps" data-at={at}>
        {steps.map((side, i) => (
          <li
            key={i === at ? `${i}-${miss}` : i}
            data-side={side}
            className={`step step-${side} ${i < at ? 'is-done' : ''} ${i === at ? 'step-now' : ''} ${i === at && miss ? 'step-miss' : ''}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={side === 'L' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} /></svg>
          </li>
        ))}
      </ol>
      <div className="sides">
        <button type="button" className="side" onPointerDown={(e) => { e.preventDefault(); press('L') }}>
          <span className="key key-wide">LB</span>Left
        </button>
        <button type="button" className="side" onPointerDown={(e) => { e.preventDefault(); press('R') }}>
          Right<span className="key key-wide">RB</span>
        </button>
      </div>
    </>
  )
}
