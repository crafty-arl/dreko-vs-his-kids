// Game controllers, read in one place. A browser keeps a controller hidden from a page until a button on it
// is pressed while the page is open, so "none seen" can also mean "not pressed yet".
// Most controllers come in the browser's "standard" layout, where button 0 is A and so on. One that does not
// (the browser does not know its layout) can be taught in Settings: press A, B, Y, LB and RB once, and what
// was pressed is kept on this device under that controller's name.
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

// A way to press something: { b: button number }, or { x: axis number, at: its value when pressed, rest: its
// value when let go } for a trigger or a D-pad that the controller sends as an axis.
const STANDARD = { a: { b: 0 }, b: { b: 1 }, y: { b: 3 }, lb: { b: 4 }, rb: { b: 5 }, rt: { b: 7 }, start: { b: 9 } }
export const LEARN = ['a', 'b', 'y', 'lb', 'rb'] // what Settings asks for, in this order
export const LEARN_NAMES = { a: 'A', b: 'B', y: 'Y', lb: 'LB', rb: 'RB' }
const KEY = 'dreko-pad-layouts-v1'
let learned = {}
try { learned = JSON.parse(window.localStorage.getItem(KEY)) || {} } catch { learned = {} }
const keep = () => {
  try { window.localStorage.setItem(KEY, JSON.stringify(learned)) } catch { /* it still holds for this visit */ }
}
export const hasLayout = (id) => !!learned[id]
export function saveLayout(id, layout) {
  learned[id] = layout
  keep()
}
export function clearLayout(id) {
  delete learned[id]
  keep()
}

const isDown = (p, way) => {
  if (!way) return false
  if (way.b != null) return !!p.buttons[way.b]?.pressed
  const v = p.axes[way.x]
  return v != null && Math.abs(v - way.at) < Math.min(0.25, Math.abs(way.at - way.rest) * 0.4)
}

// The D-pad: buttons 12 to 15 in the standard layout. A controller the browser does not know often sends it
// as one "hat" axis instead (axis 9 in Chrome: up is -1, then clockwise in steps of 2/7, and above 1 at rest).
function dpad(p) {
  const b = p.buttons
  let x = (b[15]?.pressed ? 1 : 0) - (b[14]?.pressed ? 1 : 0)
  let y = (b[13]?.pressed ? 1 : 0) - (b[12]?.pressed ? 1 : 0)
  const hat = p.mapping === 'standard' ? null : p.axes[9]
  if (hat != null && hat >= -1.05 && hat <= 1.05) {
    const way = Math.round((hat + 1) / (2 / 7)) % 8 // 0 up, 1 up-right, 2 right, ... 7 up-left
    x += [0, 1, 1, 1, 0, -1, -1, -1][way]
    y += [-1, -1, 0, 1, 1, 1, 0, -1][way]
  }
  return [Math.sign(x), Math.sign(y)]
}

// While Settings is learning a controller's buttons the game does not act on them
let learning = false
export const isLearning = () => learning

// One controller as the game uses it: a, b, y, lb, rb, rt, start are true or false. sx and sy are the left
// stick from -1 to 1 (y down), 0 inside the dead zone. dx and dy are the D-pad, each -1, 0 or 1 (y down).
export function readPad(p) {
  // a taught controller uses what it was taught; the rest stays standard, unless a taught button sits there
  const mine = learned[p.id]
  const layout = mine ? { ...Object.fromEntries(Object.entries(STANDARD).filter(([, way]) => !Object.values(mine).some((w) => sameWay(w, way)))), ...mine } : STANDARD
  const ax = p.axes[0] || 0
  const ay = p.axes[1] || 0
  const live = Math.hypot(ax, ay) > 0.25
  const [dx, dy] = dpad(p)
  const out = { sx: live ? ax : 0, sy: live ? ay : 0, dx, dy }
  for (const name in layout) out[name] = isDown(p, layout[name])
  return out
}

// For Settings: what is pressed right now that was not at `rest` ({ buttons, axes } as they are when let go),
// as a way to press, or null. The left stick (axes 0 and 1) is never taken for a button.
export function newPress(p, rest) {
  for (let i = 0; i < p.buttons.length; i++) if (p.buttons[i].pressed && !rest.buttons[i]) return { b: i }
  for (let i = 2; i < p.axes.length; i++) {
    const was = rest.axes[i] ?? 0
    if (Math.abs(p.axes[i] - was) > 0.6) return { x: i, at: p.axes[i] > was ? 1 : -1, rest: was }
  }
  return null
}
const sameWay = (a, b) => (a.b != null ? a.b === b.b : a.x === b.x && a.at === b.at)
const letGo = (p, rest) => p.buttons.every((b, i) => !b.pressed || rest.buttons[i]) && Array.from(p.axes).every((v, i) => i < 2 || Math.abs(v - (rest.axes[i] ?? 0)) < 0.3)

const RAW = { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'Back', 9: 'Start', 12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right' }

// Returns { can, seen, id, name, standard, taught, down, learn }.
// `down` is what the game sees pressed right now, by name; it is only kept fresh while `live` is true (the
// controller test in Settings), otherwise this looks twice a second.
// `learn` is null, or { at, total, name } while teach() is running: the player is asked for LEARN[at].
export function usePad(live = false) {
  const [pad, setPad] = useState({ can: typeof navigator.getGamepads === 'function', seen: false, id: '', name: '', standard: true, taught: false, down: [], learn: null })
  const [lesson, setLesson] = useState(null) // { at, layout, rest, wait }
  useEffect(() => {
    learning = !!lesson
    return () => { learning = false }
  }, [lesson])
  useEffect(() => {
    let alive = true
    let raf = 0
    let was = ''
    let now = lesson
    const look = () => {
      const p = pads()[0]
      let down = []
      if (p && now) {
        // learning: wait for everything to be let go, then take the next new press
        // buttons rest let go; an axis rests wherever it is when the lesson starts (a trigger can rest at -1)
        if (!now.rest) now.rest = { buttons: [], axes: Array.from(p.axes) }
        if (now.wait) {
          if (letGo(p, now.rest)) now.wait = false
        } else {
          const way = newPress(p, now.rest)
          if (way && !Object.values(now.layout).some((w) => sameWay(w, way))) {
            now.layout[LEARN[now.at]] = way
            now.at += 1
            now.wait = true
            if (now.at >= LEARN.length) {
              saveLayout(p.id, now.layout)
              now = null
              if (alive) setLesson(null)
            }
          }
        }
      } else if (p) {
        const r = readPad(p)
        const known = hasLayout(p.id) || p.mapping === 'standard'
        // a controller the game knows shows names; one it does not shows the browser's raw button numbers
        down = known
          ? [...Object.keys(STANDARD).filter((n) => r[n]).map((n) => n.toUpperCase().replace('START', 'Start')), ...p.buttons.map((b, i) => (b.pressed && !Object.values({ ...STANDARD, ...(learned[p.id] ?? {}) }).some((w) => w.b === i) && !(i >= 12 && i <= 15) ? (hasLayout(p.id) ? `Button ${i}` : RAW[i] ?? `Button ${i}`) : null)).filter(Boolean)]
          : p.buttons.map((b, i) => (b.pressed ? `Button ${i}` : null)).filter(Boolean)
        if (r.dy < 0) down.push('D-pad up')
        if (r.dy > 0) down.push('D-pad down')
        if (r.dx < 0) down.push('D-pad left')
        if (r.dx > 0) down.push('D-pad right')
        if (r.sy < 0) down.push('Stick up')
        if (r.sy > 0) down.push('Stick down')
        if (r.sx < 0) down.push('Stick left')
        if (r.sx > 0) down.push('Stick right')
      }
      const next = {
        can: typeof navigator.getGamepads === 'function',
        seen: !!p,
        id: p ? p.id : '',
        name: p ? padName(p.id) : '',
        standard: !p || p.mapping === 'standard',
        taught: !!p && hasLayout(p.id),
        down,
        learn: now ? { at: now.at, total: LEARN.length, name: LEARN_NAMES[LEARN[now.at]] } : null,
      }
      const key = JSON.stringify(next)
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
    const fast = live || !!lesson
    const timer = fast ? 0 : setInterval(look, 500)
    if (fast) raf = requestAnimationFrame(frame)
    window.addEventListener('gamepadconnected', look)
    window.addEventListener('gamepaddisconnected', look)
    return () => {
      alive = false
      clearInterval(timer)
      cancelAnimationFrame(raf)
      window.removeEventListener('gamepadconnected', look)
      window.removeEventListener('gamepaddisconnected', look)
    }
  }, [live, lesson])
  return {
    ...pad,
    teach: () => setLesson({ at: 0, layout: {}, rest: null, wait: true }),
    stopTeach: () => setLesson(null),
    forget: () => {
      if (pad.id) clearLayout(pad.id)
      setLesson(null)
      setPad((v) => ({ ...v, taught: false }))
    },
  }
}
