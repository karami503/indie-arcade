import { overlay, panel, buttonGrid, listen, h } from './util.js';

const COLS = 7, ROWS = 6, AI_DELAY = 400, NEXT_DELAY = 1200;
const CENTER = [3, 4, 5, 7, 5, 4, 3];
const ALL = [...Array(COLS).keys()];

export const emptyBoard = () => Array(ROWS * COLS).fill(0);

export function dropRow(b, c) {
  for (let r = ROWS - 1; r >= 0; r--) if (!b[r * COLS + c]) return r;
  return -1;
}

export function isWin(b, r, c) {
  const p = b[r * COLS + c];
  if (!p) return false;
  return [[0, 1], [1, 0], [1, 1], [1, -1]].some(([dr, dc]) => {
    let n = 1;
    for (const sgn of [1, -1]) {
      let rr = r + dr * sgn, cc = c + dc * sgn;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[rr * COLS + cc] === p) {
        n++;
        rr += dr * sgn;
        cc += dc * sgn;
      }
    }
    return n >= 4;
  });
}

export function play(b, c, p) {
  const r = dropRow(b, c);
  if (r < 0) return null;
  const next = [...b];
  next[r * COLS + c] = p;
  return { b: next, r };
}

const winsWith = (b, c, p) => {
  const m = play(b, c, p);
  return Boolean(m && isWin(m.b, m.r, c));
};

// Win if possible, else block, else avoid handing over a win, preferring the centre.
export function aiMove(b) {
  const open = ALL.filter((c) => dropRow(b, c) >= 0);
  const win = open.find((c) => winsWith(b, c, 2));
  if (win !== undefined) return win;
  const block = open.find((c) => winsWith(b, c, 1));
  if (block !== undefined) return block;
  const safe = open.filter((c) => !ALL.some((d) => winsWith(play(b, c, 2).b, d, 1)));
  const pool = safe.length ? safe : open;
  return pool.reduce((best, c) => {
    const sc = CENTER[c] + Math.random() * 4;
    return sc > best.sc ? { c, sc } : best;
  }, { c: pool[0], sc: -1 }).c;
}

export default {
  id: 'connect4',
  title: '사목',
  category: '보드',
  tagline: '네 개를 먼저 이어라',
  blurb: '칸에 돌을 떨어뜨려 가로·세로·대각선으로 4개를 먼저 잇자. AI 상대 연승 도전.',
  better: 'high',
  unit: '연승',
  glyph: '⦿',
  accent: '#ff5c6b',
  howto: '원하는 열을 클릭 / 탭 · 당신은 빨강, 항상 선공',

  mount(el, api) {
    const p = panel(el, 'c4');
    const { grid, btns } = buttonGrid(p, ROWS * COLS, COLS, 'gbtn disc');
    const status = h('p', 'muted center');
    p.append(status);
    let board, streak = 0, busy = false, last = -1, timer = 0;
    const hud = () => api.hud(`${streak}연승`);

    function render() {
      btns.forEach((b, i) => {
        b.dataset.p = board[i];
        b.classList.toggle('last', i === last);
        b.setAttribute('aria-label', `${(i % COLS) + 1}열`);
      });
    }

    function newRound() {
      board = emptyBoard();
      busy = false;
      last = -1;
      status.textContent = '당신 차례 (빨강)';
      render();
      hud();
    }

    function drop(c, who) {
      const m = play(board, c, who);
      board = m.b;
      last = m.r * COLS + c;
      render();
      if (isWin(board, m.r, c)) return who;
      return board.every(Boolean) ? 'draw' : null;
    }

    function settle(w) {
      if (!w) return false;
      busy = true;
      if (w === 2) {
        const run = streak;
        streak = 0;
        api.end(run);
        overlay(p, { title: 'AI 승리', text: `${run}연승에서 멈춤`, button: '다시 도전' }, newRound);
        return true;
      }
      if (w === 1) streak++;
      status.textContent = w === 1 ? '승리!' : '무승부 — 연승 유지';
      hud();
      timer = setTimeout(newRound, NEXT_DELAY);
      return true;
    }

    const off = listen(grid, 'click', (e) => {
      const b = e.target.closest('.gbtn');
      if (!b || busy) return;
      const c = Number(b.dataset.i) % COLS;
      if (dropRow(board, c) < 0) return;
      if (settle(drop(c, 1))) return;
      busy = true;
      status.textContent = 'AI 생각 중…';
      timer = setTimeout(() => {
        if (!settle(drop(aiMove(board), 2))) { busy = false; status.textContent = '당신 차례 (빨강)'; }
      }, AI_DELAY);
    });
    newRound();
    return () => { off(); clearTimeout(timer); };
  },
};
