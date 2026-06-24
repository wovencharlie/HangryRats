// Level definitions for Hangry Rats — Phase 1: 10 single-player levels of
// increasing difficulty.
//
// Structures are built from STACKS and HUTS via helpers that compute each
// block's Y from the accumulated height of the pieces below it. This
// guarantees blocks never interpenetrate at spawn (interpenetration makes the
// Matter solver explode the tower apart), so every structure starts stable.
//
// Coordinate space is the virtual world (see constants.js): x grows right, y
// grows down, GROUND_Y is the top of the ground. A block {x,y} is its CENTER.
// The reachable landing band for a full→partial slingshot pull is roughly
// x≈760–1400, so structures live in that zone.

import { GROUND_Y } from "./constants.js";

const G = "gray";
const B = "brown";
const S = "speckled";
const M = "mouse";

// piece factories (bottom-up list items)
const col = (material, h = 120, w = 26) => ({ w, h, material });
const slab = (material, w = 150, h = 24) => ({ w, h, material });
const box = (material, s = 70) => ({ w: s, h: s, material });

const CAT_R = 30;
const catGround = (x) => ({ x, y: GROUND_Y - CAT_R });
const catOn = (x, topY) => ({ x, y: topY - CAT_R });

// Stack pieces vertically at column center x, bottom resting on the ground.
// Returns the blocks plus `top` = the Y of the topmost surface.
function stack(x, items) {
  let floor = GROUND_Y;
  const blocks = [];
  for (const it of items) {
    blocks.push({ x, y: floor - it.h / 2, w: it.w, h: it.h, material: it.material });
    floor -= it.h;
  }
  return { blocks, top: floor };
}

// Two columns + a roof slab — a little hut a cat can hide inside or sit atop.
// Returns blocks, `roofTop` (Y of the roof's top surface) and the inside
// ground level for placing a sheltered cat.
function hut(x, { mat = "wood", roofMat, h = 120, span = 120, roofW, colW = 26, roofH = 24 } = {}) {
  const left = x - span / 2;
  const right = x + span / 2;
  const blocks = [
    { x: left, y: GROUND_Y - h / 2, w: colW, h, material: mat },
    { x: right, y: GROUND_Y - h / 2, w: colW, h, material: mat },
    { x, y: GROUND_Y - h - roofH / 2, w: roofW || span + 50, h: roofH, material: roofMat || mat },
  ];
  return { blocks, roofTop: GROUND_Y - h - roofH, inside: GROUND_Y };
}

// ---- level assembly --------------------------------------------------------

function L1() {
  const wall = stack(980, [col("wood", 150)]);
  return {
    name: "First Bite",
    hint: "Drag the rat back and let go!",
    rats: [G, G, G],
    structures: wall.blocks,
    enemies: [catGround(1060)],
  };
}

function L2() {
  const h = hut(1020, { mat: "wood", h: 120, span: 120 });
  return {
    name: "Rooftop",
    hint: "Knock the platform out from under it.",
    rats: [G, G, G],
    structures: h.blocks,
    enemies: [catOn(1020, h.roofTop), catGround(1140)],
  };
}

function L3() {
  const h = hut(1000, { mat: "glass", roofMat: "wood", h: 130, span: 130 });
  return {
    name: "Glass House",
    hint: "Glass shatters easily — smash right through.",
    rats: [G, G, G],
    structures: h.blocks,
    enemies: [catGround(1000), catOn(1000, h.roofTop), catGround(1130)],
  };
}

function L4() {
  const pillar = stack(960, [box("stone", 80), box("stone", 80)]);
  const h = hut(1130, { mat: "wood", h: 120, span: 120 });
  return {
    name: "Heavy Hitter",
    hint: "The brown Tank rat hits hard — aim it at stone.",
    rats: [B, G, B],
    structures: [...pillar.blocks, ...h.blocks],
    enemies: [catOn(960, pillar.top), catGround(1040), catOn(1130, h.roofTop)],
  };
}

function L5() {
  const tower = stack(1060, [box("stone", 90), box("wood", 80), box("glass", 70)]);
  return {
    name: "Tower",
    hint: "Topple the tower.",
    worldWidth: 1450,
    rats: [G, B, G, G],
    structures: tower.blocks,
    enemies: [catOn(1060, tower.top), catGround(960), catGround(1180)],
  };
}

function L6() {
  const pillar = stack(920, [box("stone", 80), box("stone", 80)]);
  const h = hut(1320, { mat: "wood", roofMat: "glass", h: 120, span: 120 });
  return {
    name: "Split & Dash",
    hint: "Tap the screen while the Dasher flies to dash forward!",
    worldWidth: 1500,
    rats: [S, S, M],
    structures: [...pillar.blocks, ...h.blocks],
    enemies: [catOn(920, pillar.top), catGround(1080), catGround(1200), catOn(1320, h.roofTop)],
  };
}

function L7() {
  const h = hut(1090, { mat: "stone", roofMat: "stone", h: 160, span: 150 });
  const cap = { x: 1090, y: h.roofTop - 45, w: 90, h: 90, material: "wood" }; // box on the roof
  const side = stack(1270, [box("stone", 90), box("wood", 80)]);
  return {
    name: "The Vault",
    hint: "Stone is tough — use the Tank and aim for weak points.",
    worldWidth: 1550,
    rats: [B, B, S, G],
    structures: [...h.blocks, cap, ...side.blocks],
    enemies: [
      catGround(1090),
      catOn(1090, h.roofTop - 90),
      catOn(1270, side.top),
      catGround(1380),
    ],
  };
}

function L8() {
  const huts = [950, 1140, 1330].map((x) =>
    hut(x, { mat: "wood", roofMat: "glass", h: 100, span: 110 })
  );
  return {
    name: "Swarm",
    hint: "Tap to split the Mouse into three — clear the swarm!",
    worldWidth: 1600,
    rats: [M, M, S, B],
    structures: huts.flatMap((h) => h.blocks),
    enemies: [
      catOn(950, huts[0].roofTop),
      catOn(1140, huts[1].roofTop),
      catOn(1330, huts[2].roofTop),
      catGround(1045),
      catGround(1235),
    ],
  };
}

function L9() {
  const center = stack(1170, [box("stone", 100), box("stone", 90), box("wood", 80), box("glass", 70)]);
  const left = stack(1010, [box("stone", 90), box("wood", 80)]);
  const right = stack(1330, [box("stone", 90), box("wood", 80)]);
  return {
    name: "Junk Fortress",
    hint: "Bring the whole tower down.",
    worldWidth: 1700,
    rats: [B, S, M, B, G],
    structures: [...center.blocks, ...left.blocks, ...right.blocks],
    enemies: [
      catOn(1170, center.top),
      catOn(1010, left.top),
      catOn(1330, right.top),
      catGround(1090),
      catGround(1250),
    ],
  };
}

function L10() {
  const wallL = stack(960, [col("stone", 210, 34)]);
  const wallR = stack(1390, [col("stone", 210, 34)]);
  const center = stack(1175, [box("stone", 100), box("stone", 90), box("wood", 80), box("glass", 70)]);
  const towerL = stack(1065, [box("stone", 90), box("wood", 80)]);
  const towerR = stack(1285, [box("stone", 90), box("wood", 80)]);
  return {
    name: "Take Over!",
    hint: "Final stand. Use every rat wisely.",
    worldWidth: 1800,
    rats: [B, B, S, M, B],
    structures: [
      ...wallL.blocks,
      ...wallR.blocks,
      ...center.blocks,
      ...towerL.blocks,
      ...towerR.blocks,
    ],
    enemies: [
      catOn(960, wallL.top),
      catOn(1390, wallR.top),
      catOn(1175, center.top),
      catOn(1065, towerL.top),
      catOn(1285, towerR.top),
    ],
  };
}

export const LEVELS = [L1(), L2(), L3(), L4(), L5(), L6(), L7(), L8(), L9(), L10()];
export const LEVEL_COUNT = LEVELS.length;
