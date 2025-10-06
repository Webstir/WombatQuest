# Code Map

This document tracks all public exports from each module to maintain clear API boundaries.

## Module Exports

| Module | Public Exports | Description | Added |
|--------|----------------|-------------|-------|
| modules/core | Vec2, PlayerStats, Player, GameState, Direction, MovementInput, DrugType, DrugEffect, PlayerDrugs, createVec2, addVec2, scaleVec2, getDirectionVector, calculateMovement, clampToBounds, distance, circlesOverlap, pointInCircle, playerOverlapsCoin, applyStatEffect, clampValue, isStatsAtMax, isStatsAtMin, getStatPercentage, DEFAULT_STAT_BOUNDS, StatEffect, StatBounds, createDrugEffect, applyDrugEffect, updateDrugEffects, addDrugEffect, calculateTimeScale, getActiveDrugEffects, DRUG_DEFINITIONS | Basic game types, movement logic, collision detection, stats system, and drug effects | Step 1-3, 9 |
| modules/world | Coin, WorldState, SpawnConfig, generateCoinId, isTooCloseToPlayer, isTooCloseToCoins, generateRandomPosition, spawnCoins | Entity spawning and world state management | Step 2 |
| modules/actions | StatDelta, ActionResult, PickupAction, RestAction, createCoinPickupDelta, createRestDelta, applyStatDelta, pickCoin, rest | Player actions and their effects | Step 2 |
| modules/spatial | SpatialEntity, GridCell, SpatialIndex, QueryResult, createSpatialIndex, worldToGrid, isValidGridCell, addEntity, removeEntity, updateEntity, queryRadius, queryRect, clearIndex, getEntityCount | Spatial indexing and culling system | Step 5 |
| modules/camera | Viewport, Camera, CameraConfig, createCamera, updateViewport, worldToScreen, screenToWorld, isWorldPositionVisible, isWorldRectVisible, setCameraPosition, followTarget, setCameraZoom, getVisibleWorldBounds, centerOnPosition, fitToWorldRect | Camera system with viewport management and coordinate transforms | Step 6 |
| modules/worlds | WorldConfig, WorldBoundary, WorldState, WorldItem, WorldNPC, WorldEvent, WorldTransition, WorldManagerState, WorldManager, WorldStateManager, worldRegistry, getWorld, getAllWorldIds, hasWorld, registerWorld | World management system with boundary transitions and per-world persistence | Step 8 |
| shared/ports | Clock, Rng, Storage, AudioPort, SoundEffect | Interface definitions for external concerns | Step 1-7 |
| shared/adapters | BrowserClock, SeededRng, LocalStorage, InMemoryStorage, WebAudio | Concrete implementations of ports | Step 1-7 |
| ui/canvas | renderHellStationAndCans | Canvas rendering for station and items | Step 10 |
| src/modules/world | EntityId, GasCan, HellStation, Player, ArtCar, GASCAN_SPAWN_INTERVAL_MS, GASCAN_MAX_AT_STATION, PICKUP_RANGE, FUEL_MAX, FUEL_CONSUMPTION_PER_SEC, FUEL_LOW_THRESHOLD, FUEL_REFILL_AMOUNT, KARMA_FOR_DELIVERY, MOUNT_RANGE, randomPointInAabb, createGasCan, tickHellStation | Hell Station + Art Car types/config | Step 10-11 |
| src/modules/actions | tryPickupGasCan | Player actions: pickup gas can | Step 10 |
| src/modules/actions/fuel | consumeFuel, deliverGasToArtCar | Art car fuel consumption and delivery | Step 11 |
| src/modules/entities | createArtCar, tickArtCarKinematics | Art car entity factory and kinematics | Step 11 |
| src/ui/canvas | renderHellStationAndCans, renderArtCars | Canvas rendering for items and art cars | Step 10-11 |
| app | App, GameLoop, AppConfig, GameConfig | Application boot and wiring with audio, world management, and enhanced stats integration | Step 1-9 |

## Notes
- Only exports listed here should be imported by other modules
- All imports must go through module barrels (index.ts files)
- No deep imports allowed
