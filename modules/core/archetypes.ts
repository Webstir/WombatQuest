/**
 * Burner-themed archetype and award system for end game
 */

export interface Archetype {
  id: string;
  name: string;
  description: string;
  emoji: string;
  requirements: {
    stats?: {
      mood?: { min?: number; max?: number };
      energy?: { min?: number; max?: number };
      karma?: { min?: number; max?: number };
      coins?: { min?: number; max?: number };
    };
    achievements?: string[];
    items?: Array<{ type: string; quantity: number }>;
    drugs?: Array<{ type: string; count: number }>;
    time?: { minHours?: number; maxHours?: number };
  };
  quote: string;
  color: string;
}

export interface Award {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export const BURNER_ARCHETYPES: Archetype[] = [
  {
    id: 'virgin-burner',
    name: 'Virgin Burner',
    description: 'Fresh to the playa, wide-eyed and ready for adventure',
    emoji: '🌟',
    requirements: {
      time: { maxHours: 2 },
      stats: { karma: { min: 0, max: 50 } }
    },
    quote: '"I have no idea what I\'m doing but this is amazing!"',
    color: '#FFD700'
  },
  {
    id: 'moop-warrior',
    name: 'Moop Warrior',
    description: 'Dedicated to keeping the playa clean, one piece of trash at a time',
    emoji: '🗑️',
    requirements: {
      stats: { karma: { min: 100 } },
      achievements: ['moop-collector']
    },
    quote: '"Leave no trace... except for these amazing memories!"',
    color: '#4CAF50'
  },
  {
    id: 'psychedelic-explorer',
    name: 'Psychedelic Explorer',
    description: 'Journeyed deep into altered states and emerged enlightened',
    emoji: '🌈',
    requirements: {
      drugs: [{ type: 'acid', count: 2 }, { type: 'shrooms', count: 1 }],
      stats: { mood: { min: 80 } }
    },
    quote: '"The colors... the colors are alive!"',
    color: '#9C27B0'
  },
  {
    id: 'party-animal',
    name: 'Party Animal',
    description: 'The life of every party, keeping the energy flowing all night long',
    emoji: '🎉',
    requirements: {
      stats: { energy: { min: 90 } },
      items: [{ type: 'Beer', quantity: 5 }, { type: 'Vodka', quantity: 2 }]
    },
    quote: '"What happens at Burning Man stays at Burning Man... mostly!"',
    color: '#FF5722'
  },
  {
    id: 'art-car-nomad',
    name: 'Art Car Nomad',
    description: 'Hitched rides on every moving sculpture, seeing the playa from every angle',
    emoji: '🚗',
    requirements: {
      achievements: ['art-car-rider'],
      stats: { karma: { min: 75 } }
    },
    quote: '"The journey is the destination, especially when you\'re on fire!"',
    color: '#FF9800'
  },
  {
    id: 'light-walker',
    name: 'Light Walker',
    description: 'Illuminated the darkness, bringing beauty to the night',
    emoji: '💡',
    requirements: {
      items: [{ type: 'Light Bulb', quantity: 10 }],
      stats: { lightBattery: { min: 80 } }
    },
    quote: '"In darkness, we find our light... and share it with the world."',
    color: '#FFEB3B'
  },
  {
    id: 'craft-master',
    name: 'Craft Master',
    description: 'Mastered the art of creation, building wonders from playa dust',
    emoji: '🔨',
    requirements: {
      items: [{ type: 'Totem', quantity: 1 }, { type: 'Cape', quantity: 1 }, { type: 'Costume', quantity: 1 }]
    },
    quote: '"From dust we came, to dust we return... but in between, we build miracles!"',
    color: '#795548'
  },
  {
    id: 'spiritual-seeker',
    name: 'Spiritual Seeker',
    description: 'Found enlightenment through meditation, connection, and inner peace',
    emoji: '🧘',
    requirements: {
      stats: { mood: { min: 95 }, karma: { min: 150 } },
      time: { minHours: 6 }
    },
    quote: '"The temple burns, but the spirit remains eternal."',
    color: '#607D8B'
  },
  {
    id: 'survivalist',
    name: 'Desert Survivalist',
    description: 'Thrived in the harsh conditions, mastering the art of playa living',
    emoji: '🏜️',
    requirements: {
      stats: { energy: { min: 70 }, mood: { min: 70 }, karma: { min: 50 } },
      time: { minHours: 8 }
    },
    quote: '"The playa provides... but only to those who respect her power."',
    color: '#8D6E63'
  },
  {
    id: 'legendary-burner',
    name: 'Legendary Burner',
    description: 'Achieved true mastery of the Burning Man experience',
    emoji: '🔥',
    requirements: {
      stats: { 
        mood: { min: 90 }, 
        energy: { min: 90 }, 
        karma: { min: 200 }, 
        coins: { min: 100 } 
      },
      time: { minHours: 10 },
      achievements: ['moop-collector', 'art-car-rider', 'not-a-darkwad']
    },
    quote: '"I am the playa, and the playa is me. We are one."',
    color: '#E91E63'
  }
];

export const BURNER_AWARDS: Award[] = [
  {
    id: 'first-moop',
    name: 'First Cleanup',
    description: 'Picked up your first piece of moop',
    emoji: '🗑️',
    unlocked: false
  },
  {
    id: 'moop-collector',
    name: 'Moop Collector',
    description: 'Collected 50 pieces of moop',
    emoji: '🧹',
    unlocked: false
  },
  {
    id: 'art-car-rider',
    name: 'Art Car Rider',
    description: 'Rode an art car for the first time',
    emoji: '🚗',
    unlocked: false
  },
  {
    id: 'not-a-darkwad',
    name: 'Not a Darkwad',
    description: 'Found your first light bulb',
    emoji: '💡',
    unlocked: false
  },
  {
    id: 'psychedelic-pioneer',
    name: 'Psychedelic Pioneer',
    description: 'Experienced multiple altered states',
    emoji: '🌈',
    unlocked: false
  },
  {
    id: 'craft-artisan',
    name: 'Craft Artisan',
    description: 'Created your first crafted item',
    emoji: '🔨',
    unlocked: false
  },
  {
    id: 'party-survivor',
    name: 'Party Survivor',
    description: 'Consumed various party substances',
    emoji: '🍻',
    unlocked: false
  },
  {
    id: 'desert-wanderer',
    name: 'Desert Wanderer',
    description: 'Spent significant time exploring the playa',
    emoji: '🏜️',
    unlocked: false
  },
  {
    id: 'spiritual-journey',
    name: 'Spiritual Journey',
    description: 'Achieved high karma through good deeds',
    emoji: '✨',
    unlocked: false
  },
  {
    id: 'burning-man-master',
    name: 'Burning Man Master',
    description: 'Completed the ultimate Burning Man experience',
    emoji: '👑',
    unlocked: false
  }
];

/**
 * Calculate player's archetype based on their stats and achievements
 */
export function calculatePlayerArchetype(
  stats: any,
  achievements: Set<string>,
  inventory: any,
  totalDrugsTaken: number,
  gameTimeHours: number
): Archetype | null {
  // Sort archetypes by complexity (more requirements = higher priority)
  const sortedArchetypes = [...BURNER_ARCHETYPES].sort((a, b) => {
    const aComplexity = Object.keys(a.requirements).length;
    const bComplexity = Object.keys(b.requirements).length;
    return bComplexity - aComplexity;
  });

  for (const archetype of sortedArchetypes) {
    if (meetsArchetypeRequirements(archetype, stats, achievements, inventory, totalDrugsTaken, gameTimeHours)) {
      return archetype;
    }
  }

  return null; // No archetype matched
}

/**
 * Check if player meets archetype requirements
 */
function meetsArchetypeRequirements(
  archetype: Archetype,
  stats: any,
  achievements: Set<string>,
  inventory: any,
  totalDrugsTaken: number,
  gameTimeHours: number
): boolean {
  const req = archetype.requirements;

  // Check stat requirements
  if (req.stats) {
    for (const [statName, range] of Object.entries(req.stats)) {
      const value = stats[statName];
      if (range.min !== undefined && value < range.min) return false;
      if (range.max !== undefined && value > range.max) return false;
    }
  }

  // Check achievement requirements
  if (req.achievements) {
    for (const achievement of req.achievements) {
      if (!achievements.has(achievement)) return false;
    }
  }

  // Check item requirements
  if (req.items) {
    for (const itemReq of req.items) {
      const quantity = inventory.items.get(itemReq.type) || 0;
      if (quantity < itemReq.quantity) return false;
    }
  }

  // Check drug requirements
  if (req.drugs) {
    for (const drugReq of req.drugs) {
      if (totalDrugsTaken < drugReq.count) return false;
    }
  }

  // Check time requirements
  if (req.time) {
    if (req.time.minHours !== undefined && gameTimeHours < req.time.minHours) return false;
    if (req.time.maxHours !== undefined && gameTimeHours > req.time.maxHours) return false;
  }

  return true;
}

/**
 * Check and unlock awards based on player progress
 */
export function checkAndUnlockAwards(
  awards: Award[],
  stats: any,
  achievements: Set<string>,
  inventory: any,
  totalDrugsTaken: number,
  gameTimeHours: number,
  moopCollected: number
): Award[] {
  const updatedAwards = [...awards];

  // Check each award
  updatedAwards.forEach(award => {
    if (award.unlocked) return; // Already unlocked

    let shouldUnlock = false;

    switch (award.id) {
      case 'first-moop':
        shouldUnlock = moopCollected >= 1;
        break;
      case 'moop-collector':
        shouldUnlock = moopCollected >= 50;
        break;
      case 'art-car-rider':
        shouldUnlock = achievements.has('art-car-rider');
        break;
      case 'not-a-darkwad':
        shouldUnlock = achievements.has('not-a-darkwad');
        break;
      case 'psychedelic-pioneer':
        shouldUnlock = totalDrugsTaken >= 5;
        break;
      case 'craft-artisan':
        shouldUnlock = (inventory.items.get('Totem') || 0) > 0 || 
                      (inventory.items.get('Cape') || 0) > 0 || 
                      (inventory.items.get('Costume') || 0) > 0;
        break;
      case 'party-survivor':
        shouldUnlock = (inventory.items.get('Beer') || 0) > 0 || 
                      (inventory.items.get('Vodka') || 0) > 0;
        break;
      case 'desert-wanderer':
        shouldUnlock = gameTimeHours >= 4;
        break;
      case 'spiritual-journey':
        shouldUnlock = stats.karma >= 100;
        break;
      case 'burning-man-master':
        shouldUnlock = stats.karma >= 200 && gameTimeHours >= 8 && achievements.size >= 3;
        break;
    }

    if (shouldUnlock && !award.unlocked) {
      award.unlocked = true;
      award.unlockedAt = Date.now();
      console.log(`🏆 Award unlocked: ${award.name} - ${award.description}`);
    }
  });

  return updatedAwards;
}

