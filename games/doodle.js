import { canvasGame, steerX } from './util.js';

const W = 480, H = 480;
const PW = 64, PH = 12, R = 12, GRAV = 0.32, BOUNCE = -10.4, MOVE = 5.5;
const MOVING_FROM = 1200, MAX_GAP_EXTRA = 70; // jump height ≈ 169px, so gaps stay ≤ 120px

const makePlat = (y, height) => ({
  x: Math.random() * (W - PW), y,
  vx: height > MOVING_FROM && Math.random() < 0.3 ? (Math.random() < 0.5 ? -1.4 : 1.4) : 0,
});

export default {
  id: 'doodle',
  title: '점프 점프',
  category: '액션',
  tagline: '발판을 밟고 끝없이 위로',
  blurb: '자동으로 튀어 오르는 캐릭터를 좌우로 움직여 발판을 밟자. 화면 양옆은 이어져 있다.',
  better: 'high',
  unit: 'm',
  glyph: '⤒',
  accent: '#a7f070',
  howto: '←→ 또는 마우스·터치 위치로 좌우 이동',
  mount: (el, api) => canvasGame(el, api, {
    w: W, h: H, bg: '#f3eedf',
    intro: { title: '점프 점프', text: '발판을 놓쳐 떨어지면 끝.', button: '점프' },
    reset: () => {
      const plats = [{ x: W / 2 - PW / 2, y: H - 30, vx: 0 }];
      for (let y = H - 100; y > -60; y -= 60) plats.push(makePlat(y, 0));
      return { x: W / 2, y: H - 60, vy: BOUNCE, plats, camY: 0, best: 0, start: H - 60, face: 1 };
    },
    hud: (s) => `${Math.floor(s.best / 10)}m`,
    score: (s) => Math.floor(s.best / 10),
    over: (s) => ({ title: '추락', text: `${Math.floor(s.best / 10)}m 도달`, button: '다시 하기' }),
    step(s, inp) {
      const nx = steerX(s, inp, s.x, MOVE);
      if (nx !== s.x) s.face = nx > s.x ? 1 : -1;
      s.x = nx;
      if (s.x < -R) s.x += W + 2 * R;
      else if (s.x > W + R) s.x -= W + 2 * R;
      const prevBottom = s.y + R;
      s.vy += GRAV;
      s.y += s.vy;
      if (s.vy > 0) {
        const hit = s.plats.find((p) => prevBottom <= p.y && s.y + R >= p.y && s.x > p.x - 6 && s.x < p.x + PW + 6);
        if (hit) { s.y = hit.y - R; s.vy = BOUNCE; }
      }
      s.plats.forEach((p) => {
        if (!p.vx) return;
        p.x += p.vx;
        if (p.x < 0 || p.x > W - PW) p.vx = -p.vx;
      });
      if (s.y - s.camY < H * 0.4) s.camY = s.y - H * 0.4;
      s.best = Math.max(s.best, s.start - s.y);
      let top = Math.min(...s.plats.map((p) => p.y));
      while (top > s.camY - 40) {
        top -= 50 + Math.random() * Math.min(MAX_GAP_EXTRA, 20 + s.best / 60);
        s.plats.push(makePlat(top, s.best));
      }
      s.plats = s.plats.filter((p) => p.y < s.camY + H + 20);
      return s.y - s.camY > H + 40;
    },
    draw(ctx, s) {
      ctx.fillStyle = '#f3eedf';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(80,120,200,0.15)';
      ctx.lineWidth = 1;
      const off = ((-s.camY % 24) + 24) % 24;
      for (let y = off; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      s.plats.forEach((p) => {
        ctx.fillStyle = p.vx ? '#5c8dff' : '#4fb84f';
        ctx.beginPath();
        ctx.roundRect(p.x, p.y - s.camY, PW, PH, 6);
        ctx.fill();
      });
      const y = s.y - s.camY;
      ctx.fillStyle = '#c4d84a';
      ctx.beginPath();
      ctx.ellipse(s.x, y, R, R * (s.vy < -8 ? 1.15 : 1), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.fillRect(s.x + s.face * 4 - 1.5, y - 4, 3, 4);
      ctx.fillRect(s.x + s.face * 9 - 1.5, y - 4, 3, 4);
    },
  }),
};
