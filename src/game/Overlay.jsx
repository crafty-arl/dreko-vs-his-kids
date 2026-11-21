// The screen overlay: bus clock, kids on the bus, Dreko's anxiety, a bubble over each kid, the button hints
// and the need list. It only shows what the game tells it; it holds no game rules of its own.
import { CLOCK, UI } from './config.js'
import { KIDS } from './family.js'
import { Icon, InkFilter } from './Icon.jsx'
import { NEEDS } from './needs.js'

// the classes that carry the overlay's colours and icon look; the mini task card wears them too
export const overlayClass = `overlay look-${UI.icons === 'plain' ? 'plain' : 'inked'} ui-${UI.overlay}`

const clockText = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.ceil(seconds % 60)).padStart(2, '0')}`

// known: { kidName: true } for every kid who has told Dreko their need. needs: { kidName: needId } for this game. ready: { kidName: 'walking' | 'stop' }
// for kids whose need is met. helping: the kid Dreko can help right now, if any.
// bubbleRefs: one ref per kid, in KIDS order; the game moves them every frame.
export default function Overlay({ place, known, needs, ready, helping, clock, worry, listOpen, onToggleList, onHelp, onPlayAgain, bubbleRefs, settings, children }) {
  const over = clock.phase === 'left' || clock.phase === 'won'
  const needOf = (kid) => needs[kid.name] ?? kid.needId
  // while the morning runs this counts who is standing at the stop; once the bus has gone, who got on
  const onBus = over ? clock.boarded : Object.values(ready).filter((s) => s === 'stop').length
  const earned = CLOCK.perKid * (clock.boarded || 0)
  const learned = Object.keys(known).length
  const timeLeft = clock.left
  const hurry = clock.phase === 'run' && timeLeft <= CLOCK.hurry
  const art = import.meta.env.BASE_URL + 'art/'
  return (
    <div className={overlayClass}>
      <InkFilter />

      {/* a bubble over each kid: a question mark until Dreko walks up, then the need, then a tick */}
      <div className="bubbles" aria-hidden="true">
        {KIDS.map((kid, i) => {
          const state = ready[kid.name] ? 'ready' : known[kid.name] ? 'known' : 'ask'
          return (
            <div key={kid.name} ref={(el) => { bubbleRefs.current[i] = el }} className={`bubble bubble-${state}`}>
              <Icon name={state === 'ready' ? 'tick' : state === 'known' ? needOf(kid) : 'ask'} wash={state === 'ready' ? 'green' : state === 'known' ? 'need' : undefined} />
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
          <div className="chip" aria-label={`${onBus} of ${KIDS.length} kids ${over ? 'on the bus' : 'at the bus stop'}`}>
            <Icon name="bus" wash="gold" />
            <span className="num">{onBus}/{KIDS.length}</span>
          </div>
          <p className="place">Morning {clock.loop}{place ? ` · ${place}` : ''}</p>
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
            {earned > 0 && <p>Tomorrow's alarm rings {earned} seconds earlier.</p>}
            <p>The morning starts over. Dreko remembers {learned === 1 ? '1 need' : `${learned} needs`}.</p>
          </div>
        </div>
      )}

      {/* the win. The words are a stand-in for the ending from the game map: the driver nods, mom is watching. */}
      {clock.phase === 'won' && (
        <div className="list" role="status">
          <div className="panel panel-bus">
            <h2>All ten made the bus</h2>
            <p>Morning {clock.loop}. The driver gives Dreko a nod.</p>
            <p>Across the street, Mom saw the whole thing.</p>
            <button type="button" className="close again" onClick={onPlayAgain}>Play again</button>
          </div>
        </div>
      )}

      {listOpen && !over && (
        <div className="list" role="dialog" aria-label="Need list" onClick={onToggleList}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <h2>Needs <small>{onBus} of {KIDS.length} at the stop</small></h2>
            <ul className="rows">
              {KIDS.map((kid) => {
                const state = ready[kid.name] ? 'ready' : known[kid.name] ? 'known' : 'ask'
                return (
                  <li key={kid.name} className="row">
                    <span className="face" style={{ backgroundImage: `url(${art}${kid.name.toLowerCase()}.webp)` }} />
                    <span className="who">
                      {kid.name}
                      <em>{state === 'ask' ? 'Not asked yet' : NEEDS[needOf(kid)] + (ready[kid.name] === 'stop' ? ', at the bus stop' : state === 'ready' ? ', on the way' : '')}</em>
                    </span>
                    <span className={`slot slot-${state}`}>
                      <Icon name={state === 'ready' ? 'tick' : state === 'known' ? needOf(kid) : 'ask'} wash={state === 'known' ? 'need' : undefined} />
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
