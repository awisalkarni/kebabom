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

## Conventions

- TypeScript strict mode (verbatim module syntax, no unused locals)
- Low-poly stylized visuals, bright colors, toon lighting, ACES tone mapping
- Fixed-timestep physics (60 Hz accumulator) decoupled from render loop
- Three.js r185: use `THREE.Timer` (not `Clock`) and `PCFShadowMap` (not `PCFSoftShadowMap`)
- Zustand stores use the vanilla entrypoint (`zustand/vanilla`) — no React
- No comments unless they explain non-obvious intent

## Architecture

- `src/game/Game.ts` — orchestrator: owns physics/entities, fixed-step loop, explosion + wave wiring, HUD sync, bounds enforcement
- `src/game/Player.ts`, `Enemy.ts`, `Bomb.ts` — entities implementing `Entity` (fixedUpdate/syncVisual/dispose); Player and Enemy also implement `Damageable`
- `src/game/Physics.ts` — Rapier world wrapper (static boxes, step)
- `src/game/ExplosionSystem.ts` — AOE damage + impulse + chain detonation + juice
- `src/game/WaveSystem.ts` — escalating waves, boss every 5th, spawn queue
- `src/game/Particles.ts` — additive shader particle pool
- `src/game/Input.ts`, `Sfx.ts` (WebAudio), `Camera.ts`, `Arena.ts`, `Renderer.ts`
- `src/state/gameStore.ts` — HUD state (hp/wave/score/bombs); DOM in `src/main.ts` subscribes

## Controls (desktop)

- WASD move · Shift sprint · Space jump
- Left click throw bomb · Right click dash
- Mouse aims (bomb lands at the ground point under the cursor)

