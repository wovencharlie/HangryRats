import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y, COLORS } from "../constants.js";
import { drawBackground, makeButton } from "../ui.js";
import { ensureBlockTexture } from "../textures.js";
import { Progress } from "../progress.js";
import { LEVEL_COUNT } from "../levels.js";
import { Sfx, unlockAudio, isMuted, setMuted } from "../sfx.js";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    const W = GAME_WIDTH;
    drawBackground(this, true);
    this.unlockOnFirstTap();

    // drifting clouds for life
    this.add.image(320, 130, "cloud").setScale(0.9).setAlpha(0.9).setDepth(-45);
    this.driftCloud(900, 110, 1.05);
    this.driftCloud(1130, 200, 0.7);

    this.buildHeroScene();
    this.buildTitle();

    // tagline on a small ribbon
    this.add
      .text(W / 2, 296, "LAUNCH  •  SMASH  •  TAKE OVER!", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "26px",
        fontStyle: "900",
        color: "#fff8e6",
      })
      .setOrigin(0.5)
      .setStroke("#5a3a1a", 5)
      .setShadow(0, 2, "#00000055", 3)
      .setDepth(20);

    // --- buttons ---
    makeButton(this, W / 2, 410, "▶  PLAY", () => this.startGame(), {
      width: 360,
      height: 104,
      fontSize: 44,
      color: 0x55c247,
      dark: 0x2f7a2a,
      glow: 0xaff0a0,
      pulse: true,
      stroke: "#1f5a1a",
    }).setDepth(25);

    makeButton(this, W / 2 - 134, 512, "LEVELS", () => this.go("LevelSelect"), {
      width: 240,
      height: 70,
      fontSize: 30,
    }).setDepth(25);

    makeButton(this, W / 2 + 134, 512, "🏆 RANKS", () => this.go("Leaderboard"), {
      width: 240,
      height: 70,
      fontSize: 30,
      color: 0xe0a93c,
      dark: 0xa9761f,
    }).setDepth(25);

    this.buildStarsPlaque();
    this.buildMuteButton();

    this.checkOrientation();
    this.scale.on("resize", () => this.checkOrientation());
  }

  // ---------------------------------------------------------------- title ----

  buildTitle() {
    const cx = GAME_WIDTH / 2;
    const title = this.add.container(cx, 150).setDepth(20);

    // soft dark glow behind for legibility against the sky
    const glow = this.add.graphics();
    glow.fillStyle(0x0a2238, 0.22);
    glow.fillEllipse(0, 10, 760, 280);
    glow.fillStyle(0x0a2238, 0.18);
    glow.fillEllipse(0, 10, 620, 220);
    title.add(glow);

    const mk = (txt, y, color, stroke, rot) => {
      const t = this.add
        .text(0, y, txt, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "118px",
          fontStyle: "900",
          color,
        })
        .setOrigin(0.5)
        .setAngle(rot);
      t.setStroke(stroke, 16);
      t.setShadow(0, 8, "#00000066", 10, true, true);
      title.add(t);
      return t;
    };
    mk("HANGRY", -52, "#ffd23f", "#7a4a12", -3);
    mk("RATS", 54, "#7fd4ff", "#14506e", 2);

    // gentle breathing bob
    this.tweens.add({
      targets: title,
      y: 162,
      scale: 1.02,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  // ----------------------------------------------------------- hero scene ----

  buildHeroScene() {
    // Hero rat loaded in a slingshot, lower-left, with a stretched band.
    const ax = 250;
    const ay = GROUND_Y - 120;
    const sling = this.add.image(ax, ay + 79, "sling").setScale(1.1).setDepth(3);
    const rat = this.add.image(ax - 30, ay + 18, "rat_gray").setScale(1.35).setDepth(7);
    rat.setRotation(0.5);

    const band = this.add.graphics().setDepth(4);
    const drawBand = () => {
      band.clear();
      band.lineStyle(10, COLORS.band, 1);
      band.beginPath();
      band.moveTo(ax - 22, ay + 4);
      band.lineTo(rat.x, rat.y);
      band.strokePath();
      band.lineStyle(10, 0x7a1a14, 1);
      band.beginPath();
      band.moveTo(ax + 24, ay);
      band.lineTo(rat.x, rat.y);
      band.strokePath();
    };
    drawBand();
    this.tweens.add({
      targets: rat,
      x: ax - 38,
      y: ay + 26,
      angle: 18,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
      onUpdate: drawBand,
    });

    // The cats' little junk pile + a couple of lurking cats, lower-right.
    const baseX = 1060;
    const k1 = ensureBlockTexture(this, "wood", 80, 80);
    const k2 = ensureBlockTexture(this, "stone", 90, 70);
    this.add.image(baseX, GROUND_Y - 35, k2).setDepth(4);
    this.add.image(baseX, GROUND_Y - 110, k1).setDepth(4);
    this.add.image(baseX + 96, GROUND_Y - 40, k1).setDepth(4);

    const cat1 = this.add.image(baseX, GROUND_Y - 178, "cat").setDepth(6);
    const cat2 = this.add.image(baseX + 96, GROUND_Y - 108, "cat").setDepth(6);
    [cat1, cat2].forEach((c, i) =>
      this.tweens.add({
        targets: c,
        angle: { from: -5, to: 5 },
        duration: 900 + i * 250,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      })
    );

    // a brown rat that periodically flies across in a happy arc
    this.launchFlyer();
  }

  launchFlyer() {
    const flyer = this.add.image(330, GROUND_Y - 150, "rat_brown").setScale(1.0).setDepth(8);
    flyer.setAlpha(0);
    const fire = () => {
      flyer.setPosition(330, GROUND_Y - 150).setAlpha(1).setAngle(0);
      this.tweens.add({
        targets: flyer,
        x: 980,
        angle: 540,
        duration: 1500,
        ease: "Quad.in",
        onComplete: () => flyer.setAlpha(0),
      });
      this.tweens.add({
        targets: flyer,
        y: GROUND_Y - 360,
        duration: 750,
        yoyo: true,
        ease: "Sine.out",
      });
    };
    this.time.addEvent({ delay: 4200, loop: true, callback: fire });
    this.time.delayedCall(1200, fire);
  }

  driftCloud(x, y, scale) {
    const cloud = this.add.image(x, y, "cloud").setScale(scale).setAlpha(0.92).setDepth(-45);
    this.tweens.add({
      targets: cloud,
      x: x + 60,
      duration: 9000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  // ---------------------------------------------------------- side widgets ---

  buildStarsPlaque() {
    const total = Progress.totalStars();
    const max = LEVEL_COUNT * 3;
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 52).setDepth(25);
    const w = 250;
    const h = 56;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.2);
    g.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 16);
    g.fillStyle(COLORS.woodDark, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 16);
    g.fillStyle(COLORS.wood, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h - 3, 16);
    g.fillStyle(0xffffff, 0.16);
    g.fillRoundedRect(-w / 2 + 6, -h / 2 + 5, w - 12, h * 0.32, 10);
    c.add(g);
    c.add(this.add.image(-w / 2 + 38, 0, "star").setDisplaySize(40, 40));
    c.add(
      this.add
        .text(14, 0, `${total} / ${max}`, {
          fontFamily: "system-ui",
          fontSize: "30px",
          fontStyle: "900",
          color: "#fff8e6",
        })
        .setOrigin(0.5)
        .setStroke("#5a3a1a", 5)
    );
  }

  buildMuteButton() {
    this.muteBtn = makeButton(
      this,
      GAME_WIDTH - 56,
      56,
      isMuted() ? "🔇" : "🔊",
      () => {
        setMuted(!isMuted());
        this.muteBtn.list[1].setText(isMuted() ? "🔇" : "🔊");
        if (!isMuted()) Sfx.tap();
      },
      { width: 72, height: 64, fontSize: 30 }
    ).setDepth(30);
  }

  // ------------------------------------------------------------- helpers -----

  unlockOnFirstTap() {
    this.input.once("pointerdown", () => unlockAudio());
  }

  startGame() {
    unlockAudio();
    Sfx.tap();
    this.go("LevelSelect");
  }

  go(scene) {
    this.cameras.main.fadeOut(180, 11, 31, 51);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(scene));
  }

  checkOrientation() {
    const isPortrait = window.innerHeight > window.innerWidth * 1.05;
    if (isPortrait && !this.rotateHint) {
      this.rotateHint = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT - 110, "↻  Rotate your device for the best view", {
          fontFamily: "system-ui",
          fontSize: "22px",
          color: "#fff",
          backgroundColor: "#00000077",
          padding: { x: 12, y: 6 },
        })
        .setOrigin(0.5)
        .setDepth(40);
    } else if (!isPortrait && this.rotateHint) {
      this.rotateHint.destroy();
      this.rotateHint = null;
    }
  }
}
