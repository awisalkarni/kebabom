export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface PlayerInput {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  jump: boolean;
  dash: boolean;
  throwBomb: boolean;
  aim: Vec3;
}

export interface BodyParams {
  fixed?: boolean;
  lockRotations?: boolean;
  ccd?: boolean;
  translation?: Vec3;
  collider?: {
    kind: 'capsule' | 'ball' | 'cuboid';
    radius?: number;
    halfHeight?: number;
    size?: Vec3;
    friction?: number;
    restitution?: number;
    translation?: Vec3;
  };
  linvel?: Vec3;
  angvel?: Vec3;
}

export interface SimBody {
  readonly handle: number;
  translation(): Vec3;
  rotation(): Vec4;
  linvel(): Vec3;
  setLinvel(vel: Vec3, wake: boolean): void;
  setTranslation(pos: Vec3, wake: boolean): void;
  setAngvel(vel: Vec3, wake: boolean): void;
  applyImpulse(impulse: Vec3, wake: boolean): void;
  wakeUp(): void;
}

export interface SimPhysics {
  timestep: number;
  createBody(params: BodyParams): SimBody;
  createStaticBox(size: Vec3, position: Vec3): SimBody;
  castRay(origin: Vec3, dir: Vec3, maxToi: number, solid: boolean): boolean;
  step(): void;
  removeBody(body: SimBody): void;
  dispose(): void;
}

export interface SimEntity {
  readonly id: number;
  readonly body: SimBody;
}
