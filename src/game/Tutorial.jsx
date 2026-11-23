// How to play (Carl, Nov 22): a practice morning that talks the player through each thing, one step at a
// time, before the real game. The game sets the morning up (startTutorial in world.js, TUTOR in config.js);
// this file only reads what is going on and says what to do next. Every line here is a stand-in to tune.
import { CLOCK, TUTOR, WEEK } from './config.js'
import { KIDS } from './family.js'
import { PLACES } from './house.js'
import { NEEDS, ROOM_OF } from './needs.js'

const ORDER = Object.keys(TUTOR.needs)
const TASKS = Object.values(TUTOR.needs).reduce((n, list) => n + list.length, 0)
export const STEPS = TASKS + 2 // walk, each need, and the need list

const room = (id) => PLACES[ROOM_OF[id]].name

// What to say right now: { step, say, more, point }. `point` is the kid whose bubble is lit up.
export function coach({ clock, near, known, needs, ready, listSeen }) {
  const open = ORDER.filter((name) => needs[name]?.length)
  const done = TASKS - ORDER.reduce((n, name) => n + (needs[name]?.length ?? 0), 0)
  const step = Math.min(STEPS, 1 + (clock.phase === 'ready' ? 0 : 1) + done + (listSeen && clock.phase !== 'ready' ? 1 : 0))
  if (clock.phase === 'ready') {
    return { step: 1, say: 'First, walk Dreko. Tap the floor where he should go.', more: 'On a controller use the stick. On a keyboard use the arrow keys.' }
  }
  if (!open.length) return { step: STEPS, say: 'All ten kids are ready. Here comes the bus.', more: 'The driver gives Dreko a nod when everyone is on.' }
  if (done >= 1 && !listSeen) {
    return { step, say: 'Press Y, or tap Needs, to see who still needs what. Then close it.', more: 'In the real game the bus clock waits while the list is open.' }
  }
  // the kid to help now: the one Dreko is next to, or the first one who is not on the walk to the bus
  const who = open.includes(near) ? near : open.find((name) => ready[name] !== 'walking') ?? open[0]
  const need = needs[who][0]
  const second = needs[who].length < TUTOR.needs[who].length
  const at = ready[who]
  if (at === 'walking') return { step, say: `${who} is walking to the bus stop. Watch what happens there.`, more: 'Some kids need two things.' }
  if (at === 'forgot') return { step, point: who, say: `"Oh wait, I forgot something!" ${who} needs one more thing.`, more: `${who} is going back inside for it.` }
  if (!(known[who] > 0)) {
    return {
      step,
      point: who,
      say: second ? `${who} went back to the ${room(need)}. Walk up to ${who} to find out what else is needed.` : `Walk up to ${who} in the ${room(need)} to find out what ${who} needs.`,
      more: 'A question mark means Dreko does not know yet. He only has to get close.',
    }
  }
  if (near !== who) return { step, point: who, say: `${who} needs: ${NEEDS[need]}. Walk right up to ${who}.`, more: `${who} is in the ${room(need)}.` }
  return { step, point: who, say: `Press A, or tap Help ${who}.`, more: 'A small task opens. The words on it say what to do.' }
}

// the strip that says what to do next, above the buttons at the bottom of the screen
export function Coach({ line, onLeave }) {
  return (
    <div className="coach" role="status">
      <div className="coach-top">
        <b>How to play · step {line.step} of {STEPS}</b>
        <button type="button" className="coach-leave" onClick={onLeave}>Leave</button>
      </div>
      <p>{line.say}</p>
      {line.more && <small>{line.more}</small>}
    </div>
  )
}

// the card after the practice morning: what the real game adds, then the real game
export function TutorialDone({ onStart, onTitle }) {
  return (
    <div className="list" role="status">
      <div className="panel panel-bus panel-how">
        <h2>That is how to play</h2>
        <p>In the real game:</p>
        <ul>
          <li>The bus clock starts when Dreko first moves. You get {CLOCK.firstLoop} seconds.</li>
          <li>If the bus leaves without all {KIDS.length} kids, the same morning starts over. You get {WEEK.tries} tries.</li>
          <li>Dreko remembers what each kid needs. Every kid he got ready adds {CLOCK.perKid} seconds to the next try.</li>
          <li>Every morning has more needs, and later the kids walk around.</li>
          <li>The red bar is his anxiety. When it is high, his hands shake in the tasks.</li>
          <li>A morning you win pays points. Spend them at the market on things for Dreko's pockets, and use each one once.</li>
        </ul>
        <button type="button" className="close again" onClick={onStart} autoFocus><span className="key key-a">A</span>Start the game</button>
        <button type="button" className="close task-close" onClick={onTitle}>Back to the title</button>
      </div>
    </div>
  )
}
