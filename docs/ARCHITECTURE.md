# Wombat Quest - Architecture

## Overview
A browser-based game built in small, shippable chunks with a focus on visible progress, scalable structure, and maintainable code.

## Core Principles
1. **Visible Progress**: Every step produces a working demo
2. **Scalable Structure**: Modular design with clear boundaries
3. **No Giant Files**: Files ≤ 300 lines, functions ≤ 60 lines

## Folder Structure
```
/app               # Boot + wiring only
/modules/<domain>  # Self-contained logic; each has index.ts (public API)
/shared            # Types, constants, utilities, tiny "ports"
/ui/<adapter>      # Canvas/DOM adapters; consume events, don't mutate game state
/tests             # Unit/integration tests
/docs              # Documentation
```

## Architecture Rules
1. **Barrel Imports Only**: Only import from module barrels (index.ts). No deep imports.
2. **No Globals**: Time, randomness, storage, audio all come via tiny interfaces in /shared/ports.
3. **Size Limits**: Keep files ≤ 300 lines, functions ≤ 60 lines.
4. **Working Demos**: Every chunk ends with a working demo page and one minimal test.
5. **Documentation**: Document new exports in /docs/CODEMAP.md.

## Ports & Adapters Pattern
The game uses a ports & adapters pattern where:
- **Ports** (in /shared/ports): Define interfaces for external concerns (Clock, Rng, Storage, Audio)
- **Adapters** (in /ui/): Implement these interfaces for specific technologies (canvas, DOM, localStorage)

## Technology Stack
- **Language**: TypeScript + Vite
- **No Frameworks**: For core game loop; UI adapters added later
- **Testing**: Vitest for unit tests
- **Linting**: ESLint with custom rules for architecture enforcement

## Development Workflow
1. Create types and interfaces first
2. Implement pure logic with tests
3. Create UI adapters
4. Wire everything in /app
5. Create working demo
6. Document exports

## Definition of Done (per chunk)
- [ ] Public types declared and exported only via barrels
- [ ] One visible demo (index.html) that shows the new feature
- [ ] Unit test(s) for the pure logic
- [ ] Lint + typecheck clean

