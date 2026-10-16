// Shared leaderboard on Supabase (REST, no SDK). Each browser signs in anonymously,
// so players need no account and can only write their own rows (see supabase/schema.sql).
import cfg from './config.js';
import { localGet, localSet } from './store.js';

const SESSION_KEY = 'arcade.sb.session';
const REFRESH_MARGIN_S = 60;
const TOP_N = 10;

export const enabled = () => Boolean(cfg.url && cfg.anonKey);

async function call(path, { method = 'GET', body, token, prefer } = {}) {
  const headers = { apikey: cfg.anonKey };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  let res;
  try {
    res = await fetch(cfg.url + path, { method, headers, body: body && JSON.stringify(body) });
  } catch {
    throw new Error('네트워크 오류 — 인터넷 연결을 확인하세요.');
  }
  if (!res.ok) throw Object.assign(new Error(`랭킹 서버 오류 (${res.status})`), { status: res.status });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const readSession = () => {
  try { return JSON.parse(localGet(SESSION_KEY)); } catch { return null; }
};

function keep(data) {
  const s = {
    access: data.access_token,
    refresh: data.refresh_token,
    exp: data.expires_at ?? Math.floor(Date.now() / 1000) + data.expires_in,
    uid: data.user.id,
  };
  localSet(SESSION_KEY, JSON.stringify(s));
  return s;
}

async function ensure() {
  const s = readSession();
  if (s && s.exp - REFRESH_MARGIN_S > Date.now() / 1000) return s;
  if (s?.refresh) {
    try {
      return keep(await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh } }));
    } catch (e) {
      // A dead refresh token means a new anonymous player; old rows stay on the board but are no longer ours.
      if (e.status !== 400 && e.status !== 401) throw e;
    }
  }
  return keep(await call('/auth/v1/signup', { method: 'POST', body: { data: {} } }));
}

// One sign-in at a time, even if several pushes start together.
let pending = null;
export function session() {
  pending ??= ensure().finally(() => { pending = null; });
  return pending;
}

export const myId = () => readSession()?.uid ?? null;

// Upserts this browser's records (one row per game).
export async function push(save) {
  const rows = Object.entries(save.games).map(([game_id, g]) => ({ game_id, best: g.best, plays: g.plays }));
  if (!rows.length) return;
  const s = await session();
  const now = new Date().toISOString();
  await call('/rest/v1/scores?on_conflict=player_id,game_id', {
    method: 'POST',
    token: s.access,
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: rows.map((r) => ({ ...r, player_id: s.uid, nickname: save.nickname, updated_at: now })),
  });
}

// Top scores for one game. Rows come from other players, so drop anything malformed.
export async function top(gameId, dir) {
  const order = dir === 'low' ? 'asc' : 'desc';
  const rows = await call(`/rest/v1/scores?select=player_id,nickname,best&game_id=eq.${encodeURIComponent(gameId)}&best=not.is.null&order=best.${order}&limit=${TOP_N}`);
  return (Array.isArray(rows) ? rows : []).filter((r) => typeof r.nickname === 'string' && Number.isFinite(r.best));
}
