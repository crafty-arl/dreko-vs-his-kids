// The screen overlay: bus clock, kids on the bus, Dreko's anxiety, a bubble over each kid, the button hints
// and the need list. It only shows what the game tells it; it holds no game rules of its own.
import { CLOCK, UI, WEEK } from './config.js'
import { dayAfter, levelOf } from './level.js'
import { KIDS } from './family.js'
import { Icon, InkFilter } from './Icon.jsx'
import { PLACES } from './house.js'
import { NEEDS, ROOM_OF } from './needs.js'
import { BestTries } from './Title.jsx'
import { TutorialDone } from './Tutorial.jsx'

// the classes that carry the overlay's colours and icon look; the mini task card wears them too
export const overlayClass = `overlay look-${UI.icons === 'plain' ? 'plain' : 'inked'} ui-${UI.overlay}`

const clockText = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.ceil(seconds % 60)).padStart(2, '0')}`

// known: { kidName: n }, how many of the needs a kid still has that Dreko has been told. needs: { kidName:
// [needId, ...] }, what each kid still needs today (an empty list is a kid with nothing to do). ready:
// { kidName: 'walking' | 'forgot' | 'back' | 'stop' | 'aboard' } for kids who are not waiting in a room: on the way to the
// bus, at the stop remembering one more need, on the way back in, or waiting for the bus.
// helping: the kid Dreko can help right now, if any.
// bubbleRefs: one ref per kid, in KIDS order; the game moves them every frame.
export default function Overlay({ place, known, needs, ready, helping, clock, worry, calm, listOpen, onToggleList, onHelp, onPlayAgain, onContinue, best = [], bestAt = -1, pointAt, onTitle, counted = 0, onPick, bubbleRefs, settings, children }) {
  const over = clock.phase === 'left' || clock.phase === 'over' || clock.phase === 'dayWon'
  const left = (kid) => needs[kid.name] ?? []
  const needOf = (kid) => left(kid)[0]
  const told = (kid) => known[kid.name] ?? 0
  const roomOf = (id) => PLACES[ROOM_OF[id]].name
  // a kid's bubble: a question mark until Dreko walks up, then the need, then a tick as they walk to the bus.
  // At the stop a kid with one more need says so, and it is a question mark again in the new room.
  const stateOf = (kid) => {
    const s = ready[kid.name]
    if (s === 'forgot') return 'forgot'
    if (s === 'walking' || s === 'stop' || s === 'aboard' || !left(kid).length) return 'ready'
    return told(kid) > 0 ? 'known' : 'ask'
  }
  const iconOf = (state, kid) => (state === 'ready' ? 'tick' : state === 'known' ? needOf(kid) : 'ask')
  const day = WEEK.days[clock.day]
  const week = clock.week ?? 0
  // what comes after this morning, and how hard it is
  const [nextWeek, nextDayAt] = dayAfter(week, clock.day)
  const nextDay = WEEK.days[nextDayAt]
  const nextLevel = levelOf(nextWeek, nextDayAt)
  const mornings = week * WEEK.days.length + clock.day // mornings Dreko got through before this one
  const triesLeft = WEEK.tries - clock.loop
  // a kid counts the moment their last need is done; once the bus has gone, this is who got on
  const onBus = over ? clock.boarded : KIDS.filter((kid) => needs[kid.name] && !needs[kid.name].length).length
  const earned = clock.earned || 0
  const learned = Object.keys(known).length
  const timeLeft = clock.left
  const hurry = clock.phase === 'run' && timeLeft <= CLOCK.hurry
  // who is not ready yet, for the card after the bus has left
  const missed = KIDS.filter((kid) => left(kid).length)
  // a kid made ready earns time for the next try; there is no next try after the last one, or in the practice morning
  const earns = counted > 0 && clock.phase === 'run' && !clock.tutorial && clock.loop < WEEK.tries
  const art = import.meta.env.BASE_URL + 'art/'
  return (
    <div className={overlayClass}>
      <InkFilter />

      {/* a bubble over each kid: a question mark until Dreko walks up, then the need, then a tick, and a line of speech when they remember one more need at the bus stop */}
      <div className="bubbles" aria-hidden="true">
        {KIDS.map((kid, i) => {
          const state = stateOf(kid)
          return (
            <div key={kid.name} ref={(el) => { bubbleRefs.current[i] = el }} className={`bubble bubble-${state} ${pointAt === kid.name ? 'bubble-point' : ''}`}>
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
            {/* the key plays the pop again for every kid made ready */}
            {earns && <span key={counted} className="pop" aria-live="polite">+{CLOCK.perKid}s<small>next try</small></span>}
          </div>
          {/* the key makes the chip play its calm flash again on every calm moment */}
          <div key={calm} className={`chip ${calm ? 'chip-calm' : ''}`} aria-label={`Anxiety ${Math.round(worry * 100)} percent`}>
            <Icon name="sweat" wash="red" />
            <span className="worry">
              <span className="worry-name">Anxiety</span>
              <span className="bar bar-worry"><i style={{ width: `${Math.max(0.06, worry) * 100}%` }} /></span>
            </span>
          </div>
          {settings}
        </div>
        <div className="hud-side hud-right">
          <div className="chip" aria-label={`${onBus} of ${KIDS.length} kids ${over ? 'on the bus' : 'ready for the bus'}`}>
            <Icon name="bus" wash="gold" />
            <span className="num">{onBus}/{KIDS.length}</span>
          </div>
          <p className="place place-day">{clock.tutorial ? 'How to play · practice' : <>{week > 0 ? `Week ${week + 1} · ` : ''}{day} · try {clock.loop} of {WEEK.tries}</>}</p>
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

      {clock.phase === 'left' && !clock.scene && (
        <div className="list" role="status">
          <div className="panel panel-bus">
            <h2>The bus left</h2>
            <p>{onBus} of {KIDS.length} kids made it.</p>
            <p>{triesLeft === 1 ? 'Last try' : `${triesLeft} tries left`}. {day} starts over{earned > 0 ? `, with ${earned} more seconds` : ''}.</p>
            <p>Dreko remembers what {learned === 1 ? '1 kid needs' : `${learned} kids need`}.</p>
            {/* who missed the bus and what they still need: the need once Dreko has been told, a question mark until then */}
            {missed.length > 0 && (
              <div className="missed">
                <h3>Not ready yet</h3>
                <ul>
                  {missed.map((kid) => {
                    const knows = told(kid) > 0
                    return (
                      <li key={kid.name} title={knows ? NEEDS[needOf(kid)] : 'Not asked yet'}>
                        <span className="face" style={{ backgroundImage: `url(${art}${kid.name.toLowerCase()}.webp)` }} />
                        <span className={`slot slot-${knows ? 'known' : 'ask'}`}><Icon name={knows ? needOf(kid) : 'ask'} wash={knows ? 'need' : undefined} /></span>
                        <b>{kid.name}</b>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            <button type="button" className="close again" onClick={onContinue} autoFocus><span className="key key-a">A</span>Continue</button>
          </div>
        </div>
      )}

      {/* a day done: all ten boarded, and the next day is harder */}
      {clock.phase === 'dayWon' && !clock.scene && clock.tutorial && <TutorialDone onStart={onContinue} onTitle={onTitle} />}
      {clock.phase === 'dayWon' && !clock.scene && !clock.tutorial && (
        <div className="list" role="status">
          <div className="panel panel-bus">
            <h2>{nextWeek > week ? `Week ${week + 1} done` : `${day} done`}</h2>
            <p>All ten made the bus{nextWeek > week ? ', Monday to Friday' : ''}.</p>
            {/* the words of the week's end are a stand-in for the ending from the game map: the driver nods, mom is watching */}
            {nextWeek > week && <p>The driver gives Dreko a nod. Across the street, Mom saw the whole thing.</p>}
            <p>Next: {nextDay}{nextWeek > 0 ? ` of week ${nextWeek + 1}` : ''}, with {nextLevel.needs} needs{nextWeek > 0 ? ` and ${nextLevel.seconds} seconds` : ''}.</p>
            <button type="button" className="close again" onClick={onContinue} autoFocus><span className="key key-a">A</span>Continue</button>
          </div>
        </div>
      )}

      {/* out of tries: the game is over and starts from scratch (Carl, Nov 22). The words are a stand-in. */}
      {clock.phase === 'over' && !clock.scene && (
        <div className="list" role="status">
          <div className="panel panel-bus">
            <h2>Game over</h2>
            <p>The bus left on try {WEEK.tries} of {WEEK.tries}. {onBus} of {KIDS.length} kids made it.</p>
            <p>Dreko got through {mornings === 1 ? '1 morning' : `${mornings} mornings`}.</p>
            <BestTries best={best} mark={bestAt} />
            {bestAt < 0 && <p className="best-miss">This one did not make your three best.</p>}
            <p>It all starts again on the first Monday.</p>
            <button type="button" className="close again" onClick={onContinue} autoFocus><span className="key key-a">A</span>Start over</button>
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
                const words = s === 'aboard' ? 'On the bus'
                  : s === 'stop' ? 'At the bus stop'
                  : s === 'forgot' ? 'Forgot something!'
                  : s === 'walking' ? 'On the way to the bus'
                  : !left(kid).length ? 'Ready to go'
                  : s === 'back' ? `Going back to the ${roomOf(needOf(kid))}`
                  : state === 'ask' ? `${roomOf(needOf(kid))}: not asked yet`
                  : left(kid).slice(0, told(kid)).map((id) => `${NEEDS[id]} in the ${roomOf(id)}`).join(', then ')
                return (
                  <li key={kid.name} className="row row-pick" role="button" tabIndex={0} title={`Show ${kid.name} on the map`} onClick={() => onPick?.(kid.name)} onKeyDown={(e) => { if (e.key === 'Enter') onPick?.(kid.name) }}>
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
            <p className="rows-tip">Tap a kid to see them on the map.</p>
            <button type="button" className="close" onClick={onToggleList}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
