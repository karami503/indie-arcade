import { canvasGame, clamp, rand, steerX } from './util.js';

const W = 480, H = 480;
const BW = 76, BY = H - 46, MOVE = 8, LIVES = 3, BOMB_CHANCE = 0.2;
const FRUITS = ['🍎', '🍊', '🍋', '🍇', '🍑', '🍉'];

export default {
  id: 'catch',
  title: '과일 받기',
  category: '액션',
  tagline: '폭탄은 피하고 과일만',
  blurb: '바구니로 떨어지는 과일을 받자. 3개 놓치거나 폭탄을 받으면 끝.',
  better: 'high',
  unit: '개',
  glyph: '◡',
  accent: '#ff6b6b',
  howto: '마우스·터치 또는 ←→ 로 바구니 이동',
  mount: (el, api) => canvasGame(el, api, {
    w: W, h: H, bg: '#0f1420',
    intro: { title: '과일 받기', text: '💣 는 절대 받지 마세요.', button: '시작' },
    reset: () => ({ x: W / 2, items: [], lives: LIVES, score: 0, spawn: 30, cause: '' }),
    hud: (s) => `${s.score}개 · ♥${s.lives}`,
    score: (s) => s.score,
    over: (s) => ({ title: s.cause, text: `${s.score}개 받음`, button: '다시 하기' }),
    step(s, inp) {
      s.x = clamp(steerX(s, inp, s.x, MOVE), BW / 2, W - BW / 2);
      if (--s.spawn <= 0) {
        s.spawn = Math.max(14, 48 - s.score);
        const bomb = Math.random() < BOMB_CHANCE;
        s.items.push({
          x: 24 + Math.random() * (W - 48), y: -20, vy: 2 + Math.random() * 1.5 + s.score * 0.05,
          bomb, icon: bomb ? '💣' : FRUITS[rand(FRUITS.length)],
        });
      }
      const next = [];
      for (const it of s.items) {
        it.y += it.vy;
        if (it.y >= BY - 12 && it.y <= BY + 14 && Math.abs(it.x - s.x) < BW / 2 + 6) {
          if (it.bomb) { s.cause = '펑! 폭탄을 받았어요'; return true; }
          s.score++;
          continue;
        }
        if (it.y > H + 20) {
          if (!it.bomb && --s.lives === 0) { s.cause = '과일을 3개 놓쳤어요'; return true; }
          continue;
        }
        next.push(it);
      }
      s.items = next;
      return false;
    },
    draw(ctx, s) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0f1420');
      g.addColorStop(1, '#1d2440');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.font = '30px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      s.items.forEach((it) => ctx.fillText(it.icon, it.x, it.y));
      ctx.fillStyle = '#c98a4b';
      ctx.beginPath();
      ctx.moveTo(s.x - BW / 2, BY - 10);
      ctx.lineTo(s.x + BW / 2, BY - 10);
      ctx.lineTo(s.x + BW / 2 - 10, BY + 18);
      ctx.lineTo(s.x - BW / 2 + 10, BY + 18);
      ctx.fill();
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(s.x - BW / 2, BY - 12, BW, 5);
    },
  }),
};
