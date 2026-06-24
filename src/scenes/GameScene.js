import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_Y,
  SLING,
  COLORS,
  MATERIALS,
  RAT_TYPES,
  LAUNCH,
  SCORE,
} from "../constants.js";
import { LEVELS, LEVEL_COUNT } from "../levels.js";
import { ensureBlockTexture } from "../textures.js";
import { makeButton, drawStars } from "../ui.js";
import { drawBackground } from "../ui.js";
import { Progress } from "../progress.js";
import { submitScore, getSubmittedHigh } from "../api.js";
import { Sfx, unlockAudio, isMuted, setMuted } from "../sfx.js";

// The launch point sits low (close to the ground) so the natural arc passes
// through ground-level and short structures instead of sailing over them.
const ANCHOR = { x: SLING.x, y: 560 };

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  init(data) {
    this.levelIndex = data.levelIndex ?? 0;
    this.level = LEVELS[this.levelIndex];
  }

  create() {
    this.worldWidth = this.level.worldWidth || GAME_WIDTH;

    // ---- state ----
    this.state = "aiming"; // aiming | dragging | flying | ended
    this.ammo = [...this.level.rats];
    this.ammoIndex = 0;
    this.flying = [];
    this.enemies = new Set();
    this.score = 0;
    this.blocksDestroyed = 0;
    this.enemiesKilled = 0;
    this.heldRat = null;
    this.dragging = false;
    this.turnTimer = 0;
    this.primaryRat = null;
    // Clear stale GameObject refs from a previous run of this reused scene
    // instance so updateHud() never touches a destroyed/recycled object.
    this.scoreText = null;
    this.titleText = null;
    this.ammoContainer = null;
    this.hud = null;

    drawBackground(this, true);

    // ---- physics world ----
    this.matter.world.setBounds(
      -200,
      -2000,
      this.worldWidth + 600,
      GAME_HEIGHT + 2400,
      200,
      true,
      true,
      false,
      true
    );
    // ground body (its top edge at GROUND_Y)
    this.matter.add.rectangle(
      this.worldWidth / 2,
      GROUND_Y + 400,
      this.worldWidth + 4000,
      800,
      { isStatic: true, friction: 1, label: "ground" }
    );

    // camera
    this.cameras.main.setBounds(0, 0, Math.max(this.worldWidth, GAME_WIDTH), GAME_HEIGHT);
    this.cameras.main.setScroll(0, 0);

    // ---- build level ----
    this.buildStructures();
    this.buildEnemies();
    this.buildSlingshot();

    // band graphics (rubber) drawn each frame while aiming/dragging
    this.bandBack = this.add.graphics().setDepth(4);
    this.bandFront = this.add.graphics().setDepth(8);
    this.trajectory = this.add.graphics().setDepth(6);

    // HUD must exist before loadNextRat(), which calls updateHud().
    this.buildHud();
    this.loadNextRat();

    // ---- input ----
    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);
    this.input.on("pointerupoutside", this.onPointerUp, this);

    // ---- collisions ----
    this.matter.world.on("collisionstart", this.onCollision, this);

    // intro hint
    this.showToast(this.level.hint, 2600);
  }

  // ---------------------------------------------------------------- build ----

  buildStructures() {
    for (const s of this.level.structures) {
      const mat = MATERIALS[s.material];
      const key = ensureBlockTexture(this, s.material, s.w, s.h);
      const block = this.matter.add.image(s.x, s.y, key, null, {
        density: mat.density,
        restitution: mat.restitution,
        friction: mat.friction,
        frictionStatic: 1,
        chamfer: { radius: 3 },
        label: "block",
      });
      if (s.angle) block.setAngle(s.angle);
      block.setDepth(5);
      block.setData("kind", "block");
      block.setData("material", s.material);
      block.setData("hp", mat.hp);
      block.setData("maxHp", mat.hp);
    }
  }

  buildEnemies() {
    for (const e of this.level.enemies) {
      const scale = e.scale || 1;
      const r = 28 * scale;
      const cat = this.matter.add.image(e.x, e.y, "cat", null, {
        shape: { type: "circle", radius: r },
        density: 0.0012,
        restitution: 0.25,
        friction: 0.6,
        frictionAir: 0.01,
        label: "enemy",
      });
      cat.setScale(scale);
      cat.setDepth(6);
      cat.setData("kind", "enemy");
      cat.setData("hp", 32);
      cat.setData("maxHp", 32);
      this.enemies.add(cat);
    }
  }

  buildSlingshot() {
    // The fork stands on the ground; its arms reach up to ANCHOR. The texture
    // is 170px tall with the fork arms near the top, so centering it at
    // ANCHOR.y + 79 puts the tips at the rat.
    this.slingImg = this.add.image(SLING.x, ANCHOR.y + 79, "sling").setScale(1.05).setDepth(3);
    // fork tip anchor points for the rubber band
    this.tipBack = { x: SLING.x - 22, y: ANCHOR.y + 6 };
    this.tipFront = { x: SLING.x + 24, y: ANCHOR.y + 2 };
  }

  // ----------------------------------------------------------------- rats ----

  loadNextRat() {
    if (this.ammoIndex >= this.ammo.length) return;
    const typeKey = this.ammo[this.ammoIndex];
    const type = RAT_TYPES[typeKey];
    this.heldType = type;
    this.heldRat = this.add
      .image(ANCHOR.x, ANCHOR.y, "rat_" + typeKey)
      .setDepth(7);
    this.heldRat.setScale(0); // pop-in
    this.tweens.add({ targets: this.heldRat, scale: 1, duration: 220, ease: "Back.out" });
    this.state = "aiming";
    this.updateHud();
    this.drawBand(ANCHOR.x, ANCHOR.y);
  }

  // --------------------------------------------------------------- input -----

  // Was this pointer event over the top HUD strip? (so we don't hijack button taps)
  inHudStrip(pointer) {
    return pointer.y < 84;
  }

  onPointerDown(pointer) {
    unlockAudio();
    if (this.state === "flying") {
      this.tryAbility();
      return;
    }
    if (this.state !== "aiming" || !this.heldRat) return;
    if (this.inHudStrip(pointer)) return;
    this.dragging = true;
    this.state = "dragging";
    this.onPointerMove(pointer);
  }

  onPointerMove(pointer) {
    if (!this.dragging || !this.heldRat) return;
    const wx = pointer.worldX;
    const wy = pointer.worldY;
    let dx = wx - ANCHOR.x;
    let dy = wy - ANCHOR.y;
    const dist = Math.hypot(dx, dy);
    const max = LAUNCH.maxDrag;
    // only allow pulling back (to the lower-left hemisphere) — clamp forward pulls
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    // prevent pulling forward/right past the fork (so launches always go right)
    if (dx > 30) dx = 30;
    const rx = ANCHOR.x + dx;
    const ry = ANCHOR.y + dy;
    this.heldRat.setPosition(rx, ry);
    // rotate rat to face launch direction
    this.heldRat.setRotation(Math.atan2(-dy, -dx));
    this.drawBand(rx, ry);
    this.drawTrajectory(rx, ry);
  }

  onPointerUp(pointer) {
    if (!this.dragging || !this.heldRat) return;
    this.dragging = false;
    const rx = this.heldRat.x;
    const ry = this.heldRat.y;
    const dx = ANCHOR.x - rx;
    const dy = ANCHOR.y - ry;
    const pull = Math.hypot(dx, dy);
    this.trajectory.clear();

    if (pull < 18) {
      // too small — snap back, stay aiming
      this.tweens.add({
        targets: this.heldRat,
        x: ANCHOR.x,
        y: ANCHOR.y,
        rotation: 0,
        duration: 150,
        ease: "Back.out",
        onUpdate: () => this.drawBand(this.heldRat.x, this.heldRat.y),
      });
      this.state = "aiming";
      return;
    }

    this.launch(rx, ry, dx, dy);
  }

  launch(rx, ry, dx, dy) {
    if (!this.heldType) return;
    const type = this.heldType;
    const typeKey = type.key;

    // remove the held (non-physics) rat, create a dynamic matter rat
    if (this.heldRat) this.heldRat.destroy();
    this.heldRat = null;
    this.bandBack.clear();
    this.bandFront.clear();

    const rat = this.matter.add.image(rx, ry, "rat_" + typeKey, null, {
      shape: { type: "circle", radius: type.radius },
      density: type.density,
      restitution: 0.3,
      friction: 0.6,
      frictionAir: 0.006,
      label: "rat",
    });
    rat.setDepth(7);
    rat.setData("kind", "rat");
    rat.setData("ratType", typeKey);
    rat.setData("power", type.power);
    rat.setData("ability", type.ability);
    rat.setData("abilityUsed", false);
    rat.restT = 0;

    const vx = dx * LAUNCH.power;
    const vy = dy * LAUNCH.power;
    rat.setVelocity(vx, vy);
    rat.setAngularVelocity(0.12);
    Sfx.launch();

    this.flying.push(rat);
    this.primaryRat = rat;
    this.ammoIndex++;
    this.state = "flying";
    this.turnTimer = 0;

    // smoke puff at launch + camera follow
    this.spawnBurst(rx, ry, 0xffffff, 5, 2.2);
    this.cameras.main.startFollow(rat, false, 0.08, 0.08);
    this.cameras.main.setDeadzone(220, 160);
    this.updateHud();
  }

  tryAbility() {
    const rat = this.primaryRat;
    if (!rat || !rat.active || rat.getData("abilityUsed")) return;
    const ability = rat.getData("ability");
    if (ability === "none") return;
    rat.setData("abilityUsed", true);
    Sfx.ability();

    if (ability === "dash") {
      const v = rat.body.velocity;
      const sp = Math.hypot(v.x, v.y) || 1;
      rat.setVelocity(
        (v.x / sp) * (sp + LAUNCH.dashBoost),
        (v.y / sp) * (sp + LAUNCH.dashBoost) - 1
      );
      this.spawnBurst(rat.x, rat.y, 0xfff0a0, 7, 2.6);
      this.cameras.main.shake(120, 0.004);
    } else if (ability === "split") {
      const v = rat.body.velocity;
      const ang = Math.atan2(v.y, v.x);
      const sp = Math.hypot(v.x, v.y);
      for (const off of [-0.32, 0.32]) {
        const clone = this.matter.add.image(rat.x, rat.y, "rat_mouse", null, {
          shape: { type: "circle", radius: RAT_TYPES.mouse.radius },
          density: RAT_TYPES.mouse.density,
          restitution: 0.3,
          friction: 0.6,
          frictionAir: 0.006,
          label: "rat",
        });
        clone.setDepth(7);
        clone.setData("kind", "rat");
        clone.setData("power", RAT_TYPES.mouse.power);
        clone.setData("ability", "none");
        clone.setData("abilityUsed", true);
        clone.restT = 0;
        clone.setVelocity(Math.cos(ang + off) * sp, Math.sin(ang + off) * sp);
        this.flying.push(clone);
      }
      this.spawnBurst(rat.x, rat.y, 0xffffff, 8, 2.4);
    }
  }

  // --------------------------------------------------------- band / aim ------

  drawBand(rx, ry) {
    this.bandBack.clear();
    this.bandFront.clear();
    const bw = 9;
    // back strap (behind rat)
    this.bandBack.lineStyle(bw, COLORS.band, 1);
    this.bandBack.beginPath();
    this.bandBack.moveTo(this.tipBack.x, this.tipBack.y);
    this.bandBack.lineTo(rx, ry);
    this.bandBack.strokePath();
    // front strap (over rat)
    this.bandFront.lineStyle(bw, 0x7a1a14, 1);
    this.bandFront.beginPath();
    this.bandFront.moveTo(this.tipFront.x, this.tipFront.y);
    this.bandFront.lineTo(rx, ry);
    this.bandFront.strokePath();
  }

  drawTrajectory(rx, ry) {
    this.trajectory.clear();
    let vx = (ANCHOR.x - rx) * LAUNCH.power;
    let vy = (ANCHOR.y - ry) * LAUNCH.power;

    // Replicate Matter's exact per-step Verlet integration so the preview
    // lands where the rat actually lands. Each fixed engine step:
    //   vx *= DRAG;  vy = vy*DRAG + GACC;  pos += v
    // GACC = gravity.y * gravity.scale * delta^2 ; DRAG = 1 - frictionAir.
    const grav = this.matter.world.localWorld.gravity;
    const delta = this.matter.world.runner.delta || 1000 / 60;
    const GACC = grav.y * (grav.scale ?? 0.001) * delta * delta;
    const DRAG = 1 - 0.006; // rat frictionAir
    const groundLimit = GROUND_Y - this.heldType.radius;

    let px = rx;
    let py = ry;
    const stepsPerDot = 3;
    for (let i = 0; i < 34; i++) {
      for (let s = 0; s < stepsPerDot; s++) {
        vx *= DRAG;
        vy = vy * DRAG + GACC;
        px += vx;
        py += vy;
      }
      if (py > groundLimit || px > this.worldWidth || px < 0) break;
      const a = 0.9 - i * 0.02;
      this.trajectory.fillStyle(0xffffff, Math.max(0.18, a));
      this.trajectory.fillCircle(px, py, Math.max(2.5, 6.5 - i * 0.11));
    }
  }

  // ------------------------------------------------------------ collisions ---

  onCollision(event) {
    for (const pair of event.pairs) {
      const goA = pair.bodyA.gameObject;
      const goB = pair.bodyB.gameObject;
      const va = pair.bodyA.velocity;
      const vb = pair.bodyB.velocity;
      const rel = Math.hypot(va.x - vb.x, va.y - vb.y);
      if (rel < 4.5) continue;

      const ratInvolved =
        (goA && goA.getData && goA.getData("kind") === "rat") ||
        (goB && goB.getData && goB.getData("kind") === "rat");
      let powerMult = 1;
      if (ratInvolved) {
        const ratGo = goA && goA.getData("kind") === "rat" ? goA : goB;
        powerMult = ratGo.getData("power") || 1;
      }

      const base = (rel - 4.5) * 3.6 * powerMult;
      if (goA) this.maybeDamage(goA, base);
      if (goB) this.maybeDamage(goB, base);
    }
  }

  maybeDamage(go, amount) {
    if (!go || !go.getData) return;
    const kind = go.getData("kind");
    if (kind !== "block" && kind !== "enemy") return;
    if (amount <= 0) return;
    let hp = go.getData("hp") - amount;
    go.setData("hp", hp);

    if (kind === "enemy") {
      if (hp <= go.getData("maxHp") * 0.5 && go.texture.key !== "cat_hurt") {
        go.setTexture("cat_hurt");
      }
      if (hp <= 0) this.destroyEnemy(go);
    } else {
      if (hp <= 0) this.destroyBlock(go);
      else {
        // flash to show damage
        go.setTintFill(0xffffff);
        this.time.delayedCall(60, () => go.active && go.clearTint());
      }
    }
  }

  destroyBlock(go) {
    if (!go.active) return;
    const mat = go.getData("material");
    const color =
      mat === "glass" ? COLORS.matGlass : mat === "stone" ? COLORS.matStone : COLORS.matWood;
    this.spawnBurst(go.x, go.y, color, 9, 3);
    if (mat === "glass") Sfx.glassBreak();
    else if (mat === "stone") Sfx.stoneBreak();
    else Sfx.woodBreak();
    this.blocksDestroyed++;
    this.addScore(SCORE.perBlock);
    go.destroy();
  }

  destroyEnemy(go) {
    if (!go.active || !this.enemies.has(go)) return;
    this.enemies.delete(go);
    this.spawnBurst(go.x, go.y, 0xffd23f, 12, 3.4);
    Sfx.splat();
    this.enemiesKilled++;
    this.addScore(SCORE.perEnemy);
    // pop animation
    const ghost = this.add.image(go.x, go.y, "cat_hurt").setDepth(9);
    go.destroy();
    this.tweens.add({
      targets: ghost,
      scale: 1.6,
      alpha: 0,
      y: ghost.y - 40,
      duration: 380,
      onComplete: () => ghost.destroy(),
    });
    this.cameras.main.shake(120, 0.005);
    this.updateHud();

    if (this.enemies.size === 0 && this.state !== "ended") {
      this.time.delayedCall(450, () => this.win());
    }
  }

  // --------------------------------------------------------------- update ----

  update(time, delta) {
    // animate held rat band already drawn on change; nothing needed when aiming.

    if (this.state === "flying") {
      this.turnTimer += delta;
      // resolve each flying rat's resting/out-of-bounds status
      for (let i = this.flying.length - 1; i >= 0; i--) {
        const rat = this.flying[i];
        if (!rat.active) {
          this.flying.splice(i, 1);
          continue;
        }
        const speed = rat.body.speed;
        if (speed < 1.3) rat.restT += delta;
        else rat.restT = 0;

        const out =
          rat.x < -150 ||
          rat.x > this.worldWidth + 250 ||
          rat.y > GROUND_Y + 260;
        if (rat.restT > 700 || out) {
          this.retireRat(rat);
          this.flying.splice(i, 1);
        }
      }

      // keep camera on a live rat; if primary retired, follow another
      if ((!this.primaryRat || !this.primaryRat.active) && this.flying.length) {
        this.primaryRat = this.flying[0];
        this.cameras.main.startFollow(this.primaryRat, false, 0.08, 0.08);
      }

      if (this.flying.length === 0 || this.turnTimer > 8000) {
        this.flying.forEach((r) => this.retireRat(r));
        this.flying = [];
        this.endTurn();
      }
    }
  }

  retireRat(rat) {
    if (!rat.active) return;
    if (rat === this.primaryRat) this.primaryRat = null;
    this.tweens.add({
      targets: rat,
      alpha: 0,
      duration: 250,
      onComplete: () => rat.active && rat.destroy(),
    });
  }

  endTurn() {
    if (this.state === "ended") return;
    this.cameras.main.stopFollow();
    this.tweens.add({
      targets: this.cameras.main,
      scrollX: 0,
      duration: 500,
      ease: "Sine.inOut",
    });

    if (this.enemies.size === 0) {
      this.win();
      return;
    }
    if (this.ammoIndex < this.ammo.length) {
      this.time.delayedCall(520, () => this.loadNextRat());
    } else {
      // out of ammo — give the world a moment, then lose
      this.time.delayedCall(900, () => {
        if (this.enemies.size === 0) this.win();
        else this.lose();
      });
    }
  }

  addScore(n) {
    this.score += n;
    this.updateHud();
  }

  // ----------------------------------------------------------- end states ----

  computeStars() {
    const leftover = this.ammo.length - this.ammoIndex;
    let stars = 1;
    if (leftover >= 1) stars = 2;
    if (leftover >= 2 || leftover / this.ammo.length >= 0.4) stars = 3;
    return Phaser.Math.Clamp(stars, 1, 3);
  }

  win() {
    if (this.state === "ended") return;
    this.state = "ended";
    const leftover = this.ammo.length - this.ammoIndex;
    this.score += leftover * SCORE.perRatLeft;
    const stars = this.computeStars();
    Progress.recordWin(this.levelIndex, stars, this.score, LEVEL_COUNT);
    this.maybeSubmitScore();
    this.updateHud();
    Sfx.win();
    this.time.delayedCall(300, () => this.showResult(true, stars));
  }

  lose() {
    if (this.state === "ended") return;
    this.state = "ended";
    Sfx.lose();
    this.showResult(false, 0);
  }

  // ------------------------------------------------------------------ hud ----

  buildHud() {
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(50);

    // translucent top strip
    const strip = this.add.graphics();
    strip.fillStyle(0x000000, 0.28);
    strip.fillRect(0, 0, GAME_WIDTH, 70);
    hud.add(strip);

    // level title
    this.titleText = this.add
      .text(GAME_WIDTH / 2, 22, `LEVEL ${this.levelIndex + 1} — ${this.level.name}`, {
        fontFamily: "system-ui",
        fontSize: "26px",
        fontStyle: "900",
        color: "#fff8e6",
      })
      .setOrigin(0.5, 0)
      .setStroke("#5a3a1a", 5);
    hud.add(this.titleText);

    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 50, "Score 0", {
        fontFamily: "system-ui",
        fontSize: "17px",
        color: "#ffd23f",
      })
      .setOrigin(0.5, 0);
    hud.add(this.scoreText);

    // buttons (these sit in the HUD strip; pointerdown there won't start a drag)
    hud.add(
      makeButton(this, 70, 35, "‹", () => this.scene.start("LevelSelect"), {
        width: 60,
        height: 54,
        fontSize: 30,
      })
    );
    hud.add(
      makeButton(this, 150, 35, "↺", () => this.scene.restart(), {
        width: 60,
        height: 54,
        fontSize: 26,
      })
    );
    this.muteBtn = makeButton(
      this,
      230,
      35,
      isMuted() ? "🔇" : "🔊",
      () => {
        setMuted(!isMuted());
        this.muteBtn.list[1].setText(isMuted() ? "🔇" : "🔊");
        if (!isMuted()) Sfx.tap();
      },
      { width: 60, height: 54, fontSize: 24 }
    );
    hud.add(this.muteBtn);

    // ammo row (right side)
    this.ammoContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(50);
    hud.add(this.ammoContainer);

    this.hud = hud;
    this.updateHud();
  }

  updateHud() {
    if (this.scoreText) this.scoreText.setText("Score " + this.score.toLocaleString());
    if (!this.ammoContainer) return;
    this.ammoContainer.removeAll(true);
    const remaining = this.ammo.slice(this.ammoIndex);
    const size = 40;
    const gap = 8;
    const total = remaining.length;
    let x = GAME_WIDTH - 30;
    for (let i = total - 1; i >= 0; i--) {
      const icon = this.add
        .image(x, 36, "rat_" + remaining[i])
        .setDisplaySize(size, size)
        .setScrollFactor(0);
      if (i === 0) icon.setScale(icon.scale * 1.15); // next-to-launch highlighted
      else icon.setAlpha(0.7);
      this.ammoContainer.add(icon);
      x -= size + gap;
    }
    // "cats left" badge
    const cats = this.add
      .text(GAME_WIDTH - 30, 58, `🐱 ${this.enemies.size} left`, {
        fontFamily: "system-ui",
        fontSize: "16px",
        color: "#fff8e6",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);
    this.ammoContainer.add(cats);
  }

  // --------------------------------------------------------------- effects ---

  spawnBurst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const p = this.add.image(x, y, "puff").setDepth(20);
      p.setTint(color);
      const s = Phaser.Math.FloatBetween(0.25, 0.7);
      p.setScale(s);
      const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(10, 40) * (speed / 3);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist - 10,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(280, 520),
        ease: "Quad.out",
        onComplete: () => p.destroy(),
      });
    }
  }

  showToast(msg, duration = 2000) {
    const t = this.add
      .text(GAME_WIDTH / 2, 110, msg, {
        fontFamily: "system-ui",
        fontSize: "22px",
        fontStyle: "700",
        color: "#fff8e6",
        backgroundColor: "#00000077",
        padding: { x: 16, y: 8 },
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(60);
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: 96,
      delay: duration,
      duration: 500,
      onComplete: () => t.destroy(),
    });
  }

  // ------------------------------------------------------------- result ------

  showResult(won, stars) {
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(100);

    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.55);
    dim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    dim.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    layer.add(dim);

    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
    const pw = 560;
    const ph = 360;
    const pg = this.add.graphics();
    pg.fillStyle(COLORS.woodDark, 1);
    pg.fillRoundedRect(-pw / 2, -ph / 2 + 8, pw, ph, 26);
    pg.fillStyle(COLORS.wood, 1);
    pg.fillRoundedRect(-pw / 2, -ph / 2, pw, ph - 6, 26);
    pg.fillStyle(0xffffff, 0.12);
    pg.fillRoundedRect(-pw / 2 + 10, -ph / 2 + 10, pw - 20, ph * 0.25, 18);
    panel.add(pg);

    const heading = this.add
      .text(0, -ph / 2 + 50, won ? "LEVEL CLEARED!" : "THE CATS HELD!", {
        fontFamily: "system-ui",
        fontSize: "44px",
        fontStyle: "900",
        color: won ? "#ffd23f" : "#ff8a7a",
      })
      .setOrigin(0.5)
      .setStroke("#5a3a1a", 7);
    panel.add(heading);

    if (won) {
      const starsC = drawStars(this, 0, -40, 0, 80, 16);
      panel.add(starsC);
      // animate stars in
      starsC.list.forEach((img, i) => {
        if (i < stars) {
          img.setTexture("star").setScale(0);
          this.tweens.add({
            targets: img,
            scale: 80 / 64,
            duration: 320,
            delay: 250 + i * 180,
            ease: "Back.out",
          });
        }
      });
      panel.add(
        this.add
          .text(0, 36, "Score  " + this.score.toLocaleString(), {
            fontFamily: "system-ui",
            fontSize: "30px",
            fontStyle: "700",
            color: "#fff8e6",
          })
          .setOrigin(0.5)
      );
    } else {
      panel.add(
        this.add
          .text(0, -10, "Out of rats! Try a different angle.", {
            fontFamily: "system-ui",
            fontSize: "24px",
            color: "#fff8e6",
            align: "center",
            wordWrap: { width: pw - 80 },
          })
          .setOrigin(0.5)
      );
    }

    // buttons
    const by = ph / 2 - 56;
    const isLast = this.levelIndex >= LEVEL_COUNT - 1;
    if (won && !isLast) {
      panel.add(
        makeButton(this, -150, by, "↺ Retry", () => this.scene.restart(), {
          width: 170,
          height: 70,
          fontSize: 26,
        })
      );
      panel.add(
        makeButton(
          this,
          40,
          by,
          "Menu",
          () => this.scene.start("LevelSelect"),
          { width: 130, height: 70, fontSize: 24, color: COLORS.panelLight, dark: COLORS.panel }
        )
      );
      panel.add(
        makeButton(
          this,
          200,
          by,
          "Next ›",
          () => this.scene.start("Game", { levelIndex: this.levelIndex + 1 }),
          { width: 170, height: 70, fontSize: 26, color: 0x4caf50, dark: 0x357a38 }
        )
      );
    } else {
      const nextLabel = won ? "Menu" : "↺ Retry";
      const nextAct = won
        ? () => this.scene.start("LevelSelect")
        : () => this.scene.restart();
      panel.add(
        makeButton(this, -100, by, nextLabel, nextAct, {
          width: 190,
          height: 70,
          fontSize: 26,
        })
      );
      panel.add(
        makeButton(
          this,
          110,
          by,
          won ? "Replay" : "Menu",
          won ? () => this.scene.restart() : () => this.scene.start("LevelSelect"),
          { width: 190, height: 70, fontSize: 26, color: COLORS.panelLight, dark: COLORS.panel }
        )
      );
    }

    layer.add(panel);

    // Leaderboard button below the result panel (won screens only).
    if (won) {
      layer.add(
        makeButton(
          this,
          GAME_WIDTH / 2,
          GAME_HEIGHT / 2 + 10 + 360 / 2 + 46,
          "\uD83C\uDFC6 Leaderboard",
          () => this.scene.start("Leaderboard", { returnTo: "LevelSelect" }),
          { width: 300, height: 60, fontSize: 24, color: 0xe0a93c, dark: 0xa9761f }
        )
      );
    }
    panel.setScale(0.6);
    panel.setAlpha(0);
    this.tweens.add({
      targets: panel,
      scale: 1,
      alpha: 1,
      duration: 360,
      ease: "Back.out",
    });
  }

  // ----------------------------------------------------- leaderboard submit ----

  // Submit the player's cumulative best score when it sets a NEW personal high.
  // The score message is signed by the connected wallet; the server re-verifies
  // the signature, freshness, NYCPR balance, and a sanity cap. Best-effort: any
  // failure (declined signature, offline, gate) is swallowed so play continues.
  async maybeSubmitScore() {
    try {
      let total = 0;
      for (let i = 0; i < LEVEL_COUNT; i++) total += Progress.scoreFor(i);
      if (total <= getSubmittedHigh()) return;
      const res = await submitScore(total);
      if (res && res.ok) this.toast("Score submitted to the leaderboard!");
    } catch (e) {
      /* non-fatal: keep playing even if submission fails */
    }
  }

  // Tiny transient confirmation banner.
  toast(msg) {
    const t = this.add
      .text(GAME_WIDTH / 2, 110, msg, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "24px",
        fontStyle: "800",
        color: "#fff8e6",
        backgroundColor: "#2f7a2acc",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 2200,
      duration: 600,
      onComplete: () => t.destroy(),
    });
  }
}
