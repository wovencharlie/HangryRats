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
    // parallax scenery layers (2560x1440 each)
    this.load.image("bg_sky", "art/bg/sky.png");
    this.load.image("bg_far", "art/bg/hills_far.png");
    this.load.image("bg_close", "art/bg/hills_close.png");
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
    // Owner-supplied rat projectile. If present, buildRatTextures() bakes it
    // into each rat type at the right size; otherwise it falls back to the
    // procedural rat.
    this.load.image("rat_custom", "art/characters/rat.png");
  }

  create() {
    buildAllTextures(this);
    this.scene.start("Connect");
  }
}
