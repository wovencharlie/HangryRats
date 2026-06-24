// Persistent single-player progress (level unlocks + best stars/score) stored
// in localStorage. Falls back to in-memory if storage is unavailable.

const KEY = "hangry-rats-progress-v1";

let mem = { unlocked: 1, stars: {}, scores: {} };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) mem = { unlocked: 1, stars: {}, scores: {}, ...JSON.parse(raw) };
  } catch (e) {
    /* storage blocked — use in-memory defaults */
  }
  return mem;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(mem));
  } catch (e) {
    /* ignore */
  }
}

load();

export const Progress = {
  get unlocked() {
    return mem.unlocked;
  },
  isUnlocked(levelIndex) {
    return levelIndex <= mem.unlocked - 1;
  },
  starsFor(levelIndex) {
    return mem.stars[levelIndex] || 0;
  },
  scoreFor(levelIndex) {
    return mem.scores[levelIndex] || 0;
  },
  totalStars() {
    return Object.values(mem.stars).reduce((a, b) => a + b, 0);
  },
  // Record a win. Unlocks the next level and keeps the best stars/score.
  recordWin(levelIndex, stars, score, levelCount) {
    mem.stars[levelIndex] = Math.max(this.starsFor(levelIndex), stars);
    mem.scores[levelIndex] = Math.max(this.scoreFor(levelIndex), score);
    const next = levelIndex + 1;
    if (next < levelCount) mem.unlocked = Math.max(mem.unlocked, next + 1);
    save();
  },
  reset() {
    mem = { unlocked: 1, stars: {}, scores: {} };
    save();
  },
};
