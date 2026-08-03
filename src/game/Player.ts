import { ColliderDesc, Ray, RigidBodyDesc } from '@dimforge/rapier3d';
import * as THREE from 'three';
import type { Input } from './Input';
import type { Physics } from './Physics';
import { PLAYER } from './constants';
import type { Damageable, Entity } from './entity';

export class Player implements Entity, Damageable {
  readonly isPlayer = true;
  readonly body;
  readonly mesh: THREE.Group;
  private readonly material: THREE.MeshToonMaterial;
  private health = PLAYER.health;
  private bombs = PLAYER.bombCapacity;
  private bombRegenTimer = PLAYER.bombRegenTime;
  private dashTimer = 0;
  private dashCooldown = 0;
  private flashTimer = 0;
  private dead = false;

  constructor(private readonly physics: Physics) {
    this.body = physics.rapier.createRigidBody(
      RigidBodyDesc.dynamic()
        .setTranslation(0, 1.2, 0)
        .lockRotations()
        .setCcdEnabled(true),
    );
    physics.rapier.createCollider(
      ColliderDesc.capsule(PLAYER.halfHeight, PLAYER.radius),
      this.body,
    );

    this.material = new THREE.MeshToonMaterial({ color: 0xff7a3c });
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.55), this.material);
    bodyMesh.position.y = 1.0;
    bodyMesh.castShadow = true;

    const headMat = new THREE.MeshToonMaterial({ color: 0xffcf6b });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), headMat);
    head.position.y = 1.65;
    head.castShadow = true;

    this.mesh = new THREE.Group();
    this.mesh.add(bodyMesh, head);
  }

  get alive(): boolean {
    return !this.dead;
  }

  get bodyHandle(): number {
    return this.body.handle;
  }

  position(): THREE.Vector3 {
    const t = this.body.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  fixedUpdate(dt: number, input: Input) {
    if (this.dead) return;

    const axis = input.moveAxis();
    const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = PLAYER.speed * (sprint ? PLAYER.sprintMultiplier : 1);

    if (this.dashTimer > 0) this.dashTimer -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    if (input.consumeRightClick() && this.dashCooldown <= 0) {
      this.startDash(axis);
    }

    const vx = axis.x * speed + this.dashBoost.x;
    const vz = axis.y * speed + this.dashBoost.z;
    const vy = this.body.linvel().y;

    if (input.consumeSpace() && this.checkGrounded()) {
      this.body.setLinvel({ x: vx, y: PLAYER.jumpSpeed, z: vz }, true);
    } else {
      this.body.setLinvel({ x: vx, y: vy, z: vz }, true);
    }

    this.regenBomb(dt);

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.material.emissive.set(0xffffff);
      this.material.emissiveIntensity = 1;
    } else {
      this.material.emissive.set(0x000000);
    }
  }

  private dashBoost = new THREE.Vector3();

  private startDash(axis: THREE.Vector2) {
    const dir = axis.lengthSq() > 0 ? axis.clone().normalize() : new THREE.Vector2(0, -1);
    this.dashBoost.set(dir.x, 0, dir.y).multiplyScalar(PLAYER.dashSpeed);
    this.dashTimer = PLAYER.dashDuration;
    this.dashCooldown = PLAYER.dashCooldown;
  }

  private checkGrounded(): boolean {
    const t = this.body.translation();
    const ray = new Ray({ x: t.x, y: t.y - PLAYER.radius, z: t.z }, { x: 0, y: -1, z: 0 });
    const hit = this.physics.rapier.castRay(ray, 0.3, true);
    return hit !== null;
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
    this.flashTimer = 0.18;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }

  onDeath() {
    this.dead = true;
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
