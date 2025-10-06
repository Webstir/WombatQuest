Cursor Brief: Art Cars, Hell Station, Gas Cans, Mount/Dismount

Context: Fresh rebuild, modular architecture with barrels. We’re adding Art Cars that consume fuel, Hell Station that spawns gas cans, pickup/holding, AI to refuel, karma reward on delivery, and mount/dismount + moving platform behavior.

Non-negotiables (follow exactly)
- Only import via module index.ts barrels.
- No globals: use ports for Clock, Rng, Storage, Audio.
- Keep files ≤300 LOC, functions ≤60 LOC.
- End each step with:
  - a visible demo (index.html or route),
  - unit tests for pure logic,
  - lint/typecheck green,
  - docs/CODEMAP.md updated.

New/Updated Modules & Files (barrels required)
- src/modules/world/{types.ts, config.ts, hellStation.ts, spawn.ts, index.ts}
- src/modules/entities/{artCar.ts, bike.ts, player.ts, index.ts}
- src/modules/actions/{pickup.ts, mount.ts, fuel.ts, karma.ts, index.ts}
- src/modules/physics/{kinematics.ts, platforms.ts, index.ts}
- src/modules/ai/{artCarRefuel.ts, pathfind.ts (stub ok), index.ts}
- src/shared/ports/{audio.ts, index.ts} (extend existing ports)
- src/ui/canvas/{renderArtCars.ts, renderItems.ts, hud.ts, prompts.ts, index.ts}
- tests/{artCar.spec.ts, pickup.spec.ts, mount.spec.ts, fuel.spec.ts}

Entities & Types (define in world/types.ts and re-export via barrels)

export type EntityId = string;

export interface GasCan {
  id: EntityId;
  pos: { x:number; y:number };
  active: boolean;         // true when held by player
}

export interface HellStation {
  id: EntityId;
  aabb: { x:number; y:number; w:number; h:number };
  spawnIntervalMs: number;
  maxCans: number;
  lastSpawnAt: number;     // Clock.now()
}

export interface ArtCar {
  id: EntityId;
  pos: { x:number; y:number };
  vel: { x:number; y:number };
  fuel: number;            // 0..FUEL_MAX
  fuelMax: number;
  fuelLowThreshold: number; // start seeking gas below this
  state: 'patrol'|'seekFuel'|'refueling'|'idle';
  platformAabb: { x:number; y:number; w:number; h:number }; // walkable deck
  holder?: EntityId;       // player id if currently mounted
  path?: { x:number; y:number }[]; // optional waypoints
}

export interface Player {
  id: EntityId;
  pos: { x:number; y:number };
  vel: { x:number; y:number };
  holding?: { kind:'GasCan'; id:EntityId } | null;
  mountedOn?: EntityId | null; // artCar id
  bike?: { id:EntityId; pos:{x:number;y:number} } | null;
  karma: number;
}

Config (put magic numbers here; import where needed)

world/config.ts

export const GASCAN_SPAWN_INTERVAL_MS = 12_000;
export const GASCAN_MAX_AT_STATION = 5;
export const FUEL_MAX = 100;
export const FUEL_CONSUMPTION_PER_SEC = 1;          // while moving
export const FUEL_LOW_THRESHOLD = 25;
export const FUEL_REFILL_AMOUNT = 25;               // per gas can delivered
export const KARMA_FOR_DELIVERY = 5;
export const MOUNT_RANGE = 32;                      // px
export const PICKUP_RANGE = 24;
export const PLATFORM_SNAP_EPS = 2;                 // px

Ports (extend audio; others exist)

shared/ports/audio.ts

export interface AudioBus {
  play(name:'pickup'|'mount'|'dismount'|'refuel'): void;
}

Actions (pure reducers returning deltas)
- actions/pickup.ts
- tryPickupGasCan(player, cans, hellStation): { picked:boolean; updates:... }
- actions/fuel.ts
- deliverGasToArtCar(player, artCar): { delivered:boolean; fuelAdded:number; karmaGained:number }
- consumeFuel(artCar, dtSec): ArtCar (pure)
- actions/mount.ts
- tryMountArtCar(player, artCars): { mounted:boolean; artCarId?:EntityId; bikeLeft?:boolean }
- dismount(player): Player

Return immutable updated copies or “delta” objects so the app can apply consistently.

Physics / Platforms
- physics/platforms.ts
- isOnPlatform(entityAabb, platformAabb): boolean
- applyMovingPlatform(player, artCar, dtSec): { pos:{x,y} }
(If player is on platformAabb, add artCar’s velocity to player pos each tick.)
- physics/kinematics.ts (already exists; reuse for movement integration)

AI (simple, deterministic)
- ai/artCarRefuel.ts
- decideArtCarState(artCar, context): 'patrol'|'seekFuel'|'refueling'|'idle'
- seekGasTarget(artCar, cans, station): { targetPos:{x,y} | null }
- When fuel < FUEL_LOW_THRESHOLD, switch to seekFuel.
- If close to a held gas can delivery (player near art car with can), switch to refueling briefly.

Controls
- Spacebar:
- If near an art car (≤ MOUNT_RANGE) and not holding a can, mount; leaves bike at current player.pos.
- If mounted, dismount.
- Action key (whatever you use):
- If near gas can (≤ PICKUP_RANGE) and not holding, pick up.
- If near art car and holding gas, deliver (fuel + karma).

UI (minimal)
- HUD: show Karma: N, Holding: Gas Can | None, and selected ArtCar fuel bar when close/mounted.
- Prompts: “E: Pick up gas can”, “Space: Mount/Dismount”, “E: Deliver gas”.

Edge Cases (must handle)
- Can’t mount while holding gas (explicit message).
- Dropping gas can: for now, no drop—gas remains active until delivered (simplify).
- Dismount while moving: place player beside platform, preserve player velocity cap.
- Multiple art cars: nearest within MOUNT_RANGE wins.

Step Plan (stop after each step; show diffs, commands, tests)

Step 1 — Hell Station spawns gas cans (visible)

Goal: A Hell Station area on the map periodically spawns up to N gas cans. HUD shows “Holding: None”.
- Add world/hellStation.ts:
- tickHellStation(station, cans, clockNow, rng): { cans: GasCan[]; station: HellStation }
- Spawn new cans at random points inside station aabb on interval, up to maxCans.
- Add ui/canvas/renderItems.ts to draw cans and station footprint.
- Demo: Station rectangle + cans appearing every ~12s (seeded RNG).
- Tests: spawning caps at maxCans; interval respected; deterministic positions with fixed seed.

Deliverables: code diffs, update CODEMAP.md, run: npm run dev, npm test.

Step 2 — Pickup & Holding (visible)

Goal: Press action key near a can → player is holding it; can becomes active=true and no longer drawn on ground.
- Implement actions/pickup.ts::tryPickupGasCan.
- Update player HUD to show Holding: Gas Can.
- Audio: AudioBus.play('pickup') on success.
- Tests: pickup within range succeeds; out-of-range fails; once holding, subsequent pickups rejected.

Step 3 — Art Car entity + fuel consumption (visible)

Goal: Spawn 1–2 art cars that cruise slowly; fuel drains over time (show small fuel bar above car).
- entities/artCar.ts:
- createArtCar(seedRng, pos, config): ArtCar
- tickArtCarKinematics(artCar, dtSec): ArtCar
- actions/fuel.ts::consumeFuel(artCar, dtSec) (pure).
- ui/canvas/renderArtCars.ts draws car + fuel bar.
- Tests: fuel decreases linearly with dtSec, clamps to [0, fuelMax].

Step 4 — Deliver fuel → karma reward (visible)

Goal: While holding a can and near an art car, press action key to deliver. Car gains +fuel, player gains karma.
- Implement actions/fuel.ts::deliverGasToArtCar.
- Update HUD: Karma: +5 toast.
- Audio: AudioBus.play('refuel').
- Tests: fuel increases by FUEL_REFILL_AMOUNT, player karma+=KARMA_FOR_DELIVERY, holding cleared.

Step 5 — Art Car AI (seek fuel when low) (visible)

Goal: When fuel < threshold, art car switches to seekFuel and heads toward nearest gas (either ground can at station or player holding one).
- ai/artCarRefuel.ts::decideArtCarState, seekGasTarget.
- For now, steering can be “move straight toward targetPos at vel capped”.
- Tests: state machine transitions; chooses nearest gas target; returns to patrol after refuel.

Step 6 — Mount/Dismount + moving platform (visible)

Goal: Spacebar to mount/dismount nearest art car; player moves with the car and can walk around on top.
- actions/mount.ts::tryMountArtCar, dismount.
- physics/platforms.ts::isOnPlatform, applyMovingPlatform.
- Mounting drops bike at current pos (persist simple bike entity).
- UI: prompt “Space: Mount” when near; “Space: Dismount” when mounted.
- Audio: AudioBus.play('mount'/'dismount').
- Tests: mount only within MOUNT_RANGE and only if not holding; on platform tick, player inherits car motion; dismount places player beside deck.

Acceptance Criteria (all steps by the end)
- Can farm cans from Hell Station, pick one up (holding=true).
- Art cars cruise, burn fuel, seek gas when low.
- Delivering a can refuels car + grants karma.
- Spacebar mounts/dismounts; bike is left behind on mount; player rides atop and moves with car.

Performance Budget
- Up to 10 art cars, 200 cans, 60 FPS on mid-range laptop.
- Use existing spatial index for proximity checks; no O(n²) scans.

Telemetry & Debug (optional but helpful)
- Simple debug overlay: art car state (patrol/seekFuel/refueling), fuel numeric, nearest target distance.

What NOT to do
- No direct DOM/canvas calls from modules/* logic—use ui/* adapters.
- No deep imports (barrels only).
- No hidden singletons (pass ports via params).

Run order for Cursor:
“Execute Step 1 and show diffs + commands.” → I approve → “Proceed to Step 2,” etc.

If you want, I can also give you tiny starter stubs for hellStation.ts, pickup.ts, fuel.ts, and artCarRefuel.ts so Step 1/2 feel instant.



