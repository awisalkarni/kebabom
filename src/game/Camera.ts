import * as THREE from 'three';

export class Camera {
  readonly three: THREE.PerspectiveCamera;
  private target = new THREE.Vector3();
  private readonly basePosition = new THREE.Vector3();
  private readonly followLerp = 4;
  shake = 0;
  private readonly shakeOffset = new THREE.Vector3();

  constructor() {
    this.three = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    this.basePosition.set(0, 32, 30);
    this.sync();
  }

  follow(point: THREE.Vector3) {
    this.target.copy(point);
  }

  setAspect(aspect: number) {
    this.three.aspect = aspect;
    this.three.updateProjectionMatrix();
  }

  update(dt: number) {
    const alpha = 1 - Math.exp(-this.followLerp * dt);
    const desired = this.basePosition.clone().add(this.target);
    this.three.position.lerp(desired, alpha);

    if (this.shake > 0.001) {
      this.shakeOffset.set(
        (Math.random() * 2 - 1) * this.shake * 0.7,
        (Math.random() * 2 - 1) * this.shake * 0.5,
        (Math.random() * 2 - 1) * this.shake * 0.4,
      );
    } else {
      this.shakeOffset.set(0, 0, 0);
    }
    this.three.position.add(this.shakeOffset);
    this.three.lookAt(this.target);
  }

  private sync() {
    this.three.position.copy(this.basePosition).add(this.target);
    this.three.lookAt(this.target);
  }
}
