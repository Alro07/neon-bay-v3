// panel.js — the HUD and menus of Neon Bay v3: cash, clock, radio, wanted
// stars, health and car bars, speed, weapon and ammo, the NOS meter, the
// district name, the objective line, and a live circular minimap that draws
// all eight districts, the roads, the shops, the safehouse, the waypoint,
// the police and the helicopter. Also dialogs, toasts, the shop panel, the
// BUSTED and victory overlays, and the pause-menu statistics.
import { SPOTS, itemsFor } from './economy.js';
import { DISTRICTS as WORLD_DISTRICTS} from './world.js';
import { WEAPONS} from './arsenal.js';
import { JOBS} from './story.js';
import { recordLines} from './records.js';
import { clockText, money} from './kit.js';

let els = {};
let mmCtx = null;
let toastTimer = 0;

export function initPanel() {
const ids = ['hud', 'cash', 'clock', 'radio', 'stars', 'health-bar', 'car-bar', 'car-wrap',
'speed', 'ammo', 'weapon', 'nos-bar', 'nos-wrap', 'district', 'objective', 'minimap',
'toast', 'prompt', 'dialog', 'dialog-text', 'shop-panel', 'shop-title', 'shop-items',
'busted-overlay', 'busted-text', 'victory-overlay', 'victory-stats', 'stats-list'];
for (const id of ids) els[id] = document.getElementById(id);
if (els.minimap) {
els.minimap.width = 200;
els.minimap.height = 200;
mmCtx = els.minimap.getContext('2d');
}
}

export function showHud(on) {
els.hud.classList.toggle('on', on);
}

function starsHtml(n) {
let out = '';
for (let i = 0; i < 5; i++) out += '<span class="' + (i < n? 'lit': 'dim') + '">★</span>';
return out;
}

export function updatePanel(G) {
els.cash.textContent = money(G.cash);
els.clock.textContent = clockText(G.clockMinutes) + (G.isNight? ' 🌙': ' ☀️');
els.radio.textContent = '♪ ' + G.sound.stationName();
els.stars.innerHTML = starsHtml(G.wanted);
els['health-bar'].style.width = Math.max(0, G.health) + '%';
const car = G.player.car;
els['car-wrap'].style.display = car? 'block': 'none';
if (car) els['car-bar'].style.width = Math.max(0, (car.health / car.maxHealth) * 100) + '%';
els.speed.textContent = car? Math.round(G.speedKmh) + ' mph' + (G.boosting? ' 🔥NOS!': ''): 'On foot';
const w = G.weapons[G.weapon];
els.weapon.textContent = '🔫 ' + WEAPONS[G.weapon].name;
els.ammo.textContent = 'Ammo ' + w.ammo + ' [1-4 switch]';
els['nos-wrap'].style.display = car? 'block': 'none';
els['nos-bar'].style.width = Math.max(0, (G.nos / G.nosMax) * 100) + '%';
const d = G.district;
els.district.textContent = '📍 ' + (d? d.name: 'Neon Bay');
let obj = G.objective || '';
if (JOBS[G.jobIndex]) {
obj = ' ' + obj;
if (JOBS[G.jobIndex].timed) obj += ' ⏱ ' + Math.ceil(G.jobTimer) + 's';
}
els.objective.innerHTML = '<b>JOB</b> ' + obj;
els.prompt.textContent = G.promptText || '';
drawMinimap(G);
if (toastTimer > 0) {
toastTimer -= 1;
if (toastTimer <= 0) els.toast.textContent = '';
}
}

function drawMinimap(G) {
if (!mmCtx) return;
const g = mmCtx;
const S = 200;
const scale = S / 236;
const toX = (x) => (x + 118) * scale;
const toY = (z) => (z + 118) * scale;
g.clearRect(0, 0, S, S);
g.save();
g.beginPath();
g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
g.clip();
g.fillStyle = '#0a1030';
g.fillRect(0, 0, S, S);
// Districts.
for (const d of WORLD_DISTRICTS) {
g.fillStyle = d.color;
g.globalAlpha = 0.55;
g.fillRect(toX(d.minX), toY(d.minZ), (d.maxX - d.minX) * scale, (d.maxZ - d.minZ) * scale);
g.globalAlpha = 1;
}
// Bay water to the west.
g.fillStyle = '#1e7fb8';
g.fillRect(0, 0, toX(-110), S);
// Roads.
g.strokeStyle = '#3a3f55';
g.lineWidth = 4;
for (const c of [-66, -33, 0, 33, 66]) {
g.beginPath(); g.moveTo(toX(c), 0); g.lineTo(toX(c), S); g.stroke();
g.beginPath(); g.moveTo(0, toY(c)); g.lineTo(S, toY(c)); g.stroke();
}
// Canals.
g.strokeStyle = '#2a7fb8';
g.lineWidth = 3;
for (const cz of [49.5, 82.5]) {
g.beginPath(); g.moveTo(toX(33), toY(cz)); g.lineTo(S, toY(cz)); g.stroke();
}
const dot = (x, z, color, r) => {
g.fillStyle = color;
g.beginPath();
g.arc(toX(x), toY(z), r, 0, Math.PI * 2);
g.fill();
};
// Shops and safehouse.
dot(SPOTS.guns.x, SPOTS.guns.z, '#7dff8a', 4);
dot(SPOTS.garage.x, SPOTS.garage.z, '#ffd23e', 4);
dot(SPOTS.clinic.x, SPOTS.clinic.z, '#39e6ff', 4);
dot(SPOTS.safehouse.x, SPOTS.safehouse.z, '#ff2ea6', 5);
// Stashes.
for (const s of G.stashes) {
if (!s.taken) dot(s.x, s.z, '#2aff5a', 2.5);
}
// Police, helicopter, waypoint.
for (const c of G.cops) dot(c.car.group.position.x, c.car.group.position.z, '#ff2222', 3.5);
if (G.heli) dot(G.heli.group.position.x, G.heli.group.position.z, '#ff8800', 5);
if (G.waypoint) {
const wx = toX(G.waypoint.x);
const wy = toY(G.waypoint.z);
g.fillStyle = '#ffd23e';
g.beginPath();
g.moveTo(wx, wy - 7); g.lineTo(wx + 6, wy + 4); g.lineTo(wx - 6, wy + 4);
g.closePath(); g.fill();
g.strokeStyle = '#ffd23e';
g.beginPath(); g.arc(wx, wy, 9 + Math.sin(G.elapsed * 4) * 2, 0, Math.PI * 2); g.stroke();
}
// Player arrow.
const px = toX(G.player.pos.x);
const py = toY(G.player.pos.z);
const a = G.player.car? G.player.car.heading: G.player.yaw;
g.fillStyle = '#ffffff';
g.save();
g.translate(px, py);
g.rotate(Math.PI - a);
g.beginPath();
g.moveTo(0, -8); g.lineTo(5, 6); g.lineTo(-5, 6);
g.closePath(); g.fill();
g.restore();
g.restore();
// Rim.
g.strokeStyle = '#39e6ff88';
g.lineWidth = 3;
g.beginPath();
g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
g.stroke();
}

export function showToast(G, text, seconds) {
els.toast.textContent = text;
toastTimer = Math.round((seconds?? 2.5) * 60);
}

export function showDialog(G, lines) {
G.dialogLines = Array.isArray(lines)? lines: [lines];
G.dialogIdx = 0;
els['dialog-text'].textContent = G.dialogLines[0];
els.dialog.classList.add('on');
G.dialogVisible = true;
}

export function advanceDialog(G) {
if (!G.dialogVisible) return false;
G.dialogIdx += 1;
if (G.dialogIdx >= G.dialogLines.length) {
hideDialog(G);
return false;
}
els['dialog-text'].textContent = G.dialogLines[G.dialogIdx];
return true;
}

export function hideDialog(G) {
els.dialog.classList.remove('on');
G.dialogVisible = false;
}

export function showShop(G, spot, items) {
G.shopOpen = true;
G.shopKind = spot.kind;
G.shopSpotLabel = spot.label;
els['shop-title'].textContent = spot.label + ' — ' + money(G.cash);
renderShopItems(G, items);
els['shop-panel'].classList.add('on');
}

export function renderShopItems(G, items) {
els['shop-items'].innerHTML = '';
for (const it of items) {
const row = document.createElement('div');
row.className = 'shop-row';
const name = document.createElement('div');
name.innerHTML = '<b>' + it.name + '</b><span>' + it.desc + '</span>';
const btn = document.createElement('button');
btn.textContent = it.price > 0? 'BUY $' + it.price: 'FREE';
btn.disabled =!!it.disabled;
btn.addEventListener('click', () => {
it.run();
els['shop-title'].textContent = G.shopSpotLabel + ' — ' + money(G.cash);
renderShopItems(G, itemsFor(G, G.shopKind));
});
row.appendChild(name);
row.appendChild(btn);
els['shop-items'].appendChild(row);
}
}

export function hideShop(G) {
els['shop-panel'].classList.remove('on');
G.shopOpen = false;
G.shopKind = null;
}

export function showBusted(G, lost) {
els['busted-text'].textContent = 'BUSTED! The Bay PD seized ' + money(lost) + '.';
els['busted-overlay'].classList.add('on');
setTimeout(() => els['busted-overlay'].classList.remove('on'), 2600);
}

export function showVictory(G) {
const lines = recordLines(G.records);
els['victory-stats'].innerHTML = lines.map(([k, v]) => '<div><span>' + k + '</span><b>' + v + '</b></div>').join('');
els['victory-overlay'].classList.add('on');
}

export function hideVictory() {
els['victory-overlay'].classList.remove('on');
}

export function renderStats(G) {
const lines = recordLines(G.records);
els['stats-list'].innerHTML = lines.map(([k, v]) => '<div><span>' + k + '</span><b>' + v + '</b></div>').join('');
}
