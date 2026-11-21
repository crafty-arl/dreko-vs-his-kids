// The screen overlay: bus clock, kids on the bus, Dreko's anxiety, a bubble over each kid, the button hints
// and the need list. It only shows what the game tells it; it holds no game rules of its own.
import { CLOCK, UI } from './config.js'
import { KIDS } from './family.js'
import { Icon, InkFilter } from './Icon.jsx'
import { NEEDS } from './needs.js'

const clockText = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.ceil(seconds % 60)).padStart(2, '0')}`

// known: { kidName: true } for every kid who has told Dreko their need. ready: the same for kids who are done.
// bubbleRefs: one ref per kid, in KIDS order; the game moves them every frame.
export default function Overlay({ place, known, ready, clock, worry, listOpen, onToggleList, bubbleRefs, children }) {
  const onBus = Object.keys(ready).length
  const learned = Object.keys(known).length
  const timeLeft = clock.left
  const hurry = clock.phase === 'run' && timeLeft <= CLOCK.hurry
  const art = import.meta.env.BASE_URL + 'art/'
  return (
    <div className={`overlay look-${UI.icons === 'plain' ? 'plain' : 'inked'} ui-${UI.overlay}`}>
      <InkFilter />

      {/* a bubble over each kid: a question mark until Dreko walks up, then the need, then a tick */}
      <div className="bubbles" aria-hidden="true">
        {KIDS.map((kid, i) => {
          const state = ready[kid.name] ? 'ready' : known[kid.name] ? 'known' : 'ask'
          return (
            <div key={kid.name} ref={(el) => { bubbleRefs.current[i] = el }} className={`bubble bubble-${state}`}>
              <Icon name={state === 'ready' ? 'tick' : state === 'known' ? kid.needId : 'ask'} wash={state === 'ready' ? 'green' : state === 'known' ? 'need' : undefined} />
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
        </div>
        <div className="hud-side hud-right">
          <div className="chip" aria-label={`${onBus} of ${KIDS.length} kids on the bus`}>
            <Icon name="bus" wash="gold" />
            <span className="num">{onBus}/{KIDS.length}</span>
          </div>
          <p className="place">Morning {clock.loop}{place ? ` · ${place}` : ''}</p>
          {children}
        </div>
      </header>

      <footer className="hints">
        <div className="hint"><span className="key key-stick"><Icon name="stick" /></span>Walk</div>
        <button type="button" className="hint hint-button" aria-expanded={listOpen} onClick={onToggleList}>
          <span className="key key-y">Y</span>Needs
        </button>
      </footer>

      {clock.phase === 'left' && (
        <div className="list" role="status">
          <div className="panel panel-bus">
            <h2>The bus left</h2>
            <p>{onBus} of {KIDS.length} kids made it.</p>
            <p>The morning starts over. Dreko remembers {learned === 1 ? '1 need' : `${learned} needs`}.</p>
          </div>
        </div>
      )}

      {listOpen && clock.phase !== 'left' && (
        <div className="list" role="dialog" aria-label="Need list" onClick={onToggleList}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <h2>Needs <small>{onBus} of {KIDS.length} on the bus</small></h2>
            <ul className="rows">
              {KIDS.map((kid) => {
                const state = ready[kid.name] ? 'ready' : known[kid.name] ? 'known' : 'ask'
                return (
                  <li key={kid.name} className="row">
                    <span className="face" style={{ backgroundImage: `url(${art}${kid.name.toLowerCase()}.webp)` }} />
                    <span className="who">
                      {kid.name}
                      <em>{state === 'ask' ? 'Not asked yet' : NEEDS[kid.needId] + (state === 'ready' ? ', done' : '')}</em>
                    </span>
                    <span className={`slot slot-${state}`}>
                      <Icon name={state === 'ready' ? 'tick' : state === 'known' ? kid.needId : 'ask'} wash={state === 'known' ? 'need' : undefined} />
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
