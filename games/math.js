import { overlay, panel, h, listen, countdown, rand, flash } from './util.js';

const TIME = 60, PER_LEVEL = 5;

export function makeProblem(level) {
  const ops = level >= 2 ? ['+', '-', '×'] : ['+', '-'];
  const op = ops[rand(ops.length)];
  if (op === '×') {
    const a = 2 + rand(3 + level), b = 2 + rand(8);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  const a = 1 + rand(9 * level), b = 1 + rand(9 * level);
  return op === '+'
    ? { text: `${a} + ${b}`, answer: a + b }
    : { text: `${Math.max(a, b)} − ${Math.min(a, b)}`, answer: Math.abs(a - b) };
}

export default {
  id: 'math',
  title: '암산 러시',
  category: '두뇌',
  tagline: '60초 계산 스프린트',
  blurb: '덧셈, 뺄셈, 곱셈을 최대한 빨리 풀자. 5문제마다 어려워진다.',
  better: 'high',
  unit: '문제',
  glyph: '±',
  accent: '#ffb86b',
  howto: '답을 입력하면 맞는 순간 다음 문제 · Enter 로 넘기면 오답',

  mount(el, api) {
    const p = panel(el);
    const q = h('div', 'big', '준비');
    const input = h('input', 'text-input');
    Object.assign(input, { inputMode: 'numeric', autocomplete: 'off', disabled: true, placeholder: '답' });
    input.setAttribute('aria-label', '답 입력');
    p.append(q, input);
    let prob = null, score = 0, left = TIME, running = false, stop = null;
    const hud = () => api.hud(`${score}문제 · ${Math.ceil(left)}초`);

    function next() {
      prob = makeProblem(1 + Math.floor(score / PER_LEVEL));
      q.textContent = `${prob.text} = ?`;
      input.value = '';
    }

    function start() {
      score = 0;
      running = true;
      input.disabled = false;
      input.focus();
      next();
      stop = countdown(TIME, (l) => { left = l; hud(); }, finish);
    }

    function finish() {
      running = false;
      input.disabled = true;
      api.end(score);
      overlay(p, { title: '시간 끝!', text: `${score}문제 정답`, button: '다시 하기' }, start);
    }

    const offs = [
      listen(input, 'input', () => {
        if (!running || input.value.trim() !== String(prob.answer)) return;
        score++;
        hud();
        next();
      }),
      listen(input, 'keydown', (e) => {
        if (e.key !== 'Enter' || !running) return;
        flash(input, 'shake');
        next();
      }),
    ];
    hud();
    overlay(p, { title: '암산 러시', text: '60초 동안 최대한 많이 푸세요.', button: '시작' }, start);
    return () => { offs.forEach((off) => off()); stop?.(); };
  },
};
