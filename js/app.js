import { GAMES, byId } from '../games/index.js';
import * as store from './store.js';

const $ = (id) => document.getElementById(id);
const dirOf = (id) => byId(id)?.better ?? 'high';
const XP_PER_PLAY = 10;
const XP_CURVE = 40;
const TOAST_MS = 2200;
const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=Indie%20Arcade%20save';
const AVATAR_ORIGIN = 'https://avatars.githubusercontent.com/';

let save = store.load();
let unmount = null;
let syncChain = Promise.resolve();
let toastTimer = 0;
let filter = '전체';

const fmt = (g, v) => (v == null ? '—' : `${v}${g.unit}`);

function levelOf(s) {
  const xp = Object.values(s.games).reduce((n, g) => n + g.plays * XP_PER_PLAY, 0);
  const lv = Math.floor(Math.sqrt(xp / XP_CURVE)) + 1;
  const floor = XP_CURVE * (lv - 1) ** 2, ceil = XP_CURVE * lv ** 2;
  return { xp, lv, progress: (xp - floor) / (ceil - floor), toNext: ceil - xp };
}

function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), TOAST_MS);
}

function setStatus(msg, isError = false) {
  $('syncStatus').textContent = msg;
  $('syncStatus').classList.toggle('error', isError);
}

function renderChip() {
  $('lvBadge').textContent = `Lv ${levelOf(save).lv}`;
  $('nickLabel').textContent = save.nickname;
  const on = Boolean(store.getToken());
  $('cloudDot').classList.toggle('on', on);
  $('cloudDot').title = on ? '클라우드 저장 켜짐' : '클라우드 저장 꺼짐';
}

function statBox(label, value) {
  const b = h('div', 'stat');
  b.append(h('strong', null, String(value)), h('span', null, label));
  return b;
}

function renderHome() {
  const feat = GAMES.find((g) => g.original);
  const hero = h('a', 'hero');
  hero.href = `#/play/${feat.id}`;
  hero.style.setProperty('--accent', feat.accent);
  hero.append(
    h('span', 'badge', 'NEW · 오리지널'),
    h('div', 'hero-glyph', feat.glyph),
    h('h1', null, feat.title),
    h('p', 'hero-tag', feat.tagline),
    h('p', 'hero-blurb', feat.blurb),
    h('span', 'btn primary', '지금 플레이 →'),
  );

  const { lv, xp, progress, toNext } = levelOf(save);
  const plays = Object.values(save.games).reduce((n, g) => n + g.plays, 0);
  const bar = h('div', 'xp-bar');
  const fill = h('span');
  fill.style.transform = `scaleX(${progress})`;
  bar.append(fill);
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', '레벨 진행도');
  bar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  const nums = h('div', 'stat-nums');
  nums.append(statBox('레벨', lv), statBox('총 플레이', plays), statBox('XP', xp));
  const cloud = h('button', 'btn ghost', store.getToken() ? '☁ 클라우드 저장 켜짐' : '☁ 클라우드 저장 연결하기');
  cloud.type = 'button';
  cloud.addEventListener('click', openProfile);
  const stats = h('section', 'stats');
  stats.append(h('p', 'eyebrow', 'PLAYER'), h('h2', null, save.nickname), nums, bar,
    h('p', 'muted small', `다음 레벨까지 ${toNext} XP · 한 판에 ${XP_PER_PLAY} XP`), cloud);

  const grid = h('section', 'grid');
  GAMES.filter((g) => filter === '전체' || g.category === filter).forEach((g, i) => {
    const rec = save.games[g.id] || {};
    const card = h('a', 'card');
    card.href = `#/play/${g.id}`;
    card.style.setProperty('--accent', g.accent);
    card.style.setProperty('--i', Math.min(i, 12));
    const meta = h('div', 'card-meta');
    meta.append(h('span', null, `최고 ${fmt(g, rec.best)}`), h('span', null, `${rec.plays || 0}판`));
    card.append(h('span', 'card-cat', g.original ? '오리지널' : g.category), h('div', 'card-glyph', g.glyph),
      h('h3', null, g.title), h('p', 'muted', g.tagline), meta);
    grid.append(card);
  });

  const top = h('div', 'bento');
  top.append(hero, stats);
  $('home').replaceChildren(top, toolbar(), grid);
}

function toolbar() {
  const chips = h('div', 'chips');
  ['전체', ...new Set(GAMES.map((g) => g.category))].forEach((cat) => {
    const count = cat === '전체' ? GAMES.length : GAMES.filter((g) => g.category === cat).length;
    const b = h('button', `chip-btn${cat === filter ? ' on' : ''}`, `${cat} ${count}`);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(cat === filter));
    b.addEventListener('click', () => { filter = cat; renderHome(); });
    chips.append(b);
  });
  const dice = h('button', 'btn ghost', '🎲 아무거나 하기');
  dice.type = 'button';
  dice.addEventListener('click', () => { location.hash = `#/play/${GAMES[Math.floor(Math.random() * GAMES.length)].id}`; });
  const bar = h('div', 'toolbar');
  bar.append(h('h2', 'section-title', `게임 ${GAMES.length}종`), chips, dice);
  return bar;
}

function showPlay(g) {
  unmount?.();
  $('home').hidden = true;
  $('play').hidden = false;
  $('playTitle').textContent = g.title;
  $('howto').textContent = g.howto;
  $('hud').textContent = '';
  const stage = $('stage');
  stage.replaceChildren();
  stage.style.setProperty('--accent', g.accent);
  const showBest = () => { $('best').textContent = `최고 ${fmt(g, save.games[g.id]?.best)}`; };
  showBest();
  unmount = g.mount(stage, {
    hud: (text) => { $('hud').textContent = text; },
    end: (score) => {
      const res = store.recordPlay(save, g.id, score, g.better);
      save = store.persist(res.save);
      if (res.isBest) toast(`신기록! ${fmt(g, score)}`);
      showBest();
      renderChip();
      autoSync();
    },
  });
}

function route() {
  const m = location.hash.match(/^#\/play\/([\w-]+)/);
  const g = m && byId(m[1]);
  if (g) showPlay(g);
  else {
    unmount?.();
    unmount = null;
    $('play').hidden = true;
    $('home').hidden = false;
    renderHome();
  }
  window.scrollTo(0, 0);
}

// Serialized so two game-ends never race on the same gist.
function autoSync() {
  const token = store.getToken();
  if (!token) return syncChain;
  syncChain = syncChain.then(async () => {
    $('cloudDot').classList.add('busy');
    try {
      const merged = await store.sync(save, token, dirOf);
      // Merge again: a game may have ended while the request was in flight.
      save = store.persist(store.merge(save, merged, dirOf));
      setStatus(`동기화 완료 · ${new Date().toLocaleTimeString('ko-KR')}`);
      renderChip();
      if (!$('home').hidden) renderHome();
    } catch (e) {
      setStatus(e.message, true);
      toast('클라우드 동기화 실패 — 기록은 이 브라우저에 저장됨');
    } finally {
      $('cloudDot').classList.remove('busy');
    }
  });
  return syncChain;
}

function renderSync() {
  const on = Boolean(store.getToken());
  const user = store.getUser();
  $('syncOff').hidden = on;
  $('syncOn').hidden = !on;
  if (on && user) {
    $('ghLogin').textContent = `@${user.login}`;
    if (typeof user.avatar === 'string' && user.avatar.startsWith(AVATAR_ORIGIN)) $('ghAvatar').src = user.avatar;
  }
}

function openProfile() {
  $('nickInput').value = save.nickname;
  renderSync();
  setStatus('');
  $('profile').showModal();
}

function bindProfile() {
  $('tokenLink').href = TOKEN_URL;
  $('profileBtn').addEventListener('click', openProfile);

  $('nickInput').addEventListener('change', () => {
    const nick = $('nickInput').value.trim().slice(0, 16);
    if (!nick) return;
    save = store.persist(store.withNickname(save, nick));
    renderChip();
    if (!$('home').hidden) renderHome();
    autoSync();
  });

  $('connectBtn').addEventListener('click', async () => {
    const token = $('tokenInput').value.trim();
    if (!/^[A-Za-z0-9_]{20,255}$/.test(token)) return setStatus('토큰 형식이 올바르지 않아요.', true);
    $('connectBtn').disabled = true;
    setStatus('연결 중…');
    try {
      const user = await store.connect(token);
      $('tokenInput').value = '';
      renderSync();
      renderChip();
      setStatus(`@${user.login} 연결됨. 동기화 중…`);
      await autoSync();
    } catch (e) {
      setStatus(e.message, true);
    } finally {
      $('connectBtn').disabled = false;
    }
  });

  $('syncBtn').addEventListener('click', () => { setStatus('동기화 중…'); autoSync(); });

  $('disconnectBtn').addEventListener('click', () => {
    store.disconnect();
    renderSync();
    renderChip();
    if (!$('home').hidden) renderHome();
    setStatus('연결 해제됨. 기록은 이 브라우저에 남아 있어요.');
  });
}

bindProfile();
window.addEventListener('hashchange', route);
renderChip();
route();
autoSync(); // pull records from other devices
