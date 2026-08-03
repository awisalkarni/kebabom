import { BOMB } from '../constants';
import type { SimBody, SimPhysics, Vec3 } from './types';

export class SimBomb {
  readonly body: SimBody;
  private fuse: number;
  private exploding = false;

  constructor(
    physics: SimPhysics,
    public readonly id: number,
    position: Vec3,
    velocity: Vec3,
    random: () => number,
    private readonly onExplode: (bomb: SimBomb, position: Vec3) => void,
  ) {
    this.body = physics.createBody({
      translation: position,
      collider: { kind: 'ball', radius: 0.3, restitution: 0.5, friction: 0.4 },
      linvel: velocity,
      angvel: { x: (random() * 2 - 1) * 4, y: (random() * 2 - 1) * 4, z: (random() * 2 - 1) * 4 },
    });
    this.fuse = BOMB.fuse;
  }

  get fuseRatio(): number {
    return 1 - Math.max(this.fuse, 0) / BOMB.fuse;
  }

  fixedUpdate(dt: number) {
    if (this.exploding) return;
    this.fuse -= dt;
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
    this.onExplode(this, this.body.translation());
  }
}
