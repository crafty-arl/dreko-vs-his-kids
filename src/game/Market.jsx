// The market (Carl, Nov 23): between two mornings Dreko spends the points a won morning paid on things for his
// pockets, and in the house he uses each thing once, at the moment the player picks. The rules and every number
// are in config.js (MARKET) and world.js (buy, putBack, useItem); this file only draws them.
import { MARKET } from './config.js'
import { Icon } from './Icon.jsx'

const IDS = Object.keys(MARKET.items)
const slots = (pockets) => Array.from({ length: MARKET.pockets }, (_, i) => pockets[i] ?? null)

// The market card. It comes up after the "day done" card, in place of it.
// The spot for the character who runs it is empty on purpose: that character is Carl's to make.
export default function Market({ market, nextDay, onBuy, onPutBack, onGo }) {
  const full = market.pockets.length >= MARKET.pockets
  return (
    <div className="list market" role="dialog" aria-label="The market">
      <div className="panel panel-bus panel-market">
        <div className="market-who">
          <div className="market-ghost" aria-hidden="true">Your character goes here</div>
          <div>
            <h2>The market</h2>
            <p className="market-points" aria-live="polite">{market.points} {market.points === 1 ? 'point' : 'points'} to spend</p>
          </div>
        </div>
        <ul className="shelf">
          {IDS.map((id) => {
            const item = MARKET.items[id]
            const poor = market.points < item.price
            return (
              <li key={id}>
                <button type="button" className="thing" disabled={full || poor} onClick={() => onBuy(id)} aria-label={`${item.name}, ${item.price} points. ${item.does}`}>
                  <Icon name={id} wash="gold" />
                  <span className="thing-words"><b>{item.name}</b><em>{item.does}</em></span>
                  <span className="price">{item.price}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="market-pockets">
          <h3>Dreko's pockets</h3>
          <div className="pocket-slots">
            {slots(market.pockets).map((id, i) => id
              ? <button key={i} type="button" className="pocket" title={`Put the ${MARKET.items[id].name.toLowerCase()} back`} aria-label={`${MARKET.items[id].name}. Put it back`} onClick={() => onPutBack(i)}><Icon name={id} wash="gold" /></button>
              : <span key={i} className="pocket pocket-empty" />)}
          </div>
          <p className="market-tip">{full ? 'His pockets are full. ' : ''}Each thing is used once. Tap one in a pocket to put it back.</p>
        </div>
        <button type="button" className="close again" onClick={onGo} autoFocus><span className="key key-a">A</span>Go to {nextDay}</button>
      </div>
    </div>
  )
}

// In the house: the things Dreko carries, each a button. `lit` is the pocket a controller's RB uses (LB moves
// it on); the number is the key that uses it. `say` is the last thing an item did, or why it could not be used.
export function Pockets({ market, lit, say, onUse }) {
  if (!market.pockets.length && !market.skates && !say) return null
  return (
    <div className="pockets">
      {say && <p key={say.n} className={`item-say ${say.ok ? '' : 'item-say-no'}`} role="status">{say.text}</p>}
      <div className="pocket-slots">
        {market.pockets.map((id, i) => (
          <button key={i} type="button" className={`pocket ${i === lit ? 'pocket-lit' : ''}`} title={`${MARKET.items[id].name}: ${MARKET.items[id].does}`} aria-label={`Use the ${MARKET.items[id].name.toLowerCase()}. ${MARKET.items[id].does}`} onClick={() => onUse(i)}>
            <Icon name={id} wash="gold" />
            <span className="pocket-key">{i + 1}</span>
          </button>
        ))}
        {market.skates && <span className="pocket-on"><Icon name="skates" />Skates on</span>}
      </div>
    </div>
  )
}
