// Runs the house: builds it once from the tile map, then every frame moves Dreko, slides the camera and draws.
import * as THREE from 'three'
import { GMThree, GMTiles } from '../engine/index.js'
import { buildHouse, card, cutout, loadArt } from './art.js'
import { BUS, CAMERA, CLOCK, DREKO, GOLD, INK, PAPER, ROAM, TILE, WALK, WEEK } from './config.js'
import { KIDS, kidArt } from './family.js'
import { H, PLACES, PROPS, ROAD_Y, ROWS, SMALL, SPOTS, W, floorTiles, placeName } from './house.js'
import { createInput } from './input.js'
import { ASK_DISTANCE, MOVES, MOVE_NAMES, NEEDS, ROOM_OF, dealDay } from './needs.js'
import { createWalker, poseOf, stepWalker } from './walk.js'

// The walk grid: walls and furniture are solid, and so is every tile in `spots` (where a kid stands waiting in a
// room right now). A kid who has left for the bus no longer blocks the way.
function walkGrid(spots = []) {
  const rows = ROWS.map((r, y) => (y >= ROAD_Y ? r.replace(/./g, '#') : r).split('')) // the road is for the bus
  for (const p of PROPS) rows[p.at[1]][p.at[0]] = '#'
  for (const s of spots) rows[Math.floor(s[1])][Math.floor(s[0])] = '#'
  return { x0: 0, y0: 0, t: TILE, rows: rows.map((r) => r.join('')) }
}

// Where each kid waits for the bus: a line along the pavement, in the order of the family list.
const stopSpot = (i) => [2.5 + i, 13.6]
const roomName = (needId) => PLACES[ROOM_OF[needId]].name
const mixed = (list) => {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
// Give every need of the day its own standing spot in its room: { kidName: [spot, ...] }, in step with the deal.
function placeDay(deal) {
  const open = Object.fromEntries(Object.entries(SPOTS).map(([room, list]) => [room, mixed(list)]))
  return Object.fromEntries(Object.entries(deal).map(([name, ids]) => [name, ids.map((id) => open[ROOM_OF[id]].pop())]))
}

export async function startGame(canvas, hooks = {}) {
  const img = await loadArt()
  const view = GMThree.create(THREE, canvas, { smooth: true, upright: true })
  view.build(buildHouse(img, INK))
  let walk = walkGrid()
  const openGrid = walkGrid() // the house with no kids in the way, for a kid finding the way to the bus
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
      // `spot` is where they wait now (the room of the need they have). `solid` is false for a moment when
      // they arrive on the tile Dreko is standing on, so he is never walled in.
      spot: k.spot.slice(), solid: true, wait: 0,
      // `roam` is true on the days a kid walks around instead of standing still; `rest` is the pause between walks
      roam: false, rest: 0,
      art: { front: cutout(img[kidArt(k)]), 'front-flip': cutout(img[kidArt(k)], true) },
      walker: createWalker({ height: size, quick: WALK.kidsQuick, floats: !!k.floats, look, offset: i * 370 }),
      pace: null,
      // 'home' waiting in a room, 'walking' to the bus stop once a need is met, 'forgot' at the stop when one
      // more need comes to mind, 'back' on the way to the room of that need, 'stop' when they wait for the bus
      state: 'home', path: null, len: 0, gone: 0, go: 0, slot: i,
    }
  })

  // the bus, its driver and Mom: three cards, real pictures when they exist and grey stand-ins until then
  const [busImg, busWide] = card(img.bus)
  const [driverImg, driverWide] = card(img.driver)
  const [momImg, momWide] = card(img.mom)
  // `x` is where the bus is along the road and `to` where it is heading. `scene` is the part of the bus scene
  // that is playing once the morning is over: 'in' (it pulls up), 'board' (kids get on one by one), 'nod'
  // (the driver nods, only when all ten are on) and 'out' (it drives off). `line` is who is still to get on.
  const bus = { x: BUS.from, to: BUS.from, scene: null, t: 0, line: [] }
  const dreko = { at: DREKO.start.slice(), path: null, len: 0, gone: 0, go: 0, face: 'front', flip: false, moving: false }
  const drekoWalk = createWalker({ height: DREKO.height })
  let walkTest = false
  // The morning: 'ready' until Dreko first moves, 'run' while the clock counts down, 'left' while the
  // "bus left" card is up. Then the same day starts over with everything he has learned still known.
  // The week: `day` counts from 0 (Monday). A day repeats until all ten board ('dayWon'), then the next day
  // starts with more needs. `loop` is the try within the day. After Friday the week is 'won'.
  const clock = { phase: 'ready', day: 0, loop: 1, total: CLOCK.firstLoop, left: CLOCK.firstLoop, card: 0, paused: false, told: -1, boarded: 0, earned: 0 }
  const names = KIDS.map((k) => k.name)
  const copy = (map) => Object.fromEntries(Object.entries(map).map(([name, list]) => [name, list.slice()]))
  // who needs what today: `deal` is the day's full hand, `needs` is what is still left to do this try
  let deal = dealDay(names, WEEK.needs[0])
  let needs = copy(deal)
  let spots = placeDay(deal) // where each of those needs is waited for
  const tellNeeds = () => hooks.onNeeds?.(copy(needs))
  tellNeeds()
  const doneOf = (name) => deal[name].length - needs[name].length // how many of today's needs a kid has had done
  const spotOf = (k) => (spots[k.kid.name][doneOf(k.kid.name)] ?? k.kid.spot).slice()
  const onTile = (s) => Math.abs(dreko.at[0] - Math.floor(s[0]) - 0.5) < 0.5 + DREKO.radius && Math.abs(dreko.at[1] - Math.floor(s[1]) - 0.5) < 0.5 + DREKO.radius
  // the kids waiting in rooms are solid: Dreko walks round them
  const fence = () => { walk = walkGrid(kids.filter((k) => k.state === 'home' && k.solid).map((k) => k.spot)) }
  // stand a kid in the room of the need they have now
  function stand(k) {
    k.state = 'home'
    k.path = null
    k.pace = null
    k.wait = 0
    k.spot = spotOf(k)
    k.at = k.spot.slice()
    k.look = k.kid.flip ? 'front-flip' : 'front'
    // late in the week a kid walks around, so they are not a wall and Dreko has to catch them
    k.roam = clock.day >= ROAM.fromDay
    k.rest = ROAM.restMs[0] + Math.random() * (ROAM.restMs[1] - ROAM.restMs[0])
    k.solid = !k.roam && !onTile(k.spot)
  }
  // a kid Dreko can walk up to and help: waiting or walking around in a room, at the stop remembering one more
  // need, or on the way back in for it (Carl, Nov 21: he can interrupt a kid before they get to the room)
  const reachable = (k) => (k.state === 'home' || k.state === 'forgot' || k.state === 'back') && needs[k.kid.name].length > 0
  // a kid counts for the bus the moment their last need is done, not when they reach the stop (Carl, Nov 21)
  const counted = () => kids.filter((k) => !needs[k.kid.name].length).length
  for (const k of kids) stand(k)
  fence()
  // The rules log: one plain line every time a rule fires, stamped with the day, the try and the clock.
  const say = (text) => hooks.onEvent?.({ text, day: clock.day, loop: clock.loop, left: Math.max(0, clock.left) })
  const dayLine = () => {
    const all = Object.values(deal)
    const rooms = Object.keys(SPOTS).map((room) => `${PLACES[room].name} ${all.filter((l) => ROOM_OF[l[0]] === room).length}`).join(', ')
    return `${WEEK.days[clock.day]} starts: ${clock.total} seconds on the clock, ${all.reduce((n, l) => n + l.length, 0)} needs, ${all.filter((l) => l.length > 1).length} kids with two. The needs are dealt new, and every kid waits in the room of their first need: ${rooms}.${clock.day >= ROAM.fromDay ? ` From ${WEEK.days[ROAM.fromDay]} the kids walk around ${ROAM.where === 'house' ? 'the house' : 'their room'}, so Dreko has to catch them.` : ''}`
  }
  say(dayLine())
  let busy = false // true while a mini task is open: Dreko stands still, the clock keeps running
  let held = null // the kid that task is for: they stand still too
  let near = null
  const tellClock = (force) => {
    const tick = Math.ceil(clock.left * 10)
    if (!force && tick === clock.told) return
    clock.told = tick
    hooks.onClock?.({ phase: clock.phase, day: clock.day, loop: clock.loop, total: clock.total, left: clock.left, boarded: clock.boarded, earned: clock.earned, scene: !!bus.scene })
  }
  const tellReady = () => {
    const out = {}
    for (const k of kids) if (k.state !== 'home') out[k.kid.name] = k.state
    hooks.onReady?.(out)
  }
  // the bus takes every kid whose needs are all done, wherever they are on the way to the stop
  function busLeaves() {
    clock.boarded = counted()
    // every kid Dreko got ready buys the next try more time
    clock.earned = CLOCK.perKid * clock.boarded
    clock.left = 0
    say(`The bus left. ${clock.boarded} of ${kids.length} kids counted. Earned for the next try: ${clock.boarded} kids x ${CLOCK.perKid} seconds = ${clock.earned} seconds.`)
    clock.phase = 'left'
    clock.card = CLOCK.cardMs
    dreko.path = null
    busScene()
    tellClock(true)
  }
  // every kid counted: the day is won, and after Friday so is the week
  function allAboard() {
    clock.boarded = kids.length
    clock.phase = clock.day === WEEK.days.length - 1 ? 'won' : 'dayWon'
    say(`All ten are counted with ${clock.left.toFixed(1)} seconds to spare. ${WEEK.days[clock.day]} is done${clock.phase === 'won' ? ', and so is the week' : `. Next is ${WEEK.days[clock.day + 1]}`}.`)
    clock.card = CLOCK.dayCardMs
    dreko.path = null
    busScene()
    tellClock(true)
  }
  // The morning is over: the bus scene starts. Every counted kid is at the stop for it (one who was still on
  // the walk there is put in their place), the bus pulls up if it has not yet, and the kids get on.
  function busScene() {
    for (const k of kids) {
      if (!needs[k.kid.name].length && k.state !== 'stop') {
        k.at = stopSpot(k.slot)
        k.state = 'stop'
        k.path = null
        k.look = 'front'
      }
    }
    fence()
    tellReady()
    bus.to = BUS.at[0]
    bus.scene = 'in'
  }
  function stepBus(dt) {
    // it drives along the road, and slows into its stop
    const gap = bus.to - bus.x
    if (Math.abs(gap) > 1e-3) {
      const pace = bus.to === BUS.at[0] ? Math.max(0.12, Math.min(1, Math.abs(gap) / 3)) : Math.min(1, 0.25 + Math.abs(bus.x - BUS.at[0]) / 3)
      const by = (BUS.speed * pace * dt) / 1000
      bus.x = Math.abs(gap) <= by ? bus.to : bus.x + Math.sign(gap) * by
    }
    if (!bus.scene) return
    if (bus.scene === 'in') {
      if (bus.x !== BUS.at[0]) return
      bus.line = kids.filter((k) => k.state === 'stop')
      bus.scene = 'board'
      bus.t = BUS.boardMs
    } else if (bus.scene === 'board') {
      bus.t -= dt
      if (bus.t > 0) return
      bus.t = BUS.boardMs
      const k = bus.line.shift()
      if (k) {
        k.state = 'aboard'
        tellReady()
        return
      }
      say(`${clock.boarded} ${clock.boarded === 1 ? 'kid gets' : 'kids get'} on the bus, one by one.`)
      if (clock.phase === 'left') return driveOff()
      bus.scene = 'nod'
      bus.t = BUS.nodMs
      say('All ten are on. The driver gives Dreko a nod.')
    } else if (bus.scene === 'nod') {
      bus.t -= dt
      if (bus.t <= 0) driveOff()
    } else if (bus.scene === 'out' && bus.x === bus.to) {
      // gone: now the card comes up
      bus.scene = null
      tellClock(true)
    }
  }
  function driveOff() {
    bus.scene = 'out'
    bus.to = BUS.to
    say('The bus drives off.')
  }
  // kind: 'retry' the same day again, 'day' the next day, 'fresh' a new week from Monday
  function nextMorning(kind = 'retry') {
    if (kind === 'fresh') clock.day = 0
    if (kind === 'day') clock.day += 1
    clock.loop = kind === 'retry' ? clock.loop + 1 : 1
    clock.total = CLOCK.firstLoop + (kind === 'retry' ? clock.earned : 0)
    clock.left = clock.total
    clock.phase = kind === 'fresh' ? 'ready' : 'run'
    clock.boarded = 0
    clock.earned = 0
    if (kind !== 'retry') {
      // a new day: new needs, and more of them
      for (const name in known) delete known[name]
      deal = dealDay(names, WEEK.needs[clock.day])
      spots = placeDay(deal)
    }
    needs = copy(deal)
    tellNeeds()
    bus.x = BUS.from
    bus.to = BUS.from
    bus.scene = null
    dreko.at = DREKO.start.slice()
    dreko.path = null
    dreko.face = 'front'
    dreko.flip = false
    for (const k of kids) stand(k)
    fence()
    near = null
    hooks.onNear?.(null)
    tellKnown()
    tellReady()
    cam.at = dreko.at.slice()
    tellClock(true)
    if (kind === 'retry') {
      const n = Object.keys(known).length
      say(`${WEEK.days[clock.day]} starts over, try ${clock.loop}: ${CLOCK.firstLoop} + ${clock.total - CLOCK.firstLoop} earned = ${clock.total} seconds. Same needs in the same rooms. Dreko remembers what ${n} ${n === 1 ? 'kid needs' : 'kids need'}.`)
    } else say(dayLine())
  }
  // a kid whose need is done walks to their place at the bus stop, from wherever they are
  function sendToStop(k) {
    if (k.state === 'walking' || k.state === 'stop') return
    const to = stopSpot(k.slot)
    const path = GMTiles.findPath(openGrid, [k.at[0] * TILE, k.at[1] * TILE], [to[0] * TILE, to[1] * TILE])
    k.pace = null
    k.roam = false
    if (!path || path.length < 2 || GMTiles.pathLength(path) < 1) {
      // already standing there (caught at the stop)
      k.at = to
      reachStop(k)
    } else {
      k.state = 'walking'
      k.path = path
      k.len = GMTiles.pathLength(path)
      k.gone = 0
      k.go = 0
    }
    fence()
    tellReady()
  }
  // a kid gets to the bus stop: either they wait for the bus, or one more need comes to mind
  function reachStop(k) {
    const name = k.kid.name
    k.path = null
    k.look = 'front'
    if (needs[name].length) {
      // "Oh wait, I forgot something!": not counted for the bus yet
      k.state = 'forgot'
      k.wait = CLOCK.forgotMs
      tellReady()
      say(`${name} reaches the bus stop and says "Oh wait, I forgot something!" One more need: ${NEEDS[needs[name][0]]}, in the ${roomName(needs[name][0])}. ${name} does not count for the bus yet.`)
    } else {
      k.state = 'stop'
      tellReady()
      say(`${name} is at the bus stop.`)
    }
  }
  // at the bus stop a kid remembers one more need, and turns back for the room it is in
  function sendBack(k) {
    const name = k.kid.name
    k.spot = spotOf(k)
    const path = GMTiles.findPath(openGrid, [k.at[0] * TILE, k.at[1] * TILE], [k.spot[0] * TILE, k.spot[1] * TILE])
    if (!path || path.length < 2) return arrive(k)
    k.state = 'back'
    k.path = path
    k.len = GMTiles.pathLength(path)
    k.gone = 0
    k.go = 0
    tellReady()
    say(`${name} turns back from the bus stop and heads for the ${roomName(needs[name][0])}.`)
  }
  // back in the house, in a new room, waiting for Dreko again
  function arrive(k) {
    const name = k.kid.name
    stand(k)
    fence()
    tellReady()
    say(`${name} is waiting in the ${roomName(needs[name][0])}${(known[name] ?? 0) > doneOf(name) ? `. Dreko remembers what for: ${NEEDS[needs[name][0]]}` : '. Dreko has to walk up to find out what for'}.`)
  }
  // What Dreko has learned: a kid tells him a need the first time he walks up to them while they have it.
  // `known` counts, per kid, how many of today's needs he has been told; it is kept when the day starts over.
  const known = {}
  // the overlay gets, per kid, how many of the needs still to do he knows
  const tellKnown = () => hooks.onKnown?.(Object.fromEntries(Object.keys(known).map((name) => [name, Math.max(0, known[name] - doneOf(name))])))
  const head = new THREE.Vector3()
  const lift = 1 / Math.cos((CAMERA.tilt * Math.PI) / 180) // the cut-outs are stretched by this to stand upright
  const points = kids.map(() => [0, 0, false, false])
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
    if (busy || clock.phase === 'won') {
      ix = 0
      iy = 0
      dreko.path = null
    }
    if (clock.phase === 'left' || clock.phase === 'dayWon') {
      // the bus has gone: Dreko stands still while the card is up, then the same day starts over,
      // or the next day starts if everyone made it
      ix = 0
      iy = 0
      dreko.path = null
      if (!bus.scene) clock.card -= dt // the card waits for the bus to drive off
      if (clock.card <= 0) nextMorning(clock.phase === 'left' ? 'retry' : 'day')
    } else if (clock.phase === 'ready') {
      if (ix || iy || dreko.path) {
        clock.phase = 'run'
        tellClock(true)
        say('Dreko moved, so the bus clock starts.')
      }
    } else if (clock.phase === 'run' && !clock.paused) {
      clock.left -= dt / 1000
      // a kid with nothing left to do heads for the bus on their own
      for (const k of kids) if (k.state === 'home' && !needs[k.kid.name].length) sendToStop(k)
      // the bus pulls up for the last seconds
      if (clock.left <= BUS.comeAt && bus.to !== BUS.at[0]) {
        bus.to = BUS.at[0]
        say(`${BUS.comeAt} seconds left: the bus pulls up at the stop.`)
      }
      if (counted() === kids.length) allAboard()
      else if (clock.left <= 0) busLeaves()
      else tellClock()
    }
    stepBus(dt)
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

    // a kid who arrived on Dreko's tile turns solid once he has stepped off it
    let fenced = false
    for (const k of kids) {
      if (k.state === 'home' && !k.roam && !k.solid && !onTile(k.spot)) {
        k.solid = true
        fenced = true
      }
    }
    if (fenced) fence()

    let learned = false
    for (const k of kids) {
      const name = k.kid.name
      if (reachable(k) && (known[name] ?? 0) <= doneOf(name) && Math.hypot(k.at[0] - dreko.at[0], k.at[1] - dreko.at[1]) < ASK_DISTANCE) {
        known[name] = doneOf(name) + 1
        learned = true
        say(k.state === 'home' ? `Dreko walked up to ${name} in the ${roomName(needs[name][0])}, who tells him: ${NEEDS[needs[name][0]]}.` : `Dreko caught ${name} ${k.state === 'forgot' ? 'at the bus stop' : `on the way back to the ${roomName(needs[name][0])}`}, who tells him: ${NEEDS[needs[name][0]]}.`)
      }
    }
    if (learned) tellKnown()

    // the kid Dreko can help right now: the nearest one within reach who still needs something
    let who = null
    let best = ASK_DISTANCE
    if (clock.phase === 'run' || clock.phase === 'ready') {
      for (const k of kids) {
        const d = Math.hypot(k.at[0] - dreko.at[0], k.at[1] - dreko.at[1])
        if (reachable(k) && d < best) {
          best = d
          who = k.kid.name
        }
      }
    }
    if (who !== near) {
      near = who
      hooks.onNear?.(near)
    }

    // the camera slides after him and never leaves the map
    const ease = 1 - Math.exp(-dt / 220)
    // once the morning is over it looks at the bus stop instead
    const look = clock.phase === 'left' || clock.phase === 'dayWon' || clock.phase === 'won' ? BUS.cam : dreko.at
    const tx = Math.max(2.5, Math.min(W - 2.5, look[0]))
    const ty = Math.max(2.5, Math.min(H - 2.5, look[1]))
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
    const [hx, hy] = k.spot
    const open = (x, y) => (Math.floor(x) === Math.floor(hx) && Math.floor(y) === Math.floor(hy)) || GMTiles.walkable(walk, Math.floor(x), Math.floor(y))
    const reach = (sign) => {
      let d = 0
      while (d < 1.2 && open(hx + u[0] * sign * (d + 0.35), hy + u[1] * sign * (d + 0.35))) d += 0.1
      return d
    }
    return { u, lo: -reach(-1), hi: reach(1), d: 0, dir: 1, wait: 300 + Math.random() * 500, go: 0 }
  }
  // one step along a kid's path at `speed` tiles a second, on the shared walk: [moved, side, arrived]
  function advance(k, dt, speed) {
    k.go = Math.min(1, k.go + dt / WALK.easeMs)
    const left = (k.len - k.gone) / TILE
    k.gone += (speed * k.go * Math.max(0.3, Math.min(1, left / 0.3)) * dt * TILE) / 1000
    const f = Math.min(1, k.gone / k.len)
    const p = GMTiles.along(k.path, f)
    const next = [p[0] / TILE, p[1] / TILE]
    const dx = next[0] - k.at[0]
    const dy = next[1] - k.at[1]
    const moved = Math.hypot(dx, dy)
    let side = 0
    if (moved > 1e-6) {
      side = (dx - dy) / Math.SQRT2 / moved
      if (Math.abs(dx - dy) > 1e-4) k.look = dx - dy < 0 ? 'front-flip' : 'front'
    }
    k.at = next
    return [moved, side, f >= 1]
  }
  function stepKid(k, dt) {
    let moved = 0
    let side = 0
    let arrived = false
    const name = k.kid.name
    if (name === held) {
      // Dreko is helping them: they stand still, wherever he caught them
    } else if (k.state === 'walking' || k.state === 'back') {
      // off to the bus stop, or back to a room
      ;[moved, side, arrived] = advance(k, dt, WALK.kidSpeed)
      if (arrived) {
        k.path = null
        if (k.state === 'back') arrive(k)
        else reachStop(k)
      }
    } else if (k.state === 'forgot') {
      // a beat at the stop, then back into the house
      if (clock.phase === 'run') k.wait -= dt
      if (k.wait <= 0) sendBack(k)
    } else if (k.state === 'stop') {
      // waiting for the bus
    } else if (k.roam && !walkTest && needs[name].length && (clock.phase === 'run' || clock.phase === 'ready')) {
      // walking around: a pause, then off to another tile of the room (or of the house)
      if (!k.path) {
        k.rest -= dt
        if (k.rest <= 0) {
          const tiles = floorTiles(ROAM.where === 'house' ? null : ROOM_OF[needs[name][0]])
          const [tx, ty] = tiles[Math.floor(Math.random() * tiles.length)]
          const path = GMTiles.findPath(openGrid, [k.at[0] * TILE, k.at[1] * TILE], [(tx + 0.5) * TILE, (ty + 0.55) * TILE])
          if (path && path.length > 1 && GMTiles.pathLength(path) > TILE / 2) {
            k.path = path
            k.len = GMTiles.pathLength(path)
            k.gone = 0
            k.go = 0
          } else k.rest = 200
        }
      } else {
        ;[moved, side, arrived] = advance(k, dt, ROAM.speed)
        if (arrived) {
          k.path = null
          k.rest = ROAM.restMs[0] + Math.random() * (ROAM.restMs[1] - ROAM.restMs[0])
        }
      }
      k.spot = k.at.slice()
    } else if (walkTest && k.state === 'home') {
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
      k.at = [k.spot[0] + p.u[0] * p.d, k.spot[1] + p.u[1] * p.d]
    } else if (k.pace) {
      k.pace = null
      k.at = k.spot.slice()
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
    const nod = bus.scene === 'nod' ? Math.sin((1 - bus.t / BUS.nodMs) * Math.PI * 2) ** 2 : 0
    const things = [
      ...still,
      ...kids.filter((k) => k.state !== 'aboard').map((k) => posed(k.kid.name, k.at, k.art, k.size, k.walker, k.kid.floats ? 0.3 + 0.05 * Math.sin(now / 500) : 0)),
      { id: 'mom', at: BUS.mom, level: 0, img: momImg, size: BUS.momSize, wide: momWide },
      { id: 'bus', at: [bus.x, BUS.at[1]], level: 0, img: busImg, size: BUS.size, wide: busWide },
      // the driver sits a hair in front of the bus picture, at its window; his nod is two dips of the head
      { id: 'driver', at: [bus.x + BUS.driver[0] * Math.SQRT1_2 + 0.04, BUS.at[1] - BUS.driver[0] * Math.SQRT1_2 + 0.04], level: BUS.driver[1] - 0.12 * nod, img: driverImg, size: BUS.driverSize, wide: driverWide, roll: -0.22 * nod },
      posed('dreko', dreko.at, drekoArt, DREKO.height, drekoWalk, 0, { ghost: GOLD }),
    ]
    view.setThings(things)
    view.setMarks([
      ...kids.filter((k) => k.state !== 'aboard').map(({ at, size: s }) => ({ at, h: 0, r: s * 0.16, color: INK, opacity: 0.16 })),
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
        points[i][2] = k.state !== 'aboard' && head.z < 1 && Math.abs(head.x) < 1.1 && Math.abs(head.y) < 1.1
        points[i][3] = k.state === 'forgot' // a kid saying "Oh wait" is shown even when the bus stop is off screen
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
    for (const k of kids) {
      g.fillStyle = k.state === 'home' ? '#8f5fd0' : '#2e8b57'
      g.beginPath(); g.arc(k.at[0] * s, k.at[1] * s, s * 0.32, 0, 7); g.fill()
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
    if (hit) walkTo(hit.x, hit.y)
  }
  function walkTo(x, y) {
    if (y >= ROAD_Y) y = ROAD_Y - 0.4 // a tap on the road: he walks to the kerb and no further
    const from = [dreko.at[0] * TILE, dreko.at[1] * TILE]
    let path = null
    if (GMTiles.walkable(walk, Math.floor(x), Math.floor(y))) path = GMTiles.findPath(walk, from, [x * TILE, y * TILE])
    else {
      // a tap on a wall, a table or a kid: walk to the floor tile beside it that is the shortest walk away
      // (a tile that shares a side first, so he ends up close enough to a kid to help them)
      for (const ring of [[[1, 0], [-1, 0], [0, 1], [0, -1]], [[1, 1], [1, -1], [-1, 1], [-1, -1]]]) {
        let best = Infinity
        for (const [dx, dy] of ring) {
          const tx = Math.floor(x) + dx
          const ty = Math.floor(y) + dy
          if (!GMTiles.walkable(walk, tx, ty)) continue
          const way = GMTiles.findPath(walk, from, [(tx + 0.5) * TILE, (ty + 0.5) * TILE])
          const len = way ? GMTiles.pathLength(way) : Infinity
          if (len < best) {
            best = len
            path = way
          }
        }
        if (path) break
      }
    }
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
    // a mini task opens for a kid (their name) or closes (null): Dreko and that kid stand still
    setBusy(name) {
      busy = !!name
      held = name || null
      const k = kids.find((x) => x.kid.name === held)
      if (k && k.state === 'back') say(`${held} stops on the way back to the ${roomName(needs[held][0])} while Dreko helps.`)
      if (k && k.state === 'home' && k.roam) say(`Dreko caught ${held} walking around. ${held} stands still while he helps.`)
    },
    // Dreko finished a kid's mini task: that need is done, and the kid heads for the bus. If they have one
    // more need today, it comes to mind at the bus stop.
    needMet(name) {
      const k = kids.find((x) => x.kid.name === name)
      if (!k || !reachable(k)) return
      const id = needs[name].shift()
      tellNeeds()
      tellKnown()
      say(`${name}: ${NEEDS[id]} done with ${MOVE_NAMES[MOVES[id].move]}. ${needs[name].length ? `${name} walks to the bus stop. Not remembered yet: ${NEEDS[needs[name][0]]}, in the ${roomName(needs[name][0])}.` : `Nothing left, so ${name} counts for the bus now: ${counted()} of ${kids.length}. ${name} walks to the stop.`}`)
      sendToStop(k)
    },
    playAgain() { nextMorning('fresh') },
    // for tests: clear a kid's needs and send them off, give kids needs by hand ({ kidName: needId or a list }),
    // and jump to a day (0 is Monday)
    markReady(name) {
      const k = kids.find((x) => x.kid.name === name)
      if (!k) return
      needs[name] = []
      tellNeeds()
      sendToStop(k)
    },
    walkTo, // for tests: the same as a tap on that spot of the floor, in tiles
    setNeeds(map) {
      for (const name in map) {
        deal[name] = [].concat(map[name])
        needs[name] = deal[name].slice()
      }
      spots = placeDay(deal)
      for (const k of kids) if (k.state === 'home') stand(k)
      fence()
      tellNeeds()
      tellKnown()
    },
    skipToDay(day) {
      clock.day = day - 1
      nextMorning('day')
    },
    // for tests and for the next systems (needs, clock): where things are right now
    state: () => ({ bus: { x: bus.x, scene: bus.scene }, dreko: dreko.at.slice(), place, moving: dreko.moving, known: Object.keys(known), told: { ...known }, rooms: Object.fromEntries(kids.map((k) => [k.kid.name, needs[k.kid.name].length ? ROOM_OF[needs[k.kid.name][0]] : null])), spots: Object.fromEntries(kids.map((k) => [k.kid.name, k.spot.slice()])), plan: JSON.parse(JSON.stringify(spots)), deal: copy(deal), solid: kids.filter((k) => k.state === 'home' && k.solid).map((k) => k.kid.name), at: Object.fromEntries(kids.map((k) => [k.kid.name, k.at.slice()])), clock: { phase: clock.phase, day: clock.day, loop: clock.loop, left: clock.left, total: clock.total, boarded: clock.boarded, earned: clock.earned }, near, needs: copy(needs), kids: Object.fromEntries(kids.map((k) => [k.kid.name, k.state])) }),
    stop() {
      stopped = true
      input.stop()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      view.renderer.dispose()
    },
  }
}
