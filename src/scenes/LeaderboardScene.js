import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from "../constants.js";
import { makeButton, drawBackground } from "../ui.js";
import { fetchLeaderboard } from "../api.js";

// Public top-scores board. Reachable from the Menu and the win screen.
// Shows display names + scores only (wallets are never exposed by the API).
export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super("Leaderboard");
  }

  init(data) {
    this.returnTo = (data && data.returnTo) || "Menu";
  }

  create() {
    drawBackground(this, false);

    this.add
      .text(GAME_WIDTH / 2, 78, "LEADERBOARD", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "56px",
        fontStyle: "900",
        color: "#ffd23f",
      })
      .setOrigin(0.5)
      .setStroke("#5a3a1a", 8)
      .setShadow(0, 5, "#00000055", 6);

    // Panel
    const pw = 720;
    const ph = 470;
    const px = GAME_WIDTH / 2;
    const py = 400;
    const pg = this.add.graphics();
    pg.fillStyle(COLORS.woodDark, 1);
    pg.fillRoundedRect(px - pw / 2, py - ph / 2 + 8, pw, ph, 24);
    pg.fillStyle(COLORS.wood, 1);
    pg.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph - 6, 24);
    pg.fillStyle(0x000000, 0.18);
    pg.fillRoundedRect(px - pw / 2 + 16, py - ph / 2 + 18, pw - 32, ph - 40, 16);

    this.listContainer = this.add.container(0, 0);
    this.statusText = this.add
      .text(px, py, "Loading…", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "24px",
        color: "#fff3d6",
      })
      .setOrigin(0.5);

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 56, "‹ Back", () =>
      this.scene.start(this.returnTo), {
      width: 220,
      height: 64,
      fontSize: 26,
      color: COLORS.panelLight,
      dark: COLORS.panel,
    });

    // NOTE: do not name this method `load` — `this.load` is Phaser's built-in
    // asset LoaderPlugin, and shadowing it makes this call throw.
    this.loadScores(px, py, pw, ph);
  }

  async loadScores(px, py, pw, ph) {
    try {
      const rows = await fetchLeaderboard(20);
      this.statusText.destroy();
      if (!rows.length) {
        this.add
          .text(px, py, "No scores yet — be the first!", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "24px",
            color: "#fff3d6",
          })
          .setOrigin(0.5);
        return;
      }
      const top = py - ph / 2 + 46;
      const rowH = Math.min(36, (ph - 80) / rows.length);
      rows.forEach((r, i) => {
        const y = top + i * rowH;
        const rankColors = ["#ffd23f", "#e3e3e3", "#d99a5b"];
        const color = i < 3 ? rankColors[i] : "#fff3d6";
        this.add
          .text(px - pw / 2 + 40, y, `${i + 1}.`, {
            fontFamily: "system-ui, sans-serif",
            fontSize: "22px",
            fontStyle: "800",
            color,
          })
          .setOrigin(0, 0.5);
        this.add
          .text(px - pw / 2 + 100, y, String(r.name).slice(0, 24), {
            fontFamily: "system-ui, sans-serif",
            fontSize: "22px",
            fontStyle: "700",
            color,
          })
          .setOrigin(0, 0.5);
        this.add
          .text(px + pw / 2 - 40, y, Number(r.score).toLocaleString(), {
            fontFamily: "system-ui, sans-serif",
            fontSize: "22px",
            fontStyle: "800",
            color,
          })
          .setOrigin(1, 0.5);
      });
    } catch (e) {
      this.statusText.setText("Couldn't load the leaderboard.");
    }
  }
}
