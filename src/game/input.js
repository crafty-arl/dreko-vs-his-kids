// Reads the player: keyboard arrows or WASD, and a game controller's left stick or D-pad.
// Returns where they are pushing on the SCREEN: x is right, y is up, each from -1 to 1.

import { isLearning, pads, readPad } from './pad.js'

export function createInput(target = window) {
  const keys = new Set()
  const down = (e) => {
    if (e.key.startsWith('Arrow')) e.preventDefault()
    keys.add(e.key.toLowerCase())
  }
  const up = (e) => keys.delete(e.key.toLowerCase())
  const clear = () => keys.clear()
  target.addEventListener('keydown', down)
  target.addEventListener('keyup', up)
  target.addEventListener('blur', clear)

  const has = (...names) => names.some((n) => keys.has(n))

  function read() {
    let x = (has('arrowright', 'd') ? 1 : 0) - (has('arrowleft', 'a') ? 1 : 0)
    let y = (has('arrowup', 'w') ? 1 : 0) - (has('arrowdown', 's') ? 1 : 0)
    for (const p of pads()) {
      const pad = readPad(p)
      x += pad.sx + pad.dx
      y -= pad.sy + pad.dy
    }
    const len = Math.hypot(x, y)
    return len > 1 ? [x / len, y / len] : [x, y]
  }

  // Controller buttons that were pressed since the last call: 'a', 'b', 'y' or 'start', and 'up', 'down',
  // 'left' or 'right' for a press of the D-pad or a firm push of the stick (the menus use these).
  // Nothing comes out while Settings is learning a controller's buttons.
  const BUTTONS = ['a', 'b', 'y', 'start']
  const held = new Set()
  function taps() {
    const out = []
    const quiet = isLearning()
    for (const p of pads()) {
      const pad = readPad(p)
      const edge = (name, on) => {
        const id = p.index + ':' + name
        if (on && !held.has(id) && !quiet) out.push(name)
        if (on) held.add(id)
        else held.delete(id)
      }
      for (const name of BUTTONS) edge(name, pad[name])
      edge('up', pad.dy < 0 || pad.sy < -0.6)
      edge('down', pad.dy > 0 || pad.sy > 0.6)
      edge('left', pad.dx < 0 || pad.sx < -0.6)
      edge('right', pad.dx > 0 || pad.sx > 0.6)
    }
    return out
  }

  function stop() {
    target.removeEventListener('keydown', down)
    target.removeEventListener('keyup', up)
    target.removeEventListener('blur', clear)
  }

  return { read, taps, stop }
}
