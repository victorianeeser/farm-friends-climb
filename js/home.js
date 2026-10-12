// Home screen (Figma frames 183:721 and 217:61): character carousel, Tap to Play, and Leaderboard + My Stats side by
// side, over the sunset farm scene with a drifting cloud, a bee and a bird. Tap to Play opens play.html; Leaderboard
// and My Stats are screens on this page (with browser/phone back support). The ⓘ button opens How to Play.
import { CHARACTERS, DEFAULT_CHARACTER } from './characters.js';
import { loadBest, loadCharacterId, loadStats, saveCharacterId } from './storage.js';
import { flyerSprite, FLAP_RATE } from './flyers.js';
import { drawGust } from './gust.js';
import { cloudSprite } from './clouds.js';

const $ = (id) => document.getElementById(id);
const IDS = Object.keys(CHARACTERS);

let selected = CHARACTERS[loadCharacterId(DEFAULT_CHARACTER)] ? loadCharacterId(DEFAULT_CHARACTER) : DEFAULT_CHARACTER;

// ---------- Character carousel ----------

// The same placeholder square the game draws for characters without art.
function placeholderSprite() {
  const c = document.createElement('canvas');
  c.width = 14;
  c.height = 14;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e76f51';
  ctx.fillRect(0, 0, 14, 14);
  ctx.fillStyle = '#1d2b3a';
  ctx.fillRect(7, 4, 2, 2);
  ctx.fillRect(10, 4, 2, 2);
  return c;
}

function renderCharacter(hop = false) {
  const def = CHARACTERS[selected];
  $('name').textContent = def.name;
  $('print').textContent = def.print || '';
  // Each character's print as the card background (the art's white window lines up with the white card).
  $('card').style.backgroundImage = def.pattern ? `url("${def.pattern}")` : '';
  // Name and print take a colour from the character's own print; so does Tap to Play.
  document.querySelector('.card').style.color = def.color || '';
  // Tap to Play (and My Stats' share button) take the selected character's colour.
  $('play').style.backgroundColor = def.color || '';
  $('share-score').style.backgroundColor = def.color || '';
  const art = $('art');
  if (def.sprite) {
    const img = document.createElement('img');
    img.src = def.sprite;
    img.alt = def.name;
    art.replaceChildren(img);
  } else {
    art.replaceChildren(placeholderSprite());
  }
  if (hop) {
    art.classList.remove('hop');
    void art.offsetWidth;
    art.classList.add('hop');
  }
}

function step(delta) {
  selected = IDS[(IDS.indexOf(selected) + delta + IDS.length) % IDS.length];
  saveCharacterId(selected);
  renderCharacter(true);
}

$('prev').addEventListener('click', () => step(-1));
$('next').addEventListener('click', () => step(1));

// Horizontal swipe on the card.
let swipeX = null;
$('card').addEventListener('pointerdown', (e) => { swipeX = e.clientX; });
$('card').addEventListener('pointerup', (e) => {
  if (swipeX === null) return;
  const dx = e.clientX - swipeX;
  swipeX = null;
  if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
});
$('card').addEventListener('pointercancel', () => { swipeX = null; });

// ---------- Play ----------

$('play').addEventListener('click', () => {
  saveCharacterId(selected);
  location.href = 'play.html';
});

// ---------- Screens: Home, Leaderboard, My Stats ----------

const SCREENS = { home: 'screen-home', leaderboard: 'screen-leaderboard', stats: 'screen-stats' };

function show(name) {
  for (const [key, id] of Object.entries(SCREENS)) $(id).hidden = key !== name;
  window.scrollTo(0, 0);
  if (name === 'stats') renderStats();
  if (name === 'leaderboard') renderBoard();
  if (name === 'home') fitToScreen();
}

// Each screen is a history entry, so the phone's back gesture returns to Home.
function open(name) {
  history.pushState({ screen: name }, '', `#${name}`);
  show(name);
}
window.addEventListener('popstate', (e) => show(e.state?.screen || 'home'));
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => history.back()));
$('open-leaderboard').addEventListener('click', () => open('leaderboard'));
$('open-stats').addEventListener('click', () => open('stats'));

// ---------- Leaderboard (sample data until score submission exists) ----------

// 14 sample players; the player joins them with their real best score, making 15 places.
const SAMPLE_PLAYERS = [
  ['MeadowRose', 2847], ['FarmhandKate', 2614], ['CloverfieldJ', 2389], ['HayloftHannah', 2211],
  ['PiggyBankPete', 2058], ['BarnOwlBea', 1902], ['DuckPondDev', 1774], ['RoosterRay', 1645],
  ['MilkmaidMo', 1512], ['FieldMouseFi', 1390], ['BarnDanceBo', 1180], ['SheepishSam', 905],
  ['HenHouseHal', 640], ['CalfCoraline', 420],
];
const PRIZE_PLACES = 10;

// The board with the player placed by their best score (ahead of anyone they tie with).
function leaderboard() {
  const me = { name: 'You', score: loadBest(), me: true };
  const others = SAMPLE_PLAYERS.map(([name, score]) => ({ name, score }));
  return [...others, me].sort((a, b) => b.score - a.score || (a.me ? -1 : b.me ? 1 : 0));
}

// Prize wording from the design for #1–3; #4–10 win a single item; 11+ win nothing.
function prizeFor(rank) {
  if (rank === 1) return 'PR Box & Exclusive Needlepoint Kit';
  if (rank <= 3) return 'PR Box';
  if (rank <= PRIZE_PLACES) return 'Single item';
  return '';
}

function row(entry, i) {
  const rank = i + 1;
  const tier = rank === 1 ? ' first' : rank <= 3 ? '' : rank <= PRIZE_PLACES ? ' rest' : ' none';
  const li = document.createElement('li');
  li.className = `row${tier}${entry.me ? ' me' : ''}`;
  li.innerHTML = `
    <span class="rank"></span>
    <span class="who"><span class="who-name"></span><span class="prize"></span></span>
    <span class="score"><span class="score-value"></span><span class="score-unit">ft</span></span>`;
  li.querySelector('.rank').textContent = rank;
  li.querySelector('.who-name').textContent = entry.name;
  const prize = prizeFor(rank);
  if (prize) li.querySelector('.prize').textContent = prize;
  else li.querySelector('.prize').remove();
  li.querySelector('.score-value').textContent = entry.score.toLocaleString('en-US');
  return li;
}

function renderBoard() {
  $('board').replaceChildren(...leaderboard().map(row));
}

// ---------- My Stats (tracked locally by play.html after every run) ----------

// Ways a run can end, in the game's own art (drawn once, reused).
const ENDINGS = [
  { cause: 'fall', label: 'Fell off the clouds', art: () => cloudSprite('normal', 34) },
  { cause: 'crow', label: 'Bird', art: () => flyerSprite('crow', true, true) },
  { cause: 'butterfly', label: 'Bee', art: () => flyerSprite('butterfly', true, true) },
  { cause: 'owl', label: 'Owl', art: () => flyerSprite('owl', true, true) },
  { cause: 'gust', label: 'Wind gust', art: () => { const c = document.createElement('canvas'); c.width = 38; c.height = 26; drawGust(c.getContext('2d'), 2, 6, 0); return c; } },
];

// A crisp copy of a sprite at the largest whole-number scale that fits the 40 × 28 icon tile.
function icon(sprite) {
  const c = document.createElement('canvas');
  c.width = sprite.width;
  c.height = sprite.height;
  c.getContext('2d').drawImage(sprite, 0, 0);
  const scale = Math.max(1, Math.floor(Math.min(40 / sprite.width, 28 / sprite.height)));
  c.style.width = `${sprite.width * scale}px`;
  c.style.height = `${sprite.height * scale}px`;
  return c;
}

function renderEndings(byCause) {
  const list = $('stat-endings');
  const total = Object.values(byCause).reduce((a, b) => a + b, 0);
  if (!total) {
    list.innerHTML = '<li class="stat-empty">Play a run to see how it ends</li>';
    return;
  }
  const most = Math.max(...ENDINGS.map((e) => byCause[e.cause] || 0));
  const sorted = [...ENDINGS].sort((a, b) => (byCause[b.cause] || 0) - (byCause[a.cause] || 0));
  list.replaceChildren(...sorted.map((e) => {
    const n = byCause[e.cause] || 0;
    const li = document.createElement('li');
    li.className = 'ending';
    li.innerHTML = '<span class="ending-icon"></span><span class="ending-name"></span><span class="ending-count"></span><span class="ending-bar"><span></span></span>';
    li.querySelector('.ending-icon').append(icon(e.art()));
    li.querySelector('.ending-name').textContent = e.label;
    li.querySelector('.ending-count').textContent = n;
    li.querySelector('.ending-bar span').style.width = `${most ? (n / most) * 100 : 0}%`;
    return li;
  }));
}

function renderStats() {
  const stats = loadStats();
  const best = loadBest();
  $('stat-best').textContent = best.toLocaleString('en-US');
  $('stat-runs').textContent = stats.runs.toLocaleString('en-US');
  $('stat-total').textContent = stats.totalFt.toLocaleString('en-US');
  $('stat-avg').textContent = (stats.runs ? Math.round(stats.totalFt / stats.runs) : 0).toLocaleString('en-US');

  // Same rank as the Leaderboard screen (sample players for now).
  if (best > 0) {
    const board = leaderboard();
    const rank = board.findIndex((e) => e.me) + 1;
    $('stat-rank').textContent = `#${rank}`;
    const tenth = board.filter((e) => !e.me)[PRIZE_PLACES - 1].score;
    $('stat-rank-note').textContent = rank <= PRIZE_PLACES
      ? prizeFor(rank)
      : `${(tenth - best + 1).toLocaleString('en-US')} ft to reach the top ${PRIZE_PLACES}`;
  } else {
    $('stat-rank').textContent = '–';
    $('stat-rank-note').textContent = 'Play a run to get ranked';
  }
  renderEndings(stats.byCause || {});

  const [favId] = Object.entries(stats.byCharacter).sort((a, b) => b[1] - a[1])[0] || [];
  const box = $('stat-friend');
  box.replaceChildren();
  const def = CHARACTERS[favId];
  if (!def) {
    box.innerHTML = '<span class="stat-empty">Play a run to find out</span>';
    return;
  }
  const img = document.createElement('img');
  img.src = def.sprite;
  img.alt = '';
  const name = document.createElement('span');
  name.className = 'stat-friend-name';
  name.textContent = def.name;
  name.style.color = def.color || '';
  box.append(img, name);
}

// ---------- How to Play (ⓘ) ----------

function openHowTo() {
  // The selected character, crisp, at the largest whole-number scale that fits the 90 × 63 slot.
  const def = CHARACTERS[selected];
  const box = $('howto-art');
  box.replaceChildren();
  if (def.sprite) {
    const img = new Image();
    img.alt = def.name;
    img.onload = () => {
      const scale = Math.max(1, Math.floor(Math.min(90 / img.naturalWidth, 63 / img.naturalHeight)));
      img.style.width = `${img.naturalWidth * scale}px`;
      img.style.height = `${img.naturalHeight * scale}px`;
    };
    img.src = def.sprite;
    box.append(img);
  }
  $('howto-layer').hidden = false;
  $('howto-close').focus();
}

function closeHowTo() {
  $('howto-layer').hidden = true;
  $('info').focus();
}

$('info').addEventListener('click', openHowTo);
$('howto-close').addEventListener('click', closeHowTo);
// Tapping the blurred area outside the box also closes it.
$('howto-layer').addEventListener('click', (e) => { if (e.target === $('howto-layer')) closeHowTo(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('howto-layer').hidden) closeHowTo();
});

// ---------- Fit to screen ----------

// Fit any screen without scrolling. The spacing already tightens on shorter screens (see .home in home.css). After
// that, the character card shrinks (to fit the height, and the width on narrow phones) while the buttons, arrows
// and header keep their size. Only if the card is already at its smallest does the whole screen scale down.
const home = document.querySelector('.home');
const cardEl = $('card');
const CARD_SIZE = 267;      // the card's design size (.pattern in home.css)
const CARD_MIN_SCALE = 0.6; // never smaller than ~160px
const ARROWS_W = 2 * (44 - 18); // the two arrow buttons' share of the carousel row (.step: 44px wide, -9px margins)
function fitToScreen() {
  home.style.zoom = '';
  cardEl.style.zoom = '';
  const available = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const picker = document.querySelector('.picker');
  const byWidth = (picker.clientWidth - ARROWS_W) / CARD_SIZE;
  const over = home.scrollHeight - available;
  const byHeight = over > 0 ? (CARD_SIZE - over - 1) / CARD_SIZE : 1;
  const scale = Math.min(1, byWidth, byHeight);
  if (scale < 1) cardEl.style.zoom = String(Math.max(CARD_MIN_SCALE, Math.floor(scale * 1000) / 1000));

  const needed = home.scrollHeight;
  // The bottom padding keeps the farm art clear. The art itself isn't zoomed, so that space must stay full size.
  const reserve = parseFloat(getComputedStyle(home).paddingBottom) || 0;
  // Round down with a pixel of headroom so rounding never leaves a 1px scroll.
  if (needed > available) {
    const z = (available - reserve - 1) / (needed - reserve);
    home.style.zoom = String(Math.max(0.6, Math.floor(z * 1000) / 1000));
  }
  placeBird();
}
window.addEventListener('resize', fitToScreen);
window.visualViewport?.addEventListener('resize', fitToScreen);
document.fonts?.ready.then(fitToScreen);
window.addEventListener('load', fitToScreen);

// Width of the home background scene: the whole screen on a phone, a phone-width column on wider screens.
const sceneWidth = () => document.querySelector('.home-bg').clientWidth || window.innerWidth;

// ---------- Clouds drifting behind the home screen ----------

// One of the game's normal clouds at its 2× scale, low behind the barn: farm is a share of the farm art's width up
// from the bottom, so it always sits just above the mountains. x is where it starts across the width; speed is
// css px/s (negative drifts left). It wraps around the edges. Still for reduced motion.
const HOME_CLOUDS = [
  { w: 44, farm: 0.29, x: 0.5, speed: -6 },
];

function startClouds() {
  const layer = $('home-clouds');
  if (!layer) return;
  const clouds = HOME_CLOUDS.map((c) => {
    const sprite = cloudSprite('normal', c.w);
    const el = document.createElement('canvas');
    el.className = 'home-cloud';
    el.width = sprite.width;
    el.height = sprite.height;
    el.getContext('2d').drawImage(sprite, 0, 0);
    el.style.width = `${sprite.width * 2}px`;
    el.style.height = `${sprite.height * 2}px`;
    if (c.farm !== undefined) el.style.bottom = `calc(var(--farm-w) * ${c.farm})`;
    else el.style.top = `${c.top * 100}%`;
    layer.append(el);
    return { ...c, el, w: sprite.width * 2, pos: c.x * sceneWidth() };
  });
  const place = () => clouds.forEach((c) => { c.el.style.transform = `translateX(${c.pos.toFixed(1)}px)`; });
  place();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let last = null;
  function frame(now) {
    const dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!home.hidden) {
      for (const c of clouds) {
        c.pos += c.speed * dt;
        // Wrap once fully off-screen.
        if (c.pos > sceneWidth()) c.pos = -c.w;
        else if (c.pos < -c.w) c.pos = sceneWidth();
      }
      place();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// The bird's flight line: midway down the open sky between "CLIMB" and the character card, wherever the layout
// puts them on this screen.
function placeBird() {
  const bird = $('home-bird');
  if (!bird || home.hidden) return;
  const climb = document.querySelector('.brand .eyebrow').getBoundingClientRect();
  const card = $('card').getBoundingClientRect();
  const climbText = climb.bottom - parseFloat(getComputedStyle(document.querySelector('.brand .eyebrow')).paddingBottom) * (parseFloat(home.style.zoom) || 1);
  bird.style.top = `${Math.round((climbText + card.top) / 2 - bird.offsetHeight / 2)}px`;
}

// ---------- Bee and bird flying across ----------

// The game's flyers crossing the screen now and then: each crosses, rests off-screen for a moment, then comes back
// the other way, facing where it's going. Off for reduced motion.
//   bee: its fluttery game path (surging and stalling sideways, bobbing on two waves), low by the barn.
//   bird: the crow's steady glide with a gentle bob, high in the sky, smaller than in the game so it reads as far off.
const HOME_FLYERS = [
  {
    id: 'home-bee', kind: 'butterfly', speed: 70, firstWait: 0.8,
    surge: (t) => 0.4 + 0.9 * Math.abs(Math.sin(t * 2.6)),
    bob: (t) => Math.sin(t * 3.1) * 12 + Math.sin(t * 8.3) * 4,
  },
  {
    id: 'home-bird', kind: 'crow', speed: 48, firstWait: 2.5,
    surge: () => 1,
    bob: (t) => Math.sin(t * 2.2) * 5,
  },
];

function startFlyer({ id, kind, speed, firstWait, surge, bob }) {
  const canvas = $(id);
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  let dir = 1;
  let x = -60;
  let wait = firstWait;
  let t = 0;
  let last = null;
  let drawn = '';

  function frame(now) {
    const dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!home.hidden) {
      if (wait > 0) {
        wait -= dt;
      } else {
        t += dt;
        x += dir * speed * surge(t) * dt;
        canvas.style.transform = `translate(${x.toFixed(1)}px, ${bob(t).toFixed(1)}px)`;
        canvas.style.visibility = 'visible';
        const wingsUp = Math.sin(t * FLAP_RATE[kind]) > 0;
        const key = `${wingsUp}${dir}`;
        if (key !== drawn) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(flyerSprite(kind, wingsUp, dir > 0), 0, 0);
          drawn = key;
        }
        if ((dir > 0 && x > sceneWidth() + 10) || (dir < 0 && x < -60)) {
          canvas.style.visibility = 'hidden';
          dir = -dir;
          wait = 1 + Math.random() * 2.5;
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---------- Boot ----------

// Preload every print so switching characters never flashes an empty card.
for (const def of Object.values(CHARACTERS)) if (def.pattern) new Image().src = def.pattern;
renderCharacter();
const initial = location.hash.slice(1);
history.replaceState({ screen: SCREENS[initial] ? initial : 'home' }, '', location.pathname + location.search + (SCREENS[initial] && initial !== 'home' ? `#${initial}` : ''));
show(SCREENS[initial] ? initial : 'home');
startClouds();
HOME_FLYERS.forEach(startFlyer);
