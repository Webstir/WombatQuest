/**
 * Time system for day/hour/minute progression
 */

import type { GameTime } from './types';

export interface TimeConfig {
  minutesPerRealSecond: number; // How many game minutes pass per real second
  hoursPerDay: number; // How many hours in a game day
  minutesPerHour: number; // How many minutes in a game hour
}

export const DEFAULT_TIME_CONFIG: TimeConfig = {
  minutesPerRealSecond: 60, // 60 game minutes per real second (1 second = 1 game hour)
  hoursPerDay: 24,
  minutesPerHour: 60,
};

// Different time speeds for different worlds
export const CAMP_TIME_CONFIG: TimeConfig = {
  minutesPerRealSecond: 1, // 1 game minute per real second (1 second = 1 game minute)
  hoursPerDay: 24,
  minutesPerHour: 60,
};

export const PLAYA_TIME_CONFIG: TimeConfig = {
  minutesPerRealSecond: 60, // 60 game minutes per real second (1 second = 1 game hour)
  hoursPerDay: 24,
  minutesPerHour: 60,
};

/**
 * Create initial game time
 */
export function createInitialGameTime(): GameTime {
  return {
    day: 1, // Start on Day 1
    hour: 8, // Start at 8:00 AM
    minute: 0,
    totalMinutes: (1 - 1) * 24 * 60 + 8 * 60, // Day 1, 8:00 AM
  };
}

/**
 * Update game time based on delta time and time scale
 */
export function updateGameTime(
  currentTime: GameTime,
  deltaTime: number,
  timeScale: number = 1.0,
  config: TimeConfig = DEFAULT_TIME_CONFIG
): GameTime {
  // Calculate how many game minutes should pass
  const realSeconds = deltaTime;
  const gameMinutesPassed = realSeconds * config.minutesPerRealSecond * timeScale;
  
  // Update total minutes
  const newTotalMinutes = currentTime.totalMinutes + gameMinutesPassed;
  
  // Calculate new day, hour, minute
  const totalMinutesInDay = config.hoursPerDay * config.minutesPerHour;
  const newDay = Math.floor(newTotalMinutes / totalMinutesInDay) + 1;
  const minutesInCurrentDay = newTotalMinutes % totalMinutesInDay;
  const newHour = Math.floor(minutesInCurrentDay / config.minutesPerHour);
  const newMinute = Math.floor(minutesInCurrentDay % config.minutesPerHour);
  
  return {
    day: newDay,
    hour: newHour,
    minute: newMinute,
    totalMinutes: newTotalMinutes,
  };
}

/**
 * Format time for display
 */
export function formatGameTime(time: GameTime): string {
  const hour12 = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
  const ampm = time.hour < 12 ? 'AM' : 'PM';
  const minuteStr = time.minute.toString().padStart(2, '0');
  
  return `Day ${time.day} - ${hour12}:${minuteStr} ${ampm}`;
}

/**
 * Get time of day description
 */
export function getTimeOfDayDescription(time: GameTime): string {
  if (time.hour >= 6 && time.hour < 12) {
    return 'Morning';
  } else if (time.hour >= 12 && time.hour < 17) {
    return 'Afternoon';
  } else if (time.hour >= 17 && time.hour < 21) {
    return 'Evening';
  } else {
    return 'Night';
  }
}

/**
 * Check if it's nighttime
 */
export function isNightTime(time: GameTime): boolean {
  return time.hour < 6 || time.hour >= 21;
}

/**
 * Check if it's daytime
 */
export function isDayTime(time: GameTime): boolean {
  return !isNightTime(time);
}

/**
 * Get background color based on time of day
 */
export function getBackgroundColor(time: GameTime, baseColor: string = '#f5deb3'): string {
  const hour = time.hour;
  
  // Parse base color (assuming hex format like '#f5deb3')
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate darkness factor based on hour
  let darknessFactor = 1.0;
  
  if (hour >= 6 && hour < 8) {
    // Dawn (6-8 AM) - gradually getting lighter
    darknessFactor = 0.3 + (hour - 6) * 0.35; // 0.3 to 1.0
  } else if (hour >= 8 && hour < 18) {
    // Day (8 AM - 6 PM) - full brightness
    darknessFactor = 1.0;
  } else if (hour >= 18 && hour < 20) {
    // Dusk (6-8 PM) - gradually getting darker
    darknessFactor = 1.0 - (hour - 18) * 0.35; // 1.0 to 0.3
  } else {
    // Night (8 PM - 6 AM) - dark
    darknessFactor = 0.3;
  }
  
  // Apply darkness factor
  const newR = Math.floor(r * darknessFactor);
  const newG = Math.floor(g * darknessFactor);
  const newB = Math.floor(b * darknessFactor);
  
  return `rgb(${newR}, ${newG}, ${newB})`;
}
