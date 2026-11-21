// Runs the house: builds it once from the tile map, then every frame moves Dreko, slides the camera and draws.
import * as THREE from 'three'
import { GMThree, GMTiles } from '../engine/index.js'
import { buildHouse, cutout, loadArt } from './art.js'
import { CAMERA, CLOCK, DREKO, GOLD, INK, PAPER, TILE, WALK } from './config.js'
import { KIDS, kidArt } from './family.js'
import { H, PROPS, ROWS, SMALL, W, placeName } from './house.js'
import { createInput } from './input.js'
import { ASK_DISTANCE } from './needs.js'
import { createWalker, poseOf, stepWalker } from './walk.js'

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
  // every kid gets the same walker as Dreko, only sized to their height and a touch quicker
  const kids = KIDS.map((k, i) => {
    const size = DREKO.height * k.tall
    const look = k.flip ? 'front-flip' : 'front'
    return {
      kid: k, size, at: k.spot.slice(), look,
      art: { front: cutout(img[kidArt(k)]), 'front-flip': cutout(img[kidArt(k)], true) },
      walker: createWalker({ height: size, quick: WALK.kidsQuick, floats: !!k.floats, look, offset: i * 370 }),
      pace: null,
    }
  })

  const dreko = { at: DREKO.start.slice(), path: null, len: 0, gone: 0, go: 0, face: 'front', flip: false, moving: false }
  const drekoWalk = createWalker({ height: DREKO.height })
  let walkTest = false
  // The morning: 'ready' until Dreko first moves, 'run' while the clock counts down, 'left' while the
  // "bus left" card is up. Then the morning starts over with everything he has learned still known.
  const clock = { phase: 'ready', loop: 1, total: CLOCK.firstLoop, left: CLOCK.firstLoop, card: 0, paused: false, told: -1 }
  const tellClock = (force) => {
    const tick = Math.ceil(clock.left * 10)
    if (!force && tick === clock.told) return
    clock.told = tick
    hooks.onClock?.({ phase: clock.phase, loop: clock.loop, total: clock.total, left: clock.left })
  }
  function busLeaves() {
    clock.left = 0
    clock.phase = 'left'
    clock.card = CLOCK.cardMs
    dreko.path = null
    tellClock(true)
  }
  function nextMorning() {
    clock.loop += 1
    // every kid who made the bus buys the next morning more time (no kid can board yet, so this is the same 30)
    clock.total = CLOCK.firstLoop
    clock.left = clock.total
    clock.phase = 'run'
    dreko.at = DREKO.start.slice()
    dreko.path = null
    dreko.face = 'front'
    dreko.flip = false
    cam.at = dreko.at.slice()
    tellClock(true)
  }
  // what Dreko has learned: a kid tells him their need the first time he walks up to them
  const known = {}
  const head = new THREE.Vector3()
  const lift = 1 / Math.cos((CAMERA.tilt * Math.PI) / 180) // the cut-outs are stretched by this to stand upright
  const points = kids.map(() => [0, 0, false])
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
    let [ix, iy] = input.read()
    if (clock.phase === 'left') {
      // the bus has gone: Dreko stands still while the card is up, then the morning starts over
      ix = 0
      iy = 0
      dreko.path = null
      clock.card -= dt
      if (clock.card <= 0) nextMorning()
    } else if (clock.phase === 'ready') {
      if (ix || iy || dreko.path) {
        clock.phase = 'run'
        tellClock(true)
      }
    } else if (!clock.paused) {
      clock.left -= dt / 1000
      if (clock.left <= 0) busLeaves()
      else tellClock()
    }
    const from = dreko.at
    let side = 0
    dreko.moving = false
    // he eases up to speed instead of snapping to it
    dreko.go = ix || iy || dreko.path ? Math.min(1, dreko.go + dt / WALK.easeMs) : 0
    if (ix || iy) {
      // the stick is read against the screen, then turned into tiles
      dreko.path = null
      side = ix / Math.hypot(ix, iy)
      const k = (DREKO.speed * dreko.go * dt) / 1000 / Math.SQRT2
      const dx = (ix - iy) * k
      const dy = (-ix - iy) * k
      let [x, y] = dreko.at
      if (free(x + dx, y)) x += dx
      if (free(x, y + dy)) y += dy
      if (x !== dreko.at[0] || y !== dreko.at[1]) dreko.moving = true
      faceAlong(dx, dy)
      dreko.at = [x, y]
    } else if (dreko.path) {
      // and he slows into the last third of a tile instead of stopping dead
      const left = (dreko.len - dreko.gone) / TILE
      const pace = dreko.go * Math.max(0.3, Math.min(1, left / 0.35))
      dreko.gone += (DREKO.speed * pace * dt * TILE) / 1000
      const f = Math.min(1, dreko.gone / dreko.len)
      const p = GMTiles.along(dreko.path, f)
      const next = [p[0] / TILE, p[1] / TILE]
      const dx = next[0] - dreko.at[0]
      const dy = next[1] - dreko.at[1]
      if (Math.hypot(dx, dy) > 1e-6) side = (dx - dy) / Math.SQRT2 / Math.hypot(dx, dy)
      faceAlong(dx, dy)
      dreko.at = next
      dreko.moving = true
      if (f >= 1) dreko.path = null
    }
    stepWalker(drekoWalk, dt, {
      moved: Math.hypot(dreko.at[0] - from[0], dreko.at[1] - from[1]),
      side,
      look: dreko.face + (dreko.flip ? '-flip' : ''),
    })
    for (const k of kids) stepKid(k, dt)
    for (const tap of input.taps()) hooks.onButton?.(tap)

    let learned = false
    for (const k of kids) {
      if (!known[k.kid.name] && Math.hypot(k.at[0] - dreko.at[0], k.at[1] - dreko.at[1]) < ASK_DISTANCE) {
        known[k.kid.name] = true
        learned = true
      }
    }
    if (learned) hooks.onKnown?.({ ...known })

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

  // Walk test: every kid paces left and right across the screen from their spot, so the shared walk can be seen
  // on all of them. It is a test, not the game: kids do not walk on their own yet.
  function paceFor(k) {
    const u = [Math.SQRT1_2, -Math.SQRT1_2] // screen right, in tiles
    const [hx, hy] = k.kid.spot
    const open = (x, y) => (Math.floor(x) === Math.floor(hx) && Math.floor(y) === Math.floor(hy)) || GMTiles.walkable(walk, Math.floor(x), Math.floor(y))
    const reach = (sign) => {
      let d = 0
      while (d < 1.2 && open(hx + u[0] * sign * (d + 0.35), hy + u[1] * sign * (d + 0.35))) d += 0.1
      return d
    }
    return { u, lo: -reach(-1), hi: reach(1), d: 0, dir: 1, wait: 300 + Math.random() * 500, go: 0 }
  }
  function stepKid(k, dt) {
    let moved = 0
    let side = 0
    if (walkTest) {
      const p = k.pace || (k.pace = paceFor(k))
      if (p.wait > 0) {
        p.wait -= dt
        p.go = 0
      } else if (p.hi - p.lo > 0.3) {
        p.go = Math.min(1, p.go + dt / WALK.easeMs)
        const end = p.dir > 0 ? p.hi : p.lo
        const left = Math.abs(end - p.d)
        const stepBy = Math.min(left, (WALK.kidSpeed * p.go * Math.max(0.3, Math.min(1, left / 0.3)) * dt) / 1000)
        p.d += stepBy * p.dir
        moved = stepBy
        side = p.dir
        k.look = p.dir > 0 ? 'front' : 'front-flip'
        if (left - stepBy < 0.01) {
          p.dir = -p.dir
          p.wait = 700
        }
      }
      k.at = [k.kid.spot[0] + p.u[0] * p.d, k.kid.spot[1] + p.u[1] * p.d]
    } else if (k.pace) {
      k.pace = null
      k.at = k.kid.spot.slice()
      k.look = k.kid.flip ? 'front-flip' : 'front'
    }
    stepWalker(k.walker, dt, { moved, side, look: k.look })
  }

  // one character on screen: the shared walk's pose laid over their picture
  const posed = (id, at, art, size, walker, floatAt, extra) => {
    const pose = poseOf(walker)
    return { id, at, img: art[pose.look], size, level: pose.up + floatAt, wide: pose.wide, h: pose.tall, roll: pose.roll, ...extra }
  }

  function draw(now) {
    const things = [
      ...still,
      ...kids.map((k) => posed(k.kid.name, k.at, k.art, k.size, k.walker, k.kid.floats ? 0.3 + 0.05 * Math.sin(now / 500) : 0)),
      posed('dreko', dreko.at, drekoArt, DREKO.height, drekoWalk, 0, { ghost: GOLD }),
    ]
    view.setThings(things)
    view.setMarks([
      ...kids.map(({ at, size: s }) => ({ at, h: 0, r: s * 0.16, color: INK, opacity: 0.16 })),
      { at: dreko.at, h: 0, r: 0.3, color: INK, opacity: 0.2 },
    ])
    const tall = size.h > size.w
    view.render({ mode: 'orbit', angle: CAMERA.angle, tilt: CAMERA.tilt, upTo: 1, at: [cam.at[0], cam.at[1], 0], dist: tall ? CAMERA.distTall : CAMERA.distWide })
    if (mapCanvas) drawMap()

    // where the top of each kid's head is on screen, for the bubbles
    if (hooks.onBubbles) {
      kids.forEach((k, i) => {
        const pose = poseOf(k.walker)
        const floatAt = k.kid.floats ? 0.3 + 0.05 * Math.sin(now / 500) : 0
        head.set(k.at[0], pose.up + floatAt + k.size * pose.tall * lift, k.at[1]).project(view.camera)
        points[i][0] = (head.x * 0.5 + 0.5) * size.w
        points[i][1] = (-head.y * 0.5 + 0.5) * size.h
        points[i][2] = head.z < 1 && Math.abs(head.x) < 1.1 && Math.abs(head.y) < 1.1
      })
      hooks.onBubbles(points)
    }
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
    // a tap on a wall, a table or a kid: stop on the nearest floor tile instead of walking into it
    if (path && !GMTiles.walkable(walk, Math.floor(hit.x), Math.floor(hit.y))) path.pop()
    if (path && path.length > 1) {
      dreko.path = path
      dreko.len = GMTiles.pathLength(path)
      dreko.gone = 0
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
    setWalkTest(on) { walkTest = !!on },
    setPaused(on) { clock.paused = !!on },
    // for tests and for the next systems (needs, clock): where things are right now
    state: () => ({ dreko: dreko.at.slice(), place, moving: dreko.moving, known: Object.keys(known), clock: { phase: clock.phase, loop: clock.loop, left: clock.left } }),
    stop() {
      stopped = true
      input.stop()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      view.renderer.dispose()
    },
  }
}
