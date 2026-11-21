// A mini task: Dreko helps one kid with their need.
// There is ONE move so far, from the game map: hold, and let go on the line. Every need uses it for now, each
// with its own icon. It is a stand-in until the other moves (spin, rhythm, mash, trace) are built.
// The bus clock keeps running while this is open.
import { useEffect, useRef, useState } from 'react'
import { TASK } from './config.js'
import { Icon } from './Icon.jsx'
import { NEEDS } from './needs.js'

const HOLD_KEYS = [' ', 'enter', 'e']

export default function Task({ kid, onDone, onClose }) {
  const fillRef = useRef(null)
  const holdRef = useRef(null)
  // everything the frame loop needs lives here, so the meter moves without React drawing again
  const run = useRef({ v: 0, holding: false, over: false, padArmed: false, padHeld: false, last: 0 })
  const [said, setSaid] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const s = run.current
    let raf = 0
    let alive = true
    let finish = 0

    const show = () => {
      if (fillRef.current) fillRef.current.style.width = `${Math.min(1, s.v) * 100}%`
    }
    const press = () => {
      if (s.over || s.holding) return
      s.holding = true
      s.v = 0
      setSaid('')
      holdRef.current?.classList.add('is-held')
    }
    const miss = (text) => {
      s.holding = false
      s.v = 0
      show()
      setSaid(text)
      holdRef.current?.classList.remove('is-held')
    }
    const release = () => {
      if (s.over || !s.holding) return
      if (s.v < TASK.from) return miss('Too soon. Try again.')
      // on the line: the need is met
      s.holding = false
      s.over = true
      holdRef.current?.classList.remove('is-held')
      setDone(true)
      finish = setTimeout(() => alive && onDone(), TASK.doneMs)
    }

    const frame = (now) => {
      if (!alive) return
      const dt = Math.min(50, now - (s.last || now))
      s.last = now
      // a controller: A or the right trigger, and it has to be let go once first so the press that opened the
      // task does not count as the hold
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      let pad = false
      for (const p of pads) if (p && (p.buttons[0]?.pressed || p.buttons[7]?.pressed)) pad = true
      if (!pad) s.padArmed = true
      if (s.padArmed && pad && !s.padHeld) press()
      if (s.padArmed && !pad && s.padHeld) release()
      s.padHeld = s.padArmed && pad

      if (s.holding) {
        s.v += dt / TASK.fillMs
        if (s.v > TASK.to) miss('Too far. Try again.')
        else show()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const keyDown = (e) => {
      const key = e.key.toLowerCase()
      if (key === 'escape' || key === 'b') return onClose()
      if (!HOLD_KEYS.includes(key)) return
      e.preventDefault()
      if (!e.repeat) press()
    }
    const keyUp = (e) => {
      if (HOLD_KEYS.includes(e.key.toLowerCase())) release()
    }
    const hold = holdRef.current
    const down = (e) => {
      e.preventDefault()
      hold.setPointerCapture?.(e.pointerId)
      press()
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    hold.addEventListener('pointerdown', down)
    hold.addEventListener('pointerup', release)
    hold.addEventListener('pointercancel', release)
    hold.focus()

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      clearTimeout(finish)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      hold.removeEventListener('pointerdown', down)
      hold.removeEventListener('pointerup', release)
      hold.removeEventListener('pointercancel', release)
    }
  }, [onDone, onClose])

  return (
    <div className="list" role="dialog" aria-label={`Help ${kid.name}: ${NEEDS[kid.needId]}`}>
      <div className="panel panel-task">
        <h2>{NEEDS[kid.needId]} <small>{kid.name}</small></h2>
        <div className={`task-art ${done ? 'task-done' : ''}`}>
          <Icon name={done ? 'tick' : kid.needId} wash={done ? 'green' : 'need'} />
        </div>
        <div className="meter" aria-hidden="true">
          <i ref={fillRef} />
          <b style={{ left: `${TASK.from * 100}%`, width: `${(TASK.to - TASK.from) * 100}%` }} />
        </div>
        <p className="task-say" role="status">{done ? 'Done.' : said || 'Hold, and let go on the gold line.'}</p>
        <button ref={holdRef} type="button" className="hold" disabled={done}>
          <span className="key key-a">A</span>Hold
        </button>
        <button type="button" className="close task-close" onClick={onClose}>Back</button>
      </div>
    </div>
  )
}
