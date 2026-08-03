import { PLAYER } from '../constants';
import type { PlayerInput, SimBody, SimPhysics, Vec3 } from './types';

export class SimPlayer {
  readonly id = 0;
  readonly isPlayer = true;
  readonly body: SimBody;
  health = PLAYER.health;
  bombs = PLAYER.bombCapacity;
  hitFlash = 0;
  private readonly dashBoost: Vec3 = { x: 0, y: 0, z: 0 };
  private bombRegenTimer = PLAYER.bombRegenTime;
  private dashTimer = 0;
  private dashCooldown = 0;
  private dead = false;

  constructor(private readonly physics: SimPhysics) {
    this.body = physics.createBody({
      translation: { x: 0, y: 1.2, z: 0 },
      lockRotations: true,
      ccd: true,
      collider: { kind: 'capsule', radius: PLAYER.radius, halfHeight: PLAYER.halfHeight },
    });
  }

  get alive(): boolean {
    return !this.dead;
  }

  get bodyHandle(): number {
    return this.body.handle;
  }

  position(): Vec3 {
    return this.body.translation();
  }

  fixedUpdate(dt: number, input: PlayerInput) {
    if (this.dead) return;

    const axisLen = Math.hypot(input.moveX, input.moveZ);
    const nx = axisLen > 0 ? input.moveX / axisLen : 0;
    const nz = axisLen > 0 ? input.moveZ / axisLen : 0;
    const speed = PLAYER.speed * (input.sprint ? PLAYER.sprintMultiplier : 1);

    if (this.dashTimer > 0) this.dashTimer -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    if (input.dash && this.dashCooldown <= 0) {
      this.startDash(nx, nz);
    }

    const vx = nx * speed + this.dashBoost.x;
    const vz = nz * speed + this.dashBoost.z;
    const vy = this.body.linvel().y;

    if (input.jump && this.checkGrounded()) {
      this.body.setLinvel({ x: vx, y: PLAYER.jumpSpeed, z: vz }, true);
    } else {
      this.body.setLinvel({ x: vx, y: vy, z: vz }, true);
    }

    this.regenBomb(dt);

    if (this.hitFlash > 0) this.hitFlash -= dt;
  }

  private startDash(nx: number, nz: number) {
    const len = Math.hypot(nx, nz);
    const dx = len > 0 ? nx / len : 0;
    const dz = len > 0 ? nz / len : 0;
    this.dashBoost.x = dx * PLAYER.dashSpeed;
    this.dashBoost.y = 0;
    this.dashBoost.z = dz * PLAYER.dashSpeed;
    this.dashTimer = PLAYER.dashDuration;
    this.dashCooldown = PLAYER.dashCooldown;
  }

  private checkGrounded(): boolean {
    const t = this.body.translation();
    return this.physics.castRay(
      { x: t.x, y: t.y - PLAYER.radius, z: t.z },
      { x: 0, y: -1, z: 0 },
      0.3,
      true,
    );
  }

  private regenBomb(dt: number) {
    if (this.bombs >= PLAYER.bombCapacity) return;
    this.bombRegenTimer -= dt;
    if (this.bombRegenTimer <= 0) {
      this.bombs += 1;
      this.bombRegenTimer = PLAYER.bombRegenTime;
    }
  }

  hasBombs(): boolean {
    return this.bombs > 0;
  }

  consumeBomb(): boolean {
    if (this.bombs <= 0) return false;
    this.bombs -= 1;
    this.bombRegenTimer = PLAYER.bombRegenTime;
    return true;
  }

  get bombCount(): number {
    return this.bombs;
  }

  get healthValue(): number {
    return this.health;
  }

  takeDamage(amount: number) {
    if (this.dead) return;
    this.health -= amount;
    this.hitFlash = 0.18;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }

  onDeath() {
    this.dead = true;
  }
}
