import type { EnemyKind } from './Enemy';

interface WaveCallbacks {
  onSpawn: (wave: number, kind: EnemyKind) => void;
  onWaveStart: (wave: number) => void;
  onWaveClear: (wave: number) => void;
  aliveCount: () => number;
}

export class WaveSystem {
  wave = 0;
  private queue: EnemyKind[] = [];
  private spawnTimer = 0;
  private delayTimer = 1.5;
  private state: 'delaying' | 'spawning' | 'clearing' = 'delaying';

  constructor(private readonly cb: WaveCallbacks) {}

  fixedUpdate(dt: number) {
    switch (this.state) {
      case 'delaying': {
        this.delayTimer -= dt;
        if (this.delayTimer <= 0) this.beginWave();
        break;
      }
      case 'spawning': {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.queue.length > 0) {
          const kind = this.queue.shift()!;
          this.cb.onSpawn(this.wave, kind);
          this.spawnTimer += 0.55;
        }
        if (this.queue.length === 0) this.state = 'clearing';
        break;
      }
      case 'clearing': {
        if (this.cb.aliveCount() === 0) {
          this.cb.onWaveClear(this.wave);
          this.delayTimer = 2.2;
          this.state = 'delaying';
        }
        break;
      }
    }
  }

  private beginWave() {
    this.wave += 1;
    this.buildQueue(this.wave);
    this.spawnTimer = 0;
    this.state = 'spawning';
    this.cb.onWaveStart(this.wave);
  }

  private buildQueue(wave: number) {
    this.queue = [];
    const runners = Math.round(3 + wave * 1.4);
    const tanks = wave >= 3 ? Math.floor((wave - 1) / 2) : 0;
    for (let i = 0; i < runners; i++) this.queue.push('runner');
    for (let i = 0; i < tanks; i++) this.queue.push('tank');
    if (wave % 5 === 0) this.queue.push('boss');
    this.shuffle(this.queue);
  }

  private shuffle(arr: EnemyKind[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  reset() {
    this.wave = 0;
    this.queue = [];
    this.state = 'delaying';
    this.delayTimer = 1.5;
  }
}
