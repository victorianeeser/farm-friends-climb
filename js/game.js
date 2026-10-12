// Simulation: player physics, platform/obstacle updates, collisions, camera and score.
// States: 'ready' (resting on the grass) → 'playing' → 'over'.
import {
  VIEW_W, VIEW_H, PHYSICS, PLATFORM, OBSTACLE, CAMERA_ANCHOR, SCORE_PER_PX, GROUND, PARTICLES, TEMPO,
} from './config.js';
import { skyPosition } from './sky.js';
import { makeCharacter } from './characters.js';
import {
  difficulty, platformGap, pickPlatformType, makePlatform, obstacleChance, makeObstacle,
  earlyButterflyChance, makeFlyer,
} from './level.js';

const overlapX = (ax, aw, bx, bw) => ax < bx + bw && ax + aw > bx;
// The player wraps around the screen edges, so test its copies one screen-width either side too.
const overlapXWrapped = (ax, aw, bx, bw) =>
  overlapX(ax, aw, bx, bw) || overlapX(ax - VIEW_W, aw, bx, bw) || overlapX(ax + VIEW_W, aw, bx, bw);
const wrap = (x) => ((x % VIEW_W) + VIEW_W) % VIEW_W;

// Advance puff particles by dt; returns the ones still alive.
export function stepParticles(particles, dt) {
  const k = Math.max(0, 1 - PARTICLES.drag * dt);
  for (const pt of particles) {
    pt.age += dt;
    pt.vx *= k;
    pt.vy *= k;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
  }
  return particles.filter((pt) => pt.age < pt.life);
}

// Auto-bounce tempo for a sky position: TEMPO.start at sunset, easing up to 1 at TEMPO.fullAt, then holding.
export function bounceTempo(skyPos) {
  const t = Math.min(1, Math.max(0, skyPos / TEMPO.fullAt));
  return TEMPO.start + (1 - TEMPO.start) * t;
}

export class Game {
  // character: physics + body (sprite size and hitboxes). Defaults to the baseline square.
  constructor(character = makeCharacter(null)) {
    this.character = character;
    this.phys = character.physics;
    this.body = character.body;
    this.reset();
  }

  reset() {
    this.state = 'ready';
    this.time = 0;
    this.deathCause = null;
    this.platforms = [];
    this.obstacles = [];
    this.particles = [];

    // Full-width grass the run starts on. It behaves like a platform, and the renderer draws the farm scene there.
    const groundY = VIEW_H - GROUND.height;
    this.groundY = groundY;
    this.platforms.push(makePlatform('ground', groundY, 0, 0, VIEW_W));

    this.player = {
      x: (VIEW_W - this.body.w) / 2,
      y: groundY - this.body.h,
      vx: 0,
      vy: 0, // resting until start() gives the first bounce
      facing: 1,
      dead: false,
      // Tempo of the current jump arc, locked in at each bounce. Launch speed scales by it and gravity by
      // its square, so the arc keeps its exact height and just plays slower or faster.
      tempo: TEMPO.start,
    };
    this.startY = this.player.y;
    this.camY = 0;
    this.maxHeight = 0;

    // First cloud sits right above the start, so the opening bounce lands on it without steering.
    // Uses baseline physics so the level layout is the same whoever is playing.
    const firstY = groundY - (PHYSICS.bounceVel ** 2 / (2 * PHYSICS.gravity)) * GROUND.firstGapFraction;
    const firstX = (VIEW_W - PLATFORM.w) / 2 + (Math.random() * 2 - 1) * GROUND.firstCloudJitter;
    this.platforms.push(makePlatform('normal', firstY, 0, firstX));

    this.nextPlatY = firstY;
    this.lastType = 'normal';
    this.lastObstacleY = groundY;
    this.fill();
  }

  get score() {
    return Math.floor(this.maxHeight * SCORE_PER_PX);
  }

  start() {
    if (this.state !== 'ready') return;
    this.state = 'playing';
    this.player.tempo = this.tempo();
    this.player.vy = -this.phys.bounceVel * this.player.tempo;
  }

  // Tempo for the sky the camera is currently showing, so the rhythm and the sunset change together.
  tempo() {
    return bounceTempo(skyPosition(-this.camY));
  }

  // Spring launch: a quick ring of soft puffs from the cloud top, mostly sideways.
  puff(x, y) {
    const { count, speedMin, speedMax, lifeMin, lifeMax } = PARTICLES;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed * 0.45 - 12, // flattened, drifting slightly up
        age: 0,
        life: lifeMin + Math.random() * (lifeMax - lifeMin),
        size: Math.random() < 0.4 ? 3 : 2,
      });
    }
  }

  // Keep the world populated half a screen above the camera.
  fill() {
    const limit = this.camY - VIEW_H * 0.5;
    while (this.nextPlatY > limit) {
      const height = this.startY - this.nextPlatY;
      const d = difficulty(height);
      const gap = platformGap(d);
      const y = this.nextPlatY - gap;
      const type = pickPlatformType(d, this.lastType);
      this.platforms.push(makePlatform(type, y, d));

      if (this.lastObstacleY - y > OBSTACLE.minSpacing) {
        const early = earlyButterflyChance(height);
        const r = Math.random();
        if (r < early + obstacleChance(height)) {
          const centerY = y + gap / 2;
          this.obstacles.push(r < early ? makeFlyer('butterfly', centerY, d) : makeObstacle(centerY, d, height));
          this.lastObstacleY = y;
        }
      }
      this.nextPlatY = y;
      this.lastType = type;
    }
  }

  update(dt, input) {
    this.time += dt;
    if (this.state === 'over') return;
    const p = this.player;
    const phys = this.phys;
    const body = this.body;

    // Steering: a tap gives an instant nudge (reversing cancels momentum), holding keeps accelerating.
    const canSteer = this.state === 'playing' && !p.dead;
    const impulse = input.takeImpulse();
    if (canSteer && impulse) {
      if (Math.sign(p.vx) !== impulse) p.vx = 0;
      p.vx += impulse * phys.tapImpulse;
      p.facing = impulse;
    }
    const steer = canSteer ? input.steer : 0;
    if (steer) {
      p.vx += steer * phys.steerAccel * dt;
      p.facing = steer;
    } else {
      p.vx -= p.vx * Math.min(1, phys.drag * dt);
    }
    p.vx = Math.max(-phys.maxVx, Math.min(phys.maxVx, p.vx));

    const prevBottom = p.y + body.h;
    if (this.state !== 'ready') {
      p.vy += phys.gravity * p.tempo * p.tempo * dt;
      p.x = wrap(p.x + p.vx * dt);
      p.y += p.vy * dt;
    }

    for (const plat of this.platforms) {
      if (plat.type === 'moving') {
        plat.x += plat.vx * dt;
        if (plat.x < 0) { plat.x = 0; plat.vx = Math.abs(plat.vx); }
        if (plat.x > VIEW_W - plat.w) { plat.x = VIEW_W - plat.w; plat.vx = -Math.abs(plat.vx); }
      }
      if (plat.broken) plat.breakT += dt;
    }

    // Landing: only while falling, and only if the feet crossed the platform top this step.
    if (!p.dead && p.vy > 0) {
      const bottom = p.y + body.h;
      const fx = p.x + body.feet.x;
      const fw = body.feet.w;
      let hit = null;
      for (const plat of this.platforms) {
        if (plat.broken) continue;
        if (prevBottom <= plat.y && bottom >= plat.y && overlapXWrapped(fx, fw, plat.x, plat.w)) {
          if (!hit || plat.y < hit.y) hit = plat;
        }
      }
      if (hit) {
        p.y = hit.y - body.h;
        p.tempo = this.tempo();
        p.vy = (hit.type === 'spring' ? -phys.springVel : -phys.bounceVel) * p.tempo;
        if (hit.type === 'breakable') hit.broken = true;
        if (hit.type === 'spring') this.puff(p.x + body.feet.x + body.feet.w / 2, hit.y);
      }
    }

    for (const o of this.obstacles) {
      o.t += dt;
      switch (o.kind) {
        case 'crow':
          o.x = wrap(o.x + o.vx * dt);
          o.y = o.baseY + Math.sin(o.t * 4) * 3;
          break;
        case 'owl':
          // Same path as the crow, with slower, heavier wingbeats.
          o.x = wrap(o.x + o.vx * dt);
          o.y = o.baseY + Math.sin(o.t * 2.5) * 3;
          break;
        case 'butterfly': {
          // Fluttery: surges and stalls sideways while bobbing on two overlapping waves.
          const surge = 0.4 + 0.9 * Math.abs(Math.sin(o.t * 2.6));
          o.x = wrap(o.x + o.vx * surge * dt);
          o.y = o.baseY + Math.sin(o.t * 3.1) * 6 + Math.sin(o.t * 8.3) * 2;
          break;
        }
        default: // gust
          o.x = o.cx - o.w / 2 + Math.sin(o.t * o.freq * Math.PI * 2) * o.amp;
      }
    }

    this.particles = stepParticles(this.particles, dt);

    if (this.state === 'playing' && !p.dead) {
      const hb = body.hit;
      for (const o of this.obstacles) {
        const oi = o.inset;
        const top = p.y + hb.y;
        const vertical = top < o.y + o.h - oi && top + hb.h > o.y + oi;
        // Wrapped test also covers crows straddling the screen edge.
        const horizontal = overlapXWrapped(p.x + hb.x, hb.w, o.x + oi, o.w - oi * 2);
        if (vertical && horizontal) {
          p.dead = true;
          p.vx = 0;
          p.vy = Math.max(p.vy, 60);
          this.deathCause = o.kind;
          break;
        }
      }
    }

    // Camera only ever moves up.
    if (!p.dead) {
      const target = p.y - VIEW_H * CAMERA_ANCHOR;
      if (target < this.camY) this.camY = target;
      this.maxHeight = Math.max(this.maxHeight, this.startY - p.y);
    }

    if (this.state === 'playing' && p.y > this.camY + VIEW_H) {
      this.state = 'over';
      this.deathCause = this.deathCause || 'fall';
    }

    const bottomEdge = this.camY + VIEW_H + 40;
    this.platforms = this.platforms.filter(
      (pl) => pl.y < bottomEdge && !(pl.broken && pl.breakT > PLATFORM.breakTime),
    );
    this.obstacles = this.obstacles.filter((o) => o.y < bottomEdge);
    this.fill();
  }
}
