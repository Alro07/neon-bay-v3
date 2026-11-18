// story.js — the story of Neon Bay v3: ten jobs for Rook, a driver new to
// the bay, handed out by Dana Reyes, the fixer who runs the Neon Strip.
// Each job has a name, a payout, a short dialogue, and a kind: reach a place,
// steal a car, escape the heat, beat the clock, drive fares, collect stashes,
// buy a gun, win a street race, deliver a tuned car, and the five-star
// finale. A light pillar marks the waypoint; stashes and ammo crates glow.
import * as THREE from 'three';
import { dist2 } from './kit.js';
import { WEAPONS } from './arsenal.js';
import { SPOTS } from './economy.js';
import { startleWalkers } from './crowd.js';

export const JOBS = [
  {
    id: 'first-drop', title: '1 — First Drop', pay: 150, kind: 'goto',
    brief: 'Take the package to the pier at Marina Point.',
    intro: ["DANA: Rook. You made it to the bay. First rule: nobody asks what's in the package.",
      'DANA: Take it to the pier at Marina Point. Walk, drive, steal — your call.'],
    to: { x: -104, z: 16, label: 'Marina Pier' },
  },
  {
    id: 'hot-wheels', title: '2 — Hot Wheels', pay: 250, kind: 'car',
    brief: 'Steal a sports car and bring it to the Neon Strip.',
    intro: ['DANA: A client wants a sport coupe, no questions. Grab any pink or gold one.',
      'DANA: Bring it to the Strip. Cops notice a stolen coupe, so be quick.'],
    to: { x: 0, z: 66, label: 'Neon Strip' },
  },
  {
    id: 'heat-wave', title: '3 — Heat Wave', pay: 300, kind: 'escape',
    brief: 'The PD is onto you. Lose the heat, then reach Voss Plaza.',
    intro: ['DANA: You tripped a camera, Rook. Two stars and climbing.',
      'DANA: Lay low till the heat fades, then meet me at Voss Plaza.'],
    startWanted: 2,
    to: { x: 0, z: 0, label: 'Voss Plaza' },
  },
  {
    id: 'midnight-courier', title: '4 — Midnight Courier', pay: 400, kind: 'timed',
    brief: 'Three drops, 100 seconds, across three districts.',
    intro: ['DANA: Three envelopes, three districts, one hundred seconds.',
      'DANA: Old Port, Coral Row, Canal Town. Drive like the bay is on fire.'],
    timed: 100,
    stops: [
      { x: -82, z: -66, label: 'Old Port' },
      { x: 82, z: -66, label: 'Coral Row' },
      { x: 82, z: 82, label: 'Canal Town' },
    ],
  },
  {
    id: 'fare-play', title: '5 — Fare Play', pay: 350, kind: 'fare',
    brief: 'Drive three fares across the bay. Tips if you are fast.',
    intro: ['DANA: Slow night for crime, fast night for fares. Three riders, three drops.',
      'DANA: Pick them up where the marker points. No scaring the customers.'],
    fares: 3,
  },
  {
    id: 'stash-dash', title: '6 — Stash Dash', pay: 500, kind: 'collect',
    brief: 'Collect 4 hidden cash stashes around the city.',
    intro: ['DANA: An old crew stashed cash all over the bay before they skipped town.',
      'DANA: Four green crates. Find them, keep half. The other half is mine.'],
    collect: 4,
  },
  {
    id: 'gun-runner', title: '7 — Gun Runner', pay: 550, kind: 'buy',
    brief: 'Buy an SMG at Harbor Guns, then deliver it to Foundry Yards.',
    intro: ['DANA: A buyer in the Foundry needs hardware. You need a gun anyway.',
      'DANA: Harbor Guns, Neon Strip. Buy the SMG, then run it east.'],
    to: { x: 82, z: 0, label: 'Foundry Yards' },
  },
  {
    id: 'tuner-wars', title: '8 — Tuner Wars', pay: 650, kind: 'race',
    brief: 'Street race: three checkpoints in 80 seconds. NOS is your friend.',
    intro: ['DANA: The Strip racers think you are slow, Rook. Prove them wrong.',
      'DANA: Three gates, eighty seconds. Hold SHIFT for NOS — if you have any.'],
    timed: 80,
    stops: [
      { x: 33, z: 66, label: 'Gate 1 — Strip' },
      { x: 66, z: -33, label: 'Gate 2 — Foundry' },
      { x: 0, z: -66, label: 'Gate 3 — Heights' },
    ],
  },
  {
    id: 'garage-kings', title: '9 — Garage Kings', pay: 750, kind: 'deliver',
    brief: 'Tune your ride at Neon Motors, then park it in the safehouse garage.',
    intro: ['DANA: A collector wants a tuned car in my garage by morning.',
      'DANA: Neon Motors, Foundry Yards. Buy an upgrade — any upgrade — then bring the car home.'],
    to: { x: -16, z: -82, label: 'Safehouse Garage' },
  },
  {
    id: 'king-of-the-bay', title: '10 — King of the Bay', pay: 1500, kind: 'finale',
    brief: 'Five stars. Survive the whole bay coming for you, reach the safehouse.',
    intro: ['DANA: Last job, Rook. The whole PD knows your name now — five stars.',
      'DANA: Make it to the safehouse alive and the bay is yours. Drive!'],
    startWanted: 5,
    to: { x: -16, z: -82, label: 'Safehouse' },
  },
];

let beacon = null;
let beaconRing = null;

export function setWaypoint(G, x, z, label) {
  G.waypoint = { x, z, label };
  if (!beacon) {
    beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    );
    beaconRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    beaconRing.rotation.x = -Math.PI / 2;
    G.scene.add(beacon);
    G.scene.add(beaconRing);
  }
  beacon.position.set(x, 30, z);
  beaconRing.position.set(x, 0.15, z);
  beacon.visible = true;
  beaconRing.visible = true;
}

export function clearWaypoint(G) {
  G.waypoint = null;
  if (beacon) beacon.visible = false;
  if (beaconRing) beaconRing.visible = false;
}

export function spawnStashes(scene) {
  const spots = [
    [-49.5, 49.5], [82, -82], [-82, 82], [49.5, -49.5],
    [16, 82], [-82, -16], [66, 49.5], [0, -82],
  ];
  const out = [];
  for (const [x, z] of spots) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.2, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x2aff5a, emissive: 0x0a5a22 }),
    );
    mesh.position.set(x, 0.6, z);
    scene.add(mesh);
    const glow = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 3.2, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x2aff5a, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
    );
    glow.position.set(x, 1.6, z);
    scene.add(glow);
    out.push({ mesh, glow, x, z, taken: false });
  }
  return out;
}

export function spawnAmmoCrates(scene) {
  const spots = [[-33, 33], [33, -66], [-66, 66], [66, -82], [0, 33]];
  const out = [];
  for (const [x, z] of spots) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.0, 1.4),
      new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x5a4a0a }),
    );
    mesh.position.set(x, 0.5, z);
    scene.add(mesh);
    out.push({ mesh, x, z, taken: false, respawnAt: 0 });
  }
  return out;
}

export function startJob(G, i) {
  const job = JOBS[i];
  if (!job) return;
  G.jobIndex = i;
  G.jobStage = 0;
  G.jobCount = 0;
  G.jobTimer = job.timed ?? 0;
  G.fareWalker = null;
  G.fareDest = null;
  G.boughtForJob = false;
  G.upgradedForJob = false;
  if (job.startWanted) {
    G.wanted = Math.max(G.wanted, job.startWanted);
    G.lastCrimeAt = G.elapsed;
  }
  G.objective = job.brief;
  if (job.kind === 'goto' || job.kind === 'escape' || job.kind === 'finale' || job.kind === 'deliver') {
    setWaypoint(G, job.to.x, job.to.z, job.to.label);
  } else if (job.kind === 'timed' || job.kind === 'race') {
    setWaypoint(G, job.stops[0].x, job.stops[0].z, job.stops[0].label);
  } else if (job.kind === 'car') {
    setWaypoint(G, job.to.x, job.to.z, job.to.label);
    G.objective = 'Steal a sports car first (pink / gold), then reach the Strip.';
  } else if (job.kind === 'buy') {
    setWaypoint(G, SPOTS.guns.x, SPOTS.guns.z, 'Harbor Guns');
    G.objective = 'Buy an SMG at Harbor Guns (walk up and press E).';
  } else if (job.kind === 'fare') {
    spawnFare(G);
  } else {
    clearWaypoint(G);
  }
  G.dialog(job.intro);
  G.sound.cash();
}

export function restartJob(G) {
  startJob(G, G.jobIndex);
  G.toast('Job restarted: ' + JOBS[G.jobIndex].title, 2);
}

function completeJob(G) {
  const job = JOBS[G.jobIndex];
  G.cash += job.pay;
  G.records.cashEarned += job.pay;
  G.records.jobsDone += 1;
  G.sound.cash();
  clearWaypoint(G);
  if (G.jobIndex >= JOBS.length - 1) {
    G.victory = true;
    G.showVictory();
    return;
  }
  G.toast('Job complete! +$' + job.pay, 3);
  startJob(G, G.jobIndex + 1);
}

function spawnFare(G) {
  const riders = G.walkers.filter((w) => !w.fare);
  if (!riders.length) return;
  const w = riders[Math.floor(Math.random() * riders.length)];
  w.fare = true;
  w.mesh.position.set(w.x, 0, w.z);
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 1.4, 8),
    new THREE.MeshBasicMaterial({ color: 0x39e6ff }),
  );
  marker.position.set(w.x, 3.2, w.z);
  marker.name = 'fareMarker';
  G.scene.add(marker);
  w.fareMarker = marker;
  G.fareWalker = w;
  setWaypoint(G, w.x, w.z, 'Rider waiting');
  G.objective = 'Pick up the rider (drive close and press E).';
}

function dropFare(G) {
  const w = G.fareWalker;
  if (!w) return;
  G.scene.remove(w.fareMarker);
  const idx = G.walkers.indexOf(w);
  if (idx >= 0) G.walkers.splice(idx, 1);
  G.scene.remove(w.mesh);
  G.fareWalker = null;
  const dests = [
    { x: 82, z: 82, label: 'Canal Town' },
    { x: -82, z: -82, label: 'Old Port' },
    { x: 0, z: -82, label: 'Bayside Heights' },
    { x: 66, z: 33, label: 'Foundry Yards' },
  ];
  G.fareDest = dests[Math.floor(Math.random() * dests.length)];
  setWaypoint(G, G.fareDest.x, G.fareDest.z, 'Drop-off: ' + G.fareDest.label);
  G.objective = 'Drive the rider to ' + G.fareDest.label + '.';
}

export function updateJobs(G, dt) {
  const job = JOBS[G.jobIndex];
  if (!job || G.victory) return;
  const px = G.player.pos.x;
  const pz = G.player.pos.z;
  if (job.timed) {
    G.jobTimer -= dt;
    if (G.jobTimer <= 0) {
      G.toast('Too slow! Job failed — restarting.', 3);
      restartJob(G);
      return;
    }
  }
  if (job.kind === 'goto' || job.kind === 'escape' || job.kind === 'finale' || job.kind === 'deliver') {
    if (job.kind === 'escape' && G.wanted > 0) {
      G.objective = 'Lose the heat first — stay out of sight, then reach Voss Plaza.';
      clearWaypoint(G);
      return;
    }
    if (job.kind === 'escape') setWaypoint(G, job.to.x, job.to.z, job.to.label);
    if (dist2(px, pz, job.to.x, job.to.z) < 6) {
      if (job.kind === 'deliver' && !G.player.car) {
        G.objective = 'Bring a car to the safehouse garage — you are on foot!';
        return;
      }
      if (job.kind === 'deliver' && !G.upgradedForJob && (G.upgrades.armor + G.upgrades.turbo + G.upgrades.nosTank) === 0) {
        G.objective = 'Buy any upgrade at Neon Motors first, then bring the car here.';
        setWaypoint(G, SPOTS.garage.x, SPOTS.garage.z, 'Neon Motors');
        return;
      }
      completeJob(G);
    }
  } else if (job.kind === 'car') {
    if (G.jobStage === 0) {
      if (G.player.car && G.player.car.sport) {
        G.jobStage = 1;
        G.objective = 'Sports car stolen! Now bring it to the Neon Strip.';
        setWaypoint(G, job.to.x, job.to.z, job.to.label);
      }
    } else if (dist2(px, pz, job.to.x, job.to.z) < 6 && G.player.car) {
      completeJob(G);
    }
  } else if (job.kind === 'timed' || job.kind === 'race') {
    const stop = job.stops[G.jobStage];
    if (stop && dist2(px, pz, stop.x, stop.z) < 7) {
      G.jobStage += 1;
      G.sound.pickup();
      if (G.jobStage >= job.stops.length) {
        completeJob(G);
      } else {
        const next = job.stops[G.jobStage];
        setWaypoint(G, next.x, next.z, next.label);
        G.toast('Checkpoint! Next: ' + next.label, 2);
      }
    }
  } else if (job.kind === 'fare') {
    if (G.fareWalker && !G.fareDest) {
      const w = G.fareWalker;
      if (dist2(px, pz, w.x, w.z) < 4.5) {
        dropFare(G);
        G.toast('Rider aboard — drive!', 2);
      }
    } else if (G.fareDest) {
      if (dist2(px, pz, G.fareDest.x, G.fareDest.z) < 6) {
        G.jobCount += 1;
        G.records.faresDone += 1;
        G.cash += 40;
        G.fareDest = null;
        if (G.jobCount >= job.fares) {
          completeJob(G);
        } else {
          spawnFare(G);
          G.toast('Fare done! +$40 tip. ' + (job.fares - G.jobCount) + ' to go.', 2);
        }
      }
    }
  } else if (job.kind === 'collect') {
    G.objective = 'Stashes found: ' + G.jobCount + ' / ' + job.collect + ' (green crates).';
  } else if (job.kind === 'buy') {
    if (G.jobStage === 0) {
      if (G.boughtForJob) {
        G.jobStage = 1;
        G.objective = 'SMG bought! Deliver it to Foundry Yards.';
        setWaypoint(G, job.to.x, job.to.z, job.to.label);
      }
    } else if (dist2(px, pz, job.to.x, job.to.z) < 6) {
      completeJob(G);
    }
  }
}

export function updateStashes(G, dt) {
  for (const s of G.stashes) {
    if (s.taken) continue;
    s.glow.rotation.y += dt * 1.5;
    if (dist2(G.player.pos.x, G.player.pos.z, s.x, s.z) < 3.2) {
      s.taken = true;
      s.mesh.visible = false;
      s.glow.visible = false;
      G.cash += 120;
      G.records.cashEarned += 120;
      G.records.stashesFound += 1;
      G.jobCount += 1;
      G.sound.pickup();
      G.toast('Stash found! +$120', 2.5);
      if (JOBS[G.jobIndex].kind === 'collect' && G.jobCount >= JOBS[G.jobIndex].collect) {
        completeJob(G);
      }
    }
  }
}

export function updateAmmoCrates(G, dt) {
  for (const c of G.crates) {
    if (c.taken) {
      if (G.elapsed > c.respawnAt) {
        c.taken = false;
        c.mesh.visible = true;
      }
      continue;
    }
    if (dist2(G.player.pos.x, G.player.pos.z, c.x, c.z) < 3) {
      c.taken = true;
      c.mesh.visible = false;
      c.respawnAt = G.elapsed + 60;
      const w = G.weapons[G.weapon];
      w.ammo += 24;
      G.sound.pickup();
      G.toast('+24 ammo (' + WEAPONS[G.weapon].name + ')', 2);
    }
  }
}
