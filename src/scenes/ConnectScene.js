import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from "../constants.js";
import { makeButton, drawBackground } from "../ui.js";
import { NYCPR_LABEL, GATE_AMOUNT_UI, TOKEN_LINK } from "../config.js";
import {
  connect,
  getProvider,
  isMobile,
  phantomDeeplink,
  getNYCPRBalance,
} from "../wallet.js";
import { unlockAudio } from "../sfx.js";

// The wallet gate. Runs after Boot and before Menu: Boot -> Connect -> Menu.
// The player must connect a wallet holding >= 1,000 NYCPR to proceed. The
// check re-runs every session (this scene is always entered on load).
export default class ConnectScene extends Phaser.Scene {
  constructor() {
    super("Connect");
  }

  create() {
    drawBackground(this, false);
    this.busy = false;
    this.transient = []; // objects cleared between state renders

    // Title block (matches the menu's chunky lockup).
    this.add
      .text(GAME_WIDTH / 2, 150, "HANGRY RATS", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "76px",
        fontStyle: "900",
        color: "#ffd23f",
      })
      .setOrigin(0.5)
      .setStroke("#5a3a1a", 10)
      .setShadow(0, 6, "#00000055", 8);

    this.add
      .text(GAME_WIDTH / 2, 214, "Launch. Smash. Take over!", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "26px",
        fontStyle: "700",
        color: "#fff3d6",
      })
      .setOrigin(0.5)
      .setStroke("#5a3a1a", 5);

    this.statusGroup = this.add.container(0, 0);
    this.renderConnect();
  }

  clearTransient() {
    this.transient.forEach((o) => o.destroy());
    this.transient = [];
  }

  // Centered helper text.
  label(y, text, size = 24, color = "#fff3d6") {
    const t = this.add
      .text(GAME_WIDTH / 2, y, text, {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${size}px`,
        fontStyle: "700",
        color,
        align: "center",
        wordWrap: { width: 860 },
      })
      .setOrigin(0.5)
      .setStroke("#3a2a16", 4);
    this.transient.push(t);
    return t;
  }

  btn(x, y, text, cb, opts) {
    const b = makeButton(this, x, y, text, cb, opts);
    this.transient.push(b);
    return b;
  }

  // ---- state: initial connect prompt -----------------------------------
  renderConnect() {
    this.clearTransient();

    if (!getProvider() && isMobile()) return this.renderMobile();

    if (!getProvider()) {
      this.label(330, "No Solana wallet detected.", 28, "#ffd27a");
      this.label(
        382,
        "Install the Phantom browser extension, then reload to play.",
        22
      );
      this.btn(GAME_WIDTH / 2, 470, "Get Phantom", () =>
        window.open("https://phantom.app/download", "_blank"), {
        width: 280,
        glow: 0xffd23f,
      });
      this.btn(GAME_WIDTH / 2, 560, "Reload", () => window.location.reload(), {
        width: 200,
        color: COLORS.panelLight,
        dark: COLORS.panel,
        fontSize: 24,
        height: 64,
      });
      this.disclosure();
      return;
    }

    this.label(
      336,
      `Hold ${GATE_AMOUNT_UI.toLocaleString()} ${NYCPR_LABEL} to play.`,
      30,
      "#ffd27a"
    );
    this.btn(GAME_WIDTH / 2, 440, "Connect Wallet", () => this.doConnect(), {
      width: 320,
      glow: 0xffd23f,
      pulse: true,
    });
    this.disclosure();
  }

  // ---- state: mobile (no injected provider) ----------------------------
  renderMobile() {
    this.clearTransient();
    this.label(330, "Play inside the Phantom app", 28, "#ffd27a");
    this.label(
      384,
      "Mobile browsers can't talk to your wallet directly. Tap below to open Hangry Rats inside Phantom's in-app browser.",
      22
    );
    this.btn(GAME_WIDTH / 2, 480, "Open in Phantom", () => {
      window.location.href = phantomDeeplink();
    }, { width: 320, glow: 0xab9ff2 });
    this.disclosure();
  }

  // ---- action: connect + gate check ------------------------------------
  async doConnect() {
    if (this.busy) return;
    this.busy = true;
    unlockAudio();
    this.clearTransient();
    this.label(420, "Connecting…", 28);

    try {
      const pubkey = await connect();
      this.clearTransient();
      this.label(420, "Checking your NYCPR balance…", 26);
      const { ui } = await getNYCPRBalance(pubkey);
      if (ui >= GATE_AMOUNT_UI) {
        this.busy = false;
        this.proceed(ui);
      } else {
        this.busy = false;
        this.renderGatedOut(ui);
      }
    } catch (err) {
      this.busy = false;
      this.renderError(err && err.message);
    }
  }

  proceed(ui) {
    this.clearTransient();
    this.label(
      430,
      `Welcome! ${Math.floor(ui).toLocaleString()} ${NYCPR_LABEL} verified.`,
      28,
      "#9be29b"
    );
    this.time.delayedCall(700, () => this.scene.start("Menu"));
  }

  renderGatedOut(ui) {
    this.clearTransient();
    this.label(330, `You need ${GATE_AMOUNT_UI.toLocaleString()} ${NYCPR_LABEL} to play.`, 30, "#ff8a7a");
    this.label(
      384,
      `You hold ${Math.floor(ui).toLocaleString()} ${NYCPR_LABEL}. Grab some more, then re-check.`,
      22
    );
    this.btn(GAME_WIDTH / 2 - 150, 480, `Get ${NYCPR_LABEL}`, () =>
      window.open(TOKEN_LINK, "_blank"), { width: 250, glow: 0xffd23f });
    this.btn(GAME_WIDTH / 2 + 150, 480, "Re-check", () => {
      this.renderConnect();
      this.doConnect();
    }, { width: 230, color: COLORS.panelLight, dark: COLORS.panel });
    this.disclosure();
  }

  renderError(code) {
    this.clearTransient();
    const msg =
      code === "SIGN_REJECTED"
        ? "Sign-in was declined. Approve the signature to continue."
        : code === "NO_PROVIDER"
        ? "No wallet found. Install Phantom and reload."
        : "Couldn't connect. Please try again.";
    this.label(360, msg, 24, "#ff8a7a");
    this.btn(GAME_WIDTH / 2, 470, "Try Again", () => this.renderConnect(), {
      width: 240,
      glow: 0xffd23f,
    });
    this.disclosure();
  }

  // Subtle transparency note (not in the original spec; recommended).
  disclosure() {
    const t = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 28,
        "Connected wallets may be recorded for leaderboard prize eligibility.",
        { fontFamily: "system-ui, sans-serif", fontSize: "15px", color: "#d8c9a8" }
      )
      .setOrigin(0.5)
      .setAlpha(0.8);
    this.transient.push(t);
  }
}
