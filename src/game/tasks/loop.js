// What every mini task shares under the hood: one frame loop, and the controller read the same way.
import { useEffect, useRef } from 'react'

const NAMES = ['a', 'rt', 'lb', 'rb', 'left', 'right', 'up', 'down']

// The controller right now. a, rt, lb, rb, left, right, up, down are true or false (left to down are the D-pad
// or a firm push of the stick). x and y are the stick or D-pad as a push from -1 to 1, y down.
function readPad() {
  const s = { a: false, rt: false, lb: false, rb: false, left: false, right: false, up: false, down: false, x: 0, y: 0 }
  const pads = navigator.getGamepads ? navigator.getGamepads() : []
  for (const p of pads) {
    if (!p) continue
    const b = p.buttons
    const ax = p.axes[0] || 0
    const ay = p.axes[1] || 0
    const dx = (b[15]?.pressed ? 1 : 0) - (b[14]?.pressed ? 1 : 0)
    const dy = (b[13]?.pressed ? 1 : 0) - (b[12]?.pressed ? 1 : 0)
    if (Math.hypot(ax, ay) > 0.25) {
      s.x += ax
      s.y += ay
    }
    s.x += dx
    s.y += dy
    s.a ||= !!b[0]?.pressed
    s.rt ||= !!b[7]?.pressed
    s.lb ||= !!b[4]?.pressed
    s.rb ||= !!b[5]?.pressed
    s.left ||= dx < 0 || ax < -0.6
    s.right ||= dx > 0 || ax > 0.6
    s.up ||= dy < 0 || ay < -0.6
    s.down ||= dy > 0 || ay > 0.6
  }
  const len = Math.hypot(s.x, s.y)
  if (len > 1) {
    s.x /= len
    s.y /= len
  }
  return s
}

const REST = { a: false, rt: false, lb: false, rb: false, left: false, right: false, up: false, down: false, x: 0, y: 0 }

// Calls tick(dt, pad, taps) every frame while the task is open. dt is milliseconds. taps holds the same names
// as pad, true only on the frame a button goes down. The controller is ignored until everything has been let
// go once, so the press that opened the task does not count inside it.
export function useTaskLoop(tick) {
  const fn = useRef(tick)
  fn.current = tick
  useEffect(() => {
    let alive = true
    let raf = 0
    let last = 0
    let armed = false
    const was = {}
    const frame = (now) => {
      if (!alive) return
      const dt = Math.min(50, now - (last || now))
      last = now
      let pad = readPad()
      if (!NAMES.some((n) => pad[n])) armed = true
      if (!armed) pad = REST
      const taps = {}
      for (const n of NAMES) {
        taps[n] = pad[n] && !was[n]
        was[n] = pad[n]
      }
      fn.current(dt, pad, taps)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [])
}

// Keys: calls down(key, event) and up(key) with the key in lower case, while the task is open.
export function useKeys(down, up) {
  const fns = useRef({})
  fns.current = { down, up }
  useEffect(() => {
    const onDown = (e) => fns.current.down?.(e.key.toLowerCase(), e)
    const onUp = (e) => fns.current.up?.(e.key.toLowerCase(), e)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])
}

export const DROP_KEYS = [' ', 'enter', 'e']
export const LEFT_KEYS = ['arrowleft', 'a']
export const RIGHT_KEYS = ['arrowright', 'd']
