import * as THREE from 'three';

const MAX_PARTICLES = 2048;

const vertexShader = /* glsl */ `attribute float aLife;
attribute vec3 aColor;
attribute float aSize;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = aLife;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * aLife * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  if (vAlpha < 0.02) discard;
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
  gl_FragColor = vec4(vColor, alpha);
}
`;

export class Particles {
  readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private readonly lives: Float32Array;
  private readonly velocities = new Float32Array(MAX_PARTICLES * 3);
  private readonly gravity: Float32Array;
  private readonly cursor = 0;

  constructor() {
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.lives = new Float32Array(MAX_PARTICLES);
    this.gravity = new Float32Array(MAX_PARTICLES);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('aLife', new THREE.BufferAttribute(this.lives, 1));
    geometry.setDrawRange(0, MAX_PARTICLES);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.lives[i] = 0;
      this.sizes[i] = 0;
    }
  }

  burst(
    origin: THREE.Vector3,
    count: number,
    colors: Array<[number, number, number]>,
    speedMin: number,
    speedMax: number,
    lifeMin: number,
    lifeMax: number,
    gravity: number,
    sizeMin: number,
    sizeMax: number,
  ) {
    for (let i = 0; i < count; i++) {
      const index = this.nextIndex();
      if (index === -1) break;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      this.positions[index * 3] = origin.x;
      this.positions[index * 3 + 1] = origin.y;
      this.positions[index * 3 + 2] = origin.z;
      this.velocities[index * 3] = speed * Math.sin(phi) * Math.cos(theta);
      this.velocities[index * 3 + 1] = Math.abs(speed * Math.cos(phi)) * 0.6 + 2;
      this.velocities[index * 3 + 2] = speed * Math.sin(phi) * Math.sin(theta);
      this.colors[index * 3] = color[0];
      this.colors[index * 3 + 1] = color[1];
      this.colors[index * 3 + 2] = color[2];
      this.lives[index] = lifeMin + Math.random() * (lifeMax - lifeMin);
      this.gravity[index] = gravity;
      this.sizes[index] = sizeMin + Math.random() * (sizeMax - sizeMin);
    }
  }

  update(dt: number) {
    const pos = this.positions;
    const vel = this.velocities;
    const lives = this.lives;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (lives[i] <= 0) continue;
      lives[i] -= dt;
      if (lives[i] <= 0) {
        pos[i * 3 + 1] = -1000;
        lives[i] = 0;
        this.sizes[i] = 0;
        continue;
      }
      vel[i * 3 + 1] += this.gravity[i] * dt;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }

  private nextIndex(): number {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const index = (this.cursor + i) % MAX_PARTICLES;
      if (this.lives[index] <= 0) return index;
    }
    return -1;
  }
}
