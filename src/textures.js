// Procedural texture generation. Everything you see in Hangry Rats is drawn
// with the Phaser graphics API and baked into textures at boot time, so the
// game ships with no binary art assets and loads instantly.

import { COLORS, RAT_TYPES, MATERIALS } from "./constants.js";

function withGraphics(scene, w, h, draw, key) {
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, Math.ceil(w), Math.ceil(h));
  g.destroy();
}

// ---- Rats -------------------------------------------------------------------

function drawRat(g, type, cx, cy, r) {
  const body = type.body;
  const belly = type.belly;
  const tail = 0xf0a8a0;

  // tail
  g.lineStyle(Math.max(4, r * 0.16), tail, 1);
  g.beginPath();
  g.moveTo(cx - r * 0.6, cy + r * 0.5);
  g.lineTo(cx - r * 1.5, cy + r * 0.2);
  g.lineTo(cx - r * 1.9, cy - r * 0.4);
  g.strokePath();

  // dark outline silhouette (drawn behind, so the colored fills leave a rim)
  const OL = 0x241a13;
  const o = r * 0.09;
  g.fillStyle(OL, 1);
  g.fillCircle(cx - r * 0.55, cy - r * 0.8, r * 0.45 + o);
  g.fillCircle(cx + r * 0.55, cy - r * 0.85, r * 0.5 + o);
  g.fillEllipse(cx + r * 0.55, cy + r * 0.2, r * 0.85 + o * 2, r * 0.6 + o * 2);
  g.fillCircle(cx, cy, r + o);

  // ears
  g.fillStyle(body, 1);
  g.fillCircle(cx - r * 0.55, cy - r * 0.8, r * 0.45);
  g.fillCircle(cx + r * 0.55, cy - r * 0.85, r * 0.5);
  g.fillStyle(tail, 1);
  g.fillCircle(cx - r * 0.55, cy - r * 0.8, r * 0.24);
  g.fillCircle(cx + r * 0.55, cy - r * 0.85, r * 0.27);

  // body
  g.fillStyle(body, 1);
  g.fillCircle(cx, cy, r);
  // belly
  g.fillStyle(belly, 1);
  g.fillEllipse(cx + r * 0.12, cy + r * 0.35, r * 1.0, r * 0.8);

  // snout
  g.fillStyle(belly, 1);
  g.fillEllipse(cx + r * 0.55, cy + r * 0.2, r * 0.85, r * 0.6);
  // nose
  g.fillStyle(0xe5556a, 1);
  g.fillCircle(cx + r * 0.95, cy + r * 0.18, r * 0.16);

  // eyes
  const eyeY = cy - r * 0.12;
  g.fillStyle(0xffffff, 1);
  g.fillCircle(cx + r * 0.18, eyeY, r * 0.3);
  g.fillCircle(cx + r * 0.62, eyeY, r * 0.27);
  g.fillStyle(0x161616, 1);
  g.fillCircle(cx + r * 0.28, eyeY + r * 0.04, r * 0.15);
  g.fillCircle(cx + r * 0.7, eyeY + r * 0.04, r * 0.13);

  // angry brows
  g.lineStyle(Math.max(3, r * 0.12), 0x231a14, 1);
  g.beginPath();
  g.moveTo(cx - r * 0.05, eyeY - r * 0.45);
  g.lineTo(cx + r * 0.42, eyeY - r * 0.18);
  g.strokePath();
  g.beginPath();
  g.moveTo(cx + r * 0.95, eyeY - r * 0.4);
  g.lineTo(cx + r * 0.5, eyeY - r * 0.2);
  g.strokePath();

  // whiskers
  g.lineStyle(Math.max(1.5, r * 0.05), 0xffffff, 0.8);
  for (const dy of [-0.05, 0.18]) {
    g.beginPath();
    g.moveTo(cx + r * 0.7, cy + r * (0.2 + dy));
    g.lineTo(cx + r * 1.5, cy + r * (0.05 + dy * 1.5));
    g.strokePath();
  }
}

export function buildRatTextures(scene) {
  for (const type of Object.values(RAT_TYPES)) {
    const r = type.radius;
    const size = r * 3.2;
    withGraphics(
      scene,
      size,
      size,
      (g) => drawRat(g, type, size / 2, size / 2, r),
      "rat_" + type.key
    );
  }
}

// ---- Enemy (cat guarding the junk fortress) --------------------------------

function drawCat(g, cx, cy, r, hurt) {
  const body = hurt ? 0x8a6b6b : COLORS.enemyBody;
  const belly = COLORS.enemyBelly;
  const OL = 0x2a2330;
  const o = r * 0.09;
  // dark outline silhouette behind ears + head
  g.fillStyle(OL, 1);
  g.fillTriangle(cx - r * 0.95, cy - r * 0.42, cx - r * 0.35, cy - r * 1.38, cx - r * 0.02, cy - r * 0.62);
  g.fillTriangle(cx + r * 0.95, cy - r * 0.42, cx + r * 0.35, cy - r * 1.38, cx + r * 0.02, cy - r * 0.62);
  g.fillCircle(cx, cy, r + o);
  // ears (pointy)
  g.fillStyle(body, 1);
  g.fillTriangle(cx - r * 0.85, cy - r * 0.5, cx - r * 0.35, cy - r * 1.25, cx - r * 0.1, cy - r * 0.6);
  g.fillTriangle(cx + r * 0.85, cy - r * 0.5, cx + r * 0.35, cy - r * 1.25, cx + r * 0.1, cy - r * 0.6);
  g.fillStyle(0xe79b9b, 1);
  g.fillTriangle(cx - r * 0.62, cy - r * 0.55, cx - r * 0.38, cy - r * 1.0, cx - r * 0.22, cy - r * 0.6);
  g.fillTriangle(cx + r * 0.62, cy - r * 0.55, cx + r * 0.38, cy - r * 1.0, cx + r * 0.22, cy - r * 0.6);

  // head/body blob
  g.fillStyle(body, 1);
  g.fillCircle(cx, cy, r);
  g.fillStyle(belly, 1);
  g.fillEllipse(cx, cy + r * 0.35, r * 1.1, r * 0.9);

  // eyes (wide, worried)
  g.fillStyle(0xffffff, 1);
  g.fillCircle(cx - r * 0.38, cy - r * 0.1, r * 0.32);
  g.fillCircle(cx + r * 0.38, cy - r * 0.1, r * 0.32);
  g.fillStyle(0x2a7d2a, 1);
  g.fillCircle(cx - r * 0.36, cy - r * 0.06, r * 0.16);
  g.fillCircle(cx + r * 0.4, cy - r * 0.06, r * 0.16);
  g.fillStyle(0x101010, 1);
  g.fillCircle(cx - r * 0.36, cy - r * 0.06, r * 0.08);
  g.fillCircle(cx + r * 0.4, cy - r * 0.06, r * 0.08);

  // nose + mouth
  g.fillStyle(0xe5556a, 1);
  g.fillTriangle(cx - r * 0.1, cy + r * 0.2, cx + r * 0.1, cy + r * 0.2, cx, cy + r * 0.34);
  g.lineStyle(Math.max(2, r * 0.06), 0x3a2a2a, 1);
  g.beginPath();
  g.moveTo(cx, cy + r * 0.34);
  g.lineTo(cx, cy + r * 0.46);
  g.strokePath();

  // whiskers
  g.lineStyle(Math.max(1.5, r * 0.05), 0xffffff, 0.85);
  for (const s of [-1, 1]) {
    for (const dy of [0.18, 0.32]) {
      g.beginPath();
      g.moveTo(cx + s * r * 0.25, cy + r * dy);
      g.lineTo(cx + s * r * 1.0, cy + r * (dy - 0.05));
      g.strokePath();
    }
  }
}

export function buildEnemyTextures(scene) {
  const r = 30;
  const size = r * 2.8;
  withGraphics(scene, size, size, (g) => drawCat(g, size / 2, size / 2, r, false), "cat");
  withGraphics(scene, size, size, (g) => drawCat(g, size / 2, size / 2, r, true), "cat_hurt");
}

// ---- Slingshot fork ---------------------------------------------------------

export function buildSlingTexture(scene) {
  const w = 70;
  const h = 170;
  withGraphics(
    scene,
    w,
    h,
    (g) => {
      g.fillStyle(COLORS.slingWoodDark, 1);
      g.fillRoundedRect(w / 2 - 13, 30, 26, h - 30, 8); // trunk
      g.fillStyle(COLORS.slingWood, 1);
      g.fillRoundedRect(w / 2 - 9, 30, 18, h - 30, 6);
      // fork arms
      g.lineStyle(20, COLORS.slingWoodDark, 1);
      g.beginPath();
      g.moveTo(w / 2, 60);
      g.lineTo(10, 12);
      g.moveTo(w / 2, 60);
      g.lineTo(w - 10, 12);
      g.strokePath();
      g.lineStyle(12, COLORS.slingWood, 1);
      g.beginPath();
      g.moveTo(w / 2, 60);
      g.lineTo(10, 12);
      g.moveTo(w / 2, 60);
      g.lineTo(w - 10, 12);
      g.strokePath();
    },
    "sling"
  );
}

// ---- Misc props -------------------------------------------------------------

export function buildPropTextures(scene) {
  // cheese block (decorative goal/treasure)
  withGraphics(
    scene,
    64,
    48,
    (g) => {
      g.fillStyle(COLORS.cheese, 1);
      g.fillTriangle(2, 44, 62, 44, 62, 8);
      g.fillStyle(0xe0a92f, 1);
      g.fillTriangle(2, 44, 62, 44, 6, 44);
      g.fillStyle(0xfff0b0, 1);
      g.fillCircle(40, 30, 5);
      g.fillCircle(52, 38, 4);
      g.fillCircle(30, 38, 3);
    },
    "cheese"
  );

  // star (filled + empty)
  const drawStar = (g, color) => {
    g.fillStyle(color, 1);
    const cx = 32,
      cy = 32,
      spikes = 5,
      outer = 28,
      inner = 12;
    g.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? outer : inner;
      const a = (Math.PI / spikes) * i - Math.PI / 2;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
  };
  withGraphics(scene, 64, 64, (g) => drawStar(g, COLORS.star), "star");
  withGraphics(scene, 64, 64, (g) => drawStar(g, COLORS.starEmpty), "star_empty");

  // small dust puff
  withGraphics(
    scene,
    24,
    24,
    (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(12, 12, 11);
    },
    "puff"
  );

  // trajectory dot
  withGraphics(
    scene,
    16,
    16,
    (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 8, 6);
    },
    "dot"
  );
}

// ---- Destructible blocks (generated on demand, cached by size) -------------

const blockCache = new Set();

export function blockTextureKey(material, w, h) {
  return `blk_${material}_${w}x${h}`;
}

// 9-slice the Kenney block box (`block_<material>`, 140x140 with a ~26px
// border) into a crisp w×h texture, so blocks of any dimension keep their
// bevel/border undistorted. Falls back to a flat rounded rect if the source
// image somehow isn't loaded.
const SRC_INSET = 26;

export function ensureBlockTexture(scene, material, w, h) {
  const key = blockTextureKey(material, w, h);
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  if (blockCache.has(key) || scene.textures.exists(key)) {
    blockCache.add(key);
    return key;
  }

  const srcKey = "block_" + material;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  if (scene.textures.exists(srcKey)) {
    const src = scene.textures.get(srcKey).getSourceImage();
    const sw = src.width;
    const sh = src.height;
    const s = Math.min(SRC_INSET, Math.floor(sw / 2), Math.floor(sh / 2));
    const d = Math.min(s, Math.floor(w / 2), Math.floor(h / 2));
    const sMidW = sw - 2 * s;
    const sMidH = sh - 2 * s;
    const dMidW = w - 2 * d;
    const dMidH = h - 2 * d;
    const draw = (sx, sy, sWid, sHei, dx, dy, dWid, dHei) => {
      if (sWid <= 0 || sHei <= 0 || dWid <= 0 || dHei <= 0) return;
      ctx.drawImage(src, sx, sy, sWid, sHei, dx, dy, dWid, dHei);
    };
    // corners
    draw(0, 0, s, s, 0, 0, d, d);
    draw(sw - s, 0, s, s, w - d, 0, d, d);
    draw(0, sh - s, s, s, 0, h - d, d, d);
    draw(sw - s, sh - s, s, s, w - d, h - d, d, d);
    // edges
    draw(s, 0, sMidW, s, d, 0, dMidW, d);
    draw(s, sh - s, sMidW, s, d, h - d, dMidW, d);
    draw(0, s, s, sMidH, 0, d, d, dMidH);
    draw(sw - s, s, s, sMidH, w - d, d, d, dMidH);
    // center
    draw(s, s, sMidW, sMidH, d, d, dMidW, dMidH);
  } else {
    // fallback: flat coloured rounded rect
    const base = COLORS[MATERIALS[material].color];
    ctx.fillStyle = "#" + base.toString(16).padStart(6, "0");
    ctx.fillRect(0, 0, w, h);
  }

  scene.textures.addCanvas(key, canvas);
  blockCache.add(key);
  return key;
}

// ---- Scenery (clouds, bushes, jungle leaves) -------------------------------

export function buildSceneryTextures(scene) {
  // Fluffy cloud
  withGraphics(
    scene,
    240,
    110,
    (g) => {
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(70, 70, 42);
      g.fillCircle(120, 55, 52);
      g.fillCircle(175, 70, 40);
      g.fillCircle(100, 80, 46);
      g.fillCircle(150, 82, 42);
      g.fillStyle(0xeaf6ff, 0.9);
      g.fillRoundedRect(40, 78, 160, 26, 13);
    },
    "cloud"
  );

  // Rounded leafy bush (mid/foreground decor)
  withGraphics(
    scene,
    220,
    140,
    (g) => {
      const blob = (x, y, r, c) => {
        g.fillStyle(c, 1);
        g.fillCircle(x, y, r);
      };
      blob(60, 90, 46, COLORS.leafDark);
      blob(150, 95, 50, COLORS.leafDark);
      blob(105, 70, 54, COLORS.leafDark);
      blob(60, 84, 40, COLORS.leaf);
      blob(150, 88, 44, COLORS.leaf);
      blob(105, 62, 48, COLORS.leaf);
      blob(95, 52, 30, COLORS.leafLight);
      blob(140, 70, 24, COLORS.leafLight);
    },
    "bush"
  );

  // Big organic jungle leaf for framing the corners (base lower-left, tip
  // upper-right). Built as a lanceolate shape from a spine + width profile.
  withGraphics(
    scene,
    300,
    160,
    (g) => {
      const base = { x: 28, y: 140 };
      const tip = { x: 282, y: 26 };
      const dx = tip.x - base.x;
      const dy = tip.y - base.y;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      const px = -uy; // perpendicular
      const py = ux;
      const maxW = 40;
      const N = 28;
      const profile = (t) => Math.pow(Math.sin(Math.PI * t), 0.72) * maxW;

      const drawBlade = (inset, color) => {
        g.fillStyle(color, 1);
        g.beginPath();
        // top edge base->tip
        for (let i = 0; i <= N; i++) {
          const t = i / N;
          const cx = base.x + dx * t;
          const cy = base.y + dy * t;
          const w = Math.max(0, profile(t) - inset);
          const x = cx + px * w;
          const y = cy + py * w;
          i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        // bottom edge tip->base
        for (let i = N; i >= 0; i--) {
          const t = i / N;
          const cx = base.x + dx * t;
          const cy = base.y + dy * t;
          const w = Math.max(0, profile(t) - inset);
          g.lineTo(cx - px * w, cy - py * w);
        }
        g.closePath();
        g.fillPath();
      };

      drawBlade(0, COLORS.leafDark);
      drawBlade(4, COLORS.leaf);
      drawBlade(22, COLORS.leafLight); // lighter inner glow

      // midrib
      g.lineStyle(4, COLORS.leafDark, 0.85);
      g.beginPath();
      g.moveTo(base.x, base.y);
      g.lineTo(tip.x, tip.y);
      g.strokePath();
      // side veins
      g.lineStyle(2, COLORS.leafDark, 0.55);
      for (let t = 0.18; t < 0.92; t += 0.13) {
        const cx = base.x + dx * t;
        const cy = base.y + dy * t;
        const w = profile(t) * 0.9;
        for (const s of [1, -1]) {
          g.beginPath();
          g.moveTo(cx, cy);
          g.lineTo(cx + px * s * w + ux * 14, cy + py * s * w + uy * 14);
          g.strokePath();
        }
      }
      // short stem
      g.lineStyle(6, COLORS.leafDark, 1);
      g.beginPath();
      g.moveTo(base.x, base.y);
      g.lineTo(base.x - 18, base.y + 16);
      g.strokePath();
    },
    "leaf"
  );

  // Grass tuft for the ground edge
  withGraphics(
    scene,
    60,
    34,
    (g) => {
      g.fillStyle(COLORS.groundTopDark, 1);
      for (const [x, hh] of [[10, 26], [22, 32], [34, 28], [46, 22]]) {
        g.fillTriangle(x - 5, 34, x + 5, 34, x, 34 - hh);
      }
      g.fillStyle(COLORS.groundTop, 1);
      for (const [x, hh] of [[14, 24], [28, 30], [40, 24]]) {
        g.fillTriangle(x - 4, 34, x + 4, 34, x + 2, 34 - hh);
      }
    },
    "grasstuft"
  );
}

export function buildAllTextures(scene) {
  buildRatTextures(scene);
  // Enemy ("cat") is now a loaded image (Kenney alien), not procedural.
  buildSlingTexture(scene);
  buildPropTextures(scene);
  buildSceneryTextures(scene);
}
