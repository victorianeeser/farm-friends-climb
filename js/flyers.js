// Flying-obstacle sprites (crow, owl, bee): two flap frames each, drawn facing right and mirrored for left.
// Built once at load from the pixel maps below. Each character in a map is a palette key; '.' is transparent.
// The maps are drawn at ART_SCALE (2) art pixels per game pixel, so the flyers keep their size on screen but
// carry finer detail; render.js draws them on the full-resolution canvas so that detail survives.

const ART = {
  crow: {
    // K body, H sheen, S shadowed underside, D tail, T tail-feather split, W wing, F darker feather edges,
    // E eye, X pupil, B beak, b lower beak and tucked feet
    up: [
      '........FWW.............................',
      '........FFWW............................',
      '..........FWWWW.........................',
      '..........FFWWWW........................',
      '............FWWWW.......................',
      '............FFWWWW......................',
      '..............FWWWW..........HHHH.......',
      '..............FFWWWW........HHKKKH......',
      'DTDT..........KKWWWWHHHHHHHHKKEEKKBBB...',
      'DDDD..........KKWWWWHHHHHHKKKKEXKKBBBB..',
      '..DTDTHHHHHHHHKKKKKKKKKKKKKKKKKKKKBBBBB.',
      '..DDDDKKKKHHHHKKKKKKKKKKKKKKKKKKKKBBBBB.',
      '....DTDTKKSSSSSSKKKKKKKKKKKKKKKKKKb.b...',
      '....DDDDKKSSSSSSKKKKKKKKKKKKKKKKSSb.b...',
      '........SKSSSSSSSSSSSSKKKKKKKKKS........',
      '.........SSSSSSSSSSSSSKKKKKKKKS.........',
      '............SSSSSSSSSSSSSSSSSS..........',
      '.............SSSSSSSSSSSSSSSS...........',
      '..................b.....b...............',
      '..................b.....b...............',
    ],
    down: [
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '.............................HHHH.......',
      '............................HHKKKH......',
      'DTDT...........HHHHHHHHHHHHHKKEEKKBBB...',
      'DDDD..........HKKKKKHHHHHHKKKKEXKKBBBB..',
      '..DTDTHHHHHHHHKKKKKKKKKKKKKKKKKKKKBBBBB.',
      '..DDDDKKKKHHHHKKKKKKKKKKKKKKKKKKKKBBBBB.',
      '....DTDTKKKKKKFWWWWWWWKKKKKKKKKKKKbbbb..',
      '....DDDDKKKKKKFFWWWWWWKKKKKKKKKKSSbbb...',
      '........SKSSSSKKFWWWWWWWKKKKKKKS........',
      '.........SSSSSKKFFWWWWWWKKKKKKS.........',
      '............SSSSKKFWWWWWWWKKSS..........',
      '.............SSSSSFFWWWWWWSSS...........',
      '..................FWWWWW................',
      '..................FFWWW.................',
    ],
    palettes: {
      day: { K: '#2b2b36', H: '#45465a', S: '#1b1b22', D: '#1b1b22', T: '#30303d', W: '#55556a', F: '#3e3e50', E: '#ffffff', X: '#0d0d12', B: '#f5a623', b: '#d4781f' },
      // Lighter feathers so crows in the dusk overlap stay visible against the dark sky.
      night: { K: '#5d6184', H: '#7d82a8', S: '#4a4d6b', D: '#4a4d6b', T: '#565a7c', W: '#8f94b8', F: '#6f739a', E: '#ffffff', X: '#22243a', B: '#f5a623', b: '#d4781f' },
    },
  },
  owl: {
    // Barn owl. B golden back, T rim light, U shaded belly, S pale speckles, W wing, P wing bars,
    // R ruff around the white heart-shaped face L, E eyes, Q catch light, K beak, D tail / talons
    up: [
      '.....WWWPPW.........................',
      '.....WWWWWWW........................',
      '......WWPPWWWWPP.........RRRRRRRR...',
      '.......WWWWWWWWW........RRRRRRRRRR..',
      '........WWWWPPWWW......RLLLLLLLLLLR.',
      '.........WWWWWWWWW....RRLLLLLLLLLLRR',
      '..........WWWWPPWWT...LLLLQELLQELLLL',
      '..........WWWWWWWWBT..LLLLEELLEELLLL',
      '.....TTTSTBBBBWWWWBBTTRRLLLLKKLLLLRR',
      '....TBBBBBBBBBWWWWBBBBRRLLLLKKLLLLR.',
      '...DBBBBSBBBBBBBSBBBBBBBRRLLLLLLRR..',
      '..DDBBBBBBBBBBBBBBBBBBBBRRLLLLLLR...',
      '.DDDBBBBBBBBSBBBBBBBSBBBBBBBBBBU....',
      '.DDDUUBBBBBBBBBBBBBBBBBBBBBBBBU.....',
      '..DD..UBBBSBBBBBBBBBSBBBBBBBBU......',
      '.......UUUBBBBBBBBBBBBBBBBBBU.......',
      '..........UUUUBBBBBBBBBBUUUU........',
      '...........UUUBBUUUUUUBBUUU.........',
      '..............DD......DD............',
      '....................................',
    ],
    down: [
      '....................................',
      '....................................',
      '.........................RRRRRRRR...',
      '........................RRRRRRRRRR..',
      '.......................RLLLLLLLLLLR.',
      '......................RRLLLLLLLLLLRR',
      '......................LLLLQELLQELLLL',
      '......................LLLLEELLEELLLL',
      '.....TTTSTTTTTTTTTSTTTRRLLLLKKLLLLRR',
      '....TBBBBBBBBBBBBBBBBBRRLLLLKKLLLLR.',
      '...DBBBBSBBBBBBBBBBBBBBBRRLLLLLLRR..',
      '..DDBBBBBBBBBBBBBBBBBBBBRRLLLLLLR...',
      '.DDDBBBBBBWWPPWWPPWWBBBBSBBBBBBU....',
      '.DDDUUBBBBWWWWWWWWWWBBBBBBBBBBU.....',
      '..DD..UBBBWWPPWWWWPPWWBBBBBBBU......',
      '.......UUUWWWWWWWWWWWWBBBBBBU.......',
      '..........WWWWPPWWWWWWUUUUUU........',
      '...........WWWWWWWWWWWUUUUU.........',
      '............WWPPWWPPWW..............',
      '.............WWWWWWWW...............',
    ],
    palettes: {
      // Pale golden and white, so owls stand out against the night sky.
      day: { B: '#c9a26b', T: '#dcbb85', S: '#e9d7b0', U: '#b38f5f', W: '#a88452', P: '#7d5f3a', R: '#d9b98a', L: '#f4ede0', E: '#2a1f1a', Q: '#ffffff', K: '#b07a4a', D: '#8a6a42' },
    },
  },
  butterfly: {
    // Drawn as a bee (the id stays "butterfly" so spawning, movement and saved stats are unchanged).
    // An oval striped body with an unbroken black outline, a round head with an eye, a pointed stinger and antennae.
    // Y yellow, H highlight, O shaded underside, K outline / stripes / head / stinger / antennae, E eye, X pupil,
    // G sheen on the head, W translucent wing, V wing vein, L wing rim
    up: [
      '......................',
      '......................',
      '......LLL..LLL........',
      '.....LWWWLLWWWL.......',
      '....LWVVWWLWVWWL......',
      '....LWWWVWLWWVWL......',
      '.....LWWWLLWWWLK....K.',
      '......LLLLLLLL..K..K..',
      '......KKKKKKK...K.K...',
      '....KKHKKHHKKKKKKKK...',
      '...KHHYKKYYKKHKGKEEK..',
      '.KKHYYYKKYYKKYKKKEXK..',
      'KKKYYYYKKYYKKYKKKKKK..',
      '...KOOYKKYYKKOKKKKK...',
      '....KKOKKOOKKK........',
      '......KKKKKKK.........',
      '......................',
      '......................',
    ],
    down: [
      '......................',
      '......................',
      '......................',
      '......................',
      '......................',
      '...LLLLL.LLLL.........',
      '..LWVVWWLWVWWL.K....K.',
      '..LWWWVWLWWVWL..K..K..',
      '...LLLLLKLLLL...K.K...',
      '....KKHKKHHKKKKKKKK...',
      '...KHHYKKYYKKHKGKEEK..',
      '.KKHYYYKKYYKKYKKKEXK..',
      'KKKYYYYKKYYKKYKKKKKK..',
      '...KOOYKKYYKKOKKKKK...',
      '....KKOKKOOKKK........',
      '......KKKKKKK.........',
      '......................',
      '......................',
    ],
    palettes: {
      // Pale blue rim keeps the see-through wings readable against the yellow day sky.
      day: { Y: '#f6c32b', H: '#ffe27a', O: '#e0a21f', K: '#2b2b36', E: '#ffffff', X: '#2b2b36', G: '#45465a', W: 'rgba(255, 255, 255, 0.55)', V: 'rgba(170, 200, 225, 0.55)', L: 'rgba(170, 200, 225, 0.9)' },
    },
  },
};

// Wingbeat speed (radians per second of the flap cycle).
export const FLAP_RATE = { crow: 12, owl: 7, butterfly: 22 };

function build(rows, flip, palette) {
  const w = rows[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = rows.length;
  const ctx = canvas.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (!palette[ch]) return;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    });
  });
  return canvas;
}

const SPRITES = {};
for (const [kind, art] of Object.entries(ART)) {
  SPRITES[kind] = {};
  for (const [variant, palette] of Object.entries(art.palettes)) {
    SPRITES[kind][variant] = {
      up: { right: build(art.up, false, palette), left: build(art.up, true, palette) },
      down: { right: build(art.down, false, palette), left: build(art.down, true, palette) },
    };
  }
}

export const ART_SCALE = 2;

// Size in game pixels (the sprite canvases are ART_SCALE times larger).
export function flyerSize(kind) {
  const rows = ART[kind].up;
  return { w: rows[0].length / ART_SCALE, h: rows.length / ART_SCALE };
}

export function hasNightPalette(kind) {
  return Boolean(SPRITES[kind].night);
}

export function flyerSprite(kind, wingsUp, facingRight, night = false) {
  const set = SPRITES[kind][night && SPRITES[kind].night ? 'night' : 'day'];
  return set[wingsUp ? 'up' : 'down'][facingRight ? 'right' : 'left'];
}
