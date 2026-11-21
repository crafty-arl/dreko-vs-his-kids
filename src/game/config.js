// Numbers the whole game shares. Change them here, nowhere else.

export const TILE = 64 // one tile in the walk grid's own units (gm-tiles wants a real size, not 1)

// One fixed diagonal camera. It never turns or tilts, it only slides to follow Dreko.
export const CAMERA = { angle: -45, tilt: 42, distWide: 12.5, distTall: 17 }

// Wall heights in floors. Back walls are tall, the walls between rooms are low so nothing hides,
// and the walls nearest the camera are cut down to a kerb.
export const WALL = { tall: 2, half: 0.85, cut: 0.3 }

export const DREKO = { height: 1.85, speed: 3.1, radius: 0.24, start: [5.5, 2.6] }

// The one walk everyone shares (src/game/walk.js). Feel: "busy dad in a hurry", quick and bouncy.
// stride: tiles per step for each tile of height. bounce: lift per tile of height. rock and lean: radians.
// squash: how much shorter on landing. breath: how much taller on a breath in. kidsQuick: kids step a touch faster.
export const WALK = { stride: 0.4, bounce: 0.05, rock: 0.07, lean: 0.1, squash: 0.09, easeMs: 110, turnMs: 170, breath: 0.012, breathMs: 2800, kidsQuick: 1.12, kidSpeed: 2.4 }

// The clock, as Carl set it on Nov 20: 30 seconds to start, tune by playtesting.
// Each kid who makes the bus moves the next alarm earlier by `perKid` seconds (draft number).
// `cardMs` is how long the "bus left" card stays up. `hurry` is when the clock turns red, in seconds.
export const CLOCK = { firstLoop: 30, perKid: 10, cardMs: 3200, hurry: 10 }

// The one mini task move so far: hold, and let go on the line. The meter fills in `fillMs`; letting go between
// `from` and `to` (parts of the full meter) meets the need. `doneMs` is how long the tick shows. Draft numbers.
export const TASK = { fillMs: 1500, from: 0.62, to: 0.84, doneMs: 500 }

// The look of the screen overlay, as Carl picked on Nov 20: colour, with painted icons in the game's pen and
// watercolour look.
// icons: 'painted' (pictures from public/art/icons/, inked where one is missing), 'inked' (wobbly pen line
// over a wash of colour) or 'plain' (clean line).
export const UI = { icons: 'painted', overlay: 'colour' }

export const INK = '#070707'
export const PAPER = '#F1EEE7'
export const GOLD = '#BD8430'
