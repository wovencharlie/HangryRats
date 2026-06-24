import Phaser from "phaser";
import { buildAllTextures } from "../textures.js";

// Loads the illustrated art (Kenney CC0 blocks/debris/enemy + an optional
// owner-supplied rat), generates the remaining textures procedurally, then
// hands off to the wallet gate.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // 9-slice source boxes for destructible blocks
    this.load.image("block_wood", "art/blocks/wood.png");
    this.load.image("block_stone", "art/blocks/stone.png");
    this.load.image("block_glass", "art/blocks/glass.png");
    // enemy creature (+ a "hurt" colour)
    this.load.image("cat", "art/enemy.png");
    this.load.image("cat_hurt", "art/enemy_hurt.png");
    // break-debris particles
    for (const m of ["wood", "stone", "glass"]) {
      for (const n of [1, 2, 3]) {
        this.load.image(`debris_${m}_${n}`, `art/debris/${m}_${n}.png`);
      }
    }
    // NOTE: the rat projectile is still the procedural placeholder. Drop a
    // transparent rat PNG at public/art/characters/rat.png and ping me — I'll
    // wire it in (display sizing differs per use, so it needs a small pass).
  }

  create() {
    buildAllTextures(this);
    this.scene.start("Connect");
  }
}
