export const ARENA_SIZE = 40;
export const WALL_HEIGHT = 6;
export const PHYSICS_FIXED_DT = 1 / 60;
export const GRAVITY_Y = -9.81;

export const PLAYER = {
  health: 100,
  speed: 7,
  sprintMultiplier: 1.6,
  jumpSpeed: 8,
  radius: 0.35,
  halfHeight: 0.5,
  dashSpeed: 26,
  dashDuration: 0.14,
  dashCooldown: 1.6,
  bombCapacity: 3,
  bombRegenTime: 4,
};

export const BOMB = {
  fuse: 3,
  throwSpeed: 17,
  radius: 5.5,
  damage: 60,
  chainRadius: 8,
};

export const ENEMY = {
  runner: { health: 40, speed: 3.8, damage: 6, radius: 0.4, halfHeight: 0.4, score: 50 },
  tank: { health: 160, speed: 1.9, damage: 16, radius: 0.65, halfHeight: 0.7, score: 150 },
  boss: { health: 900, speed: 1.4, damage: 26, radius: 1.1, halfHeight: 1.3, score: 1000 },
};

export const CONTACT_DAMAGE_COOLDOWN = 1;
export const MAX_ENTITIES = 200;
