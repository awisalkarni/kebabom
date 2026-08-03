import * as THREE from 'three';
import { ARENA_SIZE, WALL_HEIGHT } from './constants';
import { createCheckerboardTexture } from './textures';

export class Arena {
  readonly group = new THREE.Group();

  constructor() {
    this.buildFloor();
    this.buildWalls();
  }

  private buildFloor() {
    const texture = createCheckerboardTexture();
    texture.repeat.set(4, 4);
    const material = new THREE.MeshToonMaterial({ map: texture });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE), material);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  private buildWalls() {
    const material = new THREE.MeshToonMaterial({ color: 0x4a5a6d });
    const thickness = 1;
    const half = ARENA_SIZE / 2;
    const walls: Array<{ size: THREE.Vector3; position: THREE.Vector3 }> = [
      { size: new THREE.Vector3(ARENA_SIZE + thickness * 2, WALL_HEIGHT, thickness), position: new THREE.Vector3(0, WALL_HEIGHT / 2, -half - thickness / 2) },
      { size: new THREE.Vector3(ARENA_SIZE + thickness * 2, WALL_HEIGHT, thickness), position: new THREE.Vector3(0, WALL_HEIGHT / 2, half + thickness / 2) },
      { size: new THREE.Vector3(thickness, WALL_HEIGHT, ARENA_SIZE), position: new THREE.Vector3(-half - thickness / 2, WALL_HEIGHT / 2, 0) },
      { size: new THREE.Vector3(thickness, WALL_HEIGHT, ARENA_SIZE), position: new THREE.Vector3(half + thickness / 2, WALL_HEIGHT / 2, 0) },
    ];
    for (const wall of walls) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.size.x, wall.size.y, wall.size.z), material);
      mesh.position.copy(wall.position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }
}
