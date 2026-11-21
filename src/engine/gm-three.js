// Copied from Carl's GM! 2.5D Map Engine (gmcarl repo, tools/gm-tiles/gm-three.js). Changes made for this game are
// marked DREKO: an opts.smooth switch on create(), walls of any height up to one floor, opts.upright cut-outs, and wide + roll on a thing (for the shared walk).
//
// gm-three: builds a real 3D scene (three.js) from a gm-tiles map with floors. The data map stays the truth; this
// only draws it. Pass in THREE (any recent version, r150+); works as a <script> global (window.GMThree) or in Node.
//
// One tile = 1 unit, one floor = 1 unit tall. Tile (x, y) on floor L sits at three.js (x, L, y): y is up.
// Walls are blocks with the tile art on every side, floors are flat tiles, standing things (props, people, targets)
// are cut-outs that always face the camera. Stairs between two floors become steps you can climb.
//
//   const view = GMThree.create(THREE, canvas)
//   view.build({ w, h, levels: { [L]: { cell(x, y) -> null | { img, height?, stand?, ground?, stairs? } } } })
//     img     a canvas with the tile's art; height > 0 makes it a wall block (a full floor tall)
//     stand   a canvas with only the upright part, drawn standing on `ground` (or img)
//     stairs  { up: [dx, dy] } on the lower floor: steps rising that way to the floor above;
//             { hole: true } on the upper floor: no floor there (the stairs come up through it)
//     top, faces   a block's own art for its top and its sides [north, east, south, west] (e.g. lit by gm-light)
//     open: true   nothing here, you see (and light reaches) the floor below;  tall: 2   a cut-out twice the size
//     a missing cell is open ground on floor 0, open air above it and solid rock below it
//     region: { x0, y0, x1, y1 }   build only this box of tiles (a window on a big map)
//     flat: true   the art is shown as it is (no three.js lights or shadows): for art that already carries its light
//     ink: '#070707'   a toon outline in that colour around wall blocks
//   view.setThings([{ id, at: [x, y], level, img, size?, h? }])    moving cut-outs (people, targets); h squashes the height
//   view.render({ mode: 'walk', eye: [x, y, height], yaw, pitch })    first person; yaw 0 looks along +x
//   view.render({ mode: 'orbit', angle, tilt, upTo, zoom })            the whole place from above, floors over upTo hidden
//   view.pick(px, py) -> { x, y, level } the floor under a point on the canvas (e.g. tap to walk there)
//   view.aim() -> the id of the thing under the screen centre (walls block it), or null
//   view.resize(cssWidth, cssHeight)
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GMThree = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function create(THREE, canvas, opts = {}) {
    const smooth = !!opts.smooth;   // DREKO: painted art wants smooth pixels and soft edges
    // DREKO: upright cut-outs. A sprite always faces the camera, so from a high fixed camera it leans back into the
    // wall behind it and gets cut off. With opts.upright a thing is a standing card turned to the orbit camera, made
    // taller by 1 / cos(tilt) so it looks on screen exactly as it was drawn.
    const upright = !!opts.upright, CutMat = upright ? THREE.MeshBasicMaterial : THREE.SpriteMaterial;
    const cutGeo = upright ? new THREE.PlaneGeometry(1, 1).translate(0, .5, 0) : null, cutExtra = upright ? { side: THREE.DoubleSide, alphaToCoverage: smooth } : {};
    const cutOut = mat => { if (!upright) { const s = new THREE.Sprite(mat); s.center.set(.5, 0); return s; } return new THREE.Mesh(cutGeo, mat); };
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: smooth });
    renderer.setPixelRatio(Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1));
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(66, 1, .05, 300);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4); scene.add(sun, sun.target);
    // soft shadows from walls and steps (cut-outs don't cast; they keep the flat paper look)
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0008;
    let world = new THREE.Group(), things = new THREE.Group(), floors = {}, map = { w: 1, h: 1 }, focus = { x: .5, z: .5, R: 1 };
    scene.add(world, things);

    // textures: crisp pixels, one per canvas
    // (the world's textures are kept per build and the ones no longer used are freed, so relighting does not pile up)
    let worldTex = new Map(), oldTex = new Map();
    const texes = new WeakMap(), tex = (cv, ofWorld) => {
      let t = ofWorld ? worldTex.get(cv) || oldTex.get(cv) : texes.get(cv);
      if (t) { if (ofWorld) { worldTex.set(cv, t); oldTex.delete(cv); } return t; }
      t = new THREE.CanvasTexture(cv);
      if (smooth) { t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; }
      else { t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
      if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
      if (ofWorld) worldTex.set(cv, t); else texes.set(cv, t); return t;
    };
    const rockCv = document.createElement('canvas'); rockCv.width = rockCv.height = 16;
    { const g = rockCv.getContext('2d'); g.fillStyle = '#2A2724'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#3a3531'; for (let i = 0; i < 18; i++) g.fillRect((i * 7 + 3) % 16, (i * 11 + 5) % 16, 1 + i % 2, 1); }
    const checker = [0, 1].map(n => { const c = document.createElement('canvas'); c.width = c.height = 2; const g = c.getContext('2d'); g.fillStyle = n ? '#e2ddd2' : '#ebe7de'; g.fillRect(0, 0, 2, 2); return c; });

    // geometry is gathered per floor and per texture, then merged into one mesh each (fast to draw)
    function builder(flatLook, inkMat) {
      const parts = new Map();
      const quad = (cv, shade, p, n, uv) => {
        let byShade = parts.get(cv); if (!byShade) parts.set(cv, byShade = new Map());
        let b = byShade.get(shade); if (!b) byShade.set(shade, b = { cv, shade, pos: [], nor: [], uv: [] });
        // two triangles, wound so they face along n
        const [a, c1, c2, d] = p, e1 = [c1[0] - a[0], c1[1] - a[1], c1[2] - a[2]], e2 = [c2[0] - a[0], c2[1] - a[1], c2[2] - a[2]];
        const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const ok = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] > 0, idx = ok ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
        for (const i of idx) { b.pos.push(...p[i]); b.nor.push(...n); b.uv.push(...uv[i]); }
      };
      // a box from (x0, y0, z0) to (x1, y1, z1): top and four sides (the art is laid on each, never stretched across)
      const box = (cv, x0, y0, z0, x1, y1, z1, opts = {}) => {
        const vt = 1 - Math.min(1, y1 - y0);
        const fx = Math.floor(x0), fz = Math.floor(z0), u0 = x0 - fx, u1 = x1 - fx, v0 = 1 - (z0 - fz), v1 = 1 - (z1 - fz);
        if (!opts.noTop) quad(opts.top || cv, 1, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0], [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
        let si = 0;   // sides come north, east, south, west; a side's own art (faces) runs right to left seen from outside
        const side = (pa, pb, n) => { const f = opts.faces && opts.faces[si]; si++; if (opts.skip && opts.skip(n)) return;
          quad(f || cv, 1, [[pa[0], y1, pa[1]], [pb[0], y1, pb[1]], [pb[0], y0, pb[1]], [pa[0], y0, pa[1]]], n, f ? [[1, 1], [0, 1], [0, vt], [1, vt]] : [[0, 1], [1, 1], [1, vt], [0, vt]]); };
        side([x1, z0], [x0, z0], [0, 0, -1]); side([x1, z1], [x1, z0], [1, 0, 0]); side([x0, z1], [x1, z1], [0, 0, 1]); side([x0, z0], [x0, z1], [-1, 0, 0]);
      };
      const flat = (cv, x, y, z, down = false, shade = 1) => quad(cv, shade, [[x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]], [0, down ? -1 : 1, 0], [[0, 1], [1, 1], [1, 0], [0, 0]]);
      const mesh = (group, b, mat) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
        const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = !flatLook && !inkMat; if (inkMat) m.raycast = () => {}; group.add(m);
      };
      const done = group => {
        const all = [...parts.values()].flatMap(v => [...v.values()]);
        if (inkMat) { for (const b of all) mesh(group, b, inkMat); return; }
        if (!flatLook) { for (const b of all) mesh(group, b, new THREE.MeshLambertMaterial({ map: tex(b.cv, true), color: new THREE.Color(b.shade, b.shade, b.shade) })); return; }
        // art that carries its own light is different on almost every tile: lay the tiles side by side on one big
        // sheet (each with a one-pixel rim of its own edge, so neighbours never bleed in) and draw them as one mesh
        const sets = new Map(); for (const b of all) { const k = b.shade + '|' + b.cv.width; if (!sets.has(k)) sets.set(k, []); sets.get(k).push(b); }
        for (const list of sets.values()) {
          const n = list[0].cv.width, cs = n + 2, per = Math.max(1, Math.floor(2048 / cs));
          for (let at = 0; at < list.length; at += per * per) {
            const page = list.slice(at, at + per * per), cols = Math.min(per, Math.ceil(Math.sqrt(page.length))), rows = Math.ceil(page.length / cols);
            const sheet = document.createElement('canvas'); sheet.width = cols * cs; sheet.height = rows * cs; const g = sheet.getContext('2d'); g.imageSmoothingEnabled = smooth;
            const out = { pos: [], nor: [], uv: [] };
            page.forEach((b, i) => {
              const x = (i % cols) * cs + 1, y = Math.floor(i / cols) * cs + 1;
              for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0, 0]]) g.drawImage(b.cv, 0, 0, b.cv.width, b.cv.height, x + dx, y + dy, n, n);
              for (let j = 0; j < b.uv.length; j += 2) out.uv.push((x + b.uv[j] * n) / sheet.width, 1 - (y + (1 - b.uv[j + 1]) * n) / sheet.height);
              for (const v of b.pos) out.pos.push(v); for (const v of b.nor) out.nor.push(v);
            });
            const t = new THREE.CanvasTexture(sheet); t.magFilter = t.minFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter; t.generateMipmaps = false; if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
            const sh = page[0].shade, mat = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(sh, sh, sh) }); mat.userData.sheet = t; mesh(group, out, mat);
          }
        }
      };
      return { box, flat, done };
    }

    function build(m) {
      map = m;
      world.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { o.material.userData?.sheet?.dispose(); o.material.dispose?.(); } });
      oldTex = worldTex; worldTex = new Map(); sun.castShadow = !m.flat;
      const propMats = new Map();
      const inkMat = m.ink ? new THREE.MeshBasicMaterial({ color: new THREE.Color(m.ink), side: THREE.BackSide }) : null, E = .04;
      scene.remove(world); world = new THREE.Group(); scene.add(world); floors = {};
      // region: build only this box of tiles (a window on a big map); the orbit camera and the sun aim at its middle
      const rg = m.region || { x0: 0, y0: 0, x1: m.w - 1, y1: m.h - 1 }, rw = rg.x1 - rg.x0 + 1, rh = rg.y1 - rg.y0 + 1, mx = rg.x0 + rw / 2, mz = rg.y0 + rh / 2;
      const Ls = Object.keys(m.levels).map(Number).sort((a, b) => a - b), R = Math.hypot(rw, rh) / 2 + 2;
      focus = { x: mx, z: mz, R: Math.hypot(rw, rh) };
      sun.target.position.set(mx, 0, mz); sun.position.set(mx - R * .8, R * 1.6, mz + R * .5);
      Object.assign(sun.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: .5, far: R * 5 }); sun.shadow.camera.updateProjectionMatrix();
      for (const L of Ls) {
        const grp = new THREE.Group(); grp.userData.level = L; floors[L] = grp; world.add(grp);
        const B = builder(m.flat), I = inkMat && builder(false, inkMat), cellOf = m.levels[L].cell, aboveOf = m.levels[L + 1]?.cell, grid = new Map(), grid2 = new Map();
        const cell = (x, y) => { if (x < 0 || y < 0 || x >= m.w || y >= m.h) return null; const i = y * m.w + x; let c = grid.get(i); if (c === undefined) grid.set(i, c = cellOf(x, y) || null); return c; };
        const above = aboveOf && ((x, y) => { const i = y * m.w + x; let c = grid2.get(i); if (c === undefined) grid2.set(i, c = aboveOf(x, y) || null); return c; });
        const wall = (c) => !!c && !c.stairs && (c.height || 0) > 0;
        for (let y = rg.y0; y <= rg.y1; y++) for (let x = rg.x0; x <= rg.x1; x++) {
          const c = cell(x, y), upC = above ? above(x, y) : null, covered = !!upC && !upC.open && !upC.stairs?.hole;
          if (!c) {
            // rock: only where it can be seen (next to a dug-out cell, or under open sky)
            if (L < 0) { if (upC?.open || cell(x, y - 1) || cell(x + 1, y) || cell(x, y + 1) || cell(x - 1, y)) B.box(rockCv, x, L, y, x + 1, L + 1, y + 1, { noTop: !upC?.open }); }
            else if (L === 0) B.flat(checker[(x + y) % 2], x, 0, y);
            continue;
          }
          if (c.open || c.stairs?.hole) continue;
          if (c.stairs?.up) {   // four steps rising toward `up`
            const [ux, uy] = c.stairs.up;
            for (let i = 0; i < 4; i++) {
              const a = i / 4, b = (i + 1) / 4, h = L + (i + 1) / 4;
              const [x0, x1] = ux ? (ux > 0 ? [x + a, x + b] : [x + 1 - b, x + 1 - a]) : [x, x + 1];
              const [z0, z1] = uy ? (uy > 0 ? [y + a, y + b] : [y + 1 - b, y + 1 - a]) : [y, y + 1];
              B.box(c.img, x0, L, z0, x1, h, z1);
            }
          } else if ((c.height || 0) > 0) {
            const y1 = L + Math.min(1, c.height); /* DREKO: a wall can be any part of a floor tall */ B.box(c.img, x, L, y, x + 1, y1, y + 1, { faces: c.faces, top: c.top, noTop: covered && y1 === L + 1 });
            if (I) {   // the outline: the same block a little bigger in ink, seen from inside out, so only its rim shows
              const n = wall(cell(x, y - 1)), e = wall(cell(x + 1, y)), s = wall(cell(x, y + 1)), w = wall(cell(x - 1, y)), up = L < 0 || covered;
              I.box(rockCv, x - (w ? 0 : E), L, y - (n ? 0 : E), x + 1 + (e ? 0 : E), y1 + (up ? 0 : E), y + 1 + (s ? 0 : E),
                { noTop: up, skip: ([nx, , nz]) => nz < 0 ? n : nx > 0 ? e : nz > 0 ? s : w });
            }
          }
          else B.flat(c.stand ? (c.ground || c.img) : c.img, x, L, y);
          if (c.stand) {
            let pm = propMats.get(c.stand); if (!pm) propMats.set(c.stand, pm = new THREE.SpriteMaterial({ map: tex(c.stand, true), alphaTest: .5 }));
            const s = new THREE.Sprite(pm);
            const k = .9 * (c.tall || 1); s.center.set(.5, 0); s.scale.set(k, k, 1); s.position.set(x + .5, L, y + .5); grp.add(s);
          }
          // a ceiling: the underside of the floor above, or rock underground
          if ((c.height || 0) > 0 && !c.stairs) continue;
          if (L < 0) { if (!upC?.open && !c.stairs?.up) B.flat(rockCv, x, L + 1, y, true, .8); }
          else if (covered) B.flat(upC.stand ? (upC.ground || upC.img) : upC.img, x, L + 1, y, true, .7);
        }
        B.done(grp); if (I) I.done(grp);
      }
      for (const t of oldTex.values()) t.dispose(); oldTex = new Map();
    }

    const thingMats = new Map();
    function setThings(list) {
      things.children.slice().forEach(o => things.remove(o));
      for (const t of list) {
        let mat = thingMats.get(t.img); if (!mat) thingMats.set(t.img, mat = new CutMat({ map: tex(t.img), alphaTest: .5, ...cutExtra }));
        const s = cutOut(mat), k = t.size || .9; s.scale.set(k * (t.wide ?? 1), k * (t.h ?? 1), 1); s.userData.tall = s.scale.y; if (upright) s.rotation.z = t.roll || 0;   /* DREKO: wide (squash, card turn) and roll (rock, lean) */
        s.position.set(t.at[0], t.level * 1, t.at[1]); s.userData.id = t.id; s.userData.level = t.level; things.add(s);
        if (t.ghost) {   // shows only where something hides it: the same shape in one colour, drawn where it is behind
          let gm = ghostMats.get(t.img); if (!gm) ghostMats.set(t.img, gm = new CutMat({ map: tex(t.img), alphaTest: .5, color: new THREE.Color(t.ghost), depthFunc: THREE.GreaterDepth, depthWrite: false, opacity: .6, transparent: true, ...(upright ? { side: THREE.DoubleSide } : {}) }));
          const s2 = cutOut(gm); s2.scale.copy(s.scale); s2.rotation.z = s.rotation.z; s2.userData.tall = s.scale.y; s2.position.copy(s.position); s2.userData.level = t.level; s2.userData.ghost = true; s2.raycast = () => {}; things.add(s2);
        }
      }
    }
    // flat round marks lying on the ground (a shadow made of spots, a bright spot under someone):
    // [{ at: [x, y], h (height in floors), r, color, opacity }]
    const ghostMats = new Map(), markMats = new Map(), markGeo = new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), marks = new THREE.Group(); scene.add(marks);
    function setMarks(list) {
      marks.children.slice().forEach(o => marks.remove(o));
      for (const k of list || []) {
        const key = k.color + '|' + k.opacity; let mat = markMats.get(key); if (!mat) markMats.set(key, mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(k.color || '#070707'), transparent: true, opacity: k.opacity ?? .25, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
          // spots that overlap darken the ground once, not twice: each pixel takes one spot of a kind per frame
          stencilWrite: true, stencilRef: 1 + markMats.size, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.ReplaceStencilOp }));
        const c = new THREE.Mesh(markGeo, mat); c.scale.set(k.r, 1, k.r); c.position.set(k.at[0], k.h + .015, k.at[1]); c.userData.level = Math.floor(k.h + .2); c.raycast = () => {}; marks.add(c);
      }
    }

    function resize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }

    let last = null;
    function render(o) {
      last = o; const under = o.mode === 'walk' && o.eye[2] < 0;
      const sky = new THREE.Color(under ? '#14110f' : '#E6DCC8');
      scene.background = sky;
      if (o.mode === 'walk') {
        scene.fog = new THREE.Fog(under ? '#14110f' : '#EEE8DC', under ? 2 : 6, under ? 9 : 22);
        camera.fov = 66; camera.near = .05; camera.updateProjectionMatrix();
        for (const L in floors) floors[L].visible = true; things.children.forEach(s => s.visible = true);
        // eyeH: how high the eyes are; back / side / rise: pull the camera back behind the shoulder (0 = first person)
        const [x, y, hgt] = o.eye, ey = hgt + (o.eyeH ?? .55), p = o.pitch || 0, back = o.back || 0, side = back ? (o.side ?? .35) : 0, fx = Math.cos(o.yaw), fz = Math.sin(o.yaw);
        const px = x - fx * back - fz * side, pz = y - fz * back + fx * side, py = ey + (back ? (o.rise ?? .3) : 0);
        camera.position.set(px, py, pz);
        camera.lookAt(px + fx * Math.cos(p), py + Math.sin(p), pz + fz * Math.cos(p));
        marks.children.forEach(s => s.visible = true); camera.clearViewOffset();
      } else {
        scene.fog = null; camera.fov = 40; camera.updateProjectionMatrix();
        const up = o.upTo ?? 0, show = L => up < 0 ? L === up : L <= up;
        for (const L in floors) floors[L].visible = show(+L); things.children.forEach(s => s.visible = show(Math.floor(s.userData.level + .01)) || s.userData.id === o.keep || (s.userData.ghost && o.keep != null)); marks.children.forEach(s => s.visible = show(s.userData.level));
        // at: [x, y, height] to look at (someone to follow), dist: how far back in tiles, shift: push the picture down
        // by this part of its height (so who you follow sits below the middle)
        const cx = o.at ? o.at[0] : focus.x, cz = o.at ? o.at[1] : focus.z, cy = o.at && o.at[2] != null ? o.at[2] + .4 : Math.max(0, Math.min(up, 2)), R = (o.dist || focus.R * 1.15) / (o.zoom || 1);
        const sz = renderer.getSize(new THREE.Vector2()); if (o.shift) camera.setViewOffset(sz.x, sz.y, 0, -o.shift * sz.y, sz.x, sz.y); else camera.clearViewOffset();
        const a = (o.angle ?? 45) * Math.PI / 180, t = (o.tilt ?? 50) * Math.PI / 180;
        if (upright) things.children.forEach(s => { s.rotation.y = -a; s.scale.y = s.userData.tall / Math.cos(t); });   // DREKO
        // angle 0 looks from the south (like the flat map), turning clockwise as it grows
        camera.position.set(cx - Math.sin(a) * Math.cos(t) * R, cy + Math.sin(t) * R, cz + Math.cos(a) * Math.cos(t) * R);
        camera.lookAt(cx, cy, cz);
      }
      renderer.render(scene, camera);
    }

    const ray = new THREE.Raycaster();
    function aim() {
      if (!last) return null;
      ray.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hits = ray.intersectObjects([...Object.values(floors).filter(f => f.visible), things], true).filter(h => h.object.visible !== false);
      const h = hits[0]; return h && h.object.userData.id != null ? h.object.userData.id : null;
    }

    // what floor tile is under a point on the canvas (px from its top left): { x, y, level } in tiles, or null
    function pick(px, py) {
      if (!last) return null; const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(px / r.width * 2 - 1, -(py / r.height) * 2 + 1), camera);
      const h = ray.intersectObjects(Object.values(floors).filter(f => f.visible), true).find(h => h.object.isMesh);
      if (!h) return null; let o = h.object; while (o && o.userData.level === undefined) o = o.parent;
      // the side of a block or a cliff: you mean the top of it; a top: the floor at that height
      const n = h.face && h.face.normal;
      if (n && Math.abs(n.y) < .5) return { x: h.point.x - n.x * .5, y: h.point.z - n.z * .5, level: Math.ceil(h.point.y - .05), side: true };
      if (n && n.y > .5) return { x: h.point.x, y: h.point.z, level: Math.round(h.point.y + .1) };
      return { x: h.point.x, y: h.point.z, level: o ? o.userData.level : 0 };
    }

    return { build, setThings, setMarks, render, resize, aim, pick, renderer, scene, camera };
  }

  return { create };
});
