import type { Rng } from '../../../shared/ports';
import { FUEL_MAX, FUEL_LOW_THRESHOLD } from '../world';
import type { ArtCar } from '../world';

const ART_CAR_DESIGNS = [
  { design: 'classic' as const, size: 1.0, speed: 1.0, fuelMax: FUEL_MAX },
  { design: 'fire' as const, size: 1.2, speed: 1.3, fuelMax: FUEL_MAX * 0.8 },
  { design: 'speedy' as const, size: 0.8, speed: 1.5, fuelMax: FUEL_MAX * 0.6 },
  { design: 'heavy' as const, size: 2.2, speed: 0.7, fuelMax: FUEL_MAX * 1.5 }, // Much larger
  { design: 'compact' as const, size: 0.6, speed: 1.1, fuelMax: FUEL_MAX * 0.7 },
  { design: 'alien' as const, size: 1.1, speed: 1.3, fuelMax: FUEL_MAX * 0.9 },
  { design: 'davinci' as const, size: 2.0, speed: 0.6, fuelMax: FUEL_MAX * 1.2 }, // Much larger
  { design: 'octopus' as const, size: 2.5, speed: 0.9, fuelMax: FUEL_MAX * 1.1 } // Much larger
];

export function createArtCar(rng: Rng, pos: { x: number; y: number }): ArtCar {
  const designIndex = rng.randomInt(0, ART_CAR_DESIGNS.length);
  const designConfig = ART_CAR_DESIGNS[designIndex];
  const baseSpeed = 120; // 3x faster (was 40)
  const speed = baseSpeed * designConfig.speed + rng.randomRange(-5, 5);
  const dir = rng.randomRange(0, Math.PI * 2);
  const vel = { x: Math.cos(dir) * speed, y: Math.sin(dir) * speed };
  
  return {
    id: `artcar:${Math.floor(rng.getSeed())}:${Math.floor(rng.random() * 1e6)}`,
    pos: { ...pos },
    vel,
    fuel: designConfig.fuelMax,
    fuelMax: designConfig.fuelMax,
    fuelLowThreshold: FUEL_LOW_THRESHOLD,
    state: 'patrol',
    platformAabb: { x: pos.x - 24 * designConfig.size, y: pos.y - 12 * designConfig.size, w: 48 * designConfig.size, h: 24 * designConfig.size },
    design: designConfig.design,
    size: designConfig.size,
    speed: designConfig.speed,
  };
}

export function tickArtCarKinematics(car: ArtCar, dtSec: number, worldBounds?: { width: number; height: number }): ArtCar {
  let pos = { x: car.pos.x + car.vel.x * dtSec, y: car.pos.y + car.vel.y * dtSec };
  
  // Keep within trash fence circle (center at 2000,1500, radius 1400)
  const fenceCenter = { x: 2000, y: 1500 };
  const fenceRadius = 1400;
  const carRadius = 60 * car.size; // Scale collision radius with car size
  
  const distanceFromCenter = Math.hypot(pos.x - fenceCenter.x, pos.y - fenceCenter.y);
  
  if (distanceFromCenter + carRadius > fenceRadius) {
    // Car is outside fence, bounce it back in
    const angle = Math.atan2(pos.y - fenceCenter.y, pos.x - fenceCenter.x);
    pos.x = fenceCenter.x + Math.cos(angle) * (fenceRadius - carRadius);
    pos.y = fenceCenter.y + Math.sin(angle) * (fenceRadius - carRadius);
    
    // Reverse velocity component pointing outward
    const normalX = Math.cos(angle);
    const normalY = Math.sin(angle);
    const dotProduct = car.vel.x * normalX + car.vel.y * normalY;
    car.vel.x -= 2 * dotProduct * normalX;
    car.vel.y -= 2 * dotProduct * normalY;
  }
  
  const platformAabb = { ...car.platformAabb, x: pos.x - 60 * car.size, y: pos.y - 30 * car.size }; // Scale platform with car size
  return { ...car, pos, platformAabb };
}


