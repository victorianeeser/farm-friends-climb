# Farm Friends Climb

Mobile web mini-game (class project): a tap-to-steer vertical climber. Pick one of six farm friends and bounce up through the clouds from the barn, dodging bees, birds, owls and wind gusts as the sky turns from sunset to night.

Plain HTML5 canvas + native ES modules. No build step, no dependencies.

## Run locally

ES modules don't load from `file://`, so serve the folder:

```bash
python3 serve.py
```

This serves on port 8000 with caching turned off, so phones always get the latest files.

Then open http://localhost:8000. To play on a phone, open `http://<your-computer's-LAN-IP>:8000` on the same Wi-Fi.

## Controls

- **Phone:** tap or hold the left/right half of the screen.
- **Desktop:** ← → or A / D to steer, Space / Enter to restart after game over, P / Esc to pause and resume.
- **Pause menu:** the button in the top-right pauses the run. The menu has Resume, How to Play and Quit to Menu. Switching away from the app mid-run pauses it automatically.

## Pages

- `index.html`: the home screen (Figma frames 183:721 and 217:61). Character carousel, Tap to Play, and Leaderboard and My Stats side by side. Leaderboard (15 places, sample players plus your best) and My Stats are screens within this page. The ⓘ button opens How to Play.
- `play.html`: gameplay only (3-2-1 countdown, the run, pause menu, game over).

## Adding a character

1. Save a transparent PNG as `assets/characters/<id>.png`.
2. Add an entry to `CHARACTERS` in `js/characters.js`: the name, its print and pattern, its colour, the sprite path and the direction the art faces.

How the game handles the PNG depends on its size:
- **Finished sprite at game size** (at most 31×24; the six current animals are these): used pixel for pixel, so any hand fixes are kept.
- **Larger art:** trimmed and shrunk automatically to at most 24px tall and 31px wide.

Either way, the game builds a mirrored copy for facing left and measures hitboxes from the silhouette. Thin-legged characters get a landing span of at least 10px.

## Asset export tool

Open http://localhost:8000/tools/export.html (with `python3 serve.py` running) to download transparent PNGs of the code-drawn elements: the four cloud types, bird, bee, owl and spring-burst frames. It uses the game's own drawing code, so the exports match the game exactly. Choose the size (1×–32×) and padding at the top of the page. This is a local tool only and isn't part of the game.

## Deploy

Upload `index.html`, `play.html`, `css/`, `js/` and `assets/` to any static host (GitHub Pages, Netlify, Vercel, etc.). `serve.py`, `tools/` and `.claude/` are for local development only.

## Layout

| File | Role |
| --- | --- |
| `js/config.js` | All tuning numbers (physics, platform sizes, difficulty, tempo) |
| `js/level.js` | Procedural platforms and obstacles |
| `js/game.js` | Simulation: physics, collisions, camera, score |
| `js/characters.js` | Character list: name, print, pattern, colour, art |
| `js/sprites.js` | Turns a character PNG into a game-size sprite + silhouette hitboxes |
| `js/render.js` | Drawing: sky, farm, clouds, wind gusts, particles, player, and the bee / bird / owl |
| `js/flyers.js` | Pixel-art sprites for the bird, owl and bee (drawn at 2× detail) |
| `js/clouds.js` | Pixel-art cloud platforms |
| `js/sky.js` | Sunset-to-night sky colours and stars |
| `js/gust.js` | Curled wind-gust streaks (look and animation speed) |
| `js/input.js` | Touch + keyboard |
| `js/main.js` | Play page: scaling, game loop, countdown, pause, game over |
| `js/home.js` | Home page: carousel, Leaderboard, My Stats, How to Play, the flying bee and bird |
| `js/storage.js` | Saved on the device: best score, stats, last character picked |
| `css/home.css` | Home, Leaderboard and My Stats styles |
| `css/style.css` | Play page styles |
| `css/howto.css` | How to Play box, shared by the pause menu and the home screen's ⓘ button |

The game is always 201 virtual pixels wide, and its height follows the screen's shape (437 on a full-screen iPhone 16 Pro), so it fills the whole screen on any phone. On wider screens (500px and up), the home screen and the game sit in a 402px column (iPhone 16 Pro width) with white around it.
