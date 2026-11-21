// A mini task: Dreko helps one kid with their need. The card, the tick and the way out are the same for
// every need; only the middle changes. There are four moves (src/game/tasks/), and each need in
// src/game/needs.js says which one it uses and how it is set. The bus clock keeps running while this is open.
import { useCallback, useEffect, useState } from 'react'
import { ANXIETY, TASK } from './config.js'
import { Icon } from './Icon.jsx'
import { MOVES, MOVE_NAMES, NEEDS } from './needs.js'
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

export default function Task({ kid, needId = kid.needId, onDone, onClose, onEvent, worry = 0, onMiss }) {
  const spec = MOVES[needId] ?? MOVES.breakfast
  const [Move, how] = MOVE[spec.move]
  const [said, setSaid] = useState('')
  const [done, setDone] = useState(false)
  // shaky hands: 0 while he is calm enough, up to 1 at full anxiety. Each move uses it in its own way.
  const shake = Math.max(0, Math.min(1, (worry - ANXIETY.shakyFrom) / (1 - ANXIETY.shakyFrom)))
  const win = useCallback(() => setDone(true), [])
  // a task says something only on a miss; the rules log gets a line for each one
  const say = useCallback((text) => {
    setSaid(text)
    if (!text) return
    onEvent?.(`Miss on ${kid.name}'s ${NEEDS[needId]} (${MOVE_NAMES[spec.move]}): "${text}" It costs time, and it raises his anxiety.`)
    onMiss?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onEvent, kid.name, needId, spec.move])

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
        <p className="task-say" role="status">{done ? 'Done.' : said || (shake > 0 ? 'His hands are shaking. ' : '') + how(spec)}</p>
        <div className={`task-play ${done ? 'is-over' : ''} ${shake > 0 && !done ? 'is-shaky' : ''}`} style={{ '--shake': shake.toFixed(2) }} data-shake={shake.toFixed(2)}>
          <Move spec={spec} onWin={win} setSay={say} shake={shake} />
        </div>
        <button type="button" className="close task-close" onClick={onClose}>Back</button>
      </div>
    </div>
  )
}
