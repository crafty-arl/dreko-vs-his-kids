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
