// Small reusable UI helpers shared across scenes: jungle/sky background and
// chunky tappable "wooden" buttons sized for touch.

import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y, COLORS } from "./constants.js";

// Illustrated parallax scenery from three 2560x1440 layers: a fixed sky, a
// far foliage layer, and a near grass/dirt ground whose grass line is aligned
// to GROUND_Y. The far + ground layers are infinite tile-sprites scrolled via
// tilePositionX so they work for any level width and pan with the camera.
const BG_SCALE = GAME_WIDTH / 2560; // 0.5 — show the 2560-wide art at viewport width
// Land the near grass mat (texture row ~1022) on GROUND_Y so objects sit on it.
const GROUND_LAYER_TOP = 137;
// Tuck the far layer's solid band (its hard top edge, texture row ~969) down to
// the horizon so it hides behind the near ground — only the foliage peeks up.
const FAR_LAYER_TOP = 164;

export function drawBackground(scene) {
  const W = GAME_WIDTH;
  const H = GAME_HEIGHT;

  // sky — fixed full-screen backdrop
  scene.add
    .image(0, 0, "bg_sky")
    .setOrigin(0, 0)
    .setDisplaySize(W, H)
    .setScrollFactor(0)
    .setDepth(-50);

  // far foliage — slow parallax; positioned so its solid band tucks behind the
  // near ground and only the foliage silhouette shows above the horizon
  const far = scene.add
    .tileSprite(0, FAR_LAYER_TOP, W, H - FAR_LAYER_TOP + 120, "bg_far")
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(-44);
  far.setTileScale(BG_SCALE);

  // near ground (grass + dirt + treeline) — moves with the world; grass on GROUND_Y
  const ground = scene.add
    .tileSprite(0, GROUND_LAYER_TOP, W, H - GROUND_LAYER_TOP + 120, "bg_close")
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(-2);
  ground.setTileScale(BG_SCALE);

  const cam = scene.cameras.main;
  const onUpdate = () => {
    far.tilePositionX = (cam.scrollX * 0.4) / BG_SCALE;
    ground.tilePositionX = (cam.scrollX * 1.0) / BG_SCALE;
  };
  scene.events.on("update", onUpdate);
  scene.events.once("shutdown", () => scene.events.off("update", onUpdate));

  return ground;
}

// A chunky, juicy tappable button. onClick fires on tap/click.
// opts: width, height, fontSize, color, dark, glow (hex outer glow), pulse
// (bool, gentle breathing scale), stroke (text stroke hex), disabled.
// Returns the container.
export function makeButton(scene, x, y, label, onClick, opts = {}) {
  const w = opts.width || 260;
  const h = opts.height || 78;
  const fontSize = opts.fontSize || 30;
  const color = opts.color || COLORS.wood;
  const dark = opts.dark || COLORS.woodDark;
  const r = Math.min(20, h / 3);

  const c = scene.add.container(x, y);
  const g = scene.add.graphics();

  // optional soft outer glow (drawn first, behind)
  if (opts.glow) {
    g.fillStyle(opts.glow, 0.22);
    g.fillRoundedRect(-w / 2 - 10, -h / 2 - 6, w + 20, h + 22, r + 8);
    g.fillStyle(opts.glow, 0.16);
    g.fillRoundedRect(-w / 2 - 5, -h / 2 - 3, w + 10, h + 16, r + 5);
  }
  // drop shadow
  g.fillStyle(0x000000, 0.22);
  g.fillRoundedRect(-w / 2, -h / 2 + 8, w, h, r);
  // 3D base (depth)
  g.fillStyle(dark, 1);
  g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);
  // face
  g.fillStyle(color, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  // top gloss highlight
  g.fillStyle(0xffffff, 0.22);
  g.fillRoundedRect(-w / 2 + 6, -h / 2 + 5, w - 12, h * 0.36, r - 4);
  // bottom inner shade
  g.fillStyle(0x000000, 0.1);
  g.fillRoundedRect(-w / 2 + 6, h / 2 - h * 0.26, w - 12, h * 0.2, r - 6);
  c.add(g);

  const t = scene.add
    .text(0, 0, label, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${fontSize}px`,
      fontStyle: "900",
      color: "#fff8e6",
      resolution: 2, // render text at 2x for crisp edges on high-DPI screens
    })
    .setOrigin(0.5);
  t.setStroke(opts.stroke || "#5a3a1a", Math.max(5, fontSize * 0.2));
  t.setShadow(0, 3, "#00000055", 4);
  c.add(t);

  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on("pointerdown", () => {
    scene.tweens.add({ targets: c, scaleX: 0.94, scaleY: 0.9, duration: 80, yoyo: true });
    if (onClick) onClick();
  });
  if (opts.pulse) {
    scene.tweens.add({
      targets: c,
      scale: 1.05,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }
  if (opts.disabled) {
    c.disableInteractive();
    c.setAlpha(0.5);
  }
  return c;
}

// Renders up to 3 stars (filled vs empty) centered at x,y.
export function drawStars(scene, x, y, filled, size = 44, gap = 6) {
  const c = scene.add.container(x, y);
  for (let i = 0; i < 3; i++) {
    const s = scene.add
      .image((i - 1) * (size + gap), i === 1 ? -size * 0.18 : 0, i < filled ? "star" : "star_empty")
      .setDisplaySize(size, size);
    c.add(s);
  }
  return c;
}
