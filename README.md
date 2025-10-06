# Wombat Quest - Step 1

## What's New
✅ **Minimal playable loop** - A blue square you can move with WASD on a canvas + coin counter  
✅ **Modular architecture** - Clean separation of concerns with ports & adapters pattern  
✅ **TypeScript + Vite** - Modern tooling with strict type checking  
✅ **Unit tests** - Movement logic is fully tested  

## Features
- **WASD/Arrow key movement** - Smooth 60fps movement with bounds checking
- **Visual feedback** - Blue square player with HUD showing coin count
- **Seeded RNG** - Deterministic randomness for future features
- **Reset functionality** - Reset button to restart the game
- **Responsive design** - Clean UI with game info and controls

## Architecture Highlights
- **Ports & Adapters**: Clock and Rng interfaces allow easy testing and swapping implementations
- **Barrel imports**: All modules export through index.ts files only
- **Pure functions**: Movement logic is completely testable and side-effect free
- **Size limits**: All files under 300 lines, functions under 60 lines

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Lint code
npm run lint
```

## File Structure
```
/app               # Boot + wiring only
/modules/core      # Basic types (Vec2, PlayerStats) + movement helpers
/shared/ports      # Clock, Rng interfaces
/shared/adapters   # BrowserClock, SeededRng implementations
/ui/canvas         # Canvas rendering + input handling
/tests/core        # Unit tests for movement logic
/docs              # Architecture and code documentation
```

## Next Steps
Ready for Step 2: Seeded RNG + pickups with deterministic coin spawning!

