// Procedural generation: platform spacing, type mix and obstacles, all scaled by difficulty.
import { VIEW_W, PLATFORM, OBSTACLE, DIFFICULTY_HEIGHT, PHYSICS } from './config.js';
import { skyPosition } from './sky.js';

const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);

export function difficulty(height) {
  return Math.min(1, Math.max(0, height / DIFFICULTY_HEIGHT));
}

// Max gap stays well under the normal bounce apex so every platform is reachable.
const APEX = (PHYSICS.bounceVel * PHYSICS.bounceVel) / (2 * PHYSICS.gravity);

export function platformGap(d) {
  return rand(lerp(24, 40, d), lerp(48, APEX * 0.82, d));
}

export function pickPlatformType(d, prevType) {
  const spring = 0.05;
  const moving = lerp(0, 0.3, d);
  // Never two breakables in a row, so there is always a solid option nearby.
  const breakable = prevType === 'breakable' ? 0 : lerp(0.03, 0.2, d);
  const r = Math.random();
  if (r < spring) return 'spring';
  if (r < spring + moving) return 'moving';
  if (r < spring + moving + breakable) return 'breakable';
  return 'normal';
}

export function makePlatform(type, y, d, x = rand(2, VIEW_W - PLATFORM.w - 2), w = PLATFORM.w) {
  const speed = lerp(PLATFORM.moveSpeedMin, PLATFORM.moveSpeedMax, d);
  return {
    type, x, y, w, h: PLATFORM.h,
    vx: type === 'moving' ? (Math.random() < 0.5 ? -speed : speed) : 0,
    broken: false,
    breakT: 0,
  };
}

export function obstacleChance(height) {
  if (height < OBSTACLE.minHeight) return 0;
  return lerp(OBSTACLE.chanceMin, OBSTACLE.chanceMax, difficulty(height));
}

// Extra per-cloud chance of a butterfly early in the climb, strongest at the start and fading out.
export function earlyButterflyChance(height) {
  const { butterflyEarlyFrom: from, butterflyEarlyUntil: until, butterflyEarlyChance: chance } = OBSTACLE;
  if (height < from || height >= until) return 0;
  return chance * (1 - (height - from) / (until - from));
}

// Chance (0–1) that a flying obstacle at this climb height is an owl rather than a daytime flyer.
export function owlChance(height) {
  const t = (skyPosition(height) - OBSTACLE.owlsFrom) / (OBSTACLE.owlsFull - OBSTACLE.owlsFrom);
  return Math.min(1, Math.max(0, t));
}

// Flying obstacles: hitbox size and inset (how far the obstacle's own hitbox is shrunk).
const FLYERS = {
  crow: { w: 16, h: 10, inset: 2, speed: [35, 70] },
  owl: { w: 16, h: 10, inset: 2, speed: [35, 70] },
  butterfly: { w: 9, h: 7, inset: 1, speed: [25, 45] },
};

export function makeFlyer(kind, centerY, d) {
  const f = FLYERS[kind];
  const dir = Math.random() < 0.5 ? -1 : 1;
  return {
    kind, w: f.w, h: f.h, inset: f.inset,
    x: rand(0, VIEW_W), y: centerY - f.h / 2, baseY: centerY - f.h / 2,
    vx: dir * lerp(f.speed[0], f.speed[1], d),
    t: rand(0, 10),
  };
}

// centerY is the vertical middle of the gap the obstacle sits in; height is how far up the climb it is.
export function makeObstacle(centerY, d, height) {
  if (Math.random() >= OBSTACLE.gustShare) {
    let kind = 'owl';
    if (Math.random() >= owlChance(height)) {
      kind = Math.random() < OBSTACLE.butterflyShare ? 'butterfly' : 'crow';
    }
    return makeFlyer(kind, centerY, d);
  }
  const w = 36, h = 14;
  const cx = rand(w / 2 + 10, VIEW_W - w / 2 - 10);
  return {
    kind: 'gust', w, h, inset: OBSTACLE.hitInset,
    cx, x: cx - w / 2, y: centerY - h / 2,
    amp: lerp(15, 45, d),
    freq: lerp(0.35, 0.7, d),
    t: rand(0, 10),
  };
}
