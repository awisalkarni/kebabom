# kebaboom

**Version:** 1.0
**Status:** Draft
**Genre:** Arcade Action • Arena Survival • Physics-Based • Roguelite
**Platform:** Web (Desktop first), Mobile later
**Engine:** Three.js + Rapier Physics

---

# Vision

kebaboom is a fast-paced arena survival game where players defeat endless enemy waves using bombs, environmental hazards, physics, and strategic movement.

The game emphasizes satisfying explosions, ragdoll-like knockback, chain reactions, and replayability rather than realistic combat.

A typical session lasts between **10 and 30 minutes**, encouraging "one more run" gameplay.

---

# Design Pillars

## 1. Explosions Feel Powerful

Every explosion should:

* Push enemies away
* Launch debris
* Shake the camera
* Produce satisfying particles
* Create chain reactions

The player should immediately feel the impact of every bomb.

---

## 2. Easy to Learn

Controls should be understandable within one minute.

Movement:

* WASD

Aim:

* Mouse

Actions:

* Throw Bomb
* Dash
* Jump
* Use Ability

---

## 3. Physics First

Every object should interact naturally.

Examples:

* Explosions knock enemies into walls.
* Enemies collide with each other.
* Bombs bounce realistically.
* Environmental hazards react to explosions.

Physics is a core gameplay mechanic, not just visual polish.

---

## 4. Short, Addictive Runs

Players should be able to:

* Start instantly
* Survive as long as possible
* Beat their high score
* Unlock permanent upgrades

---

# Core Gameplay Loop

1. Spawn into arena
2. Survive enemy wave
3. Collect rewards
4. Upgrade abilities
5. Next wave begins
6. Boss every fifth wave
7. Die
8. Receive score
9. Unlock progression
10. Start another run

---

# Controls

Desktop

Movement:

* W A S D

Aim:

* Mouse

Actions:

Left Click

* Throw bomb

Right Click

* Dash

Space

* Jump

Shift

* Sprint

E

* Special Ability

---

# Camera

* Isometric 3D
* Slight rotation
* Smooth follow
* Dynamic zoom
* Camera shake
* Screen flash
* Hit stop during explosions

---

# Player

Stats

* Health
* Speed
* Bomb Capacity
* Throw Distance
* Blast Radius
* Bomb Damage
* Critical Chance
* Cooldown Reduction

Starting equipment

* 3 bombs
* Normal bomb
* Dash
* Jump

---

# Bomb Types

## Standard

3-second fuse.

Balanced damage.

---

## Sticky

Attaches to enemies.

---

## Mine

Explodes when enemies approach.

---

## Cluster

Splits into multiple mini bombs.

---

## Ice

Freezes enemies.

---

## Fire

Creates burning ground.

---

## EMP

Disables robotic enemies.

---

## Gravity Bomb

Pulls enemies together before exploding.

---

# Enemy Types

Runner

* Fast
* Low HP

Tank

* Slow
* High HP

Bomber

* Throws explosives

Shooter

* Long-range attacks

Jumper

* Leaps toward player

Shield

* Blocks frontal damage

Suicide

* Explodes on death

Elite variants

* Increased speed
* Increased health
* Special modifiers

Bosses

* Giant Tank
* Spider Mech
* Pyromancer
* Bomb King
* Shock Titan

---

# Arenas

## Industrial Yard

Explosive barrels

---

## Frozen Research Lab

Slippery floor

---

## Volcano Core

Lava pools

---

## Jungle Temple

Moving traps

---

## Desert Ruins

Sandstorms

---

## Space Station

Low gravity

---

# Interactive Objects

* Explosive barrels
* Crates
* Oil puddles
* Ice patches
* Laser traps
* Bounce pads
* Conveyor belts
* Rotating hazards

---

# Wave System

Each wave increases:

* Enemy count
* Enemy health
* Enemy speed
* Spawn frequency

Every five waves:

Boss encounter

Every ten waves:

Random arena modifier

Examples

* Double enemy speed
* Explosive enemies
* Low gravity
* Fog
* Fire rain

---

# Roguelite Upgrades

After each wave, choose one of three random upgrades.

Examples

+20% Bomb Damage

+1 Bomb Capacity

Fire Trail

Chain Explosion

Faster Dash

Critical Bombs

Healing Explosion

Double Jump

Lucky Drops

Magnetic Pickup Radius

---

# Progression

Permanent currency:

Fusion Cores

Unlockables

* Bomb skins
* Characters
* Arenas
* Starting abilities
* Music
* Emotes
* Visual effects

No pay-to-win mechanics.

---

# Game Modes

## Onslaught

Infinite survival.

Primary mode.

---

## Daily Challenge

Same seed for everyone.

Leaderboard enabled.

---

## Endless+

Unlocked after completing Wave 30.

Harder enemies.

Exclusive rewards.

---

# Scoring

Points awarded for:

Enemy kills

Combo chains

Boss defeats

No-damage waves

Fast wave clears

Environmental kills

Highest wave reached

Longest survival

---

# Audio

Explosion layering

Enemy voices

Dynamic music

Increasing intensity

Positional audio

Controller vibration support

---

# Visual Style

Low-poly

Stylized

Bright colors

Toon lighting

Bloom

Soft shadows

Minimal UI

Large readable effects

---

# Technical Stack

Rendering

* Three.js

Physics

* Rapier

Audio

* Howler.js

State

* Zustand

Animation

* Tween.js

Particles

* Three.js GPU particles

Build

* Vite

Language

* TypeScript

Networking (future)

* Colyseus

Backend

* Laravel API

Database

* PostgreSQL

Authentication

* Laravel Sanctum

Storage

* S3-compatible object storage

Deployment

* Docker

* Cloudflare CDN

---

# Future Roadmap

Version 1.0

* Single-player
* Three arenas
* Six enemy types
* Six bomb types
* Three bosses
* Progression
* Achievements

Version 1.5

* Four-player online co-op
* Matchmaking
* Cosmetics
* Seasonal events

Version 2.0

* Guilds
* User-generated arenas
* Community challenges
* Ranked co-op
* Steam release

---

# Success Metrics

Day-1 retention > 40%

Average session > 18 minutes

Average wave reached > 14

Crash rate < 0.5%

60 FPS on mid-range hardware

90+ Lighthouse Performance score for the web client

---

# Unique Selling Points

* Physics-driven combat where explosions create emergent gameplay rather than scripted effects.
* Roguelite upgrades make every run feel different.
* Fast, accessible controls with satisfying visual and audio feedback.
* Built for the web with instant play—no installation required.
* Designed from day one to evolve into online cooperative survival.
