import { useEffect, useRef, useState } from 'react'
import { startGame } from './world.js'

// The game screen: one canvas for the house, and a thin layer of signs on top.
export default function Game() {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const mapRef = useRef(null)
  const gameRef = useRef(null)
  const [place, setPlace] = useState('')
  const [status, setStatus] = useState('loading')
  const [showMap, setShowMap] = useState(false)
  const [walked, setWalked] = useState(false)

  useEffect(() => {
    let cancelled = false
    let game = null
    const stage = stageRef.current
    const fit = () => game && game.resize(stage.clientWidth, stage.clientHeight)
    const watch = new ResizeObserver(fit)

    startGame(canvasRef.current, { onPlace: setPlace, onWalk: () => setWalked(true) })
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
    const anyKey = (e) => {
      if (/^(arrow|[wasd]$)/i.test(e.key)) setWalked(true)
    }
    window.addEventListener('keydown', anyKey)
    return () => window.removeEventListener('keydown', anyKey)
  }, [])

  return (
    <div ref={stageRef} className="stage">
      <canvas ref={canvasRef} className="world" />
      <header className="hud">
        <h1 className="title">Dreko vs His Kids</h1>
        {place && <p className="place">{place}</p>}
        <button type="button" className="map-button" aria-pressed={showMap} onClick={() => setShowMap((v) => !v)}>
          Map
        </button>
      </header>
      <canvas ref={mapRef} className="minimap" hidden={!showMap} aria-label="Tile map of the house" />
      {status === 'loading' && <p className="note">Waking the house up</p>}
      {status === 'error' && <p className="note">The house did not load. Reload the page to try again.</p>}
      {status === 'ready' && !walked && <p className="note">Tap the floor, or use the stick or arrow keys, to walk Dreko</p>}
    </div>
  )
}
