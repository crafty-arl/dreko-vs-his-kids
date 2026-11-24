// Numbers the whole game shares. Change them here, nowhere else.

export const TILE = 64 // one tile in the walk grid's own units (gm-tiles wants a real size, not 1)

// One fixed diagonal camera. It never turns or tilts, it only slides to follow Dreko.
export const CAMERA = { angle: -45, tilt: 42, distWide: 12.5, distTall: 17 }

// Room view (Carl, Nov 21: "better camera angles"). Indoors the camera does not chase Dreko: it frames the whole
// room he is in and slides to the next room when he walks through a door. The angle never changes.
// `wide` and `tall` are how many tiles of screen a room needs across and down, `per` is how many tiles the
// screen shows down its height for each unit of camera distance, `shift` moves the view off the room's middle
// (the near corner of a room looks bigger than the far one, so the middle of the picture is not the middle of
// the floor), and `slideMs` is how quickly it moves between rooms. Drafts to tune.
export const ROOM_VIEW = { on: true, wide: 8.7, tall: 10.4, per: 0.715, shift: [-1.3, -0.7], slideMs: 320 }

// Wall heights in floors. Back walls are tall, the walls between rooms are low so nothing hides,
// and the walls nearest the camera are cut down to a kerb.
export const WALL = { tall: 2, half: 0.85, cut: 0.3 }

export const DREKO = { height: 1.85, speed: 3.1, radius: 0.24, start: [5.5, 2.6] }
// The opening scene (Carl, Nov 23: "we need a small cutscene in the beginning"): Mom walks up on her side of the
// street and says her line, Dreko stands across the street looking at her, "all sad looking", then he goes into
// the house, and a 3, 2, 1 counts the morning in. It plays when Start is pressed on the title screen, and a tap,
// A or Enter skips it. `line` is Carl's own rough wording ("Don't forget it's your week. Don't be late or
// something like that"): the final words are his. `dreko` is where he stands, `mom` where she walks from and to
// along her pavement, `cam` where the camera looks, `door` the spot inside the front door he walks to,
// `lineMs` how long the line stays up, `countMs` how long each number shows.
export const INTRO = { line: "Don't forget, it's your week. Don't be late.", dreko: [10.5, 13.7], mom: [14.8, 11.2], cam: [10.4, 15.4], door: [10.5, 11.4], lineMs: 3800, countMs: 750, slump: 0.95 }

// Help at doors and corners when the player steers with a stick or the keys: when the way Dreko is pushed is
// blocked, but it is open within `reach` tiles to one side, he slips over to it, at most `step` tiles a frame.
export const DOOR_HELP = { reach: 0.45, step: 0.05 }

// The one walk everyone shares (src/game/walk.js). Feel: "busy dad in a hurry", quick and bouncy.
// stride: tiles per step for each tile of height. bounce: lift per tile of height. rock and lean: radians.
// squash: how much shorter on landing. breath: how much taller on a breath in. kidsQuick: kids step a touch faster.
export const WALK = { stride: 0.4, bounce: 0.05, rock: 0.07, lean: 0.1, squash: 0.09, easeMs: 110, turnMs: 170, breath: 0.012, breathMs: 2800, kidsQuick: 1.12, kidSpeed: 2.4 }

// The clock, as Carl set it on Nov 20: 30 seconds to start, tune by playtesting.
// Each kid who makes the bus moves the next alarm earlier by `perKid` seconds (draft number).
// `hurry` is when the clock turns red, in seconds. The "bus left" and "day done" cards stay up until Continue.
// `forgotMs` is how long a kid stands at the bus stop saying "Oh wait, I forgot something!" before they turn back.
export const CLOCK = { firstLoop: 30, perKid: 10, hurry: 10, forgotMs: 1300 }

// The school week (Carl and Tessa, Nov 21): each loop is a day, Monday to Friday, and nobody goes to school
// at the weekend. `needs` is how many needs are in the house on each day, so every day is harder than the
// last. Every kid has a need every day (Carl, Nov 21: "all kids have needs all the needs reset"), so the
// count starts at ten, and each step up gives more kids a second need. The numbers are a draft to tune.
// `tries` (Carl, Nov 22): "we only give them 3 tries" to finish a morning. When the bus leaves without all ten on
// the last try the game is over and it starts from scratch, at the first Monday.
export const WEEK = { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], needs: [10, 12, 14, 16, 18], tries: 3 }

// Past the first Friday (Carl, Nov 22: "the gameplay level continues and increases and it keeps getting
// difficult"). There is no last week. From week 2 every kid has two needs every day (`needs`), the kids are on
// the move every day, each morning starts with `lessTime` fewer seconds than the one before, down to
// `leastTime`, and each week the kids walk `roamFaster` tiles a second faster, up to `roamFastest`.
// Every number is a draft to tune by playing (src/game/level.js does the sums).
export const HARDER = { needs: 20, lessTime: 2, leastTime: 16, roamFaster: 0.15, roamFastest: 2.2 }

// Kids on the move (Carl and Tessa, Nov 21): on day 4 and day 5 "the kids should be able to be walking around the
// house and you have to catch the kid to get that need done". `fromDay` counts from 0, so 3 is Thursday.
// `where` is 'room' (a kid walks around the room of the need they have) or 'house' (anywhere indoors).
// `speed` is tiles a second, slower than Dreko so he can catch them. `restMs` is how long they stand between walks.
export const ROAM = { fromDay: 3, where: 'room', speed: 1.5, restMs: [300, 1100] }

// The bus, its driver and Mom (the ending from the game map: kids board one by one, the driver nods, Mom is
// across the street watching). `at` is where the bus stops, `from` and `to` the x it drives in from and off to,
// `speed` tiles a second, `size` its drawn height in tiles. `comeAt`: it pulls up when this many seconds are left.
// `boardMs`: the pause between two kids getting on. `nodMs`: how long the driver's nod takes.
// `driver` is where his picture sits on the bus picture: across from its middle and up from its bottom edge,
// in tiles of the drawn bus, so he lands behind the windshield.
// `mom` is where she stands to watch the bus scene. `cam` is where the camera looks while it plays.
// `pace`: Mom paces the far pavement between the x of `from` and `to` at `speed` tiles a second, and stops for
// `restMs` to look at the house (Carl, Nov 21: "mom pacing the streets and trying to look into the house").
// Every number is a draft. A picture that is not in public/art/ yet is drawn as a grey stand-in.
// The still world around the home: the engine's map is `margin` tiles bigger than the house on every side, so the
// house no longer floats in empty space. Nobody walks out there. The street runs on past both ends of the house
// with the tiles it already has; the rest is grass (one picture over `grassTiles` x `grassTiles` tiles), or the
// `ground` greys while that picture is missing. What stands out there is in src/game/house.js OUTSIDE and SHEETS.
// Everything out there stays black, white and grey (Carl's colour rule). The margin covers the bus's whole drive.
export const WORLD = { margin: 12, ground: ['#bcb8ad', '#b6b2a7', '#b0aca1'], grassTiles: 3, sky: '#bab9b4' }

// `hop` and `hopMs`: the little jump a kid does on reaching the bus stop, in tiles and milliseconds (a draft).
export const BUS = { at: [6.5, 15.9], from: -7, to: 24, speed: 9, size: 2.7, comeAt: 10, boardMs: 170, nodMs: 1100, hop: 0.38, hopMs: 420, driver: [0.65, 1.52], driverSize: 0.55, mom: [9.6, 17.7], momSize: 1.9, pace: { from: 2.5, to: 12.5, speed: 1.3, restMs: [900, 1900] }, cam: [6.9, 15.5] }

// Dreko's anxiety, from 0 (calm) to 1. It climbs with the clock: the part of the try that is gone. Every need
// he gets done takes `perDone` off and every kid counted takes `perCounted` off (the game map: "His anxiety
// eases as he learns each kid"; since Nov 23 there is no learning, so a need done is what eases it). A miss in a
// mini task adds `perMiss`, which wears off by `settle` a second.
// What it does (Carl's pick, Nov 21): above `shakyFrom` his hands shake in the mini tasks, more the higher it
// is: the gold zone of a hold shrinks by up to `shrink` of its width and the pen of a trace wobbles by up to
// `wobble` card units. Above `sweatFrom` sweat drops fly off him. `breathMs` is the deep breath he takes when
// it drops. Every number is a draft to tune by playing.
export const ANXIETY = { perDone: 0.03, perCounted: 0.03, perMiss: 0.08, settle: 0.012, shakyFrom: 0.45, shrink: 0.45, wobble: 9, sweatFrom: 0.55, breathMs: 900 }

// Every mini task: `doneMs` is how long the tick shows before the kid walks off. Each need's own task
// settings are in src/game/needs.js (MOVES).
export const TASK = { doneMs: 500 }

// How to play (Carl, Nov 22): a practice morning with the bus clock stopped. Seven kids are ready at the bus
// stop already; these three still need Dreko. Between them the four needs use all four moves, and the last
// kid has two needs, so the "Oh wait, I forgot something!" walk back is in it too. A draft to tune.
export const TUTOR = { needs: { Tix: ['breakfast'], Zhar: ['lunch'], Pobo: ['backpack', 'jacket'] } }

// The market (Carl, Nov 23: a marketplace in between, "to add strategy and points to spend in order to last
// different weeks", and "the shop should be item based"). It opens after every morning that is won.
// `points`: what a won morning pays: `won` for winning it, `perTryLeft` for each try not used, and `perSecond`
// for each whole second left on the clock, up to `mostSeconds` of them (a later try has a long clock).
// Points and what is in Dreko's pockets carry over from morning to morning and are gone at game over.
// `pockets` is how many things he can carry. Each thing is used once, when the player picks the moment.
// The five things are the ones Carl picked on Nov 23. Every number and every word here is a draft to tune.
// Nov 23 night, Carl: "The first time I went into the store, I was able to buy 2 perks when I should be able to
// buy 1. So I think our prices are too cheap." So a won morning now pays 5 to 9 and the things cost 5 to 8: one
// win always buys one thing and never two; a second thing takes points saved from another morning.
// skates: Dreko walks `faster` times as fast until that day is done. watch: the bus clock stops for `seconds`.
// whistle: every kid walking around stands still for `seconds`. coin: once the bus is at the stop, it waits
// `seconds` more. candy: the kid Dreko is standing next to does their own need.
export const MARKET = {
  points: { won: 5, perTryLeft: 1, perSecond: 1, mostSeconds: 2 },
  pockets: 3,
  items: {
    skates: { name: 'Roller skates', does: 'Dreko is faster until the day is done', price: 7, faster: 1.35 },
    watch: { name: 'Pocket watch', does: 'The clock stops for 5 seconds', price: 6, seconds: 5 },
    whistle: { name: 'Whistle', does: 'Kids on the move stand still for 5 seconds', price: 5, seconds: 5 },
    coin: { name: 'Coin for the driver', does: 'The bus waits 5 more seconds', price: 6, seconds: 5 },
    candy: { name: 'Piece of candy', does: 'One kid does their own need', price: 8 },
  },
}

// The look of the screen overlay, as Carl picked on Nov 20: colour, with painted icons in the game's pen and
// watercolour look.
// icons: 'painted' (pictures from public/art/icons/, inked where one is missing), 'inked' (wobbly pen line
// over a wash of colour) or 'plain' (clean line).
export const UI = { icons: 'painted', overlay: 'colour' }

export const INK = '#070707'
export const PAPER = '#F1EEE7'
export const GOLD = '#BD8430'
