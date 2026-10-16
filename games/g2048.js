import { overlay, keyDir, listen, onSwipe } from './util.js';

const N = 4;
const NEW_FOUR_CHANCE = 0.1;

export function slideRow(row) {
  const nums = row.filter(Boolean);
  const out = [];
  let gained = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === nums[i + 1]) { out.push(nums[i] * 2); gained += nums[i] * 2; i++; } else out.push(nums[i]);
  }
  while (out.length < row.length) out.push(0);
  return { row: out, gained };
}

// i-th cell of line k when sliding toward `dir`.
const coord = (dir, k, i) =>
  dir === 'left' ? [k, i] : dir === 'right' ? [k, N - 1 - i] : dir === 'up' ? [i, k] : [N - 1 - i, k];

export function move(board, dir) {
  const next = board.map((r) => r.slice());
  let gained = 0, moved = false;
  for (let k = 0; k < N; k++) {
    const cells = Array.from({ length: N }, (_, i) => coord(dir, k, i));
    const res = slideRow(cells.map(([r, c]) => board[r][c]));
    gained += res.gained;
    cells.forEach(([r, c], i) => {
      if (next[r][c] !== res.row[i]) moved = true;
      next[r][c] = res.row[i];
    });
  }
  return { board: next, gained, moved };
}

export const canMove = (board) => ['left', 'right', 'up', 'down'].some((d) => move(board, d).moved);

function addTile(board) {
  const empty = [];
  board.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  if (!empty.length) return { board, at: null };
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = board.map((row) => row.slice());
  next[r][c] = Math.random() < NEW_FOUR_CHANCE ? 4 : 2;
  return { board: next, at: r * N + c };
}

export default {
  id: '2048',
  title: '2048',
  category: '퍼즐',
  tagline: '합치고, 또 합치고',
  blurb: '같은 숫자를 밀어 합쳐서 2048 타일을 만들자.',
  better: 'high',
  unit: '점',
  glyph: '⊞',
  accent: '#ffb86b',
  howto: '방향키 / WASD 또는 스와이프',

  mount(el, api) {
    const grid = document.createElement('div');
    grid.className = 'g2048';
    const tiles = Array.from({ length: N * N }, () => {
      const t = document.createElement('div');
      t.className = 'tile';
      grid.append(t);
      return t;
    });
    el.append(grid);
    let board, score, running = false;

    function render(newAt) {
      board.flat().forEach((v, i) => {
        const t = tiles[i];
        t.textContent = v || '';
        t.dataset.v = v > 2048 ? 'big' : String(v);
        t.classList.toggle('pop', i === newAt);
      });
      api.hud(`${score}점`);
    }

    function reset() {
      const empty = Array.from({ length: N }, () => Array(N).fill(0));
      const first = addTile(empty);
      const second = addTile(first.board);
      board = second.board;
      score = 0;
      running = true;
      render(second.at);
    }

    function go(dir) {
      if (!running) return;
      const res = move(board, dir);
      if (!res.moved) return;
      const added = addTile(res.board);
      board = added.board;
      score += res.gained;
      render(added.at);
      if (!canMove(board)) {
        running = false;
        api.end(score);
        overlay(el, { title: '더 이상 움직일 수 없어요', text: `${score}점 · 최대 타일 ${Math.max(...board.flat())}`, button: '새 게임' }, reset);
      }
    }

    const offs = [
      listen(window, 'keydown', (e) => {
        const d = keyDir(e);
        if (d) { e.preventDefault(); go(d); }
      }),
      onSwipe(grid, go),
    ];
    reset();
    return () => offs.forEach((off) => off());
  },
};
