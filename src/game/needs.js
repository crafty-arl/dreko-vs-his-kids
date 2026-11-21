// The pool of needs: the ten from the game map, plus the ones added since. There are more needs than
// kids on purpose (Carl, Nov 21: "we can have more needs then kids so its more random"), so every day
// deals a different set (dealDay below). An icon belongs to the need, not to the kid.
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

// A new day: hand out `count` needs between the kids at random. Returns { kidName: [needId, ...] }.
// Every kid gets one, no need twice. Past that, `count` minus the number of kids get a second, different one.
// The week never deals fewer needs than kids, so every kid has something every day.
export function dealDay(names, count, random = Math.random) {
  const mix = (list) => {
    const out = list.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  const ids = Object.keys(NEEDS)
  const out = Object.fromEntries(names.map((name) => [name, []]))
  const pool = mix(ids)
  mix(names).slice(0, count).forEach((name, i) => out[name].push(pool[i % pool.length]))
  for (const name of mix(names).slice(0, Math.max(0, count - names.length))) {
    const other = ids.filter((id) => id !== out[name][0])
    out[name].push(other[Math.floor(random() * other.length)])
  }
  return out
}

// How close Dreko has to walk, in tiles, before a kid tells him what they need.
export const ASK_DISTANCE = 1.2
