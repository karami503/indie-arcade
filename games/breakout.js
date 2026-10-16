import { canvasGame, clamp, label } from './util.js';

const W = 480, H = 480;
const PW = 84, PH = 10, PY = H - 30, PSPEED = 8;
const BR = 7, ROWS = 6, COLS = 10, BW = W / COLS, BH = 18, TOP = 56, LIVES = 3;
const COLORS = ['#ff5c8a', '#ff9a52', '#ffd166', '#a7f070', '#7cf3ff', '#b388ff'];

const makeBricks = () => Array.from({ length: ROWS * COLS }, (_, i) => ({
  x: (i % COLS) * BW, y: TOP + Math.floor(i / COLS) * BH, row: Math.floor(i / COLS), alive: true,
}));

export default {
  id: 'breakout',
  title: '벽돌깨기',
  category: '클래식',
  tagline: '공 하나로 전부 부숴라',
  blurb: '패들로 공을 튕겨 벽돌을 모두 깨자. 깨면 더 빠른 다음 단계.',
  better: 'high',
  unit: '점',
  glyph: '▤',
  accent: '#ff9a52',
  howto: '마우스·터치 또는 ←→ 로 패들 이동 · 클릭/Space 로 발사',
  mount: (el, api) => canvasGame(el, api, {
    w: W, h: H, bg: '#0e0a14',
    intro: { title: '벽돌깨기', text: '생명은 3개. 전부 깨면 다음 단계.', button: '시작' },
    reset: () => ({ px: W / 2, ptrSeen: null, ball: null, bricks: makeBricks(), lives: LIVES, score: 0, level: 1 }),
    hud: (s) => `${s.score}점 · ♥${s.lives}`,
    score: (s) => s.score,
    over: (s) => ({ title: '게임 오버', text: `${s.score}점 · ${s.level}단계`, button: '다시 하기' }),
    step(s, inp) {
      if (inp.pointer && inp.pointer !== s.ptrSeen) { s.ptrSeen = inp.pointer; s.px = inp.pointer.x; }
      if (inp.held.has('left')) s.px -= PSPEED;
      if (inp.held.has('right')) s.px += PSPEED;
      s.px = clamp(s.px, PW / 2, W - PW / 2);
      if (!s.ball) {
        if (!inp.tap) return false;
        s.ball = { x: s.px, y: PY - BR - 1, vx: (Math.random() - 0.5) * 4, vy: -(4.5 + s.level * 0.5) };
      }
      const b = s.ball;
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < BR || b.x > W - BR) { b.vx = -b.vx; b.x = clamp(b.x, BR, W - BR); }
      if (b.y < BR) b.vy = Math.abs(b.vy);
      if (b.vy > 0 && b.y + BR >= PY && b.y + BR <= PY + PH + 8 && Math.abs(b.x - s.px) <= PW / 2 + BR) {
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = sp * 0.8 * clamp((b.x - s.px) / (PW / 2), -1, 1);
        b.vy = -Math.sqrt(sp * sp - b.vx * b.vx);
      }
      const k = s.bricks.find((q) => q.alive && b.x + BR > q.x && b.x - BR < q.x + BW && b.y + BR > q.y && b.y - BR < q.y + BH);
      if (k) {
        k.alive = false;
        s.score += 10 * (ROWS - k.row);
        const ox = Math.min(b.x + BR - k.x, k.x + BW - (b.x - BR));
        const oy = Math.min(b.y + BR - k.y, k.y + BH - (b.y - BR));
        if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy;
      }
      if (b.y > H + BR) {
        s.ball = null;
        s.lives--;
        if (!s.lives) return true;
      }
      if (s.bricks.every((q) => !q.alive)) { s.level++; s.bricks = makeBricks(); s.ball = null; }
      return false;
    },
    draw(ctx, s) {
      ctx.fillStyle = '#0e0a14';
      ctx.fillRect(0, 0, W, H);
      for (const k of s.bricks) {
        if (!k.alive) continue;
        ctx.fillStyle = COLORS[k.row];
        ctx.fillRect(k.x + 2, k.y + 2, BW - 4, BH - 4);
      }
      ctx.fillStyle = '#eef0f8';
      ctx.beginPath();
      ctx.roundRect(s.px - PW / 2, PY, PW, PH, 5);
      ctx.fill();
      const bx = s.ball ? s.ball.x : s.px, by = s.ball ? s.ball.y : PY - BR - 1;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(bx, by, BR, 0, Math.PI * 2);
      ctx.fill();
      if (!s.ball) label(ctx, '클릭 또는 Space 로 발사', W / 2, H / 2 + 60, { color: 'rgba(255,255,255,0.6)', weight: 500 });
    },
  }),
};
