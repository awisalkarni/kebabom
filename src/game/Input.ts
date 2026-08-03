import * as THREE from 'three';

export class Input {
  private readonly keys = new Set<string>();
  private leftClickQueued = false;
  private rightClickQueued = false;
  private spaceQueued = false;
  readonly mouse = new THREE.Vector2();

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    this.keys.add(e.code);
    if (e.code === 'Space') this.spaceQueued = true;
    e.preventDefault();
  };
  private readonly onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  private readonly onMouseMove = (e: MouseEvent) => {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };
  private readonly onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.leftClickQueued = true;
    if (e.button === 2) this.rightClickQueued = true;
  };

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  moveAxis(): THREE.Vector2 {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW')) y -= 1;
    if (this.keys.has('KeyS')) y += 1;
    if (this.keys.has('KeyA')) x -= 1;
    if (this.keys.has('KeyD')) x += 1;
    const len = Math.hypot(x, y);
    if (len > 0) {
      x /= len;
      y /= len;
    }
    return new THREE.Vector2(x, y);
  }

  consumeLeftClick(): boolean {
    const queued = this.leftClickQueued;
    this.leftClickQueued = false;
    return queued;
  }

  consumeRightClick(): boolean {
    const queued = this.rightClickQueued;
    this.rightClickQueued = false;
    return queued;
  }

  consumeSpace(): boolean {
    const queued = this.spaceQueued;
    this.spaceQueued = false;
    return queued;
  }
}
