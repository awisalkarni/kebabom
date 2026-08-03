import { CONTACT_DAMAGE_COOLDOWN } from '../constants';
import type { SimBody, SimPhysics, Vec3 } from './types';

export type EnemyKind = 'runner' | 'tank' | 'boss';

interface EnemyConfig {
  health: number;
  speed: number;
  damage: number;
  radius: number;
  halfHeight: number;
  score: number;
}

const CONFIG: Record<EnemyKind, EnemyConfig> = {
  runner: { health: 40, speed: 4.2, damage: 10, radius: 0.4, halfHeight: 0.4, score: 50 },
  tank: { health: 160, speed: 1.9, damage: 16, radius: 0.65, halfHeight: 0.7, score: 150 },
  boss: { health: 900, speed: 1.4, damage: 26, radius: 1.1, halfHeight: 1.3, score: 1000 },
};

export class SimEnemy {
  readonly isPlayer = false;
  readonly body: SimBody;
  readonly kind: EnemyKind;
  readonly baseHealth: number;
  readonly config: EnemyConfig;
  health: number;
  hitFlash = 0;
  private contactCooldown = 0;
  private dead = false;

  constructor(
    physics: SimPhysics,
    public readonly id: number,
    kind: EnemyKind,
    position: Vec3,
    wave: number,
    private readonly target: () => Vec3,
    private readonly onContactDamage: (amount: number, enemy: SimEnemy) => void,
    private readonly onKilled: (enemy: SimEnemy) => void,
  ) {
    this.kind = kind;
    this.config = CONFIG[kind];
    const scale = 1 + (wave - 1) * 0.08;
    this.baseHealth = this.config.health * scale;
    this.health = this.baseHealth;

    this.body = physics.createBody({
      translation: position,
      lockRotations: true,
      ccd: true,
      collider: {
        kind: 'capsule',
        radius: this.config.radius,
        halfHeight: this.config.halfHeight,
        friction: 0.2,
      },
    });
  }

  get alive(): boolean {
    return !this.dead;
  }

  get bodyHandle(): number {
    return this.body.handle;
  }

  get score(): number {
    return this.config.score;
  }

  fixedUpdate(dt: number) {
    if (this.dead) return;

    const t = this.body.translation();
    const target = this.target();
    const dx = target.x - t.x;
    const dz = target.z - t.z;
    const dist = Math.hypot(dx, dz);

    const dirX = dist > 0.001 ? dx / dist : 0;
    const dirZ = dist > 0.001 ? dz / dist : 0;
    const vy = this.body.linvel().y;

    this.body.setLinvel({ x: dirX * this.config.speed, y: vy, z: dirZ * this.config.speed }, true);

    if (this.contactCooldown > 0) this.contactCooldown -= dt;
    if (dist < this.config.radius + 0.6 && this.contactCooldown <= 0) {
      this.contactCooldown = CONTACT_DAMAGE_COOLDOWN;
      this.onContactDamage(this.config.damage, this);
    }

    if (this.hitFlash > 0) this.hitFlash -= dt;
  }

  takeDamage(amount: number) {
    if (this.dead) return;
    this.health -= amount;
    this.hitFlash = 0.12;
    if (this.health <= 0) this.onDeath();
  }

  get healthRatio(): number {
    return Math.max(this.health, 0) / this.baseHealth;
  }

  onDeath() {
    if (this.dead) return;
    this.dead = true;
    this.onKilled(this);
  }
}
