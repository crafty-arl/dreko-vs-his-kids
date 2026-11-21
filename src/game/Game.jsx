import { useCallback, useEffect, useRef, useState } from 'react'
import { CLOCK } from './config.js'
import { KIDS } from './family.js'
import Overlay, { overlayClass } from './Overlay.jsx'
import { createSound } from './sound.js'
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
  const [known, setKnown] = useState({})
  const [needs, setNeeds] = useState({}) // who needs what this game: { kidName: needId }, dealt by the game
  const [ready, setReady] = useState({}) // kids whose need is met: 'walking' to the bus stop, or at the 'stop'
  const [near, setNear] = useState(null) // the kid Dreko is standing next to and can help
  const [task, setTask] = useState(null) // the kid whose mini task is open
  const [listOpen, setListOpen] = useState(false)
  const [clock, setClock] = useState({ phase: 'ready', loop: 1, total: CLOCK.firstLoop, left: CLOCK.firstLoop, boarded: 0 })
  // the newest values, for the key and button handlers that are set up once
  const now = useRef({})
  now.current = { near, task, listOpen }
  const openTask = useCallback(() => {
    const s = now.current
    if (s.near && !s.task && !s.listOpen) setTask(s.near)
  }, [])
  const closeTask = useCallback(() => setTask(null), [])
  const finishTask = useCallback(() => {
    const name = now.current.task
    setTask(null)
    if (name) gameRef.current?.markReady(name)
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
      points.forEach(([x, y, show], i) => {
        const el = bubbleRefs.current[i]
        if (!el) return
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`
        el.style.visibility = show ? 'visible' : 'hidden'
      })
    }
    const onButton = (button) => {
      if (button === 'a') openTask()
      if (button === 'y' && !now.current.task) setListOpen((v) => !v)
      if (button === 'b') {
        setListOpen(false)
        setTask(null)
      }
    }

    startGame(canvasRef.current, { onPlace: setPlace, onWalk: () => setWalked(true), onKnown: setKnown, onNeeds: setNeeds, onReady: setReady, onNear: setNear, onBubbles, onButton, onClock: setClock })
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
  useEffect(() => {
    gameRef.current?.setPaused(listOpen)
  }, [listOpen, status])

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
  useEffect(() => {
    const sound = soundRef.current
    if (!sound) return
    if (hurry) sound.play('tick', { loop: true })
    else sound.stop('tick')
    if (clock.phase === 'left') sound.play('lose')
    else sound.stop('lose', 900)
    if (clock.phase === 'won') sound.play('win')
    else sound.stop('win')
    sound.turn('music', clock.phase === 'left' || clock.phase === 'won' ? 0 : 1, clock.phase === 'left' || clock.phase === 'won' ? 500 : 1200)
  }, [hurry, clock.phase])

  // Dreko stands still while he helps a kid. The clock keeps running.
  useEffect(() => {
    gameRef.current?.setBusy(!!task)
  }, [task, status])

  // the bus does not wait for a task: when it leaves, or the kid walks off, the task closes
  useEffect(() => {
    if (task && (clock.phase === 'left' || clock.phase === 'won' || ready[task])) setTask(null)
  }, [task, clock.phase, ready])

  useEffect(() => {
    const anyKey = (e) => {
      if (now.current.task) return // the mini task reads the keys while it is open
      const key = e.key.toLowerCase()
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
      {/* Anxiety climbs as the clock runs down, and a little less for every kid Dreko has learned. Draft numbers. */}
      <Overlay
        place={place}
        known={known}
        needs={needs}
        ready={ready}
        helping={!task && !listOpen && (clock.phase === 'run' || clock.phase === 'ready') ? KIDS.find((k) => k.name === near) : null}
        onHelp={openTask}
        onPlayAgain={() => gameRef.current?.playAgain()}
        clock={clock}
        worry={(1 - clock.left / clock.total) * (1 - 0.05 * Object.keys(known).length)}
        listOpen={listOpen}
        onToggleList={() => setListOpen((v) => !v)}
        bubbleRefs={bubbleRefs}
        settings={
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
          <Task kid={KIDS.find((k) => k.name === task)} needId={needs[task]} onDone={finishTask} onClose={closeTask} />
        </div>
      )}
      <canvas ref={mapRef} className="minimap" hidden={!showMap} aria-label="Tile map of the house" />
      {status === 'loading' && <p className="note">Waking the house up</p>}
      {status === 'error' && <p className="note">The house did not load. Reload the page to try again.</p>}
      {status === 'ready' && !walked && !task && <p className="note">Tap the floor, or use the stick or arrow keys, to walk Dreko</p>}
    </div>
  )
}
