import * as THREE from 'three';

export class Renderer {
  readonly three: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();

  constructor(canvas: HTMLCanvasElement) {
    this.three = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.three.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.three.shadowMap.enabled = true;
    this.three.shadowMap.type = THREE.PCFShadowMap;
    this.three.toneMapping = THREE.ACESFilmicToneMapping;
    this.three.toneMappingExposure = 1.1;

    this.scene.background = new THREE.Color(0x1a2330);
    this.scene.fog = new THREE.Fog(0x1a2330, 50, 110);

    this.buildLights();
  }

  private buildLights() {
    const hemi = new THREE.HemisphereLight(0xbfd7ff, 0x3a2f4a, 1.0);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe0b3, 2.2);
    sun.position.set(18, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 80;
    this.scene.add(sun);
  }

  setSize(width: number, height: number) {
    this.three.setSize(width, height, false);
  }

  render(camera: THREE.PerspectiveCamera) {
    this.three.render(this.scene, camera);
  }

  dispose() {
    this.three.dispose();
  }
}
