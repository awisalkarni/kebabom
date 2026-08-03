# AGENTS.md

## Project

kebaboom — an arcade arena-survival roguelite built for the web. Physics-driven bomb combat, satisfying explosions, and short addictive runs.

See [docs/prd.md](docs/prd.md) for the full product requirements.

## Stack

- TypeScript + Vite
- Three.js (rendering)
- Rapier (physics)
- Howler.js (audio)
- Zustand (state)
- Tween.js (animation)
- Three.js GPU particles

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck + production build
- `npm run preview` — preview the production build
- `npm run typecheck` — run `tsc --noEmit`
- `npm test` — run the headless simulation test (`tsx tests/sim-headless.ts`)

## Conventions

- TypeScript strict mode (verbatim module syntax, no unused locals)
- Low-poly stylized visuals, bright colors, toon lighting, ACES tone mapping
- Fixed-timestep physics (60 Hz accumulator) decoupled from render loop
- Three.js r185: use `THREE.Timer` (not `Clock`) and `PCFShadowMap` (not `PCFSoftShadowMap`)
- Zustand stores use the vanilla entrypoint (`zustand/vanilla`) — no React
- No comments unless they explain non-obvious intent

## Architecture

The simulation is split from rendering so the same game logic runs headless in Node (the multiplayer server) and in the browser.

- `src/game/sim/` — headless, THREE-free simulation (no DOM, no audio, runs in Node)
  - `simulation.ts` — `Simulation`: owns physics world, player/enemies/bombs, waves, score, bounds, bomb throw + explosion logic; emits events (wave start/clear, enemy killed, explosion, player damaged, bomb thrown)
  - `player.ts` / `enemy.ts` / `bomb.ts` — `SimPlayer` / `SimEnemy` / `SimBomb`: rapier bodies + game state, driven by `PlayerInput`; no meshes
  - `waves.ts` — escalating waves, boss every 5th, spawn queue (injectable RNG for reproducibility)
  - `types.ts` — `Vec3` / `PlayerInput` / `SimPhysics` / `SimBody` interfaces (physics is dependency-injected)
  - `events.ts` — `SimulationEvents` + `ExplosionOptions`
- `src/game/Physics.ts` — client `SimPhysics` adapter over `@dimforge/rapier3d`
- `src/server/nodePhysics.ts` — Node `SimPhysics` adapter over `@dimforge/rapier3d-compat` (`await NodePhysics.create()`)
- `src/game/views/` — THREE meshes reconciled to sim entities by id (`PlayerView` / `EnemyView` / `BombView` / `Views`)
- `src/game/Game.ts` — client orchestrator: builds `PlayerInput` from keyboard/mouse, runs the fixed-step sim loop, syncs views/HUD/juice
- `src/game/Particles.ts` — additive shader particle pool (client-only)
- `src/game/Input.ts`, `Sfx.ts` (WebAudio), `Camera.ts`, `Arena.ts`, `Renderer.ts` — client-only
- `src/state/gameStore.ts` — HUD state (hp/wave/score/bombs); DOM in `src/main.ts` subscribes

## Controls (desktop)

- WASD move · Shift sprint · Space jump
- Left click throw bomb · Right click dash
- Mouse aims (bomb lands at the ground point under the cursor)

