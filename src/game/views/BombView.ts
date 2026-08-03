import * as THREE from 'three';
import type { SimBomb } from '../sim/bomb';

export class BombView {
  readonly mesh: THREE.Group;
  private readonly material: THREE.MeshToonMaterial;
  private readonly light: THREE.PointLight;

  constructor() {
    this.material = new THREE.MeshToonMaterial({
      color: 0x1a1a22,
      emissive: 0xff3b30,
      emissiveIntensity: 0.15,
    });
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
  }

  sync(bomb: SimBomb) {
    const t = bomb.body.translation();
    this.mesh.position.set(t.x, t.y, t.z);
    const r = bomb.body.rotation();
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);

    const progress = bomb.fuseRatio;
    if (progress > 0.6) {
      const pulse = 0.5 + 0.5 * Math.sin(progress * 30);
      this.material.emissiveIntensity = 0.15 + 2.5 * pulse;
      this.light.intensity = 0.4 + 3.5 * pulse;
      this.mesh.scale.setScalar(1 + 0.12 * pulse);
    } else {
      this.material.emissiveIntensity = 0.15;
      this.light.intensity = 0.4;
      this.mesh.scale.setScalar(1);
    }
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}
