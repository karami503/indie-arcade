import { overlay, panel, buttonGrid, listen, shuffle, stopwatch, flash } from './util.js';

const N = 25, COLS = 5;

export default {
  id: 'order',
  title: '1 to 25',
  category: '반사신경',
  tagline: '숫자를 순서대로 눌러라',
  blurb: '뒤섞인 1부터 25까지를 순서대로 최대한 빨리 누르자.',
  better: 'low',
  unit: '초',
  glyph: '⑳',
  accent: '#7cf3ff',
  howto: '1부터 차례로 클릭 / 탭 · 1을 누르는 순간 시간 시작',

  mount(el, api) {
    const p = panel(el);
    const { grid, btns } = buttonGrid(p, N, COLS, 'gbtn');
    let nums, next, watch = null, done;
    const hud = (t = watch?.read() ?? 0) => api.hud(`다음: ${Math.min(next, N)} · ${t}초`);

    function reset() {
      nums = shuffle([...Array(N).keys()].map((i) => i + 1));
      next = 1;
      done = false;
      watch?.stop();
      watch = null;
      btns.forEach((b, i) => {
        b.textContent = nums[i];
        b.classList.remove('done', 'bad');
      });
      hud(0);
    }

    const off = listen(grid, 'click', (e) => {
      const b = e.target.closest('.gbtn');
      if (!b || done) return;
      const i = Number(b.dataset.i);
      if (nums[i] !== next) { flash(b, 'bad'); return; }
      if (!watch) watch = stopwatch(hud);
      b.classList.add('done');
      next++;
      if (next <= N) { hud(); return; }
      done = true;
      const t = watch.read();
      watch.stop();
      api.end(t);
      overlay(p, { title: '완료!', text: `${t}초`, button: '다시 하기' }, reset);
    });
    reset();
    return () => { off(); watch?.stop(); };
  },
};
