import assert from 'node:assert';
import { NodePhysics } from '../src/server/nodePhysics';
import { Simulation } from '../src/game/sim/simulation';
import type { PlayerInput } from '../src/game/sim/types';

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const noInput: PlayerInput = {
  moveX: 0,
  moveZ: 0,
  sprint: false,
  jump: false,
  dash: false,
  throwBomb: false,
  aim: { x: 0, y: 0, z: 0 },
};

const DT = 1 / 60;

function tick(sim: Simulation, n: number, input: PlayerInput = noInput) {
  for (let i = 0; i < n; i++) {
    sim.fixedUpdate(DT, input);
    sim.step();
    sim.processRemovals();
  }
}

function throwAtPlayer(sim: Simulation): PlayerInput {
  const p = sim.player.position();
  return { ...noInput, throwBomb: true, aim: { x: p.x + 0.5, y: 0, z: p.z } };
}

const physics = await NodePhysics.create();
const events = { enemyKills: 0, explosions: 0, bombsThrown: 0, waveStarts: 0 };
const sim = new Simulation(
  physics,
  {
    onEnemyKilled: () => {
      events.enemyKills += 1;
    },
    onExplosion: () => {
      events.explosions += 1;
    },
    onBombThrown: () => {
      events.bombsThrown += 1;
    },
    onWaveStart: () => {
      events.waveStarts += 1;
    },
  },
  lcg(42),
);

// 1. Fuse: throw a bomb at t=0, it should arc, sit, and explode on its own.
tick(sim, 1, throwAtPlayer(sim));
assert.strictEqual(sim.bombs.length, 1, 'one bomb thrown');
assert.strictEqual(events.bombsThrown, 1, 'bomb thrown event fired');
tick(sim, Math.ceil(3.5 * 60));
assert.strictEqual(sim.bombs.length, 0, 'bomb should explode on fuse expiry');
assert.ok(events.explosions >= 1, 'explosion event fired');

// 2. Idle until enemies make contact (spawns start ~1.5s, travel takes seconds).
let hpAfterContact: number | null = null;
for (let i = 0; i < 20 * 60; i++) {
  tick(sim, 1);
  if (sim.player.healthValue < 100) {
    hpAfterContact = sim.player.healthValue;
    break;
  }
}
assert.ok(hpAfterContact !== null, 'player should take contact damage once enemies arrive');
assert.ok(hpAfterContact < 100 && hpAfterContact > 0, `contact damage reduced hp to ${hpAfterContact}`);
assert.ok(sim.wave >= 1, 'wave should have started');

// 3. Kill: with enemies swarming the player, detonate a bomb when one is in lethal range.
const scoreBefore = sim.score;
const killsBefore = events.enemyKills;
let killsObserved = false;
let guard = 0;
while (!killsObserved && guard++ < 60) {
  const hadBomb = sim.bombs.length > 0;
  if (!hadBomb) tick(sim, 1, throwAtPlayer(sim));
  if (sim.bombs.length === 0) continue;
  for (let i = 0; i < 6 * 60 && !killsObserved && sim.bombs.length > 0; i++) {
    tick(sim, 1);
    for (const bomb of [...sim.bombs]) {
      const bt = bomb.body.translation();
      const close = sim.enemies.some((e) => {
        const et = e.body.translation();
        return Math.hypot(et.x - bt.x, et.z - bt.z) <= 1.6;
      });
      if (close) bomb.detonate();
    }
    killsObserved = events.enemyKills > killsBefore;
  }
}
assert.ok(killsObserved, 'blast should kill at least one enemy when one is in range');
assert.ok(sim.score > scoreBefore, 'score increases from kills/wave clear');
assert.ok(events.waveStarts >= 1, 'wave start event fired');

console.log(
  JSON.stringify({
    wave: sim.wave,
    score: sim.score,
    enemyKills: events.enemyKills,
    explosions: events.explosions,
    hpAfterContact,
  }),
);

physics.dispose();
console.log('SIM HEADLESS OK');
