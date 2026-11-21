// The pool of needs: the ten from the game map, plus the ones added since. There are more needs than
// kids on purpose (Carl, Nov 21: "we can have more needs then kids so its more random"), so every new
// game deals a different ten. An icon belongs to the need, not to the kid.
export const NEEDS = {
  lunch: 'Packed lunch',
  slip: 'Permission slip',
  braids: 'Antenna braids',
  homework: 'Homework',
  socks: 'Six socks',
  teeth: 'Teeth brushed',
  jacket: 'Jacket on',
  show: 'Show-and-tell',
  breakfast: 'Breakfast',
  backpack: 'Backpack zipped',
  shoes: 'Shoes tied',
}

// Which mini task each need opens, and how that task is set for it (src/game/tasks/). Four moves cover the
// whole pool: 'hold' (hold and let go on the line), 'pieces' (put the pieces in place), 'trace' (follow the
// dotted line) and 'sides' (left and right in order). The pairing and every number are drafts to tune.
export const MOVES = {
  breakfast: { move: 'hold', fillMs: 1500, from: 0.62, to: 0.84 },
  teeth: { move: 'hold', fillMs: 1200, from: 0.74, to: 0.93 },
  lunch: { move: 'pieces', count: 3, kind: 'shapes' },
  homework: { move: 'pieces', count: 4, kind: 'order' },
  show: { move: 'pieces', count: 4, kind: 'shapes' },
  slip: { move: 'trace', line: 'zigzag' },
  backpack: { move: 'trace', line: 'straight' },
  braids: { move: 'sides', steps: 5, mixed: true },
  socks: { move: 'sides', steps: 6 },
  jacket: { move: 'sides', steps: 4, mixed: true },
  shoes: { move: 'sides', steps: 4 },
}

// A new game: shuffle the pool and hand one need to each kid, no need twice. Returns { kidName: needId }.
export function dealNeeds(names, random = Math.random) {
  const pool = Object.keys(NEEDS)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return Object.fromEntries(names.map((name, i) => [name, pool[i]]))
}

// How close Dreko has to walk, in tiles, before a kid tells him what they need.
export const ASK_DISTANCE = 1.2
