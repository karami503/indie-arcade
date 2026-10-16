import { canvasGame, clamp, label } from './util.js';

const W = 480, H = 480;
const BH = 26, START_W = 220, BASE_Y = H - 70, PERFECT = 5, MAX_SPEED = 7;
const levelY = (i) => BASE_Y - i * BH;
const hue = (i) => (190 + i * 9) % 360;

export default {
  id: 'stacker',
  title: '탑 쌓기',
  category: '액션',
  tagline: '삐끗하면 잘려 나간다',
  blurb: '움직이는 블록을 타이밍 맞춰 떨어뜨려 탑을 쌓자. 어긋난 부분은 잘린다.',
  better: 'high',
  unit: '층',
  glyph: '☰',
  accent: '#7cf3ff',
  howto: '클릭 / 탭 / Space 로 블록 내려놓기 · 딱 맞추면 PERFECT',
  mount: (el, api) => canvasGame(el, api, {
    w: W, h: H, bg: '#0a1020',
    intro: { title: '탑 쌓기', text: '블록이 사라지면 끝.', button: '시작' },
    reset: () => ({
      stack: [{ x: (W - START_W) / 2, w: START_W }],
      cur: { x: 0, w: START_W, dir: 1 }, speed: 2.6, falling: [], cam: 0, score: 0, perfect: 0,
    }),
    hud: (s) => `${s.score}층`,
    score: (s) => s.score,
    over: (s) => ({ title: '와르르', text: `${s.score}층`, button: '다시 하기' }),
    step(s, inp) {
      const c = s.cur;
      c.x += c.dir * s.speed;
      if (c.x < 0 || c.x + c.w > W) { c.dir = -c.dir; c.x = clamp(c.x, 0, W - c.w); }
      s.falling.forEach((f) => { f.vy += 0.5; f.y += f.vy; });
      s.falling = s.falling.filter((f) => f.y + s.cam < H + 40);
      s.cam += (Math.max(0, (s.stack.length - 8) * BH) - s.cam) * 0.1;
      if (s.perfect > 0) s.perfect--;
      if (!inp.tap) return false;

      const prev = s.stack.at(-1);
      let left = Math.max(c.x, prev.x), right = Math.min(c.x + c.w, prev.x + prev.w);
      if (right - left <= 0) return true;
      if (Math.abs(c.x - prev.x) < PERFECT) {
        left = prev.x;
        right = prev.x + prev.w;
        s.perfect = 40;
      } else {
        s.falling.push({ x: c.x < prev.x ? c.x : right, w: c.w - (right - left), y: levelY(s.stack.length), vy: 0, lvl: s.stack.length });
      }
      s.stack.push({ x: left, w: right - left });
      s.score++;
      s.speed = Math.min(MAX_SPEED, s.speed + 0.12);
      const w = right - left, fromRight = s.score % 2 === 1;
      s.cur = { x: fromRight ? W - w : 0, w, dir: fromRight ? -1 : 1 };
      return false;
    },
    draw(ctx, s) {
      ctx.fillStyle = `hsl(${hue(s.score)} 45% 9%)`;
      ctx.fillRect(0, 0, W, H);
      s.stack.forEach((b, i) => {
        const y = levelY(i) + s.cam;
        if (y > H || y < -BH) return;
        ctx.fillStyle = `hsl(${hue(i)} 80% 62%)`;
        ctx.fillRect(b.x, y, b.w, BH - 2);
      });
      s.falling.forEach((f) => {
        ctx.fillStyle = `hsl(${hue(f.lvl)} 60% 45%)`;
        ctx.fillRect(f.x, f.y + s.cam, f.w, BH - 2);
      });
      ctx.fillStyle = `hsl(${hue(s.stack.length)} 90% 70%)`;
      ctx.fillRect(s.cur.x, levelY(s.stack.length) + s.cam, s.cur.w, BH - 2);
      label(ctx, String(s.score), W / 2, 50, { size: 44, color: 'rgba(255,255,255,0.85)' });
      if (s.perfect) label(ctx, 'PERFECT', W / 2, 92, { size: 18, color: '#ffd166' });
    },
  }),
};
