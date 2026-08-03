import * as THREE from 'three';
import { useGameStore } from '../state/gameStore';
import { Arena } from './Arena';
import { Camera } from './Camera';
import { PHYSICS_FIXED_DT } from './constants';
import { Input } from './Input';
import { Particles } from './Particles';
import { Physics } from './Physics';
import { Renderer } from './Renderer';
import { Sfx } from './Sfx';
import type { SimEnemy } from './sim/enemy';
import { Simulation } from './sim/simulation';
import type { PlayerInput } from './sim/types';
import { Views } from './views/Views';

const MAX_FRAME_TIME = 0.25;

export class Game {
  private readonly renderer: Renderer;
  private readonly physics: Physics;
  private readonly sim: Simulation;
  private readonly camera: Camera;
  private readonly arena: Arena;
  private readonly input: Input;
  private readonly sfx: Sfx;
  private readonly particles: Particles;
  private readonly views: Views;
  private readonly timer = new THREE.Timer();
  private readonly raycaster = new THREE.Raycaster();
  private readonly mouseNdc = new THREE.Vector2();
  private readonly tmpAimPoint = new THREE.Vector3();
  private readonly tmpInput: PlayerInput = {
    moveX: 0,
    moveZ: 0,
    sprint: false,
    jump: false,
    dash: false,
    throwBomb: false,
    aim: { x: 0, y: 0, z: 0 },
  };

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
    this.sim = new Simulation(this.physics, {
      onWaveStart: (wave) => this.showBanner(`Wave ${wave}`),
      onWaveClear: () => this.showBanner('Wave cleared'),
      onEnemyKilled: (enemy) => this.onEnemyKilledJuice(enemy),
      onExplosion: (origin, options) => this.onExplosionJuice(origin, options),
      onPlayerDamaged: () => {
        this.sfx.hurt();
        this.addTrauma(0.2);
        this.flash(0.15);
      },
      onBombThrown: () => this.sfx.throwBomb(),
    });
    this.camera = new Camera();
    this.arena = new Arena();
    this.input = new Input();
    this.sfx = new Sfx();
    this.particles = new Particles();
    this.views = new Views(this.renderer.scene);

    this.renderer.scene.add(this.arena.group, this.particles.points);
    this.camera.follow(new THREE.Vector3());

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

  private loop = (timestamp: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);

    this.timer.update(timestamp);
    const frameDt = Math.min(this.timer.getDelta(), MAX_FRAME_TIME);
    this.accumulator += frameDt;

    while (this.accumulator >= PHYSICS_FIXED_DT) {
      this.sim.fixedUpdate(PHYSICS_FIXED_DT, this.buildInput());
      this.sim.step();
      this.accumulator -= PHYSICS_FIXED_DT;
    }

    this.sim.processRemovals();
    this.views.sync(this.sim, frameDt);
    this.particles.update(frameDt);
    this.updateCamera(frameDt);
    this.updateJuice(frameDt);
    this.syncHud();
    this.updateFps(frameDt);

    this.renderer.render(this.camera.three);
  };

  private buildInput(): PlayerInput {
    const input = this.tmpInput;
    const axis = this.input.moveAxis();
    input.moveX = axis.x;
    input.moveZ = axis.y;
    input.sprint = this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight');
    input.jump = this.input.consumeSpace();
    input.dash = this.input.consumeRightClick();
    if (this.input.consumeLeftClick()) {
      this.sfx.resume();
      input.throwBomb = true;
    } else {
      input.throwBomb = false;
    }
    const aim = this.computeAim();
    input.aim.x = aim.x;
    input.aim.y = 0;
    input.aim.z = aim.z;
    return input;
  }

  private computeAim(): THREE.Vector3 {
    this.mouseNdc.copy(this.input.mouse);
    this.raycaster.setFromCamera(this.mouseNdc, this.camera.three);
    const target = this.tmpAimPoint;
    const p = this.sim.player.position();
    if (!this.raycaster.ray.intersectPlane(groundPlane, target)) {
      return this.forwardAim(p);
    }
    const h = new THREE.Vector3(target.x - p.x, 0, target.z - p.z);
    if (h.lengthSq() < 0.01) return this.forwardAim(p);
    return target;
  }

  private forwardAim(p: { x: number; y: number; z: number }): THREE.Vector3 {
    const fwd = new THREE.Vector3();
    this.camera.three.getWorldDirection(fwd);
    fwd.y = 0;
    if (fwd.lengthSq() < 0.001) fwd.set(0, 0, -1);
    fwd.normalize();
    return new THREE.Vector3(p.x + fwd.x, 0, p.z + fwd.z);
  }

  private onEnemyKilledJuice(enemy: SimEnemy) {
    const t = enemy.body.translation();
    this.particles.burst(
      new THREE.Vector3(t.x, t.y, t.z),
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
  }

  private onExplosionJuice(origin: { x: number; y: number; z: number }, options: { color: [number, number, number]; secondaryColor: [number, number, number]; shakeTrauma: number }) {
    const o = new THREE.Vector3(origin.x, origin.y, origin.z);
    this.particles.burst(o, 60, [options.color, options.secondaryColor], 4, 14, 0.35, 0.9, -14, 0.4, 1.3);
    this.particles.burst(o.clone().add(new THREE.Vector3(0, 0.3, 0)), 18, [[0.6, 0.62, 0.66]], 2, 8, 0.2, 0.5, 8, 0.25, 0.6);
    this.addTrauma(options.shakeTrauma);
    this.flash(0.35);
    this.sfx.explosion();
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

  private updateCamera(dt: number) {
    const p = this.sim.player.position();
    this.camera.follow(new THREE.Vector3(p.x, p.y, p.z));
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
    store.setHealth(Math.round(this.sim.player.healthValue));
    store.setBombs(this.sim.player.bombCount);
    store.setWave(this.sim.wave);
    store.setScore(this.sim.score);
    if (!this.sim.player.alive && store.phase !== 'gameover') {
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
    this.particles.dispose();
    this.physics.dispose();
  }
}

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
