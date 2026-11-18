// persist.js — save / load progress for Neon Bay v3 in localStorage: cash,
// health, owned weapons and ammo, garage upgrades, NOS, job progress, clock,
// position and statistics. Auto-saves during play; no account, no network.
// Version 3 of the save format (v2 saves do not carry over).
import { createRecords } from './records.js';

const SAVE_KEY = 'neonbay-save-v3';

export function saveGame(G) {
  try {
    const data = {
      version: 3,
      cash: Math.floor(G.cash),
      health: G.health,
      weapons: G.weapons,
      weapon: G.weapon,
      upgrades: G.upgrades,
      nos: G.nos,
      nosMax: G.nosMax,
      jobIndex: G.jobIndex,
      clockMinutes: G.clockMinutes,
      pos: { x: G.player.pos.x, z: G.player.pos.z },
      records: G.records,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 3) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    /* storage unavailable */
  }
}

export function mergeSaveRecords(data) {
  const r = createRecords();
  if (data && data.records) Object.assign(r, data.records);
  return r;
}
