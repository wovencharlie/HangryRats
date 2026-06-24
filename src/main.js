import "./polyfills.js";
import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "./constants.js";
import BootScene from "./scenes/BootScene.js";
import ConnectScene from "./scenes/ConnectScene.js";
import MenuScene from "./scenes/MenuScene.js";
import LevelSelectScene from "./scenes/LevelSelectScene.js";
import GameScene from "./scenes/GameScene.js";
import LeaderboardScene from "./scenes/LeaderboardScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0b1f33",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 1.8 },
      // debug: true,
      // Sleeping is OFF: a sleeping body won't wake when the block it rests on
      // is destroyed, leaving it frozen in mid-air. The scenes are small enough
      // that keeping everything awake is cheap.
      enableSleeping: false,
    },
  },
  scene: [BootScene, ConnectScene, MenuScene, LevelSelectScene, GameScene, LeaderboardScene],
};

const game = new Phaser.Game(config);

// Expose for debugging / automated playtesting in dev.
if (import.meta.env?.DEV) {
  window.__GAME__ = game;
}

// Hide the HTML loading splash once the first scene is up.
game.events.once("ready", () => {
  const splash = document.getElementById("splash");
  if (splash) {
    splash.classList.add("hide");
    setTimeout(() => splash.remove(), 500);
  }
});

// Keep the canvas sized correctly when the on-screen keyboard / browser chrome
// changes the viewport on mobile.
window.addEventListener("resize", () => game.scale.refresh());

export default game;
