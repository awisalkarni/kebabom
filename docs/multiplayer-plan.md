# kebabom — Multiplayer Plan

**Status:** Confirmed (2026-08-03)
**Target:** 4-player online co-op (PRD v1.5), Daily Challenge leaderboards
**Stack decision from PRD:** Colyseus (networking), Laravel API + PostgreSQL (auth/progression), S3 (cosmetics)
**Locked decisions:** 4 max players · dedicated rooms (no peer host migration) · server-authoritative

---

## 1. Goal

Add online co-op where up to 4 players share one arena, fight the same waves, and see each other in real time — without breaking the existing single-player game.

Out of scope for v1 (this plan): ranked matchmaking, guilds, UGC arenas, Steam.

---

## 2. Authority Model — Decision

| Option | Tradeoff |
|---|---|
| **Server-authoritative** (Colyseus + Rapier on Node) | **Recommended.** One source of truth, cheat-resistant, no determinism requirements across clients. Rapier runs headless on Node — same code as the browser build. |
| Deterministic lockstep | No server sim cost, but requires bit-exact determinism (hard with Rapier float math + JS engines) and an all-pause "everyone waits" model. Rejected. |
| Client-authoritative relay | Cheapest, but cheatable and needs client reconciliation for everything. Rejected for score/leaderboard integrity. |

**Decision: server-authoritative.** The server owns the Rapier world, entities, waves, and scoring. Clients are thin: send inputs, render state.

---

## 3. Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Client (browser)                                          │
│  Three.js renderer  +  NetClient  +  Input/Camera          │
│    │ inputs @ ~30Hz             ▲ snapshots @ ~20Hz        │
└────┼────────────────────────────┼──────────────────────────┘
     ▼                            │
┌────────────────────────────────────────────────────────────┐
│  Colyseus room "arena" (Node)                              │
│  Simulation = Rapier world + entities + waves + scoring    │
│  Fixed-step 60Hz accumulator  →  serializable state        │
└───────────┬───────────────────────────────┬────────────────┘
            │ HTTP/JSON                     │ WS/WSS
            ▼                               ▼
┌───────────────────────┐        ┌──────────────────────────┐
│ Laravel API (Sanctum) │        │ Postgres                 │
│ auth / matchmaking /  │        │ users, cores, cosmetics, │
│ leaderboard / lobby   │        │ daily seeds, scores      │
└───────────────────────┘        └──────────────────────────┘
```

- **Shared simulation package** (`simulation/`): pure game logic, zero Three.js.
- **Server package** (`server/`): Colyseus + Rapier, runs `simulation`.
- **Client**: existing renderer consumes state from `NetClient` instead of owning the sim.

---

## 4. Prerequisite Refactor — Split Simulation from Rendering

Today `Game.ts` couples physics, entities, and Three.js. Netcode requires a headless sim. This refactor is the biggest chunk of work and must ship with the single-player game still fully working.

1. Extract a `Simulation` class owning: Rapier world, Player/Enemy/Bomb/Explosion/Wave systems, fixed-step accumulator, bounds enforcement, scoring.
2. Entities become plain data (`id`, `kind`, `x/y/z`, `rot`, `hp`) + update systems. No `THREE.Object3D` inside.
3. `Game.ts` becomes: `Simulation` + `Renderer` + `Input` + `Camera` + HUD sync.
4. Seed the RNG (wave composition, spawn points) for reproducible Daily Challenge worlds.
5. Feature-flag / verify: single-player behavior unchanged (existing playtests stay green).

---

## 5. Networking Protocol (Colyseus)

### Client → Server (inputs, ~30Hz)
```
{ seq, moveX, moveZ, sprint, jump, dash, aimX, aimZ, throw }
```
One input per player; the server applies it to that player's body each fixed tick. No client-side physics state is trusted.

### Server → Client (snapshot, ~20Hz)
```
players:  [{ id, x, y, z, rot, hp, bombs, dashCd, alive }]
enemies:  [{ id, kind, x, y, z, hp }]
bombs:    [{ id, x, y, z, fuse }]
events:   [{ type: explode|kill|wave|damage, ... }]   // deltas since last snapshot
state:    { wave, score, phase }
```
Entity IDs enable delta encoding (only changed fields per snapshot) to keep bandwidth low. Events drive client-side juice (particles, shake, flash) so explosions feel local even though the outcome is authoritative.

---

## 6. Client Prediction & Interpolation

- **Own player:** predict movement locally (reuse SP movement code), reconcile to server snapshots on divergence. Keeps controls responsive at ~80ms ping.
- **Other players & enemies:** buffer snapshots (~100ms) and interpolate — smooth without 60Hz sync.
- **Explosions/juice:** spawned locally from snapshot `events`; HP/kills always reconciled to authoritative state.

---

## 7. Co-op Gameplay Design

- **Room:** host-and-play or quick match, up to 4 players. Room id for friend invites.
- **Shared state:** one arena, one wave counter, one enemy population, one wave banner. Enemy targeting: nearest living player (tie-break by threat score).
- **Per-player state:** HP, bombs, dash, score, alive flag.
- **Death & revive:** dead players spectate; revive by a teammate standing near the corpse for ~2s, or auto-respawn next wave. No shared HP pool (keeps each player accountable).
- **Boss scaling:** boss HP ×(0.75 + 0.25×players) so co-op isn't trivially easier.
- **Daily Challenge:** fixed seed for the day, shared by all rooms; score submitted to Laravel leaderboard (validated server-side).
- **Persistence:** Fusion Cores + cosmetics unlocked via Laravel; synced to profile, applied per-room as pure cosmetics.

---

## 8. Milestones

| # | Milestone | Deliverable | Exit criterion |
|---|---|---|---|
| M1 | Headless refactor | `simulation/` package extracted; SP unchanged | SP playtests pass; sim runs in Node |
| M2 | Shared room proof | 2 clients join a Colyseus room, move, see each other | Real-time mirrored movement, no server errors |
| M3 | Full co-op sync | Bombs, explosions, enemies, waves, damage, revive, boss scaling | 2–4 clients complete waves together |
| M4 | Lobby + social | Lobby, matchmaking, invites, Daily Challenge, leaderboards | End-to-end via Laravel |
| M5 | Polish + scale | Reconnection, spectator, cosmetics, idle-room timeout, region | 100+ concurrent rooms stable |

---

## 9. Server & Deployment

- **Process:** one Colyseus Node process, Dockerized. Multiple processes behind nginx if needed (Colyseus preset for horizontal scaling).
- **Traffic:** nginx proxy `/socket.io`/ws → Colyseus port (default 2567), TLS via certbot/Cloudflare on a subdomain (e.g., `ws.kebabom.awislabs.com`).
- **Existing server:** deploy alongside current nginx site; same box for MVP.
- **Laravel:** separate service (API + Postgres) for auth/leaderboard; Colyseus talks to it via HTTP.

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Refactor breaks single-player | Ship M1 with SP tests green; keep render path intact |
| Latency feels bad at high ping | Prediction + interpolation + server 20Hz snapshots |
| Snapshot bandwidth grows | Delta encoding + entity ID reuse + co-located/global rooms |
| Cheating on leaderboards | Server-authoritative scoring + server-side validation of Daily scores |
| Determinism drift | Not needed — server owns the sim |
| Server cost | Idle-room timeout, shared arena rooms, region consolidation |

---

## 11. Confirmed Decisions

1. **Max players: 4** (confirmed)
2. **Matchmaking:** rank-agnostic quick play first, ranked later (PRD v2)
3. **Room hosting: dedicated rooms** (no peer host migration) — confirmed
4. Daily Challenge leaderboard per mode: TBD (Onslaught and Endless+ share it?)
5. MVP server region: current SEA box; revisit if latency for other regions is an issue
