// Playable Farm Friends. To add one: drop a transparent PNG into assets/characters/ and add an entry below.
// The art is trimmed, scaled to game size and given a silhouette hitbox automatically (see sprites.js).
// Every character plays with the same physics (PHYSICS in config.js).
import { PLAYER, PHYSICS } from './config.js';

export const CHARACTERS = {
  // name: the animal. print: the Farm Friends print it wears, shown with its pattern on the home carousel.
  // color: the card's name/print colour (and Tap to Play's), sampled from that print; Cow and Barn Mouse use a
  // deeper shade of their print's colour so white button text stays readable.
  // Order alternates green / red / blue so no two neighbours in the carousel (which wraps) look alike.
  // sprite: finished game-size sprite.
  sheep: { name: 'Sheep', print: 'Scottish Plaid', pattern: 'assets/patterns/scottish-plaid.png', color: '#9A9A7B', sprite: 'assets/characters/sheep.png', facing: 'right' },
  duck: { name: 'Mallard Duck', print: 'Merlot', pattern: 'assets/patterns/merlot.png', color: '#621A28', sprite: 'assets/characters/duck.png', facing: 'right' },
  cow: { name: 'Cow', print: 'Ribbon Stripe', pattern: 'assets/patterns/ribbon-stripe.png', color: '#7798B6', sprite: 'assets/characters/cow.png', facing: 'right' },
  mouse: { name: 'Barn Mouse', print: 'Green Pinstripe', pattern: 'assets/patterns/green-pinstripe.png', color: '#979766', sprite: 'assets/characters/mouse.png', facing: 'right' },
  rooster: { name: 'Rooster', print: 'Pink Gingham', pattern: 'assets/patterns/pink-gingham.png', color: '#DB9C9D', sprite: 'assets/characters/rooster.png', facing: 'right' },
  piglet: { name: 'Piglet', print: 'Blueberry Lane', pattern: 'assets/patterns/blueberry-lane.png', color: '#458B90', sprite: 'assets/characters/piglet.png', facing: 'right' },
};

export const DEFAULT_CHARACTER = 'sheep';

// Body = sprite size plus two hitboxes, relative to the sprite's top-left:
//   feet  horizontal span that can land on a cloud (along the bottom edge)
//   hit   box that touches obstacles
// This one is for the plain placeholder square, used when a character has no art (yet).
export const PLACEHOLDER_BODY = {
  w: PLAYER.w,
  h: PLAYER.h,
  feet: { x: PLAYER.footInset, w: PLAYER.w - PLAYER.footInset * 2 },
  hit: { x: PLAYER.hitInset, y: PLAYER.hitInset, w: PLAYER.w - PLAYER.hitInset * 2, h: PLAYER.h - PLAYER.hitInset * 2 },
};

// Everything the game needs about who's playing. art is filled in by sprites.js in the browser.
export function makeCharacter(id, { body = PLACEHOLDER_BODY, art = null } = {}) {
  const def = CHARACTERS[id] || { name: 'Baseline' };
  return { id, ...def, physics: { ...PHYSICS }, body, art };
}
