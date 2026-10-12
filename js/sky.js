// Sunset → night sky: color blended between SKY_COLORS by climb height, plus a parallax star field.
import { VIEW_W, VIEW_H, SCORE_PER_PX, SKY_COLORS, SKY_STEP, STARS } from './config.js';

const STOPS = SKY_COLORS.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
const LAST = STOPS.length - 1;

// Fractional stop index for a climb height in world px: 2.5 = halfway between stops 3 and 4 (1-based).
export function skyPosition(height) {
  return Math.min(LAST, Math.max(0, (height * SCORE_PER_PX) / SKY_STEP));
}

export function skyColor(pos) {
  const i = Math.min(Math.floor(pos), LAST - 1);
  const t = Math.min(1, pos - i);
  const a = STOPS[i], b = STOPS[i + 1];
  const mix = (k) => Math.round(a[k] + (b[k] - a[k]) * t);
  return `rgb(${mix(0)},${mix(1)},${mix(2)})`;
}

// Stable per-cell pseudo-random bits, so stars stay put as the camera moves.
function hash(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

// 0 during the sunset, easing to 1 as the sky reaches night (same range the stars fade in over).
export function nightAmount(pos) {
  return Math.min(1, Math.max(0, (pos - STARS.fadeFrom) / (STARS.fullAt - STARS.fadeFrom)));
}

export function drawStars(ctx, pos, camY, time) {
  const fade = nightAmount(pos);
  if (fade <= 0) return;

  const c = STARS.cell;
  const off = camY * STARS.parallax; // star-space y at the top of the screen
  const rowFrom = Math.floor(off / c) - 1;
  const rowTo = Math.floor((off + VIEW_H) / c);
  const cols = Math.ceil(VIEW_W / c);

  ctx.fillStyle = '#ffffff';
  for (let row = rowFrom; row <= rowTo; row++) {
    for (let col = 0; col < cols; col++) {
      const h = hash(col, row);
      if ((h & 1023) / 1024 >= STARS.density) continue;
      const x = col * c + ((h >>> 10) % c);
      const y = Math.round(row * c + ((h >>> 15) % c) - off);
      if (y < -2 || y > VIEW_H + 1) continue;

      const twinkles = ((h >>> 23) & 3) === 0;
      const tw = twinkles ? 0.55 + 0.45 * Math.sin(time * 2.5 + (h & 63)) : 1;
      ctx.globalAlpha = fade * tw * (0.55 + ((h >>> 25) & 3) * 0.15);
      if (((h >>> 20) & 7) === 0) {
        // Occasional bigger "plus" star.
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      } else {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  ctx.globalAlpha = 1;
}
