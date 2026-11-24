// The game's sound. The files live in public/ and were made for this game (see the README credits).
// A browser only lets a page make sound after the player has touched it, so nothing loads or plays
// until the first tap or key. It runs on Web Audio, so volume and several tracks at once work on a phone too.

const FILES = {
  menu: 'menu-2.mp3', // "Menu 2": loops on the title screen and its pages (Carl, Nov 23)
  music: 'menu.mp3', // loops through the mornings
  tick: 'mixkit-tick-tock-clock-timer-1045.wav', // the last seconds before the bus
  lose: 'Bus-lose.mp3', // the bus left
  win: 'Bus-win.mp3', // all ten made the bus
  // not used yet: 'Dad-died.mp3' has no moment in the game yet
}
const VOLUME = { menu: 0.5, music: 0.5, tick: 0.85, lose: 0.9, win: 0.9 }
const KEY = 'dreko-sound'
// Settings: the music (the tune that loops) and the sounds (tick-tock, bus left, all aboard) each have a switch
const GROUP = { menu: 'music', music: 'music', tick: 'sounds', lose: 'sounds', win: 'sounds' }
// Settings: how loud the music and the sounds are, each in three steps (Carl, Nov 23: "Add more settings")
export const VOLUME_STEPS = [{ v: 0.4, name: 'Low' }, { v: 0.7, name: 'Mid' }, { v: 1, name: 'High' }]
const WAKE = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']

export function createSound() {
  const base = import.meta.env.BASE_URL
  const Ctx = window.AudioContext || window.webkitAudioContext
  let ctx = null
  let master = null
  const buffers = {} // each file, decoded and ready
  const playing = {} // { name: { src, gain } } for what is sounding now
  const want = {} // what should be playing right now: { name: { loop } }
  const level = {} // how far a track is turned down, 0 to 1 (1 when not set)
  let muted = false
  const on = { music: true, sounds: true }
  const vol = { music: 1, sounds: 1 }
  try {
    muted = localStorage.getItem(KEY) === 'off'
    for (const g in on) on[g] = localStorage.getItem(`${KEY}-${g}`) !== 'off'
    for (const g in vol) {
      const saved = Number(localStorage.getItem(`${KEY}-volume-${g}`))
      if (VOLUME_STEPS.some((s) => s.v === saved)) vol[g] = saved
    }
  } catch { /* private mode: sound stays on */ }

  const loud = (name) => (on[GROUP[name]] ? VOLUME[name] * (level[name] ?? 1) * vol[GROUP[name]] : 0)
  // set every track of a group that is sounding right now to how loud it should be
  const retune = (group) => {
    for (const name in playing) {
      if (GROUP[name] !== group) continue
      const g = playing[name].gain.gain
      g.cancelScheduledValues(ctx.currentTime)
      g.setValueAtTime(loud(name), ctx.currentTime)
    }
  }

  function start(name) {
    if (!ctx || !buffers[name] || playing[name] || !want[name]) return
    const src = ctx.createBufferSource()
    const gain = ctx.createGain()
    src.buffer = buffers[name]
    src.loop = !!want[name].loop
    gain.gain.value = loud(name)
    src.connect(gain).connect(master)
    const mine = { src, gain }
    src.onended = () => { if (playing[name] === mine) delete playing[name] }
    src.start()
    playing[name] = mine
  }

  async function load(name) {
    try {
      const data = await (await fetch(base + FILES[name])).arrayBuffer()
      buffers[name] = await new Promise((done, fail) => ctx.decodeAudioData(data, done, fail))
      start(name)
    } catch { /* a file that does not load leaves the game silent for that sound, nothing else */ }
  }

  // the first tap or key: make the sound engine and fetch the files
  function wake() {
    if (!Ctx) return
    if (!ctx) {
      ctx = new Ctx()
      // on an iPhone this lets the game sound even with the ring switch on silent, where the phone supports it
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback' } catch { /* not supported */ }
      master = ctx.createGain()
      master.gain.value = muted ? 0 : 1
      master.connect(ctx.destination)
      for (const name in FILES) load(name)
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {})
    else for (const type of WAKE) window.removeEventListener(type, wake)
  }
  for (const type of WAKE) window.addEventListener(type, wake)

  // no sound while the page is in the background
  const onHide = () => {
    if (!ctx) return
    if (document.hidden) ctx.suspend().catch(() => {})
    else ctx.resume().catch(() => {})
  }
  document.addEventListener('visibilitychange', onHide)

  // start a track from the top, unless it is already wanted
  function play(name, { loop = false } = {}) {
    if (want[name]) return
    want[name] = { loop }
    start(name)
  }

  // stop a track, with a short fade so it does not click off
  function stop(name, fadeMs = 350) {
    if (!want[name]) return
    delete want[name]
    const p = playing[name]
    if (!p) return
    delete playing[name]
    const now = ctx.currentTime
    p.gain.gain.setValueAtTime(p.gain.gain.value, now)
    p.gain.gain.linearRampToValueAtTime(0, now + fadeMs / 1000)
    p.src.stop(now + fadeMs / 1000 + 0.02)
  }

  // turn a track down (or back up) without stopping it: `to` is 0 to 1
  function turn(name, to, fadeMs = 400) {
    if ((level[name] ?? 1) === to) return
    level[name] = to
    const p = playing[name]
    if (!p) return
    const now = ctx.currentTime
    p.gain.gain.cancelScheduledValues(now)
    p.gain.gain.setValueAtTime(p.gain.gain.value, now)
    p.gain.gain.linearRampToValueAtTime(loud(name), now + fadeMs / 1000)
  }

  function setMuted(on) {
    muted = !!on
    try { localStorage.setItem(KEY, muted ? 'off' : 'on') } catch { /* nothing to save to */ }
    if (master) master.gain.value = muted ? 0 : 1
  }

  // Settings: turn the music or the sounds on or off. It is remembered on this device.
  function setOn(group, yes) {
    on[group] = !!yes
    try { localStorage.setItem(`${KEY}-${group}`, yes ? 'on' : 'off') } catch { /* nothing to save to */ }
    retune(group)
  }

  // Settings: how loud the music or the sounds are, one of VOLUME_STEPS. It is remembered on this device.
  function setVolume(group, v) {
    if (!(group in vol) || !VOLUME_STEPS.some((s) => s.v === v)) return
    vol[group] = v
    try { localStorage.setItem(`${KEY}-volume-${group}`, String(v)) } catch { /* nothing to save to */ }
    retune(group)
  }

  return {
    play,
    stop,
    turn,
    setMuted,
    setOn,
    setVolume,
    get volume() { return { ...vol } },
    get muted() { return muted },
    get on() { return { ...on } },
    // for tests: which tracks are sounding right now, and how loud each is set
    state: () => ({
      engine: ctx ? ctx.state : 'asleep',
      muted,
      groups: { ...on },
      volume: { ...vol },
      on: Object.fromEntries(Object.keys(FILES).map((n) => [n, !!playing[n]])),
      loud: Object.fromEntries(Object.keys(playing).map((n) => [n, +playing[n].gain.gain.value.toFixed(2)])),
    }),
    end() {
      for (const type of WAKE) window.removeEventListener(type, wake)
      document.removeEventListener('visibilitychange', onHide)
      if (ctx) ctx.close().catch(() => {})
    },
  }
}
