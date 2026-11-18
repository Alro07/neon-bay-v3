// economy.js — money in Neon Bay v3: Harbor Guns (weapons and ammo),
// Neon Motors garage (armor, turbo, NOS tank upgrades), Doc's Clinic
// (heal), and Rook's safehouse (repair, heal, save). Walk up to a glowing
// shop front and press E. NOS refills at the garage or from the tank upgrade.
import { WEAPONS, WEAPON_ORDER } from './arsenal.js';
import { dist2 } from './kit.js';

export const SPOTS = {
  guns: { x: -16, z: 54, r: 6, label: 'Harbor Guns', kind: 'guns' },
  garage: { x: 82, z: -3, r: 7, label: 'Neon Motors', kind: 'garage' },
  clinic: { x: 16, z: -11, r: 6, label: "Doc's Clinic", kind: 'clinic' },
  safehouse: { x: -16, z: -77, r: 7, label: 'Safehouse', kind: 'safehouse' },
};

export function nearestSpot(G) {
  const px = G.player.pos.x;
  const pz = G.player.pos.z;
  for (const key of Object.keys(SPOTS)) {
    const s = SPOTS[key];
    if (dist2(px, pz, s.x, s.z) < s.r) return s;
  }
  return null;
}

function canAfford(G, price) {
  return G.cash >= price;
}

function spend(G, price) {
  G.cash -= price;
  G.sound.cash();
}

// --- shop catalogues -------------------------------------------------------
export function gunItems(G) {
  const items = [];
  for (const key of WEAPON_ORDER) {
    const def = WEAPONS[key];
    const owned = G.weapons[key].owned;
    items.push({
      id: 'buy-' + key,
      name: def.name + (owned ? ' (owned)' : ''),
      desc: owned
        ? 'Ammo +30 — $' + def.ammoPrice
        : 'Buy weapon — $' + def.price + ' (dmg ' + def.dmg + ', ' + (def.auto ? 'auto' : 'semi') + ')',
      price: owned ? def.ammoPrice : def.price,
      disabled: !canAfford(G, owned ? def.ammoPrice : def.price),
      run() {
        if (owned) {
          spend(G, def.ammoPrice);
          G.weapons[key].ammo += 30;
          G.toast('+30 ammo for ' + def.name, 2);
        } else {
          spend(G, def.price);
          G.weapons[key].owned = true;
          G.weapons[key].ammo = 30;
          G.weapon = key;
          G.toast(def.name + ' bought and equipped!', 2.5);
          if (G.jobIndex === 6) G.boughtForJob = true;
        }
      },
    });
  }
  return items;
}

export function garageItems(G) {
  const up = G.upgrades;
  return [
    {
      id: 'armor', name: 'Armor Plating Lv' + (up.armor + 1),
      desc: up.armor >= 2 ? 'MAXED — car takes far less damage' : 'Car max health +50 — $500',
      price: 500, disabled: up.armor >= 2 || !canAfford(G, 500),
      run() {
        spend(G, 500);
        up.armor += 1;
        if (G.player.car) {
          G.player.car.maxHealth += 50;
          G.player.car.health += 50;
        }
        G.upgradedForJob = true;
        G.toast('Armor plating installed!', 2.5);
      },
    },
    {
      id: 'turbo', name: 'Turbo Kit Lv' + (up.turbo + 1),
      desc: up.turbo >= 2 ? 'MAXED — top speed +40%' : 'Top speed +20% — $800',
      price: 800, disabled: up.turbo >= 2 || !canAfford(G, 800),
      run() {
        spend(G, 800);
        up.turbo += 1;
        G.upgradedForJob = true;
        G.toast('Turbo kit installed!', 2.5);
      },
    },
    {
      id: 'nostank', name: 'NOS Tank XL',
      desc: up.nosTank >= 1 ? 'INSTALLED — NOS capacity 200' : 'NOS capacity 100 → 200 — $300',
      price: 300, disabled: up.nosTank >= 1 || !canAfford(G, 300),
      run() {
        spend(G, 300);
        up.nosTank = 1;
        G.nosMax = 200;
        G.nos = 200;
        G.upgradedForJob = true;
        G.toast('NOS tank XL installed!', 2.5);
      },
    },
    {
      id: 'nosrefill', name: 'NOS Refill',
      desc: 'Refill NOS to full — $150',
      price: 150, disabled: G.nos >= G.nosMax || !canAfford(G, 150),
      run() {
        spend(G, 150);
        G.nos = G.nosMax;
        G.toast('NOS refilled!', 2);
      },
    },
    {
      id: 'repair', name: 'Full Repair',
      desc: 'Repair your car to full health — $100',
      price: 100, disabled: !G.player.car || G.player.car.health >= G.player.car.maxHealth || !canAfford(G, 100),
      run() {
        spend(G, 100);
        G.player.car.health = G.player.car.maxHealth;
        G.player.car.wrecked = false;
        G.player.car.bodyMat.color.setHex(0xd8d8d8);
        G.toast('Car repaired!', 2);
      },
    },
  ];
}

export function clinicItems(G) {
  return [
    {
      id: 'heal', name: 'Patch Up', desc: 'Heal to full health — $50',
      price: 50, disabled: G.health >= 100 || !canAfford(G, 50),
      run() { spend(G, 50); G.health = 100; G.toast('Patched up. Good as new.', 2); },
    },
    {
      id: 'cure', name: 'Adrenaline Shot', desc: 'Full health + NOS refill — $200',
      price: 200, disabled: (G.health >= 100 && G.nos >= G.nosMax) || !canAfford(G, 200),
      run() { spend(G, 200); G.health = 100; G.nos = G.nosMax; G.toast('Adrenaline! Health + NOS full.', 2); },
    },
  ];
}

export function safehouseItems(G) {
  return [
    {
      id: 'sleep', name: 'Sleep Until Morning', desc: 'Save the game, heal up, lose the heat — free',
      price: 0, disabled: false,
      run() {
        G.health = 100;
        G.wanted = 0;
        G.clockMinutes = 8 * 60;
        if (G.player.car) {
          G.player.car.health = G.player.car.maxHealth;
          G.player.car.wrecked = false;
        }
        G.saveNow();
        G.toast('Slept at the safehouse. Saved!', 2.5);
      },
    },
    {
      id: 'repair', name: 'Repair Car', desc: 'Repair your car to full — $100',
      price: 100, disabled: !G.player.car || G.player.car.health >= G.player.car.maxHealth || !canAfford(G, 100),
      run() {
        spend(G, 100);
        G.player.car.health = G.player.car.maxHealth;
        G.player.car.wrecked = false;
        G.toast('Car repaired at the safehouse!', 2);
      },
    },
  ];
}

export function itemsFor(G, kind) {
  if (kind === 'guns') return gunItems(G);
  if (kind === 'garage') return garageItems(G);
  if (kind === 'clinic') return clinicItems(G);
  return safehouseItems(G);
}
