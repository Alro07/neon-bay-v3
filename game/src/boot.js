// boot.js — Neon Bay v3 entry point: renderer, day/night sky, game loop,
// third-person camera, on-foot movement, stealing and exiting cars, the
// BUSTED flow, the victory flow, pause, shop interaction, and wiring for
// every system (world, cars, traffic, crowd, cops, arsenal, story, economy,
// panel, tunes, persist, records, controls). Original game for make.fun
// gta6-01. You are Rook, a driver new to Neon Bay; Dana Reyes hands out
// the ten story jobs.
import * as THREE from 'three';
import { mulberry, dist2, clamp, lerp } from './kit.js';
import { buildWorld, resolveCollision, clampToWorld, districtAt, BOUND } from './world.js';
import { makeAuto, spawnParkedAutos, driveAuto, hurtAuto, bumpAutos } from './cars.js';
import { spawnFlow, updateFlow, updateSignals } from './flow.js';
import { spawnWalkers, updateWalkers, startleWalkers } from './crowd.js';
import { raiseHeat, updateCops, clearCops, spawnCopCar } from './cops.js';
import { tryFire, tryPunch, updateParticles, spawnSmoke, spawnFlame, WEAPONS, WEAPON_ORDER } from './arsenal.js';
import { startJob, restartJob, updateJobs, updateStashes, updateAmmoCrates, spawnStashes, spawnAmmoCrates, setWaypoint, JOBS } from './story.js';
import { SPOTS, nearestSpot, itemsFor } from './economy.js';
import { initPanel, showHud, updatePanel, showToast, showDialog, hideDialog, advanceDialog, showShop, hideShop, showBusted, showVictory, hideVictory, renderStats } from './panel.js';
import { createSoundBank } from './tunes.js';
import { saveGame, loadGame, hasSave, mergeSaveRecords } from './persist.js';
import { createRecords } from './records.js';
import { createControls, bindControls, consumeMouse } from './controls.js';
import { shotName, applyShot } from './snaps.js';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87bfe8);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fd0ee, 120, 280);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 700);

const sun = new THREE.DirectionalLight(0xfff2d0, 2.8);
sun.position.set(60, 90, -40);
scene.add(sun);
const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a5a44, 1.5);
scene.add(hemi);

// --- shared game state -------------------------------------------------------
const rng = mulberry(20261118);
const G = {
  scene, elapsed: 0, clockMinutes: 10 * 60,
  started: false, paused: false, shotMode: null, victory: false,
  cash: 0, health: 100, wanted: 0, heatTimer: 0, lastCrimeAt: -999,
  bustTimer: 0, lastRoadblockAt: -999, roadblocks: [],
  weapons: {
    pistol: { owned: true, ammo: 24 },
    smg: { owned: false, ammo: 0 },
    shotgun: { owned: false, ammo: 0 },
    rifle: { owned: false, ammo: 0 },
  },
  weapon: 'pistol',
  nos: 100, nosMax: 100, boosting: false,
  upgrades: { armor: 0, turbo: 0, nosTank: 0 },
  jobIndex: 0, jobStage: 0, jobTimer: 0, jobCount: 0,
  boughtForJob: false, upgradedForJob: false,
  fareWalker: null, fareDest: null,
  objective: 'Meet Dana — start your first job.',
  waypoint: null, speedKmh: 0, damageFlash: 0,
  punchCooldown: 0, shootCooldown: 0, smokeTimer: 0,
  toastText: '', promptText: '', district: null,
  isNight: false, isDusk: false,
  dialogLines: [], dialogIdx: 0, dialogVisible: false,
  shopOpen: false, shopKind: null, shopSpotLabel: '',
  records: createRecords(),
  player: {
    pos: new THREE.Vector3(0, 0, 80), yaw: Math.PI, onFoot: true,
    car: null, inCar: false, walkSpeed: 6,
  },
  cameraYaw: Math.PI, cameraPitch: 0.3,
  input: createControls(),
  world: null, parked: [], flow: [], walkers: [], cops: [], heli: null,
  stashes: [], crates: [],
  sound: createSoundBank(),
  toast(text, seconds) { showToast(G, text, seconds); },
  dialog(lines) { showDialog(G, lines); },
  showVictory() { showVictory(G); },
  saveNow() { return saveGame(G); },
  onBusted() { bustPlayer(); },
};

G.world = buildWorld(scene);
G.parked = spawnParkedAutos(scene, rng);
G.flow = spawnFlow(scene, rng);
G.walkers = spawnWalkers(scene, rng);
G.stashes = spawnStashes(scene);
G.crates = spawnAmmoCrates(scene);
G.district = districtAt(G.player.pos.x, G.player.pos.z);

// The player: a capsule figure in a teal jacket and an orange cap.
const playerMesh = new THREE.Group();
{
  const jacket = new THREE.MeshLambertMaterial({ color: 0x12b5a5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 1.0, 0.4), jacket);
  body.position.y = 1.05;
  playerMesh.add(body);
  const skin = new THREE.MeshLambertMaterial({ color: 0xf2c89b });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 12), skin);
  head.position.y = 1.8;
  playerMesh.add(head);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.29, 0.12, 12),
    new THREE.MeshLambertMaterial({ color: 0xff6a3d }),
  );
  cap.position.y = 2.0;
  playerMesh.add(cap);
  const pants = new THREE.MeshLambertMaterial({ color: 0x1c2440 });
  for (const sx of [-0.17, 0.17]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.26), pants);
    leg.position.set(sx, 0.31, 0);
    leg.name = sx < 0 ? 'legL' : 'legR';
    playerMesh.add(leg);
  }
}
scene.add(playerMesh);

// --- busted / death ----------------------------------------------------------
function bustPlayer() {
  const lost = Math.min(G.cash, 200);
  G.cash -= lost;
  G.wanted = 0;
  G.health = 100;
  G.bustTimer = 0;
  G.records.busts += 1;
  clearCops(G);
  if (G.player.car) {
    G.player.car = null;
    G.player.inCar = false;
  }
  G.player.pos.set(0, 0, 80);
  G.player.onFoot = true;
  G.sound.busted();
  showBusted(G, lost);
  G.toast('BUSTED! The Bay PD seized $' + lost + '.', 3.5);
  restartJob(G);
}

function respawnPatchedUp() {
  G.health = 100;
  G.wanted = 0;
  G.cash = Math.max(0, G.cash - 100);
  if (G.player.car) {
    G.player.car = null;
    G.player.inCar = false;
  }
  G.player.pos.set(0, 0, 80);
  G.player.onFoot = true;
  G.toast("You got busted up — patched up at Doc's. -$100", 3.5);
}

// --- interaction -------------------------------------------------------------
function nearestParkedAuto(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.parked) {
    if (car.wrecked) continue;
    const d = dist2(car.group.position.x, car.group.position.z, G.player.pos.x, G.player.pos.z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function enterAuto(car) {
  if (car.wrecked) {
    G.toast('That car is a wreck — find another one.', 2);
    return;
  }
  if (!car.stolen) {
    car.stolen = true;
    G.records.carsStolen += 1;
    raiseHeat(G, 1, 'Car stolen!');
    startleWalkers(G, G.player.pos.x, G.player.pos.z, 12);
  }
  car.parked = false;
  G.player.car = car;
  G.player.inCar = true;
  G.player.onFoot = false;
  G.player.yaw = car.heading;
  G.cameraYaw = car.heading;
  G.sound.click();
}

function exitAuto() {
  const car = G.player.car;
  if (!car) return;
  car.speed = 0;
  G.player.pos.set(
    car.group.position.x + Math.cos(car.heading) * 2.4, 0,
    car.group.position.z - Math.sin(car.heading) * 2.4);
  G.player.car = null;
  G.player.inCar = false;
  G.player.onFoot = true;
  G.player.yaw = G.cameraYaw;
}

function openShopPanel(spot) {
  showShop(G, spot, itemsFor(G, spot.kind));
  G.sound.click();
}

function onInteract() {
  if (!G.started || G.paused) return;
  if (G.dialogVisible) {
    advanceDialog(G);
    return;
  }
  if (G.shopOpen) {
    hideShop(G);
    return;
  }
  if (G.player.car) {
    exitAuto();
    return;
  }
  const spot = nearestSpot(G);
  if (spot) {
    openShopPanel(spot);
    return;
  }
  const car = nearestParkedAuto(4.2);
  if (car) enterAuto(car);
}

function onPause() {
  if (!G.started) return;
  if (G.shopOpen) {
    hideShop(G);
    return;
  }
  G.paused = !G.paused;
  document.getElementById('pause-screen').classList.toggle('hidden', !G.paused);
  if (G.paused) renderStats(G);
  if (document.pointerLockElement) document.exitPointerLock();
  if (G.paused) saveGame(G);
}

bindControls(G.input, canvas, {
  onInteract,
  onPunch: () => tryPunch(G),
  onShoot: () => tryFire(G),
  onRadio: () => {
    G.sound.nextStation();
    G.toast('Radio: ' + G.sound.stationName(), 1.6);
  },
  onRestartJob: () => { if (G.started && !G.paused) restartJob(G); },
  onPause,
  onLockRequest: () => { if (G.started && !G.paused) canvas.requestPointerLock(); },
  onDialogAdvance: () => { if (G.dialogVisible) advanceDialog(G); },
  onWeapon: (i) => {
    const key = WEAPON_ORDER[i];
    if (G.weapons[key].owned) {
      G.weapon = key;
      G.toast(WEAPONS[key].name + ' equipped', 1.2);
    } else {
      G.toast(WEAPONS[key].name + ' — buy it at Harbor Guns', 2);
    }
  },
  onMute: () => {
    const m = G.sound.toggleMute();
    G.toast(m ? 'Sound muted' : 'Sound on', 1.2);
  },
});

// --- menus -------------------------------------------------------------------
const startScreen = document.getElementById('start-screen');
const btnStart = document.getElementById('btn-start');
const btnContinue = document.getElementById('btn-continue');
if (hasSave()) btnContinue.classList.remove('hidden');

function beginGame(fromSave) {
  G.sound.init();
  startScreen.classList.add('hidden');
  document.getElementById('pause-screen').classList.add('hidden');
  G.started = true;
  G.paused = false;
  showHud(true);
  if (fromSave) {
    const data = loadGame();
    if (data) {
      G.cash = data.cash;
      G.health = data.health;
      G.weapons = data.weapons;
      G.weapon = data.weapon;
      G.upgrades = data.upgrades;
      G.nos = data.nos;
      G.nosMax = data.nosMax;
      G.clockMinutes = data.clockMinutes;
      G.records = mergeSaveRecords(data);
      G.player.pos.set(data.pos.x, 0, data.pos.z);
      startJob(G, Math.min(data.jobIndex, JOBS.length - 1));
      G.toast('Save loaded — welcome back to Neon Bay', 3);
    }
  } else {
    startJob(G, 0);
  }
  canvas.requestPointerLock();
}
btnStart.addEventListener('click', () => beginGame(false));
btnContinue.addEventListener('click', () => beginGame(true));
document.getElementById('btn-resume').addEventListener('click', onPause);
document.getElementById('btn-save').addEventListener('click', () => {
  if (saveGame(G)) G.toast('Game saved', 2);
});
document.getElementById('btn-restart-job').addEventListener('click', () => {
  restartJob(G);
  onPause();
});
document.getElementById('btn-quit').addEventListener('click', () => {
  saveGame(G);
  G.started = false;
  G.paused = false;
  document.getElementById('pause-screen').classList.add('hidden');
  startScreen.classList.remove('hidden');
  showHud(false);
  if (document.pointerLockElement) document.exitPointerLock();
});
document.getElementById('btn-play-again').addEventListener('click', () => {
  hideVictory();
  G.victory = false;
  G.wanted = 0;
  G.health = 100;
  startJob(G, 0);
});
document.getElementById('btn-free-roam').addEventListener('click', () => {
  hideVictory();
  G.victory = false;
  G.objective = 'Free roam — the bay is yours. Spend your cash at the shops!';
  G.toast('Free roam! You own the bay.', 3);
});
document.getElementById('shop-close').addEventListener('click', () => hideShop(G));

// --- on-foot movement --------------------------------------------------------
function updateOnFoot(dt) {
  const input = G.input;
  const speed = input.sprint ? 10 : 6;
  const forward = { x: Math.sin(G.cameraYaw), z: Math.cos(G.cameraYaw) };
  const right = { x: Math.cos(G.cameraYaw), z: -Math.sin(G.cameraYaw) };
  let mx = 0;
  let mz = 0;
  if (input.forward) { mx += forward.x; mz += forward.z; }
  if (input.back) { mx -= forward.x; mz -= forward.z; }
  if (input.right) { mx += right.x; mz += right.z; }
  if (input.left) { mx -= right.x; mz -= right.z; }
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len;
    mz /= len;
    G.player.yaw = Math.atan2(mx, mz);
    const nx = G.player.pos.x + mx * speed * dt;
    const nz = G.player.pos.z + mz * speed * dt;
    const fixed = resolveCollision(G.world.colliders, nx, nz, 0.6);
    const clamped = clampToWorld(fixed.x, fixed.z, 2);
    G.player.pos.x = clamped.x;
    G.player.pos.z = clamped.z;
    playerMesh.visible = true;
    playerMesh.position.copy(G.player.pos);
    playerMesh.rotation.y = G.player.yaw;
    const phase = G.elapsed * 11;
    playerMesh.getObjectByName('legL').rotation.x = Math.sin(phase) * 0.6;
    playerMesh.getObjectByName('legR').rotation.x = -Math.sin(phase) * 0.6;
  } else {
    playerMesh.getObjectByName('legL').rotation.x = 0;
    playerMesh.getObjectByName('legR').rotation.x = 0;
  }
  G.speedKmh = 0;
}

// --- camera ------------------------------------------------------------------
function updateCamera(dt) {
  const { dx, dy } = consumeMouse(G.input);
  G.cameraYaw -= dx * 0.0028;
  G.cameraPitch = clamp(G.cameraPitch + dy * 0.0022, 0.08, 0.85);
  const dist = G.player.car ? 12 : 9;
  const height = G.player.car ? 4.8 : 3.8;
  const tx = G.player.pos.x - Math.sin(G.cameraYaw) * dist;
  const tz = G.player.pos.z - Math.cos(G.cameraYaw) * dist;
  let ty = height + Math.sin(G.cameraPitch) * 4;
  for (const c of G.world.colliders) {
    if (c.h && tx > c.minX - 0.5 && tx < c.maxX + 0.5 && tz > c.minZ - 0.5 && tz < c.maxZ + 0.5 && ty < c.h + 2) {
      ty = c.h + 2;
    }
  }
  camera.position.set(tx, ty, tz);
  camera.lookAt(G.player.pos.x, 1.6, G.player.pos.z);
  if (G.player.car && Math.abs(G.player.car.speed) > 3) {
    const diff = (G.player.car.heading - G.cameraYaw + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    G.cameraYaw += diff * Math.min(1, 2.2 * dt);
  }
}

// --- day / night -------------------------------------------------------------
const DAY_SKY = new THREE.Color(0x87bfe8);
const DUSK_SKY = new THREE.Color(0xff9a5a);
const NIGHT_SKY = new THREE.Color(0x0b1030);
const DAY_FOG = new THREE.Color(0x9fd0ee);
const NIGHT_FOG = new THREE.Color(0x141a35);

function updateSky(G, dt) {
  const mins = G.clockMinutes % 1440;
  const dayF = mins >= 360 && mins < 1020 ? 1 : mins >= 1020 && mins < 1200 ? 1 - (mins - 1020) / 180 : mins >= 300 && mins < 360 ? (mins - 300) / 60 : 0;
  const duskF = mins >= 1020 && mins < 1200 ? 1 - Math.abs(mins - 1110) / 90 : mins >= 300 && mins < 360 ? 1 - Math.abs(mins - 330) / 30 : 0;
  G.isNight = dayF < 0.4;
  G.isDusk = duskF > 0.3 && dayF > 0.2;
  const sky = new THREE.Color().copy(NIGHT_SKY).lerp(DAY_SKY, dayF).lerp(DUSK_SKY, clamp(duskF, 0, 0.6));
  renderer.setClearColor(sky);
  scene.fog.color.copy(NIGHT_FOG).lerp(DAY_FOG, dayF);
  const ang = ((mins - 360) / 1440) * Math.PI * 2;
  sun.position.set(Math.cos(ang) * 90, Math.sin(ang) * 90 + 20, -40);
  sun.intensity = 0.4 + dayF * 2.4;
  hemi.intensity = 0.5 + dayF * 1.0;
  for (const lamp of G.world.lamps) {
    lamp.material.color.setHex(dayF < 0.4 ? 0xffe9a3 : 0x555566);
  }
}

// --- main loop ---------------------------------------------------------------
const clock = new THREE.Clock();
let saveTimer = 0;
let frameCount = 0;
let lastX = G.player.pos.x;
let lastZ = G.player.pos.z;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  G.elapsed += dt;
  G.clockMinutes += dt * 0.35;
  G.punchCooldown = Math.max(0, G.punchCooldown - dt);
  G.shootCooldown = Math.max(0, G.shootCooldown - dt);
  updateSky(G, dt);

  if (G.started && !G.paused && !G.shopOpen) {
    G.records.playSeconds += dt;
    if (G.player.car) {
      G.speedKmh = driveAuto(G, dt);
      playerMesh.visible = false;
      for (const t of G.flow) {
        if (bumpAutos(G.player.car, t.car, 3.2)) hurtAuto(G.player.car, 2);
      }
      for (const p of G.parked) {
        if (p !== G.player.car && bumpAutos(G.player.car, p, 3.2)) hurtAuto(G.player.car, 2);
      }
      const car = G.player.car;
      if (car.health < 35 && !car.wrecked) {
        G.smokeTimer -= dt;
        if (G.smokeTimer <= 0) {
          G.smokeTimer = 0.25;
          spawnSmoke(scene, car.group.position.x, 1.6, car.group.position.z);
        }
      }
      if (G.boosting) {
        spawnFlame(scene, car.group.position.x, 0.7, car.group.position.z, car.heading);
      }
      if (car.wrecked) {
        G.toast('Your car is wrecked — get out (E) and find another!', 3);
      }
    } else {
      updateOnFoot(dt);
      playerMesh.visible = true;
      playerMesh.position.copy(G.player.pos);
      const car = nearestParkedAuto(4.2);
      const spot = nearestSpot(G);
      G.promptText = spot ? 'Press E — ' + spot.label : car ? 'Press E to take the car' : '';
    }
    // Auto-fire while holding the mouse with an automatic weapon.
    if (G.input.mouseDown && WEAPONS[G.weapon].auto) tryFire(G);
    const moved = dist2(G.player.pos.x, G.player.pos.z, lastX, lastZ);
    if (G.player.car) G.records.distanceM += moved;
    lastX = G.player.pos.x;
    lastZ = G.player.pos.z;
    G.district = districtAt(G.player.pos.x, G.player.pos.z);
    updateSignals(G, dt);
    updateFlow(G, dt);
    updateWalkers(G, dt);
    updateCops(G, dt);
    updateJobs(G, dt);
    updateStashes(G, dt);
    updateAmmoCrates(G, dt);
    updateParticles(G, dt);
    if (G.wanted === 0 && G.health < 100) G.health = Math.min(100, G.health + 3 * dt);
    if (G.health <= 0) {
      if (G.wanted > 0) bustPlayer();
      else respawnPatchedUp();
    }
    G.sound.setEngine(G.speedKmh, !!G.player.car);
    G.sound.setSiren(G.wanted);
    saveTimer += dt;
    if (saveTimer > 15) {
      saveTimer = 0;
      saveGame(G);
    }
    updatePanel(G);
  }
  if (G.world.water) G.world.water.position.y = 0.02 + Math.sin(G.elapsed * 0.7) * 0.05;
  if (G.world.beacon) {
    const top = G.world.beacon.getObjectByName('beaconLight');
    if (top) {
      top.material.color.setHex(Math.floor(G.elapsed * 2) % 2 === 0 ? 0xff2ea6 : 0x39e6ff);
      G.world.beacon.rotation.y = G.elapsed * 0.4;
    }
  }
  updateCamera(G.started && !G.paused ? dt : 0.016);
  if (!G.started) {
    const a = G.elapsed * 0.05;
    camera.position.set(Math.sin(a) * 80, 36, Math.cos(a) * 80);
    camera.lookAt(0, 4, 0);
  }
  renderer.render(scene, camera);
  frameCount += 1;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Screenshot staging runs before the first frame.
initPanel();
const shot = shotName();
if (shot) {
  G.started = true;
  showHud(true);
  applyShot(G, shot);
  startJob(G, G.jobIndex);
  hideDialog(G);
  if (shot === 'mission') {
    showDialog(G, JOBS[6].intro);
  }
  if (shot === 'garage') {
    openShopPanel(SPOTS.garage);
  }
  updatePanel(G);
}
animate();

// Test hooks (used by the maker's own Playwright checks, not by the game).
window.__NEONBAY3__ = {
  state: G,
  startJob: (i) => startJob(G, i),
  enterNearestAuto: () => {
    const c = nearestParkedAuto(99);
    if (c) {
      G.player.pos.set(c.group.position.x, 0, c.group.position.z);
      enterAuto(c);
    }
    return !!G.player.car;
  },
  teleport: (x, z) => {
    G.player.pos.set(x, 0, z);
    if (G.player.car) G.player.car.group.position.set(x, 0, z);
  },
  openShop: (kind) => openShopPanel(SPOTS[kind]),
  frames: () => frameCount,
};
