// Rendering, in three layers composited by main.js:
//   1. renderSky   – sky colour and stars, at virtual (pixel-art) resolution
//   2. drawGroundHD – the farm scene, drawn straight onto the device-resolution canvas from the full-size
//                     illustration with high-quality smoothing, since it's detailed art rather than pixel art
//   3. renderWorld – clouds, wind gusts, particles and the player, at virtual resolution on a transparent layer
//   4. drawFlyersHD – crows, owls and bees, drawn on the device-resolution canvas from their finer (2x) pixel art
// Layers 1 and 3 are scaled up with nearest-neighbour so the pixel art stays crisp.
import { VIEW_W, VIEW_H, PLATFORM, GROUND } from './config.js';
import { cloudSprite, CLOUD_OFFSET } from './clouds.js';
import { skyPosition, skyColor, drawStars, nightAmount } from './sky.js';
import { flyerSprite, flyerSize, hasNightPalette, FLAP_RATE, ART_SCALE } from './flyers.js';
import { drawGust } from './gust.js';

const COLORS = {
  springCap: '#e76f51',
  springCoil: '#c98a2e',
  player: '#e76f51',
  eye: '#1d2b3a',
  grassFallback: '#3f9a35',
  puff: '#ffffff',
  puffWarm: '#fff1dc',
};

export function renderSky(ctx, game) {
  // The camera starts at 0 and only moves up, so -camY is how far the view has climbed.
  const sky = skyPosition(-game.camY);
  ctx.fillStyle = skyColor(sky);
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawStars(ctx, sky, game.camY, game.time);
}

export function renderWorld(ctx, game) {
  const cam = game.camY;
  const sy = (y) => Math.round(y - cam);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  for (const pl of game.platforms) {
    if (pl.type !== 'ground') drawPlatformCloud(ctx, pl, Math.round(pl.x), sy(pl.y));
  }
  for (const o of game.obstacles) if (o.kind === 'gust') drawGust(ctx, Math.round(o.x), sy(o.y), o.t); // curled wind streaks
  drawParticles(ctx, game.particles, sy);

  const p = game.player;
  const px = Math.round(p.x), py = sy(p.y);
  const ch = game.character;
  drawPlayer(ctx, p, px, py, ch);
  if (px + ch.body.w > VIEW_W) drawPlayer(ctx, p, px - VIEW_W, py, ch); // wrap-around copy
}

// Farm scene the run starts from, at full resolution (assets/farm-ground-hd.webp). It spans the game's width,
// keeps its own aspect ratio, and sits with its bottom edge GROUND.height below the grass line the player stands on.
const farmArt = new Image();
farmArt.src = new URL('../assets/farm-ground-hd.webp', import.meta.url).href;

// scaleX / scaleY: device pixels per virtual pixel on the target canvas.
export function drawGroundHD(ctx, game, scaleX, scaleY) {
  // Snap to the virtual pixel grid, like the sprites, so the player's feet stay on the same grass line.
  const bottom = Math.round(game.groundY - game.camY) + GROUND.height;
  const loaded = farmArt.complete && farmArt.naturalWidth > 0;
  const artH = loaded ? (VIEW_W * farmArt.naturalHeight) / farmArt.naturalWidth : GROUND.artHeight;
  if (bottom - artH > VIEW_H) return; // scrolled off for good

  if (!loaded) {
    ctx.fillStyle = COLORS.grassFallback; // until the image arrives
    ctx.fillRect(0, (bottom - GROUND.height) * scaleY, VIEW_W * scaleX, GROUND.height * scaleY);
    return;
  }
  const w = VIEW_W * scaleX;
  const h = w * (farmArt.naturalHeight / farmArt.naturalWidth); // proportional, never stretched
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(farmArt, 0, bottom * scaleY - h, w, h);
  ctx.imageSmoothingEnabled = false;
}

export function drawPlatformCloud(ctx, pl, x, y) {
  if (pl.broken) {
    // Dissipate: fade and sink.
    ctx.globalAlpha = Math.max(0, 1 - pl.breakT / PLATFORM.breakTime);
    y += Math.round(pl.breakT * 30);
  }
  ctx.drawImage(cloudSprite(pl.type, pl.w), x + CLOUD_OFFSET.x, y + CLOUD_OFFSET.y);
  if (pl.type === 'spring') {
    // Little spring sitting on the middle puff.
    const cx = x + Math.round(pl.w / 2);
    ctx.fillStyle = COLORS.springCoil;
    ctx.fillRect(cx - 3, y - 3, 6, 1);
    ctx.fillRect(cx - 2, y - 5, 4, 1);
    ctx.fillRect(cx - 3, y - 7, 6, 1);
    ctx.fillStyle = COLORS.springCap;
    ctx.fillRect(cx - 4, y - 9, 8, 2);
  }
  ctx.globalAlpha = 1;
}

// Crows, owls and bees, drawn straight onto the device-resolution canvas so their 2x pixel art keeps its detail.
// scaleX / scaleY: device pixels per game pixel. Positions snap to the art's own pixel grid.
export function drawFlyersHD(ctx, game, scaleX, scaleY) {
  const night = nightAmount(skyPosition(-game.camY));
  const snap = (v) => Math.round(v * ART_SCALE) / ART_SCALE;
  ctx.imageSmoothingEnabled = false;
  for (const o of game.obstacles) {
    if (o.kind === 'gust') continue;
    const size = flyerSize(o.kind);
    const wingsUp = Math.sin(o.t * FLAP_RATE[o.kind]) > 0;
    const right = o.vx > 0;
    // Sprites overhang their hitbox (beaks, tails, wingtips), so center them on it.
    const sx = snap(o.x - (size.w - o.w) / 2);
    const sy = snap(o.y - game.camY + (o.h - size.h) / 2);
    // Wrap-around copies while straddling a screen edge.
    const xs = [sx];
    if (sx + size.w > VIEW_W) xs.push(sx - VIEW_W);
    if (sx < 0) xs.push(sx + VIEW_W);
    for (const cx of xs) {
      const draw = (sprite) => ctx.drawImage(sprite, Math.round(cx * scaleX), Math.round(sy * scaleY),
        Math.round(size.w * scaleX), Math.round(size.h * scaleY));
      draw(flyerSprite(o.kind, wingsUp, right));
      if (night > 0 && hasNightPalette(o.kind)) {
        // Cross-fade to the lighter night feathers as the sky darkens.
        ctx.globalAlpha = night;
        draw(flyerSprite(o.kind, wingsUp, right, true));
        ctx.globalAlpha = 1;
      }
    }
  }
}

export function drawParticles(ctx, particles, sy) {
  for (const pt of particles) {
    const f = 1 - pt.age / pt.life;
    ctx.globalAlpha = f * 0.9;
    ctx.fillStyle = pt.size === 3 ? COLORS.puff : COLORS.puffWarm;
    const s = f > 0.5 ? pt.size : Math.max(1, pt.size - 1); // shrink as they fade
    ctx.fillRect(Math.round(pt.x - s / 2), sy(pt.y) - Math.round(s / 2), s, s);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx, p, x, y, character) {
  const { art, body } = character;
  if (art) {
    // Faces whichever way the player last steered; tumbles upside-down when knocked out.
    const img = p.facing < 0 ? art.left : art.right;
    if (p.dead) {
      ctx.save();
      ctx.translate(x, y + body.h);
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(img, x, y);
    }
    return;
  }
  // Placeholder square.
  ctx.fillStyle = COLORS.player;
  ctx.fillRect(x, y, body.w, body.h);
  ctx.fillStyle = COLORS.eye;
  const ex = p.facing > 0 ? x + 7 : x + 3;
  if (p.dead) {
    ctx.fillRect(ex, y + 4, 1, 1); ctx.fillRect(ex + 2, y + 4, 1, 1);
    ctx.fillRect(ex + 1, y + 5, 1, 1);
    ctx.fillRect(ex, y + 6, 1, 1); ctx.fillRect(ex + 2, y + 6, 1, 1);
  } else {
    ctx.fillRect(ex, y + 4, 2, 2);
    ctx.fillRect(ex + 3, y + 4, 2, 2);
  }
}
