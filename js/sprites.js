// Character art pipeline (browser only). Turns a transparent PNG into a game-ready sprite. A PNG that is already
// game-sized (within PLAYER.spriteMaxWidth × spriteHeight) is used pixel for pixel; larger art is processed:
//   1. trim the transparent padding,
//   2. shrink to game size (PLAYER.spriteHeight tall, at most PLAYER.spriteMaxWidth wide) by taking each
//      output pixel's most common colour, so it stays crisp instead of blurring,
//   3. build a mirrored copy for facing the other way,
//   4. measure hitboxes from the visible silhouette.
import { PLAYER } from './config.js';

const ALPHA_MIN = 128;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function trimBounds(data, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] >= ALPHA_MIN) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function downsample(data, srcW, box, tw, th) {
  const out = new ImageData(tw, th);
  for (let ty = 0; ty < th; ty++) {
    const y0 = box.y + Math.floor((ty * box.h) / th);
    const y1 = Math.max(y0 + 1, box.y + Math.floor(((ty + 1) * box.h) / th));
    for (let tx = 0; tx < tw; tx++) {
      const x0 = box.x + Math.floor((tx * box.w) / tw);
      const x1 = Math.max(x0 + 1, box.x + Math.floor(((tx + 1) * box.w) / tw));
      const buckets = new Map();
      let opaque = 0, total = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * srcW + x) * 4;
          total++;
          if (data[i + 3] < ALPHA_MIN) continue;
          opaque++;
          const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
          const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
          b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2];
          buckets.set(key, b);
        }
      }
      if (opaque * 2 < total) continue; // mostly transparent → transparent
      let best = null;
      for (const b of buckets.values()) if (!best || b.n > best.n) best = b;
      const o = (ty * tw + tx) * 4;
      out.data[o] = Math.round(best.r / best.n);
      out.data[o + 1] = Math.round(best.g / best.n);
      out.data[o + 2] = Math.round(best.b / best.n);
      out.data[o + 3] = 255;
    }
  }
  return out;
}

// Hitboxes from the silhouette. The obstacle box keeps only the solid core (rows/columns at least half as
// full as the fullest one), so ears, tails and thin legs don't cause unfair hits. The feet span is the
// width of whatever touches the bottom two rows.
export function silhouetteBody(alpha, w, h) {
  const cols = new Array(w).fill(0);
  const rows = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha(x, y)) { cols[x]++; rows[y]++; }
    }
  }
  const span = (counts) => {
    const cut = Math.max(...counts) * 0.5;
    const first = counts.findIndex((c) => c >= cut);
    const last = counts.length - 1 - [...counts].reverse().findIndex((c) => c >= cut);
    return { start: first, size: last - first + 1 };
  };
  const hx = span(cols), hy = span(rows);

  let fx0 = w, fx1 = -1;
  for (let y = Math.max(0, h - 2); y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha(x, y)) { fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x); }
    }
  }
  let feet = fx1 < 0 ? { x: 2, w: w - 4 } : { x: fx0, w: fx1 - fx0 + 1 };
  // Thin-legged characters (birds) still get a fair landing span: at least the placeholder square's
  // (PLAYER.w minus its foot insets = 10px), centred on their actual feet.
  const minFeet = PLAYER.w - PLAYER.footInset * 2;
  if (feet.w < minFeet) feet = { x: Math.round(feet.x + feet.w / 2 - minFeet / 2), w: minFeet };

  return { w, h, feet, hit: { x: hx.start, y: hy.start, w: hx.size, h: hy.size } };
}

function toCanvas(imageData, mirror) {
  const c = document.createElement('canvas');
  c.width = imageData.width;
  c.height = imageData.height;
  const ctx = c.getContext('2d');
  if (!mirror) {
    ctx.putImageData(imageData, 0, 0);
    return c;
  }
  const tmp = toCanvas(imageData, false);
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(tmp, 0, 0);
  return c;
}

// Resolves to { right, left, body } or null if the PNG is missing / empty.
export async function loadCharacterArt(def) {
  if (!def || !def.sprite) return null;
  let img;
  try {
    img = await loadImage(def.sprite);
  } catch {
    return null; // missing art: the game falls back to the plain placeholder square
  }
  const src = document.createElement('canvas');
  src.width = img.naturalWidth;
  src.height = img.naturalHeight;
  const sctx = src.getContext('2d');
  sctx.drawImage(img, 0, 0);
  const { data } = sctx.getImageData(0, 0, src.width, src.height);

  const box = trimBounds(data, src.width, src.height);
  if (!box) return null;

  let tw, th, pixels;
  if (box.w <= PLAYER.spriteMaxWidth && box.h <= PLAYER.spriteHeight) {
    // Already game-sized (a finished, hand-touched sprite): use its pixels exactly as drawn.
    tw = box.w;
    th = box.h;
    pixels = new ImageData(tw, th);
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const i = ((box.y + y) * src.width + box.x + x) * 4;
        const o = (y * tw + x) * 4;
        const opaque = data[i + 3] >= ALPHA_MIN;
        pixels.data[o] = data[i];
        pixels.data[o + 1] = data[i + 1];
        pixels.data[o + 2] = data[i + 2];
        pixels.data[o + 3] = opaque ? 255 : 0;
      }
    }
  } else {
    // Large art: shrink to game size. Same height for everyone, width follows the art's proportions (capped).
    th = def.height ?? PLAYER.spriteHeight;
    tw = Math.max(1, Math.round((box.w * th) / box.h));
    if (tw > PLAYER.spriteMaxWidth) {
      tw = PLAYER.spriteMaxWidth;
      th = Math.max(1, Math.round((box.h * tw) / box.w));
    }
    pixels = downsample(data, src.width, box, tw, th);
  }
  const alpha = (x, y) => pixels.data[(y * tw + x) * 4 + 3] > 0;

  const native = toCanvas(pixels, false);
  const mirrored = toCanvas(pixels, true);
  const facesRight = (def.facing ?? 'right') === 'right';
  return {
    right: facesRight ? native : mirrored,
    left: facesRight ? mirrored : native,
    body: silhouetteBody(alpha, tw, th),
  };
}
