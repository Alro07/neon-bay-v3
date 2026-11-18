// flow.js — street traffic for Neon Bay v3: cars cruising the road grid on
// lanes, stopping at red lights, slowing for the car ahead, and the four
// signalled intersections cycling green north-south / east-west.
import { mulberry, pick } from './kit.js';
import { makeAuto } from './cars.js';
import { LANES } from './world.js';

export function spawnFlow(scene, rng) {
  const flow = [];
  for (let i = 0; i < 12; i++) {
    const ns = rng() < 0.5;
    const road = pick(rng, LANES);
    const dir = rng() < 0.5 ? 1 : -1;
    const along = -95 + rng() * 190;
    const car = makeAuto(scene, {
      x: ns ? road + (dir > 0 ? 2.2 : -2.2) : along,
      z: ns ? along : road + (dir > 0 ? 2.2 : -2.2),
      heading: ns ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      parked: false,
      sport: rng() < 0.15,
    });
    flow.push({ car, ns, road, dir, cruise: 9 + rng() * 5 });
  }
  return flow;
}

function signalAt(G, x, z) {
  let best = null;
  let bestD = 1e9;
  for (const s of G.world.signals) {
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return bestD < 14 ? best : null;
}

export function updateSignals(G, dt) {
  for (const s of G.world.signals) {
    s.timer -= dt;
    if (s.timer <= 0) {
      s.timer = 8;
      s.nsGreen = !s.nsGreen;
    }
    // Lamp order: red, amber, green. NS green shows green on top lamps.
    const red = s.nsGreen ? 0x331111 : 0xff2a2a;
    const green = s.nsGreen ? 0x2aff5a : 0x113311;
    s.mats[0].color.setHex(red);
    s.mats[1].color.setHex(0x332211);
    s.mats[2].color.setHex(green);
  }
}

export function updateFlow(G, dt) {
  for (const f of G.flow) {
    const car = f.car;
    if (car.wrecked) continue;
    let target = f.cruise;
    const px = car.group.position.x;
    const pz = car.group.position.z;
    // Stop at a red light just before the intersection.
    const sig = signalAt(G, px, pz);
    if (sig) {
      const green = f.ns ? sig.nsGreen : !sig.nsGreen;
      const toSig = f.ns
        ? (pz - sig.z) * f.dir
        : (px - sig.x) * f.dir;
      if (!green && toSig > -16 && toSig < -6) target = 0;
    }
    // Slow for the player's car or another traffic car ahead.
    const ahead = G.player.car;
    if (ahead && !ahead.wrecked) {
      const d = Math.hypot(ahead.group.position.x - px, ahead.group.position.z - pz);
      if (d < 9) target = Math.min(target, 2);
    }
    for (const o of G.flow) {
      if (o === f || o.car.wrecked) continue;
      const d = Math.hypot(o.car.group.position.x - px, o.car.group.position.z - pz);
      if (d < 8 && d > 0.01) {
        const dot = f.ns
          ? (o.car.group.position.z - pz) * f.dir
          : (o.car.group.position.x - px) * f.dir;
        if (dot > 0) target = Math.min(target, 1.5);
      }
    }
    car.speed += (target - car.speed) * Math.min(1, 2.2 * dt);
    if (f.ns) {
      car.group.position.z += f.dir * car.speed * dt;
      car.heading = f.dir > 0 ? 0 : Math.PI;
      if (car.group.position.z > 108) car.group.position.z = -108;
      if (car.group.position.z < -108) car.group.position.z = 108;
    } else {
      car.group.position.x += f.dir * car.speed * dt;
      car.heading = f.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (car.group.position.x > 108) car.group.position.x = -108;
      if (car.group.position.x < -108) car.group.position.x = 108;
    }
    car.group.rotation.y = car.heading;
    for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.2;
  }
}
