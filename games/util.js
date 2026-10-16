// Small helpers shared by the games.
export function makeCanvas(el, w, h) {
  const c = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = w * dpr;
  c.height = h * dpr;
  c.className = 'game-canvas';
  c.style.aspectRatio = `${w} / ${h}`;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  el.append(c);
  return { c, ctx };
}

// Canvas coords for a pointer event, in the game's logical size.
export function pointerPos(c, e, w, h) {
  const r = c.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h };
}

export function overlay(el, { title, text, button }, onGo) {
  const o = document.createElement('div');
  o.className = 'overlay';
  const h = document.createElement('h3');
  h.textContent = title;
  const p = document.createElement('p');
  p.textContent = text;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn primary';
  b.textContent = button;
  b.addEventListener('click', () => { o.remove(); onGo(); });
  o.append(h, p, b);
  el.append(o);
  b.focus({ preventScroll: true });
  return o;
}

const KEY_DIRS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};
export const keyDir = (e) => KEY_DIRS[e.code] || null;

// Adds a listener and returns its remover, so games can clean up from one list.
export function listen(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  return () => target.removeEventListener(type, fn, opts);
}

const SWIPE_MIN = 24;
export function onSwipe(el, fn) {
  let start = null;
  const offs = [
    listen(el, 'pointerdown', (e) => { start = { x: e.clientX, y: e.clientY }; }),
    listen(el, 'pointerup', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
      fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    }),
  ];
  return () => offs.forEach((off) => off());
}

// Fixed 60 Hz update, render every animation frame. Returns stop().
export function loop(step, draw) {
  const DT = 1000 / 60;
  let last = performance.now(), acc = 0, raf = 0;
  const frame = (now) => {
    acc += Math.min(250, now - last);
    last = now;
    while (acc >= DT) { step(); acc -= DT; }
    draw();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const rand = (n) => Math.floor(Math.random() * n);
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function flash(el, cls, ms = 300) {
  el.classList.remove(cls);
  void el.offsetWidth; // restart the CSS animation
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

export function label(ctx, text, x, y, { size = 16, color = '#eef0f8', align = 'center', weight = 700 } = {}) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px 'Space Grotesk', system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

// Horizontal control: arrow keys win; otherwise glide toward the last pointer position.
export function steerX(s, inp, x, speed) {
  const dir = (inp.held.has('right') ? 1 : 0) - (inp.held.has('left') ? 1 : 0);
  if (dir) { s.ptrX = null; return x + dir * speed; }
  if (inp.pointer && inp.pointer !== s.ptrSeen) { s.ptrSeen = inp.pointer; s.ptrX = inp.pointer.x; }
  return s.ptrX == null ? x : x + clamp(s.ptrX - x, -speed, speed);
}

// ---- DOM game helpers ----
export function panel(el, cls = '') {
  const p = h('div', `panel ${cls}`.trim());
  el.append(p);
  return p;
}

export function buttonGrid(parent, count, cols, cls = 'gbtn') {
  const grid = h('div', 'btn-grid');
  grid.style.setProperty('--cols', cols);
  const btns = Array.from({ length: count }, (_, i) => {
    const b = h('button', cls);
    b.type = 'button';
    b.dataset.i = i;
    grid.append(b);
    return b;
  });
  parent.append(grid);
  return { grid, btns };
}

// Calls onTick(secondsLeft) every 100 ms and onDone() at zero. Returns stop().
export function countdown(seconds, onTick, onDone) {
  const end = performance.now() + seconds * 1000;
  onTick(seconds);
  const id = setInterval(() => {
    const left = Math.max(0, (end - performance.now()) / 1000);
    onTick(left);
    if (left === 0) { clearInterval(id); onDone(); }
  }, 100);
  return () => clearInterval(id);
}

// Elapsed-seconds clock for "fastest time" games.
export function stopwatch(onTick) {
  const t0 = performance.now();
  const read = () => Math.round((performance.now() - t0) / 100) / 10;
  const id = setInterval(() => onTick(read()), 100);
  return { read, stop: () => clearInterval(id) };
}

// ---- canvas game scaffold ----
// cfg: { w, h, bg, intro, reset() => state, step(state, input) => true when over, draw(ctx, state), hud(state), score(state), over(state) }
// input: held (dirs), keys (codes), events (key / swipe / click, consumed each step), tap (press this step), pointer {x, y, down}
const TAP_CODES = new Set(['Space', 'ArrowUp', 'KeyW', 'Enter']);
export function canvasGame(el, api, cfg) {
  const { c, ctx } = makeCanvas(el, cfg.w, cfg.h);
  const input = { held: new Set(), keys: new Set(), events: [], tap: false, pointer: null };
  let st = null, running = false, lastHud = null, down = null;

  const hud = () => {
    const text = cfg.hud(st);
    if (text !== lastHud) { lastHud = text; api.hud(text); }
  };
  const start = () => {
    st = cfg.reset();
    input.events = [];
    input.tap = false;
    running = true;
    hud();
  };
  const step = () => {
    if (!running) return;
    const over = cfg.step(st, input);
    input.tap = false;
    input.events = [];
    hud();
    if (over) {
      running = false;
      api.end(cfg.score(st));
      overlay(el, cfg.over(st), start);
    }
  };
  const draw = () => {
    if (st) cfg.draw(ctx, st);
    else { ctx.fillStyle = cfg.bg; ctx.fillRect(0, 0, cfg.w, cfg.h); }
  };
  const pos = (e) => pointerPos(c, e, cfg.w, cfg.h);
  const release = () => { if (input.pointer) input.pointer = { ...input.pointer, down: false }; };

  const offs = [
    listen(window, 'keydown', (e) => {
      const d = keyDir(e);
      const onControl = e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement;
      if (!onControl && (d || e.code === 'Space')) e.preventDefault();
      if (d) input.held.add(d);
      input.keys.add(e.code);
      input.events.push({ type: 'key', code: e.code, dir: d, repeat: e.repeat });
      if (!e.repeat && TAP_CODES.has(e.code)) input.tap = true;
    }),
    listen(window, 'keyup', (e) => {
      const d = keyDir(e);
      if (d) input.held.delete(d);
      input.keys.delete(e.code);
    }),
    listen(window, 'blur', () => { input.held.clear(); input.keys.clear(); }),
    listen(c, 'pointerdown', (e) => {
      const p = pos(e);
      input.pointer = { ...p, down: true };
      input.tap = true;
      down = { x: e.clientX, y: e.clientY, p };
      try { c.setPointerCapture(e.pointerId); } catch { /* synthetic pointer: capture not needed */ }
    }),
    listen(c, 'pointermove', (e) => { input.pointer = { ...pos(e), down: input.pointer?.down ?? false }; }),
    listen(c, 'pointerup', (e) => {
      release();
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      const far = Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE_MIN;
      input.events.push(far
        ? { type: 'swipe', dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up') }
        : { type: 'click', ...down.p });
      down = null;
    }),
    listen(c, 'pointercancel', () => { down = null; release(); }),
    loop(step, draw),
  ];
  overlay(el, cfg.intro, start);
  return () => offs.forEach((off) => off());
}
