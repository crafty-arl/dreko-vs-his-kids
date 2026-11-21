// The family, from the game map Carl locked on Nov 13 and 14.
// `spot` is where a kid waits, in tiles. `tall` is height next to Dreko (Dreko = 1).
// `flip` mirrors the drawing so the kid faces the other way. `needId` is the need the game map first gave the kid; the game now deals needs at random each new game (src/game/needs.js) and this is only the fallback.

export const KIDS = [
  { name: 'Zhar', needId: 'lunch', age: 14, place: 'kitchen', spot: [2.5, 2.6], tall: 0.86, flip: false, need: 'a packed lunch', quirk: 'sulks in a cocoon' },
  { name: 'Tix', needId: 'breakfast', age: 6, place: 'kitchen', spot: [4.6, 3.5], tall: 0.48, flip: true, need: 'breakfast eaten', quirk: 'tail flicks cereal at the ceiling' },
  { name: 'Ozzo', needId: 'teeth', age: 9, place: 'bath', spot: [9.5, 2.5], tall: 0.68, flip: false, need: 'teeth brushed', quirk: 'sings into the toothbrush' },
  { name: 'Tula', needId: 'braids', age: 12, place: 'bath', spot: [11.6, 3.5], tall: 0.72, flip: true, need: 'hair braided around her antennae', quirk: 'counts every braid out loud' },
  { name: 'Mara', needId: 'socks', age: 10, place: 'cubby', spot: [2.5, 8.5], tall: 0.58, flip: false, need: 'matching socks for all six feet', quirk: 'collects single socks' },
  { name: 'Kivi', needId: 'jacket', age: 8, place: 'cubby', spot: [4.5, 9.5], tall: 0.55, flip: true, need: 'a jacket on', quirk: 'floats off when distracted', floats: true },
  { name: 'Moro', needId: 'homework', age: 11, place: 'cubby', spot: [3.5, 10.6], tall: 0.7, flip: false, need: 'homework found', quirk: 'high-fives himself with his four arms' },
  { name: 'Pell', needId: 'slip', age: 13, place: 'hall', spot: [8.6, 8.5], tall: 0.8, flip: false, need: 'a permission slip signed', quirk: 'glows when embarrassed' },
  { name: 'Ula', needId: 'show', age: 7, place: 'hall', spot: [12.5, 9.5], tall: 0.52, flip: true, need: 'her show-and-tell item', quirk: 'brings her pet blob, who wants lunch too' },
  { name: 'Pobo', needId: 'backpack', age: 5, place: 'hall', spot: [9.5, 10.6], tall: 0.44, flip: false, need: 'a backpack zipped', quirk: 'tries to pack the cat' },
]

export const kidArt = (kid) => kid.name.toLowerCase()
