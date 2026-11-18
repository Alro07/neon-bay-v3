# Neon Bay — Open-World Crime (v3)

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Alro07/neon-bay-v3/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Alro07/neon-bay-v3/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Bay** is a 3D open-world crime game built with three.js — a sun-soaked fictional
coastal city you explore on foot or by car. You play **Rook**, a driver new to town,
taking jobs from **Dana Reyes**, the bay's fixer, while the Bay PD watches your every move.
Everything here is original: the city, the characters, the story, the art and the sound.

## What's in the game

- **Open world, 8 named districts** — Old Port, Bayside Heights, Coral Row, Glass Quarter,
  Foundry Yards, Marina Point, Neon Strip and Canal Town, each with its own look: a
  dockyard with cranes, canals with bridges, a palm park, a beach and pier, and the Voss
  Plaza beacon tower. The HUD and the live minimap always show which district you are in.
- **Traffic & pedestrians** — 12 cars loop the roads, brake for obstacles and stop at red
  lights at four signalled intersections; 40 pedestrians stroll the sidewalks and scatter
  when trouble starts.
- **Steal & drive cars** — walk up to any parked car and press **E** to take it. Sport
  coupes, sedans and trucks with different speed and handling. Stealing raises your wanted
  level, and hard hits damage your car until it smokes and wrecks.
- **NOS boost** — hold **Shift** while driving to burn nitrous: flames, a speed kick and a
  draining meter. Refill at Neon Motors or with the NOS Tank XL upgrade.
- **Shops** — **Harbor Guns** sells four weapons (pistol, SMG, scattergun, rifle) and ammo;
  **Neon Motors** garage sells armor plating, turbo kits, the NOS tank and repairs;
  **Doc's Clinic** patches you up; the **safehouse** in Bayside Heights repairs, heals,
  saves and lets you sleep until morning.
- **Wanted level & police** — 5 stars. Punching, shooting, stealing and hitting
  pedestrians raise the heat; Bay PD cruisers with flashing light bars chase and ram you,
  set up roadblocks at 3 stars, and a **police helicopter** with a spotlight joins the hunt
  at 4 stars. Get caught on foot and you are BUSTED — cash seized. Break line of sight and
  stay calm to lose stars.
- **Story jobs** — 10 sequential jobs from Dana with dialogue, waypoint beacons and
  payouts: First Drop, Hot Wheels, Heat Wave, Midnight Courier (timed), Fare Play (taxi
  fares), Stash Dash, Gun Runner (buy a gun, deliver it), Tuner Wars (street race),
  Garage Kings (tune a car, deliver it home) and the five-star finale King of the Bay.
  Finish all ten for the victory screen — then free-roam or play again.
- **Side work** — hidden green cash stashes (+$120 each) and yellow ammo crates around the
  city, always worth a detour.
- **Combat** — punch (**F**) and shoot (mouse click) with four weapons, tracers, muzzle
  flash, impact sparks and smoke; pedestrians and cruisers react.
- **HUD + live minimap** — cash, health, car health, NOS meter, ammo, weapon, wanted
  stars, clock, radio station, district name, job objective with timer, speed, and a
  circular minimap showing you, the waypoint, police, the helicopter, shops, the safehouse
  and stashes.
- **Radio** — press **Q** to cycle three synth stations (Neon FM, Bay 101, Turbo).
- **Start screen, pause menu, run stats, save/load** — progress auto-saves to localStorage.
- **Synthetic sound** — WebAudio engine hum, sirens, gunshots and synth music. No audio
  files, no network requests — everything is vendored or generated.

## How to play

Serve the `game/` folder with any static server, e.g. `node serve.ts`, then open
http://localhost:8080 in desktop Chrome.

| Key | Action |
| --- | --- |
| WASD / arrows | Move / drive |
| Mouse | Look (click the game to lock the pointer) |
| E | Steal / exit car, open shops, advance dialog |
| Click | Shoot |
| 1–4 | Switch weapon |
| F | Punch |
| Space | Brake |
| Shift | NOS boost / sprint |
| Q | Cycle radio station |
| M | Restart job |
| P / Esc | Pause (stats + save) |

## Run it

```sh
node serve.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=q57bcks6&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
