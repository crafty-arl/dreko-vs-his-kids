// The screen overlay: bus clock, kids on the bus, Dreko's anxiety, a bubble over each kid, the button hints
// and the need list. It only shows what the game tells it; it holds no game rules of its own.
import { CLOCK, UI, WEEK } from './config.js'
import { KIDS } from './family.js'
import { Icon, InkFilter } from './Icon.jsx'
import { PLACES } from './house.js'
import { NEEDS, ROOM_OF } from './needs.js'

// the classes that carry the overlay's colours and icon look; the mini task card wears them too
export const overlayClass = `overlay look-${UI.icons === 'plain' ? 'plain' : 'inked'} ui-${UI.overlay}`

const clockText = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.ceil(seconds % 60)).padStart(2, '0')}`

// known: { kidName: n }, how many of the needs a kid still has that Dreko has been told. needs: { kidName:
// [needId, ...] }, what each kid still needs today (an empty list is a kid with nothing to do). ready:
// { kidName: 'walking' | 'forgot' | 'back' | 'stop' } for kids who are not waiting in a room: on the way to the
// bus, at the stop remembering one more need, on the way back in, or waiting for the bus.
// helping: the kid Dreko can help right now, if any.
// bubbleRefs: one ref per kid, in KIDS order; the game moves them every frame.
export default function Overlay({ place, known, needs, ready, helping, clock, worry, listOpen, onToggleList, onHelp, onPlayAgain, bubbleRefs, settings, children }) {
  const over = clock.phase === 'left' || clock.phase === 'won' || clock.phase === 'dayWon'
  const left = (kid) => needs[kid.name] ?? []
  const needOf = (kid) => left(kid)[0]
  const told = (kid) => known[kid.name] ?? 0
  const roomOf = (id) => PLACES[ROOM_OF[id]].name
  // a kid's bubble: a question mark until Dreko walks up, then the need, then a tick as they walk to the bus.
  // At the stop a kid with one more need says so, and it is a question mark again in the new room.
  const stateOf = (kid) => {
    const s = ready[kid.name]
    if (s === 'forgot') return 'forgot'
    if (s === 'walking' || s === 'stop' || !left(kid).length) return 'ready'
    return told(kid) > 0 ? 'known' : 'ask'
  }
  const iconOf = (state, kid) => (state === 'ready' ? 'tick' : state === 'known' ? needOf(kid) : 'ask')
  const day = WEEK.days[clock.day]
  const nextDay = WEEK.days[clock.day + 1]
  // a kid counts the moment their last need is done; once the bus has gone, this is who got on
  const onBus = over ? clock.boarded : KIDS.filter((kid) => needs[kid.name] && !needs[kid.name].length).length
  const earned = clock.earned || 0
  const learned = Object.keys(known).length
  const timeLeft = clock.left
  const hurry = clock.phase === 'run' && timeLeft <= CLOCK.hurry
  const art = import.meta.env.BASE_URL + 'art/'
  return (
    <div className={overlayClass}>
      <InkFilter />

      {/* a bubble over each kid: a question mark until Dreko walks up, then the need, then a tick, and a line of speech when they remember one more need at the bus stop */}
      <div className="bubbles" aria-hidden="true">
        {KIDS.map((kid, i) => {
          const state = stateOf(kid)
          return (
            <div key={kid.name} ref={(el) => { bubbleRefs.current[i] = el }} className={`bubble bubble-${state}`}>
              {state === 'forgot'
                ? <span className="forgot">Oh wait, I forgot something!</span>
                : <Icon name={iconOf(state, kid)} wash={state === 'ready' ? 'green' : state === 'known' ? 'need' : undefined} />}
            </div>
          )
        })}
      </div>

      <header className="hud">
        <div className="hud-side">
          <div className={`chip ${hurry ? 'chip-hurry' : ''}`} role="timer" aria-label={`Bus leaves in ${Math.ceil(timeLeft)} seconds`}>
            <Icon name="clock" wash="gold" />
            <span className="num">{clockText(timeLeft)}</span>
            <span className="bar"><i style={{ width: `${Math.max(0, Math.min(1, timeLeft / clock.total)) * 100}%` }} /></span>
          </div>
          <div className="chip" aria-label={`Anxiety ${Math.round(worry * 100)} percent`}>
            <Icon name="sweat" wash="red" />
            <span className="bar bar-worry"><i style={{ width: `${Math.max(0.06, worry) * 100}%` }} /></span>
          </div>
          {settings}
        </div>
        <div className="hud-side hud-right">
          <div className="chip" aria-label={`${onBus} of ${KIDS.length} kids ${over ? 'on the bus' : 'ready for the bus'}`}>
            <Icon name="bus" wash="gold" />
            <span className="num">{onBus}/{KIDS.length}</span>
          </div>
          <p className="place place-day">{day}{clock.loop > 1 ? ` · try ${clock.loop}` : ''}</p>
          {place && <p className="place">{place}</p>}
          {children}
        </div>
      </header>

      <footer className="hints">
        <div className="hint"><span className="key key-stick"><Icon name="stick" /></span>Walk</div>
        {helping && (
          <button type="button" className="hint hint-button hint-help" onClick={onHelp}>
            <span className="key key-a">A</span>Help {helping.name}
          </button>
        )}
        <button type="button" className="hint hint-button" aria-expanded={listOpen} onClick={onToggleList}>
          <span className="key key-y">Y</span>Needs
        </button>
      </footer>

      {clock.phase === 'left' && (
        <div className="list" role="status">
          <div className="panel panel-bus">
            <h2>The bus left</h2>
            <p>{onBus} of {KIDS.length} kids made it.</p>
            <p>{day} starts over{earned > 0 ? `, with ${earned} more seconds` : ''}.</p>
            <p>Dreko remembers what {learned === 1 ? '1 kid needs' : `${learned} kids need`}.</p>
          </div>
        </div>
      )}

      {/* a day done: all ten boarded, and the next day is harder */}
      {clock.phase === 'dayWon' && (
        <div className="list" role="status">
          <div className="panel panel-bus">
            <h2>{day} done</h2>
            <p>All ten made the bus.</p>
            <p>Next: {nextDay}, with {WEEK.needs[clock.day + 1]} needs.</p>
          </div>
        </div>
      )}

      {/* the win. The words are a stand-in for the ending from the game map: the driver nods, mom is watching. */}
      {clock.phase === 'won' && (
        <div className="list" role="status">
          <div className="panel panel-bus">
            <h2>The week is done</h2>
            <p>All ten made the bus, Monday to Friday.</p>
            <p>The driver gives Dreko a nod. Across the street, Mom saw the whole thing.</p>
            <p>Tomorrow is Saturday. No school.</p>
            <button type="button" className="close again" onClick={onPlayAgain}>Play again</button>
          </div>
        </div>
      )}

      {listOpen && !over && (
        <div className="list" role="dialog" aria-label="Need list" onClick={onToggleList}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <h2>{day} <small>{onBus} of {KIDS.length} ready for the bus</small></h2>
            <ul className="rows">
              {KIDS.map((kid) => {
                const state = stateOf(kid)
                const s = ready[kid.name]
                const words = s === 'stop' ? 'At the bus stop'
                  : s === 'forgot' ? 'Forgot something!'
                  : s === 'walking' ? 'On the way to the bus'
                  : !left(kid).length ? 'Ready to go'
                  : s === 'back' ? `Going back to the ${roomOf(needOf(kid))}`
                  : state === 'ask' ? `${roomOf(needOf(kid))}: not asked yet`
                  : left(kid).slice(0, told(kid)).map((id) => `${NEEDS[id]} in the ${roomOf(id)}`).join(', then ')
                return (
                  <li key={kid.name} className="row">
                    <span className="face" style={{ backgroundImage: `url(${art}${kid.name.toLowerCase()}.webp)` }} />
                    <span className="who">
                      {kid.name}
                      <em>{words}</em>
                    </span>
                    <span className={`slot slot-${state}`}>
                      <Icon name={iconOf(state, kid)} wash={state === 'known' ? 'need' : undefined} />
                    </span>
                  </li>
                )
              })}
            </ul>
            <button type="button" className="close" onClick={onToggleList}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
