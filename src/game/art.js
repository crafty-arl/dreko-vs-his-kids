// Loads the pictures and cuts them into the pieces the engine wants: square tile canvases for floors
// and wall faces, and square cut-outs for people and furniture.
import { KIDS, kidArt } from './family.js'
import { H, PLACES, ROWS, W, zone } from './house.js'
import { WALL, WORLD } from './config.js'

const TEXTURES = ['f-kitchen', 'f-bath', 'f-cubby', 'f-hall', 'f-runner', 'f-walk', 'f-road', 'w-kitchen', 'w-window', 'w-bath', 'w-cubby', 'w-hall', 'w-out']
const CUTOUTS = ['dreko', 'dreko-back', 'stove', 'fridge', 'counter', 'table', 'cereal-bowl', 'icons/sweat', ...KIDS.map(kidArt)]
// Pictures that may not be made yet. Until a file is in public/art/, the game draws a labelled grey stand-in.
const LATER = {
  bus: [2, 'BUS'], driver: [1, 'DRIVER'], mom: [0.5, 'MOM'], 'mom-back': [0.5, 'MOM back'],
  // the home's furniture, painted on Nov 21. A thing added to house.js before its picture exists goes here too.
  pantry: [0.5, 'PANTRY'], chair: [0.6, 'CHAIR'], 'lunch-boxes': [1.4, 'LUNCH'],
  vanity: [0.6, 'BRAID MIRROR'], sink: [0.6, 'SINK'], toilet: [0.8, 'TOILET'], tub: [2, 'BATHTUB'], towels: [0.6, 'TOWELS'],
  cubbies: [0.55, 'CUBBIES'], 'sock-basket': [1, 'SOCKS'], desk: [0.9, 'DESK'], 'coat-rack': [0.5, 'COATS'],
  'shoe-rack': [1.1, 'SHOES'], 'backpack-hooks': [0.6, 'BACKPACKS'], 'hall-table': [0.9, 'SLIP TABLE'], 'show-shelf': [0.5, 'SHOW SHELF'],
  'bus-stop-sign': [0.35, 'BUS STOP'], mailbox: [0.6, 'MAIL'],
  // the still world around the home, painted on Nov 21
  tree: [0.8, 'TREE'], bush: [1.2, 'BUSH'], 'house-a': [1.05, 'HOUSE A'], 'house-b': [1.05, 'HOUSE B'], 'street-lamp': [0.3, 'LAMP'],
  hydrant: [0.8, 'HYDRANT'], 'trash-cans': [1.2, 'TRASH'], fence: [2.1, 'FENCE'], clothesline: [1.8, 'WASHING LINE'],
} // name: [width for a height of 1, label]
const PX = 128 // one tile's picture is this many pixels across

const canvas = (w, h = w) => {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

function loadImage(url) {
  return new Promise((ok, no) => {
    const im = new Image()
    im.onload = () => ok(im)
    im.onerror = () => no(new Error('Missing picture: ' + url))
    im.src = url
  })
}

export async function loadArt() {
  const base = import.meta.env.BASE_URL + 'art/'
  const img = {}
  await Promise.all([
    ...TEXTURES.map(async (n) => (img[n] = await loadImage(base + n + '.jpg'))),
    ...CUTOUTS.map(async (n) => (img[n] = await loadImage(base + n + '.webp'))),
    ...Object.keys(LATER).map(async (n) => (img[n] = await loadImage(base + n + '.webp').catch(() => standIn(...LATER[n])))),
  ])
  // the grass of the still world: until its picture exists the ground is plain grey
  img['f-grass'] = await loadImage(base + 'f-grass.jpg').catch(() => null)
  // until Mom's back view exists, her front view stands in for it
  if (img['mom-back'].standIn && !img.mom.standIn) img['mom-back'] = img.mom
  return img
}

// A grey box with its name on it, for a picture that is not made yet.
function standIn(wide, label) {
  const h = 256
  const c = canvas(h * wide, h)
  const g = c.getContext('2d')
  g.fillStyle = '#a9a59b'
  g.strokeStyle = '#070707'
  g.lineWidth = 6
  g.beginPath()
  g.roundRect(4, 4, c.width - 8, h - 8, 26)
  g.fill()
  g.stroke()
  g.fillStyle = '#070707'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  // the name, split over lines and as big as fits the box
  const words = label.split(' ')
  let px = 46
  g.font = `700 ${px}px system-ui, sans-serif`
  const widest = Math.max(...words.map((w) => g.measureText(w).width))
  px = Math.max(16, Math.min(px, (px * (c.width - 28)) / widest))
  g.font = `700 ${px}px system-ui, sans-serif`
  words.forEach((w, i) => g.fillText(w, c.width / 2, h / 2 + (i - (words.length - 1) / 2) * px * 1.05))
  c.standIn = true
  return c
}

// A picture kept at its own shape (the bus is wider than it is tall): [canvas, width for a height of 1].
// `lean` slides the picture down as it goes right (up, if negative), by that share of its width. Upright lines
// stay upright. It turns a thing that was painted too front-on so that it lies along a wall of the diagonal room.
export function card(im, flip = false, lean = 0) {
  const drop = Math.abs(lean) * im.width
  const c = canvas(im.width, im.height + drop)
  const g = c.getContext('2d')
  g.transform(1, lean, 0, 1, 0, lean < 0 ? drop : 0)
  if (flip) {
    g.translate(im.width, 0)
    g.scale(-1, 1)
  }
  g.drawImage(im, 0, 0)
  if (!lean) return [c, c.width / c.height]
  // a lean leaves empty rows under the picture's lowest point: cut them off, so its feet stand on the card's bottom edge
  const px = g.getImageData(0, 0, c.width, c.height).data
  let last = c.height - 1
  const empty = (y) => {
    for (let x = 0, i = y * c.width * 4 + 3; x < c.width; x++, i += 4) if (px[i] > 127) return false
    return true
  }
  while (last > 0 && empty(last)) last--
  const cut = canvas(c.width, last + 1)
  cut.getContext('2d').drawImage(c, 0, 0)
  return [cut, cut.width / cut.height]
}

// A person or a thing as a square cut-out with its feet on the bottom edge.
export function cutout(im, flip = false) {
  const s = im.height
  const c = canvas(s)
  const g = c.getContext('2d')
  if (flip) {
    g.translate(s, 0)
    g.scale(-1, 1)
  }
  g.drawImage(im, (s - im.width) / 2, 0)
  return c
}

// Builds the cell for every tile on every floor. Returns the map gm-three draws.
export function buildHouse(img, ink) {
  const cache = new Map()
  // A piece of a texture, u0..u1 across and v0..v1 down, laid into the top `fill` part of a tile canvas.
  // `flip` mirrors it: the engine paints a wall's own face from right to left.
  const piece = (name, u0, u1, v0, v1, shade, flip, fill = 1) => {
    const key = [name, u0, u1, v0, v1, shade, flip, fill].join('|')
    let c = cache.get(key)
    if (c) return c
    const im = img[name]
    c = canvas(PX)
    const g = c.getContext('2d')
    g.imageSmoothingQuality = 'high'
    if (flip) {
      g.translate(PX, 0)
      g.scale(-1, 1)
    }
    g.drawImage(im, u0 * im.width, v0 * im.height, (u1 - u0) * im.width, (v1 - v0) * im.height, 0, 0, PX, PX * fill)
    if (shade) {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.fillStyle = `rgba(7,7,7,${shade})`
      g.fillRect(0, 0, PX, PX * fill)
    }
    cache.set(key, c)
    return c
  }
  const plain = (colour) => {
    let c = cache.get(colour)
    if (!c) {
      c = canvas(PX)
      const g = c.getContext('2d')
      g.fillStyle = colour
      g.fillRect(0, 0, PX, PX)
      cache.set(colour, c)
    }
    return c
  }
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0

  // Floors: each picture covers 2 x 2 tiles, and no two neighbours are quite the same shade.
  const floorOf = (x, y) => {
    const z = zone(x, y)
    if (!z) return null
    const shade = [0, 0.04, 0.08][hash(x, y) % 3]
    const v0 = (y & 1) / 2
    if (z === 'runner') return piece('f-runner', (x - 10) / 2, (x - 9) / 2, v0, v0 + 0.5, shade, false)
    const name = z === 'road' ? 'f-road' : PLACES[z].floor
    return piece(name, (x & 1) / 2, (x & 1) / 2 + 0.5, v0, v0 + 0.5, shade, false)
  }

  // Walls: a wall picture is 2 tiles wide and WALL.tall floors high. A block shows the slice of it between
  // the heights y0 and y1. `half` picks the left or right tile of the picture.
  const cap = plain('#d8d2c5')
  const face = (name, half, y0, y1, shade) =>
    piece(name, half / 2, half / 2 + 0.5, 1 - y1 / WALL.tall, 1 - y0 / WALL.tall, shade, true, y1 - y0)

  const wallOf = (x, y, level) => {
    const tall = y === 0 || x === 0
    const height = tall ? WALL.tall : y === 12 || x === 14 ? WALL.cut : WALL.half
    if (level >= height) return null
    const y0 = level
    const y1 = Math.min(height, level + 1)
    let south, east
    if (y === 0) {
      // the back wall: its south side is the room's wall
      const name = x <= 7 ? (x === 4 || x === 5 ? 'w-window' : 'w-kitchen') : 'w-bath'
      south = face(name, x & 1, y0, y1, 0)
      if (x === 14) east = face('w-out', 1, y0, y1, 0.12)
    } else if (x === 0) {
      // the left wall: its east side is the room's wall
      east = face(y <= 6 ? 'w-kitchen' : 'w-cubby', (y & 1) ^ 1, y0, y1, 0.1)
      if (y === 12) south = face('w-out', 0, y0, y1, 0)
    } else if (y === 12) south = face('w-out', x & 1, y0, y1, 0)
    else if (x === 14) east = face('w-out', (y & 1) ^ 1, y0, y1, 0.12)
    else if (y === 6) south = face(x < 7 ? 'w-cubby' : 'w-hall', x & 1, y0, y1, 0)
    else if (x === 7) east = face(y < 6 ? 'w-bath' : 'w-hall', (y & 1) ^ 1, y0, y1, 0.1)
    return { img: cap, top: cap, faces: [undefined, east, south, undefined], height: y1 - y0 }
  }

  // Outside the house: the pavement, the road and the far pavement run on past both ends of the house, and
  // the rest is plain ground. The house keeps its own tile numbers; the engine's map starts `M` tiles before it.
  const M = WORLD.margin
  // the grass picture covers `G` x `G` tiles, so the eye does not catch it repeating
  const G = WORLD.grassTiles
  const part = (n) => (((n % G) + G) % G) / G
  const ground = (x, y) => {
    if (y >= 13 && y < H) return floorOf(x, y)
    if (img['f-grass']) return piece('f-grass', part(x), part(x) + 1 / G, part(y), part(y) + 1 / G, 0, false)
    return plain(WORLD.ground[hash(x, y) % WORLD.ground.length])
  }

  const levels = {}
  for (const level of [0, 1]) {
    const cells = []
    for (let y = -M; y < H + M; y++) {
      const row = []
      cells.push(row)
      for (let x = -M; x < W + M; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) row.push(level === 0 ? { img: ground(x, y) } : null)
        else row.push(ROWS[y][x] === '#' ? wallOf(x, y, level) : level === 0 ? { img: floorOf(x, y) } : null)
      }
    }
    levels[level] = { cell: (x, y) => cells[y][x] }
  }
  return { w: W + 2 * M, h: H + 2 * M, levels, flat: true, ink }
}
