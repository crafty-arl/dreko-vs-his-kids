// Runs the house: builds it once from the tile map, then every frame moves Dreko, slides the camera and draws.
import * as THREE from 'three'
import { GMThree, GMTiles } from '../engine/index.js'
import { buildHouse, cutout, loadArt } from './art.js'
import { CAMERA, DREKO, GOLD, INK, PAPER, TILE } from './config.js'
import { KIDS, kidArt } from './family.js'
import { H, PROPS, ROWS, SMALL, W, placeName } from './house.js'
import { createInput } from './input.js'

// The walk grid: walls, furniture and waiting kids are solid.
function walkGrid() {
  const rows = ROWS.map((r) => r.split(''))
  for (const p of PROPS) rows[p.at[1]][p.at[0]] = '#'
  for (const k of KIDS) rows[Math.floor(k.spot[1])][Math.floor(k.spot[0])] = '#'
  return { x0: 0, y0: 0, t: TILE, rows: rows.map((r) => r.join('')) }
}

export async function startGame(canvas, hooks = {}) {
  const img = await loadArt()
  const view = GMThree.create(THREE, canvas, { smooth: true, upright: true })
  view.build(buildHouse(img, INK))
  const walk = walkGrid()
  const input = createInput()

  // cut-outs, made once
  const drekoArt = {
    front: cutout(img.dreko),
    'front-flip': cutout(img.dreko, true),
    back: cutout(img['dreko-back']),
    'back-flip': cutout(img['dreko-back'], true),
  }
  const still = [
    // furniture is drawn from its front corner, so its card stands a little toward the camera (south-east) of the tile's middle
    ...PROPS.map((p) => ({ id: p.id, at: [p.at[0] + 0.5 + p.front, p.at[1] + 0.5 + p.front], level: 0, img: cutout(img[p.img]), size: p.size })),
    ...SMALL.map((s) => ({ id: s.id, at: s.at, level: s.up, img: cutout(img[s.img]), size: s.size })),
  ]
  const kids = KIDS.map((k) => ({ kid: k, img: cutout(img[kidArt(k)], k.flip), size: DREKO.height * k.tall }))

  const dreko = { at: DREKO.start.slice(), path: null, len: 0, t: 0, face: 'front', flip: false, moving: false }
  const cam = { at: dreko.at.slice() }
  let size = { w: 1, h: 1 }
  let place = ''
  let stopped = false
  let last = 0
  let mapCanvas = null

  const free = (x, y) => {
    const r = DREKO.radius
    for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (!GMTiles.walkable(walk, Math.floor(x + dx), Math.floor(y + dy))) return false
    return true
  }
  // which drawing of Dreko fits a move of (dx, dy) tiles: the camera sits in the south-east, so on screen
  // right is +x -y and up is -x -y
  const faceAlong = (dx, dy) => {
    const sx = dx - dy
    const up = -dx - dy
    if (Math.abs(sx) + Math.abs(up) < 1e-4) return
    dreko.face = up > 0 ? 'back' : 'front'
    dreko.flip = sx < 0
  }

  function step(dt) {
    const [ix, iy] = input.read()
    dreko.moving = false
    if (ix || iy) {
      // the stick is read against the screen, then turned into tiles
      dreko.path = null
      const k = (DREKO.speed * dt) / 1000 / Math.SQRT2
      const dx = (ix - iy) * k
      const dy = (-ix - iy) * k
      let [x, y] = dreko.at
      if (free(x + dx, y)) x += dx
      if (free(x, y + dy)) y += dy
      if (x !== dreko.at[0] || y !== dreko.at[1]) dreko.moving = true
      faceAlong(dx, dy)
      dreko.at = [x, y]
    } else if (dreko.path) {
      dreko.t += dt
      const f = Math.min(1, ((dreko.t / 1000) * DREKO.speed * TILE) / dreko.len)
      const p = GMTiles.along(dreko.path, f)
      const next = [p[0] / TILE, p[1] / TILE]
      faceAlong(next[0] - dreko.at[0], next[1] - dreko.at[1])
      dreko.at = next
      dreko.moving = true
      if (f >= 1) dreko.path = null
    }
    // the camera slides after him and never leaves the map
    const ease = 1 - Math.exp(-dt / 220)
    const tx = Math.max(2.5, Math.min(W - 2.5, dreko.at[0]))
    const ty = Math.max(2.5, Math.min(H - 2.5, dreko.at[1]))
    cam.at = [cam.at[0] + (tx - cam.at[0]) * ease, cam.at[1] + (ty - cam.at[1]) * ease]

    const here = placeName(dreko.at[0], dreko.at[1])
    if (here !== place) {
      place = here
      hooks.onPlace?.(place)
    }
  }

  function draw(now) {
    const hop = dreko.moving ? 0.05 * Math.abs(Math.sin(now / 90)) : 0
    const things = [
      ...still,
      ...kids.map(({ kid, img: art, size: s }) => ({
        id: kid.name, at: kid.spot, img: art, size: s,
        level: kid.floats ? 0.3 + 0.05 * Math.sin(now / 500) : 0,
      })),
      { id: 'dreko', at: dreko.at, level: hop, img: drekoArt[dreko.face + (dreko.flip ? '-flip' : '')], size: DREKO.height, ghost: GOLD },
    ]
    view.setThings(things)
    view.setMarks([
      ...kids.map(({ kid, size: s }) => ({ at: kid.spot, h: 0, r: s * 0.16, color: INK, opacity: 0.16 })),
      { at: dreko.at, h: 0, r: 0.3, color: INK, opacity: 0.2 },
    ])
    const tall = size.h > size.w
    view.render({ mode: 'orbit', angle: CAMERA.angle, tilt: CAMERA.tilt, upTo: 1, at: [cam.at[0], cam.at[1], 0], dist: tall ? CAMERA.distTall : CAMERA.distWide })
    if (mapCanvas) drawMap()
  }

  // The data under the art: walls dark, doors gold, kids purple, Dreko gold with a ring.
  function drawMap() {
    const s = 10
    if (mapCanvas.width !== W * s) {
      mapCanvas.width = W * s
      mapCanvas.height = H * s
    }
    const g = mapCanvas.getContext('2d')
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const ch = ROWS[y][x]
        g.fillStyle = ch === '#' ? INK : ch === 'D' ? GOLD : PAPER
        g.fillRect(x * s, y * s, s, s)
        if (ch !== '#' && walk.rows[y][x] === '#') {
          g.fillStyle = 'rgba(7,7,7,.35)' // furniture or a waiting kid: solid, but not a wall
          g.fillRect(x * s, y * s, s, s)
        }
      }
    }
    g.strokeStyle = 'rgba(7,7,7,.12)'
    g.lineWidth = 1
    g.beginPath()
    for (let x = 0; x <= W; x++) { g.moveTo(x * s + 0.5, 0); g.lineTo(x * s + 0.5, H * s) }
    for (let y = 0; y <= H; y++) { g.moveTo(0, y * s + 0.5); g.lineTo(W * s, y * s + 0.5) }
    g.stroke()
    for (const k of KIDS) {
      g.fillStyle = '#8f5fd0'
      g.beginPath(); g.arc(k.spot[0] * s, k.spot[1] * s, s * 0.32, 0, 7); g.fill()
    }
    if (dreko.path) {
      g.strokeStyle = GOLD
      g.lineWidth = 2
      g.beginPath()
      dreko.path.forEach((p, i) => (i ? g.lineTo((p[0] / TILE) * s, (p[1] / TILE) * s) : g.moveTo((p[0] / TILE) * s, (p[1] / TILE) * s)))
      g.stroke()
    }
    g.fillStyle = GOLD
    g.strokeStyle = INK
    g.lineWidth = 1.5
    g.beginPath(); g.arc(dreko.at[0] * s, dreko.at[1] * s, s * 0.42, 0, 7); g.fill(); g.stroke()
  }

  function frame(now) {
    if (stopped) return
    const dt = Math.min(50, now - (last || now))
    last = now
    step(dt)
    draw(now)
    requestAnimationFrame(frame)
  }

  // a tap or a click: walk there by the shortest way round the walls
  let press = null
  const onDown = (e) => { press = { x: e.clientX, y: e.clientY } }
  const onUp = (e) => {
    if (!press) return
    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10
    press = null
    if (moved) return
    const r = canvas.getBoundingClientRect()
    const hit = view.pick(e.clientX - r.left, e.clientY - r.top)
    if (!hit) return
    const path = GMTiles.findPath(walk, [dreko.at[0] * TILE, dreko.at[1] * TILE], [hit.x * TILE, hit.y * TILE])
    if (path && path.length > 1) {
      dreko.path = path
      dreko.len = GMTiles.pathLength(path)
      dreko.t = 0
      hooks.onWalk?.()
    }
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)

  function resize(w, h) {
    size = { w, h }
    view.resize(w, h)
  }

  requestAnimationFrame(frame)

  return {
    resize,
    setMapCanvas(c) { mapCanvas = c },
    // for tests and for the next systems (needs, clock): where things are right now
    state: () => ({ dreko: dreko.at.slice(), place, moving: dreko.moving }),
    stop() {
      stopped = true
      input.stop()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      view.renderer.dispose()
    },
  }
}
