import { canvasGame, clamp, rand, steerX } from './util.js';

const W = 480, H = 480;
const SHIP_Y = H - 36, SHIP_W = 32, SPEED = 5.5, FIRE_EVERY = 16, SHOT_V = 8;
const COLS = 8, ROWS = 4, GX = 46, GY = 34, EW = 28, EH = 18, DROP = 14, LIVES = 3;
const SPRITE = ['..X..X..', '...XX...', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', 'X.X..X.X'];
const ROW_COLORS = ['#ff5c8a', '#b388ff', '#7cf3ff', '#a7f070'];

const makeWave = () => Array.from({ length: COLS * ROWS }, (_, i) => ({
  x: 70 + (i % COLS) * GX, y: 60 + Math.floor(i / COLS) * GY, row: Math.floor(i / COLS), alive: true,
}));

function drawAlien(ctx, a, frame) {
  ctx.fillStyle = ROW_COLORS[a.row];
  SPRITE.forEach((line, y) => [...line].forEach((ch, x) => {
    const leg = y === SPRITE.length - 1 && frame;
    if (ch === 'X' && !leg) ctx.fillRect(a.x - 12 + x * 3, a.y - 9 + y * 3, 3, 3);
  }));
}

export default {
  id: 'invaders',
  title: '우주 침공',
  category: '클래식',
  tagline: '자동 사격으로 막아라',
  blurb: '내려오는 외계인 편대를 격추하자. 적이 줄수록 빨라진다.',
  better: 'high',
  unit: '점',
  glyph: '⏃',
  accent: '#b388ff',
  howto: '←→ 또는 마우스·터치로 이동 · 사격은 자동',
  mount: (el, api) => canvasGame(el, api, {
    w: W, h: H, bg: '#05060d',
    intro: { title: '우주 침공', text: '생명 3개. 외계인이 바닥에 닿으면 끝.', button: '출격' },
    reset: () => ({ x: W / 2, shots: [], bombs: [], aliens: makeWave(), dir: 1, wave: 1, lives: LIVES, score: 0, cool: 0, hurt: 0, t: 0 }),
    hud: (s) => `${s.score}점 · ♥${s.lives} · ${s.wave}웨이브`,
    score: (s) => s.score,
    over: (s) => ({ title: '지구 함락', text: `${s.score}점 · ${s.wave}웨이브`, button: '다시 하기' }),
    step(s, inp) {
      s.t++;
      s.x = clamp(steerX(s, inp, s.x, SPEED), SHIP_W / 2, W - SHIP_W / 2);
      if (--s.cool <= 0) { s.shots.push({ x: s.x, y: SHIP_Y - 14 }); s.cool = FIRE_EVERY; }
      s.shots = s.shots.map((p) => ({ ...p, y: p.y - SHOT_V })).filter((p) => p.y > -10);

      const alive = s.aliens.filter((a) => a.alive);
      const speed = (0.5 + s.wave * 0.25) * (1 + 1.6 * (1 - alive.length / (COLS * ROWS)));
      const minX = Math.min(...alive.map((a) => a.x)), maxX = Math.max(...alive.map((a) => a.x));
      if ((s.dir > 0 && maxX + EW / 2 + speed > W - 8) || (s.dir < 0 && minX - EW / 2 - speed < 8)) {
        s.dir = -s.dir;
        alive.forEach((a) => { a.y += DROP; });
      } else alive.forEach((a) => { a.x += s.dir * speed; });

      for (const a of alive) {
        const i = s.shots.findIndex((p) => Math.abs(p.x - a.x) < EW / 2 && Math.abs(p.y - a.y) < EH / 2);
        if (i >= 0) { a.alive = false; s.shots.splice(i, 1); s.score += 10 * (ROWS - a.row); }
      }
      if (alive.length && Math.random() < 0.012 + s.wave * 0.004) {
        const a = alive[rand(alive.length)];
        s.bombs.push({ x: a.x, y: a.y + EH / 2 });
      }
      s.bombs = s.bombs.map((p) => ({ ...p, y: p.y + 3.6 + s.wave * 0.2 })).filter((p) => p.y < H + 10);
      if (s.hurt > 0) s.hurt--;
      else if (s.bombs.some((p) => Math.abs(p.x - s.x) < SHIP_W / 2 && Math.abs(p.y - SHIP_Y) < 12)) {
        s.lives--;
        s.hurt = 90;
        s.bombs = [];
        if (!s.lives) return true;
      }
      if (alive.some((a) => a.alive && a.y + EH / 2 >= SHIP_Y - 16)) return true;
      if (alive.every((a) => !a.alive)) { s.wave++; s.aliens = makeWave(); s.bombs = []; }
      return false;
    },
    draw(ctx, s) {
      ctx.fillStyle = '#05060d';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, (i * 53 + s.t * 0.3 * (1 + (i % 3))) % H, 1.5, 1.5);
      const frame = Math.floor(s.t / 20) % 2;
      s.aliens.forEach((a) => { if (a.alive) drawAlien(ctx, a, frame); });
      ctx.fillStyle = '#ffd166';
      s.shots.forEach((p) => ctx.fillRect(p.x - 1.5, p.y - 6, 3, 10));
      ctx.fillStyle = '#ff5c8a';
      s.bombs.forEach((p) => ctx.fillRect(p.x - 2, p.y - 5, 4, 10));
      if (!(s.hurt > 0 && Math.floor(s.t / 6) % 2)) {
        ctx.fillStyle = '#7cf3ff';
        ctx.beginPath();
        ctx.moveTo(s.x, SHIP_Y - 14);
        ctx.lineTo(s.x + SHIP_W / 2, SHIP_Y + 8);
        ctx.lineTo(s.x - SHIP_W / 2, SHIP_Y + 8);
        ctx.fill();
      }
    },
  }),
};
