// The GM! 2.5D Map Engine files are plain scripts, not ES modules. Depending on how they are loaded they either
// hang themselves on the global object (dev server) or hand back module.exports (production build). Take whichever.
import * as tiles from './gm-tiles.js'
import * as three from './gm-three.js'

export const GMTiles = globalThis.GMTiles || tiles.default || tiles
export const GMThree = globalThis.GMThree || three.default || three
