import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d';
import * as THREE from 'three';
import type { Input } from './Input';
import type { Physics } from './Physics';
import { CONTACT_DAMAGE_COOLDOWN } from './constants';
import type { Damageable, Entity } from './entity';

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

const COLORS: Record<EnemyKind, number> = {
  runner: 0x4cd964,
  tank: 0xb48cff,
  boss: 0xff4d6d,
};

export class Enemy implements Entity, Damageable {
  readonly isPlayer = false;
  readonly body;
  readonly mesh: THREE.Group;
  readonly kind: EnemyKind;
  private health: number;
  private readonly baseHealth: number;
  private readonly config: EnemyConfig;
  private readonly material: THREE.MeshToonMaterial;
  private contactCooldown = 0;
  private flashTimer = 0;
  private dead = false;
  private wobble = Math.random() * Math.PI * 2;

  constructor(
    private readonly physics: Physics,
    kind: EnemyKind,
    position: THREE.Vector3,
    wave: number,
    private readonly target: () => THREE.Vector3,
    private readonly onContactDamage: (amount: number, enemy: Enemy) => void,
    private readonly onKilled: (enemy: Enemy) => void,
  ) {
    this.kind = kind;
    this.config = CONFIG[kind];
    const scale = 1 + (wave - 1) * 0.08;
    this.baseHealth = this.config.health * scale;
    this.health = this.baseHealth;

    this.body = physics.rapier.createRigidBody(
      RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .lockRotations()
        .setCcdEnabled(true),
    );
    physics.rapier.createCollider(
      ColliderDesc.capsule(this.config.halfHeight, this.config.radius).setFriction(0.2),
      this.body,
    );

    this.material = new THREE.MeshToonMaterial({ color: COLORS[kind] });
    const bodyMesh = this.buildMesh(this.config.radius, this.config.halfHeight);
    bodyMesh.castShadow = true;

    this.mesh = new THREE.Group();
    this.mesh.add(bodyMesh);
  }

  private buildMesh(radius: number, halfHeight: number): THREE.Mesh {
    if (this.kind === 'runner') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, halfHeight * 2, 7), this.material);
      cone.position.y = halfHeight;
      return cone;
    }
    if (this.kind === 'tank') {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 1.6, halfHeight * 2, radius * 1.6),
        this.material,
      );
      box.position.y = halfHeight;
      return box;
    }
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 1.7, halfHeight * 1.7, radius * 1.7),
      this.material,
    );
    box.position.y = halfHeight;
    return box;
  }

  get bodyHandle(): number {
    return this.body.handle;
  }

  get alive(): boolean {
    return !this.dead;
  }

  get score(): number {
    return this.config.score;
  }

  fixedUpdate(dt: number, _input: Input) {
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

    this.wobble += dt * 10;
    this.mesh.rotation.y = Math.sin(this.wobble) * 0.4;

    if (this.contactCooldown > 0) this.contactCooldown -= dt;
    if (dist < this.config.radius + 0.6 && this.contactCooldown <= 0) {
      this.contactCooldown = CONTACT_DAMAGE_COOLDOWN;
      this.onContactDamage(this.config.damage, this);
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.material.emissive.set(0xffffff);
      this.material.emissiveIntensity = 1;
    } else {
      this.material.emissive.set(0x000000);
    }
  }

  takeDamage(amount: number) {
    if (this.dead) return;
    this.health -= amount;
    this.flashTimer = 0.12;
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

  syncVisual() {
    const t = this.body.translation();
    this.mesh.position.set(t.x, t.y, t.z);
    const r = this.body.rotation();
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
  }

  dispose() {
    this.physics.rapier.removeRigidBody(this.body);
  }
}
