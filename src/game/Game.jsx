import { useEffect, useRef, useState } from 'react'
import { CLOCK } from './config.js'
import Overlay from './Overlay.jsx'
import { startGame } from './world.js'

// The game screen: one canvas for the house, and the overlay on top.
export default function Game() {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const mapRef = useRef(null)
  const gameRef = useRef(null)
  const bubbleRefs = useRef([])
  const [known, setKnown] = useState({})
  const [listOpen, setListOpen] = useState(false)
  const [clock, setClock] = useState({ phase: 'ready', loop: 1, total: CLOCK.firstLoop, left: CLOCK.firstLoop })
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
      if (button === 'y') setListOpen((v) => !v)
      if (button === 'b') setListOpen(false)
    }

    startGame(canvasRef.current, { onPlace: setPlace, onWalk: () => setWalked(true), onKnown: setKnown, onBubbles, onButton, onClock: setClock })
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

  useEffect(() => {
    const anyKey = (e) => {
      if (/^(arrow|[wasd]$)/i.test(e.key)) setWalked(true)
      if (e.key.toLowerCase() === 'y') setListOpen((v) => !v)
      if (e.key === 'Escape' || e.key.toLowerCase() === 'b') setListOpen(false)
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
        ready={{}}
        clock={clock}
        worry={(1 - clock.left / clock.total) * (1 - 0.05 * Object.keys(known).length)}
        listOpen={listOpen}
        onToggleList={() => setListOpen((v) => !v)}
        bubbleRefs={bubbleRefs}
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
      <canvas ref={mapRef} className="minimap" hidden={!showMap} aria-label="Tile map of the house" />
      {status === 'loading' && <p className="note">Waking the house up</p>}
      {status === 'error' && <p className="note">The house did not load. Reload the page to try again.</p>}
      {status === 'ready' && !walked && <p className="note">Tap the floor, or use the stick or arrow keys, to walk Dreko</p>}
    </div>
  )
}
