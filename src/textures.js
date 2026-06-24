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

export function ensureBlockTexture(scene, material, w, h) {
  const key = blockTextureKey(material, w, h);
  if (blockCache.has(key) || scene.textures.exists(key)) {
    blockCache.add(key);
    return key;
  }
  const mat = MATERIALS[material];
  const base = COLORS[mat.color];
  const dark = COLORS[mat.dark];
  withGraphics(
    scene,
    w,
    h,
    (g) => {
      g.fillStyle(dark, 1);
      g.fillRoundedRect(0, 0, w, h, 6);
      g.fillStyle(base, 1);
      g.fillRoundedRect(2, 2, w - 4, h - 4, 5);
      // highlight + texture lines depending on material
      g.fillStyle(0xffffff, material === "glass" ? 0.18 : 0.1);
      g.fillRoundedRect(4, 4, w - 8, Math.max(4, h * 0.22), 4);
      if (material === "wood") {
        g.lineStyle(2, dark, 0.5);
        for (let x = 12; x < w - 6; x += 16) {
          g.beginPath();
          g.moveTo(x, 4);
          g.lineTo(x, h - 4);
          g.strokePath();
        }
      } else if (material === "stone") {
        g.lineStyle(2, dark, 0.6);
        g.strokeRect(6, h / 2, w - 12, 0.5);
      }
    },
    key
  );
  blockCache.add(key);
  return key;
}

export function buildAllTextures(scene) {
  buildRatTextures(scene);
  buildEnemyTextures(scene);
  buildSlingTexture(scene);
  buildPropTextures(scene);
}
