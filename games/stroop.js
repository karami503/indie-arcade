import { overlay, panel, h, listen, countdown, rand, flash } from './util.js';

const TIME = 30, MISMATCH = 0.75;
const COLORS = [
  { name: '빨강', hex: '#ff5c6b' }, { name: '파랑', hex: '#5c8dff' },
  { name: '초록', hex: '#4fd17a' }, { name: '노랑', hex: '#ffd166' },
];

export default {
  id: 'stroop',
  title: '색깔 말하기',
  category: '두뇌',
  tagline: '뜻 말고 색을 봐라',
  blurb: '글자가 무슨 색으로 쓰였는지 고르자. 뇌가 글자 뜻에 자꾸 속는다 (스트룹 효과).',
  better: 'high',
  unit: '점',
  glyph: 'Aa',
  accent: '#5c8dff',
  howto: '글자의 색깔 버튼을 클릭, 또는 키보드 1~4 · 틀리면 -1점',

  mount(el, api) {
    const p = panel(el);
    const hint = h('p', 'muted center', '글자 뜻 말고, 글자의 "색깔"을 고르세요');
    const word = h('div', 'big', '준비');
    const choices = h('div', 'choices');
    COLORS.forEach((c, i) => {
      const b = h('button', 'btn', `${i + 1}. ${c.name}`);
      b.type = 'button';
      b.dataset.i = i;
      choices.append(b);
    });
    p.append(hint, word, choices);
    let ink = 0, score = 0, left = TIME, running = false, stop = null;
    const hud = () => api.hud(`${score}점 · ${Math.ceil(left)}초`);

    function next() {
      const w = rand(COLORS.length);
      ink = rand(COLORS.length);
      if (Math.random() < MISMATCH) while (ink === w) ink = rand(COLORS.length);
      word.textContent = COLORS[w].name;
      word.style.color = COLORS[ink].hex;
    }

    function pick(i) {
      if (!running) return;
      if (i === ink) score++;
      else { score = Math.max(0, score - 1); flash(word, 'shake'); }
      hud();
      next();
    }

    function start() {
      score = 0;
      running = true;
      next();
      stop = countdown(TIME, (l) => { left = l; hud(); }, finish);
    }

    function finish() {
      running = false;
      api.end(score);
      overlay(p, { title: '시간 끝!', text: `${score}점`, button: '다시 하기' }, start);
    }

    const offs = [
      listen(choices, 'click', (e) => {
        const b = e.target.closest('button');
        if (b) pick(Number(b.dataset.i));
      }),
      listen(window, 'keydown', (e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= COLORS.length) pick(n - 1);
      }),
    ];
    hud();
    overlay(p, { title: '색깔 말하기', text: '30초 동안 글자의 색깔을 최대한 많이 맞히세요.', button: '시작' }, start);
    return () => { offs.forEach((off) => off()); stop?.(); };
  },
};
