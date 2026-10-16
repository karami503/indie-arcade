import { canvasGame, clamp, label } from './util.js';

const W = 480, H = 480;
const X = 130, R = 13, GRAV = 0.42, FLAP = -7.4;
const PIPE_W = 64, GAP = 150, SPEED = 2.8, EVERY = 95, GROUND = H - 34;

export default {
  id: 'flappy',
  title: '날개짓',
  category: '액션',
  tagline: '한 번 탭, 한 번 날갯짓',
  blurb: '탭할 때마다 날아오른다. 파이프 사이를 통과한 만큼 점수.',
  better: 'high',
  unit: '점',
  glyph: '⌇',
  accent: '#ffd166',
  howto: '클릭 / 탭 / Space 로 날갯짓',
  mount: (el, api) => canvasGame(el, api, {
    w: W, h: H, bg: '#13203a',
    intro: { title: '날개짓', text: '탭해서 날고, 파이프에 닿지 마세요.', button: '시작' },
    reset: () => ({ y: H / 2, vy: 0, pipes: [], since: EVERY - 40, score: 0, started: false, t: 0 }),
    hud: (s) => `${s.score}점`,
    score: (s) => s.score,
    over: (s) => ({ title: '추락!', text: `${s.score}점`, button: '다시 하기' }),
    step(s, inp) {
      s.t++;
      if (inp.tap) { s.vy = FLAP; s.started = true; }
      if (!s.started) { s.y = H / 2 + Math.sin(s.t / 12) * 8; return false; }
      s.vy += GRAV;
      s.y += s.vy;
      if (s.y < R) { s.y = R; s.vy = 0; }
      if (++s.since >= EVERY) {
        s.since = 0;
        s.pipes.push({ x: W, gap: 60 + Math.random() * (GROUND - 120 - GAP), passed: false });
      }
      for (const p of s.pipes) {
        p.x -= SPEED;
        if (!p.passed && p.x + PIPE_W < X - R) { p.passed = true; s.score++; }
        if (X + R > p.x && X - R < p.x + PIPE_W && (s.y - R < p.gap || s.y + R > p.gap + GAP)) return true;
      }
      s.pipes = s.pipes.filter((p) => p.x > -PIPE_W);
      return s.y + R >= GROUND;
    },
    draw(ctx, s) {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#13203a');
      sky.addColorStop(1, '#2d3f6b');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      for (const p of s.pipes) {
        ctx.fillStyle = '#4fd17a';
        ctx.fillRect(p.x, 0, PIPE_W, p.gap);
        ctx.fillRect(p.x, p.gap + GAP, PIPE_W, GROUND - p.gap - GAP);
        ctx.fillStyle = '#2f9e57';
        ctx.fillRect(p.x - 4, p.gap - 16, PIPE_W + 8, 16);
        ctx.fillRect(p.x - 4, p.gap + GAP, PIPE_W + 8, 16);
      }
      ctx.fillStyle = '#3b2f22';
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = '#a7f070';
      ctx.fillRect(0, GROUND, W, 5);

      ctx.save();
      ctx.translate(X, s.y);
      ctx.rotate(clamp(s.vy / 10, -0.5, 1));
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.ellipse(0, 0, R + 3, R, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(6, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(7, -4, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff9a52';
      ctx.beginPath();
      ctx.moveTo(R, 0); ctx.lineTo(R + 10, 3); ctx.lineTo(R, 7);
      ctx.fill();
      ctx.restore();

      label(ctx, String(s.score), W / 2, 60, { size: 48, color: 'rgba(255,255,255,0.85)' });
      if (!s.started) label(ctx, '탭 / Space', W / 2, H / 2 + 60, { color: 'rgba(255,255,255,0.7)', weight: 500 });
    },
  }),
};
