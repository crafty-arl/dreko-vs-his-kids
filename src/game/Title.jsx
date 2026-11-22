// The title screen, and the board of your three best tries. The board is also shown on the game over card.
import { WEEK } from './config.js'
import { KIDS } from './family.js'
import { overlayClass } from './Overlay.jsx'

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

// The words under the name are a stand-in: they only say the rules that are in the game.
export default function Title({ best, onStart }) {
  return (
    <div className={`${overlayClass} title`}>
      <div className="list">
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
          <BestTries best={best} />
        </div>
      </div>
    </div>
  )
}
