// A mini task: Dreko helps one kid with their need. The card, the tick and the way out are the same for
// every need; only the middle changes. There are four moves (src/game/tasks/), and each need in
// src/game/needs.js says which one it uses and how it is set. The bus clock keeps running while this is open.
import { useCallback, useEffect, useState } from 'react'
import { TASK } from './config.js'
import { Icon } from './Icon.jsx'
import { MOVES, NEEDS } from './needs.js'
import Hold, { how as holdHow } from './tasks/Hold.jsx'
import Pieces, { how as piecesHow } from './tasks/Pieces.jsx'
import Sides, { how as sidesHow } from './tasks/Sides.jsx'
import Trace, { how as traceHow } from './tasks/Trace.jsx'

const MOVE = {
  hold: [Hold, holdHow],
  pieces: [Pieces, piecesHow],
  trace: [Trace, traceHow],
  sides: [Sides, sidesHow],
}

export default function Task({ kid, needId = kid.needId, onDone, onClose }) {
  const spec = MOVES[needId] ?? MOVES.breakfast
  const [Move, how] = MOVE[spec.move]
  const [said, setSaid] = useState('')
  const [done, setDone] = useState(false)
  const win = useCallback(() => setDone(true), [])

  // the need is met: show the tick for a moment, then the kid walks off
  useEffect(() => {
    if (!done) return undefined
    const t = setTimeout(onDone, TASK.doneMs)
    return () => clearTimeout(t)
  }, [done, onDone])

  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'b') onClose()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  return (
    <div className="list" role="dialog" aria-label={`Help ${kid.name}: ${NEEDS[needId]}`} data-move={spec.move}>
      <div className="panel panel-task">
        <h2>{NEEDS[needId]} <small>{kid.name}</small></h2>
        <div className={`task-art ${done ? 'task-done' : ''}`}>
          <Icon name={done ? 'tick' : needId} wash={done ? 'green' : 'need'} />
        </div>
        <p className="task-say" role="status">{done ? 'Done.' : said || how(spec)}</p>
        <div className={`task-play ${done ? 'is-over' : ''}`}>
          <Move spec={spec} onWin={win} setSay={setSaid} />
        </div>
        <button type="button" className="close task-close" onClick={onClose}>Back</button>
      </div>
    </div>
  )
}
