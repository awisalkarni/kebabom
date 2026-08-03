import { ColliderDesc, Ray, RigidBodyDesc, World, init } from '@dimforge/rapier3d-compat';
import type { RigidBody } from '@dimforge/rapier3d-compat';
import { GRAVITY_Y, PHYSICS_FIXED_DT } from '../game/constants';
import type { BodyParams, SimBody, SimPhysics, Vec3 } from '../game/sim/types';

let initialized = false;

export class NodePhysics implements SimPhysics {
  static async create(): Promise<NodePhysics> {
    if (!initialized) {
      await init();
      initialized = true;
    }
    return new NodePhysics();
  }

  readonly rapier: World;
  timestep = PHYSICS_FIXED_DT;
  private readonly raws = new Map<number, RigidBody>();

  private constructor() {
    this.rapier = new World({ x: 0, y: GRAVITY_Y, z: 0 });
  }

  createBody(params: BodyParams): SimBody {
    const desc = params.fixed ? RigidBodyDesc.fixed() : RigidBodyDesc.dynamic();
    if (params.translation) {
      desc.setTranslation(params.translation.x, params.translation.y, params.translation.z);
    }
    if (params.lockRotations) desc.lockRotations();
    if (params.ccd) desc.setCcdEnabled(true);
    const body = this.rapier.createRigidBody(desc);
    this.raws.set(body.handle, body);

    const c = params.collider;
    if (c) {
      let collider: ColliderDesc;
      if (c.kind === 'capsule') {
        collider = ColliderDesc.capsule(c.halfHeight ?? 0, c.radius ?? 0).setFriction(c.friction ?? 0.5);
      } else if (c.kind === 'ball') {
        collider = ColliderDesc.ball(c.radius ?? 0).setRestitution(c.restitution ?? 0).setFriction(c.friction ?? 0.5);
      } else {
        const size = c.size ?? { x: 1, y: 1, z: 1 };
        collider = ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
      }
      if (c.translation) {
        collider.setTranslation(c.translation.x, c.translation.y, c.translation.z);
      }
      this.rapier.createCollider(collider, body);
    }

    if (params.linvel) body.setLinvel(params.linvel, true);
    if (params.angvel) body.setAngvel(params.angvel, true);

    return this.wrap(body);
  }

  createStaticBox(size: Vec3, position: Vec3): SimBody {
    return this.createBody({
      fixed: true,
      collider: { kind: 'cuboid', size, translation: position },
    });
  }

  castRay(origin: Vec3, dir: Vec3, maxToi: number, solid: boolean): boolean {
    return this.rapier.castRay(new Ray(origin, dir), maxToi, solid) !== null;
  }

  step() {
    this.rapier.timestep = this.timestep;
    this.rapier.step();
  }

  removeBody(body: SimBody) {
    const raw = this.raws.get(body.handle);
    if (raw) {
      this.rapier.removeRigidBody(raw);
      this.raws.delete(body.handle);
    }
  }

  dispose() {
    this.rapier.free();
  }

  private wrap(raw: RigidBody): SimBody {
    return {
      get handle() {
        return raw.handle;
      },
      translation: () => ({ ...raw.translation() }),
      rotation: () => ({ ...raw.rotation() }),
      linvel: () => ({ ...raw.linvel() }),
      setLinvel: (v, wake) => raw.setLinvel(v, wake),
      setTranslation: (v, wake) => raw.setTranslation(v, wake),
      setAngvel: (v, wake) => raw.setAngvel(v, wake),
      applyImpulse: (v, wake) => raw.applyImpulse(v, wake),
      wakeUp: () => raw.wakeUp(),
    };
  }
}
