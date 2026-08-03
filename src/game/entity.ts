import type { RigidBody } from '@dimforge/rapier3d';
import type * as THREE from 'three';
import type { Input } from './Input';

export interface Entity {
  readonly body: RigidBody;
  readonly mesh: THREE.Object3D;
  fixedUpdate(dt: number, input: Input): void;
  syncVisual(): void;
  dispose(): void;
}

export interface Damageable {
  readonly isPlayer: boolean;
  readonly bodyHandle: number;
  takeDamage(amount: number): void;
  onDeath(): void;
}
