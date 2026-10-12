// All gameplay tuning lives here. Units are virtual (art) pixels and seconds.
// World y grows downward like the screen, so climbing means y decreasing.

// The game is always 201 art pixels wide. Its height follows the screen's shape (set by main.js via
// setViewHeight) so the canvas fills the whole viewport. On iPhone 16 Pro that's 2 CSS px = 6 physical px
// per art pixel; 437 is its full-screen height. Shapes outside MIN–MAX letterbox instead.
export const VIEW_W = 201;
export let VIEW_H = 437;
export const VIEW_H_MIN = 280;
export const VIEW_H_MAX = 480;
export function setViewHeight(h) {
  VIEW_H = h;
}

export const FIXED_DT = 1 / 120;
export const MAX_FRAME_DT = 0.1; // clamp after tab switches / hitches

// Placeholder-square size, and the size character art is scaled to so proportions stay the same.
export const PLAYER = {
  w: 14,
  h: 14,
  footInset: 2, // placeholder: landing hitbox is slightly narrower than the body
  hitInset: 3,  // placeholder: obstacle hitbox shrink, so grazes feel fair
  spriteHeight: 24,   // characters are at most this tall (the smallest size where every animal's eye survives)...
  spriteMaxWidth: 31, // ...and at most this wide
};

// Physics shared by every character.

export const PHYSICS = {
  gravity: 520,
  bounceVel: 340,  // apex ≈ 111 px above the platform
  springVel: 580,  // apex ≈ 323 px
  steerAccel: 900, // while a side is held
  tapImpulse: 60,  // instant nudge on each tap
  maxVx: 140,
  drag: 5,         // horizontal slow-down per second when not steering
};

export const PLATFORM = {
  w: 34,
  h: 6,
  moveSpeedMin: 30,
  moveSpeedMax: 60,
  breakTime: 0.3, // fade-out after a breakable is used
};

export const OBSTACLE = {
  minHeight: 800,    // world px climbed before any obstacle can appear
  minSpacing: 260,   // vertical px between obstacles
  chanceMin: 0.05,   // per platform spawned, at minHeight
  chanceMax: 0.16,   // per platform spawned, at full difficulty
  hitInset: 2,
  gustShare: 0.4,      // share of obstacles that are wind gusts (any time of day)
  butterflyShare: 0.5,  // share of daytime flyers that are butterflies (the rest are crows)
  // Extra butterflies early in the climb, on top of the normal mix: this chance per cloud applies
  // from butterflyEarlyFrom, fading to nothing by butterflyEarlyUntil (world px; 10 px = 1 point).
  butterflyEarlyFrom: 250,
  butterflyEarlyUntil: 3000,
  butterflyEarlyChance: 0.12,
  // Time-of-day swap, in sky positions (0-based colour stop index): crows + butterflies by day,
  // owls by night. Between these, the chance a flyer is an owl ramps smoothly 0 → 1.
  owlsFrom: 5.5,     // halfway between #3D4787 and #1D2559
  owlsFull: 6.5,     // halfway between #1D2559 and #091040
};

// Bounce tempo: the auto-bounce plays in slow motion early in the climb and speeds up with the sky,
// reaching normal speed (1) at full night and holding there. It slows time for the jump arc only, so
// bounce and spring heights never change, and steering is unaffected.
export const TEMPO = {
  start: 0.75,  // speed at the start of a run (0.75 = each bounce takes a third longer)
  fullAt: 7,    // sky position (0-based colour stop) where it reaches 1: #091040, full night
};

// Spring-launch puff: a few soft particles that scatter and fade.
export const PARTICLES = {
  count: 10,
  speedMin: 35,
  speedMax: 75,
  lifeMin: 0.3,
  lifeMax: 0.5,
  drag: 4, // per second
};

export const DIFFICULTY_HEIGHT = 8000; // world px at which difficulty maxes out

export const GROUND = {
  height: 19,              // grass line (where the player stands) to the bottom of the farm art / screen: just in front of the fence
  artHeight: 85,           // farm art height in game pixels (201 wide × its aspect); used until the image loads
  firstGapFraction: 0.55,  // first cloud sits at 55% of the bounce apex above the grass (≈61 px, inside the normal 24–91 gap range)
  firstCloudJitter: 6,     // ± px sideways from dead center, but always under the player's feet
};

export const CAMERA_ANCHOR = 0.42; // camera keeps the climbing player at this fraction of screen height

export const SCORE_PER_PX = 0.1; // 10 world px = 1 point

// Sky fades sunset → night through these stops, one every SKY_STEP points of climb,
// blending smoothly between neighbours and holding on the last (full night at 7 × 80 = 560 points).
export const SKY_COLORS = [
  '#FDE9AA', '#FFC98A', '#F3AFA0', '#CAA6B7', '#7683DC', '#3D4787', '#1D2559', '#091040',
];
export const SKY_STEP = 80;

export const STARS = {
  fadeFrom: 4,     // sky position (0-based stop index) where stars start to appear: #7683DC
  fullAt: 6,       // fully visible by #1D2559
  parallax: 0.3,   // stars scroll at 30% of camera speed, so they feel far away
  cell: 24,        // one potential star per 24×24 px cell
  density: 0.4,    // chance a cell has a star
};
