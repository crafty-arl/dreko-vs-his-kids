import { useCallback, useEffect, useRef, useState } from 'react'
import { CLOCK, WEEK } from './config.js'
import { KIDS } from './family.js'
import Overlay, { overlayClass } from './Overlay.jsx'
import { createSound } from './sound.js'
import { MOVES, MOVE_NAMES, NEEDS } from './needs.js'
import Task from './Task.jsx'
import { startGame } from './world.js'

// The game screen: one canvas for the house, and the overlay on top.
export default function Game() {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const mapRef = useRef(null)
  const gameRef = useRef(null)
  const bubbleRefs = useRef([])
  const soundRef = useRef(null)
  const [soundOn, setSoundOn] = useState(true)
  // The rules log: a line for every rule that fires, newest first. Open the page with ?log to start with it showing.
  const [log, setLog] = useState([])
  const [showLog, setShowLog] = useState(() => new URLSearchParams(window.location.search).has('log'))
  const logId = useRef(0)
  const note = useCallback((event) => {
    const e = typeof event === 'string' ? { text: event, ...(gameRef.current?.state().clock ?? { day: 0, loop: 1, left: CLOCK.firstLoop }) } : event
    const seconds = Math.ceil(e.left)
    const stamp = `${e.week ? `W${e.week + 1} ` : ''}${WEEK.days[e.day].slice(0, 3)}${e.loop > 1 ? ` try ${e.loop}` : ''} ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    logId.current += 1
    const line = { id: logId.current, stamp, text: e.text }
    setLog((list) => [line, ...list].slice(0, 80))
  }, [])
  const [calm, setCalm] = useState(0) // counts the calm moments, so the anxiety bar can show each one
  const [known, setKnown] = useState({})
  const [needs, setNeeds] = useState({}) // what each kid still needs today: { kidName: [needId, ...] }, dealt by the game
  const [ready, setReady] = useState({}) // kids whose need is met: 'walking' to the bus stop, or at the 'stop'
  const [near, setNear] = useState(null) // the kid Dreko is standing next to and can help
  const [task, setTask] = useState(null) // the kid whose mini task is open
  const [listOpen, setListOpen] = useState(false)
  const [clock, setClock] = useState({ phase: 'ready', week: 0, day: 0, loop: 1, total: CLOCK.firstLoop, left: CLOCK.firstLoop, boarded: 0, earned: 0 })
  // the newest values, for the key and button handlers that are set up once
  const now = useRef({})
  now.current = { near, task, listOpen, needs, card: (clock.phase === 'left' || clock.phase === 'dayWon' || clock.phase === 'over') && !clock.scene }
  const openTask = useCallback(() => {
    const s = now.current
    if (!s.near || s.task || s.listOpen) return
    const id = s.needs[s.near]?.[0]
    if (id) note(`Dreko presses A next to ${s.near}. Task opens: ${MOVE_NAMES[MOVES[id].move]}, for ${NEEDS[id]}. The clock keeps running.`)
    setTask(s.near)
  }, [note])
  const closeTask = useCallback(() => {
    if (now.current.task) note(`Dreko steps back from ${now.current.task}'s task. Nothing done.`)
    setTask(null)
  }, [note])
  const finishTask = useCallback(() => {
    const name = now.current.task
    setTask(null)
    if (name) gameRef.current?.needMet(name)
  }, [])
  const [place, setPlace] = useState('')
  const [status, setStatus] = useState('loading')
  const [showMap, setShowMap] = useState(false)
  const [walked, setWalked] = useState(false)
  // Walk test: every kid paces on the spot so the shared walk can be checked. Open the page with ?walktest to start in it.
  const [walkTest, setWalkTest] = useState(() => new URLSearchParams(window.location.search).has('walktest'))

  useEffect(() => {
    let cancelled = false
    let game = null
    const stage = stageRef.current
    const fit = () => game && game.resize(stage.clientWidth, stage.clientHeight)
    const watch = new ResizeObserver(fit)

    // the game moves the bubbles itself, every frame, without asking React to draw again
    const onBubbles = (points) => {
      points.forEach(([px, py, seen, pin], i) => {
        const el = bubbleRefs.current[i]
        if (!el) return
        // a kid who says "Oh wait, I forgot something!" is kept on screen, at the edge nearest to them
        const x = pin ? Math.max(72, Math.min(stage.clientWidth - 72, px)) : px
        const y = pin ? Math.max(170, Math.min(stage.clientHeight - 84, py)) : py
        const show = seen || pin
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`
        el.style.visibility = show ? 'visible' : 'hidden'
      })
    }
    const onButton = (button) => {
      if (button === 'a') {
        if (now.current.card) gameRef.current?.next() // Continue on the card between tries and days
        else openTask()
      }
      if (button === 'y' && !now.current.task) setListOpen((v) => !v)
      if (button === 'b') {
        setListOpen(false)
        closeTask()
      }
    }

    startGame(canvasRef.current, { onPlace: setPlace, onWalk: () => setWalked(true), onKnown: setKnown, onNeeds: setNeeds, onReady: setReady, onNear: setNear, onBubbles, onButton, onClock: setClock, onEvent: note, onCalm: () => setCalm((n) => n + 1) })
      .then((g) => {
        if (cancelled) return g.stop()
        game = g
        gameRef.current = g
        window.__dreko = g // lets a test, or you in the console, ask where Dreko is
        fit()
        watch.observe(stage)
        setStatus('ready')
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      watch.disconnect()
      if (game) game.stop()
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    gameRef.current?.setMapCanvas(showMap ? mapRef.current : null)
  }, [showMap, status])

  useEffect(() => {
    gameRef.current?.setWalkTest(walkTest)
  }, [walkTest, status])

  // the clock waits while the need list is open
  const listWas = useRef(false)
  useEffect(() => {
    gameRef.current?.setPaused(listOpen)
    if (listOpen !== listWas.current) note(listOpen ? 'The need list is open, so the clock waits.' : 'The need list is closed, so the clock runs again.')
    listWas.current = listOpen
  }, [listOpen, status, note])

  // Sound: made once. It stays silent until the player's first tap or key, as browsers ask.
  useEffect(() => {
    const sound = createSound()
    soundRef.current = sound
    window.__drekoSound = sound // for tests
    setSoundOn(!sound.muted)
    sound.play('music', { loop: true }) // the menu music runs through the whole game, as Carl asked on Nov 21
    return () => {
      sound.end()
      soundRef.current = null
    }
  }, [])

  // What plays when, on top of the music: the tick-tock for the last seconds before the bus (it waits while
  // the need list is open, like the clock), the bus-left music while that card is up, and the win music on
  // the win. The menu music fades out under those two, as Carl asked on Nov 21, and comes back after.
  const hurry = clock.phase === 'run' && clock.left <= CLOCK.hurry && !listOpen
  const hurryWas = useRef(false)
  useEffect(() => {
    const sound = soundRef.current
    if (!sound) return
    if (hurry) sound.play('tick', { loop: true })
    else sound.stop('tick')
    if (hurry && !hurryWas.current) note(`Last ${CLOCK.hurry} seconds: the clock turns red and the tick-tock starts.`)
    hurryWas.current = hurry
    const lost = clock.phase === 'left' || clock.phase === 'over'
    if (lost) sound.play('lose')
    else sound.stop('lose', 900)
    const won = clock.phase === 'dayWon'
    if (won) sound.play('win')
    else sound.stop('win', 900)
    sound.turn('music', lost || won ? 0 : 1, lost || won ? 500 : 1200)
  }, [hurry, clock.phase])

  // Dreko stands still while he helps a kid. The clock keeps running.
  useEffect(() => {
    gameRef.current?.setBusy(task)
  }, [task, status])

  // the bus does not wait for a task: when it leaves, or the kid walks off, the task closes
  useEffect(() => {
    if (task && (clock.phase !== 'run' && clock.phase !== 'ready' || ready[task] === 'walking' || ready[task] === 'stop')) setTask(null)
  }, [task, clock.phase, ready])

  useEffect(() => {
    const anyKey = (e) => {
      if (now.current.task) return // the mini task reads the keys while it is open
      const key = e.key.toLowerCase()
      if (now.current.card) {
        // Continue on the card between tries and days
        if ((key === 'e' || key === ' ' || key === 'enter') && !e.repeat) {
          e.preventDefault()
          gameRef.current?.next()
        }
        return
      }
      if (/^(arrow|[wasd]$)/i.test(e.key)) setWalked(true)
      if (key === 'y') setListOpen((v) => !v)
      if (key === 'escape' || key === 'b') setListOpen(false)
      if ((key === 'e' || key === ' ' || key === 'enter') && !e.repeat && now.current.near && !now.current.listOpen) {
        e.preventDefault()
        openTask()
      }
    }
    window.addEventListener('keydown', anyKey)
    return () => window.removeEventListener('keydown', anyKey)
  }, [])

  return (
    <div ref={stageRef} className="stage">
      <canvas ref={canvasRef} className="world" />
      {/* Anxiety comes from the game (world.js): up with the clock and with misses, down with what Dreko learns */}
      <Overlay
        place={place}
        known={known}
        needs={needs}
        ready={ready}
        helping={!task && !listOpen && (clock.phase === 'run' || clock.phase === 'ready') ? KIDS.find((k) => k.name === near) : null}
        onHelp={openTask}
        onPlayAgain={() => gameRef.current?.playAgain()}
        onContinue={() => gameRef.current?.next()}
        clock={clock}
        worry={clock.worry ?? 0}
        calm={calm}
        listOpen={listOpen}
        onToggleList={() => setListOpen((v) => !v)}
        bubbleRefs={bubbleRefs}
        settings={
          <div className="tools">
            <button
              type="button"
              className="tool"
              aria-pressed={soundOn}
              onClick={() => {
                soundRef.current?.setMuted(soundOn)
                setSoundOn(!soundOn)
              }}
            >
              Sound {soundOn ? 'on' : 'off'}
            </button>
            <button type="button" className="tool" aria-pressed={showLog} onClick={() => setShowLog((v) => !v)}>
              Log
            </button>
          </div>
        }
      >
        <div className="tools">
          <button type="button" className="tool" aria-pressed={showMap} onClick={() => setShowMap((v) => !v)}>
            Map
          </button>
          <button type="button" className="tool" aria-pressed={walkTest} onClick={() => setWalkTest((v) => !v)}>
            Walk test
          </button>
        </div>
      </Overlay>
      {task && (
        <div className={overlayClass}>
          <Task kid={KIDS.find((k) => k.name === task)} needId={needs[task]?.[0]} onDone={finishTask} onClose={closeTask} onEvent={note} worry={clock.worry ?? 0} onMiss={() => gameRef.current?.miss()} />
        </div>
      )}
      {showLog && (
        <section className={`rules-log ${task ? 'rules-log-small' : ''}`} aria-label="Rules log">
          <h2>Rules log <small>newest first</small></h2>
          <ol>
            {log.map((line) => (
              <li key={line.id}><b>{line.stamp}</b> {line.text}</li>
            ))}
          </ol>
        </section>
      )}
      <canvas ref={mapRef} className="minimap" hidden={!showMap} aria-label="Tile map of the house" />
      {status === 'loading' && <p className="note">Waking the house up</p>}
      {status === 'error' && <p className="note">The house did not load. Reload the page to try again.</p>}
      {status === 'ready' && !walked && !task && <p className="note">Tap the floor, or use the stick or arrow keys, to walk Dreko</p>}
    </div>
  )
}
