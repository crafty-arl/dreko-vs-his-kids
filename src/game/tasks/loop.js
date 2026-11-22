// What every mini task shares under the hood: one frame loop, and the controller read the same way.
import { useEffect, useRef } from 'react'
import { pads, readPad as padOf } from '../pad.js'

const NAMES = ['a', 'rt', 'lb', 'rb', 'left', 'right', 'up', 'down']

// The controller right now. a, rt, lb, rb, left, right, up, down are true or false (left to down are the D-pad
// or a firm push of the stick). x and y are the stick or D-pad as a push from -1 to 1, y down.
function readPad() {
  const s = { a: false, rt: false, lb: false, rb: false, left: false, right: false, up: false, down: false, x: 0, y: 0 }
  for (const p of pads()) {
    const pad = padOf(p)
    s.x += pad.sx + pad.dx
    s.y += pad.sy + pad.dy
    s.a ||= pad.a
    s.rt ||= pad.rt
    s.lb ||= pad.lb
    s.rb ||= pad.rb
    s.left ||= pad.dx < 0 || pad.sx < -0.6
    s.right ||= pad.dx > 0 || pad.sx > 0.6
    s.up ||= pad.dy < 0 || pad.sy < -0.6
    s.down ||= pad.dy > 0 || pad.sy > 0.6
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
