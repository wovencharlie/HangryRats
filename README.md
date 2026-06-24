# 🐀 Hangry Rats

A web-based, mobile-friendly slingshot physics game in the spirit of Angry Birds.
**Launch. Smash. Take over!** Fling hangry rats at the cats' junk fortress and
wipe out every cat to clear the level.

Phase 1 ships **10 single-player levels** of increasing difficulty.

## Tech

- **[Phaser 3](https://phaser.io/)** game engine with its built-in **Matter.js**
  physics for the slingshot launch and destructible structures.
- **[Vite](https://vitejs.dev/)** for the dev server and production build.
- **No binary art or audio assets** — every sprite is drawn procedurally at boot
  and all sound effects are synthesized with the Web Audio API, so the game is
  fully self-contained and loads instantly.

## Run it

```bash
npm install
npm run dev
```

Then open the printed **Local** URL (default <http://localhost:5173>).

### Test on your phone

`npm run dev` also prints a **Network** URL (e.g. `http://192.168.x.x:5173`).
Open that on a phone on the same Wi-Fi. Play in **landscape** for the best view
(the menu shows a rotate hint in portrait).

### Production build

```bash
npm run build     # outputs static files to dist/
npm run preview   # serve the built bundle locally
```

`dist/` is a static site — drop it on any static host (Netlify, Vercel, GitHub
Pages, S3, …). `vite.config.js` uses a relative `base` so it works from a
subpath too.

## Deploy to Railway

The repo is preconfigured to deploy on [Railway](https://railway.app) with no
extra setup — `railway.json` tells Railway to build with `npm run build` and
serve with `npm start` (a tiny zero-dependency Node static server in
`server.js` that binds to Railway's `$PORT`).

**Option A — Railway CLI (no GitHub needed):**

```bash
npm i -g @railway/cli
railway login
railway init        # create a new project
railway up          # build + deploy this directory
railway domain      # generate a public URL
```

**Option B — from GitHub (push-to-deploy):**

1. Put this project in a GitHub repo (`git init && git add -A && git commit -m "Hangry Rats" && git push`).
2. In the Railway dashboard: **New Project → Deploy from GitHub repo**, pick the repo.
3. Railway reads `railway.json`, runs the build, starts the server, and gives
   you a URL under **Settings → Networking → Generate Domain**. Every push
   redeploys automatically.

No environment variables are required. Railway injects `PORT`; the server reads
it. Build output (`dist/`) and `node_modules/` are git-ignored and rebuilt on
Railway.

## How to play

- **Drag** the rat back from the slingshot and **release** to launch. The dotted
  arc previews the trajectory; pull further for more power.
- Destroy **all the cats** to win. Structures are made of **wood** (weak),
  **glass** (shatters) and **stone** (tough — bring the heavy rat).
- Fewer rats used = more **stars** (up to 3). Progress and best scores are saved
  in your browser; clearing a level unlocks the next.

### Rat types

| Rat | Role | Ability |
| --- | --- | --- |
| **Scrapper** (gray) | All-rounder | — |
| **Tank** (brown) | Heavy hitter, great vs stone | — |
| **Dasher** (speckled) | Fast | **Tap** in flight to dash forward |
| **Splitter** (mouse) | Light | **Tap** in flight to split into three |

## Project layout

```
index.html            # mobile viewport + loading splash
server.js             # zero-dep static server for production (Railway start cmd)
railway.json          # Railway build/deploy config
src/
  main.js             # Phaser config (Matter physics, responsive scaling)
  constants.js        # virtual resolution, palette, materials, rat types, tuning
  levels.js           # the 10 levels, built with stable stacking helpers
  textures.js         # procedural sprite/texture generation
  sfx.js              # Web Audio sound effects
  progress.js         # localStorage unlocks + best stars/scores
  ui.js               # shared background + buttons + star row
  scenes/
    BootScene.js      # generates textures, then -> Menu
    MenuScene.js
    LevelSelectScene.js
    GameScene.js      # core gameplay: slingshot, physics, scoring, win/lose
```

### Extending (future phases)

- **Add a level:** append an entry to `LEVELS` in `src/levels.js`. Build
  structures with the `stack()` / `hut()` helpers (they auto-compute Y so blocks
  never interpenetrate) and place cats with `catGround()` / `catOn()`. Reachable
  landing band is roughly `x ≈ 760–1400`.
- **Tune feel:** `LAUNCH` (power/drag) and material HP live in `src/constants.js`.
- **Add a rat type:** add to `RAT_TYPES` in `src/constants.js`, draw it in
  `src/textures.js`, and handle any new ability in `GameScene.tryAbility()`.
