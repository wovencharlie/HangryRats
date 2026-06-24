// Small reusable UI helpers shared across scenes: jungle/sky background and
// chunky tappable "wooden" buttons sized for touch.

import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y, COLORS } from "./constants.js";

// Paints a sky gradient + ground strip + a few decorative jungle leaves.
// Returns the container so callers can ignore it.
export function drawBackground(scene, withGround = true) {
  const g = scene.add.graphics();
  // sky gradient (approximated with horizontal bands)
  const bands = 32;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(COLORS.skyTop),
      Phaser.Display.Color.IntegerToColor(COLORS.skyBottom),
      bands - 1,
      i
    );
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, (GAME_HEIGHT * i) / bands, GAME_WIDTH, GAME_HEIGHT / bands + 1);
  }
  g.setScrollFactor(0);

  // sun glow
  const sun = scene.add.graphics().setScrollFactor(0.2);
  sun.fillStyle(0xfff6c8, 0.25);
  sun.fillCircle(GAME_WIDTH * 0.7, 160, 150);
  sun.fillStyle(0xfff6c8, 0.4);
  sun.fillCircle(GAME_WIDTH * 0.7, 160, 90);

  if (withGround) {
    const gr = scene.add.graphics();
    gr.fillStyle(COLORS.ground, 1);
    gr.fillRect(-2000, GROUND_Y, GAME_WIDTH + 6000, GAME_HEIGHT);
    gr.fillStyle(COLORS.groundTopDark, 1);
    gr.fillRect(-2000, GROUND_Y, GAME_WIDTH + 6000, 14);
    gr.fillStyle(COLORS.groundTop, 1);
    gr.fillRect(-2000, GROUND_Y, GAME_WIDTH + 6000, 8);
    return gr;
  }
  return g;
}

// A chunky wooden button. onClick fires on tap/click. Returns the container.
export function makeButton(scene, x, y, label, onClick, opts = {}) {
  const w = opts.width || 260;
  const h = opts.height || 78;
  const fontSize = opts.fontSize || 30;
  const color = opts.color || COLORS.wood;
  const dark = opts.dark || COLORS.woodDark;

  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(dark, 1);
  g.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 16);
  g.fillStyle(color, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h - 4, 16);
  g.fillStyle(0xffffff, 0.18);
  g.fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h * 0.32, 10);
  c.add(g);

  const t = scene.add
    .text(0, -2, label, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${fontSize}px`,
      fontStyle: "900",
      color: "#fff8e6",
    })
    .setOrigin(0.5);
  t.setStroke("#5a3a1a", 6);
  c.add(t);

  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on("pointerdown", () => {
    scene.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true });
    if (onClick) onClick();
  });
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
