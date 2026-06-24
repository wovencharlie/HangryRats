// Core design constants for Hangry Rats.
// The game is authored against a fixed virtual resolution and scaled to fit
// any screen (desktop + mobile) by the Phaser Scale Manager.

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const GROUND_Y = 648; // top surface of the ground
export const SLING = { x: 250, y: 470, height: 150 }; // fork anchor

// Palette pulled from the concept art (jungle / sky / warm UI).
export const COLORS = {
  skyTop: 0x1f8ad4,
  skyMid: 0x49b0e8,
  skyBottom: 0xbdecff,
  cloud: 0xffffff,

  hillFar: 0x7fd08a,
  hillMid: 0x57b06a,
  hillNear: 0x3f9a52,

  leaf: 0x2f8a3e,
  leafLight: 0x49ad53,
  leafDark: 0x1d5e29,
  leafVein: 0x6fc46f,

  ground: 0x7a4a26,
  groundDark: 0x5c3719,
  groundTop: 0x57bd4c,
  groundTopDark: 0x3f9a3a,
  pebble: 0x8a5a30,

  slingWood: 0x8a5a2b,
  slingWoodDark: 0x6b421f,
  band: 0xb3261e,

  panel: 0x2a1a0f,
  panelLight: 0x3c2616,
  wood: 0xc98a3c,
  woodDark: 0x9c6526,
  textCream: 0xfff3d6,
  yellow: 0xffd23f,
  cheese: 0xffce4f,

  star: 0xffd23f,
  starEmpty: 0x4a4a55,

  // material colors for destructible blocks
  matWood: 0xc08a4a,
  matWoodDark: 0x8f6230,
  matStone: 0x9aa3ad,
  matStoneDark: 0x6c7680,
  matGlass: 0x7fd4e8,
  matGlassDark: 0x4fa9c2,

  enemyBody: 0x6f7b86,
  enemyBelly: 0xd8dde2,
};

// Material definitions: density, restitution, and how much impact energy a
// block of this material can absorb before breaking.
export const MATERIALS = {
  wood: { density: 0.0016, restitution: 0.2, friction: 0.7, hp: 60, color: "matWood", dark: "matWoodDark" },
  stone: { density: 0.0042, restitution: 0.1, friction: 0.9, hp: 150, color: "matStone", dark: "matStoneDark" },
  glass: { density: 0.0011, restitution: 0.05, friction: 0.4, hp: 28, color: "matGlass", dark: "matGlassDark" },
};

// Rat (projectile) types — analogous to the different Angry Birds.
export const RAT_TYPES = {
  gray: {
    key: "gray",
    label: "Scrapper",
    radius: 26,
    density: 0.0025,
    mass: 1,
    power: 1, // collision damage multiplier
    ability: "none",
    body: 0x5b6670,
    belly: 0xe9b9a6,
  },
  brown: {
    key: "brown",
    label: "Tank",
    radius: 33,
    density: 0.0045,
    mass: 1.8,
    power: 1.7,
    ability: "none",
    body: 0x7a4f2e,
    belly: 0xc89a72,
  },
  speckled: {
    key: "speckled",
    label: "Dasher",
    radius: 25,
    density: 0.0024,
    mass: 1,
    power: 1.1,
    ability: "dash", // tap in flight to dash forward
    body: 0x9aa0a6,
    belly: 0xe9d9c5,
  },
  mouse: {
    key: "mouse",
    label: "Splitter",
    radius: 20,
    density: 0.0018,
    mass: 0.7,
    power: 0.8,
    ability: "split", // tap in flight to split into 3
    body: 0x808a93,
    belly: 0xe9c9b9,
  },
};

// Launch tuning.
export const LAUNCH = {
  maxDrag: 135, // px the rat can be pulled back (virtual space)
  power: 0.235, // velocity multiplier applied to drag vector
  dashBoost: 8,
};

export const SCORE = {
  perBlock: 500,
  perEnemy: 5000,
  perRatLeft: 10000,
};
