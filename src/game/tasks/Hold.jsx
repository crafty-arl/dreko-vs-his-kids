// Task 1: hold, and let go on the gold line. One button and good timing.
import { useEffect, useRef } from 'react'
import { DROP_KEYS, useKeys, useTaskLoop } from './loop.js'

export const how = () => 'Hold, and let go on the gold line.'

// spec: { fillMs, from, to }. The bar fills in fillMs; letting go between from and to (parts of the bar) wins.
export default function Hold({ spec, onWin, setSay }) {
  const fillRef = useRef(null)
  const holdRef = useRef(null)
  const s = useRef({ v: 0, holding: false, over: false, padHeld: false }).current

  const show = () => {
    if (fillRef.current) fillRef.current.style.width = `${Math.min(1, s.v) * 100}%`
  }
  const press = () => {
    if (s.over || s.holding) return
    s.holding = true
    s.v = 0
    setSay('')
    holdRef.current?.classList.add('is-held')
  }
  const miss = (text) => {
    s.holding = false
    s.v = 0
    show()
    setSay(text)
    holdRef.current?.classList.remove('is-held')
  }
  const release = () => {
    if (s.over || !s.holding) return
    if (s.v < spec.from) return miss('Too soon. Try again.')
    s.holding = false
    s.over = true
    holdRef.current?.classList.remove('is-held')
    onWin()
  }

  useTaskLoop((dt, pad) => {
    const held = pad.a || pad.rt
    if (held && !s.padHeld) press()
    if (!held && s.padHeld) release()
    s.padHeld = held
    if (s.holding) {
      s.v += dt / spec.fillMs
      if (s.v > spec.to) miss('Too far. Try again.')
      else show()
    }
  })

  useKeys(
    (key, e) => {
      if (!DROP_KEYS.includes(key)) return
      e.preventDefault()
      if (!e.repeat) press()
    },
    (key) => {
      if (DROP_KEYS.includes(key)) release()
    },
  )

  useEffect(() => {
    const hold = holdRef.current
    const down = (e) => {
      e.preventDefault()
      hold.setPointerCapture?.(e.pointerId)
      press()
    }
    hold.addEventListener('pointerdown', down)
    hold.addEventListener('pointerup', release)
    hold.addEventListener('pointercancel', release)
    hold.focus()
    return () => {
      hold.removeEventListener('pointerdown', down)
      hold.removeEventListener('pointerup', release)
      hold.removeEventListener('pointercancel', release)
    }
    // press and release only read refs, so the first ones stay good
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div className="meter" aria-hidden="true">
        <i ref={fillRef} />
        <b style={{ left: `${spec.from * 100}%`, width: `${(spec.to - spec.from) * 100}%` }} />
      </div>
      <button ref={holdRef} type="button" className="hold">
        <span className="key key-a">A</span>Hold
      </button>
    </>
  )
}
