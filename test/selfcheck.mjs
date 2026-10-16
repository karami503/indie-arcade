// Run: node test/selfcheck.mjs
import assert from 'node:assert/strict';
import { normalize, recordPlay, emptySave, pickBetter } from '../js/store.js';
import { slideRow, move, canMove } from '../games/g2048.js';
import { placeMines, floodOpen, neighbors } from '../games/mines.js';

assert.equal(pickBetter('low', 40, 25.5), 25.5);
assert.equal(pickBetter('high', null, 3), 3);

// normalize drops junk from untrusted JSON
const n = normalize({ nickname: 42, games: { echo: { best: 'x', plays: -3 }, '<img>': { best: 1 } } });
assert.equal(n.nickname, '플레이어');
assert.deepEqual(n.games, { echo: { best: null, plays: 0 } });
assert.deepEqual(normalize(null), emptySave());

// recordPlay: loss counts a play without touching best; isBest only on improvement
let s = emptySave();
({ save: s } = recordPlay(s, 'mines', null, 'low'));
assert.deepEqual(s.games.mines, { best: null, plays: 1 });
let r = recordPlay(s, 'mines', 30, 'low');
assert.equal(r.isBest, true);
r = recordPlay(r.save, 'mines', 35, 'low');
assert.equal(r.isBest, false);
assert.equal(r.save.games.mines.best, 30);

// 2048
assert.deepEqual(slideRow([2, 2, 2, 2]), { row: [4, 4, 0, 0], gained: 8 });
assert.deepEqual(slideRow([2, 0, 2, 4]).row, [4, 4, 0, 0]);
const board = [[2, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [4, 0, 0, 4]];
assert.deepEqual(move(board, 'right').board[0], [0, 0, 0, 4]);
assert.deepEqual(move(board, 'down').board.map((row) => row[0]), [0, 0, 2, 4]);
assert.equal(move([[2, 4, 0, 0], [4, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left').moved, false);
assert.equal(canMove([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]), false);

// mines: first click area is safe, flood fill never opens a mine
for (let k = 0; k < 200; k++) {
  const safe = Math.floor(Math.random() * 81);
  const mines = placeMines(safe);
  assert.equal(mines.size, 10);
  assert.ok(![safe, ...neighbors(safe)].some((i) => mines.has(i)));
  const opened = floodOpen(mines, new Set(), safe);
  assert.ok(![...opened].some((i) => mines.has(i)));
}

// registry: 30 games, unique ids that the save normalizer accepts, required fields present
const { GAMES } = await import('../games/index.js');
assert.equal(GAMES.length, 30);
assert.equal(new Set(GAMES.map((g) => g.id)).size, 30);
for (const g of GAMES) {
  assert.match(g.id, /^[a-z0-9-]{1,24}$/, g.id);
  for (const k of ['title', 'category', 'tagline', 'blurb', 'unit', 'glyph', 'accent', 'howto']) assert.ok(g[k], `${g.id}.${k}`);
  assert.ok(['high', 'low'].includes(g.better), g.id);
  assert.equal(typeof g.mount, 'function', g.id);
}

// tetris
const tetris = await import('../games/tetris.js');
assert.deepEqual(tetris.rotate([[1, 0, 0], [1, 1, 1]]), [[1, 1], [1, 0], [1, 0]]);
const full = tetris.emptyBoard();
full[19] = Array(10).fill('I');
full[18][0] = 'O';
const cleared = tetris.clearLines(full);
assert.equal(cleared.lines, 1);
assert.equal(cleared.board[19][0], 'O');
assert.equal(tetris.collides(tetris.emptyBoard(), [[1, 1, 1, 1]], 7, 0), true);
assert.equal(tetris.collides(tetris.emptyBoard(), [[1, 1, 1, 1]], 6, 0), false);

// lights out: pressing the same cell twice is a no-op, and a scramble is never already solved
const lo = await import('../games/lightsout.js');
const off25 = Array(25).fill(false);
assert.deepEqual(lo.press(lo.press(off25, 12), 12), off25);
assert.equal(lo.press(off25, 0).filter(Boolean).length, 3);
assert.ok(lo.scramble().some(Boolean));

// 15 puzzle
const ff = await import('../games/fifteen.js');
assert.equal(ff.slide(ff.solved(), 0), null);
assert.deepEqual(ff.slide(ff.solved(), 14).slice(13), [14, 0, 15]);

// tic-tac-toe: AI blocks an immediate threat
const ttt = await import('../games/tictactoe.js');
assert.equal(ttt.winner(['X', 'X', 'X', null, 'O', 'O', null, null, null]), 'X');
assert.equal(ttt.bestMove(['X', 'X', null, null, 'O', null, null, null, null]), 2);

// connect four: AI takes a win, else blocks
const c4 = await import('../games/connect4.js');
let b4 = c4.emptyBoard();
for (const c of [0, 1, 2]) b4 = c4.play(b4, c, 1).b;
assert.equal(c4.aiMove(b4), 3);
for (const c of [4, 4, 4]) b4 = c4.play(b4, c, 2).b;
assert.equal(c4.aiMove(b4), 4, 'win beats block');
const vert = [0, 0, 0, 0].reduce((acc, c) => c4.play(acc.b, c, 1), { b: c4.emptyBoard() });
assert.equal(c4.isWin(vert.b, vert.r, 0), true);

// number baseball + math rush
const bb = await import('../games/baseball.js');
assert.deepEqual(bb.judge('352', '325'), { s: 1, b: 2 });
assert.deepEqual(bb.judge('123', '456'), { s: 0, b: 0 });
assert.equal(bb.isValidGuess('112'), false);
assert.equal(bb.isValidGuess('102'), false);
assert.equal(bb.isValidGuess('987'), true);
const mr = await import('../games/math.js');
for (let i = 0; i < 300; i++) {
  const { text, answer } = mr.makeProblem(1 + (i % 6));
  const [a, op, b] = text.split(' ');
  assert.equal(answer, op === '+' ? +a + +b : op === '×' ? a * b : a - b, text);
  assert.ok(answer >= 0);
}


// Supabase client against a fake server: anonymous sign-in once, refresh when expired,
// re-sign-in when the refresh token is dead, upsert own rows, filter bad leaderboard rows.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const cfg = (await import('../js/config.js')).default;
const cloud = await import('../js/cloud.js');
assert.equal(cloud.enabled(), cfg.url !== '' && cfg.anonKey !== '');
Object.assign(cfg, { url: 'https://test.supabase.co', anonKey: 'anon_test' });
assert.equal(cloud.enabled(), true);

const reqs = [];
let tokenStatus = 200, seq = 0;
const reply = (status, body) => ({ ok: status < 300, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) });
const auth = (uid) => ({ access_token: `a${++seq}`, refresh_token: `r${seq}`, expires_in: 3600, user: { id: uid } });
globalThis.fetch = async (url, init = {}) => {
  const path = url.replace(cfg.url, '');
  reqs.push({ path, method: init.method || 'GET', headers: init.headers, body: init.body && JSON.parse(init.body) });
  assert.equal(init.headers.apikey, 'anon_test');
  if (path === '/auth/v1/signup') return reply(200, auth(`u${seq + 1}`));
  if (path.startsWith('/auth/v1/token')) return tokenStatus === 200 ? reply(200, auth('u1')) : reply(tokenStatus, { error: 'invalid_grant' });
  if (path.startsWith('/rest/v1/scores?on_conflict')) return reply(201);
  if (path.startsWith('/rest/v1/scores?select')) return reply(200, [{ player_id: 'u1', nickname: 'A', best: 9 }, { nickname: 5, best: 'x' }]);
  return reply(404, {});
};
const paths = () => reqs.splice(0).map((r) => `${r.method} ${r.path.split('?')[0]}`);
const twoGames = { v: 1, nickname: '테스터', updatedAt: 1, games: { echo: { best: 7, plays: 2 }, mines: { best: null, plays: 1 } } };

await cloud.push(emptySave());
assert.deepEqual(paths(), [], 'nothing to upload: no sign-in either');
await Promise.all([cloud.session(), cloud.session()]);
assert.deepEqual(paths(), ['POST /auth/v1/signup'], 'concurrent callers share one sign-in');
await cloud.push(twoGames);
const up = reqs[0];
assert.deepEqual(paths(), ['POST /rest/v1/scores']);
assert.equal(up.headers.Authorization, 'Bearer a1');
assert.match(up.headers.Prefer, /resolution=merge-duplicates/);
assert.deepEqual(up.body.map((r) => [r.player_id, r.game_id, r.nickname, r.best, r.plays]), [['u1', 'echo', '테스터', 7, 2], ['u1', 'mines', '테스터', null, 1]]);

const expire = () => { const s = JSON.parse(mem.get('arcade.sb.session')); mem.set('arcade.sb.session', JSON.stringify({ ...s, exp: 0 })); };
expire();
await cloud.push(twoGames);
assert.deepEqual(paths(), ['POST /auth/v1/token', 'POST /rest/v1/scores'], 'expired session refreshes');
expire();
tokenStatus = 400;
await cloud.push(twoGames);
assert.deepEqual(paths(), ['POST /auth/v1/token', 'POST /auth/v1/signup', 'POST /rest/v1/scores'], 'dead refresh token signs in again');

const ranking = await cloud.top('mines', 'low');
const q = reqs.splice(0)[0];
assert.match(q.path, /game_id=eq\.mines&best=not\.is\.null&order=best\.asc&limit=10/);
assert.equal(q.headers.Authorization, undefined, 'leaderboard is read anonymously');
assert.deepEqual(ranking, [{ player_id: 'u1', nickname: 'A', best: 9 }]);

globalThis.fetch = async () => { throw new TypeError('offline'); };
await assert.rejects(cloud.top('echo', 'high'), /네트워크 오류/);

console.log('selfcheck ok');
