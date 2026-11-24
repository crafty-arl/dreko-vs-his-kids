// One walk for the whole family. Dreko and every kid run through this same code, so they all move as one set.
// It never draws anything new: it only lifts, rocks, leans and squashes the picture a character already has.
import { WALK } from './config.js'

// height: the character's drawn height in tiles (everything scales from it)
// quick: step rate against Dreko's (kids are a touch faster)
// floats: true for a character who never touches the floor (no bounce, no squash)
// look: which picture to start on, and offset: where in the breath they start
export function createWalker({ height, quick = 1, floats = false, look = 'front', offset = 0 }) {
  return { height, quick, floats, phase: 0, amount: 0, dir: 0, shown: look, want: look, turn: 1, clock: offset }
}

// Call once a frame. moved: tiles walked this frame. side: -1 to 1, how far the walk points left or right on
// screen. look: the picture the character should be showing (it gets there with a paper-card turn).
export function stepWalker(w, dt, { moved = 0, side = 0, look = w.want } = {}) {
  const ease = 1 - Math.exp(-dt / WALK.easeMs)
  const walking = moved > 1e-5
  w.amount += ((walking ? 1 : 0) - w.amount) * ease
  w.dir += ((walking ? side : 0) - w.dir) * ease
  // steps follow the ground covered, so the feet never slide: one step every `stride` of the character's height
  w.phase += (moved / (WALK.stride * w.height)) * w.quick
  w.clock += dt

  w.want = look
  if (w.turn >= 1 && w.shown !== w.want) w.turn = 0
  if (w.turn < 1) {
    const before = w.turn
    w.turn = Math.min(1, w.turn + dt / WALK.turnMs)
    if (before < 0.5 && w.turn >= 0.5) w.shown = w.want // the card is edge-on: swap the picture
  }
}

// What to do to the picture right now.
// up: lift off the floor in tiles. wide / tall: stretch against its normal size. roll: tip in radians
// (plus tips the head to the left of the screen). look: the picture to show.
export function poseOf(w) {
  const beat = Math.abs(Math.sin(Math.PI * w.phase)) // 0 on a footfall, 1 between steps
  const land = w.floats ? 0 : (1 - beat) ** 2 * w.amount
  const breath = WALK.breath * Math.sin((w.clock / WALK.breathMs) * Math.PI * 2) * (1 - w.amount)
  const card = Math.max(0.05, Math.abs(Math.cos(Math.PI * w.turn)))
  return {
    up: w.floats ? 0 : w.height * WALK.bounce * beat * w.amount,
    tall: 1 - WALK.squash * land + breath,
    wide: (1 + WALK.squash * 0.6 * land - breath * 0.5) * card,
    roll: -(WALK.rock * Math.sin(Math.PI * w.phase) + WALK.lean * w.dir) * w.amount,
    look: w.shown,
  }
}
