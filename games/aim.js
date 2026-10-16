import { canvasGame } from './util.js';

const W = 480, H = 480;
const TIME = 30 * 60, MAX_R = 32, LIFE = 100, POP = 20;

// Targets grow then shrink over their life.
const radius = (t) => MAX_R * Math.sin(Math.PI * Math.min(1, t.age / LIFE)) + 4;

export default {
  id: 'aim',
  title: '과녁 맞히기',
  category: '반사신경',
  tagline: '30초 에임 테스트',
  blurb: '나타났다 사라지는 과녁을 최대한 많이 클릭하자.',
  better: 'high',
  unit: '개',
  glyph: '⊕',
  accent: '#ff5c6b',
  howto: '과녁을 클릭 / 탭',
  mount: (el, api) => canvasGame(el, api, {
    w: W, h: H, bg: '#0b0d16',
    intro: { title: '과녁 맞히기', text: '30초 동안 과녁을 최대한 많이.', button: '시작' },
    reset: () => ({ t: 0, targets: [], hits: 0, shots: 0, spawn: 0, pops: [] }),
    hud: (s) => `${s.hits}개 · ${Math.ceil((TIME - s.t) / 60)}초`,
    score: (s) => s.hits,
    over: (s) => ({
      title: '시간 끝!',
      text: `${s.hits}개 명중 · 정확도 ${s.shots ? Math.round((s.hits / s.shots) * 100) : 0}%`,
      button: '다시 하기',
    }),
    step(s, inp) {
      if (++s.t >= TIME) return true;
      if (--s.spawn <= 0) {
        s.spawn = Math.max(16, 42 - s.hits);
        s.targets.push({ x: 40 + Math.random() * (W - 80), y: 40 + Math.random() * (H - 80), age: 0 });
      }
      s.targets = s.targets.map((t) => ({ ...t, age: t.age + 1 })).filter((t) => t.age < LIFE);
      s.pops = s.pops.map((p) => ({ ...p, age: p.age + 1 })).filter((p) => p.age < POP);
      if (inp.tap && inp.pointer?.down) {
        s.shots++;
        const p = inp.pointer;
        const i = s.targets.findIndex((t) => Math.hypot(t.x - p.x, t.y - p.y) <= radius(t));
        if (i >= 0) {
          s.hits++;
          s.pops.push({ x: s.targets[i].x, y: s.targets[i].y, age: 0 });
          s.targets = s.targets.filter((_, j) => j !== i);
        }
      }
      return false;
    },
    draw(ctx, s) {
      ctx.fillStyle = '#0b0d16';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff5c6b';
      ctx.fillRect(0, 0, W * (1 - s.t / TIME), 4);
      s.targets.forEach((t) => {
        const r = radius(t);
        [[1, '#ff5c6b'], [0.66, '#fff'], [0.33, '#ff5c6b']].forEach(([k, c]) => {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(t.x, t.y, r * k, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      s.pops.forEach((p) => {
        ctx.strokeStyle = `rgba(255,209,102,${1 - p.age / POP})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10 + p.age * 2, 0, Math.PI * 2);
        ctx.stroke();
      });
    },
  }),
};
