import { overlay, listen } from './util.js';

const COLS = 9, ROWS = 9, MINES = 10;

export function neighbors(i) {
  const x = i % COLS, y = Math.floor(i / COLS), out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = x + dx, ny = y + dy;
    if ((dx || dy) && nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) out.push(ny * COLS + nx);
  }
  return out;
}

// Mines never land on the first click or around it.
export function placeMines(safe, rand = Math.random) {
  const banned = new Set([safe, ...neighbors(safe)]);
  const pool = [...Array(COLS * ROWS).keys()].filter((i) => !banned.has(i));
  const mines = new Set();
  while (mines.size < MINES) mines.add(pool[Math.floor(rand() * pool.length)]);
  return mines;
}

export const countAround = (mines, i) => neighbors(i).filter((n) => mines.has(n)).length;

// Cells opened by clicking i (flood fill through zeros).
export function floodOpen(mines, opened, i) {
  const out = new Set(opened);
  const stack = [i];
  while (stack.length) {
    const cur = stack.pop();
    if (out.has(cur)) continue;
    out.add(cur);
    if (countAround(mines, cur) === 0) stack.push(...neighbors(cur).filter((n) => !out.has(n) && !mines.has(n)));
  }
  return out;
}

export default {
  id: 'mines',
  title: '지뢰찾기',
  category: '퍼즐',
  tagline: '9×9, 지뢰 10개',
  blurb: '숫자를 읽고 지뢰를 피해 모든 칸을 열어라. 빠를수록 좋은 기록.',
  better: 'low',
  unit: '초',
  glyph: '✸',
  accent: '#ff7eb6',
  howto: '클릭으로 열기 · 우클릭 또는 깃발 모드로 깃발 꽂기 · 첫 클릭은 항상 안전',

  mount(el, api) {
    const wrap = document.createElement('div');
    wrap.className = 'mines';
    const grid = document.createElement('div');
    grid.className = 'mines-grid';
    const flagBtn = document.createElement('button');
    flagBtn.type = 'button';
    flagBtn.className = 'btn ghost';
    const cells = Array.from({ length: COLS * ROWS }, (_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cell';
      b.dataset.i = i;
      grid.append(b);
      return b;
    });
    wrap.append(grid, flagBtn);
    el.append(wrap);

    let mines, opened, flags, started, timer, flagMode, over;

    function render() {
      cells.forEach((b, i) => {
        const isOpen = opened.has(i);
        const showMine = over && mines?.has(i);
        b.classList.toggle('open', isOpen);
        b.classList.toggle('mine', Boolean(showMine));
        const n = isOpen && !mines.has(i) ? countAround(mines, i) : 0;
        b.dataset.n = n;
        b.textContent = showMine ? '✸' : flags.has(i) ? '⚑' : n || '';
        b.setAttribute('aria-label', isOpen ? `열림 ${n}` : flags.has(i) ? '깃발' : '닫힘');
      });
      flagBtn.textContent = `깃발 모드: ${flagMode ? '켜짐' : '꺼짐'} · ⚑ ${MINES - flags.size}`;
      flagBtn.setAttribute('aria-pressed', String(flagMode));
    }

    const elapsed = () => Math.round((performance.now() - started) / 100) / 10;

    function reset() {
      mines = null; opened = new Set(); flags = new Set(); started = 0; flagMode = false; over = false;
      clearInterval(timer);
      api.hud('0.0초');
      render();
    }

    function finish(won) {
      over = true;
      clearInterval(timer);
      const t = elapsed();
      api.end(won ? t : null);
      render();
      overlay(wrap, won
        ? { title: '클리어!', text: `${t}초`, button: '다시 하기' }
        : { title: '펑!', text: '지뢰를 밟았어요.', button: '다시 하기' }, reset);
    }

    function toggleFlag(i) {
      if (over || opened.has(i)) return;
      const next = new Set(flags);
      if (next.has(i)) next.delete(i); else next.add(i);
      flags = next;
      render();
    }

    function open(i) {
      if (over || flags.has(i) || opened.has(i)) return;
      if (!mines) {
        mines = placeMines(i);
        started = performance.now();
        timer = setInterval(() => api.hud(`${elapsed().toFixed(1)}초`), 100);
      }
      if (mines.has(i)) { opened = new Set([...opened, i]); return finish(false); }
      opened = floodOpen(mines, opened, i);
      flags = new Set([...flags].filter((f) => !opened.has(f)));
      if (opened.size === COLS * ROWS - MINES) return finish(true);
      render();
    }

    const cellOf = (e) => e.target.closest('.cell');
    const offs = [
      listen(grid, 'click', (e) => {
        const b = cellOf(e);
        if (b) (flagMode ? toggleFlag : open)(Number(b.dataset.i));
      }),
      listen(grid, 'contextmenu', (e) => {
        const b = cellOf(e);
        if (b) { e.preventDefault(); toggleFlag(Number(b.dataset.i)); }
      }),
      listen(flagBtn, 'click', () => { flagMode = !flagMode; render(); }),
      () => clearInterval(timer),
    ];
    reset();
    return () => offs.forEach((off) => off());
  },
};
