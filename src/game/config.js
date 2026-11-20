// Numbers the whole game shares. Change them here, nowhere else.

export const TILE = 64 // one tile in the walk grid's own units (gm-tiles wants a real size, not 1)

// One fixed diagonal camera. It never turns or tilts, it only slides to follow Dreko.
export const CAMERA = { angle: -45, tilt: 42, distWide: 12.5, distTall: 17 }

// Wall heights in floors. Back walls are tall, the walls between rooms are low so nothing hides,
// and the walls nearest the camera are cut down to a kerb.
export const WALL = { tall: 2, half: 0.85, cut: 0.3 }

export const DREKO = { height: 1.85, speed: 3.1, radius: 0.24, start: [5.5, 2.6] }

// The clock, as Carl set it on Nov 20: 30 seconds to start, tune by playtesting.
// Each kid who makes the bus moves the next alarm earlier by `perKid` seconds (draft number).
export const CLOCK = { firstLoop: 30, perKid: 10 }

export const INK = '#070707'
export const PAPER = '#F1EEE7'
export const GOLD = '#BD8430'
