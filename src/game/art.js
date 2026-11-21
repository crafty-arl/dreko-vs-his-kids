// Loads the pictures and cuts them into the pieces the engine wants: square tile canvases for floors
// and wall faces, and square cut-outs for people and furniture.
import { KIDS, kidArt } from './family.js'
import { H, PLACES, ROWS, W, zone } from './house.js'
import { WALL } from './config.js'

const TEXTURES = ['f-kitchen', 'f-bath', 'f-cubby', 'f-hall', 'f-runner', 'f-walk', 'f-road', 'w-kitchen', 'w-window', 'w-bath', 'w-cubby', 'w-hall', 'w-out']
const CUTOUTS = ['dreko', 'dreko-back', 'stove', 'fridge', 'counter', 'table', 'cereal-bowl', ...KIDS.map(kidArt)]
// Pictures that may not be made yet. Until a file is in public/art/, the game draws a labelled grey stand-in.
const LATER = { bus: [2, 'BUS'], driver: [1, 'DRIVER'], mom: [0.5, 'MOM'], 'mom-back': [0.5, 'MOM back'] } // name: [width for a height of 1, label]
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
  g.font = `700 ${wide < 1 ? 30 : 44}px system-ui, sans-serif`
  g.fillText(label, c.width / 2, h / 2 - 16)
  g.font = `${wide < 1 ? 17 : 22}px system-ui, sans-serif`
  g.fillText('stand-in', c.width / 2, h / 2 + 22)
  return c
}

// A picture kept at its own shape (the bus is wider than it is tall): [canvas, width for a height of 1].
export function card(im) {
  const c = canvas(im.width, im.height)
  c.getContext('2d').drawImage(im, 0, 0)
  return [c, im.width / im.height]
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

  const levels = {}
  for (const level of [0, 1]) {
    const cells = []
    for (let y = 0; y < H; y++) {
      cells.push([])
      for (let x = 0; x < W; x++) {
        const isWall = ROWS[y][x] === '#'
        cells[y].push(isWall ? wallOf(x, y, level) : level === 0 ? { img: floorOf(x, y) } : null)
      }
    }
    levels[level] = { cell: (x, y) => cells[y][x] }
  }
  return { w: W, h: H, levels, flat: true, ink }
}
