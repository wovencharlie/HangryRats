import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from "../constants.js";
import { drawBackground, makeButton } from "../ui.js";
import { Progress } from "../progress.js";
import { LEVEL_COUNT } from "../levels.js";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    drawBackground(this, true);

    // Title
    const title = this.add.container(GAME_WIDTH / 2, 200);
    const hangry = this.add
      .text(0, -60, "HANGRY", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "120px",
        fontStyle: "900",
        color: "#ffd23f",
      })
      .setOrigin(0.5);
    hangry.setStroke("#7a4a12", 14);
    const rats = this.add
      .text(0, 56, "RATS", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "120px",
        fontStyle: "900",
        color: "#7fd4ff",
      })
      .setOrigin(0.5);
    rats.setStroke("#14506e", 14);
    title.add([hangry, rats]);

    this.tweens.add({
      targets: title,
      y: 215,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    // A hero rat riding a slingshot, bobbing.
    const sling = this.add.image(GAME_WIDTH / 2 - 150, 470, "sling").setScale(1.1);
    const hero = this.add.image(GAME_WIDTH / 2 - 150, 430, "rat_gray").setScale(1.4);
    this.tweens.add({
      targets: hero,
      angle: { from: -6, to: 6 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    // a couple of flying rats
    const flyer = this.add.image(GAME_WIDTH / 2 + 220, 380, "rat_brown").setScale(1.1);
    this.tweens.add({
      targets: flyer,
      x: GAME_WIDTH / 2 + 320,
      y: 300,
      angle: 360,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    // Tagline
    this.add
      .text(GAME_WIDTH / 2, 560, "LAUNCH.  SMASH.  TAKE OVER!", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "30px",
        fontStyle: "900",
        color: "#fff8e6",
      })
      .setOrigin(0.5)
      .setStroke("#5a3a1a", 6);

    // Play button
    makeButton(
      this,
      GAME_WIDTH / 2,
      640,
      "▶  PLAY",
      () => this.scene.start("LevelSelect"),
      { width: 320, height: 92, fontSize: 40 }
    );

    // progress note
    this.add
      .text(
        GAME_WIDTH - 20,
        GAME_HEIGHT - 18,
        `Stars: ${Progress.totalStars()} / ${LEVEL_COUNT * 3}`,
        { fontFamily: "system-ui", fontSize: "20px", color: "#fff8e6" }
      )
      .setOrigin(1, 1)
      .setAlpha(0.85);

    this.checkOrientation();
    this.scale.on("resize", () => this.checkOrientation());
  }

  // Show a gentle "rotate your device" hint when held in a tall portrait
  // aspect on a phone (the game is designed landscape).
  checkOrientation() {
    const isPortrait = window.innerHeight > window.innerWidth * 1.05;
    if (isPortrait && !this.rotateHint) {
      this.rotateHint = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT - 70, "↻  Rotate your device for the best view", {
          fontFamily: "system-ui",
          fontSize: "22px",
          color: "#fff",
          backgroundColor: "#00000066",
          padding: { x: 12, y: 6 },
        })
        .setOrigin(0.5);
    } else if (!isPortrait && this.rotateHint) {
      this.rotateHint.destroy();
      this.rotateHint = null;
    }
  }
}
