# Camera guide for painting furniture

`camera-guide.png` is the kitchen taken from the game's own camera, with no kids and no buttons. It goes in
with every furniture prompt as the second picture, so a new thing is painted from the game's real angle
instead of a guessed one (Carl, Nov 21: "the props need to be designed for a 2.5 world").

The camera never turns: the house is seen from above, turned 45 degrees. The back wall on the right of the
guide is a room's north wall, and furniture on it runs from the upper left down to the lower right. The
back wall on the left is a west wall, and furniture on it runs from the upper right down to the lower left.

## The 2.5D prompt

Attach two pictures: `public/art/counter.webp` (style and colour) and `tools/prop-guide/camera-guide.png` (camera).

```
Picture 1 is a guide for drawing style and colour only: hand-drawn black ink outline with a soft watercolour
wash on paper, in only black, white and warm grey, no other colour at all.

Picture 2 is a room from the 2.5D isometric game this prop is for. It shows the game's one fixed camera: the
room is seen from above and turned 45 degrees, so the floor tiles are diamonds.

Draw one single prop for that 2.5D isometric game: [THING].

Draw it from exactly the same camera as the icebox, stove and sink cabinet standing along the back wall on the
right of picture 2. It stands against that same wall. Its back is toward the upper right and its front faces
the lower left. Its long side runs along that wall, from the upper left down to the lower right of the
picture, at the same slant as that row of furniture. On the floor it covers [FOOTPRINT]. We see its top, its
front and its right end. Do not draw it front-on and do not draw it side-on.

Draw only the prop. Do not draw the room, the floor, the wall or anything else from picture 2.

The whole prop is inside the picture with clear empty space on every side. It is a plain object: no face, no
eyes, no arms, no people, no characters. No text, no letters, no numbers, no logos, no border, no ground shadow.

Background: one flat pure green (#00FF00) from edge to edge. No white paper, no frame, no glow, no gradient.
Nothing in the prop itself is green.
```

## Outdoor things

`world-prompts.md` holds the prompts for the still world around the home (Nov 21): the same 2.5D prompt for things
that stand in the open, a front-on prompt for flat things that the game stands up as real sheets (the fence, the
washing line), and a straight-from-above prompt for the grass. The grass picture had its big soft blotches taken
out and its edges blended so that it repeats without a pattern; the fence was cropped to a whole number of pickets.

## 1920s (Nov 22)

Carl: "the props need to be more 1920s". Twelve things were repainted as their 1920s selves (icebox, cast iron
range, sink cabinet, tin lunch pails, pedestal sink, high-tank toilet, school desk, satchel hooks, boot rack, toy
shelf, bus stop post, and the wooden school bus from his photo). Every new prompt says "as it would have looked in a
family home in the 1920s" and "nothing electric and nothing made of plastic". The prompts are in `props-1920s-prompts.md`.
`camera-guide.png` was retaken with the new kitchen, so it no longer shows anything modern. The files keep their old
names in `public/art/` (the icebox is `fridge.webp`, the range is `stove.webp`, the cabinet is `counter.webp`).
The bus has see-through windows; the painted seat was cleared out of its cab so the driver's card can sit behind the
bus picture and show through the cab's open side.
