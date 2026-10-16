import { overlay, panel, buttonGrid, countdown, listen, rand } from './util.js';

const TIME = 30, HOLES = 9, GOLD_CHANCE = 0.1, POP_EVERY = 600;

export default {
  id: 'whack',
  title: '두더지 잡기',
  category: '반사신경',
  tagline: '튀어나오면 바로 때려라',
  blurb: '30초 동안 구멍에서 튀어나오는 두더지를 잡자. ⭐ 는 3점.',
  better: 'high',
  unit: '점',
  glyph: '⊙',
  accent: '#c98a4b',
  howto: '튀어나온 두더지를 클릭 / 탭',

  mount(el, api) {
    const p = panel(el);
    const { grid, btns } = buttonGrid(p, HOLES, 3, 'gbtn hole');
    btns.forEach((b) => b.setAttribute('aria-label', '구멍'));
    let score = 0, left = TIME, seq = 0, up = new Map(), stopClock = null, spawner = 0;
    const timers = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
    };
    const hud = () => api.hud(`${score}점 · ${Math.ceil(left)}초`);
    const hide = (i) => {
      up.delete(i);
      btns[i].classList.remove('up');
      btns[i].textContent = '';
    };

    function pop() {
      const free = btns.map((_, i) => i).filter((i) => !up.has(i));
      if (!free.length) return;
      const i = free[rand(free.length)], gold = Math.random() < GOLD_CHANCE, id = ++seq;
      up.set(i, { val: gold ? 3 : 1, id });
      btns[i].classList.add('up');
      btns[i].textContent = gold ? '⭐' : '🐹';
      // id check: a later mole in the same hole must not be hidden by this timer
      later(() => { if (up.get(i)?.id === id) hide(i); }, Math.max(450, 1000 - score * 12));
    }

    function stopAll() {
      stopClock?.();
      stopClock = null;
      clearInterval(spawner);
      timers.forEach(clearTimeout);
      timers.clear();
      [...up.keys()].forEach(hide);
    }

    function start() {
      score = 0;
      stopClock = countdown(TIME, (l) => { left = l; hud(); }, finish);
      spawner = setInterval(pop, POP_EVERY);
      pop();
    }

    function finish() {
      stopAll();
      api.end(score);
      overlay(p, { title: '시간 끝!', text: `${score}점`, button: '다시 하기' }, start);
    }

    const off = listen(grid, 'click', (e) => {
      const b = e.target.closest('.gbtn');
      if (!b) return;
      const i = Number(b.dataset.i), mole = up.get(i);
      if (!mole) return;
      score += mole.val;
      hide(i);
      b.classList.add('hit');
      later(() => b.classList.remove('hit'), 150);
      hud();
    });
    hud();
    overlay(p, { title: '두더지 잡기', text: '30초 동안 최대한 많이!', button: '시작' }, start);
    return () => { off(); stopAll(); };
  },
};
