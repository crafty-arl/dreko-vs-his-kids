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
// the camera from the tile's middle (the pictures are drawn from their front corner).
export const PROPS = [
  { id: 'fridge', at: [1, 1], img: 'fridge', size: 2.3, front: 0.3 },
  { id: 'stove', at: [2, 1], img: 'stove', size: 1.45, front: 0.3 },
  { id: 'counter', at: [3, 1], img: 'counter', size: 1.5, front: 0.3 },
  { id: 'table', at: [3, 3], img: 'table', size: 1.6, front: 0.33 },
]

// Small things that sit on furniture: `up` is how high off the floor, in floors. They stand just in front of the furniture's card.
export const SMALL = [{ id: 'bowl', at: [3.9, 3.9], img: 'cereal-bowl', size: 0.5, up: 1.45 }]

// Where a kid can stand and wait in each room, as tile middles. Six per room, picked by hand: never on furniture,
// never in a doorway or on the tile in front of one, and never on the hall runner, so the way through the house
// stays open however the day's needs are dealt. The game hands them out at random each day (src/game/world.js).
const mid = (tiles) => tiles.map(([x, y]) => [x + 0.5, y + 0.55])
export const SPOTS = {
  kitchen: mid([[4, 1], [6, 1], [2, 2], [1, 5], [5, 5], [6, 5]]),
  bath: mid([[9, 1], [11, 1], [13, 2], [13, 4], [8, 5], [12, 5]]),
  cubby: mid([[1, 7], [5, 7], [1, 9], [1, 11], [4, 11], [6, 11]]),
  hall: mid([[8, 7], [8, 11], [13, 7], [13, 9], [13, 11], [12, 8]]),
}

// Every floor tile of a room a kid can walk to (not furniture), or of all four rooms when no room is named.
export function floorTiles(room) {
  const out = []
  for (const key of room ? [room] : ['kitchen', 'bath', 'cubby', 'hall']) {
    const [x0, y0, x1, y1] = PLACES[key].box
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!PROPS.some((p) => p.at[0] === x && p.at[1] === y)) out.push([x, y])
  }
  return out
}

// The road and the far pavement start at this row. Nobody in the family walks there: the road is for the bus.
export const ROAD_Y = 15
