import { overlay, panel, h, listen } from './util.js';

const ROUNDS = 5, MIN_WAIT = 1200, MAX_EXTRA = 2300;

export default {
  id: 'reaction',
  title: '반응속도',
  category: '반사신경',
  tagline: '초록색이 되는 순간',
  blurb: '화면이 초록으로 바뀌는 순간 누르자. 5번의 평균 반응속도를 잰다.',
  better: 'low',
  unit: 'ms',
  glyph: '⚡',
  accent: '#4fd17a',
  howto: '초록색이 되면 화면을 누르거나 Space · 너무 빨리 누르면 그 판은 다시',

  mount(el, api) {
    const p = panel(el);
    const pad = h('button', 'react');
    pad.type = 'button';
    p.append(pad);
    let state = 'idle', times = [], t0 = 0, timer = 0;

    const show = (st, text) => { state = st; pad.dataset.state = st; pad.textContent = text; };
    const hud = () => api.hud(`${times.length}/${ROUNDS}회`);

    function arm() {
      show('wait', '초록색이 되면 누르세요…');
      timer = setTimeout(() => { t0 = performance.now(); show('go', '지금!'); }, MIN_WAIT + Math.random() * MAX_EXTRA);
    }

    function start() { times = []; hud(); arm(); }

    function press() {
      if (state === 'wait') { clearTimeout(timer); show('early', '너무 빨라요! 눌러서 다시'); return; }
      if (state === 'early' || state === 'result') { arm(); return; }
      if (state !== 'go') return;
      const ms = Math.round(performance.now() - t0);
      times = [...times, ms];
      hud();
      if (times.length < ROUNDS) { show('result', `${ms}ms — 눌러서 다음`); return; }
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / ROUNDS);
      show('idle', `평균 ${avg}ms`);
      api.end(avg);
      overlay(p, { title: `평균 ${avg}ms`, text: `${times.join(' · ')} ms`, button: '다시 하기' }, start);
    }

    const offs = [
      listen(pad, 'pointerdown', (e) => { e.preventDefault(); press(); }),
      listen(window, 'keydown', (e) => {
        const onOtherButton = e.target instanceof HTMLButtonElement && e.target !== pad;
        if (e.code !== 'Space' || e.repeat || onOtherButton) return;
        e.preventDefault();
        press();
      }),
    ];
    show('idle', '');
    hud();
    overlay(p, { title: '반응속도', text: `빨간 화면이 초록으로 바뀌는 순간 누르세요. ${ROUNDS}번 평균.`, button: '시작' }, start);
    return () => { offs.forEach((off) => off()); clearTimeout(timer); };
  },
};
