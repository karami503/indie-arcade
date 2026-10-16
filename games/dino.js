import { canvasGame, rand, label } from './util.js';

const W = 480, H = 480;
const GROUND = H - 90, X = 70, DW = 30, DH = 36;
const GRAV = 0.8, JUMP = -14, START = 6, ACCEL = 0.003, MAX = 14, PAD = 5;

export default {
  id: 'dino',
  title: '공룡 런',
  category: '액션',
  tagline: '선인장을 뛰어넘어라',
  blurb: '끝없이 달리는 공룡. 점점 빨라지는 선인장 사이를 점프로 넘자.',
  better: 'high',
  unit: 'm',
  glyph: '⩘',
  accent: '#a7f070',
  howto: '클릭 / 탭 / Space / ↑ 로 점프',
  mount: (el, api) => canvasGame(el, api, {
    w: W, h: H, bg: '#0d0f14',
    intro: { title: '공룡 런', text: '선인장에 닿으면 끝. 갈수록 빨라진다.', button: '달리기' },
    reset: () => ({ y: GROUND - DH, vy: 0, obs: [], speed: START, dist: 0, next: 300, t: 0 }),
    hud: (s) => `${Math.floor(s.dist / 40)}m`,
    score: (s) => Math.floor(s.dist / 40),
    over: (s) => ({ title: '쿵!', text: `${Math.floor(s.dist / 40)}m 달림`, button: '다시 하기' }),
    step(s, inp) {
      s.t++;
      const onGround = s.y >= GROUND - DH;
      if (onGround && (inp.tap || inp.held.has('up') || inp.pointer?.down)) s.vy = JUMP;
      s.vy += GRAV;
      s.y = Math.min(GROUND - DH, s.y + s.vy);
      if (s.y >= GROUND - DH) s.vy = 0;
      s.speed = Math.min(MAX, s.speed + ACCEL);
      s.dist += s.speed;
      if ((s.next -= s.speed) <= 0) {
        s.obs.push({ x: W + 10, w: 18 + rand(3) * 12, h: 28 + rand(3) * 14 });
        s.next = s.speed * 40 + Math.random() * 280; // min gap grows with speed so every gap stays jumpable
      }
      s.obs.forEach((o) => { o.x -= s.speed; });
      s.obs = s.obs.filter((o) => o.x + o.w > -10);
      return s.obs.some((o) => X + DW - PAD > o.x && X + PAD < o.x + o.w && s.y + DH - PAD > GROUND - o.h);
    },
    draw(ctx, s) {
      ctx.fillStyle = '#0d0f14';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(167,240,112,0.5)';
      ctx.fillRect(0, GROUND, W, 2);
      ctx.fillStyle = 'rgba(167,240,112,0.2)';
      for (let i = 0; i < 24; i++) ctx.fillRect(((i * 61 - s.dist) % W + W) % W, GROUND + 10 + (i % 4) * 9, 6, 2);
      ctx.fillStyle = '#4fd17a';
      for (const o of s.obs) {
        ctx.fillRect(o.x + o.w / 2 - 5, GROUND - o.h, 10, o.h);
        ctx.fillRect(o.x, GROUND - o.h * 0.65, o.w, 7);
        ctx.fillRect(o.x, GROUND - o.h * 0.85, 6, o.h * 0.25);
        ctx.fillRect(o.x + o.w - 6, GROUND - o.h * 0.9, 6, o.h * 0.3);
      }
      ctx.fillStyle = '#a7f070';
      ctx.fillRect(X, s.y + 8, DW - 6, DH - 16);
      ctx.fillRect(X + 12, s.y, DW - 6, 16);
      ctx.fillStyle = '#0d0f14';
      ctx.fillRect(X + 28, s.y + 4, 4, 4);
      ctx.fillStyle = '#a7f070';
      const step = Math.floor(s.t / 5) % 2 && s.vy === 0;
      ctx.fillRect(X + 4, s.y + DH - 8, 6, step ? 8 : 4);
      ctx.fillRect(X + 16, s.y + DH - 8, 6, step ? 4 : 8);
      label(ctx, `${Math.floor(s.dist / 40)}m`, W - 20, 30, { size: 20, align: 'right', color: 'rgba(255,255,255,0.6)' });
    },
  }),
};
