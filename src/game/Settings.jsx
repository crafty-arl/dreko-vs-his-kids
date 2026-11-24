// The settings the title screen's Settings page and the pause card share (Carl, Nov 23: "Add more settings").
// prefs: { sound: { music, sounds }, onSound(group), volume: { music, sounds }, onVolume(group), canFull, full,
// onFull(), tools, onTools() }. Everything here is remembered on the device, except full screen.
import { VOLUME_STEPS } from './sound.js'

const volumeName = (v) => (VOLUME_STEPS.find((s) => s.v === v) ?? VOLUME_STEPS[VOLUME_STEPS.length - 1]).name

export function SettingRows({ prefs }) {
  if (!prefs) return null
  return (
    <>
      {[['music', 'Music'], ['sounds', 'Sounds']].map(([group, name]) => (
        <div key={group} className="set-row">
          <span>{name}</span>
          <span className="set-pair">
            <button type="button" className="tool" aria-pressed={prefs.sound[group]} aria-label={`${name} ${prefs.sound[group] ? 'on' : 'off'}`} onClick={() => prefs.onSound(group)}>{prefs.sound[group] ? 'On' : 'Off'}</button>
            <button type="button" className="tool tool-plain" disabled={!prefs.sound[group]} aria-label={`${name} volume: ${volumeName(prefs.volume[group])}`} onClick={() => prefs.onVolume(group)}>{volumeName(prefs.volume[group])}</button>
          </span>
        </div>
      ))}
      {prefs.canFull && (
        <div className="set-row">
          <span>Full screen</span>
          <button type="button" className="tool" aria-pressed={prefs.full} onClick={prefs.onFull}>{prefs.full ? 'On' : 'Off'}</button>
        </div>
      )}
      <div className="set-row">
        <span>Test buttons <em>Log and Walk test</em></span>
        <button type="button" className="tool" aria-pressed={prefs.tools} onClick={prefs.onTools}>{prefs.tools ? 'On' : 'Off'}</button>
      </div>
    </>
  )
}
