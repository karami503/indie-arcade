// Run: node test/selfcheck.mjs
import assert from 'node:assert/strict';
import { merge, normalize, recordPlay, emptySave, sync, connect, getToken } from '../js/store.js';
import { slideRow, move, canMove } from '../games/g2048.js';
import { placeMines, floodOpen, neighbors } from '../games/mines.js';

const dirOf = (id) => (id === 'mines' ? 'low' : 'high');

// merge: best picks the better side per direction, plays take the max, newer nickname wins
const a = { v: 1, nickname: 'old', updatedAt: 1, games: { echo: { best: 5, plays: 3 }, mines: { best: 40, plays: 2 } } };
const b = { v: 1, nickname: 'new', updatedAt: 2, games: { echo: { best: 9, plays: 1 }, mines: { best: 25.5, plays: 5 }, snake: { best: null, plays: 1 } } };
const m = merge(a, b, dirOf);
assert.equal(m.nickname, 'new');
assert.deepEqual(m.games.echo, { best: 9, plays: 3 });
assert.deepEqual(m.games.mines, { best: 25.5, plays: 5 });
assert.deepEqual(m.games.snake, { best: null, plays: 1 });
assert.deepEqual(merge(m, m, dirOf), m, 'merge is idempotent');

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

// Gist sync against a fake GitHub API: first sync creates a private gist, second merges into it.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
let gist = null;
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const path = url.replace('https://api.github.com', '');
  calls.push(`${init.method || 'GET'} ${path}`);
  assert.equal(init.headers.Authorization, 'Bearer test_token_0000000000');
  const json = (status, body) => ({ ok: status < 300, status, json: async () => body });
  if (path === '/user') return json(200, { login: 'tester', avatar_url: 'https://avatars.githubusercontent.com/u/1' });
  if (path.startsWith('/gists?')) return json(200, gist ? [{ id: gist.id, description: gist.description, files: { 'indie-arcade.json': {} } }] : []);
  if (path === '/gists' && init.method === 'POST') {
    const body = JSON.parse(init.body);
    assert.equal(body.public, false);
    gist = { id: 'g1', ...body };
    return json(201, gist);
  }
  if (path === '/gists/g1' && !init.method) return json(200, gist);
  if (path === '/gists/g1' && init.method === 'PATCH') {
    gist = { ...gist, files: JSON.parse(init.body).files };
    return json(200, gist);
  }
  return json(404, {});
};
await connect('test_token_0000000000');
assert.equal(getToken(), 'test_token_0000000000');
const deviceA = { v: 1, nickname: 'A', updatedAt: 10, games: { echo: { best: 7, plays: 2 } } };
await sync(deviceA, 'test_token_0000000000', dirOf);
assert.ok(calls.includes('POST /gists'));
mem.delete('arcade.gist'); // device B has no cached gist id: must find it by description
const deviceB = { v: 1, nickname: 'B', updatedAt: 20, games: { echo: { best: 3, plays: 5 }, mines: { best: 50, plays: 1 } } };
const merged = await sync(deviceB, 'test_token_0000000000', dirOf);
assert.deepEqual(merged.games, { echo: { best: 7, plays: 5 }, mines: { best: 50, plays: 1 } });
assert.equal(merged.nickname, 'B');
assert.deepEqual(JSON.parse(gist.files['indie-arcade.json'].content), merged);

console.log('selfcheck ok');
