import type { ArtCar } from '../../modules/world';

export function renderArtCars(ctx: CanvasRenderingContext2D, cars: ArtCar[]): void {
  ctx.save();
  for (const car of cars) {
    const size = car.size;
    const width = 40 * size;
    const height = 20 * size;
    
    // Render fire effect for fire design
    if (car.design === 'fire') {
      renderFireEffect(ctx, car.pos, size);
    }
    
    // car body with different colors per design
    let bodyColor = '#f06'; // default
    switch (car.design) {
      case 'classic': bodyColor = '#f06'; break;
      case 'fire': bodyColor = '#ff4500'; break;
      case 'speedy': bodyColor = '#00ff00'; break;
      case 'heavy': bodyColor = '#8b4513'; break;
      case 'compact': bodyColor = '#ff69b4'; break;
    }
    
    ctx.fillStyle = bodyColor;
    ctx.fillRect(car.pos.x - width/2, car.pos.y - height/2, width, height);
    
    // Add design-specific details
    renderDesignDetails(ctx, car);

    // fuel bar
    const w = width;
    const h = 4;
    const pct = car.fuelMax > 0 ? car.fuel / car.fuelMax : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(car.pos.x - w / 2, car.pos.y - height/2 - 8, w, h);
    ctx.fillStyle = pct < 0.25 ? '#f33' : pct < 0.5 ? '#fc3' : '#3f3';
    ctx.fillRect(car.pos.x - w / 2, car.pos.y - height/2 - 8, w * pct, h);
  }
  ctx.restore();
}

function renderFireEffect(ctx: CanvasRenderingContext2D, pos: { x: number; y: number }, size: number): void {
  const time = Date.now() * 0.01;
  const flameCount = 3;
  
  for (let i = 0; i < flameCount; i++) {
    const angle = (i / flameCount) * Math.PI * 2 + time;
    const radius = 8 + Math.sin(time + i) * 3;
    const flameX = pos.x + Math.cos(angle) * radius;
    const flameY = pos.y + Math.sin(angle) * radius;
    
    // Create flame gradient
    const gradient = ctx.createRadialGradient(flameX, flameY, 0, flameX, flameY, 6 * size);
    gradient.addColorStop(0, '#ffff00');
    gradient.addColorStop(0.5, '#ff4500');
    gradient.addColorStop(1, '#8b0000');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(flameX, flameY, 6 * size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderDesignDetails(ctx: CanvasRenderingContext2D, car: ArtCar): void {
  const size = car.size;
  const width = 40 * size;
  const height = 20 * size;
  
  switch (car.design) {
    case 'speedy':
      // Racing stripes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(car.pos.x - width/2 + 5, car.pos.y - height/2 + 2, width - 10, 2);
      ctx.fillRect(car.pos.x - width/2 + 5, car.pos.y + height/2 - 4, width - 10, 2);
      break;
    case 'heavy':
      // Thick armor plating
      ctx.fillStyle = '#654321';
      ctx.fillRect(car.pos.x - width/2, car.pos.y - height/2 - 2, width, 4);
      ctx.fillRect(car.pos.x - width/2, car.pos.y + height/2 - 2, width, 4);
      break;
    case 'compact':
      // Small details
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(car.pos.x - width/2 + 2, car.pos.y - height/2 + 2, 4, 4);
      ctx.fillRect(car.pos.x + width/2 - 6, car.pos.y - height/2 + 2, 4, 4);
      break;
  }
}



