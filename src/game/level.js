// How hard a morning is. The first week is Carl and Tessa's ramp (config.js WEEK). Past Friday the game goes on,
// week after week, and keeps getting harder (config.js HARDER). `week` and `day` count from 0.
import { CLOCK, HARDER, ROAM, WEEK } from './config.js'

export function levelOf(week, day) {
  const n = week * WEEK.days.length + day // 0 is the first Monday
  const past = Math.max(0, n - (WEEK.days.length - 1)) // mornings past the first Friday
  return {
    number: n + 1,
    needs: week === 0 ? WEEK.needs[day] : HARDER.needs,
    seconds: Math.max(HARDER.leastTime, CLOCK.firstLoop - HARDER.lessTime * past),
    roam: week > 0 || day >= ROAM.fromDay,
    roamSpeed: Math.min(HARDER.roamFastest, ROAM.speed + HARDER.roamFaster * week),
  }
}

// The morning after this one: [week, day]. After Friday comes the next week's Monday.
export const dayAfter = (week, day) => (day >= WEEK.days.length - 1 ? [week + 1, 0] : [week, day + 1])
