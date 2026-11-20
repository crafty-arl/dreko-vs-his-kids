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
- The screen overlay (`src/game/Overlay.jsx`): bus clock, kids on the bus, Dreko's anxiety, a bubble over each kid and the need list on Y. A kid's bubble is a question mark until Dreko walks up to them, then it shows their need. The clock, the anxiety and the bus count do not run yet.
- The icon set: 16 painted icons in `public/art/icons/` (ten needs, the question mark, clock, bus, sweat drop, tick and stick). `src/game/Icon.jsx` also holds a hand-inked line version of each as a fallback.

Not in yet: drawn walking frames, the clock, the kids' needs, the bus, mom and the driver, and sound.

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
