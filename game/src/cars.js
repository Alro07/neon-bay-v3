// cars.js — vehicles for Neon Bay v3: the car factory (sedans, sport coupes,
// trucks, police cruisers), parked cars, the player's driving physics with
// NOS boost, damage and wrecks, and simple circle collision between cars.
import * as THREE from 'three';
import { mulberry, pick, clamp, dist2 } from './kit.js';
import { resolveCollision, clampToWorld, LANES } from './world.js';

const PAINT = [0xc84a3a, 0x3a7ac8, 0xe8c83a, 0x4ac88a, 0x8a4ac8, 0xd8d8d8, 0x2a2f45, 0xff6a3d, 0x39e6ff];
const SPORT_PAINT = [0xff2ea6, 0xffd23e, 0x39e6ff, 0xff4d6d];

export function makeAuto(scene, opts = {}) {
  const sport = !!opts.sport;
  const color = opts.color ?? (sport ? pick(mulberry((Math.random() * 1e9) | 0), SPORT_PAINT) : pick(mulberry((Math.random() * 1e9) | 0), PAINT));
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(sport ? 2.0 : 2.1, 0.72, sport ? 4.4 : 4.1), bodyMat);
  body.position.y = 0.62;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.62, sport ? 1.9 : 2.1),
    new THREE.MeshLambertMaterial({ color: 0x1a2438 }),
  );
  cabin.position.set(0, 1.28, sport ? -0.2 : 0.1);
  group.add(cabin);
  if (opts.police) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
    bar.position.set(0, 1.68, 0.1);
    bar.name = 'lightBar';
    group.add(bar);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.12, 0.3, 4.12),
      new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
    );
    stripe.position.y = 0.85;
    group.add(stripe);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    group.add(w);
    wheels.push(w);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const sx of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headMat);
    h.position.set(sx, 0.62, 2.06);
    group.add(h);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    tail.position.set(sx, 0.62, -2.06);
    group.add(tail);
  }
  if (sport) {
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 4.8),
      new THREE.MeshBasicMaterial({ color: 0xff2ea6, transparent: true, opacity: 0.28 }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.06;
    group.add(glow);
  }
  group.position.set(opts.x ?? 0, 0, opts.z ?? 0);
  group.rotation.y = opts.heading ?? 0;
  scene.add(group);
  const maxHealth = 100 + (opts.armorBonus ?? 0);
  return {
    group, wheels, bodyMat, sport,
    heading: opts.heading ?? 0,
    speed: 0,
    health: maxHealth,
    maxHealth,
    wrecked: false,
    parked: opts.parked !== false,
    stolen: false,
    police: !!opts.police,
    topSpeed: (sport ? 34 : 26) * (opts.turboBonus ?? 1),
    accel: sport ? 15 : 11,
    steer: 0,
  };
}

export function spawnParkedAutos(scene, rng) {
  const cars = [];
  const spots = [];
  for (const road of LANES) {
    for (const d of [-95, -70, -48, -20, 12, 38, 62, 88]) {
      spots.push({ x: road + 3.4, z: d, heading: 0 });
      spots.push({ x: road - 3.4, z: d + 4, heading: Math.PI });
    }
  }
  for (let i = 0; i < 16; i++) {
    const s = spots[Math.floor(rng() * spots.length)];
    const sport = rng() < 0.3;
    const car = makeAuto(scene, {
      x: s.x, z: s.z, heading: s.heading, sport,
      color: sport ? pick(rng, SPORT_PAINT) : pick(rng, PAINT),
      parked: true,
    });
    cars.push(car);
  }
  return cars;
}

export function hurtAuto(car, dmg) {
  if (car.wrecked) return;
  car.health -= dmg;
  if (car.health <= 0) {
    car.health = 0;
    car.wrecked = true;
    car.speed = 0;
    car.bodyMat.color.setHex(0x2a2a2a);
  }
}

// Circle push between two cars; returns true when they touched.
export function bumpAutos(a, b, minD) {
  const d = dist2(a.group.position.x, a.group.position.z, b.group.position.x, b.group.position.z);
  if (d >= minD || d < 0.001) return false;
  const push = (minD - d) / 2;
  const nx = (a.group.position.x - b.group.position.x) / d;
  const nz = (a.group.position.z - b.group.position.z) / d;
  a.group.position.x += nx * push;
  a.group.position.z += nz * push;
  b.group.position.x -= nx * push;
  b.group.position.z -= nz * push;
  const tmp = a.speed;
  a.speed = b.speed * 0.4;
  b.speed = tmp * 0.4;
  return true;
}

// Player driving: throttle, steering, handbrake, NOS boost, building hits.
export function driveAuto(G, dt) {
  const car = G.player.car;
  const input = G.input;
  if (!car || car.wrecked) return 0;
  const turbo = 1 + 0.2 * G.upgrades.turbo;
  const top = car.topSpeed * turbo;
  let boosting = false;
  if (input.forward) car.speed += car.accel * dt;
  if (input.back) {
    if (car.speed > 1) car.speed -= car.accel * 1.4 * dt;
    else car.speed -= car.accel * 0.55 * dt;
  }
  if (!input.forward && !input.back) {
    car.speed -= Math.sign(car.speed) * 7 * dt;
    if (Math.abs(car.speed) < 0.4) car.speed = 0;
  }
  if (input.brake) {
    car.speed -= Math.sign(car.speed) * 22 * dt;
    if (Math.abs(car.speed) < 0.5) car.speed = 0;
  }
  if (input.nos && G.nos > 0 && car.speed > 4) {
    boosting = true;
    G.nos = Math.max(0, G.nos - 34 * dt);
    car.speed += car.accel * 1.1 * dt;
  }
  car.speed = clamp(car.speed, -11, boosting ? top * 1.55 : top);
  const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const steerAmount = steerInput * clamp(Math.abs(car.speed) / 12, 0, 1) * (car.speed < 0 ? -1 : 1);
  car.heading += steerAmount * 1.9 * dt;
  car.steer = steerInput;
  const nx = car.group.position.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.group.position.z + Math.cos(car.heading) * car.speed * dt;
  const fixed = resolveCollision(G.world.colliders, nx, nz, 1.4);
  const hitWall = fixed.x !== nx || fixed.z !== nz;
  if (hitWall && Math.abs(car.speed) > 6) {
    hurtAuto(car, Math.abs(car.speed) * 0.9);
    G.sound.thud();
    car.speed *= 0.35;
  }
  const clamped = clampToWorld(fixed.x, fixed.z, 2);
  car.group.position.x = clamped.x;
  car.group.position.z = clamped.z;
  car.group.rotation.y = car.heading;
  for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.2;
  G.boosting = boosting;
  return Math.abs(car.speed) * 2.237;
}
