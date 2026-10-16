// ECHO — original game. Every orb you take spawns an echo that replays your path from the start.
import { makeCanvas, pointerPos, overlay, keyDir, listen, loop } from './util.js';

const W = 480, H = 480;
const R = 9;               // player radius
const ORB_R = 8;
const SPEED = 3.2;         // px per frame
const GRACE = 60;          // frames an echo is harmless after spawning
const HIT = R * 1.6;       // echo collision distance
const PHASE_USE = 1 / 90;  // full gauge = 1.5 s of phase
const PHASE_FILL = 1 / 600;
const ORB_MIN_DIST = 120;
const TRAIL = 140;

export default {
  id: 'echo',
  title: 'ECHO',
  category: '액션',
  tagline: '과거의 나를 피하라',
  blurb: '오브를 먹을 때마다 처음부터의 내 움직임을 따라 하는 메아리가 생긴다. 가장 무서운 적은 10초 전의 나.',
  better: 'high',
  unit: '점',
  glyph: '◎',
  accent: '#7cf3ff',
  original: true,
  howto: '방향키 / WASD, 또는 화면 아무 곳이나 드래그 (손가락이 움직인 만큼 이동) · Space 또는 위상 버튼을 누르는 동안 메아리 통과',

  mount(el, api) {
    const { c, ctx } = makeCanvas(el, W, H);
    const held = new Set();
    let target = null, phaseHeld = false, st = null, running = false;

    const phaseBtn = document.createElement('button');
    phaseBtn.type = 'button';
    phaseBtn.className = 'btn ghost phase-btn';
    phaseBtn.textContent = '위상 (Space)';
    el.append(phaseBtn);

    const spawnOrb = (p) => {
      for (;;) {
        const o = { x: 30 + Math.random() * (W - 60), y: 30 + Math.random() * (H - 60) };
        if (Math.hypot(o.x - p.x, o.y - p.y) > ORB_MIN_DIST) return o;
      }
    };

    function reset() {
      const p = { x: W / 2, y: H / 2 };
      st = { t: 0, p, path: [p], echoes: [], orb: spawnOrb(p), score: 0, phase: 1, phasing: false, dead: 0, sparks: [] };
      api.hud('0점');
      running = true;
    }

    function die() {
      st.dead = 1;
      st.sparks = Array.from({ length: 28 }, () => {
        const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4;
        return { x: st.p.x, y: st.p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s };
      });
    }

    function step() {
      if (!running) return;
      if (st.dead) {
        st.sparks = st.sparks.map((s) => ({ ...s, x: s.x + s.vx, y: s.y + s.vy, vx: s.vx * 0.94, vy: s.vy * 0.94 }));
        if (++st.dead === 45) {
          running = false;
          api.end(st.score);
          overlay(el, { title: '메아리에 삼켜졌다', text: `${st.score}점 · ${(st.t / 60).toFixed(1)}초 생존`, button: '다시 하기' }, reset);
        }
        return;
      }
      st.t++;
      let dx = 0, dy = 0;
      if (held.has('left')) dx--;
      if (held.has('right')) dx++;
      if (held.has('up')) dy--;
      if (held.has('down')) dy++;
      if (!dx && !dy && target) {
        dx = target.x - st.p.x; dy = target.y - st.p.y;
        if (Math.hypot(dx, dy) < SPEED) { dx = 0; dy = 0; }
      }
      const len = Math.hypot(dx, dy) || 1;
      const p = {
        x: Math.max(R, Math.min(W - R, st.p.x + (dx / len) * SPEED)),
        y: Math.max(R, Math.min(H - R, st.p.y + (dy / len) * SPEED)),
      };
      st.p = p;
      st.path.push(p);

      st.phasing = phaseHeld && st.phase > 0;
      st.phase = st.phasing ? Math.max(0, st.phase - PHASE_USE) : Math.min(1, st.phase + PHASE_FILL);

      if (Math.hypot(p.x - st.orb.x, p.y - st.orb.y) < R + ORB_R) {
        st.score++;
        st.echoes.push({ start: st.t });
        st.orb = spawnOrb(p);
        api.hud(`${st.score}점`);
      }
      if (!st.phasing) {
        for (const e of st.echoes) {
          const age = st.t - e.start;
          const q = st.path[age];
          if (age > GRACE && Math.hypot(q.x - p.x, q.y - p.y) < HIT) { die(); break; }
        }
      }
    }

    function draw() {
      ctx.fillStyle = '#080a12';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(124,243,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 40; i < W; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
      }
      if (!st) return;

      // Recent trail = where the next echoes will walk.
      const from = Math.max(0, st.path.length - TRAIL);
      ctx.strokeStyle = 'rgba(124,243,255,0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = from; i < st.path.length; i++) ctx[i === from ? 'moveTo' : 'lineTo'](st.path[i].x, st.path[i].y);
      ctx.stroke();

      const pulse = 1 + Math.sin(st.t / 8) * 0.18;
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(st.orb.x, st.orb.y, ORB_R * pulse, 0, Math.PI * 2); ctx.fill();

      st.echoes.forEach((e, i) => {
        const age = st.t - e.start;
        const q = st.path[age];
        const hue = (320 + i * 23) % 360;
        ctx.globalAlpha = age > GRACE ? 1 : 0.25 + 0.25 * Math.sin(age / 3);
        ctx.strokeStyle = `hsl(${hue} 90% 65%)`;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(q.x, q.y, R, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1;

      if (!st.dead) {
        ctx.globalAlpha = st.phasing ? 0.35 : 1;
        ctx.fillStyle = '#7cf3ff';
        ctx.shadowColor = '#7cf3ff';
        ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(st.p.x, st.p.y, R, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#7cf3ff';
      st.sparks.forEach((s) => ctx.fillRect(s.x - 2, s.y - 2, 4, 4));
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(16, H - 18, W - 32, 6);
      ctx.fillStyle = st.phase > 0.2 ? '#b388ff' : '#ff5c8a';
      ctx.fillRect(16, H - 18, (W - 32) * st.phase, 6);
    }

    // Relative drag: the dot moves as far as the finger does, so the finger never hides it.
    let drag = null;
    const dragTo = (e) => {
      if (!drag) return;
      const q = pointerPos(c, e, W, H);
      target = { x: drag.px + q.x - drag.fx, y: drag.py + q.y - drag.fy };
    };
    const endDrag = () => { drag = null; target = null; };
    const offs = [
      listen(window, 'keydown', (e) => {
        const d = keyDir(e);
        if (d) { held.add(d); e.preventDefault(); }
        if (e.code === 'Space') { phaseHeld = true; e.preventDefault(); }
      }),
      listen(window, 'keyup', (e) => {
        const d = keyDir(e);
        if (d) held.delete(d);
        if (e.code === 'Space') phaseHeld = false;
      }),
      listen(c, 'pointerdown', (e) => {
        if (!st) return;
        const q = pointerPos(c, e, W, H);
        drag = { fx: q.x, fy: q.y, px: st.p.x, py: st.p.y };
        try { c.setPointerCapture(e.pointerId); } catch { /* capture is a nicety; dragging still works inside the canvas */ }
      }),
      listen(c, 'pointermove', dragTo),
      listen(c, 'pointerup', endDrag),
      listen(c, 'pointercancel', endDrag),
      listen(phaseBtn, 'pointerdown', (e) => { e.preventDefault(); phaseHeld = true; }),
      listen(phaseBtn, 'pointerup', () => { phaseHeld = false; }),
      listen(phaseBtn, 'pointerleave', () => { phaseHeld = false; }),
      loop(step, draw),
    ];

    overlay(el, { title: 'ECHO', text: '오브를 먹을수록 과거의 내가 늘어난다. 닿으면 끝.', button: '시작' }, reset);
    return () => offs.forEach((off) => off());
  },
};
