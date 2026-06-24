import Phaser from "phaser";
import { buildAllTextures } from "../textures.js";

// Generates every texture procedurally, then hands off to the menu.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    buildAllTextures(this);
    this.scene.start("Menu");
  }
}
