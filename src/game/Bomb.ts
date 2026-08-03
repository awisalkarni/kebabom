import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d';
import * as THREE from 'three';
import type { Input } from './Input';
import type { Physics } from './Physics';
import { BOMB } from './constants';
import type { Entity } from './entity';

export class Bomb implements Entity {
  readonly body;
  readonly mesh: THREE.Group;
  private fuse: number;
  private readonly material: THREE.MeshToonMaterial;
  private readonly light: THREE.PointLight;
  private exploding = false;

  constructor(
    private readonly physics: Physics,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    private readonly onExplode: (bomb: Bomb, position: THREE.Vector3) => void,
  ) {
    this.body = physics.rapier.createRigidBody(
      RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z),
    );
    physics.rapier.createCollider(
      ColliderDesc.ball(0.3).setRestitution(0.5).setFriction(0.4),
      this.body,
    );
    this.body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
    this.body.setAngvel({ x: Math.random() * 4, y: Math.random() * 4, z: Math.random() * 4 }, true);

    this.material = new THREE.MeshToonMaterial({ color: 0x1a1a22, emissive: 0xff3b30, emissiveIntensity: 0.15 });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), this.material);
    sphere.castShadow = true;

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffdd55 }),
    );

    this.light = new THREE.PointLight(0xff5533, 0.4, 5);

    this.mesh = new THREE.Group();
    this.mesh.add(sphere, core, this.light);
    this.mesh.castShadow = true;

    this.fuse = BOMB.fuse;
  }

  fixedUpdate(dt: number, _input: Input) {
    if (this.exploding) return;
    this.fuse -= dt;
    const progress = 1 - Math.max(this.fuse, 0) / BOMB.fuse;
    if (progress > 0.6) {
      const pulse = 0.5 + 0.5 * Math.sin(progress * 30);
      this.material.emissiveIntensity = 0.15 + 2.5 * pulse;
      this.light.intensity = 0.4 + 3.5 * pulse;
      this.mesh.scale.setScalar(1 + 0.12 * pulse);
    }
    if (this.fuse <= 0) {
      this.exploding = true;
      this.emitExplosion();
    }
  }

  detonate() {
    if (this.exploding) return;
    this.exploding = true;
    this.emitExplosion();
  }

  private emitExplosion() {
    const t = this.body.translation();
    this.onExplode(this, new THREE.Vector3(t.x, t.y, t.z));
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
