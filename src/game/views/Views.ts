import * as THREE from 'three';
import type { Simulation } from '../sim/simulation';
import { BombView } from './BombView';
import { EnemyView } from './EnemyView';
import { PlayerView } from './PlayerView';

export class Views {
  private readonly scene: THREE.Scene;
  private readonly player: PlayerView;
  private readonly enemies = new Map<number, EnemyView>();
  private readonly bombs = new Map<number, BombView>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.player = new PlayerView();
    scene.add(this.player.mesh);
  }

  sync(sim: Simulation, dt: number) {
    this.player.sync(sim.player);

    const seenEnemies = new Set<number>();
    for (const enemy of sim.enemies) {
      seenEnemies.add(enemy.id);
      let view = this.enemies.get(enemy.id);
      if (!view) {
        view = new EnemyView(enemy.kind, enemy.config.radius, enemy.config.halfHeight);
        this.enemies.set(enemy.id, view);
        this.scene.add(view.mesh);
      }
      view.sync(enemy, dt);
    }
    this.prune(this.enemies, seenEnemies);

    const seenBombs = new Set<number>();
    for (const bomb of sim.bombs) {
      seenBombs.add(bomb.id);
      let view = this.bombs.get(bomb.id);
      if (!view) {
        view = new BombView();
        this.bombs.set(bomb.id, view);
        this.scene.add(view.mesh);
      }
      view.sync(bomb);
    }
    this.prune(this.bombs, seenBombs);
  }

  private prune<T extends { dispose(scene: THREE.Scene): void }>(map: Map<number, T>, seen: Set<number>) {
    for (const [id, view] of map) {
      if (!seen.has(id)) {
        view.dispose(this.scene);
        map.delete(id);
      }
    }
  }
}
