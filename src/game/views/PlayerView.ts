import * as THREE from 'three';
import type { SimPlayer } from '../sim/player';

export class PlayerView {
  readonly mesh: THREE.Group;
  private readonly material: THREE.MeshToonMaterial;

  constructor() {
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

  sync(player: SimPlayer) {
    const t = player.body.translation();
    this.mesh.position.set(t.x, t.y, t.z);
    const r = player.body.rotation();
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);

    if (player.hitFlash > 0) {
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
