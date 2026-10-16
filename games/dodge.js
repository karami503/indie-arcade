import { canvasGame, clamp, rand } from './util.js';

const W = 480, H = 480;
const R = 7, BR = 5, SPEED = 3.6, BURST_EVERY = 600, BURST = 9;

function edgePoint() {
  const u = Math.random();
  return [{ x: u * W, y: -10 }, { x: W + 10, y: u * H }, { x: u * W, y: H + 10 }, { x: -10, y: u * H }][rand(4)];
}

export default {
  id: 'dodge',
  title: '탄막 피하기',
  category: '액션',
  tagline: '한 발이라도 맞으면 끝',
  blurb: '사방에서 날아오는 탄을 피해 최대한 오래 살아남자.',
  better: 'high',
  unit: '초',
  glyph: '⁘',
  accent: '#ff5c8a',
  howto: '방향키 / WASD, 또는 화면 아무 곳이나 드래그 (손가락이 움직인 만큼 이동)',
  mount: (el, api) => canvasGame(el, api, {
    w: W, h: H, bg: '#0b0710',
    intro: { title: '탄막 피하기', text: '시간이 갈수록 탄이 많아지고 빨라진다.', button: '시작' },
    reset: () => ({ p: { x: W / 2, y: H / 2 }, bullets: [], t: 0, spawn: 0 }),
    hud: (s) => `${(s.t / 60).toFixed(1)}초`,
    score: (s) => Math.floor(s.t / 6) / 10,
    over: (s) => ({ title: '피격!', text: `${(s.t / 60).toFixed(1)}초 생존 · 탄 ${s.bullets.length}개`, button: '다시 하기' }),
    step(s, inp) {
      s.t++;
      let dx = (inp.held.has('right') ? 1 : 0) - (inp.held.has('left') ? 1 : 0);
      let dy = (inp.held.has('down') ? 1 : 0) - (inp.held.has('up') ? 1 : 0);
      // Relative drag: the ship moves as far as the finger does, so the finger never hides it.
      if (!inp.pointer?.down) s.drag = null;
      else if (!dx && !dy) {
        s.drag ??= { fx: inp.pointer.x, fy: inp.pointer.y, px: s.p.x, py: s.p.y };
        dx = s.drag.px + inp.pointer.x - s.drag.fx - s.p.x;
        dy = s.drag.py + inp.pointer.y - s.drag.fy - s.p.y;
        if (Math.hypot(dx, dy) < SPEED) dx = dy = 0;
      }
      const len = Math.hypot(dx, dy) || 1;
      s.p = { x: clamp(s.p.x + (dx / len) * SPEED, R, W - R), y: clamp(s.p.y + (dy / len) * SPEED, R, H - R) };

      const v = Math.min(6, 2.2 + s.t / 1500);
      if (++s.spawn >= Math.max(5, 26 - Math.floor(s.t / 300) * 2)) {
        s.spawn = 0;
        const o = edgePoint();
        const a = Math.atan2(s.p.y - o.y, s.p.x - o.x) + (Math.random() - 0.5) * 0.5;
        s.bullets.push({ x: o.x, y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v });
      }
      if (s.t % BURST_EVERY === 0) {
        const o = edgePoint();
        const a = Math.atan2(H / 2 - o.y, W / 2 - o.x);
        for (let i = 0; i < BURST; i++) {
          const ai = a + (i - (BURST - 1) / 2) * 0.14;
          s.bullets.push({ x: o.x, y: o.y, vx: Math.cos(ai) * v * 0.8, vy: Math.sin(ai) * v * 0.8 });
        }
      }
      s.bullets = s.bullets
        .map((b) => ({ ...b, x: b.x + b.vx, y: b.y + b.vy }))
        .filter((b) => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);
      return s.bullets.some((b) => Math.hypot(b.x - s.p.x, b.y - s.p.y) < R + BR - 1);
    },
    draw(ctx, s) {
      ctx.fillStyle = '#0b0710';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff5c8a';
      ctx.shadowColor = '#ff5c8a';
      ctx.shadowBlur = 8;
      s.bullets.forEach((b) => { ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#7cf3ff';
      ctx.shadowColor = '#7cf3ff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(s.p.x, s.p.y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    },
  }),
};
