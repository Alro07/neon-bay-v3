// world.js — Neon Bay v3, an original coastal city: a road grid, a bay and
// beach on the west, a pier, eight named districts, a tower plaza, a palm
// park, a dockyard with cranes, canals in the south-east, neon towers with
// lit windows, palms, street lamps and four signalled intersections.
// Deterministic (seeded) so every run looks the same. Exports the colliders,
// the lamps that glow after dark, the traffic signals, the water and beacon,
// and districtAt() for the HUD and minimap.
import * as THREE from 'three';
import { mulberry, pick } from './kit.js';

export const BOUND = 110;
export const LANES = [-66, -33, 0, 33, 66];
const ROAD_W = 10;

export const DISTRICTS = [
  { name: 'Old Port', minX: -110, maxX: -33, minZ: -110, maxZ: 33, color: '#5a6b8a' },
  { name: 'Bayside Heights', minX: -33, maxX: 33, minZ: -110, maxZ: -33, color: '#7a9a6a' },
  { name: 'Coral Row', minX: 33, maxX: 110, minZ: -110, maxZ: -33, color: '#d98a7a' },
  { name: 'Glass Quarter', minX: -33, maxX: 33, minZ: -33, maxZ: 33, color: '#4a7a9a' },
  { name: 'Foundry Yards', minX: 33, maxX: 110, minZ: -33, maxZ: 33, color: '#8a7a5a' },
  { name: 'Marina Point', minX: -110, maxX: -33, minZ: 33, maxZ: 110, color: '#4a9a8a' },
  { name: 'Neon Strip', minX: -33, maxX: 33, minZ: 33, maxZ: 110, color: '#9a4a8a' },
  { name: 'Canal Town', minX: 33, maxX: 110, minZ: 33, maxZ: 110, color: '#6a7aba' },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.minX && x < d.maxX && z >= d.minZ && z < d.maxZ) return d;
  }
  return DISTRICTS[3];
}

function windowsTexture(rng) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#9aa0b8';
  g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) {
    for (let x = 6; x < 58; x += 12) {
      const lit = rng() < 0.5;
      g.fillStyle = lit ? (rng() < 0.6 ? '#ffe9a3' : '#7ef2ff') : '#333a55';
      g.fillRect(x, y, 8, 7);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(scene) {
  const rng = mulberry(20261118);
  const colliders = [];
  const lamps = [];
  const signals = [];
  const group = new THREE.Group();
  group.name = 'NeonBayWorld';

  // Ground slab, sand strip and the bay to the west.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshLambertMaterial({ color: 0x55684a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  group.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 300),
    new THREE.MeshLambertMaterial({ color: 0xe8d29a }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-121, 0.05, 0);
  group.add(sand);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 320),
    new THREE.MeshLambertMaterial({ color: 0x1e7fb8, emissive: 0x0a3d66 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-212, 0.02, 0);
  water.name = 'bayWater';
  group.add(water);

  // The pier: boards jutting west into the bay, with posts and a lamp row.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(34, 0.7, 12), pierMat);
  pier.position.set(-126, 0.4, 16);
  group.add(pier);
  for (let x = -116; x >= -140; x -= 8) {
    for (const sz of [-5, 5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.4, 6), pierMat);
      post.position.set(x, 0.2, 16 + sz);
      group.add(post);
    }
  }

  // Roads, sidewalks and dashed centre lines on the grid.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x33343f });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0x9a9fb0 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffe9a3 });
  for (const c of LANES) {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 240), roadMat);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(c, 0.08, 0);
    group.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(240, ROAD_W), roadMat);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(0, 0.08, c);
    group.add(ew);
    for (const off of [-8, 8]) {
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(3, 240), walkMat);
      s1.rotation.x = -Math.PI / 2;
      s1.position.set(c + off, 0.06, 0);
      group.add(s1);
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(240, 3), walkMat);
      s2.rotation.x = -Math.PI / 2;
      s2.position.set(0, 0.06, c + off);
      group.add(s2);
    }
    for (let d = -105; d < 105; d += 9) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3.4), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(c, 0.1, d);
      group.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.5), dashMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(d, 0.1, c);
      group.add(dash2);
    }
  }

  // Canals across Canal Town: two water strips with little bridges.
  const canalMat = new THREE.MeshLambertMaterial({ color: 0x2a7fb8, emissive: 0x0a3d66 });
  for (const cz of [49.5, 82.5]) {
    const canal = new THREE.Mesh(new THREE.PlaneGeometry(76, 6), canalMat);
    canal.rotation.x = -Math.PI / 2;
    canal.position.set(71.5, 0.09, cz);
    group.add(canal);
  }
  const bridgeMat = new THREE.MeshLambertMaterial({ color: 0x9a9fb0 });
  for (const cz of [49.5, 82.5]) {
    for (const bx of [33, 66]) {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 8), bridgeMat);
      bridge.position.set(bx, 0.25, cz);
      group.add(bridge);
    }
  }

  // Palm Park in Marina Point: green square, pond, benches, palms.
  const park = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 28),
    new THREE.MeshLambertMaterial({ color: 0x3f8f4f }),
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(-49.5, 0.07, 49.5);
  group.add(park);
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(6, 20),
    new THREE.MeshLambertMaterial({ color: 0x2a7fb8, emissive: 0x0a3d66 }),
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-49.5, 0.09, 49.5);
  group.add(pond);

  // Voss Plaza at the city centre: pale stone square and the beacon tower.
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshLambertMaterial({ color: 0xb8b0a0 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.07, 0);
  group.add(plaza);
  const beacon = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(4, 34, 4),
    new THREE.MeshLambertMaterial({ color: 0x2a2f45 }),
  );
  tower.position.y = 17;
  beacon.add(tower);
  const beaconTop = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xff2ea6 }),
  );
  beaconTop.position.y = 35;
  beaconTop.name = 'beaconLight';
  beacon.add(beaconTop);
  beacon.position.set(0, 0, 0);
  beacon.name = 'beacon';
  group.add(beacon);

  // Buildings: seeded blocks between the roads. Skip the plaza, the park,
  // the shop fronts and the safehouse lot so those stay reachable.
  const keepOut = [
    { minX: -14, maxX: 14, minZ: -14, maxZ: 14 }, // plaza
    { minX: -64, maxX: -35, minZ: 35, maxZ: 64 }, // park
    { minX: -24, maxX: -8, minZ: 41, maxZ: 57 }, // gun shop front
    { minX: 74, maxX: 90, minZ: -8, maxZ: 8 }, // garage lot
    { minX: -24, maxX: -8, minZ: -90, maxZ: -74 }, // safehouse lot
    { minX: 8, maxX: 24, minZ: -24, maxZ: -8 }, // clinic front
  ];
  const winTex = windowsTexture(rng);
  const neonColors = [0xff2ea6, 0x39e6ff, 0xffd23e, 0x7dff8a, 0xff6a3d];
  const blockCenters = [-82.5, -49.5, -16.5, 16.5, 49.5, 82.5];
  for (const bx of blockCenters) {
    for (const bz of blockCenters) {
      const cx = bx;
      const cz = bz;
      let blocked = false;
      for (const k of keepOut) {
        if (cx > k.minX - 12 && cx < k.maxX + 12 && cz > k.minZ - 12 && cz < k.maxZ + 12) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      const tall = Math.abs(bx) < 20 && Math.abs(bz) < 20;
      const n = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const w = 8 + rng() * 8;
        const d = 8 + rng() * 8;
        const h = tall ? 18 + rng() * 26 : 5 + rng() * 12;
        const ox = cx + (i === 0 ? 0 : (rng() - 0.5) * 10);
        const oz = cz + (i === 0 ? 0 : (rng() - 0.5) * 10);
        const mat = new THREE.MeshLambertMaterial({
          color: pick(rng, [0x8a90a8, 0x7a7f95, 0xa88a7a, 0x6a7a8a, 0x9a8a6a]),
          map: h > 14 ? winTex : null,
        });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        b.position.set(ox, h / 2, oz);
        group.add(b);
        colliders.push({ minX: ox - w / 2, maxX: ox + w / 2, minZ: oz - d / 2, maxZ: oz + d / 2, h });
        if (rng() < 0.45) {
          const sign = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.7, 0.9, 0.4),
            new THREE.MeshBasicMaterial({ color: pick(rng, neonColors) }),
          );
          sign.position.set(ox, Math.min(h - 1, 7), oz + d / 2 + 0.3);
          sign.name = 'neonSign';
          group.add(sign);
        }
      }
    }
  }

  // Dockyard props in Old Port: cranes and stacked containers.
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xd8a03a });
  for (const [cx, cz] of [[-82, -82], [-82, -49]]) {
    const mast = new THREE.Mesh(new THREE.BoxGeometry(2, 26, 2), craneMat);
    mast.position.set(cx, 13, cz);
    group.add(mast);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(26, 1.6, 1.6), craneMat);
    arm.position.set(cx + 10, 25, cz);
    group.add(arm);
    colliders.push({ minX: cx - 1.5, maxX: cx + 1.5, minZ: cz - 1.5, maxZ: cz + 1.5, h: 26 });
  }
  const contColors = [0xc84a3a, 0x3a7ac8, 0x4ac88a, 0xc8a03a];
  for (let i = 0; i < 10; i++) {
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(8, 2.6, 2.6),
      new THREE.MeshLambertMaterial({ color: pick(rng, contColors) }),
    );
    c.position.set(-95 + (i % 5) * 10, 1.3 + Math.floor(i / 5) * 2.7, -16 + Math.floor(i / 5) * 4);
    c.rotation.y = (rng() - 0.5) * 0.1;
    group.add(c);
    colliders.push({ minX: c.position.x - 4, maxX: c.position.x + 4, minZ: c.position.z - 1.6, maxZ: c.position.z + 1.6, h: 2.6 });
  }

  // Shop fronts: glowing markers the player walks up to.
  function shopFront(x, z, color, label) {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(10, 6, 1),
      new THREE.MeshLambertMaterial({ color: 0x3a3f55 }),
    );
    base.position.set(x, 3, z);
    group.add(base);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(10, 1.6, 0.5),
      new THREE.MeshBasicMaterial({ color }),
    );
    sign.position.set(x, 6.4, z + 0.6);
    group.add(sign);
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 5),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.12, z + 5);
    group.add(pad);
    colliders.push({ minX: x - 5, maxX: x + 5, minZ: z - 0.5, maxZ: z + 0.5, h: 6 });
    return { x, z, label };
  }
  const fronts = [
    shopFront(-16, 49, 0x7dff8a, 'HARBOR GUNS'),
    shopFront(82, -8, 0xffd23e, 'NEON MOTORS'),
    shopFront(16, -16, 0x39e6ff, "DOC'S CLINIC"),
    shopFront(-16, -82, 0xff2ea6, 'SAFEHOUSE'),
  ];

  // Palms along the beach road and the park.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4f });
  function palm(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 6), trunkMat);
    trunk.position.set(x, 2.5, z);
    group.add(trunk);
    const top = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), leafMat);
    top.position.set(x, 5.4, z);
    top.scale.y = 0.55;
    group.add(top);
  }
  for (let z = -100; z <= 100; z += 14) palm(-106, z);
  for (let i = 0; i < 8; i++) palm(-60 + rng() * 22, 38 + rng() * 22);

  // Street lamps at every other intersection corner; they glow after dark.
  const lampPostMat = new THREE.MeshLambertMaterial({ color: 0x222633 });
  for (const c of LANES) {
    for (const d of LANES) {
      if ((c + d) % 66 !== 0) continue;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6, 6), lampPostMat);
      post.position.set(c + 6, 3, d + 6);
      group.add(post);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x555566 }),
      );
      bulb.position.set(c + 6, 6.2, d + 6);
      bulb.name = 'lampBulb';
      group.add(bulb);
      lamps.push(bulb);
    }
  }

  // Four signalled intersections: a pole with red / amber / green lamps.
  for (const [sx, sz] of [[0, 0], [33, -33], [-33, 33], [66, 0]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6.5, 6), lampPostMat);
    pole.position.set(sx + 6, 3.2, sz + 6);
    group.add(pole);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 2.4, 0.9),
      new THREE.MeshLambertMaterial({ color: 0x1a1d2a }),
    );
    head.position.set(sx + 6, 6.4, sz + 6);
    group.add(head);
    const lampMats = [];
    for (let i = 0; i < 3; i++) {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x332222 }),
      );
      lamp.position.set(sx + 6, 7.2 - i * 0.7, sz + 6.55);
      group.add(lamp);
      lampMats.push(lamp.material);
    }
    signals.push({ x: sx, z: sz, nsGreen: true, timer: 6 + rng() * 4, mats: lampMats });
  }

  scene.add(group);
  return { colliders, lamps, signals, water, beacon, fronts, group };
}

// Push a point out of every building collider it sits inside.
export function resolveCollision(colliders, x, z, radius) {
  for (const c of colliders) {
    if (x > c.minX - radius && x < c.maxX + radius && z > c.minZ - radius && z < c.maxZ + radius) {
      const dxl = x - (c.minX - radius);
      const dxr = (c.maxX + radius) - x;
      const dzl = z - (c.minZ - radius);
      const dzr = (c.maxZ + radius) - z;
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) x = c.minX - radius;
      else if (m === dxr) x = c.maxX + radius;
      else if (m === dzl) z = c.minZ - radius;
      else z = c.maxZ + radius;
    }
  }
  return { x, z };
}

export function clampToWorld(x, z, margin) {
  return {
    x: Math.max(-BOUND + margin, Math.min(BOUND - margin, x)),
    z: Math.max(-BOUND + margin, Math.min(BOUND - margin, z)),
  };
}
