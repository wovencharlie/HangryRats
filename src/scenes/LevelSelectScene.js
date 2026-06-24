import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from "../constants.js";
import { drawBackground, makeButton, drawStars } from "../ui.js";
import { LEVELS, LEVEL_COUNT } from "../levels.js";
import { Progress } from "../progress.js";

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("LevelSelect");
  }

  create() {
    drawBackground(this, true);

    this.add
      .text(GAME_WIDTH / 2, 70, "SELECT LEVEL", {
        fontFamily: "system-ui",
        fontSize: "56px",
        fontStyle: "900",
        color: "#fff8e6",
      })
      .setOrigin(0.5)
      .setStroke("#5a3a1a", 8);

    // Back button
    makeButton(this, 110, 60, "‹ Menu", () => this.scene.start("Menu"), {
      width: 170,
      height: 60,
      fontSize: 26,
    });

    // 5 x 2 grid of level tiles
    const cols = 5;
    const rows = Math.ceil(LEVEL_COUNT / cols);
    const tileW = 180;
    const tileH = 180;
    const gapX = 30;
    const gapY = 40;
    const gridW = cols * tileW + (cols - 1) * gapX;
    const startX = (GAME_WIDTH - gridW) / 2 + tileW / 2;
    const startY = 230;

    for (let i = 0; i < LEVEL_COUNT; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (tileW + gapX);
      const y = startY + row * (tileH + gapY);
      this.makeTile(x, y, i, tileW, tileH);
    }

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, `Total stars: ${Progress.totalStars()} / ${LEVEL_COUNT * 3}`, {
        fontFamily: "system-ui",
        fontSize: "24px",
        color: "#fff8e6",
      })
      .setOrigin(0.5)
      .setAlpha(0.9);
  }

  makeTile(x, y, index, w, h) {
    const unlocked = Progress.isUnlocked(index);
    const stars = Progress.starsFor(index);

    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(unlocked ? COLORS.woodDark : 0x3a3a42, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 18);
    g.fillStyle(unlocked ? COLORS.wood : 0x55555f, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h - 4, 18);
    g.fillStyle(0xffffff, 0.15);
    g.fillRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h * 0.3, 12);
    c.add(g);

    const num = this.add
      .text(0, -28, `${index + 1}`, {
        fontFamily: "system-ui",
        fontSize: "70px",
        fontStyle: "900",
        color: unlocked ? "#fff8e6" : "#8a8a92",
      })
      .setOrigin(0.5)
      .setStroke("#5a3a1a", unlocked ? 6 : 0);
    c.add(num);

    if (unlocked) {
      const name = this.add
        .text(0, 30, LEVELS[index].name, {
          fontFamily: "system-ui",
          fontSize: "18px",
          fontStyle: "700",
          color: "#fff8e6",
          align: "center",
          wordWrap: { width: w - 20 },
        })
        .setOrigin(0.5);
      c.add(name);
      c.add(drawStars(this, 0, 66, stars, 30, 4));

      c.setSize(w, h);
      c.setInteractive({ useHandCursor: true });
      c.on("pointerdown", () => {
        this.tweens.add({ targets: c, scale: 0.95, duration: 70, yoyo: true });
        this.time.delayedCall(90, () =>
          this.scene.start("Game", { levelIndex: index })
        );
      });
    } else {
      // padlock
      const lock = this.add.graphics();
      lock.fillStyle(0x2a2a30, 1);
      lock.fillRoundedRect(-22, 28, 44, 36, 6);
      lock.lineStyle(8, 0x2a2a30, 1);
      lock.beginPath();
      lock.arc(0, 30, 16, Math.PI, 0);
      lock.strokePath();
      c.add(lock);
    }
  }
}
