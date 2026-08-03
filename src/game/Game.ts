import type { RigidBody } from '@dimforge/rapier3d';
import * as THREE from 'three';
import { useGameStore } from '../state/gameStore';
import { Arena } from './Arena';
import { Bomb } from './Bomb';
import { Camera } from './Camera';
import { BOMB, GRAVITY_Y, PHYSICS_FIXED_DT, WALL_HEIGHT, ARENA_SIZE } from './constants';
import { Enemy } from './Enemy';
import type { Damageable, Entity } from './entity';
import { ExplosionSystem } from './ExplosionSystem';
import { Input } from './Input';
import { Particles } from './Particles';
import { Physics } from './Physics';
import { Player } from './Player';
import { Renderer } from './Renderer';
import { Sfx } from './Sfx';
import { WaveSystem } from './WaveSystem';

const MAX_FRAME_TIME = 0.25;

export class Game {
  private readonly renderer: Renderer;
  private readonly physics: Physics;
  private readonly camera: Camera;
  private readonly arena: Arena;
  private readonly input: Input;
  private readonly sfx: Sfx;
  private readonly particles: Particles;
  private readonly player: Player;
  private readonly explosions: ExplosionSystem;
  private readonly waves: WaveSystem;
  private readonly timer = new THREE.Timer();
  private readonly raycaster = new THREE.Raycaster();
  private readonly mouseNdc = new THREE.Vector2();
  private readonly tmpAimPoint = new THREE.Vector3();

  private readonly entities: Entity[] = [];
  private readonly bodies: RigidBody[] = [];
  private readonly damageables: Damageable[] = [];
  private readonly bombs: Bomb[] = [];
  private readonly toRemove = new Set<Entity>();

  private accumulator = 0;
  private raf = 0;
  private fpsSmoothing = 0;
  private disposed = false;
  private trauma = 0;
  private flashAlpha = 0;
  private bannerText = '';
  private bannerTimer = 0;
  private flashEl: HTMLElement;
  private bannerEl: HTMLElement;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.physics = new Physics();
    this.camera = new Camera();
    this.arena = new Arena();
    this.input = new Input();
    this.sfx = new Sfx();
    this.particles = new Particles();
    this.player = new Player(this.physics);

    this.renderer.scene.add(this.arena.group, this.particles.points, this.player.mesh);
    this.createWalls();
    this.physics.createStaticBox(new THREE.Vector3(ARENA_SIZE + 2, 1, ARENA_SIZE + 2), new THREE.Vector3(0, -0.5, 0));

    const origin = new THREE.Vector3();
    this.camera.follow(origin);

    this.explosions = new ExplosionSystem(
      this.physics,
      this.particles,
      this.sfx,
      (t) => this.addTrauma(t),
      (a) => this.flash(a),
      this.bodies,
      this.damageables,
      this.bombs,
    );

    this.waves = new WaveSystem({
      onSpawn: (wave, kind) => this.spawnEnemy(wave, kind),
      onWaveStart: (wave) => this.showBanner(`Wave ${wave}`),
      onWaveClear: (wave) => {
        this.addScore(50 + wave * 25);
        this.showBanner('Wave cleared');
      },
      aliveCount: () => this.countAliveEnemies(),
    });

    this.registerEntity(this.player);

    const flashEl = document.getElementById('flash');
    this.flashEl = flashEl ?? this.createOverlay('flash');
    const bannerEl = document.getElementById('banner');
    this.bannerEl = bannerEl ?? this.createOverlay('banner');

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
    this.timer.connect(document);
  }

  start() {
    this.loop(performance.now());
  }

  private createOverlay(id: string): HTMLElement {
    const el = document.createElement('div');
    el.id = id;
    document.getElementById('app')?.appendChild(el);
    return el;
  }

  private registerEntity(entity: Entity) {
    this.entities.push(entity);
    this.bodies.push(entity.body);
    this.renderer.scene.add(entity.mesh);
    if (entity instanceof Player) {
      this.damageables.push(entity);
    }
    if (entity instanceof Bomb) {
      this.bombs.push(entity);
    }
    if (entity instanceof Enemy) {
      this.damageables.push(entity);
    }
  }

  private removeEntity(entity: Entity) {
    this.toRemove.add(entity);
  }

  private enforceBounds() {
    const limit = ARENA_SIZE / 2 - 0.6;
    for (const entity of this.entities) {
      const t = entity.body.translation();
      const outX = Math.abs(t.x) > limit;
      const outZ = Math.abs(t.z) > limit;
      const fell = t.y < -5;

      if (entity === this.player) {
        if (outX || outZ || fell) {
          this.player.body.setTranslation({ x: 0, y: 1.2, z: 0 }, true);
          this.player.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
      } else if (entity instanceof Enemy) {
        if (outX || outZ || fell) {
          entity.takeDamage(Number.MAX_SAFE_INTEGER);
        }
      } else if (entity instanceof Bomb) {
        if (outX || outZ || fell) {
          this.removeEntity(entity);
        }
      }
    }
  }

  private processRemovals() {
    if (this.toRemove.size === 0) return;
    for (const entity of this.toRemove) {
      const ei = this.entities.indexOf(entity);
      if (ei >= 0) this.entities.splice(ei, 1);
      const bi = this.bodies.indexOf(entity.body);
      if (bi >= 0) this.bodies.splice(bi, 1);
      this.renderer.scene.remove(entity.mesh);
      entity.dispose();
      if (entity instanceof Bomb) {
        const bbi = this.bombs.indexOf(entity);
        if (bbi >= 0) this.bombs.splice(bbi, 1);
      }
      if (entity instanceof Enemy || entity instanceof Player) {
        const di = this.damageables.indexOf(entity);
        if (di >= 0) this.damageables.splice(di, 1);
      }
    }
    this.toRemove.clear();
  }

  private spawnEnemy(wave: number, kind: 'runner' | 'tank' | 'boss') {
    const position = this.randomSpawnPoint();
    const enemy = new Enemy(
      this.physics,
      kind,
      position,
      wave,
      () => this.player.position(),
      (amount, enemy) => {
        this.player.takeDamage(amount);
        this.sfx.hurt();
        this.addTrauma(0.2);
        this.flash(0.15);
        this.knockbackOnContact(enemy);
      },
      (killed) => this.onEnemyKilled(killed),
    );
    this.registerEntity(enemy);
  }

  private randomSpawnPoint(): THREE.Vector3 {
    const half = ARENA_SIZE / 2 - 1.5;
    let x = 0;
    let z = 0;
    for (;;) {
      x = (Math.random() * 2 - 1) * half;
      z = (Math.random() * 2 - 1) * half;
      const p = this.player.position();
      if (Math.hypot(x - p.x, z - p.z) > 12) break;
    }
    return new THREE.Vector3(x, 1, z);
  }

  private knockbackOnContact(enemy: Enemy) {
    const t = enemy.body.translation();
    const p = this.player.position();
    const dir = new THREE.Vector3(p.x - t.x, 0, p.z - t.z);
    const len = dir.length();
    if (len < 0.001) return;
    dir.divideScalar(len);
    this.player.body.applyImpulse({ x: dir.x * 2.6, y: 1.6, z: dir.z * 2.6 }, true);
    enemy.body.applyImpulse({ x: -dir.x * 5.5, y: 2.5, z: -dir.z * 5.5 }, true);
  }

  private onEnemyKilled(enemy: Enemy) {
    const t = enemy.body.translation();
    const origin = new THREE.Vector3(t.x, t.y, t.z);
    this.particles.burst(
      origin,
      enemy.kind === 'boss' ? 40 : 14,
      [[0.3, 0.9, 0.4], [0.9, 0.95, 0.4]],
      2,
      7,
      0.2,
      0.5,
      -8,
      0.2,
      0.6,
    );
    this.sfx.kill();
    this.addScore(enemy.score);
    this.removeEntity(enemy);
  }

  private countAliveEnemies(): number {
    let count = 0;
    for (const e of this.entities) {
      if (e instanceof Enemy) count += 1;
    }
    return count;
  }

  private addScore(amount: number) {
    useGameStore.getState().addScore(amount);
  }

  private addTrauma(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  private flash(alpha: number) {
    this.flashAlpha = Math.max(this.flashAlpha, alpha);
  }

  private showBanner(text: string) {
    this.bannerText = text;
    this.bannerTimer = 1.4;
  }

  private tryThrowBomb() {
    if (!this.player.alive || !this.player.consumeBomb()) return;
    const playerPos = this.player.position();
    this.mouseNdc.copy(this.input.mouse);
    this.raycaster.setFromCamera(this.mouseNdc, this.camera.three);
    const target = this.tmpAimPoint;
    this.raycaster.ray.intersectPlane(groundPlane, target);

    const horizontal = new THREE.Vector3(target.x - playerPos.x, 0, target.z - playerPos.z);
    if (horizontal.lengthSq() < 0.01) {
      horizontal.setFromMatrixColumn(this.camera.three.matrixWorld, 2);
      horizontal.y = 0;
    }
    const distance = horizontal.length();
    horizontal.normalize();

    const angle = THROW_ANGLE;
    const sin2 = Math.sin(angle * 2);
    let speed = Math.sqrt((distance * -GRAVITY_Y) / sin2);
    speed = Math.max(THROW_MIN_SPEED, Math.min(BOMB.throwSpeed, speed));

    const velocity = new THREE.Vector3(
      horizontal.x * speed * Math.cos(angle),
      speed * Math.sin(angle),
      horizontal.z * speed * Math.cos(angle),
    ).addScaledVector(this.player.body.linvel(), 0.35);

    const bomb = new Bomb(this.physics, playerPos.clone().add(new THREE.Vector3(0, 0.9, 0)), velocity, (b, position) => {
      this.explosions.explode(position, {
        radius: BOMB.radius,
        damage: BOMB.damage,
        impulse: 14,
        color: EXPLOSION_COLOR,
        secondaryColor: EXPLOSION_SECONDARY,
        shakeTrauma: 0.45,
      });
      this.removeEntity(b);
    });
    this.registerEntity(bomb);
    this.sfx.throwBomb();
  }

  private createWalls() {
    const half = ARENA_SIZE / 2;
    const thickness = 1;
    const walls = [
      { size: new THREE.Vector3(ARENA_SIZE + thickness * 2, WALL_HEIGHT, thickness), position: new THREE.Vector3(0, WALL_HEIGHT / 2, -half - thickness / 2) },
      { size: new THREE.Vector3(ARENA_SIZE + thickness * 2, WALL_HEIGHT, thickness), position: new THREE.Vector3(0, WALL_HEIGHT / 2, half + thickness / 2) },
      { size: new THREE.Vector3(thickness, WALL_HEIGHT, ARENA_SIZE), position: new THREE.Vector3(-half - thickness / 2, WALL_HEIGHT / 2, 0) },
      { size: new THREE.Vector3(thickness, WALL_HEIGHT, ARENA_SIZE), position: new THREE.Vector3(half + thickness / 2, WALL_HEIGHT / 2, 0) },
    ];
    for (const wall of walls) {
      this.physics.createStaticBox(wall.size, wall.position);
    }
  }

  private loop = (timestamp: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);

    this.timer.update(timestamp);
    const frameDt = Math.min(this.timer.getDelta(), MAX_FRAME_TIME);
    this.accumulator += frameDt;

    while (this.accumulator >= PHYSICS_FIXED_DT) {
      const dt = PHYSICS_FIXED_DT;
      this.player.fixedUpdate(dt, this.input);
      this.tryThrowBombIfClicked();
      for (const entity of this.entities) entity.fixedUpdate(dt, this.input);
      this.waves.fixedUpdate(dt);
      this.physics.step();
      this.enforceBounds();
      this.accumulator -= dt;
    }

    this.processRemovals();
    this.updateCamera(frameDt);
    this.updateJuice(frameDt);
    for (const entity of this.entities) entity.syncVisual();
    this.particles.update(frameDt);
    this.syncHud();
    this.updateFps(frameDt);

    this.renderer.render(this.camera.three);
  };

  private tryThrowBombIfClicked() {
    if (this.input.consumeLeftClick()) {
      this.sfx.resume();
      this.tryThrowBomb();
    }
  }

  private updateCamera(dt: number) {
    this.camera.follow(this.player.position());
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.camera.shake = this.trauma;
    this.camera.update(dt);
  }

  private updateJuice(dt: number) {
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.2);
      this.flashEl.style.opacity = this.flashAlpha.toFixed(2);
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      this.bannerEl.textContent = this.bannerText;
      this.bannerEl.style.opacity = Math.min(1, this.bannerTimer * 3).toFixed(2);
    } else {
      this.bannerEl.style.opacity = '0';
    }
  }

  private syncHud() {
    const store = useGameStore.getState();
    store.setHealth(Math.round(this.player.healthValue));
    store.setBombs(this.player.bombCount);
    store.setWave(this.waves.wave);
    if (!this.player.alive && store.phase !== 'gameover') {
      store.setPhase('gameover');
      this.showBanner('Game Over');
    }
  }

  private updateFps(dt: number) {
    this.fpsSmoothing += (1 / dt - this.fpsSmoothing) * 0.05;
    if (!Number.isFinite(this.fpsSmoothing)) this.fpsSmoothing = 0;
    const { setFps } = useGameStore.getState();
    setFps(Math.round(this.fpsSmoothing));
  }

  private handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.camera.setAspect(width / height);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.handleResize);
    this.timer.disconnect();
    this.input.dispose();
    this.renderer.dispose();
    this.physics.dispose();
    this.particles.dispose();
  }
}

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const THROW_ANGLE = 0.66;
const THROW_MIN_SPEED = 6;
const EXPLOSION_COLOR = new THREE.Color(0xffa047);
const EXPLOSION_SECONDARY = new THREE.Color(0xffe08a);
