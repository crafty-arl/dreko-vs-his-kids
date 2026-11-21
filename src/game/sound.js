// The game's sound. The files live in public/ and were made for this game (see the README credits).
// A browser only lets a page make sound after the player has touched it, so nothing loads or plays
// until the first tap or key.

const FILES = {
  tick: 'mixkit-tick-tock-clock-timer-1045.wav', // the last seconds before the bus
  lose: 'Bus-lose.mp3', // the bus left
  win: 'Bus-win.mp3', // all ten made the bus
  // not used yet: 'menu.mp3' waits for a title screen, and 'Dad-died.mp3' has no moment in the game yet
}
const VOLUME = { tick: 0.7, lose: 0.8, win: 0.8 }
const KEY = 'dreko-sound'

export function createSound() {
  const base = import.meta.env.BASE_URL
  const tracks = {}
  const want = {} // what should be playing right now: { name: { loop } }
  const fades = {}
  let unlocked = false
  let muted = false
  try { muted = localStorage.getItem(KEY) === 'off' } catch { /* private mode: sound stays on */ }

  const start = (name) => {
    const a = tracks[name]
    if (!a || muted) return
    clearInterval(fades[name])
    a.loop = !!want[name].loop
    a.volume = VOLUME[name]
    a.play().catch(() => {}) // the browser may still say no; the game carries on silent
  }

  function unlock() {
    if (unlocked) return
    unlocked = true
    for (const name in FILES) {
      const a = new Audio(base + FILES[name])
      a.preload = 'auto'
      tracks[name] = a
    }
    for (const name in want) start(name)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)

  // start a track from the top, unless it is already going
  function play(name, { loop = false } = {}) {
    if (want[name]) return
    want[name] = { loop }
    if (tracks[name]) tracks[name].currentTime = 0
    start(name)
  }

  // stop a track, with a short fade so it does not click off
  function stop(name, fadeMs = 350) {
    if (!want[name]) return
    delete want[name]
    const a = tracks[name]
    if (!a || a.paused) return
    clearInterval(fades[name])
    const from = a.volume
    const began = performance.now()
    fades[name] = setInterval(() => {
      const f = fadeMs ? (performance.now() - began) / fadeMs : 1
      if (f >= 1) {
        clearInterval(fades[name])
        a.pause()
      } else a.volume = from * (1 - f)
    }, 30)
  }

  function setMuted(on) {
    muted = !!on
    try { localStorage.setItem(KEY, muted ? 'off' : 'on') } catch { /* nothing to save to */ }
    for (const name in tracks) {
      if (muted) {
        clearInterval(fades[name])
        tracks[name].pause()
      } else if (want[name]) start(name)
    }
  }

  return {
    play,
    stop,
    setMuted,
    get muted() { return muted },
    // for tests: which tracks are sounding right now
    state: () => Object.fromEntries(Object.keys(FILES).map((n) => [n, !!tracks[n] && !tracks[n].paused])),
    end() {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      for (const name in tracks) {
        clearInterval(fades[name])
        tracks[name].pause()
      }
    },
  }
}
