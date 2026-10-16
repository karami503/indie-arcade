import { canvasGame, clamp } from './util.js';

const W = 480, H = 480;
const X = 110, R = 9, LIFT = -0.42, GRAV = 0.36, MAXV = 6;
const SEG = 8, SPEED = 3.5, START_GAP = 300, MIN_GAP = 110, TRAIL = 30;
const NCOLS = Math.ceil(W / SEG) + 2;

export default {
  id: 'cave',
  title: '동굴 비행',
  category: '액션',
  tagline: '누르면 상승, 떼면 하강',
  blurb: '점점 좁아지는 동굴을 버튼 하나로 비행하자.',
  better: 'high',
  unit: 'm',
  glyph: '≋',
  accent: '#ff9a52',
  howto: '마우스·터치를 누르고 있거나 Space / ↑ 를 누르는 동안 상승',
  mount: (el, api) => canvasGame(el, api, {
    w: W, h: H, bg: '#120b08',
    intro: { title: '동굴 비행', text: '벽에 닿으면 끝. 동굴은 계속 좁아진다.', button: '이륙' },
    reset: () => ({
      y: H / 2, vy: 0, off: 0, gap: START_GAP, center: H / 2, drift: 0, dist: 0, trail: [],
      cols: Array.from({ length: NCOLS }, () => ({ top: H / 2 - START_GAP / 2, bot: H / 2 + START_GAP / 2 })),
    }),
    hud: (s) => `${Math.floor(s.dist / 10)}m`,
    score: (s) => Math.floor(s.dist / 10),
    over: (s) => ({ title: '충돌!', text: `${Math.floor(s.dist / 10)}m 비행`, button: '다시 하기' }),
    step(s, inp) {
      const hold = inp.keys.has('Space') || inp.held.has('up') || inp.pointer?.down;
      s.vy = clamp(s.vy + (hold ? LIFT : GRAV), -MAXV, MAXV);
      s.y += s.vy;
      s.off += SPEED;
      s.dist += SPEED;
      while (s.off >= SEG) {
        s.off -= SEG;
        s.gap = Math.max(MIN_GAP, s.gap - 0.15);
        s.drift = clamp(s.drift + (Math.random() - 0.5) * 1.6, -4, 4);
        s.center += s.drift;
        const lo = s.gap / 2 + 12, hi = H - s.gap / 2 - 12;
        if (s.center < lo || s.center > hi) { s.center = clamp(s.center, lo, hi); s.drift = -s.drift; }
        s.cols = [...s.cols.slice(1), { top: s.center - s.gap / 2, bot: s.center + s.gap / 2 }];
      }
      s.trail = [...s.trail.slice(-TRAIL), s.y];
      const col = s.cols[Math.floor((X + s.off) / SEG)];
      return s.y - R < col.top || s.y + R > col.bot;
    },
    draw(ctx, s) {
      ctx.fillStyle = '#120b08';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff9a52';
      for (const edge of ['top', 'bot']) {
        ctx.beginPath();
        ctx.moveTo(0, edge === 'top' ? 0 : H);
        s.cols.forEach((col, i) => ctx.lineTo(i * SEG - s.off, col[edge]));
        ctx.lineTo(W + SEG, edge === 'top' ? 0 : H);
        ctx.fill();
      }
      s.trail.forEach((y, i) => {
        ctx.fillStyle = `rgba(255,209,102,${(i / s.trail.length) * 0.5})`;
        ctx.fillRect(X - (s.trail.length - 1 - i) * SPEED - 2, y - 2, 4, 4);
      });
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(X, s.y, R, 0, Math.PI * 2);
      ctx.fill();
    },
  }),
};
