// Curled wind gust: layered, semi-transparent streaks that each end in a small pixel spiral, like a cartoon
// "whoosh". The round curls and the soft pale underside echo the cloud platforms' puffy lobes. Drawn at
// virtual (pixel-art) resolution, one pixel at a time, so it stays crisp when scaled up.

const CORE = [255, 255, 255];
const SHADE = [214, 226, 240]; // pale underside, like the clouds' shaded bottoms

// Streaks, relative to the gust's top-left (its hitbox is 36 × 14; curls may overhang slightly).
//   x0, len  where the straight part starts and how long it is
//   curl     which end curls: 'right', 'left', or null for a straight streak
//   turn     curl direction: -1 curls upward, 1 curls downward
//   r        curl radius in pixels
//   phase    offsets the animation so the streaks don't move in lockstep
const STREAKS = [
  { y: 2, x0: 2, len: 21, curl: 'right', turn: -1, r: 4.2, phase: 0, alpha: 0.92 }, // curls up on the right
  { y: 7, x0: 6, len: 26, curl: null, phase: 2.1, alpha: 0.78, middle: true },       // straight
  { y: 12, x0: 9, len: 20, curl: 'left', turn: 1, r: 4.2, phase: 4.2, alpha: 0.88 }, // curls down on the left
];

const CURL_TURNS = 1.1; // how far each spiral winds in (1 = one full loop)
const CURL_TIGHTEN = 0.25; // radius at the spiral's centre, as a fraction of r
const THICK_UNTIL = 0.55; // the outer part of the curl (this share of the sweep) is drawn 2px thick, like the line
const TAIL_FADE = 7; // pixels at the straight end that fade out
const ANIM_SPEED = 0.5; // pace of the gust's own motion (shimmer, bob, stretch, curl wobble); 1 = original gust's shimmer speed

// Pixels of one streak: a 2px line, fading at its tail, that winds into a shrinking spiral at its curled end
// (or, for a straight streak, just the line, faded at both ends).
function streakPixels(s, t) {
  const pts = new Map(); // "x,y" -> strength (0–1), so overlapping samples don't double up
  const add = (x, y, k) => {
    const key = `${x},${y}`;
    pts.set(key, Math.max(pts.get(key) || 0, k));
  };

  const len = s.len + Math.round(Math.sin(t * 2.2 + s.phase) * 2); // length breathes
  const bob = Math.round(Math.sin(t * 3.4 + s.phase) * 0.7); // whole streak rises and falls a pixel

  if (!s.curl) {
    // Straight streak: soft at both ends.
    for (let i = 0; i <= len; i++) {
      const k = Math.min(1, (i + 1) / TAIL_FADE, (len - i + 1) / TAIL_FADE);
      add(s.x0 + i, s.y + bob, k);
      add(s.x0 + i, s.y + bob + 1, k);
    }
    return pts;
  }

  const dir = s.curl === 'right' ? 1 : -1; // direction of travel toward the curl
  const start = s.curl === 'right' ? s.x0 : s.x0 + s.len;
  const ey = s.y + bob;
  let ex = start;
  for (let i = 0; i <= len; i++) {
    const x = start + dir * i;
    const k = Math.min(1, (i + 1) / TAIL_FADE);
    add(x, ey, k);
    add(x, ey + 1, k); // 2px thick, like the old gust's streaks
    ex = x;
  }

  // Spiral: starts tangent to the line, curls up or down, and tightens toward its centre.
  // The start angle wobbles a little so the curl looks like it's riding the air.
  const cx = ex, cy = ey + s.turn * s.r;
  const a0 = Math.atan2(ey - cy, ex - cx) + Math.sin(t * 3 + s.phase) * 0.25;
  const spin = dir * s.turn;
  const sweep = CURL_TURNS * Math.PI * 2;
  // The line is 2px thick (rows ey and ey+1), so the curl is centred half a pixel lower to meet it.
  const ccy = cy + 0.5;
  for (let th = 0; th <= sweep; th += 0.03) {
    const f = th / sweep;
    const r = s.r * (1 - (1 - CURL_TIGHTEN) * f);
    const px = cx + r * Math.cos(a0 + spin * th);
    const py = ccy + r * Math.sin(a0 + spin * th);
    add(Math.round(px), Math.round(py), 1);
    if (f < THICK_UNTIL) {
      // Thicken inward, toward the curl's centre, so the loop stays open and round.
      add(Math.round(px + (cx - px) / r), Math.round(py + (ccy - py) / r), 1);
    }
  }
  return pts;
}

function plot(ctx, pts, ox, oy, rgb, alpha, dy) {
  for (const [key, k] of pts) {
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(alpha * k).toFixed(3)})`;
    ctx.fillRect(ox + x, oy + y + dy, 1, 1);
  }
}

// Draw a gust with its top-left at (x, y) in virtual pixels. t is the gust's own clock in seconds.
// options.middle: false leaves out the straight middle streak (top and bottom curls only).
export function drawGust(ctx, x, y, t, { middle = true } = {}) {
  x = Math.round(x);
  y = Math.round(y);
  t *= ANIM_SPEED;
  // Shimmer, as in the original gust: each streak steps sideways through a 6px cycle (20 px/s at speed 1),
  // offset per streak so they don't move in unison.
  const shift = Math.floor(t * 20) % 6;
  STREAKS.forEach((s, i) => {
    if (s.middle && !middle) return;
    const dx = (shift + i * 4) % 6;
    const pts = streakPixels(s, t);
    plot(ctx, pts, x + dx, y, SHADE, s.alpha * 0.6, 1); // soft underside first
    plot(ctx, pts, x + dx, y, CORE, s.alpha, 0);
  });
}
