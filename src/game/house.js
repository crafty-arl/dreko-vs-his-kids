// The house as data. The tile map is the truth; the art is only its skin.
// One letter per tile: '#' wall (solid), '.' floor, 'D' doorway (you can walk through it).
// x runs left to right along a row, y runs down the rows. North is the top row.

export const ROWS = [
  '###############',
  '#......#......#',
  '#......#......#',
  '#......D......#',
  '#......#......#',
  '#......#......#',
  '###D######DD###',
  '#......#......#',
  '#......#......#',
  '#......D......#',
  '#......#......#',
  '#......#......#',
  '##########DD###',
  '...............',
  '...............',
  '...............',
  '...............',
  '...............',
  '...............',
]

export const W = ROWS[0].length
export const H = ROWS.length

// The five places from the game map. `box` is [x0, y0, x1, y1] in tiles, both ends included.
export const PLACES = {
  kitchen: { name: 'Kitchen', box: [1, 1, 6, 5], floor: 'f-kitchen', wall: 'w-kitchen' },
  bath: { name: 'Bathroom', box: [8, 1, 13, 5], floor: 'f-bath', wall: 'w-bath' },
  cubby: { name: 'Cubby room', box: [1, 7, 6, 11], floor: 'f-cubby', wall: 'w-cubby' },
  hall: { name: 'Front hall', box: [8, 7, 13, 11], floor: 'f-hall', wall: 'w-hall' },
  stop: { name: 'Bus stop', box: [0, 13, 14, 16], floor: 'f-walk', wall: 'w-out' },
  // the pavement on the far side of the road, where Mom stands and watches (Carl: "mom across the street watching")
  far: { name: 'Across the street', box: [0, 17, 14, 18], floor: 'f-walk', wall: 'w-out' },
}

// Which kind of ground a tile is: a place key, 'runner' (the hall rug), 'road', or null for a wall.
export function zone(x, y) {
  if (y >= 17) return 'far'
  if (y >= 15) return 'road'
  if (y >= 13) return 'stop'
  if ((x === 10 || x === 11) && y >= 6 && y <= 12) return 'runner'
  if (x === 7 && y === 3) return 'kitchen' // doorway floors take the floor of the room on their west or north
  if (x === 3 && y === 6) return 'cubby'
  if (x === 7 && y === 9) return 'hall'
  for (const key of ['kitchen', 'bath', 'cubby', 'hall']) {
    const [x0, y0, x1, y1] = PLACES[key].box
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return key
  }
  return null
}

// The name of the place a tile belongs to (for the sign on screen).
export function placeName(x, y) {
  const z = zone(Math.floor(x), Math.floor(y))
  if (z === 'runner') return y < 6.5 ? PLACES.bath.name : PLACES.hall.name
  if (z === 'road') return PLACES.stop.name
  return z ? PLACES[z].name : ''
}

// Solid furniture. `at` is its tile, `size` its drawn height in tiles, `front` how far its picture stands toward
// the camera from the tile's middle (the pictures are drawn from their front corner). `more` lists any other
// tiles a wide thing covers. A thing whose picture is not painted yet is drawn as a grey labelled box
// (src/game/art.js LATER). `flip` mirrors a picture so its front faces into the room. The camera looks from the south-east, so the tall things stand against the north and
// west walls of a room and nothing tall stands in front of a place a kid waits.
// Which things, and where, is a draft of Nov 21 that Carl said go on. Each thing belongs to a need of its room.
export const PROPS = [
  // Kitchen: breakfast, packed lunch
  { id: 'fridge', at: [1, 1], img: 'fridge', size: 2.3, front: 0.3, flip: true },
  { id: 'stove', at: [2, 1], img: 'stove', size: 1.45, front: 0.3, flip: true },
  { id: 'counter', at: [3, 1], img: 'counter', size: 1.5, front: 0.3 },
  { id: 'pantry', at: [1, 3], img: 'pantry', size: 2.3, front: 0.2, flip: true },
  { id: 'table', at: [4, 3], img: 'table', size: 1.6, front: 0.33 },
  { id: 'chair-a', at: [3, 3], img: 'chair', size: 1.35, front: 0.2 },
  { id: 'chair-b', at: [5, 3], img: 'chair', size: 1.35, front: 0.2 },
  // Bathroom: teeth brushed, antenna braids
  { id: 'vanity', at: [8, 1], img: 'vanity', size: 1.8, front: 0.2 },
  { id: 'sink', at: [10, 1], img: 'sink', size: 2.0, front: 0.2 },
  { id: 'toilet', at: [11, 1], img: 'toilet', size: 1.3, front: 0.2 },
  { id: 'tub', at: [12, 1], more: [[13, 1]], img: 'tub', size: 1.35, front: 0.2, shift: 0.5 },
  { id: 'towels', at: [8, 4], img: 'towels', size: 1.6, front: 0.2, flip: true },
  // Cubby room: the kids sleep in cubbies, not beds. Five stacks of two along the wall is ten cubbies.
  ...[7, 8, 9, 10, 11].map((y, i) => ({ id: 'cubby-' + i, at: [1, y], img: 'cubbies', size: 2.0, front: 0.2, flip: true })),
  { id: 'socks', at: [4, 7], img: 'sock-basket', size: 0.9, front: 0.2 },
  { id: 'desk', at: [5, 7], img: 'desk', size: 1.4, front: 0.2 },
  { id: 'coats', at: [6, 7], img: 'coat-rack', size: 1.9, front: 0.2 },
  // Front hall: permission slip, backpack, show-and-tell, shoes
  { id: 'shoes', at: [9, 7], img: 'shoe-rack', size: 1.0, front: 0.2 },
  { id: 'hooks', at: [8, 7], img: 'backpack-hooks', size: 1.9, front: 0.2, flip: true },
  { id: 'hall-table', at: [13, 7], img: 'hall-table', size: 1.15, front: 0.2 },
  { id: 'shelf', at: [12, 7], img: 'show-shelf', size: 2.2, front: 0.2 },
  // Outside
  { id: 'stop-sign', at: [1, 13], img: 'bus-stop-sign', size: 2.4, front: 0.1 },
  { id: 'mailbox', at: [13, 13], img: 'mailbox', size: 1.5, front: 0.1 },
]

// Every tile furniture stands on.
export const SOLID = PROPS.flatMap((p) => [p.at, ...(p.more ?? [])])

// Small things that sit on furniture: `up` is how high off the floor, in floors. They stand just in front of the furniture's card.
export const SMALL = [
  { id: 'bowl', at: [4.9, 3.9], img: 'cereal-bowl', size: 0.5, up: 1.45 },
  { id: 'lunch-boxes', at: [3.95, 1.95], img: 'lunch-boxes', size: 0.55, up: 1.3 },
]

// Where a kid can stand and wait in each room, as tile middles. Six per room, picked by hand: never on furniture,
// never in a doorway or on the tile in front of one, and never on the hall runner, so the way through the house
// stays open however the day's needs are dealt. The game hands them out at random each day (src/game/world.js).
const mid = (tiles) => tiles.map(([x, y]) => [x + 0.5, y + 0.55])
export const SPOTS = {
  kitchen: mid([[4, 1], [6, 1], [2, 2], [1, 5], [5, 5], [6, 5]]),
  bath: mid([[9, 2], [11, 2], [13, 2], [13, 4], [8, 5], [12, 5]]),
  cubby: mid([[2, 8], [2, 10], [4, 8], [6, 8], [4, 11], [6, 11]]),
  hall: mid([[8, 8], [9, 8], [12, 8], [13, 9], [8, 11], [13, 11]]),
}

// Every floor tile of a room a kid can walk to (not furniture), or of all four rooms when no room is named.
export function floorTiles(room) {
  const out = []
  for (const key of room ? [room] : ['kitchen', 'bath', 'cubby', 'hall']) {
    const [x0, y0, x1, y1] = PLACES[key].box
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!SOLID.some((t) => t[0] === x && t[1] === y)) out.push([x, y])
  }
  return out
}

// The road and the far pavement start at this row. Nobody in the family walks there: the road is for the bus.
export const ROAD_Y = 15
