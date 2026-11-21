# Dreko vs His Kids

Alien dad Dreko has to get his ten kids on the school bus every morning of the school week. Miss the bus, and the day loops.

An entry for **Tiny Loop Jam 2026**. The jam window runs from Nov 20, 18:00 UTC to Nov 29, 18:00 UTC. Theme: "Small action. Big change."

## Stack

- Vite
- React
- three.js
- Deployed on Cloudflare Pages

## What is in so far

- The house as a tile map (`src/game/house.js`): Kitchen, Bathroom, Cubby room, Front hall and the Bus stop.
- The ten kids standing in their rooms (`src/game/family.js`).
- Dreko walks. Tap the floor, use the arrow keys or WASD, or use a controller stick or D-pad.
- One fixed diagonal camera that follows him.
- One shared walk for the whole family (`src/game/walk.js`): a step bounce, a rock, a lean, a squash on landing, a slow breath when standing, and a paper-card turn. It is code only and uses the art as it is. The **Walk test** button makes every kid pace so the walk can be checked.
- The **Map** button shows the tile map on top of the picture, for checking walls and doors.
- The screen overlay (`src/game/Overlay.jsx`): bus clock, kids on the bus, Dreko's anxiety, a bubble over each kid and the need list on Y. A kid's bubble is a question mark until Dreko walks up to them, then it shows their need.
- The school week (`WEEK` in `src/game/config.js`): each loop is a day, Monday to Friday. A day starts when Dreko first moves and the clock runs down from 30 seconds. If the bus leaves without all ten, the same day starts over: Dreko keeps what he learned, and every kid he got on the bus buys the next try 10 more seconds. When all ten board, the next day starts with new needs and more of them (10, 12, 14, 16, then 18), so more kids need two things. After Friday the week is done. The clock waits while the need list is open.
- The icon set: 16 painted icons in `public/art/icons/` (ten needs, the question mark, clock, bus, sweat drop, tick and stick). `src/game/Icon.jsx` also holds a hand-inked line version of each as a fallback.

- The mini tasks (`src/game/Task.jsx` and `src/game/tasks/`): stand next to a kid and press A (or E, Space, or the gold **Help** button). Four moves cover every need, and `MOVES` in `src/game/needs.js` says which need uses which. A miss only costs time, and the clock keeps running. Each works on a controller, the keyboard and a touch screen.
  - **Hold** (breakfast, teeth): hold A and let go on the gold line.
  - **Pieces** (packed lunch, homework, show-and-tell): pieces come one at a time; pick the spot each belongs in and drop it.
  - **Trace** (permission slip, backpack): move the pen along the dotted line through every dot.
  - **Sides** (braids, socks, jacket, shoes): press left or right as each step lights up.
  - The shapes, numbers and lines inside the tasks are stand-ins until each need has its own pictures.
- Boarding: a kid with nothing left to do walks to the bus stop on the shared walk and waits there. When the clock hits zero the bus takes whoever is at the stop.
- The win: all ten on the bus on Friday. For now it is a card with words, and **Play again** starts a new week.

- The need deal (`dealDay` in `src/game/needs.js`): there are 11 needs in the pool. Every day deals new ones at random: every kid gets one, and as the week goes on more kids get a second. The 11th need, Shoes tied, has a line icon as a stand-in until it gets a painted one.
- Sound (`src/game/sound.js`): `menu.mp3` loops through the whole game. On top of it, the tick-tock plays for the last 10 seconds before the bus, `Bus-lose.mp3` while the "bus left" card is up, and `Bus-win.mp3` on the win. The menu music fades out under those last two and comes back after. Nothing plays until the first tap or key, as browsers ask. The **Sound** button turns it off and on. `Dad-died.mp3` has no moment in the game yet.

Not in yet: each need's own task pictures, the bus, mom and the driver as pictures, the title and ending screens, drawn walking frames, kids placed in rooms by their need, and sound effects (steps, task done, kid boards).

## Run it

```bash
npm install
npm run dev
npm run build
```

## Credits and AI disclosure

This game uses generative AI: Claude for code, and Higgsfield (Nano Banana 2) for art. The full list of what AI made will be in the credits and in the itch.io AI disclosure at submission.

- **GM! 2.5D Map Engine** by Carl Lewis, made before the jam: `src/engine/gm-tiles.js` and `src/engine/gm-three.js`. The copy here has four small changes, each marked `DREKO` in the file (smooth drawing, walls of any height, cut-outs that stand upright, and a width and tip on each cut-out for the walk).
- **three.js** (MIT licence), **React** and **Vite**.
- **Anton** font (SIL Open Font Licence), through the `@fontsource/anton` package.
- **Art** in `public/art/`: made with Higgsfield (Nano Banana 2) from Carl's character and world notes. This includes the 16 icons in `public/art/icons/`, made on Nov 20 inside the jam window.
- **Sounds and music** in `public/`: custom tracks made for this game, plus `mixkit-tick-tock-clock-timer-1045.wav` from Mixkit (check the Mixkit licence before submission).
