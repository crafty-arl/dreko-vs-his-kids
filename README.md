# Dreko vs His Kids

Alien dad Dreko has one morning to get his ten kids on the school bus. The bus leaves, and the morning loops.

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
- The bus clock and the morning loop: the clock starts when Dreko first moves and runs down from 30 seconds. At zero the bus leaves, a card says so, and the morning starts over with Dreko back in the kitchen and every need he has learned still known. His anxiety climbs as the clock runs down. The clock waits while the need list is open.
- The icon set: 16 painted icons in `public/art/icons/` (ten needs, the question mark, clock, bus, sweat drop, tick and stick). `src/game/Icon.jsx` also holds a hand-inked line version of each as a fallback.

- The first mini task (`src/game/Task.jsx`): stand next to a kid and press A (or E, Space, or the gold **Help** button). One move so far, from the game map: hold, and let go on the gold line. Too soon or too far and you try again. The clock keeps running. **All ten needs use this one move for now, as a stand-in.**
- Boarding: a kid whose need is met walks to the bus stop on the shared walk and waits there. When the clock hits zero the bus takes whoever is at the stop, and the next morning starts with 10 more seconds for each kid who made it. A kid who boarded is back in their room the next morning.
- The win: all ten at the stop before the bus leaves. For now it is a card with words, and **Play again** starts a fresh game.

- Sound (`src/game/sound.js`): the tick-tock for the last 10 seconds before the bus, `Bus-lose.mp3` while the "bus left" card is up, and `Bus-win.mp3` on the win. Nothing plays until the first tap or key, as browsers ask. The **Sound** button turns it off and on. `menu.mp3` waits for a title screen and `Dad-died.mp3` has no moment in the game yet.

Not in yet: the other mini task moves (spin, rhythm, mash, trace), the bus, mom and the driver as pictures, the title and ending screens, drawn walking frames, the needs shuffle, and sound effects (steps, task done, kid boards).

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
