// cops.js — the Bay PD for Neon Bay v3: a five-star wanted level, cruiser
// chases that ram the player, a police helicopter with a spotlight from four
// stars, roadblocks from three stars, heat that cools off when the player
// lays low, and the BUSTED catch when a cruiser corners the player on foot.
import * as THREE from 'three';
import { mulberry, clamp, angDiff, dist2 } from './kit.js';
import { makeAuto, hurtAuto, bumpAutos } from './cars.js';

export function raiseHeat(G, stars, why) {
  if (G.wanted >= 5) return;
  G.wanted = Math.min(5, G.wanted + stars);
  G.heatTimer = 0;
  G.lastCrimeAt = G.elapsed;
  if (why) G.toast(why + ' — wanted level ' + G.wanted + '!', 2.5);
  G.sound.sirenBlip();
}

export function spawnCopCar(G, x, z) {
  const px = x ?? G.player.pos.x + (Math.random() - 0.5) * 60;
  const pz = z ?? G.player.pos.z + (Math.random() - 0.5) * 60;
  const car = makeAuto(G.scene, {
    x: px, z: pz, heading: Math.random() * Math.PI * 2,
    color: 0x1a1d2a, police: true, parked: false, sport: true,
  });
  car.health = 80;
  car.maxHealth = 80;
  const cop = { car, stuck: 0, ramAt: 0 };
  G.cops.push(cop);
  return cop;
}

function spawnHeli(G) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.2, 5.2),
    new THREE.MeshLambertMaterial({ color: 0x1a1d2a }),
  );
  body.position.y = 0;
  group.add(body);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.8, 4.4),
    new THREE.MeshLambertMaterial({ color: 0x1a1d2a }),
  );
  tail.position.set(0, 0.2, -4.4);
  group.add(tail);
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.08, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x333333 }),
  );
  rotor.position.y = 0.9;
  rotor.name = 'rotor';
  group.add(rotor);
  const spot = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 14, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
  );
  spot.position.y = -7;
  group.add(spot);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.24, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x2244ff }),
  );
  bar.position.set(0, 0.7, 1.6);
  bar.name = 'heliBar';
  group.add(bar);
  group.position.set(G.player.pos.x, 26, G.player.pos.z);
  G.scene.add(group);
  G.heli = { group, rotor, angle: 0 };
}

function spawnRoadblock(G) {
  const px = G.player.pos.x;
  const pz = G.player.pos.z;
  const heading = G.player.car ? G.player.car.heading : G.player.yaw;
  const ahead = 26;
  const bx = px + Math.sin(heading) * ahead;
  const bz = pz + Math.cos(heading) * ahead;
  for (const side of [-4, 0, 4]) {
    const cx = bx + Math.cos(heading) * side;
    const cz = bz - Math.sin(heading) * side;
    const car = makeAuto(G.scene, {
      x: cx, z: cz, heading: heading + Math.PI / 2,
      color: 0x1a1d2a, police: true, parked: false,
    });
    car.health = 90;
    car.maxHealth = 90;
    G.roadblocks.push({ car, born: G.elapsed });
  }
  G.toast('ROADBLOCK AHEAD!', 2.5);
  G.sound.sirenBlip();
}

export function clearCops(G) {
  for (const c of G.cops) G.scene.remove(c.car.group);
  G.cops = [];
  for (const r of G.roadblocks) G.scene.remove(r.car.group);
  G.roadblocks = [];
  if (G.heli) {
    G.scene.remove(G.heli.group);
    G.heli = null;
  }
}

export function updateCops(G, dt) {
  // Keep the cruiser count matched to the wanted level.
  const want = G.wanted === 0 ? 0 : Math.min(G.wanted + 1, 6);
  while (G.cops.length < want) spawnCopCar(G);
  while (G.cops.length > want) {
    const c = G.cops.pop();
    G.scene.remove(c.car.group);
  }
  // Helicopter from four stars.
  if (G.wanted >= 4 && !G.heli) {
    spawnHeli(G);
    G.toast('Police helicopter overhead!', 2.5);
  }
  if (G.wanted < 4 && G.heli) {
    G.scene.remove(G.heli.group);
    G.heli = null;
  }
  if (G.heli) {
    G.heli.angle += dt * 0.55;
    const hx = G.player.pos.x + Math.cos(G.heli.angle) * 16;
    const hz = G.player.pos.z + Math.sin(G.heli.angle) * 16;
    G.heli.group.position.set(hx, 26 + Math.sin(G.elapsed * 0.8) * 1.5, hz);
    G.heli.group.lookAt(G.player.pos.x, 0, G.player.pos.z);
    G.heli.rotor.rotation.y += dt * 22;
    G.heli.group.getObjectByName('heliBar').material.color.setHex(
      Math.floor(G.elapsed * 4) % 2 === 0 ? 0x2244ff : 0xff2222,
    );
  }
  // Roadblocks from three stars, at most one every 40 seconds.
  if (G.wanted >= 3 && G.elapsed - G.lastRoadblockAt > 40) {
    G.lastRoadblockAt = G.elapsed;
    spawnRoadblock(G);
  }
  // Roadblocks fade after a minute.
  for (let i = G.roadblocks.length - 1; i >= 0; i--) {
    if (G.elapsed - G.roadblocks[i].born > 60) {
      G.scene.remove(G.roadblocks[i].car.group);
      G.roadblocks.splice(i, 1);
    }
  }
  // Chase behaviour: steer toward the player, ram, flash the light bar.
  const tx = G.player.pos.x;
  const tz = G.player.pos.z;
  let nearOnFoot = false;
  for (let i = G.cops.length - 1; i >= 0; i--) {
    const cop = G.cops[i];
    const car = cop.car;
    if (car.wrecked) {
      cop.stuck += dt;
      if (cop.stuck > 6) {
        G.scene.remove(car.group);
        G.cops.splice(i, 1);
      }
      continue;
    }
    const d = dist2(car.group.position.x, car.group.position.z, tx, tz);
    const wantHeading = Math.atan2(tx - car.group.position.x, tz - car.group.position.z);
    const diff = angDiff(wantHeading, car.heading);
    car.heading += clamp(diff, -1.9 * dt, 1.9 * dt);
    const targetSpeed = d > 26 ? 30 : d > 10 ? 24 : 13;
    car.speed += (targetSpeed - car.speed) * Math.min(1, 1.6 * dt);
    car.group.position.x += Math.sin(car.heading) * car.speed * dt;
    car.group.position.z += Math.cos(car.heading) * car.speed * dt;
    car.group.rotation.y = car.heading;
    for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.2;
    const bar = car.group.getObjectByName('lightBar');
    if (bar) bar.material.color.setHex(Math.floor(G.elapsed * 5) % 2 === 0 ? 0xff2222 : 0x2244ff);
    // Ram the player's car; bump damage both ways.
    if (G.player.car && !G.player.car.wrecked) {
      if (bumpAutos(car, G.player.car, 3.4)) {
        hurtAuto(G.player.car, 4);
        hurtAuto(car, 3);
        G.sound.thud();
        if (G.player.car.wrecked) G.toast('Your car is wrecked — run!', 3);
      }
    }
    if (!G.player.car && d < 3.2) nearOnFoot = true;
  }
  // BUSTED: a cruiser sits on the player on foot for a moment.
  if (nearOnFoot) {
    G.bustTimer += dt;
    if (G.bustTimer > 1.6) G.onBusted();
  } else {
    G.bustTimer = Math.max(0, G.bustTimer - dt * 2);
  }
  // Heat cools off when the player lays low: no crime for 25 s and every
  // cruiser farther than 45 m, then one star fades every 8 s.
  if (G.wanted > 0 && G.elapsed - G.lastCrimeAt > 25) {
    let seen = false;
    for (const c of G.cops) {
      if (dist2(c.car.group.position.x, c.car.group.position.z, tx, tz) < 45) {
        seen = true;
        break;
      }
    }
    if (!seen) {
      G.heatTimer += dt;
      if (G.heatTimer > 8) {
        G.heatTimer = 0;
        G.wanted -= 1;
        G.toast('Heat cooling off… wanted level ' + G.wanted, 2);
      }
    } else {
      G.heatTimer = 0;
    }
  }
}
