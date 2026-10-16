// Save data lives in localStorage; js/cloud.js copies it to the shared leaderboard.
const SAVE_KEY = 'arcade.save.v1';

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

// Stored JSON is untrusted: rebuild a clean object from it.
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
