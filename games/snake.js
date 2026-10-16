import { makeCanvas, overlay, keyDir, listen, onSwipe, loop } from './util.js';

const N = 20, CELL = 24, S = N * CELL;
const START_DELAY = 8;   // frames per move at start
const MIN_DELAY = 3;
const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export default {
  id: 'snake',
  title: '스네이크',
  category: '클래식',
  tagline: '클래식, 하지만 빠르게',
  blurb: '먹을수록 길어지고 빨라진다. 벽과 꼬리를 조심.',
  better: 'high',
  unit: '점',
  glyph: '⟆',
  accent: '#a7f070',
  howto: '방향키 / WASD 또는 스와이프',

  mount(el, api) {
    const { c, ctx } = makeCanvas(el, S, S);
    let st = null, running = false;

    const freeCell = (body) => {
      for (;;) {
        const f = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
        if (!body.some((b) => b.x === f.x && b.y === f.y)) return f;
      }
    };

    function reset() {
      const body = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      st = { body, dir: 'right', queue: [], food: freeCell(body), score: 0, tick: 0, delay: START_DELAY };
      api.hud('0점');
      running = true;
    }

    function turn(d) {
      if (!running) return;
      const last = st.queue.at(-1) || st.dir;
      if (d !== last && d !== OPPOSITE[last] && st.queue.length < 2) st.queue = [...st.queue, d];
    }

    function step() {
      if (!running || ++st.tick < st.delay) return;
      st.tick = 0;
      if (st.queue.length) [st.dir, ...st.queue] = st.queue;
      const [vx, vy] = VEC[st.dir];
      const head = { x: st.body[0].x + vx, y: st.body[0].y + vy };
      const eats = head.x === st.food.x && head.y === st.food.y;
      const body = eats ? st.body : st.body.slice(0, -1);
      const hitWall = head.x < 0 || head.y < 0 || head.x >= N || head.y >= N;
      if (hitWall || body.some((b) => b.x === head.x && b.y === head.y)) {
        running = false;
        api.end(st.score);
        overlay(el, { title: '게임 오버', text: `${st.score}점`, button: '다시 하기' }, reset);
        return;
      }
      st.body = [head, ...body];
      if (eats) {
        st.score++;
        st.food = freeCell(st.body);
        st.delay = Math.max(MIN_DELAY, START_DELAY - Math.floor(st.score / 5));
        api.hud(`${st.score}점`);
      }
    }

    function draw() {
      ctx.fillStyle = '#0b1009';
      ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = 'rgba(167,240,112,0.04)';
      for (let y = 0; y < N; y++) for (let x = y % 2; x < N; x += 2) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      if (!st) return;
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(st.food.x * CELL + CELL / 2, st.food.y * CELL + CELL / 2, CELL / 2.8, 0, Math.PI * 2);
      ctx.fill();
      st.body.forEach((b, i) => {
        ctx.fillStyle = i === 0 ? '#d4ff9a' : `hsl(95 75% ${60 - Math.min(i, 30)}%)`;
        ctx.beginPath();
        ctx.roundRect(b.x * CELL + 2, b.y * CELL + 2, CELL - 4, CELL - 4, 6);
        ctx.fill();
      });
    }

    const offs = [
      listen(window, 'keydown', (e) => {
        const d = keyDir(e);
        if (d) { e.preventDefault(); turn(d); }
      }),
      onSwipe(c, turn),
      loop(step, draw),
    ];
    overlay(el, { title: '스네이크', text: '5개 먹을 때마다 빨라진다.', button: '시작' }, reset);
    return () => offs.forEach((off) => off());
  },
};
