import { canvasGame, rand } from './util.js';

const W = 480, H = 480, CELL = 40, COLS = W / CELL, VIEW = H / CELL;
const PUSH = 0.006, GRASS_CHANCE = 0.3, CAR_COLORS = ['#ff5c8a', '#ffd166', '#7cf3ff', '#b388ff', '#ff9a52'];

function makeLane(r) {
  if (r < 2 || Math.random() < GRASS_CHANCE) return { road: false };
  const len = 1 + rand(2), span = W + 3 * CELL, count = 2 + rand(2);
  return {
    road: true, len, span,
    dir: Math.random() < 0.5 ? -1 : 1,
    speed: Math.min(4.5, 1 + Math.random() * 1.4 + r * 0.012),
    color: CAR_COLORS[r % CAR_COLORS.length],
    cars: Array.from({ length: count }, (_, i) => (i * span) / count + Math.random() * CELL),
  };
}

function laneAt(s, r) {
  while (s.lanes.length <= r) s.lanes.push(makeLane(s.lanes.length));
  return s.lanes[r];
}

const carLeft = (x) => x - 1.5 * CELL;

export default {
  id: 'crossy',
  title: '길 건너기',
  category: '액션',
  tagline: '차 조심, 멈추면 늦는다',
  blurb: '끝없는 도로를 한 칸씩 건너자. 너무 오래 머뭇거리면 화면이 따라잡는다.',
  better: 'high',
  unit: '칸',
  glyph: '⇡',
  accent: '#ffd166',
  howto: '방향키 / WASD 로 한 칸씩 · 모바일: 탭 = 앞으로, 스와이프 = 방향',
  mount: (el, api) => canvasGame(el, api, {
    w: W, h: H, bg: '#1f3a24',
    intro: { title: '길 건너기', text: '차에 닿거나 화면 아래로 밀려나면 끝.', button: '출발' },
    reset: () => ({ col: Math.floor(COLS / 2), row: 0, max: 0, lanes: [], cam: 0, cause: '' }),
    hud: (s) => `${s.max}칸`,
    score: (s) => s.max,
    over: (s) => ({ title: s.cause, text: `${s.max}칸 전진`, button: '다시 하기' }),
    step(s, inp) {
      for (const e of inp.events) {
        if (e.repeat) continue;
        const d = e.type === 'click' ? 'up' : e.dir;
        if (d === 'up') s.row++;
        else if (d === 'down') s.row = Math.max(0, s.row - 1);
        else if (d === 'left') s.col = Math.max(0, s.col - 1);
        else if (d === 'right') s.col = Math.min(COLS - 1, s.col + 1);
      }
      s.max = Math.max(s.max, s.row);
      if (s.max > 3) s.cam += PUSH + Math.max(0, s.row - s.cam - 7) * 0.05;
      for (let r = Math.floor(s.cam); r < s.cam + VIEW + 1; r++) {
        const L = laneAt(s, r);
        if (L.road) L.cars = L.cars.map((x) => (((x + L.dir * L.speed) % L.span) + L.span) % L.span);
      }
      const L = laneAt(s, s.row);
      const px = s.col * CELL + CELL / 2;
      if (L.road && L.cars.some((x) => px + 12 > carLeft(x) && px - 12 < carLeft(x) + L.len * CELL)) {
        s.cause = '빵! 차에 치였어요';
        return true;
      }
      if (s.row < s.cam - 0.5) { s.cause = '너무 느렸어요'; return true; }
      return false;
    },
    draw(ctx, s) {
      ctx.fillStyle = '#1f3a24';
      ctx.fillRect(0, 0, W, H);
      const screenY = (r) => H - (r - s.cam + 1) * CELL;
      for (let r = Math.max(0, Math.floor(s.cam) - 1); r < s.cam + VIEW + 1; r++) {
        const L = laneAt(s, r), y = screenY(r);
        if (!L.road) {
          ctx.fillStyle = r % 2 ? '#22402a' : '#1f3a24';
          ctx.fillRect(0, y, W, CELL);
          continue;
        }
        ctx.fillStyle = '#22252f';
        ctx.fillRect(0, y, W, CELL);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        for (let x = 10; x < W; x += 48) ctx.fillRect(x, y + CELL - 3, 22, 2);
        ctx.fillStyle = L.color;
        L.cars.forEach((x) => {
          ctx.beginPath();
          ctx.roundRect(carLeft(x) + 3, y + 6, L.len * CELL - 6, CELL - 12, 6);
          ctx.fill();
        });
      }
      const x = s.col * CELL, y = screenY(s.row);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 9, y + 8, 22, 24);
      ctx.fillStyle = '#ff5c6b';
      ctx.fillRect(x + 16, y + 4, 8, 5);
      ctx.fillStyle = '#ff9a52';
      ctx.fillRect(x + 31, y + 16, 5, 4);
      ctx.fillStyle = '#111';
      ctx.fillRect(x + 25, y + 12, 3, 3);
    },
  }),
};
