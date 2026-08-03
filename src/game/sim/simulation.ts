import { ARENA_SIZE, BOMB, GRAVITY_Y, PHYSICS_FIXED_DT, WALL_HEIGHT } from '../constants';
import { SimBomb } from './bomb';
import { SimEnemy, type EnemyKind } from './enemy';
import type { SimulationEvents, ExplosionOptions } from './events';
import { SimPlayer } from './player';
import type { PlayerInput, SimBody, SimEntity, SimPhysics, Vec3 } from './types';
import { WaveSystem } from './waves';

const THROW_ANGLE = 0.66;
const THROW_MIN_SPEED = 6;
const EXPLOSION_COLOR: [number, number, number] = [1, 0.627, 0.278];
const EXPLOSION_SECONDARY: [number, number, number] = [1, 0.878, 0.541];
const EXPLOSION_IMPULSE = 14;
const EXPLOSION_SHAKE = 0.45;

export class Simulation {
  readonly physics: SimPhysics;
  readonly player: SimPlayer;
  readonly enemies: SimEnemy[] = [];
  readonly bombs: SimBomb[] = [];
  readonly bodies: SimBody[] = [];
  score = 0;
  get wave(): number {
    return this.waves.wave;
  }

  private readonly waves: WaveSystem;
  private readonly events: SimulationEvents;
  private readonly random: () => number;
  private readonly toRemove = new Set<SimEntity>();
  private nextId = 1;

  constructor(physics: SimPhysics, events: SimulationEvents = {}, random: () => number = Math.random) {
    this.physics = physics;
    this.events = events;
    this.random = random;
    this.player = new SimPlayer(physics);
    this.bodies.push(this.player.body);
    this.buildArena();
    this.waves = new WaveSystem(
      {
        onSpawn: (wave, kind) => this.spawnEnemy(wave, kind),
        onWaveStart: (wave) => this.events.onWaveStart?.(wave),
        onWaveClear: (wave) => {
          this.addScore(50 + wave * 25);
          this.events.onWaveClear?.(wave);
        },
        aliveCount: () => this.enemies.length,
      },
      this.random,
    );
  }

  fixedUpdate(dt: number, input: PlayerInput) {
    this.player.fixedUpdate(dt, input);
    if (input.throwBomb) this.tryThrowBomb(input.aim);
    for (const enemy of this.enemies) enemy.fixedUpdate(dt);
    for (const bomb of this.bombs) bomb.fixedUpdate(dt);
    this.waves.fixedUpdate(dt);
    this.enforceBounds();
  }

  step() {
    this.physics.timestep = PHYSICS_FIXED_DT;
    this.physics.step();
  }

  processRemovals() {
    if (this.toRemove.size === 0) return;
    for (const entity of this.toRemove) {
      this.removeFromArray(this.enemies, entity);
      this.removeFromArray(this.bombs, entity);
      const bi = this.bodies.indexOf(entity.body);
      if (bi >= 0) this.bodies.splice(bi, 1);
      this.physics.removeBody(entity.body);
    }
    this.toRemove.clear();
  }

  private removeFromArray<T extends SimEntity>(arr: T[], entity: SimEntity) {
    const i = arr.findIndex((e) => e.id === entity.id);
    if (i >= 0) arr.splice(i, 1);
  }

  private buildArena() {
    const thickness = 1;
    const half = ARENA_SIZE / 2;
    const floorSize: Vec3 = { x: ARENA_SIZE + 2, y: 1, z: ARENA_SIZE + 2 };
    this.physics.createStaticBox(floorSize, { x: 0, y: -0.5, z: 0 });
    const walls = [
      { size: { x: ARENA_SIZE + thickness * 2, y: WALL_HEIGHT, z: thickness } as Vec3, position: { x: 0, y: WALL_HEIGHT / 2, z: -half - thickness / 2 } },
      { size: { x: ARENA_SIZE + thickness * 2, y: WALL_HEIGHT, z: thickness } as Vec3, position: { x: 0, y: WALL_HEIGHT / 2, z: half + thickness / 2 } },
      { size: { x: thickness, y: WALL_HEIGHT, z: ARENA_SIZE } as Vec3, position: { x: -half - thickness / 2, y: WALL_HEIGHT / 2, z: 0 } },
      { size: { x: thickness, y: WALL_HEIGHT, z: ARENA_SIZE } as Vec3, position: { x: half + thickness / 2, y: WALL_HEIGHT / 2, z: 0 } },
    ];
    for (const wall of walls) this.physics.createStaticBox(wall.size, wall.position);
  }

  private spawnEnemy(wave: number, kind: EnemyKind) {
    const position = this.randomSpawnPoint();
    const enemy = new SimEnemy(
      this.physics,
      this.nextId++,
      kind,
      position,
      wave,
      () => this.player.position(),
      (amount) => {
        this.player.takeDamage(amount);
        this.events.onPlayerDamaged?.(amount);
        this.knockbackOnContact(enemy);
      },
      (killed) => {
        this.events.onEnemyKilled?.(killed);
        this.addScore(killed.score);
        this.removeEntity(killed);
      },
    );
    this.enemies.push(enemy);
    this.bodies.push(enemy.body);
  }

  private randomSpawnPoint(): Vec3 {
    const half = ARENA_SIZE / 2 - 1.5;
    const p = this.player.position();
    for (;;) {
      const x = (this.random() * 2 - 1) * half;
      const z = (this.random() * 2 - 1) * half;
      if (Math.hypot(x - p.x, z - p.z) > 12) return { x, y: 1, z };
    }
  }

  private knockbackOnContact(enemy: SimEnemy) {
    const t = enemy.body.translation();
    const p = this.player.position();
    const dx = p.x - t.x;
    const dz = p.z - t.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.001) return;
    this.player.body.applyImpulse({ x: (dx / len) * 2.6, y: 1.6, z: (dz / len) * 2.6 }, true);
    enemy.body.applyImpulse({ x: (-dx / len) * 5.5, y: 2.5, z: (-dz / len) * 5.5 }, true);
  }

  private tryThrowBomb(aim: Vec3) {
    if (!this.player.alive || !this.player.consumeBomb()) return;
    const playerPos = this.player.position();

    let hx = aim.x - playerPos.x;
    let hz = aim.z - playerPos.z;
    let distance = Math.hypot(hx, hz);
    if (distance < 0.01) {
      hx = 0;
      hz = -1;
      distance = 1;
    }
    const nx = hx / distance;
    const nz = hz / distance;

    const angle = THROW_ANGLE;
    const sin2 = Math.sin(angle * 2);
    let speed = Math.sqrt((distance * -GRAVITY_Y) / sin2);
    speed = Math.max(THROW_MIN_SPEED, Math.min(BOMB.throwSpeed, speed));

    const vel = this.player.body.linvel();
    const velocity: Vec3 = {
      x: nx * speed * Math.cos(angle) + vel.x * 0.35,
      y: speed * Math.sin(angle) + vel.y * 0.35,
      z: nz * speed * Math.cos(angle) + vel.z * 0.35,
    };

    const bomb = new SimBomb(
      this.physics,
      this.nextId++,
      { x: playerPos.x, y: playerPos.y + 0.9, z: playerPos.z },
      velocity,
      this.random,
      (b, position) => {
        this.explode(position);
        this.removeEntity(b);
      },
    );
    this.bombs.push(bomb);
    this.bodies.push(bomb.body);
    this.events.onBombThrown?.();
  }

  private explode(origin: Vec3) {
    const options: ExplosionOptions = {
      radius: BOMB.radius,
      damage: BOMB.damage,
      impulse: EXPLOSION_IMPULSE,
      color: EXPLOSION_COLOR,
      secondaryColor: EXPLOSION_SECONDARY,
      shakeTrauma: EXPLOSION_SHAKE,
    };
    const radiusSq = options.radius * options.radius;

    for (const body of this.bodies) {
      const t = body.translation();
      const dx = t.x - origin.x;
      const dy = t.y - origin.y;
      const dz = t.z - origin.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq > radiusSq) continue;
      const falloff = 1 - Math.sqrt(distSq) / options.radius;
      const force = options.impulse * falloff;
      const inv = 1 / Math.max(0.001, Math.sqrt(distSq));
      body.applyImpulse({ x: dx * inv * force, y: force * 0.55, z: dz * inv * force }, true);
      body.wakeUp();
    }

    for (const target of [this.player, ...this.enemies]) {
      const t = target.body.translation();
      const dist = Math.hypot(t.x - origin.x, t.y - origin.y, t.z - origin.z);
      if (dist > options.radius) continue;
      const falloff = Math.max(0.2, 1 - dist / options.radius);
      if (!target.isPlayer) target.takeDamage(options.damage * falloff);
    }

    for (const bomb of [...this.bombs]) {
      const t = bomb.body.translation();
      const dist = Math.hypot(t.x - origin.x, t.y - origin.y, t.z - origin.z);
      if (dist <= BOMB.chainRadius) bomb.detonate();
    }

    this.events.onExplosion?.(origin, options);
  }

  private enforceBounds() {
    const limit = ARENA_SIZE / 2 - 0.6;
    for (const enemy of this.enemies) {
      const t = enemy.body.translation();
      const outX = Math.abs(t.x) > limit;
      const outZ = Math.abs(t.z) > limit;
      const fell = t.y < -5;
      if (outX || outZ || fell) enemy.takeDamage(Number.MAX_SAFE_INTEGER);
    }
    for (const bomb of this.bombs) {
      const t = bomb.body.translation();
      const outX = Math.abs(t.x) > limit;
      const outZ = Math.abs(t.z) > limit;
      const fell = t.y < -5;
      if (outX || outZ || fell) this.removeEntity(bomb);
    }
    const pt = this.player.body.translation();
    const outX = Math.abs(pt.x) > limit;
    const outZ = Math.abs(pt.z) > limit;
    const fell = pt.y < -5;
    if (outX || outZ || fell) {
      this.player.body.setTranslation({ x: 0, y: 1.2, z: 0 }, true);
      this.player.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  }

  private addScore(amount: number) {
    this.score += amount;
  }

  private removeEntity(entity: SimEntity) {
    this.toRemove.add(entity);
  }
}
