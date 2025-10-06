import { SeededRng } from '../../shared/adapters/SeededRng';
import { BrowserClock } from '../../shared/adapters/BrowserClock';
import { renderHellStationAndCans, renderArtCars } from '../ui/canvas';
import { tickHellStation } from '../modules/world';
import type { GasCan, HellStation, Player } from '../modules/world';
import { tryPickupGasCan } from '../modules/actions';
import { createArtCar, tickArtCarKinematics } from '../modules/entities';
import { consumeFuel, deliverGasToArtCar } from '../modules/actions/fuel';
import { decideArtCarState, seekGasTarget } from '../modules/ai';
import { tryMountArtCar, dismount } from '../modules/actions';
import { applyMovingPlatform } from '../modules/physics';

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function startHellStationDemo(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rng = new SeededRng(12345);
  const clock = new BrowserClock();

  let cans: GasCan[] = [];
  let player: Player = { id: 'p1', pos: { x: 240, y: 190 }, vel: { x: 0, y: 0 }, holding: null, mountedOn: null, bike: null, karma: 0 };
  const keys = new Set<string>();
  let cars = [createArtCar(rng, { x: 400, y: 220 })];
  let station: HellStation = {
    id: 'hell-station-1',
    aabb: { x: 120, y: 120, w: 260, h: 140 },
    spawnIntervalMs: 12000,
    maxCans: 5,
    lastSpawnAt: 0,
  };

  let pickupCooldownUntil = 0;
  function step(dt: number, nowMs: number) {
    const speed = 120; // px/sec
    player.vel.x = 0;
    player.vel.y = 0;
    if (keys.has('w') || keys.has('arrowup')) player.vel.y -= speed;
    if (keys.has('s') || keys.has('arrowdown')) player.vel.y += speed;
    if (keys.has('a') || keys.has('arrowleft')) player.vel.x -= speed;
    if (keys.has('d') || keys.has('arrowright')) player.vel.x += speed;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;

    // auto-pickup when within range
    if (nowMs >= pickupCooldownUntil) {
      const res = tryPickupGasCan(player, cans);
      if (res.picked) {
        player = res.player;
        cans = res.cans;
      }
    }
  }

  let lastNow = clock.now();
  function frame() {
    const now = clock.now();
    const result = tickHellStation(station, cans, now, rng);
    cans = result.cans;
    station = result.station;
    const dt = Math.max(0, Math.min(0.05, (now - lastNow) / 1000));
    step(dt, now);

    // tick art cars with AI
    cars = cars.map((c) => {
      const consumed = consumeFuel(c, dt);
      const newState = decideArtCarState(consumed, { cans, station, player });
      const target = seekGasTarget(consumed, { cans, station, player });
      
      let updatedCar = { ...consumed, state: newState };
      
      // Simple steering toward target
      if (target.targetPos && newState === 'seekFuel') {
        const dx = target.targetPos.x - updatedCar.pos.x;
        const dy = target.targetPos.y - updatedCar.pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          const speed = 40;
          updatedCar.vel.x = (dx / dist) * speed;
          updatedCar.vel.y = (dy / dist) * speed;
        }
      }
      
      return tickArtCarKinematics(updatedCar, dt);
    });
    
    // Apply moving platform if mounted
    if (player.mountedOn) {
      const mountedCar = cars.find(c => c.id === player.mountedOn);
      if (mountedCar) {
        const platformResult = applyMovingPlatform(player, mountedCar, dt);
        player = { ...player, pos: platformResult.pos };
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderHellStationAndCans({ ctx, cans, station });
    renderArtCars(ctx, cars);
    // simple player dot
    ctx.fillStyle = '#66c2ff';
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // render held gas can above player
    if (player.holding && player.holding.kind === 'GasCan') {
      ctx.font = '16px system-ui, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⛽', player.pos.x, player.pos.y - 14);
    }

    // HUD update
    const hud = document.querySelector('.hud');
    if (hud) {
      const holding = player.holding ? 'Holding: Gas Can' : 'Holding: None';
      const mounted = player.mountedOn ? ' | Mounted' : '';
      hud.textContent = holding + mounted;
    }

    lastNow = now;
    clock.requestAnimationFrame(() => frame());
  }

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keys.add(key);
    if (key === ' ') {
      // Space: mount/dismount
      if (player.mountedOn) {
        player = dismount(player);
      } else {
        const mountRes = tryMountArtCar(player, cars);
        if (mountRes.mounted) {
          player = mountRes.player;
        }
      }
    }
    if (key === 'e') {
      // Action: deliver if near car and holding; otherwise drop
      if (player.holding && player.holding.kind === 'GasCan') {
        let delivered = false;
        for (let i = 0; i < cars.length; i++) {
          const d = distance(player.pos, cars[i].pos);
          if (d <= 32) {
            const res = deliverGasToArtCar(player, cars[i]);
            if (res.delivered) {
              player = res.player;
              cars[i] = res.car;
              delivered = true;
              break;
            }
          }
        }
        if (!delivered) {
          const heldId = player.holding.id;
          let found = false;
          cans = cans.map((c) => {
            if (c.id === heldId) {
              found = true;
              return { ...c, active: false, pos: { x: player.pos.x, y: player.pos.y } };
            }
            return c;
          });
          if (!found) {
            cans = [...cans, { id: heldId, active: false, pos: { x: player.pos.x, y: player.pos.y } }];
          }
          player = { ...player, holding: null };
        }
        // cooldown to avoid instant re-pickup
        pickupCooldownUntil = clock.now() + 1000;
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.key.toLowerCase());
  });

  frame();
}


