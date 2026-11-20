// Reads the player: keyboard arrows or WASD, and a game controller's left stick or D-pad.
// Returns where they are pushing on the SCREEN: x is right, y is up, each from -1 to 1.

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
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    for (const pad of pads) {
      if (!pad) continue
      const dead = 0.25
      const ax = pad.axes[0] || 0
      const ay = pad.axes[1] || 0
      if (Math.hypot(ax, ay) > dead) {
        x += ax
        y -= ay
      }
      const b = pad.buttons
      x += (b[15]?.pressed ? 1 : 0) - (b[14]?.pressed ? 1 : 0)
      y += (b[12]?.pressed ? 1 : 0) - (b[13]?.pressed ? 1 : 0)
    }
    const len = Math.hypot(x, y)
    return len > 1 ? [x / len, y / len] : [x, y]
  }

  function stop() {
    target.removeEventListener('keydown', down)
    target.removeEventListener('keyup', up)
    target.removeEventListener('blur', clear)
  }

  return { read, stop }
}
