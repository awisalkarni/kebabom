import * as THREE from 'three';
import type { SimEnemy, EnemyKind } from '../sim/enemy';

const COLORS: Record<EnemyKind, number> = {
  runner: 0x4cd964,
  tank: 0xb48cff,
  boss: 0xff4d6d,
};

export class EnemyView {
  readonly mesh: THREE.Group;
  private readonly material: THREE.MeshToonMaterial;
  private wobble = Math.random() * Math.PI * 2;

  constructor(kind: EnemyKind, radius: number, halfHeight: number) {
    this.material = new THREE.MeshToonMaterial({ color: COLORS[kind] });
    const bodyMesh = this.buildMesh(kind, radius, halfHeight);
    bodyMesh.castShadow = true;

    this.mesh = new THREE.Group();
    this.mesh.add(bodyMesh);
  }

  private buildMesh(kind: EnemyKind, radius: number, halfHeight: number): THREE.Mesh {
    if (kind === 'runner') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, halfHeight * 2, 7), this.material);
      cone.position.y = halfHeight;
      return cone;
    }
    if (kind === 'tank') {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 1.6, halfHeight * 2, radius * 1.6),
        this.material,
      );
      box.position.y = halfHeight;
      return box;
    }
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 1.7, halfHeight * 1.7, radius * 1.7),
      this.material,
    );
    box.position.y = halfHeight;
    return box;
  }

  sync(enemy: SimEnemy, dt: number) {
    const t = enemy.body.translation();
    this.mesh.position.set(t.x, t.y, t.z);
    const r = enemy.body.rotation();
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);

    this.wobble += dt * 10;
    this.mesh.rotation.y = Math.sin(this.wobble) * 0.4;

    if (enemy.hitFlash > 0) {
      this.material.emissive.set(0xffffff);
      this.material.emissiveIntensity = 1;
    } else {
      this.material.emissive.set(0x000000);
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
