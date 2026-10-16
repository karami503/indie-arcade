// Save data: localStorage first, optional sync to the user's own private GitHub Gist.
const SAVE_KEY = 'arcade.save.v1';
const TOKEN_KEY = 'arcade.token';
const GIST_KEY = 'arcade.gist';
const USER_KEY = 'arcade.ghuser';
const GIST_DESC = 'indie-arcade-save';
const GIST_FILE = 'indie-arcade.json';
const API = 'https://api.github.com';
const MAX_GIST_PAGES = 10;

export const emptySave = () => ({ v: 1, nickname: '플레이어', updatedAt: 0, games: {} });

// localStorage can throw (private mode, blocked storage); the site must still work.
export function localGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function localSet(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage unavailable: data lives for this tab only */ }
}

const num = (x) => (Number.isFinite(x) ? x : null);

// Remote and local JSON are untrusted: rebuild a clean object from it.
export function normalize(raw) {
  const save = emptySave();
  if (!raw || typeof raw !== 'object') return save;
  if (typeof raw.nickname === 'string') save.nickname = raw.nickname.slice(0, 16) || save.nickname;
  save.updatedAt = num(raw.updatedAt) ?? 0;
  for (const [id, g] of Object.entries(raw.games && typeof raw.games === 'object' ? raw.games : {})) {
    if (!/^[a-z0-9-]{1,24}$/.test(id) || !g || typeof g !== 'object') continue;
    save.games[id] = { best: num(g.best), plays: Math.max(0, Math.floor(num(g.plays) ?? 0)) };
  }
  return save;
}

export function pickBetter(dir, a, b) {
  if (a == null) return b ?? null;
  if (b == null) return a;
  return dir === 'low' ? Math.min(a, b) : Math.max(a, b);
}

export function merge(a, b, dirOf) {
  const newer = (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
  const ids = new Set([...Object.keys(a.games), ...Object.keys(b.games)]);
  const games = {};
  for (const id of ids) {
    const x = a.games[id] || {}, y = b.games[id] || {};
    games[id] = { best: pickBetter(dirOf(id), x.best, y.best), plays: Math.max(x.plays || 0, y.plays || 0) };
  }
  return { v: 1, nickname: newer.nickname, updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0), games };
}

export function load() {
  try { return normalize(JSON.parse(localGet(SAVE_KEY))); } catch { return emptySave(); }
}

export function persist(save) {
  localSet(SAVE_KEY, JSON.stringify(save));
  return save;
}

// Returns a new save with one play recorded. score null = play without a result (e.g. a loss).
export function recordPlay(save, id, score, dir) {
  const prev = save.games[id] || { best: null, plays: 0 };
  const best = score == null ? prev.best : pickBetter(dir, prev.best, score);
  const isBest = score != null && best === score && best !== prev.best;
  const next = {
    ...save,
    updatedAt: Date.now(),
    games: { ...save.games, [id]: { best, plays: prev.plays + 1 } },
  };
  return { save: next, isBest };
}

export const withNickname = (save, nickname) => ({ ...save, nickname, updatedAt: Date.now() });

// ---- GitHub Gist sync ----
export const getToken = () => localGet(TOKEN_KEY);
export const getUser = () => {
  try { return JSON.parse(localGet(USER_KEY)); } catch { return null; }
};

async function gh(path, token, init = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new Error('네트워크 오류 — 인터넷 연결을 확인하세요.');
  }
  if (res.status === 401) throw new Error('토큰이 유효하지 않거나 만료됐어요.');
  if (res.status === 404) throw Object.assign(new Error('Gist 를 찾을 수 없어요.'), { status: 404 });
  if (res.status === 403) throw new Error('GitHub 접근 거부 (403). 토큰에 gist 권한이 있는지 확인하세요.');
  if (!res.ok) throw new Error(`GitHub 오류 (${res.status})`);
  return res.json();
}

async function findGist(token) {
  const cached = localGet(GIST_KEY);
  if (cached) {
    try { return await gh(`/gists/${encodeURIComponent(cached)}`, token); } catch (e) {
      if (e.status !== 404) throw e; // gist deleted: search again below
    }
  }
  for (let page = 1; page <= MAX_GIST_PAGES; page++) {
    const list = await gh(`/gists?per_page=100&page=${page}`, token);
    const hit = list.find((g) => g.description === GIST_DESC && g.files[GIST_FILE]);
    if (hit) return gh(`/gists/${hit.id}`, token);
    if (list.length < 100) break;
  }
  return null;
}

export async function connect(token) {
  const user = await gh('/user', token);
  const info = { login: user.login, avatar: user.avatar_url };
  localSet(TOKEN_KEY, token);
  localSet(USER_KEY, JSON.stringify(info));
  return info;
}

export function disconnect() {
  [TOKEN_KEY, GIST_KEY, USER_KEY].forEach((k) => localSet(k, null));
}

// Pull remote, merge with local, push merged. Returns the merged save.
export async function sync(local, token, dirOf) {
  const gist = await findGist(token);
  let remote = emptySave();
  if (gist) {
    try { remote = normalize(JSON.parse(gist.files[GIST_FILE].content)); } catch { /* corrupt remote: local wins */ }
  }
  const merged = merge(local, remote, dirOf);
  const files = { [GIST_FILE]: { content: JSON.stringify(merged, null, 2) } };
  const saved = gist
    ? await gh(`/gists/${gist.id}`, token, { method: 'PATCH', body: JSON.stringify({ files }) })
    : await gh('/gists', token, { method: 'POST', body: JSON.stringify({ description: GIST_DESC, public: false, files }) });
  localSet(GIST_KEY, saved.id);
  return merged;
}
