import { useCallback, useEffect, useRef, useState } from 'react'
import { CLOCK, WEEK } from './config.js'
import { KIDS } from './family.js'
import Overlay, { overlayClass } from './Overlay.jsx'
import { addRun, clearBest, readBest } from './scores.js'
import { VOLUME_STEPS, createSound } from './sound.js'
import { MOVES, MOVE_NAMES, NEEDS } from './needs.js'
import Task from './Task.jsx'
import Title from './Title.jsx'
import { Coach, coach } from './Tutorial.jsx'
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
  const [groups, setGroups] = useState({ music: true, sounds: true }) // Settings: the music and the sounds, each on or off
  // More settings (Carl, Nov 23): how loud each is, full screen, and whether the Log and Walk test buttons show
  const [volume, setVolume] = useState({ music: 1, sounds: 1 })
  const [full, setFull] = useState(false)
  const [tools, setTools] = useState(() => {
    try { return localStorage.getItem('dreko-test-buttons') !== 'off' } catch { return true }
  })
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
  const [counted, setCounted] = useState(0) // counts the kids made ready, so the clock can pop the time each one earns
  // the kid picked in the need list: their bubble glows and the map rings them for a few seconds
  const [picked, setPicked] = useState(null)
  // The market: Dreko's points and what is in his pockets (from the game), whether the market card is up, which
  // pocket a controller's RB uses, and the last thing an item did (or why it could not be used).
  const [market, setMarket] = useState({ points: 0, pockets: [], gained: null, skates: false })
  const [shop, setShop] = useState(false)
  const [lit, setLit] = useState(0)
  const [itemSay, setItemSay] = useState(null)
  // The pause button (Carl's card, Nov 23): the whole morning stands still until Continue, or Back to the title
  const [paused, setPausedNow] = useState(false)
  const sayId = useRef(0)
  const [known, setKnown] = useState({})
  const [needs, setNeeds] = useState({}) // what each kid still needs today: { kidName: [needId, ...] }, dealt by the game
  const [ready, setReady] = useState({}) // kids whose need is met: 'walking' to the bus stop, or at the 'stop'
  const [near, setNear] = useState(null) // the kid Dreko is standing next to and can help
  const [task, setTask] = useState(null) // the kid whose mini task is open
  const [listOpen, setListOpen] = useState(false)
  const [clock, setClock] = useState({ phase: 'ready', week: 0, day: 0, loop: 1, total: CLOCK.firstLoop, left: CLOCK.firstLoop, boarded: 0, earned: 0 })
  // The title screen is up when the page opens: 'home', or its 'settings' or 'credits' page, or null once the
  // game is on. Open the page with ?notitle to go straight to the house.
  const [title, setTitle] = useState(() => (new URLSearchParams(window.location.search).has('notitle') ? null : 'home'))
  // How to play: has the player opened and closed the need list yet (one of its steps)
  const [listSeen, setListSeen] = useState(false)
  // Your three best tries, kept on this device. bestAt is where the game that just ended landed (-1 = not on the board).
  const [best, setBest] = useState(readBest)
  const [bestAt, setBestAt] = useState(-1)
  // the newest values, for the key and button handlers that are set up once
  const now = useRef({})
  now.current = { near, task, listOpen, needs, title, shop, lit, paused, phase: clock.phase, tutorial: clock.tutorial, pockets: market.pockets.length, card: (clock.phase === 'left' || clock.phase === 'dayWon' || clock.phase === 'over') && !clock.scene }
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
  // Continue on a card. After a morning that was won the market comes up first, and its own button goes on.
  const continueCard = useCallback(() => {
    const s = now.current
    if (s.phase === 'dayWon' && !s.tutorial && !s.shop) return setShop(true)
    setShop(false)
    gameRef.current?.next()
  }, [])
  // Pause only while a morning is being played: not on the title, on a card or inside a mini task
  const pause = useCallback(() => {
    const s = now.current
    if (s.title || s.card || s.task || (s.phase !== 'run' && s.phase !== 'ready')) return
    setListOpen(false)
    setPausedNow(true)
  }, [])
  const resume = useCallback(() => setPausedNow(false), [])
  const spendItem = useCallback((slot) => gameRef.current?.useItem(slot), [])
  const [place, setPlace] = useState('')
  const [status, setStatus] = useState('loading')
  const [showMap, setShowMap] = useState(false)
  const [walked, setWalked] = useState(false)
  // Walk test: every kid paces on the spot so the shared walk can be checked. Open the page with ?walktest to start in it.
  const [walkTest, setWalkTest] = useState(() => new URLSearchParams(window.location.search).has('walktest'))

  // How to play on the title screen: the practice morning starts, and the coach talks the player through it
  const startTutorial = useCallback(() => {
    gameRef.current?.startTutorial()
    setListSeen(false)
    setListOpen(false)
    setTask(null)
    setTitle(null)
  }, [])
  // leave the practice morning (or its last card) for the title screen
  const toTitle = useCallback(() => {
    setPausedNow(false)
    gameRef.current?.playAgain()
    setListOpen(false)
    setTask(null)
    setTitle('home')
  }, [])
  // The title screen and its pages with a controller: the D-pad or stick moves between the buttons, A presses
  // the one that is lit, B goes back, Y is How to play and Start starts.
  // The market works the same way; there A with nothing lit is its "Go to" button. So does the pause card:
  // there A with nothing lit is Continue, and B or Start goes on with the game.
  const menuButton = useCallback((button) => {
    const view = now.current.title
    const held = !view && now.current.paused
    const buttons = [...document.querySelectorAll(view ? '.title .panel button:not(:disabled)' : held ? '.pause .panel button:not(:disabled)' : '.market .panel button:not(:disabled)')]
    const at = buttons.indexOf(document.activeElement)
    if (button === 'down' || button === 'right') buttons[(at + 1) % buttons.length]?.focus()
    else if (button === 'up' || button === 'left') buttons[(Math.max(at, 0) - 1 + buttons.length) % buttons.length]?.focus()
    else if (button === 'a') (at >= 0 ? buttons[at] : view === 'home' || held ? buttons[0] : !view ? buttons[buttons.length - 1] : null)?.click()
    else if (held && (button === 'b' || button === 'start')) setPausedNow(false)
    else if (button === 'b' && view && view !== 'home') setTitle('home')
    else if (button === 'y' && view === 'home') startTutorial()
    else if (button === 'start' && view === 'home') setTitle(null)
  }, [startTutorial])

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
      if (now.current.title || now.current.shop || now.current.paused) return menuButton(button)
      if (button === 'start') return pause()
      if (button === 'a') {
        if (now.current.card) continueCard() // Continue on the card between tries and days
        else openTask()
      }
      // the pockets: LB moves on to the next thing, RB uses the one that is lit
      if (!now.current.task && !now.current.listOpen && !now.current.card && now.current.pockets) {
        if (button === 'lb') setLit((v) => (v + 1) % now.current.pockets)
        if (button === 'rb') spendItem(Math.min(now.current.lit, now.current.pockets - 1))
      }
      if (button === 'y' && !now.current.task) setListOpen((v) => !v)
      if (button === 'b') {
        setListOpen(false)
        closeTask()
      }
    }

    startGame(canvasRef.current, { onPlace: setPlace, onWalk: () => setWalked(true), onKnown: setKnown, onNeeds: setNeeds, onReady: setReady, onNear: setNear, onBubbles, onButton, onClock: setClock, onEvent: note, onCalm: () => setCalm((n) => n + 1), onCounted: () => setCounted((n) => n + 1), onMarket: setMarket, onItem: (e) => { sayId.current += 1; setItemSay({ ...e, n: sayId.current }) } })
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

  // A kid picked in the need list: the list closes, the map opens, and for a few seconds that kid is ringed on
  // the map and their bubble glows in the house.
  const mapForPick = useRef(false) // the map was opened by a pick, so it closes again with it
  const pickKid = useCallback((name) => {
    setListOpen(false)
    setShowMap((open) => {
      if (!open) mapForPick.current = true
      return true
    })
    setPicked(name)
    note(`${name} is picked in the need list: ringed on the map for a few seconds.`)
  }, [note])
  useEffect(() => {
    gameRef.current?.setPicked(picked)
    if (!picked) return undefined
    const t = setTimeout(() => {
      setPicked(null)
      if (mapForPick.current) setShowMap(false)
      mapForPick.current = false
    }, 6000)
    return () => clearTimeout(t)
  }, [picked, status])

  // the market card closes with the "day done" card, the lit pocket stays on a pocket that has something in it,
  // and what an item said fades after a moment
  useEffect(() => {
    if (clock.phase !== 'dayWon') setShop(false)
  }, [clock.phase])
  useEffect(() => {
    if (lit > 0 && lit >= market.pockets.length) setLit(Math.max(0, market.pockets.length - 1))
  }, [lit, market.pockets.length])
  useEffect(() => {
    if (!itemSay) return undefined
    const t = setTimeout(() => setItemSay(null), 2600)
    return () => clearTimeout(t)
  }, [itemSay])

  // Paused: the house stands still. The pause ends by itself if the morning does, and it starts by itself when
  // the page is hidden (a phone that locks, another tab), so the bus cannot leave while nobody is looking.
  useEffect(() => {
    gameRef.current?.setFrozen(paused)
  }, [paused, status])
  useEffect(() => {
    if (paused && (title || (clock.phase !== 'run' && clock.phase !== 'ready'))) setPausedNow(false)
  }, [paused, title, clock.phase])
  useEffect(() => {
    const hidden = () => { if (document.hidden) pause() }
    document.addEventListener('visibilitychange', hidden)
    return () => document.removeEventListener('visibilitychange', hidden)
  }, [pause])

  useEffect(() => {
    const onFull = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFull)
    return () => document.removeEventListener('fullscreenchange', onFull)
  }, [])
  // with the test buttons off, the log and the walk test go away with them
  useEffect(() => {
    if (tools) return
    setShowLog(false)
    setWalkTest(false)
  }, [tools])

  // the clock waits while the need list is open
  const listWas = useRef(false)
  useEffect(() => {
    gameRef.current?.setPaused(listOpen)
    if (listOpen !== listWas.current) note(listOpen ? 'The need list is open, so the clock waits.' : 'The need list is closed, so the clock runs again.')
    listWas.current = listOpen
  }, [listOpen, status, note])

  // Dreko stands still while the title screen is up, so the bus clock cannot start behind it
  useEffect(() => {
    gameRef.current?.setHold(title)
  }, [title, status])

  // A game that ends goes on the board of the three best tries, once
  const scored = useRef(false)
  useEffect(() => {
    if (clock.phase !== 'over') {
      scored.current = false
      return
    }
    if (scored.current) return
    scored.current = true
    const mornings = (clock.week ?? 0) * WEEK.days.length + clock.day
    const board = addRun({ mornings, week: clock.week ?? 0, day: clock.day, kids: clock.boarded ?? 0, at: Date.now() })
    setBest(board.best)
    setBestAt(board.place)
    note(`Game over after ${mornings === 1 ? '1 morning' : `${mornings} mornings`}. ${board.place >= 0 ? `It is number ${board.place + 1} of your three best tries.` : 'It is not one of your three best tries.'}`)
  }, [clock.phase])

  // How to play: opening the need list and closing it again is one of the steps
  const listOpened = useRef(false)
  useEffect(() => {
    if (!clock.tutorial) {
      listOpened.current = false
      return
    }
    if (listOpen) listOpened.current = true
    else if (listOpened.current) setListSeen(true)
  }, [listOpen, clock.tutorial])

  // Sound: made once. It stays silent until the player's first tap or key, as browsers ask.
  useEffect(() => {
    const sound = createSound()
    soundRef.current = sound
    window.__drekoSound = sound // for tests
    setSoundOn(!sound.muted)
    setGroups({ music: !sound.muted && sound.on.music, sounds: !sound.muted && sound.on.sounds })
    setVolume(sound.volume)
    sound.play('music', { loop: true }) // the menu music runs through the whole game, as Carl asked on Nov 21
    return () => {
      sound.end()
      soundRef.current = null
    }
  }, [])

  // What plays when, on top of the music: the tick-tock for the last seconds before the bus (it waits while
  // the need list is open, like the clock), the bus-left music while that card is up, and the win music on
  // the win. The menu music fades out under those two, as Carl asked on Nov 21, and comes back after.
  const hurry = clock.phase === 'run' && clock.left <= CLOCK.hurry && !listOpen && !paused
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
      if (now.current.title) {
        // The title screen: E starts, Y is How to play, B or Escape goes back a page. Enter and Space press
        // the button that is lit, as in any page; with none lit they start the game.
        const onButtonNow = document.activeElement?.tagName === 'BUTTON'
        if (now.current.title !== 'home') {
          if (key === 'escape' || key === 'b') setTitle('home')
        } else if (key === 'y') startTutorial()
        else if ((key === 'e' || ((key === ' ' || key === 'enter') && !onButtonNow)) && !e.repeat) {
          e.preventDefault()
          setTitle(null)
        }
        return
      }
      if (now.current.paused) {
        // the pause card: P or Escape goes on with the game; its buttons take Enter and Space themselves
        if ((key === 'p' || key === 'escape') && !e.repeat) resume()
        return
      }
      if (now.current.shop) return // the market: its buttons take Enter and Space themselves
      if (now.current.card) {
        // Continue on the card between tries and days
        if ((key === 'e' || key === ' ' || key === 'enter') && !e.repeat) {
          e.preventDefault()
          continueCard()
        }
        return
      }
      // 1, 2 and 3 use the thing in that pocket
      if (/^[1-9]$/.test(key) && !e.repeat && !now.current.listOpen) spendItem(Number(key) - 1)
      if (/^(arrow|[wasd]$)/i.test(e.key)) setWalked(true)
      if (key === 'y') setListOpen((v) => !v)
      // P pauses; Escape closes the need list if it is open, and pauses if it is not
      if (!e.repeat && (key === 'p' || (key === 'escape' && !now.current.listOpen))) return pause()
      if (key === 'escape' || key === 'b') setListOpen(false)
      if ((key === 'e' || key === ' ' || key === 'enter') && !e.repeat && now.current.near && !now.current.listOpen) {
        e.preventDefault()
        openTask()
      }
    }
    window.addEventListener('keydown', anyKey)
    return () => window.removeEventListener('keydown', anyKey)
  }, [])

  // Settings: the music and the sounds each have a switch. A switch shows On only when it can really be heard.
  const syncSound = () => {
    const sound = soundRef.current
    if (!sound) return
    setSoundOn(!sound.muted)
    setGroups({ music: !sound.muted && sound.on.music, sounds: !sound.muted && sound.on.sounds })
  }
  const flipSound = (group) => {
    const sound = soundRef.current
    if (!sound) return
    const want = !(!sound.muted && sound.on[group])
    if (sound.muted) {
      // all sound was off: turn it back on with only this one switch on
      sound.setOn(group === 'music' ? 'sounds' : 'music', false)
      sound.setMuted(false)
    }
    sound.setOn(group, want)
    syncSound()
  }

  // Volume: each press goes one step on, Low, Mid, High and round again
  const stepVolume = (group) => {
    const sound = soundRef.current
    if (!sound) return
    const at = VOLUME_STEPS.findIndex((s) => s.v === sound.volume[group])
    sound.setVolume(group, VOLUME_STEPS[(at + 1) % VOLUME_STEPS.length].v)
    setVolume(sound.volume)
  }
  // Full screen, where the browser has it (an iPhone does not)
  const canFull = typeof document !== 'undefined' && !!document.fullscreenEnabled
  const flipFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }
  const flipTools = () => {
    setTools((v) => {
      try { localStorage.setItem('dreko-test-buttons', v ? 'off' : 'on') } catch { /* nothing to save to */ }
      return !v
    })
  }
  const prefs = { sound: groups, onSound: flipSound, volume, onVolume: stepVolume, canFull, full, onFull: flipFull, tools, onTools: flipTools }

  // How to play: what the coach says right now (null outside the practice morning, and once its last card is up)
  const line = clock.tutorial && !title && status === 'ready' && !(clock.phase === 'dayWon' && !clock.scene) ? coach({ clock, near, known, needs, ready, listSeen }) : null

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
        onContinue={continueCard}
        paused={paused}
        prefs={prefs}
        onPause={pause}
        onResume={resume}
        market={market}
        shop={shop}
        lit={lit}
        itemSay={itemSay}
        onUse={spendItem}
        onBuy={(id) => gameRef.current?.buy(id)}
        onPutBack={(slot) => gameRef.current?.putBack(slot)}
        best={best}
        bestAt={bestAt}
        pointAt={picked ?? line?.point}
        counted={counted}
        onPick={pickKid}
        onTitle={toTitle}
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
                const sound = soundRef.current
                if (!sound) return
                sound.setMuted(soundOn)
                // turning the sound back on when both switches in Settings are off turns both on
                if (soundOn === false && !sound.on.music && !sound.on.sounds) {
                  sound.setOn('music', true)
                  sound.setOn('sounds', true)
                }
                syncSound()
              }}
            >
              Sound {soundOn ? 'on' : 'off'}
            </button>
            {tools && (
              <button type="button" className="tool" aria-pressed={showLog} onClick={() => setShowLog((v) => !v)}>
                Log
              </button>
            )}
          </div>
        }
      >
        <div className="tools">
          <button type="button" className="tool" aria-pressed={showMap} onClick={() => setShowMap((v) => !v)}>
            Map
          </button>
          {tools && (
            <button type="button" className="tool" aria-pressed={walkTest} onClick={() => setWalkTest((v) => !v)}>
              Walk test
            </button>
          )}
        </div>
      </Overlay>
      {task && (
        <div className={overlayClass}>
          <Task kid={KIDS.find((k) => k.name === task)} needId={needs[task]?.[0]} onDone={finishTask} onClose={closeTask} onEvent={note} worry={clock.worry ?? 0} onMiss={() => gameRef.current?.miss()} tip={clock.tutorial ? 'Practice: the bus clock is stopped. Take your time.' : ''} />
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
      <canvas ref={mapRef} className="minimap" hidden={!showMap || !!title || listOpen || !!task || paused || now.current.card} aria-label="Tile map of the house" />
      {status === 'loading' && <p className="note">Waking the house up</p>}
      {status === 'error' && <p className="note">The house did not load. Reload the page to try again.</p>}
      {line && !task && !listOpen && !paused && <div className={overlayClass}><Coach line={line} onLeave={toTitle} /></div>}
      {status === 'ready' && title && (
        <Title
          view={title}
          onView={setTitle}
          best={best}
          onStart={() => setTitle(null)}
          onHow={startTutorial}
          prefs={prefs}
          onClearBest={() => {
            clearBest()
            setBest([])
            setBestAt(-1)
          }}
        />
      )}
      {status === 'ready' && !title && !clock.tutorial && !walked && !task && <p className="note">Tap the floor, or use the stick or arrow keys, to walk Dreko</p>}
    </div>
  )
}
