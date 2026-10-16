import { GAMES, byId } from '../games/index.js';
import * as store from './store.js';
import * as cloud from './cloud.js';

const $ = (id) => document.getElementById(id);
const XP_PER_PLAY = 10;
const XP_CURVE = 40;
const TOAST_MS = 2200;

let save = store.load();
let unmount = null;
let current = null;
let toastTimer = 0;
let filter = '전체';
let pushChain = Promise.resolve();
let cloudState = cloud.enabled() ? 'busy' : 'off';
let cloudError = '';

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

const CLOUD_TEXT = {
  off: '랭킹 서버가 아직 연결되지 않았어요. 기록은 이 브라우저에만 저장돼요.',
  busy: '랭킹에 저장 중…',
  ok: '기록은 자동으로 전체 랭킹에 저장돼요.',
};
const cloudText = () => (cloudState === 'error' ? `랭킹 저장 실패: ${cloudError} (기록은 이 브라우저에 남아 있어요)` : CLOUD_TEXT[cloudState]);

function renderChip() {
  $('lvBadge').textContent = `Lv ${levelOf(save).lv}`;
  $('nickLabel').textContent = save.nickname;
  const dot = $('cloudDot');
  dot.className = `cloud ${cloudState === 'ok' ? 'on' : cloudState}`;
  dot.title = cloudText();
  $('cloudInfo').textContent = cloudText();
}

function setCloud(state, error = '') {
  cloudState = state;
  cloudError = error;
  renderChip();
}

// Serialized so pushes never overtake each other; each one sends the latest save.
function cloudSync() {
  if (!cloud.enabled()) return pushChain;
  setCloud('busy');
  pushChain = pushChain
    .then(() => cloud.push(save))
    .then(() => setCloud('ok'), (e) => setCloud('error', e.message));
  return pushChain;
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
  const nick = h('button', 'btn ghost', '✎ 닉네임 바꾸기');
  nick.type = 'button';
  nick.addEventListener('click', openProfile);
  const stats = h('section', 'stats');
  stats.append(h('p', 'eyebrow', 'PLAYER'), h('h2', null, save.nickname), nums, bar,
    h('p', 'muted small', `다음 레벨까지 ${toNext} XP · 한 판에 ${XP_PER_PLAY} XP`), nick);

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

async function renderBoard(g) {
  const box = $('board');
  box.hidden = !cloud.enabled();
  if (box.hidden) return;
  $('boardNote').textContent = '불러오는 중…';
  try {
    const rows = await cloud.top(g.id, g.better);
    if (current !== g) return; // player left this game while loading
    const me = cloud.myId();
    $('boardList').replaceChildren(...rows.map((r) => {
      const li = h('li', r.player_id === me ? 'me' : null);
      li.append(h('span', 'name', r.nickname), h('span', 'score', fmt(g, r.best)));
      return li;
    }));
    $('boardNote').textContent = rows.length ? '' : '아직 기록이 없어요. 첫 1등이 되어 보세요!';
  } catch (e) {
    if (current === g) $('boardNote').textContent = e.message;
  }
}

function showPlay(g) {
  unmount?.();
  current = g;
  $('home').hidden = true;
  $('play').hidden = false;
  $('playTitle').textContent = g.title;
  $('howto').textContent = g.howto;
  $('hud').textContent = '';
  $('boardList').replaceChildren();
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
      cloudSync().then(() => renderBoard(g));
    },
  });
  renderBoard(g);
}

function route() {
  const m = location.hash.match(/^#\/play\/([\w-]+)/);
  const g = m && byId(m[1]);
  if (g) showPlay(g);
  else {
    unmount?.();
    unmount = null;
    current = null;
    $('play').hidden = true;
    $('home').hidden = false;
    renderHome();
  }
  window.scrollTo(0, 0);
}

function openProfile() {
  $('nickInput').value = save.nickname;
  renderChip();
  $('profile').showModal();
}

function bindProfile() {
  $('profileBtn').addEventListener('click', openProfile);
  $('profileClose').addEventListener('click', () => $('profile').close());
  $('nickInput').addEventListener('change', () => {
    const nick = $('nickInput').value.trim().slice(0, 16);
    if (!nick || nick === save.nickname) return;
    save = store.persist(store.withNickname(save, nick));
    renderChip();
    if (!$('home').hidden) renderHome();
    cloudSync();
  });
}

bindProfile();
window.addEventListener('hashchange', route);
renderChip();
route();
cloudSync(); // upload records made before the leaderboard existed, and sign in early
