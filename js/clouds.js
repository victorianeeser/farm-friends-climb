// Procedural pixel-art cloud sprites: a flat-bottomed base plus a row of round puffs,
// with a shaded underside, soft outline and drop shadow. Built once per (type, width) and cached.

const MARGIN = 1;  // room for the outline around the shape
const SHADOW = 2;  // drop-shadow depth below the cloud
const BODY_H = 14; // shape height, from the tallest puff to the flat bottom
const LIFT = 3;    // the landing line sits this far below the sprite's shape top

// Offset from a platform's (x, y) landing point to the sprite's top-left.
export const CLOUD_OFFSET = { x: -MARGIN, y: -LIFT - MARGIN };

const PALETTES = {
  normal: { fill: [255, 255, 255, 255], shade: [228, 233, 243, 255], dark: [205, 213, 230, 255] },
  moving: { fill: [255, 255, 255, 255], shade: [214, 230, 248, 255], dark: [160, 196, 236, 255] },
  spring: { fill: [255, 255, 255, 255], shade: [255, 222, 180, 255], dark: [244, 162, 97, 255] },
  // Wispy: translucent with a dithered, see-through lower half, since it won't hold twice.
  breakable: { fill: [246, 247, 250, 210], shade: [226, 229, 237, 190], dark: [210, 214, 225, 170], wispy: true },
};
const OUTLINE = [52, 62, 104, 90];
const DROP = [30, 34, 70, 40];
const PUFF_RADII = [4.5, 6, 5, 5.5];

function makeShape(w) {
  const n = Math.max(3, Math.round(w / 11));
  const puffs = [];
  for (let i = 0; i < n; i++) {
    puffs.push({ cx: (w * (i + 0.5)) / n, cy: 7, r: PUFF_RADII[i % PUFF_RADII.length] });
  }
  const rx = w / 2;
  return (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= BODY_H) return false;
    const px = x + 0.5, py = y + 0.5;
    const ex = (px - rx) / rx, ey = (py - 10) / 4;
    if (ex * ex + ey * ey <= 1) return true;
    for (const p of puffs) {
      const dx = px - p.cx, dy = py - p.cy;
      if (dx * dx + dy * dy <= p.r * p.r) return true;
    }
    return false;
  };
}

function build(type, w) {
  const pal = PALETTES[type] || PALETTES.normal;
  const inside = makeShape(w);
  const cw = w + MARGIN * 2;
  const ch = BODY_H + MARGIN + SHADOW + 1;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(cw, ch);

  for (let sy = 0; sy < ch; sy++) {
    for (let sx = 0; sx < cw; sx++) {
      const x = sx - MARGIN, y = sy - MARGIN;
      let c = null;
      if (inside(x, y)) {
        if (pal.wispy && y >= 9 && (x + y) % 2 === 0) continue;
        if (!inside(x, y + 1)) c = pal.dark;
        else if (!inside(x, y + 3)) c = pal.shade;
        else c = pal.fill;
      } else if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) {
        c = OUTLINE;
      } else if (inside(x, y - SHADOW) || inside(x, y - 1)) {
        c = DROP;
      }
      if (!c) continue;
      const i = (sy * cw + sx) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = c[3];
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

const cache = new Map();
export function cloudSprite(type, w) {
  const key = `${type}:${w}`;
  let s = cache.get(key);
  if (!s) cache.set(key, (s = build(type, w)));
  return s;
}
