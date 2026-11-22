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
- Furniture in every room (`PROPS` and `SMALL` in `src/game/house.js`, pictures in `public/art/`): each thing belongs to a need of its room, such as the sink for teeth, the ten sleep cubbies, the sock basket and the shoe rack. Tall things stand against the two back walls so nothing hides a kid. `flip` turns a picture to face into the room. Since Nov 22 the things are from the 1920s (Carl: "the props need to be more 1920s"): an icebox, a cast iron range, a pedestal sink, a high-tank toilet, a school desk, satchels on hooks, and a wooden school bus.
- Room view (`ROOM_VIEW` in `src/game/config.js`): indoors the camera frames the whole room Dreko is in and slides to the next room at a door. Outside it follows him, and the bus scene is watched from closer. The diagonal angle never changes.
- The still world around the home (`WORLD` in `src/game/config.js`, `OUTSIDE` and `SHEETS` in `src/game/house.js`): the map the engine draws is `margin` tiles bigger than the house on every side. The pavement and road run on past both ends of the house and the rest is grass. Out there stand trees, bushes, four neighbour houses, street lamps, a fire hydrant and trash cans (cut-out pictures), and a picket fence and a washing line (pictures painted from the front, stood up as real sheets so they run true along the ground). All of it is grey, nothing moves and nobody walks there. Tall things stand behind and beside the house; across the street there are only low things, because the camera looks from that side. The game keeps the house's own tile numbers; `src/game/world.js` moves every place over by the margin when it talks to the engine. The prompts are in `tools/prop-guide/world-prompts.md`.
- The ten kids (`src/game/family.js`). Each day they are dealt across the rooms by what they need.
- Dreko walks. Tap the floor, use the arrow keys or WASD, or use a controller stick or D-pad.
- One fixed diagonal camera that follows him.
- One shared walk for the whole family (`src/game/walk.js`): a step bounce, a rock, a lean, a squash on landing, a slow breath when standing, and a paper-card turn. It is code only and uses the art as it is. The **Walk test** button makes every kid pace so the walk can be checked.
- The **Map** button shows the tile map on top of the picture, for checking walls and doors.
- The screen overlay (`src/game/Overlay.jsx`): bus clock, kids on the bus, Dreko's anxiety, a bubble over each kid and the need list on Y. A kid's bubble is a question mark until Dreko walks up to them, then it shows their need.
- The school week (`WEEK` in `src/game/config.js`): each loop is a day, Monday to Friday. A day starts when Dreko first moves and the clock runs down from 30 seconds. If the bus leaves without all ten, the same day starts over: Dreko keeps what he learned, and every kid he got on the bus buys the next try 10 more seconds. When all ten board, the next day starts with new needs and more of them (10, 12, 14, 16, then 18), so more kids need two things. After Friday the week is done. The clock waits while the need list is open.
- The icon set: 16 painted icons in `public/art/icons/` (ten needs, the question mark, clock, bus, sweat drop, tick and stick). `src/game/Icon.jsx` also holds a hand-inked line version of each as a fallback.

- The mini tasks (`src/game/Task.jsx` and `src/game/tasks/`): stand next to a kid and press A (or E, Space, or the gold **Help** button). Four moves cover every need, and `MOVES` in `src/game/needs.js` says which need uses which. A miss costs time and raises Dreko's anxiety, and the clock keeps running. Each works on a controller, the keyboard and a touch screen.
  - **Hold** (breakfast, teeth): hold A and let go on the gold line.
  - **Pieces** (packed lunch, homework, show-and-tell): pieces come one at a time; pick the spot each belongs in and drop it.
  - **Trace** (permission slip, backpack): move the pen along the dotted line through every dot.
  - **Sides** (braids, socks, jacket, shoes): press left or right as each step lights up.
  - The shapes, numbers and lines inside the tasks are stand-ins until each need has its own pictures.
- Boarding: when a need is done the kid walks to the bus stop on the shared walk. A kid with nothing left waits there. A kid with one more need that day says "Oh wait, I forgot something!" at the stop, turns back and waits in the room of that need, and Dreko has to walk up again to find out what it is. A kid counts for the bus the moment their last need is done, wherever they are on the walk to the stop. Dreko can also catch a kid who is on the way back in and help them right there, before they reach the room.
- The bus scene (`BUS` in `src/game/config.js`): the bus pulls up at the stop for the last 10 seconds. When the morning is over the camera goes to the stop, the counted kids get on one by one and the bus drives off; when all ten are on, the driver nods first. Mom paces the far side of the street on the shared walk and stops to look at the house, so we see her front one way and her back the other; for the bus scene she comes to her spot and watches. The card comes up after the bus has gone, and it waits for **Continue** (the button, A, Enter or Space) before the same day starts over or the next day starts. The bus, the driver and Mom are pictures in `public/art/` (`bus.webp`, `driver.webp`, `mom.webp`, `mom-back.webp`); a labelled grey stand-in is drawn for any that is missing. Dreko and the kids stay off the road.
- Anxiety (`ANXIETY` in `src/game/config.js`): the bar climbs with the clock and with every miss in a mini task. It drops, with a deep breath from Dreko and a flash on the bar, for each need he learns and each kid counted, so a later try where he remembers more is calmer. When it is high his hands shake in the mini tasks (the gold zone of a hold shrinks, the pen of a trace wobbles, and every task trembles) and sweat drops fly off him.
- The win: all ten on the bus on Friday. The card has words for now, and **Play again** starts a new week.

- The need deal (`dealDay` in `src/game/needs.js`): there are 11 needs in the pool. Every day deals new ones at random: every kid gets one, and as the week goes on more kids get a second, always in a different room from their first. The 11th need, Shoes tied, has a line icon as a stand-in until it gets a painted one.
- Rooms (`ROOMS` in `src/game/needs.js`, `SPOTS` in `src/game/house.js`): every need belongs to a room, and a kid waits in the room of the need they have. Kitchen: breakfast, packed lunch. Bathroom: teeth, braids. Cubby room: socks, jacket, homework. Front hall: permission slip, backpack, show-and-tell, shoes. The pairing is a draft.
- Kids on the move (`ROAM` in `src/game/config.js`): on Thursday and Friday the kids walk around the room of their need instead of standing still, so Dreko has to catch one to help them. A kid stands still while their task is open.
- The rules log: the **Log** button (or `?log` in the address) lists every rule as it fires, newest first, with the day, the try and the clock: the deal, a need told, a task opened, a miss, a need done, a kid at the stop, a kid who forgot something, the bus leaving and the time earned. It is a tool for checking the game.
- Sound (`src/game/sound.js`): `menu.mp3` loops through the whole game. On top of it, the tick-tock plays for the last 10 seconds before the bus, `Bus-lose.mp3` while the "bus left" card is up, and `Bus-win.mp3` on the win. The menu music fades out under those last two and comes back after. Nothing plays until the first tap or key, as browsers ask. The **Sound** button turns it off and on. `Dad-died.mp3` has no moment in the game yet.

Not in yet: each need's own task pictures, the title and ending screens, drawn walking frames, and sound effects (steps, task done, kid boards).

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
- **Art** in `public/art/`: made with Higgsfield (Nano Banana 2) from Carl's character and world notes. This includes the 16 icons in `public/art/icons/`, made on Nov 20 inside the jam window. The bus, the driver and Mom (`bus.webp`, `driver.webp`, `mom.webp`, `mom-back.webp`) were made the same way on Nov 21.
- **Sounds and music** in `public/`: custom tracks made for this game, plus `mixkit-tick-tock-clock-timer-1045.wav` from Mixkit (check the Mixkit licence before submission).
