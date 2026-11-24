// Runs the house: builds it once from the tile map, then every frame moves Dreko, slides the camera and draws.
import * as THREE from 'three'
import { GMThree, GMTiles } from '../engine/index.js'
import { buildHouse, card, cutout, loadArt } from './art.js'
import { ANXIETY, BUS, CAMERA, CLOCK, DOOR_HELP, DREKO, GOLD, INK, INTRO, MARKET, PAPER, ROAM, ROOM_VIEW, TILE, TUTOR, WALK, WEEK, WORLD } from './config.js'
import { KIDS, kidArt } from './family.js'
import { H, OUTSIDE, PLACES, PROPS, ROAD_Y, ROWS, SHEETS, SMALL, SOLID, SPOTS, W, floorTiles, placeName, zone } from './house.js'
import { createInput } from './input.js'
import { ASK_DISTANCE, MOVES, MOVE_NAMES, NEEDS, ROOM_OF, dealDay } from './needs.js'
import { createWalker, poseOf, stepWalker } from './walk.js'
import { dayAfter, levelOf } from './level.js'

// The walk grid: walls and furniture are solid, and so is every tile in `spots` (where a kid stands waiting in a
// room right now). A kid who has left for the bus no longer blocks the way.
function walkGrid(spots = []) {
  const rows = ROWS.map((r, y) => (y >= ROAD_Y ? r.replace(/./g, '#') : r).split('')) // the road is for the bus
  for (const [x, y] of SOLID) rows[y][x] = '#'
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
  const engine = GMThree.create(THREE, canvas, { smooth: true, upright: true })
  engine.build(buildHouse(img, INK))
  // The engine's map is WORLD.margin tiles bigger than the house on every side (the still world around the
  // home). The game keeps the house's own tile numbers: every place handed to the engine moves over by the
  // margin here, and a tap comes back in house numbers.
  const M = WORLD.margin
  const moved = (list) => list.map((t) => ({ ...t, at: [t.at[0] + M, t.at[1] + M] }))
  const view = {
    ...engine,
    setThings: (list) => engine.setThings(moved(list)),
    setMarks: (list) => engine.setMarks(moved(list)),
    render: (o) => engine.render({ ...o, at: [o.at[0] + M, o.at[1] + M, o.at[2]], sky: WORLD.sky }), // past the map's edge the grass's grey goes on
    pick: (px, py) => {
      const hit = engine.pick(px, py)
      return hit && { ...hit, x: hit.x - M, y: hit.y - M }
    },
  }
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
  // furniture keeps the shape of its picture. `flip` mirrors it: the pictures are painted with their front toward
  // the lower left (right for a thing on the north wall), and a thing on the west wall has to face the other way.
  // `lean` turns a picture that was painted too front-on to lie along its wall (art.js); the card grows taller
  // by the lean, so its size grows with it and the thing itself stays the size it was.
  const shape = (im, { flip, lean = 0, size, narrow = 1 }) => {
    const [c, wide] = card(im, flip && !im.standIn, im.standIn ? 0 : lean)
    return { img: c, wide: wide * narrow, size: (size * c.height) / im.height }
  }
  // where each piece of furniture's card stands, and how it takes its turn with the people around it: a flat card
  // cuts across the floor beside a wide thing, so the engine lets a thing lie `back` toward the floor and the west
  // and north walls of its room (gm-three.js). A thing against one of those walls has nobody behind it and lies
  // all the way back; a thing out in the room (the table, the chairs) lies back by about its own width, so someone
  // in front of it is in front and someone behind it is still behind. Things outside are left as they are.
  const stood = {}
  for (const p of PROPS) {
    const s = shape(img[p.img], p)
    const wide = s.size * s.wide
    const near = wide / (2 * Math.SQRT2)
    const mid = p.mid ?? [p.at[0] + 0.5, p.at[1] + 0.5]
    const box = PLACES[zone(...p.at)]?.box
    const indoors = box && ['kitchen', 'bath', 'cubby', 'hall'].includes(zone(...p.at))
    const onWall = indoors && [p.at, ...(p.more ?? [])].some(([x, y]) => x === box[0] || y === box[1])
    stood[p.id] = { shape: s, at: p.stand ?? [mid[0] + near, mid[1] + near], back: indoors ? { most: onWall ? 6 : wide, x: box[0] + M, y: box[1] + M } : null }
  }
  const still = [
    // furniture is drawn from the corner nearest the camera: its picture's lowest point. The card stands half the
    // picture's width toward the camera (south-east) of the middle of the floor the thing covers, so that corner
    // touches the floor where the thing's own near corner is
    ...PROPS.map((p) => ({ id: p.id, at: stood[p.id].at, level: 0, back: stood[p.id].back, ...stood[p.id].shape })),
    ...SMALL.map((s) => ({ id: s.id, at: s.at, level: s.up, back: stood[s.on]?.back, ...shape(img[s.img], s) })),
    // the still world around the home: trees, bushes, neighbour houses, street things
    ...OUTSIDE.map((o) => ({ id: o.id, at: o.at, level: 0, ...shape(img[o.img], o) })),
  ]
  const stillMarks = OUTSIDE.filter((o) => o.shade).map((o) => ({ at: o.at, h: 0, r: o.shade, color: INK, opacity: 0.13 }))
  // fences and the washing line are real upright sheets in the scene, so they run true along the ground
  for (const sh of SHEETS) {
    const im = img[sh.img]
    const [dx, dy] = [sh.to[0] - sh.from[0], sh.to[1] - sh.from[1]]
    const long = Math.hypot(dx, dy)
    const tex = new THREE.CanvasTexture(im)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = THREE.RepeatWrapping
    tex.repeat.x = long / sh.every
    tex.anisotropy = 8
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(long, sh.tall), new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide }))
    sheet.position.set((sh.from[0] + sh.to[0]) / 2 + M, sh.tall / 2, (sh.from[1] + sh.to[1]) / 2 + M)
    sheet.rotation.y = -Math.atan2(dy, dx)
    sheet.raycast = () => {} // a tap goes through it to the ground
    engine.scene.add(sheet)
  }
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
  // Mom has a front and a back picture like Dreko, and walks on the same shared walk
  const momArt = { front: cutout(img.mom), 'front-flip': cutout(img.mom, true), back: cutout(img['mom-back']), 'back-flip': cutout(img['mom-back'], true) }
  const mom = { at: BUS.mom.slice(), to: BUS.mom[0], dir: 1, rest: 1200, tip: 0, look: 'back' }
  const momWalk = createWalker({ height: BUS.momSize, look: 'back' })
  // `x` is where the bus is along the road and `to` where it is heading. `scene` is the part of the bus scene
  // that is playing once the morning is over: 'in' (it pulls up), 'board' (kids get on one by one), 'nod'
  // (the driver nods, only when all ten are on) and 'out' (it drives off). `line` is who is still to get on.
  const bus = { x: BUS.from, to: BUS.from, scene: null, t: 0, line: [] }
  // his anxiety: `stress` is what misses have added, `breath` runs while he takes a deep breath, and `drops`
  // are the sweat drops in the air right now
  let stress = 0
  let breath = 0
  let sweatIn = 0
  const drops = []
  const sweatImg = cutout(img['icons/sweat'])
  const dreko = { at: DREKO.start.slice(), path: null, len: 0, gone: 0, go: 0, face: 'front', flip: false, moving: false }
  const drekoWalk = createWalker({ height: DREKO.height })
  let walkTest = false
  // The morning: 'ready' until Dreko first moves, 'run' while the clock counts down, 'left' while the
  // "bus left" card is up. Then the same day starts over.
  // The week: `day` counts from 0 (Monday). A day repeats until all ten board ('dayWon'), then the next day
  // starts with more needs. `loop` is the try within the day: there are WEEK.tries of them, and when the bus
  // leaves without all ten on the last one the game is 'over' and starts from scratch. After Friday the next
  // `week` starts, harder: `level` holds how hard this morning is (level.js).
  let level = levelOf(0, 0)
  const clock = { phase: 'ready', week: 0, day: 0, loop: 1, total: level.seconds, left: level.seconds, card: 0, paused: false, told: -1, boarded: 0, earned: 0 }
  const names = KIDS.map((k) => k.name)
  const copy = (map) => Object.fromEntries(Object.entries(map).map(([name, list]) => [name, list.slice()]))
  // who needs what today: `deal` is the day's full hand, `needs` is what is still left to do this try
  let deal = dealDay(names, level.needs)
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
    k.hop = 0
    k.spot = spotOf(k)
    k.at = k.spot.slice()
    k.look = k.kid.flip ? 'front-flip' : 'front'
    // late in the week a kid walks around, so they are not a wall and Dreko has to catch them
    k.roam = level.roam
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
  const say = (text) => hooks.onEvent?.({ text, week: clock.week, day: clock.day, loop: clock.loop, left: Math.max(0, clock.left) })
  const dayLine = () => {
    const all = Object.values(deal)
    const rooms = Object.keys(SPOTS).map((room) => `${PLACES[room].name} ${all.filter((l) => ROOM_OF[l[0]] === room).length}`).join(', ')
    return `${clock.week ? `Week ${clock.week + 1}, ` : ''}${WEEK.days[clock.day]} starts (level ${level.number}): ${clock.total} seconds on the clock, ${WEEK.tries} tries, ${all.reduce((n, l) => n + l.length, 0)} needs, ${all.filter((l) => l.length > 1).length} kids with two. The needs are dealt new, and every kid waits in the room of their first need: ${rooms}.${level.roam ? ` The kids walk around ${ROAM.where === 'house' ? 'the house' : 'their room'} at ${level.roamSpeed.toFixed(2)} tiles a second, so Dreko has to catch them.` : ''}`
  }
  say(dayLine())
  let busy = false // true while a mini task is open: Dreko stands still, the clock keeps running
  let frozen = false // true while the game is paused: the whole morning stands still
  let intro = null // the opening scene while it plays: { step: 'mom' | 'line' | 'in' | 'count', t (ms in this step), n (the number showing) }
  let hold = false // true while the title screen is up: Dreko stands still, so the clock does not start
  let held = null // the kid that task is for: they stand still too
  let tutorial = false // true in How to play: a practice morning, and the bus clock does not run
  let near = null
  // The market (config.js MARKET): `points` to spend, `pockets` the things Dreko carries (their ids, in order),
  // `gained` what the last won morning paid. While `skates` is on he is faster. `stopMs` is how much longer the
  // bus clock is stopped (the pocket watch) and `stillMs` how much longer the kids walking around stand still
  // (the whistle).
  const market = { points: 0, pockets: [], gained: null, skates: false, stopMs: 0, stillMs: 0 }
  const tellMarket = () => hooks.onMarket?.({ points: market.points, pockets: market.pockets.slice(), gained: market.gained, skates: market.skates, stopped: market.stopMs > 0, still: market.stillMs > 0 })
  const walkingAround = (k) => k.state === 'home' && k.roam && needs[k.kid.name].length > 0
  const tellClock = (force) => {
    const tick = Math.ceil(clock.left * 10)
    if (!force && tick === clock.told) return
    clock.told = tick
    hooks.onClock?.({ phase: clock.phase, week: clock.week, day: clock.day, loop: clock.loop, total: clock.total, left: clock.left, boarded: clock.boarded, earned: clock.earned, scene: !!bus.scene, worry: worry(), tutorial, stopped: market.stopMs > 0 })
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
    // the last try gone: the game is over and starts from scratch
    const last = clock.loop >= WEEK.tries
    say(last
      ? `The bus left on try ${clock.loop} of ${WEEK.tries}. ${clock.boarded} of ${kids.length} kids counted. No tries left: game over, back to the first Monday.`
      : `The bus left. ${clock.boarded} of ${kids.length} kids counted. Earned for the next try: ${clock.boarded} kids x ${CLOCK.perKid} seconds = ${clock.earned} seconds. Tries left: ${WEEK.tries - clock.loop}.`)
    clock.phase = last ? 'over' : 'left'
    dreko.path = null
    busScene()
    tellClock(true)
  }
  // every kid counted: the day is won. After Friday the next week starts, and it is harder.
  function allAboard() {
    clock.boarded = kids.length
    clock.phase = 'dayWon'
    const [w, d] = dayAfter(clock.week, clock.day)
    say(`All ten are counted with ${clock.left.toFixed(1)} seconds to spare, on try ${clock.loop} of ${WEEK.tries}. ${WEEK.days[clock.day]} is done${w > clock.week ? `, and so is week ${clock.week + 1}` : ''}. Next is ${WEEK.days[d]}${w > 0 ? ` of week ${w + 1}` : ''}.`)
    // a won morning pays points for the market: for the win, for each try not used and for the seconds left
    if (!tutorial) {
      const P = MARKET.points
      const tries = P.perTryLeft * (WEEK.tries - clock.loop)
      const seconds = P.perSecond * Math.min(P.mostSeconds, Math.floor(Math.max(0, clock.left)))
      market.gained = { won: P.won, tries, seconds, total: P.won + tries + seconds }
      market.points += market.gained.total
      tellMarket()
      say(`Points for the market: ${P.won} for the morning, ${tries} for ${WEEK.tries - clock.loop} ${WEEK.tries - clock.loop === 1 ? 'try' : 'tries'} not used, ${seconds} for the seconds left (at most ${P.mostSeconds}). That is ${market.gained.total}, so Dreko has ${market.points}.`)
    }
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
    // (it always lands exactly on `to`: a step that left it a hair short used to leave the scene waiting for ever)
    const gap = bus.to - bus.x
    if (gap) {
      const pace = bus.to === BUS.at[0] ? Math.max(0.12, Math.min(1, Math.abs(gap) / 3)) : Math.min(1, 0.25 + Math.abs(bus.x - BUS.at[0]) / 3)
      const by = (BUS.speed * pace * dt) / 1000
      bus.x = Math.abs(gap) <= Math.max(by, 0.01) ? bus.to : bus.x + Math.sign(gap) * by
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
      if (clock.phase === 'left' || clock.phase === 'over') return driveOff()
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
  // Mom paces the far pavement. We see her front as she walks one way and her back as she walks the other;
  // when she stops she turns to the house and goes up on her toes for a look. Once the morning is over she
  // comes to her spot and watches the bus.
  function stepMom(dt) {
    const over = clock.phase === 'left' || clock.phase === 'dayWon' || clock.phase === 'over'
    if (over) mom.to = BUS.mom[0]
    const gap = mom.to - mom.at[0]
    let moved = 0
    let side = 0
    if (Math.abs(gap) > 0.02) {
      moved = Math.min(Math.abs(gap), (BUS.pace.speed * (over || intro ? 2 : 1) * dt) / 1000)
      mom.at = [mom.at[0] + Math.sign(gap) * moved, mom.at[1]]
      side = Math.sign(gap) * Math.SQRT1_2
      mom.look = gap > 0 ? 'front' : 'back-flip'
      mom.tip = 0
    } else {
      mom.look = 'back'
      mom.tip += dt
      mom.rest -= dt
      if (mom.rest <= 0 && !over && !intro) {
        const { from, to, restMs } = BUS.pace
        if (mom.at[0] >= to - 0.1) mom.dir = -1
        if (mom.at[0] <= from + 0.1) mom.dir = 1
        mom.to = Math.max(from, Math.min(to, mom.at[0] + mom.dir * (2 + Math.random() * 2.5)))
        mom.rest = restMs[0] + Math.random() * (restMs[1] - restMs[0])
      }
    }
    stepWalker(momWalk, dt, { moved, side, look: mom.look })
  }
  function driveOff() {
    bus.scene = 'out'
    bus.to = BUS.to
    say('The bus drives off.')
  }
  // kind: 'retry' the same day again, 'day' the next day, 'fresh' the whole game again from the first Monday,
  // 'tutorial' the practice morning of How to play
  function nextMorning(kind = 'retry') {
    tutorial = kind === 'tutorial'
    if (intro) {
      intro = null
      hooks.onIntro?.(null)
    }
    if (kind === 'fresh' || tutorial) [clock.week, clock.day] = [0, 0]
    if (kind === 'day') [clock.week, clock.day] = dayAfter(clock.week, clock.day)
    level = levelOf(clock.week, clock.day)
    clock.loop = kind === 'retry' ? clock.loop + 1 : 1
    clock.total = level.seconds + (kind === 'retry' ? clock.earned : 0)
    clock.left = clock.total
    clock.phase = kind === 'fresh' || tutorial ? 'ready' : 'run'
    clock.boarded = 0
    clock.earned = 0
    // from scratch: the points and the pockets are gone. The skates come off when the day is done.
    if (kind === 'fresh' || tutorial) Object.assign(market, { points: 0, pockets: [], gained: null })
    if (kind !== 'retry') market.skates = false
    market.stopMs = 0
    market.stillMs = 0
    tellMarket()
    if (kind !== 'retry') {
      // a new day: new needs, and more of them
      deal = tutorial ? Object.fromEntries(names.map((name) => [name, (TUTOR.needs[name] ?? []).slice()])) : dealDay(names, level.needs)
      spots = placeDay(deal)
    }
    needs = copy(deal)
    tellNeeds()
    bus.x = BUS.from
    bus.to = BUS.from
    bus.scene = null
    stress = 0
    breath = 0
    drops.length = 0
    dreko.at = DREKO.start.slice()
    dreko.path = null
    dreko.face = 'front'
    dreko.flip = false
    for (const k of kids) stand(k)
    // in the practice morning the kids with nothing to do are at the bus stop already
    if (tutorial) {
      for (const k of kids) {
        if (needs[k.kid.name].length) continue
        k.at = stopSpot(k.slot)
        k.state = 'stop'
        k.roam = false
        k.look = 'front'
      }
    }
    fence()
    near = null
    hooks.onNear?.(null)
    tellReady()
    cam.at = (roomLook[roomAt(dreko.at)] ?? dreko.at).slice()
    tellClock(true)
    if (kind === 'retry') {
      say(`${WEEK.days[clock.day]} starts over, try ${clock.loop} of ${WEEK.tries}: ${level.seconds} + ${clock.total - level.seconds} earned = ${clock.total} seconds. Same needs in the same rooms.`)
    } else if (tutorial) say('How to play: a practice morning. The bus clock is stopped. Seven kids are at the bus stop already, three still need Dreko.')
    else say(dayLine())
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
      k.hop = BUS.hopMs // made it: a little hop
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
    say(`${name} is waiting in the ${roomName(needs[name][0])} for: ${NEEDS[needs[name][0]]}.`)
  }
  // Every kid's need shows over their head from the start (Carl, Nov 23: "Let's get rid of the knowing and the
  // question mark"). Before that Dreko had to walk up to a kid to be told.
  // How anxious he is right now, 0 to 1: the clock pushes it up, every need done and every kid counted bring it down
  function worry() {
    const done = names.reduce((n, name) => n + doneOf(name), 0)
    const v = 1 - Math.max(0, clock.left) / clock.total - ANXIETY.perDone * done - ANXIETY.perCounted * counted() + stress
    return Math.max(0, Math.min(1, v))
  }
  const percent = () => `${Math.round(worry() * 100)}%`
  // a calm moment: the bar drops and he takes a deep breath
  function calm(why) {
    breath = ANXIETY.breathMs
    hooks.onCalm?.()
    tellClock(true)
    say(`Calm moment: ${why} Dreko takes a breath. Anxiety is at ${percent()}.`)
  }
  const head = new THREE.Vector3()
  const lift = 1 / Math.cos((CAMERA.tilt * Math.PI) / 180) // the cut-outs are stretched by this to stand upright
  const points = kids.map(() => [0, 0, false, false])
  // which room's view the camera takes for someone standing at `at`, or null outside
  const roomAt = (at) => {
    if (!ROOM_VIEW.on) return null
    const z = zone(Math.floor(at[0]), Math.floor(at[1]))
    const key = z === 'runner' ? (at[1] < 6.5 ? 'bath' : at[1] < 13 ? 'hall' : null) : z
    return key in SPOTS ? key : null
  }
  // where the camera looks for each room: its middle, moved by ROOM_VIEW.shift
  const roomLook = Object.fromEntries(Object.keys(SPOTS).map((key) => {
    const [x0, y0, x1, y1] = PLACES[key].box
    return [key, [(x0 + x1 + 1) / 2 + ROOM_VIEW.shift[0], (y0 + y1 + 1) / 2 + ROOM_VIEW.shift[1]]]
  }))
  const cam = { at: (roomLook[roomAt(dreko.at)] ?? dreko.at).slice() }
  let spy = null // for tests: look at a place from a distance of your choosing
  let size = { w: 1, h: 1 }
  let place = ''
  let stopped = false
  let last = 0
  let mapCanvas = null
  let picked = null // the kid picked in the need list: ringed on the map
  // the need pictures, for the map; each is fetched the first time the map wants it
  const mapIcons = {}
  const mapIcon = (name) => {
    if (!mapIcons[name]) {
      mapIcons[name] = new Image()
      mapIcons[name].src = `${import.meta.env.BASE_URL}art/icons/${name}.webp`
    }
    return mapIcons[name]
  }

  const free = (x, y) => {
    const r = DREKO.radius
    for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (!GMTiles.walkable(walk, Math.floor(x + dx), Math.floor(y + dy))) return false
    return true
  }
  // Which way to slip sideways (+1 or -1) to get past what blocks him, or 0: `open(d)` says if the way is clear
  // `d` tiles to the side. The nearest opening wins.
  const slip = (open) => {
    for (let d = 0.06; d <= DOOR_HELP.reach; d += 0.06) for (const s of [1, -1]) if (open(s * d)) return s
    return 0
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

  // The opening scene (config.js INTRO). Mom walks up across the street, says her line, Dreko goes in through the
  // front door, the picture cuts to where he starts, and 3, 2, 1 counts the morning in: at the end of it the bus
  // clock starts by itself. Skipped, it ends at once and the clock waits for his first step, as it always did.
  const tellIntro = () => hooks.onIntro?.(intro && { step: intro.step, n: intro.n, line: intro.step === 'line' ? INTRO.line : null })
  function placeForMorning() {
    dreko.at = DREKO.start.slice()
    dreko.path = null
    dreko.face = 'front'
    dreko.flip = false
    cam.at = (roomLook[roomAt(dreko.at)] ?? dreko.at).slice()
  }
  function startIntro() {
    if (tutorial || clock.phase !== 'ready') return
    intro = { step: 'mom', t: 0, n: 0 }
    dreko.at = INTRO.dreko.slice()
    dreko.path = null
    dreko.face = 'front' // Mom is across the street, toward the camera and to the left
    dreko.flip = true
    mom.at = [INTRO.mom[0], mom.at[1]]
    mom.to = INTRO.mom[1]
    cam.at = INTRO.cam.slice()
    tellIntro()
    say('The opening scene: Mom walks up across the street.')
  }
  function endIntro(skipped) {
    if (!intro) return
    const counted = intro.step === 'count'
    intro = null
    mom.rest = 600
    if (!counted) placeForMorning()
    if (!skipped) {
      clock.phase = 'run'
      say('3, 2, 1: the morning starts and the bus clock runs.')
    } else say('The opening scene was skipped. The bus clock starts when Dreko first moves.')
    tellIntro()
    tellClock(true)
  }
  function stepIntro(dt) {
    intro.t += dt
    if (intro.step === 'mom' && Math.abs(mom.to - mom.at[0]) <= 0.02) {
      intro.step = 'line'
      intro.t = 0
      breath = ANXIETY.breathMs // he sighs
      tellIntro()
      say(`Mom: "${INTRO.line}"`)
    } else if (intro.step === 'line' && intro.t >= INTRO.lineMs) {
      intro.step = 'in'
      intro.t = 0
      const path = GMTiles.findPath(walk, [dreko.at[0] * TILE, dreko.at[1] * TILE], [INTRO.door[0] * TILE, INTRO.door[1] * TILE])
      if (path && path.length > 1) {
        dreko.path = path
        dreko.len = GMTiles.pathLength(path)
        dreko.gone = 0
      }
      tellIntro()
    } else if (intro.step === 'in' && !dreko.path) {
      intro.step = 'count'
      intro.t = 0
      intro.n = 3
      placeForMorning()
      tellIntro()
    } else if (intro.step === 'count' && intro.t >= INTRO.countMs) {
      intro.t = 0
      intro.n -= 1
      if (intro.n <= 0) endIntro(false)
      else tellIntro()
    }
  }

  function step(dt) {
    let [ix, iy] = input.read()
    if (busy || hold || clock.phase === 'over') {
      ix = 0
      iy = 0
      dreko.path = null
    }
    if (intro) {
      // the opening scene moves him itself
      ix = 0
      iy = 0
      stepIntro(dt)
    }
    if (clock.phase === 'left' || clock.phase === 'dayWon' || clock.phase === 'over') {
      // the bus has gone: Dreko stands still while the card is up
      ix = 0
      iy = 0
      dreko.path = null
      // the card comes up once the bus has driven off, and waits for Continue (Carl, Nov 21)
    } else if (clock.phase === 'ready' && !intro) {
      if (ix || iy || dreko.path) {
        clock.phase = 'run'
        tellClock(true)
        say('Dreko moved, so the bus clock starts.')
      }
    } else if (clock.phase === 'run' && !clock.paused) {
      // the practice morning has no clock, and the pocket watch stops it for a while
      if (market.stopMs > 0) {
        market.stopMs = Math.max(0, market.stopMs - dt)
        if (!market.stopMs) {
          tellMarket()
          tellClock(true)
          say('The pocket watch has run down: the bus clock runs again.')
        }
      } else if (!tutorial) clock.left -= dt / 1000
      if (market.stillMs > 0) {
        market.stillMs = Math.max(0, market.stillMs - dt)
        if (!market.stillMs) {
          tellMarket()
          say('The whistle has worn off: the kids walk around again.')
        }
      }
      stress = Math.max(0, stress - (ANXIETY.settle * dt) / 1000)
      // sweat flies off him when he is very anxious, faster the worse it is
      const w = worry()
      sweatIn -= dt
      if (w >= ANXIETY.sweatFrom && sweatIn <= 0) {
        drops.push({ t: 0, life: 520 + Math.random() * 260, side: Math.random() < 0.5 ? -1 : 1, reach: 0.35 + Math.random() * 0.4, rise: 0.25 + Math.random() * 0.3 })
        sweatIn = 420 - 300 * ((w - ANXIETY.sweatFrom) / (1 - ANXIETY.sweatFrom))
      }
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
    stepMom(dt)
    breath = Math.max(0, breath - dt)
    for (let i = drops.length - 1; i >= 0; i--) {
      drops[i].t += dt
      if (drops[i].t >= drops[i].life) drops.splice(i, 1)
    }
    const from = dreko.at
    let side = 0
    dreko.moving = false
    // he eases up to speed instead of snapping to it
    dreko.go = ix || iy || dreko.path ? Math.min(1, dreko.go + dt / WALK.easeMs) : 0
    const speed = DREKO.speed * (market.skates ? MARKET.items.skates.faster : 1) // on roller skates he is faster
    if (ix || iy) {
      // the stick is read against the screen, then turned into tiles
      dreko.path = null
      side = ix / Math.hypot(ix, iy)
      const k = (speed * dreko.go * dt) / 1000 / Math.SQRT2
      const dx = (ix - iy) * k
      const dy = (-ix - iy) * k
      let [x, y] = dreko.at
      const [x0, y0] = dreko.at
      if (free(x + dx, y)) x += dx
      if (free(x, y + dy)) y += dy
      // Help at doors and corners (Carl, Nov 23: "going in and out of rooms, I kept running into the walls"). A
      // doorway is one tile wide and Dreko is half a tile, so he used to stop dead on the door frame when he was
      // a little off. Now, when the way he pushes is blocked but is open a little to one side, he slips over to
      // it. Only when he is stopped dead: while he still slides along a wall, nothing is changed.
      if (x === x0 && y === y0) {
        const sy = dx ? slip((d) => free(x0 + Math.sign(dx) * 0.12, y0 + d) && free(x0, y0 + d)) : 0
        if (sy) y = y0 + sy * Math.min(Math.abs(dx), DOOR_HELP.step)
        const sx = dy && !sy ? slip((d) => free(x0 + d, y0 + Math.sign(dy) * 0.12) && free(x0 + d, y0)) : 0
        if (sx) x = x0 + sx * Math.min(Math.abs(dy), DOOR_HELP.step)
      }
      if (x !== dreko.at[0] || y !== dreko.at[1]) dreko.moving = true
      faceAlong(dx, dy)
      dreko.at = [x, y]
    } else if (dreko.path) {
      // and he slows into the last third of a tile instead of stopping dead
      const left = (dreko.len - dreko.gone) / TILE
      const pace = dreko.go * Math.max(0.3, Math.min(1, left / 0.35))
      dreko.gone += (speed * pace * dt * TILE) / 1000
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

    // Indoors the camera frames the whole room he is in; outside it slides after him. It never leaves the map.
    const room = roomAt(dreko.at)
    const ease = 1 - Math.exp(-dt / (room ? ROOM_VIEW.slideMs : 220))
    // once the morning is over it looks at the bus stop instead
    const look = clock.phase === 'left' || clock.phase === 'dayWon' || clock.phase === 'over' ? BUS.cam : intro && intro.step !== 'count' ? INTRO.cam : room ? roomLook[room] : dreko.at
    const tx = Math.max(2.5, Math.min(W - 2.5, look[0]))
    const ty = Math.max(2.5, Math.min(H - 2.5, look[1]))
    cam.at = [cam.at[0] + (tx - cam.at[0]) * ease, cam.at[1] + (ty - cam.at[1]) * ease]
    // far enough back that a whole room fits the screen, across and down; the bus scene is watched from closer
    const over = look === BUS.cam || look === INTRO.cam
    const want = over || !ROOM_VIEW.on ? (size.h > size.w ? CAMERA.distTall : CAMERA.distWide) : Math.max(ROOM_VIEW.wide / (ROOM_VIEW.per * (size.w / size.h)), ROOM_VIEW.tall / ROOM_VIEW.per)
    cam.dist = cam.dist ? cam.dist + (want - cam.dist) * (1 - Math.exp(-dt / 450)) : want

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
    if (k.hop > 0) k.hop -= dt
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
    } else if (market.stillMs > 0 && walkingAround(k)) {
      // the whistle: a kid who was walking around stands still, wherever they are
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
        ;[moved, side, arrived] = advance(k, dt, level.roamSpeed)
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

  // how far off the floor a kid is: the floating kid floats, and a kid who just reached the bus stop hops
  const liftOf = (k, now) => (k.kid.floats ? 0.3 + 0.05 * Math.sin(now / 500) : 0) + (k.hop > 0 ? BUS.hop * Math.sin((1 - k.hop / BUS.hopMs) * Math.PI) : 0)
  // one character on screen: the shared walk's pose laid over their picture
  const posed = (id, at, art, size, walker, floatAt, extra) => {
    const pose = poseOf(walker)
    return { id, at, img: art[pose.look], size, level: pose.up + floatAt, wide: pose.wide, h: pose.tall, roll: pose.roll, ...extra }
  }

  function draw(now) {
    const nod = bus.scene === 'nod' ? Math.sin((1 - bus.t / BUS.nodMs) * Math.PI * 2) ** 2 : 0
    // a deep breath: he swells and settles
    const him = posed('dreko', dreko.at, drekoArt, DREKO.height, drekoWalk, 0, { ghost: GOLD })
    if (intro && (intro.step === 'mom' || intro.step === 'line')) him.h *= INTRO.slump // he stands a little slumped while Mom talks
    if (breath > 0) {
      const puff = Math.sin((1 - breath / ANXIETY.breathMs) * Math.PI)
      him.h *= 1 + 0.07 * puff
      him.wide *= 1 + 0.05 * puff
    }
    const things = [
      ...still,
      ...kids.filter((k) => k.state !== 'aboard').map((k) => posed(k.kid.name, k.at, k.art, k.size, k.walker, liftOf(k, now))),
      posed('mom', mom.at, momArt, BUS.momSize, momWalk, 0.09 * Math.sin(Math.min(1, mom.tip / 900) * Math.PI)),
      { id: 'bus', at: [bus.x, BUS.at[1]], level: 0, img: busImg, size: BUS.size, wide: busWide },
      // the driver sits a hair behind the bus picture, seen through the open side of its cab (the 1920s bus has
      // see-through windows), so the cab's frame and the steering wheel are in front of him; his nod is two dips of the head
      { id: 'driver', at: [bus.x + BUS.driver[0] * Math.SQRT1_2 - 0.04, BUS.at[1] - BUS.driver[0] * Math.SQRT1_2 - 0.04], level: (BUS.driver[1] - 0.1 * nod) * lift, img: driverImg, size: BUS.driverSize, wide: driverWide, roll: -0.22 * nod },
      him,
      ...drops.map((d, i) => {
        // each drop arcs out from his head to one side of the screen and falls
        const p = d.t / d.life
        const out = d.side * d.reach * p * Math.SQRT1_2
        return { id: 'sweat' + i, at: [dreko.at[0] + out + 0.05, dreko.at[1] - out + 0.05], level: DREKO.height * lift * 0.8 + d.rise * Math.sin(p * Math.PI) - 0.5 * p * p, img: sweatImg, size: 0.36 * (1 - 0.45 * p) }
      }),
    ]
    view.setThings(things)
    view.setMarks([
      ...kids.filter((k) => k.state !== 'aboard').map(({ at, size: s }) => ({ at, h: 0, r: s * 0.16, color: INK, opacity: 0.16 })),
      { at: dreko.at, h: 0, r: 0.3, color: INK, opacity: 0.2 },
      ...stillMarks,
    ])
    const tall = size.h > size.w
    view.render({ mode: 'orbit', angle: CAMERA.angle, tilt: CAMERA.tilt, upTo: 1, at: spy ? [spy.at[0], spy.at[1], 0] : [cam.at[0], cam.at[1], 0], dist: spy?.dist ?? cam.dist ?? (tall ? CAMERA.distTall : CAMERA.distWide) })
    if (mapCanvas) drawMap(now)

    // where the top of each kid's head is on screen, for the bubbles
    if (hooks.onBubbles) {
      kids.forEach((k, i) => {
        const pose = poseOf(k.walker)
        const floatAt = liftOf(k, now)
        head.set(k.at[0] + M, pose.up + floatAt + k.size * pose.tall * lift, k.at[1] + M).project(view.camera)
        points[i][0] = (head.x * 0.5 + 0.5) * size.w
        points[i][1] = (-head.y * 0.5 + 0.5) * size.h
        points[i][2] = k.state !== 'aboard' && head.z < 1 && Math.abs(head.x) < 1.1 && Math.abs(head.y) < 1.1
        points[i][3] = k.state === 'forgot' // a kid saying "Oh wait" is shown even when the bus stop is off screen
      })
      hooks.onBubbles(points)
    }
  }

  // The data under the art: walls dark, doors gold, Dreko gold with a ring, and over each kid their need, or a
  // tick when they are ready (Nov 23).
  function drawMap(now) {
    const s = 28
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
      if (k.state === 'aboard') continue
      const name = k.kid.name
      const left = needs[name]
      const icon = left.length ? left[0] : 'tick'
      const [x, y] = [k.at[0] * s, k.at[1] * s]
      const r = s * 0.62
      if (name === picked) {
        // the kid picked in the need list: a gold ring that beats
        g.strokeStyle = GOLD
        g.lineWidth = s * 0.22
        g.beginPath(); g.arc(x, y, r + s * (0.3 + 0.18 * Math.sin(now / 160)), 0, 7); g.stroke()
      }
      g.fillStyle = '#fff'
      g.strokeStyle = !left.length ? '#2e8b57' : '#7a3fc4'
      g.lineWidth = s * 0.1
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke()
      const im = mapIcon(icon)
      if (im.complete && im.naturalWidth) g.drawImage(im, x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6)
    }
    if (dreko.path) {
      g.strokeStyle = GOLD
      g.lineWidth = s * 0.16
      g.beginPath()
      dreko.path.forEach((p, i) => (i ? g.lineTo((p[0] / TILE) * s, (p[1] / TILE) * s) : g.moveTo((p[0] / TILE) * s, (p[1] / TILE) * s)))
      g.stroke()
    }
    g.fillStyle = GOLD
    g.strokeStyle = INK
    g.lineWidth = s * 0.12
    g.beginPath(); g.arc(dreko.at[0] * s, dreko.at[1] * s, s * 0.42, 0, 7); g.fill(); g.stroke()
  }

  function frame(now) {
    if (stopped) return
    const dt = Math.min(50, now - (last || now))
    last = now
    // paused: nothing in the house moves and the clock stands still; only the controller's buttons are read
    if (frozen) for (const tap of input.taps()) hooks.onButton?.(tap)
    else step(dt)
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
    if (intro) return // the opening scene moves him itself
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

  // A kid's need is done: with Dreko's mini task, or (`how`) some other way. The kid heads for the bus; if they
  // have one more need today, it comes to mind at the bus stop.
  function meet(name, how) {
    const k = kids.find((x) => x.kid.name === name)
    if (!k || !reachable(k)) return false
    const id = needs[name].shift()
    tellNeeds()
    if (!needs[name].length) {
      calm(`${name} is counted, which takes ${Math.round((ANXIETY.perDone + ANXIETY.perCounted) * 100)} off.`)
      hooks.onCounted?.(name)
    } else calm(`a need is done, which takes ${Math.round(ANXIETY.perDone * 100)} off.`)
    say(`${name}: ${NEEDS[id]} done with ${how ?? MOVE_NAMES[MOVES[id].move]}. ${needs[name].length ? `${name} walks to the bus stop. One more to do: ${NEEDS[needs[name][0]]}, in the ${roomName(needs[name][0])}.` : `Nothing left, so ${name} counts for the bus now: ${counted()} of ${kids.length}. ${name} walks to the stop.`}`)
    sendToStop(k)
    return true
  }

  // The market is open on the "day done" card, once the bus has gone (never in the practice morning).
  const shopOpen = () => clock.phase === 'dayWon' && !tutorial && !bus.scene
  // Dreko uses the thing in pocket `slot` (0 is the first). It is used up, unless it cannot be used right now:
  // then it stays in his pocket and the player is told why.
  function useItem(slot) {
    const id = market.pockets[slot]
    const item = MARKET.items[id]
    if (!item) return { ok: false }
    const no = (text) => {
      hooks.onItem?.({ id, ok: false, text })
      return { ok: false, text }
    }
    if (tutorial || busy || hold || clock.paused || (clock.phase !== 'run' && clock.phase !== 'ready')) return no('Not right now')
    let text = ''
    if (id === 'skates') {
      if (market.skates) return no('The skates are already on')
      market.skates = true
      text = 'Skates on. Dreko is faster until the day is done.'
    } else if (id === 'watch') {
      if (clock.phase !== 'run') return no('The clock is not running yet')
      market.stopMs += item.seconds * 1000
      text = `The clock stops for ${item.seconds} seconds.`
    } else if (id === 'whistle') {
      const n = kids.filter(walkingAround).length
      if (!n) return no('No kid is walking around right now')
      market.stillMs = item.seconds * 1000
      text = `${n === 1 ? '1 kid stands' : `${n} kids stand`} still for ${item.seconds} seconds.`
    } else if (id === 'coin') {
      if (clock.phase !== 'run' || clock.left > BUS.comeAt) return no('The bus is not here yet')
      clock.left += item.seconds
      text = `The driver takes the coin. The bus waits ${item.seconds} more seconds.`
    } else if (id === 'candy') {
      const name = near
      const need = name && needs[name]?.[0]
      if (!need || !meet(name, 'a piece of candy')) return no('Walk up to a kid first')
      text = `${name} takes the candy and does it alone: ${NEEDS[need]}.`
    }
    market.pockets.splice(slot, 1)
    tellMarket()
    tellClock(true)
    hooks.onItem?.({ id, ok: true, text })
    say(`Dreko uses the ${item.name.toLowerCase()}. ${text}`)
    return { ok: true, text }
  }

  requestAnimationFrame(frame)

  return {
    resize,
    setMapCanvas(c) { mapCanvas = c },
    // the kid picked in the need list (their name, or null): ringed on the map
    setPicked(name) { picked = name || null },
    setWalkTest(on) { walkTest = !!on },
    setPaused(on) { clock.paused = !!on },
    setHold(on) { hold = !!on },
    startIntro, // the opening scene, from Start on the title screen
    skipIntro() { endIntro(true) },
    // the pause button: everything stands still until it is let go again
    setFrozen(on) {
      if (frozen === !!on) return
      frozen = !!on
      dreko.path = null
      say(frozen ? 'The game is paused. Nothing moves and the clock waits.' : 'The game goes on.')
    },
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
    needMet(name) { meet(name) },
    // The market, between two mornings: buy a thing for Dreko's pockets, or put one back for what it cost.
    buy(id) {
      const item = MARKET.items[id]
      if (!item || !shopOpen()) return { ok: false }
      if (market.pockets.length >= MARKET.pockets) return { ok: false, text: 'His pockets are full' }
      if (market.points < item.price) return { ok: false, text: 'Not enough points' }
      market.points -= item.price
      market.pockets.push(id)
      tellMarket()
      say(`Market: Dreko buys the ${item.name.toLowerCase()} for ${item.price} points. ${market.points} left. In his pockets: ${market.pockets.map((x) => MARKET.items[x].name).join(', ')}.`)
      return { ok: true }
    },
    putBack(slot) {
      const item = MARKET.items[market.pockets[slot]]
      if (!item || !shopOpen()) return { ok: false }
      market.pockets.splice(slot, 1)
      market.points += item.price
      tellMarket()
      say(`Market: Dreko puts the ${item.name.toLowerCase()} back and gets his ${item.price} points back. He has ${market.points}.`)
      return { ok: true }
    },
    // in the house: use the thing in pocket `slot`
    useItem,
    // for tests: put a thing in his pocket, or hand him points
    give(id) { if (MARKET.items[id]) { market.pockets.push(id); tellMarket() } },
    addPoints(n) { market.points += n; tellMarket() },
    playAgain() { nextMorning('fresh') },
    // How to play: the practice morning (src/game/Tutorial.jsx talks the player through it)
    startTutorial() { nextMorning('tutorial') },
    // Continue on the "bus left", "day done" or "game over" card: the same day again, the next day, or from scratch
    next() {
      if (bus.scene) return
      if (clock.phase === 'left') nextMorning('retry')
      else if (clock.phase === 'dayWon') nextMorning(tutorial ? 'fresh' : 'day') // after the practice morning the real game starts
      else if (clock.phase === 'over') nextMorning('fresh')
    },
    // a miss in a mini task: his anxiety jumps
    miss() {
      stress += ANXIETY.perMiss
      tellClock(true)
      say(`The miss pushes his anxiety up by ${Math.round(ANXIETY.perMiss * 100)}, to ${percent()}.`)
    },
    addStress(v) { stress += v; tellClock(true) }, // for tests
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
    },
    skipToDay(day, week = clock.week) {
      clock.week = week
      clock.day = day - 1
      nextMorning('day')
    },
    // for tests: where a point of the house is on screen, in pixels (x and y in tiles, `up` in floors)
    project(x, y, up = 0) {
      const v = new THREE.Vector3(x + M, up, y + M).project(view.camera)
      return [(v.x * 0.5 + 0.5) * size.w, (-v.y * 0.5 + 0.5) * size.h]
    },
    // for tests: look at any place from any distance (the angle never changes); no argument gives the game's camera back
    spy: (at, dist) => (spy = at ? { at, dist } : null),
    // for tests and for the next systems (needs, clock): where things are right now
    state: () => ({ worry: worry(), drops: drops.length, bus: { x: bus.x, scene: bus.scene }, mom: { at: mom.at.slice(), look: mom.look }, dreko: dreko.at.slice(), place, moving: dreko.moving, rooms: Object.fromEntries(kids.map((k) => [k.kid.name, needs[k.kid.name].length ? ROOM_OF[needs[k.kid.name][0]] : null])), spots: Object.fromEntries(kids.map((k) => [k.kid.name, k.spot.slice()])), plan: JSON.parse(JSON.stringify(spots)), deal: copy(deal), solid: kids.filter((k) => k.state === 'home' && k.solid).map((k) => k.kid.name), at: Object.fromEntries(kids.map((k) => [k.kid.name, k.at.slice()])), frozen, intro: intro && { ...intro }, clock: { tutorial, phase: clock.phase, week: clock.week, day: clock.day, loop: clock.loop, level: { ...level }, left: clock.left, total: clock.total, boarded: clock.boarded, earned: clock.earned }, near, market: { ...market, pockets: market.pockets.slice() }, needs: copy(needs), kids: Object.fromEntries(kids.map((k) => [k.kid.name, k.state])) }),
    stop() {
      stopped = true
      input.stop()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      view.renderer.dispose()
    },
  }
}
