// crowd.js — pedestrians for Neon Bay v3: forty walkers strolling the
// sidewalks, fleeing from speeding cars and gunfire, and a few who wait as
// taxi fares with a marker over their heads.
import * as THREE from 'three';
import { mulberry, pick, clamp } from './kit.js';
import { resolveCollision, clampToWorld } from './world.js';

const SHIRTS = [0xe84a5f, 0x4a8ae8, 0x4ae88a, 0xe8c84a, 0x9a4ae8, 0xe8e8e8, 0x3a3f55, 0xff8a3d];

export function makeWalker(scene, rng, x, z) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, SHIRTS) });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.95, 0.36), shirt);
  body.position.y = 1.0;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 10),
    new THREE.MeshLambertMaterial({ color: pick(rng, [0xf2c89b, 0x8a5a3a, 0xe8b88a, 0x5a3a22]) }),
  );
  head.position.y = 1.72;
  group.add(head);
  const pants = new THREE.MeshLambertMaterial({ color: pick(rng, [0x1c2440, 0x3a3a3a, 0x5a4a3a]) });
  for (const sx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.24), pants);
    leg.position.set(sx, 0.3, 0);
    leg.name = sx < 0 ? 'legL' : 'legR';
    group.add(leg);
  }
  group.position.set(x, 0, z);
  scene.add(group);
  return {
    mesh: group,
    x, z,
    heading: rng() * Math.PI * 2,
    speed: 1.2 + rng() * 1.1,
    panic: 0,
    panicX: 0,
    panicZ: 0,
    phase: rng() * 10,
    fare: false,
  };
}

export function spawnWalkers(scene, rng) {
  const walkers = [];
  for (let i = 0; i < 40; i++) {
    const road = pick(rng, [-66, -33, 0, 33, 66]);
    const along = -100 + rng() * 200;
    const side = rng() < 0.5 ? 8 : -8;
    const ns = rng() < 0.5;
    walkers.push(makeWalker(scene, rng, ns ? road + side : along, ns ? along : road + side));
  }
  return walkers;
}

export function startleWalkers(G, x, z, radius) {
  for (const w of G.walkers) {
    const d = Math.hypot(w.x - x, w.z - z);
    if (d < radius) {
      w.panic = 3 + Math.random() * 2;
      w.panicX = x;
      w.panicZ = z;
    }
  }
}

export function updateWalkers(G, dt) {
  for (const w of G.walkers) {
    if (w.fare) continue;
    let speed = w.speed;
    let heading = w.heading;
    if (w.panic > 0) {
      w.panic -= dt;
      speed = 5.5;
      heading = Math.atan2(w.x - w.panicX, w.z - w.panicZ);
      w.heading = heading;
    } else if (Math.random() < dt * 0.12) {
      w.heading += (Math.random() - 0.5) * 1.6;
    }
    const nx = w.x + Math.sin(w.heading) * speed * dt;
    const nz = w.z + Math.cos(w.heading) * speed * dt;
    const fixed = resolveCollision(G.world.colliders, nx, nz, 0.5);
    const clamped = clampToWorld(fixed.x, fixed.z, 3);
    w.x = clamped.x;
    w.z = clamped.z;
    w.mesh.position.set(w.x, 0, w.z);
    w.mesh.rotation.y = w.heading;
    const phase = G.elapsed * 9 + w.phase;
    const swing = speed > 3 ? 0.9 : 0.45;
    w.mesh.getObjectByName('legL').rotation.x = Math.sin(phase) * swing;
    w.mesh.getObjectByName('legR').rotation.x = -Math.sin(phase) * swing;
    // A walker hit by the player's speeding car gets knocked down and the
    // heat goes up.
    if (G.player.car && Math.abs(G.player.car.speed) > 8) {
      const d = Math.hypot(w.x - G.player.car.group.position.x, w.z - G.player.car.group.position.z);
      if (d < 1.6) {
        w.panic = 4;
        w.panicX = G.player.car.group.position.x;
        w.panicZ = G.player.car.group.position.z;
        w.mesh.rotation.z = 1.4;
        setTimeout(() => { w.mesh.rotation.z = 0; }, 1200);
        if (G.wanted < 5) {
          G.wanted = Math.min(5, G.wanted + 1);
          G.toast('Pedestrian hit! Bay PD is on you.', 2.5);
        }
      }
    }
  }
}
