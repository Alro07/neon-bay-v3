// snaps.js — deterministic staging for screenshots. ?shot=cover|drive|foot|
// mission|garage places the player, sets the wanted level, spawns police
// and opens the right job state BEFORE the first frame renders, so each
// screenshot shows the system it is meant to show. Used by the maker only;
// normal play ignores it.
import { startJob, JOBS } from './story.js';
import { spawnCopCar } from './cops.js';
import { districtAt } from './world.js';
import { hideDialog } from './panel.js';

export function shotName() {
  const q = new URLSearchParams(window.location.search).get('shot');
  return ['cover', 'drive', 'foot', 'mission', 'garage'].includes(q) ? q : null;
}

function enterAutoForShot(G, index) {
  const car = G.parked[index % G.parked.length];
  car.parked = false;
  car.stolen = true;
  G.player.car = car;
  G.player.inCar = true;
  G.player.onFoot = false;
  G.player.pos.set(car.group.position.x, 0, car.group.position.z);
  return car;
}

export function applyShot(G, name) {
  if (!name) return;
  G.started = true;
  G.shotMode = name;
  document.getElementById('start-screen').classList.add('hidden');
  if (name === 'cover') {
    // Golden-hour police chase down the Neon Strip: player in a sport coupe,
    // three wanted stars, cruisers closing in, the job waypoint on the HUD
    // and the minimap, district name showing.
    G.clockMinutes = 18 * 60 + 25;
    const car = enterAutoForShot(G, 1);
    G.player.pos.set(0, 0, 70);
    car.group.position.set(0, 0, 70);
    car.heading = Math.PI;
    car.group.rotation.y = Math.PI;
    car.speed = 20;
    G.wanted = 3;
    spawnCopCar(G);
    spawnCopCar(G);
    G.cops[0].car.group.position.set(-5, 0, 78);
    G.cops[1].car.group.position.set(6, 0, 80);
    G.cameraYaw = Math.PI;
    G.cameraPitch = 0.32;
    startJob(G, 0);
    hideDialog(G);
  } else if (name === 'drive') {
    // Midday cruise through the Glass Quarter with traffic and a green light.
    G.clockMinutes = 12 * 60 + 10;
    const car = enterAutoForShot(G, 4);
    G.player.pos.set(33, 0, -20);
    car.group.position.set(33, 0, -20);
    car.heading = 0;
    car.group.rotation.y = 0;
    car.speed = 18;
    G.cameraYaw = 0;
    G.cameraPitch = 0.3;
    startJob(G, 0);
    hideDialog(G);
  } else if (name === 'foot') {
    // Morning on foot by Palm Park: pedestrians nearby, a glowing stash
    // crate ahead, the stash job active.
    G.clockMinutes = 9 * 60 + 40;
    G.player.pos.set(-46, 0, 42);
    G.player.yaw = Math.PI;
    G.cameraYaw = Math.PI;
    G.cameraPitch = 0.28;
    for (let i = 0; i < 4 && i < G.walkers.length; i++) {
      G.walkers[i].x = -42 + i * 1.8;
      G.walkers[i].z = 36 - i * 1.5;
      G.walkers[i].mesh.position.set(G.walkers[i].x, 0, G.walkers[i].z);
    }
    startJob(G, 5);
    hideDialog(G);
  } else if (name === 'mission') {
    // Afternoon story beat: Dana's dialogue open for the gun-runner job,
    // Harbor Guns waypoint on the HUD and minimap.
    G.clockMinutes = 15 * 60 + 5;
    G.player.pos.set(-8, 0, 70);
    G.player.yaw = -0.6;
    G.cameraYaw = -0.6;
    G.cameraPitch = 0.3;
    startJob(G, 6);
  } else if (name === 'garage') {
    // Evening at Neon Motors: the player stands by a sport coupe at the
    // garage while the upgrade shop panel is open (opened by boot.js).
    G.clockMinutes = 19 * 60 + 30;
    G.cash = 2400;
    const car = enterAutoForShot(G, 2);
    G.player.pos.set(82, 0, 4);
    car.group.position.set(82, 0, 4);
    car.heading = Math.PI / 2;
    car.group.rotation.y = Math.PI / 2;
    G.player.car = null;
    G.player.inCar = false;
    G.player.onFoot = true;
    G.player.pos.set(78, 0, 2);
    G.player.yaw = Math.PI / 2;
    G.cameraYaw = Math.PI / 2;
    G.cameraPitch = 0.3;
    startJob(G, 8);
    hideDialog(G);
  }
  G.district = districtAt(G.player.pos.x, G.player.pos.z);
}
