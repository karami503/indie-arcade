import { overlay, panel, buttonGrid, listen, rand } from './util.js';

const PADS = [
  { c: '#4fd17a', f: 329.6 }, { c: '#ff5c6b', f: 261.6 },
  { c: '#ffd166', f: 392 }, { c: '#5c8dff', f: 440 },
];
const START_GAP = 600, MIN_GAP = 260, LEAD_IN = 500;

export default {
  id: 'simon',
  title: '사이먼',
  category: '두뇌',
  tagline: '불빛 순서를 기억해라',
  blurb: '점점 길어지는 불빛과 소리의 순서를 그대로 따라 누르자.',
  better: 'high',
  unit: '단계',
  glyph: '◕',
  accent: '#4fd17a',
  howto: '불빛이 끝나면 같은 순서로 클릭 / 탭, 또는 키보드 1~4',

  mount(el, api) {
    const p = panel(el);
    const { grid, btns } = buttonGrid(p, PADS.length, 2, 'gbtn pad');
    btns.forEach((b, i) => {
      b.style.setProperty('--c', PADS[i].c);
      b.setAttribute('aria-label', `패드 ${i + 1}`);
    });
    let seq = [], pos = 0, state = 'idle', audio = null;
    const timers = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
    };

    function beep(f) {
      try {
        audio ??= new AudioContext();
        const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.connect(g).connect(audio.destination);
        o.start(t);
        o.stop(t + 0.36);
      } catch { /* audio unavailable: the lights still play */ }
    }

    function light(i, ms) {
      btns[i].classList.add('lit');
      beep(PADS[i].f);
      later(() => btns[i].classList.remove('lit'), ms);
    }

    function playback() {
      state = 'show';
      const gap = Math.max(MIN_GAP, START_GAP - seq.length * 20);
      seq.forEach((v, k) => later(() => light(v, gap * 0.65), LEAD_IN + k * gap));
      later(() => { state = 'input'; pos = 0; api.hud(`${seq.length - 1}단계 · 따라 하세요`); }, LEAD_IN + seq.length * gap);
    }

    function nextRound() {
      seq = [...seq, rand(PADS.length)];
      api.hud(`${seq.length - 1}단계 · 보세요`);
      playback();
    }

    function start() { seq = []; nextRound(); }

    function press(i) {
      if (state !== 'input') return;
      light(i, 200);
      if (i !== seq[pos]) {
        state = 'idle';
        const score = seq.length - 1;
        api.end(score);
        overlay(p, { title: '틀렸어요', text: `${score}단계 통과`, button: '다시 하기' }, start);
        return;
      }
      if (++pos === seq.length) { state = 'show'; later(nextRound, 700); }
    }

    const offs = [
      listen(grid, 'click', (e) => {
        const b = e.target.closest('.gbtn');
        if (b) press(Number(b.dataset.i));
      }),
      listen(window, 'keydown', (e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= PADS.length) press(n - 1);
      }),
    ];
    api.hud('0단계');
    overlay(p, { title: '사이먼', text: '불빛 순서를 기억해서 똑같이 누르세요.', button: '시작' }, start);
    return () => { offs.forEach((off) => off()); timers.forEach(clearTimeout); audio?.close(); };
  },
};
