import { overlay, panel, buttonGrid, listen, h, rand, shuffle } from './util.js';

const N = 5;

// Toggles cell i and its four neighbours.
export function press(board, i) {
  const x = i % N, y = Math.floor(i / N);
  return board.map((v, j) => (Math.abs((j % N) - x) + Math.abs(Math.floor(j / N) - y) <= 1 ? !v : v));
}

// Built from random presses, so every puzzle is solvable.
export function scramble(presses = 6 + rand(6)) {
  let b = Array(N * N).fill(false);
  shuffle([...Array(N * N).keys()]).slice(0, presses).forEach((i) => { b = press(b, i); });
  return b.some(Boolean) ? b : scramble(presses);
}

export default {
  id: 'lightsout',
  title: '불 끄기',
  category: '퍼즐',
  tagline: '누르면 십자로 뒤집힌다',
  blurb: '칸을 누르면 그 칸과 상하좌우가 함께 켜지고 꺼진다. 모든 불을 끄자.',
  better: 'low',
  unit: '회',
  glyph: '✺',
  accent: '#ffd166',
  howto: '칸을 클릭 / 탭 · 적은 횟수로 끌수록 좋은 기록',

  mount(el, api) {
    const p = panel(el);
    const { grid, btns } = buttonGrid(p, N * N, N, 'gbtn');
    const again = h('button', 'btn ghost', '새 퍼즐');
    again.type = 'button';
    p.append(again);
    let board, moves, done;

    function render() {
      btns.forEach((b, i) => {
        b.classList.toggle('on', board[i]);
        b.setAttribute('aria-label', board[i] ? '켜짐' : '꺼짐');
      });
      api.hud(`${moves}회`);
    }

    function newPuzzle() { board = scramble(); moves = 0; done = false; render(); }

    const offs = [
      listen(grid, 'click', (e) => {
        const b = e.target.closest('.gbtn');
        if (!b || done) return;
        board = press(board, Number(b.dataset.i));
        moves++;
        render();
        if (board.some(Boolean)) return;
        done = true;
        api.end(moves);
        overlay(p, { title: '모두 껐다!', text: `${moves}회`, button: '새 퍼즐' }, newPuzzle);
      }),
      listen(again, 'click', newPuzzle),
    ];
    newPuzzle();
    return () => offs.forEach((off) => off());
  },
};
