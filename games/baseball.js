import { overlay, panel, h, listen, shuffle, flash } from './util.js';

const DIGITS = 3, MAX_TRIES = 10;

export function judge(secret, guess) {
  let s = 0, b = 0;
  [...guess].forEach((d, i) => {
    if (secret[i] === d) s++;
    else if (secret.includes(d)) b++;
  });
  return { s, b };
}

export const isValidGuess = (v) => /^[1-9]{3}$/.test(v) && new Set(v).size === DIGITS;
const makeSecret = () => shuffle([...'123456789']).slice(0, DIGITS).join('');

export default {
  id: 'baseball',
  title: '숫자 야구',
  category: '두뇌',
  tagline: '스트라이크와 볼로 추리',
  blurb: '숨겨진 서로 다른 세 자리 숫자를 맞히자. 자리까지 맞으면 S, 숫자만 맞으면 B.',
  better: 'low',
  unit: '회',
  glyph: '⚾',
  accent: '#eef0f8',
  howto: '1~9 서로 다른 숫자 3개 입력 후 Enter · 10번 안에 맞히기',

  mount(el, api) {
    const p = panel(el);
    const rule = h('p', 'muted center', '예: 정답 352 / 추측 325 → 1S 2B');
    const input = h('input', 'text-input');
    Object.assign(input, { inputMode: 'numeric', maxLength: DIGITS, autocomplete: 'off', placeholder: '세 자리 숫자' });
    input.setAttribute('aria-label', '추측 입력');
    const go = h('button', 'btn primary', '확인');
    go.type = 'button';
    const status = h('p', 'status error center');
    const log = h('ol', 'log');
    p.append(rule, input, go, status, log);
    let secret, tries, done;
    const hud = () => api.hud(`${tries}/${MAX_TRIES}회`);

    function reset() {
      secret = makeSecret();
      tries = 0;
      done = false;
      log.replaceChildren();
      status.textContent = '';
      input.value = '';
      hud();
      input.focus({ preventScroll: true });
    }

    function submit() {
      if (done) return;
      const v = input.value.trim();
      if (!isValidGuess(v)) {
        status.textContent = '1~9 사이 서로 다른 숫자 3개를 입력하세요';
        flash(input, 'shake');
        return;
      }
      tries++;
      const { s, b } = judge(secret, v);
      log.prepend(h('li', null, `${tries}. ${v} → ${s || b ? `${s}S ${b}B` : 'OUT'}`));
      input.value = '';
      status.textContent = '';
      hud();
      if (s === DIGITS) {
        done = true;
        api.end(tries);
        overlay(p, { title: '홈런!', text: `${tries}번 만에 정답 ${secret}`, button: '새 게임' }, reset);
      } else if (tries === MAX_TRIES) {
        done = true;
        api.end(null);
        overlay(p, { title: '삼진 아웃', text: `정답은 ${secret}`, button: '새 게임' }, reset);
      }
    }

    const offs = [
      listen(go, 'click', submit),
      listen(input, 'keydown', (e) => { if (e.key === 'Enter') submit(); }),
    ];
    reset();
    return () => offs.forEach((off) => off());
  },
};
