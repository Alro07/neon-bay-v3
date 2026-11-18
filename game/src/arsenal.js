// arsenal.js — combat for Neon Bay v3: four weapons (pistol, SMG, shotgun,
// rifle), mouse-aimed shooting with spread and tracers, a punch for close
// quarters, and the particle system (sparks, smoke, NOS flames) they feed.
import * as THREE from 'three';
import { clamp, dist2 } from './kit.js';

export const WEAPONS = {
  pistol: { name: 'P9 Pistol', dmg: 26, rate: 0.3, spread: 0.02, pellets: 1, range: 55, auto: false, price: 0, ammoPrice: 25 },
  smg: { name: 'VK-9 SMG', dmg: 13, rate: 0.09, spread: 0.07, pellets: 1, range: 45, auto: true, price: 400, ammoPrice: 40 },
  shotgun: { name: 'M12 Scattergun', dmg: 11, rate: 0.85, spread: 0.14, pellets: 6, range: 26, auto: false, price: 700, ammoPrice: 60 },
  rifle: { name: 'AR-77 Rifle', dmg: 58, rate: 0.5, spread: 0.01, pellets: 1, range: 90, auto: false, price: 1200, ammoPrice: 80 },
};
export const WEAPON_ORDER = ['pistol', 'smg', 'shotgun', 'rifle'];

const particles = [];

function addParticle(scene, mesh, vel, life, spin) {
  scene.add(mesh);
  particles.push({ mesh, vel, life, maxLife: life, spin: spin ?? 0 });
}

export function spawnSparks(scene, x, y, z) {
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.14, 0.14),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd23e : 0xff6a3d }),
    );
    m.position.set(x, y, z);
    addParticle(scene, m, {
      x: (Math.random() - 0.5) * 7,
      y: Math.random() * 4 + 1,
      z: (Math.random() - 0.5) * 7,
    }, 0.45, 6);
  }
}

export function spawnSmoke(scene, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.55 }),
  );
  m.position.set(x, y, z);
  addParticle(scene, m, { x: 0, y: 1.2, z: 0 }, 1.4, 0);
}

export function spawnFlame(scene, x, y, z, heading) {
  const m = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.6, 8),
    new THREE.MeshBasicMaterial({ color: 0x39a6ff, transparent: true, opacity: 0.9 }),
  );
  m.position.set(x - Math.sin(heading) * 2.4, y, z - Math.cos(heading) * 2.4);
  m.rotation.x = Math.PI / 2;
  m.rotation.y = heading;
  addParticle(scene, m, {
    x: -Math.sin(heading) * 6,
    y: 0.4,
    z: -Math.cos(heading) * 6,
  }, 0.3, 0);
}

export function updateParticles(G, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      G.scene.remove(p.mesh);
      particles.splice(i, 1);
      continue;
    }
    p.mesh.position.x += p.vel.x * dt;
    p.mesh.position.y += p.vel.y * dt;
    p.mesh.position.z += p.vel.z * dt;
    p.mesh.rotation.x += p.spin * dt;
    p.mesh.rotation.y += p.spin * dt;
    const f = p.life / p.maxLife;
    if (p.mesh.material.transparent) p.mesh.material.opacity = 0.9 * f;
    if (p.mesh.geometry.type === 'SphereGeometry') p.mesh.scale.setScalar(1 + (1 - f) * 1.6);
  }
}

// Aim direction: the camera yaw on foot, the car heading while driving.
function aimOf(G) {
  return G.player.car ? G.player.car.heading : G.cameraYaw;
}

function nearestTarget(G, ax, az, dirX, dirZ, range) {
  let best = null;
  let bestScore = 1e9;
  const consider = (x, z, kind, ref) => {
    const dx = x - ax;
    const dz = z - az;
    const along = dx * dirX + dz * dirZ;
    if (along < 1 || along > range) return;
    const side = Math.abs(dx * dirZ - dz * dirX);
    if (side > 2.2 + along * 0.03) return;
    const score = along + side * 6;
    if (score < bestScore) {
      bestScore = score;
      best = { kind, ref, x, z, along };
    }
  };
  for (const c of G.cops) {
    if (!c.car.wrecked) consider(c.car.group.position.x, c.car.group.position.z, 'cop', c);
  }
  for (const f of G.flow) {
    if (!f.car.wrecked) consider(f.car.group.position.x, f.car.group.position.z, 'traffic', f);
  }
  for (const p of G.parked) {
    if (!p.wrecked) consider(p.group.position.x, p.group.position.z, 'parked', p);
  }
  for (const w of G.walkers) {
    if (!w.fare) consider(w.x, w.z, 'walker', w);
  }
  return best;
}

export function tryFire(G) {
  if (!G.started || G.paused || G.shootCooldown > 0) return;
  const w = G.weapons[G.weapon];
  if (!w.owned) return;
  if (w.ammo <= 0) {
    G.toast('Out of ammo — buy more at Harbor Guns', 2.5);
    G.sound.click();
    G.shootCooldown = 0.35;
    return;
  }
  w.ammo -= 1;
  G.shootCooldown = WEAPONS[G.weapon].rate;
  G.records.shotsFired += 1;
  G.sound.shot();
  const def = WEAPONS[G.weapon];
  const aim = aimOf(G) + (Math.random() - 0.5) * def.spread * 2;
  const ox = G.player.pos.x;
  const oz = G.player.pos.z;
  const dirX = Math.sin(aim);
  const dirZ = Math.cos(aim);
  // Muzzle flash + tracer.
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe9a3 }),
  );
  flash.position.set(ox + dirX * 1.2, 1.4, oz + dirZ * 1.2);
  addParticle(G.scene, flash, { x: 0, y: 0, z: 0 }, 0.08, 0);
  for (let p = 0; p < def.pellets; p++) {
    const hit = nearestTarget(G, ox, oz, dirX, dirZ, def.range);
    if (!hit) break;
    spawnSparks(G.scene, hit.x, 1.2, hit.z);
    if (hit.kind === 'cop') {
      hit.ref.car.health -= def.dmg;
      if (hit.ref.car.health <= 0 && !hit.ref.car.wrecked) {
        hit.ref.car.wrecked = true;
        hit.ref.car.speed = 0;
        hit.ref.car.bodyMat.color.setHex(0x2a2a2a);
        G.records.copsDown += 1;
        G.cash += 50;
        G.toast('Cruiser down! +$50', 2);
      }
    } else if (hit.kind === 'traffic' || hit.kind === 'parked') {
      hit.ref.car.health -= def.dmg;
      if (hit.ref.car.health <= 0 && !hit.ref.car.wrecked) {
        hit.ref.car.wrecked = true;
        hit.ref.car.speed = 0;
        hit.ref.car.bodyMat.color.setHex(0x2a2a2a);
      }
    } else if (hit.kind === 'walker') {
      hit.ref.panic = 5;
      hit.ref.panicX = ox;
      hit.ref.panicZ = oz;
    }
  }
  // Firing in public draws the heat.
  if (G.wanted < 5) {
    G.lastCrimeAt = G.elapsed;
    if (Math.random() < 0.5) G.wanted = Math.min(5, G.wanted + 1);
  }
}

export function tryPunch(G) {
  if (!G.started || G.paused || G.punchCooldown > 0) return;
  G.punchCooldown = 0.45;
  G.sound.punch();
  const ox = G.player.pos.x;
  const oz = G.player.pos.z;
  for (const w of G.walkers) {
    if (dist2(w.x, w.z, ox, oz) < 2.2) {
      w.panic = 4;
      w.panicX = ox;
      w.panicZ = oz;
      G.lastCrimeAt = G.elapsed;
    }
  }
  for (const c of G.cops) {
    const cx = c.car.group.position.x;
    const cz = c.car.group.position.z;
    if (dist2(cx, cz, ox, oz) < 2.6 && !c.car.wrecked) {
      c.car.health -= 20;
      if (c.car.health <= 0) {
        c.car.wrecked = true;
        c.car.speed = 0;
        G.records.copsDown += 1;
      }
      raiseHeatLocal(G);
    }
  }
}

function raiseHeatLocal(G) {
  G.wanted = Math.min(5, G.wanted + 1);
  G.lastCrimeAt = G.elapsed;
}
