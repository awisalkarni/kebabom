import type { RigidBody } from '@dimforge/rapier3d';
import * as THREE from 'three';
import type { Bomb } from './Bomb';
import type { Particles } from './Particles';
import type { Physics } from './Physics';
import type { Sfx } from './Sfx';
import type { Damageable } from './entity';

export interface ExplosionOptions {
  radius: number;
  damage: number;
  impulse: number;
  color: THREE.Color;
  secondaryColor: THREE.Color;
  shakeTrauma: number;
}

const BOMB_CHAIN_RADIUS = 8;

export class ExplosionSystem {
  constructor(
    private readonly physics: Physics,
    private readonly particles: Particles,
    private readonly sfx: Sfx,
    private readonly shake: (trauma: number) => void,
    private readonly flash: (alpha: number) => void,
    private readonly bodies: RigidBody[],
    private readonly damageables: Damageable[],
    private readonly bombs: Bomb[],
  ) {}

  explode(origin: THREE.Vector3, options: ExplosionOptions) {
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
      body.applyImpulse({ x: (dx / Math.max(0.001, Math.sqrt(distSq))) * force, y: force * 0.55, z: (dz / Math.max(0.001, Math.sqrt(distSq))) * force }, true);
      body.wakeUp();
    }

    for (const target of this.damageables) {
      const body = this.physics.rapier.bodies.get(target.bodyHandle);
      if (!body) continue;
      const t = body.translation();
      const dist = Math.hypot(t.x - origin.x, t.y - origin.y, t.z - origin.z);
      if (dist > options.radius) continue;
      const falloff = Math.max(0.2, 1 - dist / options.radius);
      if (!target.isPlayer) {
        target.takeDamage(options.damage * falloff);
      }
    }

    for (const bomb of this.bombs) {
      const t = bomb.body.translation();
      const dist = Math.hypot(t.x - origin.x, t.y - origin.y, t.z - origin.z);
      if (dist <= BOMB_CHAIN_RADIUS) bomb.detonate();
    }

    this.particles.burst(origin, 60, [[options.color.r, options.color.g, options.color.b], [options.secondaryColor.r, options.secondaryColor.g, options.secondaryColor.b]], 4, 14, 0.35, 0.9, -14, 0.4, 1.3);
    this.particles.burst(origin.clone().add(new THREE.Vector3(0, 0.3, 0)), 18, [[0.6, 0.62, 0.66]], 2, 8, 0.2, 0.5, 8, 0.25, 0.6);

    this.shake(options.shakeTrauma);
    this.flash(0.35);
    this.sfx.explosion();
  }
}
