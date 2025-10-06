import type { GasCan, HellStation } from '../../modules/world';

export interface ItemRenderConfig {
  ctx: CanvasRenderingContext2D;
  cans: GasCan[];
  station: HellStation;
}

export function renderHellStationAndCans({ ctx, cans, station }: ItemRenderConfig): void {
  // Station footprint
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 100, 50, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(station.aabb.x, station.aabb.y, station.aabb.w, station.aabb.h);

  // Cans on ground (inactive only)
  ctx.font = '16px system-ui, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const can of cans) {
    if (!can.active) {
      ctx.fillText('⛽', can.pos.x, can.pos.y);
    }
  }
  ctx.restore();
}


