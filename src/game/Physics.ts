import { ColliderDesc, RigidBodyDesc, World as RapierWorld } from '@dimforge/rapier3d';
import * as THREE from 'three';
import { GRAVITY_Y, PHYSICS_FIXED_DT } from './constants';

export class Physics {
  readonly rapier = new RapierWorld({ x: 0, y: GRAVITY_Y, z: 0 });
  private bodyUserData = new Map<number, unknown>();

  createStaticBox(size: THREE.Vector3, position?: THREE.Vector3): number {
    const body = this.rapier.createRigidBody(RigidBodyDesc.fixed());
    const collider = ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
    if (position) collider.setTranslation(position.x, position.y, position.z);
    this.rapier.createCollider(collider, body);
    return body.handle;
  }

  setBodyUserData(handle: number, data: unknown) {
    this.bodyUserData.set(handle, data);
  }

  getBodyUserData(handle: number): unknown {
    return this.bodyUserData.get(handle);
  }

  step() {
    this.rapier.timestep = PHYSICS_FIXED_DT;
    this.rapier.step();
  }

  dispose() {
    this.rapier.free();
  }
}
