import { overlay, panel, buttonGrid, listen, keyDir, rand, stopwatch } from './util.js';

const N = 4, SHUFFLE_MOVES = 300;

export const solved = () => [...Array(N * N - 1).keys()].map((i) => i + 1).concat(0);
const SOLVED = solved();
export const isSolved = (b) => b.every((v, i) => v === SOLVED[i]);

export function neighborsOf(i) {
  const x = i % N, y = Math.floor(i / N);
  return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
    .filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N)
    .map(([a, b]) => b * N + a);
}

// Moves tile i into the blank; null if it is not next to the blank.
export function slide(board, i) {
  const z = board.indexOf(0);
  if (!neighborsOf(z).includes(i)) return null;
  const next = [...board];
  [next[z], next[i]] = [next[i], next[z]];
  return next;
}

// Random legal moves from solved, so the puzzle is always solvable.
function scramble() {
  let b = solved(), prev = -1;
  for (let k = 0; k < SHUFFLE_MOVES; k++) {
    const z = b.indexOf(0);
    const opts = neighborsOf(z).filter((i) => i !== prev);
    prev = z;
    b = slide(b, opts[rand(opts.length)]);
  }
  return isSolved(b) ? scramble() : b;
}

export default {
  id: 'fifteen',
  title: '15 퍼즐',
  category: '퍼즐',
  tagline: '1부터 15까지 줄 세우기',
  blurb: '빈칸으로 숫자 조각을 밀어 1~15 순서로 맞추자. 1880년대부터 사랑받은 퍼즐.',
  better: 'low',
  unit: '회',
  glyph: '⧉',
  accent: '#6b8cff',
  howto: '빈칸 옆 조각을 클릭 / 탭 · 방향키로도 밀기',

  mount(el, api) {
    const p = panel(el);
    const { grid, btns } = buttonGrid(p, N * N, N, 'gbtn');
    let board, moves, watch = null, done;
    const hud = (t = watch?.read() ?? 0) => api.hud(`${moves}회 · ${t}초`);

    function render() {
      btns.forEach((b, i) => {
        const v = board[i];
        b.textContent = v || '';
        b.classList.toggle('blank', v === 0);
        b.classList.toggle('on', v !== 0 && v === SOLVED[i]);
        b.setAttribute('aria-label', v ? `${v}` : '빈칸');
      });
    }

    function reset() {
      board = scramble();
      moves = 0;
      done = false;
      watch?.stop();
      watch = null;
      render();
      hud(0);
    }

    function move(i) {
      if (done) return;
      const next = slide(board, i);
      if (!next) return;
      if (!watch) watch = stopwatch(hud);
      board = next;
      moves++;
      render();
      hud();
      if (!isSolved(board)) return;
      done = true;
      const t = watch.read();
      watch.stop();
      api.end(moves);
      overlay(p, { title: '완성!', text: `${moves}회 · ${t}초`, button: '다시 하기' }, reset);
    }

    const offs = [
      listen(grid, 'click', (e) => {
        const b = e.target.closest('.gbtn');
        if (b) move(Number(b.dataset.i));
      }),
      listen(window, 'keydown', (e) => {
        const d = keyDir(e);
        if (!d) return;
        e.preventDefault();
        const z = board.indexOf(0);
        const t = { left: z + 1, right: z - 1, up: z + N, down: z - N }[d];
        if (neighborsOf(z).includes(t)) move(t);
      }),
    ];
    reset();
    return () => { offs.forEach((off) => off()); watch?.stop(); };
  },
};
