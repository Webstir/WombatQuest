/**
 * World landmarks and structures
 */

import type { Vec2, GameTime } from '../core';
import { createVec2 } from '../core';

export interface Landmark {
  id: string;
  type: 'man' | 'temple' | 'trashFence' | 'artCar' | 'camp' | 'restArea';
  position: Vec2;
  size: number;
  color: string;
  description: string;
  buildingProgress?: number; // 0-1, how built it is
  isBurning?: boolean; // If it's currently burning
  isBurned?: boolean; // If it's already burned down
  handsUp?: boolean; // If The Man's hands are raised (Saturday)
  destructionProgress?: number; // 0-1, how destroyed it is
  ashesProgress?: number; // 0-1, how much ashes remain (shrinking over time)
  isBonfire?: boolean; // If it's completely destroyed and just a bonfire
  fireworksActive?: boolean; // If fireworks should be displayed
  restAreaType?: 'center' | 'teepee' | 'east' | 'west'; // Type of rest area
  pieces?: {
    // Man pieces
    head?: boolean;
    leftArm?: boolean;
    rightArm?: boolean;
    leftLeg?: boolean;
    rightLeg?: boolean;
    torso?: boolean;
    // Temple pieces
    roof?: boolean;
    leftWall?: boolean;
    rightWall?: boolean;
    backWall?: boolean;
    pillars?: boolean;
  };
}

/**
 * Get landmarks for a specific world with building progress based on current time
 */
export function getWorldLandmarks(worldId: string, gameTime?: GameTime): Landmark[] {
  switch (worldId) {
    case 'playa':
      return getPlayaLandmarks(gameTime);
    case 'camp':
      return getCampLandmarks();
    case 'danceStage':
      return getDanceStageLandmarks();
    default:
      return [];
  }
}

/**
 * Calculate spawn multiplier based on day of week
 * Items become more populated as the week goes on, then clear out Sat-Mon
 */
export function getSpawnMultiplier(day: number): number {
  // 10-day timeline: Day1=Sat ... Day10=Mon (next week)
  if (day <= 1) return 0.2; // Day1 Sat - sparse
  if (day <= 2) return 0.4; // Day2 Sun
  if (day <= 3) return 0.6; // Day3 Mon
  if (day <= 4) return 0.8; // Day4 Tue
  if (day <= 5) return 1.0; // Day5 Wed - peak
  if (day <= 6) return 1.0; // Day6 Thu - peak
  if (day <= 7) return 1.0; // Day7 Fri - peak
  if (day === 8) return 0.67; // Day8 Sat - 1/3 disappear
  if (day === 9) return 0.33; // Day9 Sun - another 1/3 disappear
  return 0.1; // Day10 Mon - last 1/3 disappear
}

/**
 * Calculate building progress based on day of week
 * Sunday = 1, Monday = 2, ..., Saturday = 7
 */
function getBuildingProgress(day: number, structure: 'man' | 'temple'): { progress: number; isBurning: boolean; isBurned: boolean; handsUp?: boolean } {
  
  if (structure === 'man') {
    // 10-day timeline, Day1 = Saturday; Man burns on Day8 (Saturday)
    if (day <= 1) {
      return { progress: 0, isBurning: false, isBurned: false }; // Day1 Sat - not started
    }
    if (day === 2) return { progress: 0.1, isBurning: false, isBurned: false }; // Day2 Sun - foundation
    if (day === 3) return { progress: 0.3, isBurning: false, isBurned: false }; // Day3 Mon - pole
    if (day === 4) return { progress: 0.5, isBurning: false, isBurned: false }; // Day4 Tue - figure appears
    if (day === 5) return { progress: 0.7, isBurning: false, isBurned: false }; // Day5 Wed - details
    if (day === 6) return { progress: 0.9, isBurning: false, isBurned: false }; // Day6 Thu - almost complete
    if (day === 7) return { progress: 1.0, isBurning: false, isBurned: false }; // Day7 Fri - complete
    if (day === 8) return { progress: 1.0, isBurning: true, isBurned: false, handsUp: true }; // Day8 Sat - hands up & burning
    if (day >= 9) return { progress: 0, isBurning: false, isBurned: true }; // Day9+ Sun/Mon - ashes
    return { progress: 0, isBurning: false, isBurned: false };
  } else {
    // Temple burns on Day9 (Sunday)
    if (day <= 1) {
      return { progress: 0, isBurning: false, isBurned: false }; // Day1 Sat
    }
    if (day === 2) return { progress: 0.15, isBurning: false, isBurned: false }; // Day2 Sun
    if (day === 3) return { progress: 0.35, isBurning: false, isBurned: false }; // Day3 Mon
    if (day === 4) return { progress: 0.55, isBurning: false, isBurned: false }; // Day4 Tue
    if (day === 5) return { progress: 0.75, isBurning: false, isBurned: false }; // Day5 Wed
    if (day === 6) return { progress: 0.9, isBurning: false, isBurned: false }; // Day6 Thu
    if (day === 7) return { progress: 1.0, isBurning: false, isBurned: false }; // Day7 Fri - complete
    if (day === 8) return { progress: 1.0, isBurning: false, isBurned: false }; // Day8 Sat - complete
    if (day === 9) return { progress: 1.0, isBurning: true, isBurned: false }; // Day9 Sun - burning
    if (day >= 10) return { progress: 0, isBurning: false, isBurned: true }; // Day10 Mon - ashes
    return { progress: 0, isBurning: false, isBurned: false };
  }
}

/**
 * Playa landmarks - The Man, Temple, and trash fence with building progress
 */
function getPlayaLandmarks(gameTime?: GameTime): Landmark[] {
  const landmarks: Landmark[] = [];
  const day = gameTime?.day || 1;
  const hour = gameTime?.hour ?? 0;
  
  // Debug logging
  
  // The Man - center of the playa (3x larger)
  const manStatus = getBuildingProgress(day, 'man');
  
  // New timeline: Day 7 hands down, Day 8 full sequence, Day 9 ashes
  let manIsBurningAllDay = false;
  let manDestructionProgress = 0;
  let manAshesProgress = 0;
  let fireworksActive = false;
  
  if (day === 7 && gameTime && gameTime.hour >= 12) {
    // Day 7: Hands down (last 12 hours)
    manIsBurningAllDay = false;
    manDestructionProgress = 0;
    manAshesProgress = 0;
    fireworksActive = false;
    // console.log(`🔥 Day 7: Man hands down - Hour: ${gameTime.hour}`);
  } else if (day === 8 && gameTime) {
    // Day 8: Full timeline
    if (gameTime.hour < 8) {
      // Before 8 AM: Hands up, no burning
      manIsBurningAllDay = false;
      manDestructionProgress = 0;
      manAshesProgress = 0;
      fireworksActive = false;
    } else if (gameTime.hour < 12) {
      // 8 AM - 12 PM: Fireworks start
      manIsBurningAllDay = false;
      manDestructionProgress = 0;
      manAshesProgress = 0;
      fireworksActive = true;
    } else if (gameTime.hour < 15) {
      // 12 PM - 3 PM: Man starts burning with smaller fire that grows
      manIsBurningAllDay = true;
      const burnHours = gameTime.hour - 12;
      manDestructionProgress = Math.max(0, Math.min(0.3, burnHours / 3 * 0.3)); // Small fire, 0-30% over 3 hours
      manAshesProgress = 0;
      fireworksActive = true;
    } else if (gameTime.hour < 17) {
      // 3 PM - 5 PM: Phase 1 - Arms and head start falling
      manIsBurningAllDay = true;
      const phase1Hours = gameTime.hour - 15;
      manDestructionProgress = Math.max(0.3, Math.min(0.6, 0.3 + (phase1Hours / 2 * 0.3))); // 30% to 60% over 2 hours
      manAshesProgress = 0;
      fireworksActive = true;
    } else if (gameTime.hour < 19) {
      // 5 PM - 7 PM: Phase 2 - Legs fall, torso starts to collapse
      manIsBurningAllDay = true;
      const phase2Hours = gameTime.hour - 17;
      manDestructionProgress = Math.max(0.6, Math.min(0.85, 0.6 + (phase2Hours / 2 * 0.25))); // 60% to 85% over 2 hours
      manAshesProgress = 0;
      fireworksActive = true;
    } else if (gameTime.hour < 20) {
      // 7 PM - 8 PM: Phase 3 - Final collapse, torso falls
      manIsBurningAllDay = true;
      const phase3Hours = gameTime.hour - 19;
      manDestructionProgress = Math.max(0.85, Math.min(1, 0.85 + (phase3Hours / 1 * 0.15))); // 85% to 100% over 1 hour
      manAshesProgress = 0;
      fireworksActive = true;
    } else {
      // 8 PM onwards: Bonfire stage
      manIsBurningAllDay = true;
      manDestructionProgress = 1.0;
      manAshesProgress = 0;
      fireworksActive = true;
    }
    let phase = '';
    if (gameTime.hour < 8) phase = 'Hands Up';
    else if (gameTime.hour < 12) phase = 'Fireworks';
    else if (gameTime.hour < 15) phase = 'Small Fire';
    else if (gameTime.hour < 17) phase = 'Phase 1 - Arms/Head';
    else if (gameTime.hour < 19) phase = 'Phase 2 - Legs/Torso';
    else if (gameTime.hour < 20) phase = 'Phase 3 - Final Collapse';
    else phase = 'Bonfire';
    
    // console.log(`🔥 Day 8 Man Timeline - Hour: ${gameTime.hour}, Phase: ${phase}, Destruction: ${(manDestructionProgress * 100).toFixed(1)}%`);
  } else if (day === 9 && gameTime) {
    // Day 9: Ashes stage
    manIsBurningAllDay = true;
    manDestructionProgress = 1.0;
    
    // Ashes start on Day 9 and progress throughout the day
    const hoursIntoAshes = gameTime.hour;
    manAshesProgress = Math.max(0, Math.min(1, hoursIntoAshes / 24)); // 0 to 1 over 24 hours
    fireworksActive = false;
    
    // console.log(`🔥 Day 9 Man Ashes - Hour: ${gameTime.hour}, Ashes: ${(manAshesProgress * 100).toFixed(1)}%`);
  }
  
  // Debug logging for destruction progress (disabled to prevent spam)
  // if (manIsBurningAllDay && gameTime) {
  //   console.log(`🔥 Man pieces destroyed:`, {
  //     head: manDestructionProgress > 0.1,
  //     leftArm: manDestructionProgress > 0.3,
  //     rightArm: manDestructionProgress > 0.5,
  //     leftLeg: manDestructionProgress > 0.7,
  //     rightLeg: manDestructionProgress > 0.9,
  //     torso: manDestructionProgress > 1.0
  //   });
  // }
  
  landmarks.push({
    id: 'the-man',
    type: 'man',
    position: createVec2(2000, 1500), // Center of enlarged 4000x3000 playa
    size: 180, // 3x larger (original was 60)
    color: manIsBurningAllDay ? '#ff0000' : manStatus.isBurned ? '#444444' : '#ff6b35',
    description: manAshesProgress > 0 ? 'The Man - now just ashes' : 
                 manDestructionProgress >= 1.0 ? 'The Man - now just a bonfire' : 
                 day === 7 && gameTime && gameTime.hour >= 12 ? 'The Man - hands down, final day' : 
                 day === 8 && gameTime && gameTime.hour < 8 ? 'The Man - hands raised, ready to burn!' : 
                 day === 8 && gameTime && gameTime.hour >= 8 && gameTime.hour < 12 ? 'The Man - fireworks celebration!' : 
                 day === 8 && gameTime && gameTime.hour >= 12 && gameTime.hour < 15 ? 'The Man - small fire starting!' : 
                 day === 8 && gameTime && gameTime.hour >= 15 && gameTime.hour < 17 ? 'The Man - arms and head falling!' : 
                 day === 8 && gameTime && gameTime.hour >= 17 && gameTime.hour < 19 ? 'The Man - legs falling, torso collapsing!' : 
                 day === 8 && gameTime && gameTime.hour >= 19 && gameTime.hour < 20 ? 'The Man - final collapse!' : 
                 manIsBurningAllDay ? 'The Man is burning!' : 
                 manStatus.isBurned ? 'The Man has burned' : 
                 'The Man - the center of Burning Man',
    buildingProgress: manStatus.progress,
    isBurning: manIsBurningAllDay,
    isBurned: manStatus.isBurned,
    handsUp: manStatus.handsUp,
    destructionProgress: manDestructionProgress,
    ashesProgress: manAshesProgress, // New property for ashes stage
    isBonfire: manDestructionProgress >= 1.0, // New property for bonfire stage
    fireworksActive: fireworksActive, // New property for fireworks
    pieces: {
      head: manDestructionProgress > 0.1,
      leftArm: manDestructionProgress > 0.3,
      rightArm: manDestructionProgress > 0.5,
      leftLeg: manDestructionProgress > 0.7,
      rightLeg: manDestructionProgress > 0.9,
      torso: manDestructionProgress > 1.0
    }
  });
  
  // The Temple - 6x further away from The Man (twice as far as before)
  const templeStatus = getBuildingProgress(day, 'temple');
  // Burn all day on Day 9 (Sunday)
  const templeIsBurningAllDay = day === 9;
  
  // Debug logging for Temple burning
  if (templeIsBurningAllDay) {
    // console.log(`🔥 Temple is burning on Day ${day}!`);
  }
  // Calculate destruction progress for The Temple (pieces fall off over time)
  // Use current time for dynamic destruction that progresses throughout the day
  let templeDestructionProgress = 0;
  let templeAshesProgress = 0;
  if (templeIsBurningAllDay && gameTime) {
    // Start at 30% at 6 AM, progress to 100% by 6 PM (12 hours)
    const hoursIntoBurn = gameTime.hour - 6; // Start burning at 6 AM
    const burnProgress = Math.max(0, Math.min(1, hoursIntoBurn / 12)); // 0 to 1 over 12 hours
    templeDestructionProgress = 0.3 + (burnProgress * 0.7); // 30% to 100%
    
    // Ashes stage: starts after 6 PM and continues for 6 hours (until midnight)
    if (gameTime.hour >= 18) { // 6 PM or later
      const hoursIntoAshes = gameTime.hour - 18;
      templeAshesProgress = Math.max(0, Math.min(1, hoursIntoAshes / 6)); // 0 to 1 over 6 hours
    }
  }
  
  landmarks.push({
    id: 'the-temple',
    type: 'temple',
    position: createVec2(2000, 600), // Much further north from the center
    size: 120, // Larger size for more detail
    color: templeIsBurningAllDay ? '#ff0000' : templeStatus.isBurned ? '#444444' : '#8b4513',
    description: templeDestructionProgress >= 1.0 ? 'The Temple - now just a bonfire' : templeIsBurningAllDay ? 'The Temple is burning!' : templeStatus.isBurned ? 'The Temple has burned' : 'The Temple - a place of reflection and remembrance',
    buildingProgress: templeStatus.progress,
    isBurning: templeIsBurningAllDay,
    isBurned: templeStatus.isBurned,
    destructionProgress: templeDestructionProgress,
    isBonfire: templeDestructionProgress >= 1.0, // New property for bonfire stage
    pieces: {
      roof: templeDestructionProgress > 0.2,
      leftWall: templeDestructionProgress > 0.4,
      rightWall: templeDestructionProgress > 0.6,
      backWall: templeDestructionProgress > 0.8,
      pillars: templeDestructionProgress > 1.0
    }
  });
  
  // Trash fence - perimeter circle around everything
  landmarks.push({
    id: 'trash-fence',
    type: 'trashFence',
    position: createVec2(2000, 1500), // Center
    size: 1400, // Larger radius for bigger world
    color: '#2c3e50', // Dark gray
    description: 'Trash fence - the perimeter of the event'
  });
  
  // Your camp on the playa - inside the fence, halfway from The Man toward the left
  landmarks.push({
    id: 'playa-camp',
    type: 'camp',
    position: createVec2(1200, 1500), // Halfway from center (2000,1500) toward left
    size: 100, // Will be drawn as a rectangle
    color: '#27ae60', // Green
    description: 'Your camp on the playa - walk here to return to main camp'
  });
  
  // Hell Station - gas can spawning area at 10pm (northwest) near trash fence
  landmarks.push({
    id: 'hell-station',
    type: 'camp', // Changed from 'artCar' to prevent portal warping
    position: createVec2(1000, 600), // 10pm position (northwest) near trash fence
    size: 80,
    color: '#ff6b35', // Orange-red
    description: 'Hell Station - buy gas for art cars (40 coins, 20 karma)'
  });
  
  // Center Camp - below The Man
  landmarks.push({
    id: 'center-camp',
    type: 'camp',
    position: createVec2(2000, 1800), // Below The Man (2000, 1500)
    size: 100,
    color: '#3498db', // Blue
    description: 'Center Camp - buy ice or tea (10 coins each, 5 karma)'
  });
  
  // Art Car 1 - "The Disco Bus"
  landmarks.push({
    id: 'art-car-1',
    type: 'artCar',
    position: createVec2(1600, 1200), // Northwest area
    size: 60,
    color: '#f06', // Pink
    description: 'The Disco Bus - needs fuel to keep the party going'
  });

  // Art Car 2 - "The Fire Dragon"
  landmarks.push({
    id: 'art-car-2',
    type: 'artCar',
    position: createVec2(2400, 2000), // Southeast area
    size: 60,
    color: '#9b59b6', // Purple
    description: 'The Fire Dragon - cruising the playa with flames'
  });

  // Rest Areas - 4 locations for enhanced energy recovery
  
  // Center Camp Rest Area (existing center camp now doubles as rest area)
  landmarks.push({
    id: 'center-camp-rest',
    type: 'restArea',
    position: createVec2(2000, 1800), // Same as Center Camp
    size: 120,
    color: '#3498db', // Blue
    description: 'Center Camp - rest here for 2x energy recovery',
    restAreaType: 'center'
  });

  // Teepee in Deep Playa (far north)
  landmarks.push({
    id: 'deep-playa-teepee',
    type: 'restArea',
    position: createVec2(2000, 400), // Far north, deep playa
    size: 100,
    color: '#8b4513', // Brown
    description: 'Deep Playa Teepee - rest here for 2x energy recovery',
    restAreaType: 'teepee'
  });

  // East Rest Area (right side of playa)
  landmarks.push({
    id: 'east-rest-area',
    type: 'restArea',
    position: createVec2(3200, 1500), // Far right (east)
    size: 100,
    color: '#27ae60', // Green
    description: 'East Rest Area - rest here for 2x energy recovery',
    restAreaType: 'east'
  });

  // West Rest Area (left side of playa)
  landmarks.push({
    id: 'west-rest-area',
    type: 'restArea',
    position: createVec2(800, 1500), // Far left (west)
    size: 100,
    color: '#e74c3c', // Red
    description: 'West Rest Area - rest here for 2x energy recovery',
    restAreaType: 'west'
  });
  
  return landmarks;
}

/**
 * Camp landmarks
 */
function getCampLandmarks(): Landmark[] {
  return []; // No landmarks in camp - just tents and boundary
}

/**
 * Dance stage landmarks
 */
function getDanceStageLandmarks(): Landmark[] {
  return [
    {
      id: 'main-stage',
      type: 'artCar',
      position: createVec2(600, 400), // Center of dance stage
      size: 50,
      color: '#9b59b6', // Purple
      description: 'Main dance stage with pulsing lights'
    }
  ];
}
