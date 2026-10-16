import { canvasGame, shuffle, label } from './util.js';

const W = 480, H = 480;
const COLS = 10, ROWS = 20, C = 22, OX = 40, OY = 20, SIDE = OX + COLS * C + 36;
const SHAPES = {
  I: [[1, 1, 1, 1]], O: [[1, 1], [1, 1]], T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]], Z: [[1, 1, 0], [0, 1, 1]], J: [[1, 0, 0], [1, 1, 1]], L: [[0, 0, 1], [1, 1, 1]],
};
const COLORS = { I: '#7cf3ff', O: '#ffd166', T: '#b388ff', S: '#a7f070', Z: '#ff5c8a', J: '#6b8cff', L: '#ff9a52' };
const LINE_SCORE = [0, 100, 300, 500, 800];
const KICKS = [0, -1, 1, -2, 2];

export const rotate = (m) => m[0].map((_, i) => m.map((r) => r[i]).reverse());
export const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

export function collides(board, m, x, y) {
  return m.some((row, dy) => row.some((v, dx) => {
    if (!v) return false;
    const bx = x + dx, by = y + dy;
    return bx < 0 || bx >= COLS || by >= ROWS || (by >= 0 && board[by][bx] !== null);
  }));
}

export function place(board, p) {
  const next = board.map((r) => r.slice());
  p.m.forEach((row, dy) => row.forEach((v, dx) => { if (v && p.y + dy >= 0) next[p.y + dy][p.x + dx] = p.type; }));
  return next;
}

export function clearLines(board) {
  const kept = board.filter((r) => r.some((v) => v === null));
  const lines = ROWS - kept.length;
  return { board: [...Array.from({ length: lines }, () => Array(COLS).fill(null)), ...kept], lines };
}

function nextType(s) {
  if (!s.bag.length) s.bag = shuffle(Object.keys(SHAPES));
  return s.bag.pop();
}

// Returns false when the new piece has no room (game over).
function spawn(s) {
  const type = s.next;
  s.next = nextType(s);
  const m = SHAPES[type];
  s.piece = { type, m, x: Math.floor((COLS - m[0].length) / 2), y: 0 };
  s.drag = null; // a finger still down from the last piece starts a fresh drag
  return !collides(s.board, m, s.piece.x, 0);
}

function lock(s) {
  const { board, lines } = clearLines(place(s.board, s.piece));
  s.board = board;
  s.lines += lines;
  s.score += LINE_SCORE[lines] * s.level;
  s.level = 1 + Math.floor(s.lines / 10);
  return spawn(s);
}

function action(e) {
  if (e.type === 'click') return 'rotate';
  if (e.type === 'swipe') return { down: 'drop', up: 'rotate' }[e.dir]; // sideways is handled by dragging
  if (e.code === 'Space') return 'drop';
  if (e.code === 'KeyX') return 'rotate';
  return { left: 'left', right: 'right', down: 'soft', up: 'rotate' }[e.dir];
}

function cell(ctx, x, y, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, C - 2, C - 2);
  ctx.globalAlpha = 1;
}

export default {
  id: 'tetris',
  title: '테트리스',
  category: '클래식',
  tagline: '줄을 채워 지워라',
  blurb: '떨어지는 블록을 돌리고 맞춰 가로줄을 채우자. 10줄마다 빨라진다.',
  better: 'high',
  unit: '점',
  glyph: '▚',
  accent: '#b388ff',
  howto: '←→ 이동 · ↑/X 회전 · ↓ 천천히 · Space 바로 내리기 · 모바일: 좌우로 드래그 이동, 탭 회전, 아래로 스와이프 바로 내리기',
  mount: (el, api) => canvasGame(el, api, {
    w: W, h: H, bg: '#0a0b14',
    intro: { title: '테트리스', text: '블록이 꼭대기에 닿으면 끝.', button: '시작' },
    reset: () => {
      const s = { board: emptyBoard(), bag: [], score: 0, lines: 0, level: 1, fall: 0 };
      s.next = nextType(s);
      spawn(s);
      return s;
    },
    hud: (s) => `${s.score}점 · ${s.lines}줄`,
    score: (s) => s.score,
    over: (s) => ({ title: '블록이 넘쳤다', text: `${s.score}점 · ${s.lines}줄 · 레벨 ${s.level}`, button: '다시 하기' }),
    step(s, inp) {
      const p = s.piece;
      const tryMove = (dx, dy, m = p.m) => {
        if (collides(s.board, m, p.x + dx, p.y + dy)) return false;
        p.x += dx; p.y += dy; p.m = m;
        return true;
      };
      const ptr = inp.pointer;
      if (!ptr?.down) s.drag = null;
      else {
        s.drag ??= { x0: ptr.x, col0: p.x };
        const col = s.drag.col0 + Math.round((ptr.x - s.drag.x0) / C);
        while (p.x < col && tryMove(1, 0));
        while (p.x > col && tryMove(-1, 0));
      }
      for (const e of inp.events) {
        const act = action(e);
        if (act === 'left') tryMove(-1, 0);
        else if (act === 'right') tryMove(1, 0);
        else if (act === 'soft') { if (tryMove(0, 1)) s.score += 1; }
        else if (act === 'rotate') { const r = rotate(p.m); KICKS.some((k) => tryMove(k, 0, r)); }
        else if (act === 'drop') {
          while (tryMove(0, 1)) s.score += 2;
          s.fall = 0;
          return !lock(s);
        }
      }
      if (++s.fall >= Math.max(4, 48 - (s.level - 1) * 5)) {
        s.fall = 0;
        if (!tryMove(0, 1)) return !lock(s);
      }
      return false;
    },
    draw(ctx, s) {
      ctx.fillStyle = '#0a0b14';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#12142a';
      ctx.fillRect(OX, OY, COLS * C, ROWS * C);
      s.board.forEach((row, y) => row.forEach((v, x) => { if (v) cell(ctx, OX + x * C, OY + y * C, COLORS[v]); }));
      const p = s.piece;
      let gy = p.y;
      while (!collides(s.board, p.m, p.x, gy + 1)) gy++;
      p.m.forEach((row, dy) => row.forEach((v, dx) => {
        if (!v) return;
        cell(ctx, OX + (p.x + dx) * C, OY + (gy + dy) * C, COLORS[p.type], 0.2);
        if (p.y + dy >= 0) cell(ctx, OX + (p.x + dx) * C, OY + (p.y + dy) * C, COLORS[p.type]);
      }));
      label(ctx, 'NEXT', SIDE, 40, { size: 14, align: 'left', color: '#8d93ab' });
      SHAPES[s.next].forEach((row, dy) => row.forEach((v, dx) => { if (v) cell(ctx, SIDE + dx * C, 60 + dy * C, COLORS[s.next]); }));
      [['SCORE', s.score], ['LINES', s.lines], ['LEVEL', s.level]].forEach(([k, v], i) => {
        label(ctx, k, SIDE, 160 + i * 70, { size: 14, align: 'left', color: '#8d93ab' });
        label(ctx, String(v), SIDE, 186 + i * 70, { size: 26, align: 'left' });
      });
    },
  }),
};
