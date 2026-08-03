import type { Vec3 } from './types';
import type { SimEnemy } from './enemy';

export interface ExplosionOptions {
  radius: number;
  damage: number;
  impulse: number;
  color: [number, number, number];
  secondaryColor: [number, number, number];
  shakeTrauma: number;
}

export interface SimulationEvents {
  onWaveStart?: (wave: number) => void;
  onWaveClear?: (wave: number) => void;
  onEnemyKilled?: (enemy: SimEnemy) => void;
  onExplosion?: (origin: Vec3, options: ExplosionOptions) => void;
  onPlayerDamaged?: (amount: number) => void;
  onBombThrown?: () => void;
}
