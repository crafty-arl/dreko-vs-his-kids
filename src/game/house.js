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
// tiles a wide thing covers, and `shift` [x, y] slides its picture so it sits over all of them. A thing whose picture is not painted yet is drawn as a grey labelled box
// (src/game/art.js LATER). `flip` mirrors a picture so its front faces into the room. The camera looks from the south-east, so the tall things stand against the north and
// west walls of a room and nothing tall stands in front of a place a kid waits.
// Which things, and where, is a draft of Nov 21 that Carl said go on. Each thing belongs to a need of its room.
export const PROPS = [
  // Kitchen: breakfast, packed lunch
  { id: 'fridge', at: [1, 1], img: 'fridge', size: 2.3, front: 0.3 }, // a wooden icebox
  { id: 'stove', at: [2, 1], img: 'stove', size: 2.2, front: 0.3 }, // a cast iron range with its stovepipe
  { id: 'counter', at: [3, 1], img: 'counter', size: 1.6, front: 0.3 }, // a cabinet with an enamel sink
  { id: 'pantry', at: [1, 3], img: 'pantry', size: 2.3, front: 0.2, flip: true },
  { id: 'table', at: [4, 3], img: 'table', size: 1.6, front: 0.33 },
  // the two chairs sit on the far sides of the table, each facing it
  { id: 'chair-a', at: [3, 3], img: 'chair', size: 1.35, front: 0.2, flip: true },
  { id: 'chair-b', at: [4, 2], img: 'chair', size: 1.35, front: 0.2 },
  // Bathroom: teeth brushed, antenna braids
  { id: 'vanity', at: [8, 1], img: 'vanity', size: 1.8, front: 0.2 },
  { id: 'sink', at: [10, 1], img: 'sink', size: 2.2, front: 0.2 }, // a pedestal sink under a mirror
  { id: 'toilet', at: [11, 1], img: 'toilet', size: 2.2, front: 0.2 }, // high tank and pull chain
  { id: 'tub', at: [12, 1], more: [[13, 1]], img: 'tub', size: 1.72, front: 0.2, shift: [0.5, 0] },
  { id: 'towels', at: [8, 4], img: 'towels', size: 1.6, front: 0.2, flip: true },
  // Cubby room: the kids sleep in cubbies, not beds. Five stacks of two along the wall is ten cubbies.
  ...[7, 8, 9, 10, 11].map((y, i) => ({ id: 'cubby-' + i, at: [1, y], img: 'cubbies', size: 2.0, front: 0.2, flip: true })),
  { id: 'socks', at: [4, 7], img: 'sock-basket', size: 0.9, front: 0.2 },
  { id: 'desk', at: [5, 7], img: 'desk', size: 1.65, front: 0.2 }, // a school desk with an inkwell and an oil lamp
  { id: 'coats', at: [6, 7], img: 'coat-rack', size: 1.9, front: 0.2 },
  // Front hall: permission slip, backpack, show-and-tell, shoes
  // the shoe rack is two tiles long, so it stands along the west wall by the front door
  { id: 'shoes', at: [8, 10], more: [[8, 11]], img: 'shoe-rack', size: 1.7, front: 0.2, shift: [0, 0.5] }, // painted for the west wall, so not flipped
  { id: 'hooks', at: [8, 7], img: 'backpack-hooks', size: 1.95, front: 0.2 }, // satchels and book straps; painted for the west wall
  { id: 'hall-table', at: [13, 7], img: 'hall-table', size: 1.15, front: 0.2 },
  { id: 'shelf', at: [12, 7], img: 'show-shelf', size: 2.2, front: 0.2 },
  // Outside
  { id: 'stop-sign', at: [1, 13], img: 'bus-stop-sign', size: 2.6, front: 0.1 },
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
  hall: mid([[8, 8], [9, 8], [12, 8], [13, 9], [9, 11], [13, 11]]),
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

// The still world around the home (Carl, Nov 21: "a still world around the home"). Nothing out here moves and
// nobody walks here. Places are in the house's own tile numbers, so they run below 0 and past the house.
// `at` is the point on the ground where the bottom middle of the picture stands, `size` its drawn height in
// tiles, `flip` mirrors it, `shade` puts a soft round shadow of that size on the ground under it. `narrow`
// squeezes a picture sideways: the houses were painted from a little lower than the game's camera, and a
// squeeze brings the slant of their walls closer to the slant of the ground.
// The camera looks from the south-east: tall things stand behind the house and beside it, where they hide
// nothing, and across the street (toward the camera) there are only low things, so Mom and the road stay in view.
// Which things, and where, is a draft of Nov 21 that Carl said go on.
export const OUTSIDE = [
  // neighbour houses: two behind the back fence, one next door on each side
  { id: 'n-house-1', at: [2.6, -6.4], img: 'house-a', size: 6.4, narrow: 0.9 },
  { id: 'n-house-2', at: [14.6, -6.6], img: 'house-b', size: 6.4, narrow: 0.9 },
  { id: 'w-house', at: [-5.6, 10.4], img: 'house-b', size: 6.4, narrow: 0.9 },
  { id: 'e-house', at: [25.6, 10.4], img: 'house-a', size: 6.4, narrow: 0.9 },
  // trees: behind the back walls, in the side yards, and far across the street
  { id: 'tree-1', at: [-2.6, -2.4], img: 'tree', size: 4.2, shade: 1.1 },
  { id: 'tree-2', at: [4.4, -2.2], img: 'tree', size: 3.8, flip: true, shade: 1 },
  { id: 'tree-3', at: [12.6, -2.6], img: 'tree', size: 4.2, shade: 1.1 },
  { id: 'tree-4', at: [17.6, -1.6], img: 'tree', size: 3.6, flip: true, shade: 0.95 },
  { id: 'tree-5', at: [-2.4, 8.6], img: 'tree', size: 3.9, flip: true, shade: 1 },
  { id: 'tree-6', at: [-6.5, 21.6], img: 'tree', size: 3.6, shade: 0.95 },
  { id: 'tree-7', at: [20.5, 21.4], img: 'tree', size: 3.6, flip: true, shade: 0.95 },
  // bushes: along the side walls of the house and along the far pavement
  { id: 'bush-1', at: [-1.2, 3.2], img: 'bush', size: 1.0 },
  { id: 'bush-2', at: [-1.3, 5.6], img: 'bush', size: 0.9, flip: true },
  { id: 'bush-3', at: [16.1, 2.6], img: 'bush', size: 1.0 },
  { id: 'bush-4', at: [16.2, 6.4], img: 'bush', size: 0.9, flip: true },
  { id: 'bush-5', at: [16.0, 8.8], img: 'bush', size: 1.0 },
  { id: 'bush-6', at: [3.4, 19.9], img: 'bush', size: 0.95 },
  { id: 'bush-7', at: [5.2, 20.1], img: 'bush', size: 0.85, flip: true },
  { id: 'bush-8', at: [12.6, 19.9], img: 'bush', size: 0.95 },
  { id: 'bush-9', at: [-2.5, 20.0], img: 'bush', size: 0.9, flip: true },
  // street things
  { id: 'lamp-1', at: [-3.2, 13.5], img: 'street-lamp', size: 3.4 },
  { id: 'lamp-2', at: [18.6, 13.5], img: 'street-lamp', size: 3.4 },
  { id: 'lamp-3', at: [14.6, 18.5], img: 'street-lamp', size: 3.4, flip: true },
  { id: 'hydrant', at: [15.8, 14.3], img: 'hydrant', size: 0.75 },
  { id: 'trash-cans', at: [16.4, 11.6], img: 'trash-cans', size: 1.15 },
]
// Flat things that stand as real upright sheets between two points: the picture is painted straight from the
// front and repeats every `every` tiles. `tall` is its height in floors.
export const SHEETS = [
  { id: 'fence-back', img: 'fence', from: [-4.5, -4.5], to: [19.5, -4.5], tall: 0.95, every: 1.93 },
  { id: 'fence-west', img: 'fence', from: [-4.5, -4.5], to: [-4.5, 13], tall: 0.95, every: 1.93 },
  { id: 'fence-east', img: 'fence', from: [19.5, -4.5], to: [19.5, 13], tall: 0.95, every: 1.93 },
  { id: 'clothesline', img: 'clothesline', from: [6.8, -2.4], to: [10.66, -2.4], tall: 1.6, every: 3.86 },
]

// The road and the far pavement start at this row. Nobody in the family walks there: the road is for the bus.
export const ROAD_Y = 15
