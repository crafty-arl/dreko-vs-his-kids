// The title screen: Start, How to play, Settings and Credits, and the board of your three best tries.
// The board is also shown on the game over card.
import { useState } from 'react'
import { WEEK } from './config.js'
import { KIDS } from './family.js'
import { overlayClass } from './Overlay.jsx'
import { usePad } from './pad.js'
import { SettingRows } from './Settings.jsx'

const art = import.meta.env.BASE_URL + 'art/'
const mornings = (n) => (n === 1 ? '1 morning' : `${n} mornings`)

// best: [{ mornings, week, day, kids, at }], best first. mark: which row is the game that just ended.
export function BestTries({ best, mark = -1 }) {
  return (
    <div className="best">
      <h3>Your three best tries</h3>
      {best.length === 0 ? (
        <p className="best-none">Nothing here yet. Your first try goes here.</p>
      ) : (
        <ol>
          {best.map((run, i) => (
            <li key={run.at} className={i === mark ? 'best-row best-now' : 'best-row'}>
              <span className="best-rank">{i + 1}</span>
              <span className="best-what">
                {mornings(run.mornings)}
                <em>Got to {WEEK.days[run.day]}{run.week > 0 ? ` of week ${run.week + 1}` : ''}, {run.kids} of {KIDS.length} on the last bus</em>
              </span>
              {i === mark && <span className="best-tag">New</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// what the browser says about a controller, in one line
function PadLine({ pad, short }) {
  if (!pad.can) return <p className="pad-line">This browser does not pass controllers to web pages.</p>
  if (!pad.seen) return <p className="pad-line">Using a controller? Press any button on it so the browser shows it to the game.</p>
  return (
    <>
      <p className="pad-line pad-on">Controller connected: {pad.name}</p>
      {short && !pad.standard && !pad.taught && <p className="pad-line">Its buttons are in an unusual order. Open Settings to set them up.</p>}
    </>
  )
}

function Settings({ prefs, onClearBest, hasBest, onBack }) {
  const pad = usePad(true)
  const [sure, setSure] = useState(false)
  return (
    <div className="panel panel-bus panel-title panel-menu">
      <h2>Settings</h2>
      <SettingRows prefs={prefs} />
      <div className="set-box">
        <h3>Controller</h3>
        <PadLine pad={pad} />
        {pad.seen && pad.learn && (
          <>
            <p className="pad-learn" aria-live="polite">Press <b>{pad.learn.name}</b> on the controller <small>{pad.learn.at + 1} of {pad.learn.total}</small></p>
            <button type="button" className="tool" onClick={pad.stopTeach}>Cancel</button>
          </>
        )}
        {pad.seen && !pad.learn && (
          <>
            <p className="pad-line">Press a button or push the stick. What the game sees shows here:</p>
            <p className="pad-test" aria-live="polite">{pad.down.length ? pad.down.map((name) => <b key={name}>{name}</b>) : <i>nothing pressed</i>}</p>
            {!pad.standard && !pad.taught && <p className="pad-line">The browser does not know this controller's button order. Set the buttons up once and the game will remember.</p>}
            {pad.taught && <p className="pad-line">This controller's buttons were set up by you.</p>}
            <div className="pad-tools">
              <button type="button" className="tool" onClick={pad.teach}>{pad.taught ? 'Set up again' : 'Set up buttons'}</button>
              {pad.taught && <button type="button" className="tool" onClick={pad.forget}>Undo set up</button>}
            </div>
          </>
        )}
      </div>
      <div className="set-row">
        <span>Your three best tries</span>
        <button
          type="button"
          className="tool"
          disabled={!hasBest}
          onClick={() => {
            if (!sure) return setSure(true)
            onClearBest()
            setSure(false)
          }}
        >
          {!hasBest ? 'Empty' : sure ? 'Tap again to clear' : 'Clear'}
        </button>
      </div>
      <button type="button" className="close again" onClick={onBack}><span className="key key-b">B</span>Back</button>
    </div>
  )
}

// The names and lines here are a draft for Carl to correct before the game is handed in.
function Credits({ onBack }) {
  return (
    <div className="panel panel-bus panel-title panel-menu">
      <h2>Credits</h2>
      <dl className="credits">
        <dt>Made by</dt>
        <dd>Carl Lewis and Contessa Louise Cooper / auramation</dd>
        <dt>Made for</dt>
        <dd>Tiny Loop Jam 2026</dd>
        <dt>Map engine</dt>
        <dd>GM! 2.5D Map Engine by Carl Lewis</dd>
        <dt>Music and sounds</dt>
        <dd>Made for this game. Clock tick from Mixkit.</dd>
        <dt>Art</dt>
        <dd>Painted with Higgsfield (Nano Banana 2) from Carl's character and world notes</dd>
        <dt>Code</dt>
        <dd>Written with Claude</dd>
        <dt>Built with</dt>
        <dd>three.js, React and Vite. The font is Anton.</dd>
      </dl>
      <p className="credits-ai">This game uses generative AI for its art and its code.</p>
      <button type="button" className="close again" onClick={onBack}><span className="key key-b">B</span>Back</button>
    </div>
  )
}

// The words under the name are a stand-in: they only say the rules that are in the game.
// view: 'home', 'settings' or 'credits'.
export default function Title({ view, onView, best, onStart, onHow, prefs, onClearBest }) {
  const pad = usePad(false)
  return (
    <div className={`${overlayClass} title`}>
      <div className="list">
        {view === 'settings' && <Settings prefs={prefs} onClearBest={onClearBest} hasBest={best.length > 0} onBack={() => onView('home')} />}
        {view === 'credits' && <Credits onBack={() => onView('home')} />}
        {view === 'home' && (
          <div className="panel panel-bus panel-title">
            <div className="title-cast" aria-hidden="true">
              <img className="title-dreko" src={`${art}dreko.webp`} alt="" />
              <span className="title-kids">
                {KIDS.map((kid) => <img key={kid.name} src={`${art}${kid.name.toLowerCase()}.webp`} alt="" />)}
              </span>
            </div>
            <h1>Dreko <b><span>vs</span> His Kids</b></h1>
            <p>Get all ten kids on the school bus.</p>
            <p>{WEEK.tries} tries each morning. Every morning is harder.</p>
            <button type="button" className="close again" onClick={onStart} autoFocus><span className="key key-a">A</span>Start</button>
            <div className="title-more">
              <button type="button" className="tool" onClick={onHow}><span className="key key-y">Y</span>How to play</button>
              <button type="button" className="tool" onClick={() => onView('settings')}>Settings</button>
              <button type="button" className="tool" onClick={() => onView('credits')}>Credits</button>
            </div>
            <PadLine pad={pad} short />
            <BestTries best={best} />
          </div>
        )}
      </div>
    </div>
  )
}
