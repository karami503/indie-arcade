import { overlay, panel, buttonGrid, listen, shuffle, stopwatch } from './util.js';

const EMOJI = ['🍎', '🍋', '🍇', '🍉', '🍒', '🥝', '🍑', '🍍'];
const FLIP_BACK_MS = 700;

export default {
  id: 'memory',
  title: '짝 맞추기',
  category: '퍼즐',
  tagline: '같은 그림 두 장을 찾아라',
  blurb: '카드를 두 장씩 뒤집어 같은 그림을 모두 찾자. 적은 시도로 끝낼수록 좋은 기록.',
  better: 'low',
  unit: '회',
  glyph: '❖',
  accent: '#ff7eb6',
  howto: '카드를 클릭 / 탭해서 뒤집기',

  mount(el, api) {
    const p = panel(el);
    const { grid, btns } = buttonGrid(p, EMOJI.length * 2, 4, 'gbtn');
    let deck, open, matched, moves, lock, watch = null, timer = 0;
    const hud = (t = watch?.read() ?? 0) => api.hud(`${moves}회 · ${t}초`);

    function render() {
      btns.forEach((b, i) => {
        const face = open.includes(i) || matched.has(i);
        b.textContent = face ? deck[i] : '';
        b.classList.toggle('on', open.includes(i));
        b.classList.toggle('found', matched.has(i));
        b.setAttribute('aria-label', face ? deck[i] : '뒤집힌 카드');
      });
    }

    function reset() {
      deck = shuffle([...EMOJI, ...EMOJI]);
      open = [];
      matched = new Set();
      moves = 0;
      lock = false;
      watch?.stop();
      watch = null;
      clearTimeout(timer);
      render();
      hud(0);
    }

    function finish() {
      const t = watch.read();
      watch.stop();
      api.end(moves);
      overlay(p, { title: '전부 찾았다!', text: `${moves}회 · ${t}초`, button: '다시 하기' }, reset);
    }

    function flip(i) {
      if (lock || open.includes(i) || matched.has(i)) return;
      if (!watch) watch = stopwatch(hud);
      open = [...open, i];
      render();
      if (open.length < 2) return;
      moves++;
      hud();
      const [a, b] = open;
      if (deck[a] === deck[b]) {
        matched = new Set([...matched, a, b]);
        open = [];
        render();
        if (matched.size === deck.length) finish();
        return;
      }
      lock = true;
      timer = setTimeout(() => { open = []; lock = false; render(); }, FLIP_BACK_MS);
    }

    const off = listen(grid, 'click', (e) => {
      const b = e.target.closest('.gbtn');
      if (b) flip(Number(b.dataset.i));
    });
    reset();
    return () => { off(); watch?.stop(); clearTimeout(timer); };
  },
};
