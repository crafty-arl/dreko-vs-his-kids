// Copied unchanged from Carl's GM! 2.5D Map Engine (gmcarl repo, tools/gm-tiles/gm-tiles.js).
//
// gm-tiles: the data-tile-map engine from Founder Paradox Story, pulled out so any GM! game can use it.
// Painted art stays a picture; a grid of tiles laid over it says what each spot is. No dependencies, plain JS,
// works as an ES module, a <script> global (window.GMTiles) or in Node (require).
//
// A map:  { x0, y0, t, rows: ['....##..', ...], objects?: [...], rowApproach? }
//   x0,y0  where the grid starts, in the same units as the art     t  tile size
//   rows   one string per row. '.' floor, '#' solid, 'D' door, 'S' stairs (both walkable). Any other letter is walkable too.
//   objects  seats, doors, actions: { kind, x, y, ... } in art units (the engine only stores them).
// See README.md for the whole workflow.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GMTiles = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SOLID = '#';
  const DIRS4 = [[0, -1], [-1, 0], [1, 0], [0, 1]];

  // ---- reading a map ----
  function size(m) { return { cols: m.rows[0].length, rows: m.rows.length }; }
  function inside(m, c, r) { return r >= 0 && r < m.rows.length && c >= 0 && c < m.rows[0].length; }
  function tileAt(m, c, r) { return inside(m, c, r) ? m.rows[r][c] : null; }
  function walkable(m, c, r) { const ch = tileAt(m, c, r); return ch !== null && ch !== SOLID; }
  function solid(m, c, r) { return tileAt(m, c, r) === SOLID; }
  // art point -> tile, and tile -> the art point where feet stand (centre, a little low so sprites read as standing in it)
  function toTile(m, x, y) { return [Math.floor((x - m.x0) / m.t), Math.floor((y - m.y0) / m.t)]; }
  function tileFeet(m, c, r, drop = 6) { return [m.x0 + c * m.t + m.t / 2, m.y0 + r * m.t + m.t / 2 + drop]; }
  function nearestWalkable(m, x, y) {
    let best = null, bd = Infinity; const { cols, rows } = size(m);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (walkable(m, c, r)) {
      const [px, py] = tileFeet(m, c, r), d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = [c, r]; }
    }
    return best;
  }

  // ---- walking: shortest path on the grid (4 directions, right angles like Stardew) ----
  // from, to: art points. Returns art points [from, ...corners, to]. The goal is the reachable tile nearest `to`;
  // with opts.goalRow (or map.rowApproach) only tiles on to's row count, so cinema-style rows are entered along the row.
  function findPath(m, from, to, opts = {}) {
    let s0 = toTile(m, from[0], from[1]); if (!walkable(m, ...s0)) s0 = nearestWalkable(m, from[0], from[1]); if (!s0) return null;
    const rowOnly = opts.goalRow ?? (m.rowApproach ? toTile(m, to[0], to[1])[1] : null);
    const key = (c, r) => c + ',' + r, prev = new Map([[key(...s0), null]]), q = [s0];
    let best = s0, bd = Infinity;
    while (q.length) {
      const [c, r] = q.shift(), [px, py] = tileFeet(m, c, r), d = Math.hypot(px - to[0], py - to[1]);
      if (d < bd && (rowOnly === null || r === rowOnly)) { bd = d; best = [c, r]; }
      for (const [dc, dr] of DIRS4) { const n = [c + dc, r + dr], k = key(...n); if (!prev.has(k) && walkable(m, ...n)) { prev.set(k, [c, r]); q.push(n); } }
    }
    const tiles = []; for (let t = best; t; t = prev.get(key(...t))) tiles.unshift(t);
    return tidy([from, ...tiles.map(t => tileFeet(m, ...t)), to]);
  }
  // drop points on a straight run, near-duplicates, and stubby first/last legs (a stub makes the sprite turn twice)
  function tidy(pts, stub = 24) {
    pts = pts.filter((p, i) => { if (i === 0 || i === pts.length - 1) return true; const a = pts[i - 1], b = pts[i + 1]; return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1])); });
    pts = pts.filter((p, i) => !i || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 2);
    if (pts.length > 2 && Math.hypot(pts.at(-1)[0] - pts.at(-2)[0], pts.at(-1)[1] - pts.at(-2)[1]) < stub) pts.splice(-2, 1);
    if (pts.length > 2 && Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) < stub) pts.splice(1, 1);
    return pts;
  }
  function pathLength(pts) { let t = 0; for (let i = 1; i < pts.length; i++) t += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return t; }
  // the point a fraction f (0..1) of the way along a path
  function along(pts, f) {
    const seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
    let d = f * tot; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, d / seg[i]) : 1; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } d -= seg[i]; }
    return pts.at(-1);
  }

  // ---- floors: several maps stacked (a basement, the ground, upstairs), joined by stairs ----
  // floors: { [level]: map } all the same size and tile size. A stairs tile is 'S' (walkable); stairs at the same
  // (col, row) on two neighbouring levels join them. from, to: [x, y, level] in art units.
  // Returns [[x, y, level], ...] through tile centres; a level change is two points at the same spot.
  // opts.drop(level, col, row) -> the level someone lands on when they step off an edge into that (not walkable)
  // cell, or null when they can't (too far down): a one-way step, so ledges can be stepped off but not climbed.
  function findPathFloors(floors, from, to, opts = {}) {
    const L = l => floors[l], key = (l, c, r) => l + ',' + c + ',' + r;
    const m0 = L(from[2]); if (!m0) return null;
    let s0 = toTile(m0, from[0], from[1]); if (!walkable(m0, ...s0)) s0 = nearestWalkable(m0, from[0], from[1]); if (!s0) return null;
    const start = [from[2], ...s0], prev = new Map([[key(...start), null]]), q = [start];
    let best = null, bd = Infinity;
    while (q.length) {
      const [l, c, r] = q.shift(), m = L(l);
      if (l === to[2]) { const [px, py] = tileFeet(m, c, r, 0), d = Math.hypot(px - to[0], py - to[1]); if (d < bd) { bd = d; best = [l, c, r]; } }
      const next = DIRS4.map(([dc, dr]) => [l, c + dc, r + dr]).filter(([, cc, rr]) => walkable(m, cc, rr));
      if (tileAt(m, c, r) === 'S') for (const n of [l - 1, l + 1]) if (L(n) && tileAt(L(n), c, r) === 'S') next.push([n, c, r]);
      if (opts.drop) for (const [dc, dr] of DIRS4) if (!walkable(m, c + dc, r + dr)) { const n = opts.drop(l, c + dc, r + dr); if (n != null && L(n) && walkable(L(n), c + dc, r + dr)) next.push([n, c + dc, r + dr]); }
      for (const n of next) { const k = key(...n); if (!prev.has(k)) { prev.set(k, [l, c, r]); q.push(n); } }
    }
    if (!best) return null;
    const tiles = []; for (let t = best; t; t = prev.get(key(...t))) tiles.unshift(t);
    return [[from[0], from[1], from[2]], ...tiles.map(([l, c, r]) => [...tileFeet(L(l), c, r, 0), l])];
  }
  // the point a fraction f of the way along a floors path, with the level it is on (stairs switch level in place)
  function alongFloors(pts, f) {
    const seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
    let d = f * tot;
    for (let i = 0; i < seg.length; i++) {
      if (seg[i] > 0 && d <= seg[i]) { const k = d / seg[i], a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, b[2]]; }
      d -= seg[i];
    }
    return pts.at(-1).slice();
  }

  // ---- side view (platformers, the Copycat Brawl): the top of the ground under x, or null over a gap ----
  function groundTop(m, x) {
    const c = Math.floor((x - m.x0) / m.t);
    for (let r = 0; r < m.rows.length; r++) if (solid(m, c, r) && !solid(m, c, r - 1)) return m.y0 + r * m.t;
    return null;
  }

  // ---- depth: who is drawn in front ----
  // pieces: [{ bottom, floor?, wall? }] (bottom = the lowest pixel row of the piece). Returns true when a piece goes in
  // front of a character whose feet are at feetY. Floor pieces (rugs, mats) are always under; wall pieces never in front.
  function inFront(piece, feetY) { return !piece.floor && !piece.wall && piece.bottom > feetY; }

  // ---- camera: show the whole area when it fits, else keep a minimum scale and follow, clamped to the edges ----
  // box [x0,y0,x1,y1] in art units, focus [x,y], screen {w,h} in px. Returns a viewBox [x,y,w,h].
  function frame(box, focus, screen, minScale = 0.42) {
    const [bx, by, bx2, by2] = box, bw = bx2 - bx, bh = by2 - by;
    const s = Math.max(minScale, Math.min(screen.w / bw, screen.h / bh)), w = screen.w / s, h = screen.h / s;
    const axis = (lo, hi, L, c) => L >= hi - lo ? lo - (L - (hi - lo)) / 2 : Math.max(lo, Math.min(hi - L, c - L / 2));
    return [axis(bx, bx2, w, focus[0]), axis(by, by2, h, focus[1]), w, h];
  }
  // ease a current viewBox toward a target, frame-rate independent (tau in ms)
  function ease(cur, target, dt, tau = 180) { const k = 1 - Math.exp(-dt / tau); return cur.map((v, i) => v + (target[i] - v) * k); }

  // ---- Map view: draw the grid over the art so a person can check it ----
  // SVG: returns markup to put in a <g>.  Canvas: draws into a 2D context.
  const COLORS = { solid: '#e0403866', door: '#ff6fd866', floor: '#3f8f5a22', line: '#ffffffaa', path: '#e09818', seat: '#4868b0' };
  function mapViewSVG(m, { path = null, seats = [] } = {}) {
    const o = [];
    m.rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const x = m.x0 + c * m.t, y = m.y0 + r * m.t, fill = ch === SOLID ? COLORS.solid : ch === 'D' ? COLORS.door : COLORS.floor;
      o.push(`<rect x="${x}" y="${y}" width="${m.t}" height="${m.t}" fill="${fill}" stroke="${COLORS.line}" stroke-width="1.5"/>`);
    }));
    for (const s of seats) o.push(`<circle cx="${s.x}" cy="${s.y}" r="${m.t / 5}" fill="${COLORS.seat}" stroke="#fff" stroke-width="3"/>`);
    if (path) o.push(`<polyline points="${path.map(p => p.join(',')).join(' ')}" fill="none" stroke="${COLORS.path}" stroke-width="${Math.max(3, m.t / 10)}" stroke-linejoin="round" stroke-dasharray="14 8"/>`);
    return o.join('');
  }
  function mapViewCanvas(ctx, m) {
    ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff55';
    m.rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const x = m.x0 + c * m.t, y = m.y0 + r * m.t;
      if (ch === SOLID || ch === 'D') { ctx.fillStyle = ch === SOLID ? COLORS.solid : COLORS.door; ctx.fillRect(x, y, m.t, m.t); }
      ctx.strokeRect(x + .5, y + .5, m.t, m.t);
    }));
    ctx.restore();
  }

  // ---- Tiled (mapeditor.org) JSON -> a gm-tiles map ----
  // Layers named Buildings / Solid / Collision mark solid tiles; an object layer named Objects becomes map.objects
  // (each object's `type` or `class` is its kind, and its custom properties are copied on).
  function fromTiled(json, { x0 = 0, y0 = 0 } = {}) {
    const W = json.width, H = json.height, t = json.tilewidth, rows = Array.from({ length: H }, () => Array(W).fill('.'));
    const objects = [];
    for (const L of json.layers || []) {
      if (L.type === 'tilelayer' && /^(buildings|solid|collision)$/i.test(L.name)) L.data.forEach((gid, i) => { if (gid) rows[Math.floor(i / W)][i % W] = SOLID; });
      if (L.type === 'objectgroup' && /^objects$/i.test(L.name)) for (const o of L.objects) {
        const props = Object.fromEntries((o.properties || []).map(p => [p.name, p.value]));
        const ob = { kind: o.type || o.class || o.name, x: x0 + o.x + (o.width || 0) / 2, y: y0 + o.y + (o.height || 0) / 2, ...props };
        objects.push(ob);
        if (/^door$/i.test(ob.kind)) { const c = Math.floor(o.x / t), r = Math.floor(o.y / t); if (rows[r] && rows[r][c] !== SOLID) rows[r][c] = 'D'; }
      }
    }
    return { x0, y0, t, rows: rows.map(r => r.join('')), objects };
  }

  return { SOLID, size, inside, tileAt, walkable, solid, toTile, tileFeet, nearestWalkable, findPath, tidy, pathLength, along,
    findPathFloors, alongFloors, groundTop, inFront, frame, ease, mapViewSVG, mapViewCanvas, fromTiled };
});
