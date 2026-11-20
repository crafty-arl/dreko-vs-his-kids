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
- The **Map** button shows the tile map on top of the picture, for checking walls and doors.

Not in yet: walking frames, the clock, the kids' needs, the bus, mom and the driver, and sound.

## Run it

```bash
npm install
npm run dev
npm run build
```

## Credits and AI disclosure

This game uses generative AI: Claude for code, and Higgsfield (Nano Banana 2) for art. The full list of what AI made will be in the credits and in the itch.io AI disclosure at submission.

- **GM! 2.5D Map Engine** by Carl Lewis, made before the jam: `src/engine/gm-tiles.js` and `src/engine/gm-three.js`. The copy here has three small changes, each marked `DREKO` in the file (smooth drawing, walls of any height, cut-outs that stand upright).
- **three.js** (MIT licence), **React** and **Vite**.
- **Art** in `public/art/`: made with Higgsfield (Nano Banana 2) from Carl's character and world notes.
- **Sounds and music** in `public/`: custom tracks made for this game, plus `mixkit-tick-tock-clock-timer-1045.wav` from Mixkit (check the Mixkit licence before submission).
