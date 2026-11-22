// Your three best tries, kept on this device (the browser's own storage). Nothing is sent anywhere.
// A try here is one whole game, from the first Monday to the game over. More mornings is better; on a
// tie, more kids on the last bus; on a tie again, the newer one.
const KEY = 'dreko-best-tries-v1'
const KEEP = 3

const ok = (r) => r && Number.isFinite(r.mornings) && Number.isFinite(r.week) && Number.isFinite(r.day) && Number.isFinite(r.kids) && Number.isFinite(r.at)
const better = (a, b) => b.mornings - a.mornings || b.kids - a.kids || b.at - a.at

export function readBest() {
  try {
    const list = JSON.parse(window.localStorage.getItem(KEY))
    return Array.isArray(list) ? list.filter(ok).sort(better).slice(0, KEEP) : []
  } catch {
    return [] // no storage (a private window, say): the board just starts empty
  }
}

export function clearBest() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // nothing kept, nothing to clear
  }
}

// adds a finished game and gives back the new board and where this game landed on it (-1 = not on it)
export function addRun(run) {
  const best = [...readBest(), run].sort(better).slice(0, KEEP)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(best))
  } catch {
    // nothing to do: the board still shows for this visit
  }
  return { best, place: best.indexOf(run) }
}
