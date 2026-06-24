// Small reusable UI helpers shared across scenes: jungle/sky background and
// chunky tappable "wooden" buttons sized for touch.

import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y, COLORS } from "./constants.js";

// Paints a layered, parallax jungle scene: 3-stop sky, sun, clouds, rolling
// hills, textured ground with grass tufts + bushes, and corner foliage — all
// at negative depths so gameplay/UI draws on top. Layers use scrollFactor for
// parallax as the camera pans in the Game scene.
export function drawBackground(scene, withGround = true) {
  const W = GAME_WIDTH;
  const H = GAME_HEIGHT;
  const lerp = (a, b, t) => {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(a),
      Phaser.Display.Color.IntegerToColor(b),
      100,
      t * 100
    );
    return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
  };

  // --- sky (3-stop gradient) ---
  const sky = scene.add.graphics().setScrollFactor(0).setDepth(-50);
  const bands = 48;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const col =
      t < 0.5
        ? lerp(COLORS.skyTop, COLORS.skyMid, t / 0.5)
        : lerp(COLORS.skyMid, COLORS.skyBottom, (t - 0.5) / 0.5);
    sky.fillStyle(col, 1);
    sky.fillRect(0, (H * i) / bands, W, H / bands + 1);
  }

  // --- sun glow ---
  const sun = scene.add.graphics().setScrollFactor(0.1).setDepth(-48);
  sun.fillStyle(0xfff4c2, 0.16);
  sun.fillCircle(W * 0.74, 150, 175);
  sun.fillStyle(0xfff7d2, 0.3);
  sun.fillCircle(W * 0.74, 150, 110);
  sun.fillStyle(0xfffae0, 0.55);
  sun.fillCircle(W * 0.74, 150, 62);

  // --- clouds ---
  [
    [170, 120, 0.95, 0.18],
    [520, 86, 0.7, 0.22],
    [840, 150, 1.05, 0.2],
    [1120, 96, 0.8, 0.26],
  ].forEach(([x, y, s, sf]) =>
    scene.add.image(x, y, "cloud").setScale(s).setScrollFactor(sf).setDepth(-46).setAlpha(0.95)
  );

  // --- rolling hills (far + mid), drawn extra-wide for panning ---
  const hills = (color, baseY, amp, freq, sf, depth) => {
    const g = scene.add.graphics().setScrollFactor(sf).setDepth(depth);
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(-600, H + 50);
    for (let x = -600; x <= W + 3000; x += 40) {
      g.lineTo(x, baseY + Math.sin(x * freq + baseY) * amp);
    }
    g.lineTo(W + 3000, H + 50);
    g.closePath();
    g.fillPath();
  };
  hills(COLORS.hillFar, GROUND_Y - 110, 46, 0.0042, 0.4, -44);
  hills(COLORS.hillMid, GROUND_Y - 52, 36, 0.0061, 0.6, -42);

  let result;
  if (withGround) {
    const gr = scene.add.graphics().setDepth(-2); // scrollFactor 1 -> moves with world
    gr.fillStyle(COLORS.ground, 1);
    gr.fillRect(-2000, GROUND_Y, W + 6000, H);
    gr.fillStyle(COLORS.groundDark, 1);
    gr.fillRect(-2000, GROUND_Y + 74, W + 6000, H);
    gr.fillStyle(COLORS.groundTopDark, 1);
    gr.fillRect(-2000, GROUND_Y, W + 6000, 18);
    gr.fillStyle(COLORS.groundTop, 1);
    gr.fillRect(-2000, GROUND_Y, W + 6000, 10);
    gr.fillStyle(COLORS.pebble, 0.5);
    for (let x = -120; x < W + 1800; x += 84) {
      gr.fillCircle(x + ((x * 37) % 46), GROUND_Y + 32 + ((x * 13) % 38), 4);
    }
    result = gr;

    // bushes (behind structures, mild parallax) + grass tufts on the surface
    [-40, 380, 800, 1240, 1660, 2080].forEach((x, i) =>
      scene.add
        .image(x, GROUND_Y + 12, "bush")
        .setOrigin(0.5, 1)
        .setScale(0.75 + (i % 2) * 0.22)
        .setScrollFactor(0.85)
        .setDepth(-3)
    );
    for (let x = -100; x < W + 1900; x += 116) {
      scene.add.image(x, GROUND_Y + 3, "grasstuft").setOrigin(0.5, 1).setDepth(-1).setAlpha(0.9);
    }
  } else {
    const gr = scene.add.graphics().setScrollFactor(0).setDepth(-2);
    gr.fillStyle(COLORS.ground, 1);
    gr.fillRect(0, H - 46, W, 46);
    gr.fillStyle(COLORS.groundTopDark, 1);
    gr.fillRect(0, H - 46, W, 14);
    gr.fillStyle(COLORS.groundTop, 1);
    gr.fillRect(0, H - 46, W, 8);
    result = gr;
  }

  // --- corner foliage frame (fixed) ---
  scene.add.image(-24, -14, "leaf").setOrigin(0, 0).setScale(1.05).setFlipX(true).setScrollFactor(0).setDepth(-1);
  scene.add.image(W + 24, -14, "leaf").setOrigin(1, 0).setScale(1.05).setScrollFactor(0).setDepth(-1);

  return result;
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
