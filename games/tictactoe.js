import { overlay, panel, buttonGrid, listen, h, rand } from './util.js';

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const MISTAKE = 0.3, AI_DELAY = 350, NEXT_DELAY = 1000;
const MARK = { X: '✕', O: '◯' };

export function winner(b) {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every(Boolean) ? 'draw' : null;
}

function minimax(b, turn) {
  const w = winner(b);
  if (w) return { score: w === 'O' ? 1 : w === 'X' ? -1 : 0 };
  let best = null;
  b.forEach((v, i) => {
    if (v) return;
    const next = [...b];
    next[i] = turn;
    const { score } = minimax(next, turn === 'O' ? 'X' : 'O');
    if (!best || (turn === 'O' ? score > best.score : score < best.score)) best = { score, move: i };
  });
  return best;
}

export const bestMove = (b) => minimax(b, 'O').move;

export default {
  id: 'tictactoe',
  title: '틱택토',
  category: '보드',
  tagline: 'AI 상대로 연승 도전',
  blurb: '세 칸을 먼저 잇자. 무승부는 연승이 이어지고, 지면 기록이 남는다.',
  better: 'high',
  unit: '연승',
  glyph: '#',
  accent: '#7cf3ff',
  howto: '빈칸을 클릭 / 탭 · 당신이 항상 선공(✕)',

  mount(el, api) {
    const p = panel(el);
    const { grid, btns } = buttonGrid(p, 9, 3, 'gbtn');
    const status = h('p', 'muted center');
    p.append(status);
    let board, streak = 0, busy = false, timer = 0;
    const hud = () => api.hud(`${streak}연승`);

    function render() {
      btns.forEach((b, i) => {
        b.textContent = MARK[board[i]] || '';
        b.style.color = board[i] === 'O' ? '#ff5c8a' : '#7cf3ff';
      });
    }

    function newRound() {
      board = Array(9).fill(null);
      busy = false;
      status.textContent = '당신 차례 (✕)';
      render();
      hud();
    }

    // Returns true when the round is over.
    function settle(w) {
      if (!w) return false;
      busy = true;
      if (w === 'O') {
        const run = streak;
        streak = 0;
        api.end(run);
        overlay(p, { title: 'AI 승리', text: `${run}연승에서 멈춤`, button: '다시 도전' }, newRound);
        return true;
      }
      if (w === 'X') streak++;
      status.textContent = w === 'X' ? '승리!' : '무승부 — 연승 유지';
      hud();
      timer = setTimeout(newRound, NEXT_DELAY);
      return true;
    }

    const off = listen(grid, 'click', (e) => {
      const b = e.target.closest('.gbtn');
      if (!b || busy) return;
      const i = Number(b.dataset.i);
      if (board[i]) return;
      board = board.map((v, j) => (j === i ? 'X' : v));
      render();
      if (settle(winner(board))) return;
      busy = true;
      status.textContent = 'AI 생각 중…';
      timer = setTimeout(() => {
        const empty = board.map((v, j) => (v ? -1 : j)).filter((j) => j >= 0);
        const m = Math.random() < MISTAKE ? empty[rand(empty.length)] : bestMove(board);
        board = board.map((v, j) => (j === m ? 'O' : v));
        render();
        if (!settle(winner(board))) { busy = false; status.textContent = '당신 차례 (✕)'; }
      }, AI_DELAY);
    });
    newRound();
    return () => { off(); clearTimeout(timer); };
  },
};
