// What the browser says about game controllers. A browser keeps a controller hidden from a page until a
// button on it is pressed while the page is open, so "none seen" can also mean "not pressed yet".
import { useEffect, useState } from 'react'

// every controller the browser shows this page, or [] when it shows none (or does not allow the page to ask)
export function pads() {
  try {
    return navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : []
  } catch {
    return [] // the browser blocks controllers for this page (an embedded page can be blocked)
  }
}

export const padName = (id = '') => id.replace(/\s*\(.*$/, '').trim() || 'Controller'

const NAMES = { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'Back', 9: 'Start', 12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right' }

// Returns { can, seen, name, standard, down, stick }. `down` is what is pressed right now, by name, and is only
// kept fresh while `live` is true (the controller test in Settings); otherwise this looks twice a second.
export function usePad(live = false) {
  const [pad, setPad] = useState({ can: typeof navigator.getGamepads === 'function', seen: false, name: '', standard: true, down: [], stick: [0, 0] })
  useEffect(() => {
    let alive = true
    let raf = 0
    let was = ''
    const look = () => {
      const p = pads()[0]
      const down = p ? p.buttons.map((b, i) => (b.pressed ? NAMES[i] ?? `Button ${i}` : null)).filter(Boolean) : []
      const stick = p ? [Math.abs(p.axes[0] || 0) > 0.25 ? p.axes[0] : 0, Math.abs(p.axes[1] || 0) > 0.25 ? p.axes[1] : 0] : [0, 0]
      const next = { can: typeof navigator.getGamepads === 'function', seen: !!p, name: p ? padName(p.id) : '', standard: !p || p.mapping === 'standard', down, stick }
      const key = JSON.stringify([next.seen, next.name, next.standard, down, stick.map((v) => Math.round(v * 4))])
      if (key !== was && alive) {
        was = key
        setPad(next)
      }
    }
    const frame = () => {
      look()
      if (alive) raf = requestAnimationFrame(frame)
    }
    look()
    const timer = live ? 0 : setInterval(look, 500)
    if (live) raf = requestAnimationFrame(frame)
    window.addEventListener('gamepadconnected', look)
    window.addEventListener('gamepaddisconnected', look)
    return () => {
      alive = false
      clearInterval(timer)
      cancelAnimationFrame(raf)
      window.removeEventListener('gamepadconnected', look)
      window.removeEventListener('gamepaddisconnected', look)
    }
  }, [live])
  return pad
}
