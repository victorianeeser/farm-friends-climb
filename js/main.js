// Boot: full-viewport stage scaling, fixed-timestep loop, and wiring between the game and the HTML overlays.
import { VIEW_W, VIEW_H, VIEW_H_MIN, VIEW_H_MAX, setViewHeight, FIXED_DT, MAX_FRAME_DT } from './config.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { renderSky, renderWorld, drawGroundHD, drawFlyersHD } from './render.js';
import { loadBest, saveBest, loadCharacterId, recordRun } from './storage.js';
import { DEFAULT_CHARACTER, CHARACTERS, makeCharacter } from './characters.js';
import { loadCharacterArt } from './sprites.js';

const $ = (id) => document.getElementById(id);
const viewport = $('viewport');
const stage = $('stage');
const canvas = $('game');
const ctx = canvas.getContext('2d');

// Pixel-art layers are drawn at virtual resolution into these buffers, then scaled up with nearest-neighbor.
// The farm scene is drawn between them, directly at device resolution (see render.js).
const skyBuffer = document.createElement('canvas');
const worldBuffer = document.createElement('canvas');
skyBuffer.width = worldBuffer.width = VIEW_W;
const skyCtx = skyBuffer.getContext('2d');
const worldCtx = worldBuffer.getContext('2d');
let game = null;

// Fill the real viewport. Width is fixed at VIEW_W art pixels; the virtual height follows the screen's
// aspect ratio so there is nothing to letterbox on phones. Only shapes outside VIEW_H_MIN–MAX
// (desktop windows, tablets) letterbox, with the stage kept at the bottom and plain white around it.
// On wide screens the game is never wider than the home screen's scene column (--scene-w in home.css), so the two
// pages line up, with white on either side.
const SCENE_W = 402; // iPhone 16 Pro width

function fitStage() {
  const cw = viewport.clientWidth;
  const ch = viewport.clientHeight;
  if (!cw || !ch) return;
  const dpr = window.devicePixelRatio || 1;
  const aw = cw >= 500 ? Math.min(cw, SCENE_W) : cw; // phones of any width use the full screen

  const ideal = Math.round((VIEW_W * ch) / aw);
  const vh = Math.min(VIEW_H_MAX, Math.max(VIEW_H_MIN, ideal));
  if (vh !== VIEW_H || skyBuffer.height !== vh) {
    setViewHeight(vh);
    skyBuffer.height = worldBuffer.height = vh;
    // Before the run starts, rebuild so the ground sits on the new bottom edge.
    if (game && game.state === 'ready') game.reset();
  }

  let w = aw, h = ch;
  if (ideal !== vh) {
    const scale = Math.min(aw / VIEW_W, ch / vh);
    w = VIEW_W * scale;
    h = vh * scale;
  }
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  stage.style.left = `${(cw - w) / 2}px`;
  stage.style.top = `${ch - h}px`;
  ctx.imageSmoothingEnabled = false;
}
fitStage();
new ResizeObserver(fitStage).observe(viewport);
window.addEventListener('resize', fitStage);
window.visualViewport?.addEventListener('resize', fitStage);

// Whoever was picked on the Character tab (home page), or the sheep if nobody has been picked yet.
const savedId = loadCharacterId(DEFAULT_CHARACTER);
const characterId = CHARACTERS[savedId] ? savedId : DEFAULT_CHARACTER;
const art = await loadCharacterArt(CHARACTERS[characterId]);
game = new Game(makeCharacter(characterId, art ? { body: art.body, art } : {}));
const input = new Input();
let best = loadBest();
let restartReadyAt = 0;

const landscape = window.matchMedia('(orientation: landscape) and (pointer: coarse)');

function show(el, visible) {
  el.classList.toggle('hidden', !visible);
}

// 3-2-1-Go before every run. The player rests on the grass until "Go!", which gives the first bounce.
const COUNTDOWN = ['3', '2', '1', 'Go!'];
const COUNTDOWN_STEP = 0.7; // seconds per number
let countdown = null; // seconds elapsed while counting down, or null when not counting
let countdownShown = '';

function beginCountdown() {
  $('countdown-number').style.color = CHARACTERS[characterId].color || '';
  input.clear();
  countdown = 0;
  countdownShown = '';
  show($('screen-countdown'), true);
}

function tickCountdown(dt) {
  if (countdown === null) return;
  countdown += dt;
  const step = Math.floor(countdown / COUNTDOWN_STEP);
  if (step >= COUNTDOWN.length - 1 && game.state === 'ready') {
    input.clear();
    game.start();
  }
  if (step >= COUNTDOWN.length) {
    countdown = null;
    show($('screen-countdown'), false);
    return;
  }
  if (COUNTDOWN[step] !== countdownShown) {
    countdownShown = COUNTDOWN[step];
    const el = $('countdown-number');
    el.textContent = countdownShown;
    el.classList.toggle('go', step === COUNTDOWN.length - 1);
    // Restart the pop animation for each number.
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }
}

function restart() {
  if (performance.now() < restartReadyAt) return;
  game.reset();
  show($('screen-over'), false);
  show($('btn-pause'), true);
  beginCountdown();
}

function goHome() {
  location.href = 'index.html';
}

// ---------- Pause ----------

let userPaused = false;

function pauseGame() {
  if (userPaused || game.state === 'over') return;
  userPaused = true;
  input.clear();
  showPauseMenu();
  show($('screen-pause'), true);
}

function resumeGame() {
  if (!userPaused) return;
  userPaused = false;
  input.clear(); // taps made on the menu never reach the character
  show($('screen-pause'), false);
}

function showPauseMenu() {
  show($('pause-menu'), true);
  show($('howto'), false);
}

function showHowTo() {
  // The art is whoever is playing, drawn crisp like in the game.
  const sprite = game.character.art?.right;
  const box = $('howto-art');
  box.replaceChildren();
  if (sprite) {
    const c = document.createElement('canvas');
    c.width = sprite.width;
    c.height = sprite.height;
    c.getContext('2d').drawImage(sprite, 0, 0);
    // Largest whole-number scale that fits the 90 × 63 art slot.
    const scale = Math.max(1, Math.floor(Math.min(90 / sprite.width, 63 / sprite.height)));
    c.style.width = `${sprite.width * scale}px`;
    c.style.height = `${sprite.height * scale}px`;
    box.append(c);
  }
  show($('pause-menu'), false);
  show($('howto'), true);
}

$('btn-pause').addEventListener('click', pauseGame);
$('btn-resume').addEventListener('click', resumeGame);
$('btn-howto').addEventListener('click', showHowTo);
$('btn-back').addEventListener('click', showPauseMenu);
$('btn-quit').addEventListener('click', goHome);
input.onPause = () => {
  if (!userPaused) pauseGame();
  else if (!$('howto').classList.contains('hidden')) showPauseMenu();
  else resumeGame();
};
// Leaving the app mid-run pauses it, so the menu is waiting on return instead of a run that carried on.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (game.state === 'playing' || countdown !== null)) pauseGame();
});

const CAUSES = {
  fall: 'You fell off the clouds.',
  crow: 'A crow got you.',
  owl: 'An owl got you.',
  butterfly: 'A bee bumped you off course.',
  gust: 'A gust blew you away.',
};

function showGameOver() {
  const score = game.score;
  recordRun(score, characterId, game.deathCause);
  const isBest = score > best;
  if (isBest) {
    best = score;
    saveBest(best);
  }
  $('over-cause').textContent = CAUSES[game.deathCause] || '';
  $('over-score').textContent = score;
  $('over-best').textContent = best;
  $('screen-over').classList.toggle('is-best', isBest);
  show($('screen-over'), true);
  show($('btn-pause'), false);
  // Brief lockout so a panicked tap doesn't skip the result.
  restartReadyAt = performance.now() + 600;
  const btn = $('btn-restart');
  btn.disabled = true;
  setTimeout(() => { btn.disabled = false; }, 600);
}

input.onConfirm = () => {
  if (game.state === 'over') restart();
};
$('btn-restart').addEventListener('click', restart);
$('btn-home').addEventListener('click', goHome);

let lastScore = -1;
function updateHud() {
  if (game.score !== lastScore) $('hud-score').textContent = lastScore = game.score;
}

let last = performance.now();
let acc = 0;
let prevState = game.state;

function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_FRAME_DT);
  last = now;

  const paused = document.hidden || landscape.matches || userPaused;
  if (!paused) {
    tickCountdown(dt);
    acc += dt;
    while (acc >= FIXED_DT) {
      game.update(FIXED_DT, input);
      acc -= FIXED_DT;
    }
  } else {
    acc = 0;
  }

  if (game.state === 'over' && prevState !== 'over') showGameOver();
  prevState = game.state;

  renderSky(skyCtx, game);
  renderWorld(worldCtx, game);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(skyBuffer, 0, 0, canvas.width, canvas.height);
  drawGroundHD(ctx, game, canvas.width / VIEW_W, canvas.height / VIEW_H);
  ctx.drawImage(worldBuffer, 0, 0, canvas.width, canvas.height);
  drawFlyersHD(ctx, game, canvas.width / VIEW_W, canvas.height / VIEW_H);
  updateHud();

  requestAnimationFrame(frame);
}
beginCountdown();
requestAnimationFrame(frame);
