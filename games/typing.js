import { overlay, panel, h, listen, countdown, rand, flash } from './util.js';

const TIME = 60, QUEUE = 4;
const WORDS = [
  '사과', '바다', '하늘', '컴퓨터', '고양이', '강아지', '자전거', '도서관', '무지개', '비행기', '학교', '친구',
  '여행', '음악', '커피', '우주', '별빛', '노을', '기차', '시계', '연필', '지도', '모험', '용기', '나무', '구름',
  '바람', '햇살', '감자', '토끼', '거북이', '호랑이', '달팽이', '피아노', '기타', '축구', '야구', '농구', '수영',
  '달리기', '게임', '점수', '레벨', '보물', '열쇠', '마법사', '기사', '드래곤', '성벽', '포션', '화살', '방패',
  '번개', '얼음', '불꽃', '숲속', '사막', '동굴', '섬나라', '항구', '등대', '눈사람', '팝콘', '김밥', '떡볶이',
  '라면', '비빔밥', '초콜릿', '딸기', '수박', '바나나', '포도', '키보드', '마우스', '모니터', '인터넷', '배터리',
  '카메라', '우산', '메아리', '아케이드', '두더지',
];

export default {
  id: 'typing',
  title: '타자 연습',
  category: '두뇌',
  tagline: '60초 한글 타자 대결',
  blurb: '화면에 나온 단어를 빠르고 정확하게 입력하자. 60초 동안 몇 개나?',
  better: 'high',
  unit: '개',
  glyph: '⌨',
  accent: '#a7f070',
  howto: '단어를 입력하고 Space 또는 Enter',

  mount(el, api) {
    const p = panel(el);
    const word = h('div', 'big', '준비');
    const upcoming = h('p', 'upcoming');
    const input = h('input', 'text-input');
    Object.assign(input, { autocomplete: 'off', spellcheck: false, lang: 'ko', disabled: true, placeholder: '입력 후 Space / Enter' });
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('aria-label', '단어 입력');
    p.append(word, upcoming, input);
    let queue = [], score = 0, misses = 0, left = TIME, running = false, stop = null;

    const hud = () => api.hud(`${score}개 · ${Math.ceil(left)}초`);
    const refill = () => { while (queue.length < QUEUE) queue = [...queue, WORDS[rand(WORDS.length)]]; };
    const show = () => { word.textContent = queue[0]; upcoming.textContent = queue.slice(1).join('  ·  '); };

    // strict: the player said "done" (Space/Enter), so a mismatch counts as a typo.
    function check(strict) {
      const v = input.value.trim();
      if (!running || !v) return;
      if (v === queue[0]) {
        score++;
        queue = queue.slice(1);
        refill();
        show();
        input.value = '';
        hud();
      } else if (strict) {
        misses++;
        flash(input, 'shake');
        input.value = '';
      }
    }

    function start() {
      queue = [];
      refill();
      show();
      score = 0;
      misses = 0;
      running = true;
      input.disabled = false;
      input.value = '';
      input.focus();
      stop = countdown(TIME, (l) => { left = l; hud(); }, finish);
    }

    function finish() {
      running = false;
      input.disabled = true;
      api.end(score);
      overlay(p, { title: '시간 끝!', text: `${score}개 · 오타 ${misses}`, button: '다시 하기' }, start);
    }

    const offs = [
      listen(input, 'input', (e) => { if (!e.isComposing) check(/\s$/.test(input.value)); }),
      listen(input, 'compositionend', () => check(false)),
      listen(input, 'keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) check(true); }),
    ];
    hud();
    overlay(p, { title: '타자 연습', text: '60초 동안 단어를 최대한 많이 입력하세요.', button: '시작' }, start);
    return () => { offs.forEach((off) => off()); stop?.(); };
  },
};
