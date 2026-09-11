import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  FACES,
  FACE_NORMALS,
  cubiePositionOfSticker,
  stickerIndexAt,
  type Face,
  type Facelets,
  type Move,
} from '../cube';

const CUBIE_SIZE = 0.94;
const STICKER_SIZE = 0.8;
const STICKER_OFFSET = CUBIE_SIZE / 2 + 0.005;

/**
 * 3D cube made of 26 cubies with a colored sticker plane on each outer side.
 * The cubies never move permanently: a face turn is animated by rotating the
 * affected cubies around a pivot, after which they snap back and every sticker
 * is recolored from the new facelet state.
 */
export class CubeView {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private cubeGroup = new THREE.Group();
  private pivot = new THREE.Group();
  private cubies: THREE.Mesh[] = [];
  private stickerMaterials: THREE.MeshLambertMaterial[] = [];
  private facelets: Facelets;
  private faceColors: Record<Face, string>;
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private animating: Promise<void> = Promise.resolve();
  private disposed = false;

  constructor(
    private container: HTMLElement,
    facelets: Facelets,
    faceColors: Record<Face, string>,
  ) {
    this.facelets = facelets.slice();
    this.faceColors = faceColors;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(4.2, 4, 6.2);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 14;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 8, 6);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-6, -3, -4);
    this.scene.add(fill);

    this.buildCubies();
    this.scene.add(this.cubeGroup);
    this.scene.add(this.pivot);
    this.applyColors();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.loop();
  }

  private buildCubies(): void {
    const body = new THREE.MeshLambertMaterial({ color: 0x151515 });
    const box = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
    const plane = new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE);

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          const cubie = new THREE.Mesh(box, body);
          cubie.position.set(x, y, z);
          cubie.userData.home = new THREE.Vector3(x, y, z);
          for (const face of FACES) {
            const index = stickerIndexAt([x, y, z], face);
            if (index === undefined) continue;
            const material = new THREE.MeshLambertMaterial({ color: 0x888888 });
            const sticker = new THREE.Mesh(plane, material);
            const n = FACE_NORMALS[face];
            const normal = new THREE.Vector3(n[0], n[1], n[2]);
            sticker.position.copy(normal).multiplyScalar(STICKER_OFFSET);
            sticker.lookAt(normal.clone().multiplyScalar(2));
            cubie.add(sticker);
            this.stickerMaterials[index] = material;
          }
          this.cubies.push(cubie);
          this.cubeGroup.add(cubie);
        }
      }
    }
  }

  private applyColors(): void {
    this.facelets.forEach((face, i) => {
      this.stickerMaterials[i]?.color.set(this.faceColors[face]);
    });
  }

  setFacelets(facelets: Facelets): void {
    this.facelets = facelets.slice();
    this.applyColors();
  }

  setFaceColors(faceColors: Record<Face, string>): void {
    this.faceColors = faceColors;
    this.applyColors();
  }

  /**
   * Animates `move` and updates the displayed state to `after`. Calls are
   * queued so rapid Next/Prev presses play back in order.
   */
  animateMove(move: Move, after: Facelets, durationMs = 600): Promise<void> {
    this.animating = this.animating.then(() => this.runMove(move, after, durationMs));
    return this.animating;
  }

  private runMove(move: Move, after: Facelets, durationMs: number): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const n = FACE_NORMALS[move.face];
    const axis = new THREE.Vector3(n[0], n[1], n[2]);
    const layer = this.cubies.filter((c) => {
      const h = c.userData.home as THREE.Vector3;
      return h.x * n[0] + h.y * n[1] + h.z * n[2] === 1;
    });
    // Clockwise as seen from outside the face = negative rotation about its outward normal.
    const angle = -(Math.PI / 2) * (move.turns === 3 ? -1 : move.turns);

    this.pivot.rotation.set(0, 0, 0);
    this.pivot.updateMatrixWorld();
    for (const c of layer) this.pivot.attach(c);

    return new Promise<void>((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        this.pivot.setRotationFromAxisAngle(axis, angle * eased);
        if (t < 1 && !this.disposed) {
          scheduleFrame(tick);
        } else {
          for (const c of layer) {
            this.cubeGroup.attach(c);
            c.position.copy(c.userData.home as THREE.Vector3);
            c.rotation.set(0, 0, 0);
            c.updateMatrix();
          }
          this.pivot.rotation.set(0, 0, 0);
          this.setFacelets(after);
          resolve();
        }
      };
      scheduleFrame(tick);
    });
  }

  private resize(): void {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

/**
 * requestAnimationFrame is paused while the page is hidden, which would leave a
 * move (and the UI waiting on it) stuck; fall back to a timer in that case.
 */
function scheduleFrame(cb: (now: number) => void): void {
  if (document.visibilityState === 'hidden') {
    setTimeout(() => cb(performance.now()), 16);
  } else {
    requestAnimationFrame(cb);
  }
}

/** Sanity helper used by tests: which facelet indices belong to a face's layer. */
export function layerStickerIndices(face: Face): number[] {
  const n = FACE_NORMALS[face];
  const out: number[] = [];
  for (let i = 0; i < 54; i++) {
    const p = cubiePositionOfSticker(i);
    if (p[0] * n[0] + p[1] * n[1] + p[2] * n[2] === 1) out.push(i);
  }
  return out;
}
