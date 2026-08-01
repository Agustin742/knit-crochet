import {
  AmbientLight,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  TorusGeometry,
} from "three";
import type { BufferGeometry, Material } from "three";

/**
 * Ovillo de lana con agujas, portado 1:1 de `template/ascii-yarn.js` (RFC-01 §3
 * D2-bis). Los números de abajo son unidades de mundo 3D de la referencia, no
 * valores de CSS: se copian tal cual, no se afinan. Los colores de material son
 * grises que alimentan la luminancia de la rampa ASCII — el color visible del
 * ovillo lo pone el token del host (`currentColor`), no el material.
 */

/** El carácter monoespaciado es más alto que ancho: sin este factor el ovillo
 *  sale estirado en vertical. */
const CHARACTER_ASPECT = 0.6;

const CAMERA_FOV = 34;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 100;
const CAMERA_POSITION = { x: 0, y: 0.35, z: 5.4 } as const;

const AMBIENT_INTENSITY = 0.22;
const KEY_INTENSITY = 1.7;
const KEY_POSITION = { x: 2.5, y: 3, z: 4 } as const;
const FILL_INTENSITY = 0.4;
const FILL_POSITION = { x: -3, y: -1.5, z: -2 } as const;
const LIGHT_COLOR = 0xffffff;

const YARN_COLOR = 0xd8d8d8;
const YARN_SHININESS = 14;
const BALL_RADIUS = 0.98;
const BALL_SEGMENTS = { width: 32, height: 24 } as const;

const RING_COUNT = 18;
const RING_RADIUS = 0.99;
const RING_TUBE = 0.05;
const RING_SEGMENTS = { radial: 6, tubular: 56 } as const;

const NEEDLE_COLOR = 0xffffff;
const NEEDLE_SHININESS = 90;
const NEEDLE_RADIUS = 0.034;
const NEEDLE_LENGTH = 3.5;
const NEEDLE_SEGMENTS = 10;
const NEEDLE_TIP_HEIGHT = 0.22;
const NEEDLE_TIP_Y = 1.85;
const NEEDLE_KNOB_RADIUS = 0.095;
const NEEDLE_KNOB_SEGMENTS = { width: 12, height: 10 } as const;
const NEEDLE_KNOB_Y = -1.78;
const NEEDLE_TILT_X = 0.38;
const NEEDLE_OFFSET_Y = 0.12;
const NEEDLE_ROTATIONS_Z = [0.55, -0.62] as const;

const GROUP_TILT_X = 0.15;

/** LCG de Lehmer con la semilla del template: la geometría de los anillos es
 *  reproducible entre sesiones y entre máquinas (`Math.random` no lo sería). */
const RANDOM_SEED = 42;
const LCG_MULTIPLIER = 16807;
const LCG_MODULUS = 2147483647;

function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * LCG_MULTIPLIER) % LCG_MODULUS;
    return state / LCG_MODULUS;
  };
}

export interface YarnScene {
  scene: Scene;
  camera: PerspectiveCamera;
  /** El nodo que rota: lo mueven la auto-rotación y el arrastre. */
  group: Group;
  dispose: () => void;
}

export interface CreateYarnSceneOptions {
  cols: number;
  rows: number;
}

export function createYarnScene({
  cols,
  rows,
}: CreateYarnSceneOptions): YarnScene {
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];

  const track = <T extends BufferGeometry>(geometry: T): T => {
    geometries.push(geometry);
    return geometry;
  };

  const scene = new Scene();

  const camera = new PerspectiveCamera(
    CAMERA_FOV,
    (cols * CHARACTER_ASPECT) / rows,
    CAMERA_NEAR,
    CAMERA_FAR,
  );
  camera.position.set(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
  camera.lookAt(0, 0, 0);

  scene.add(new AmbientLight(LIGHT_COLOR, AMBIENT_INTENSITY));
  const key = new DirectionalLight(LIGHT_COLOR, KEY_INTENSITY);
  key.position.set(KEY_POSITION.x, KEY_POSITION.y, KEY_POSITION.z);
  scene.add(key);
  const fill = new DirectionalLight(LIGHT_COLOR, FILL_INTENSITY);
  fill.position.set(FILL_POSITION.x, FILL_POSITION.y, FILL_POSITION.z);
  scene.add(fill);

  const group = new Group();
  const random = createRandom(RANDOM_SEED);

  const yarnMaterial = new MeshPhongMaterial({
    color: YARN_COLOR,
    shininess: YARN_SHININESS,
  });
  materials.push(yarnMaterial);

  group.add(
    new Mesh(
      track(
        new SphereGeometry(
          BALL_RADIUS,
          BALL_SEGMENTS.width,
          BALL_SEGMENTS.height,
        ),
      ),
      yarnMaterial,
    ),
  );

  for (let i = 0; i < RING_COUNT; i++) {
    const ring = new Mesh(
      track(
        new TorusGeometry(
          RING_RADIUS,
          RING_TUBE,
          RING_SEGMENTS.radial,
          RING_SEGMENTS.tubular,
        ),
      ),
      yarnMaterial,
    );
    ring.rotation.set(
      random() * Math.PI,
      random() * Math.PI,
      random() * Math.PI,
    );
    group.add(ring);
  }

  const needleMaterial = new MeshPhongMaterial({
    color: NEEDLE_COLOR,
    shininess: NEEDLE_SHININESS,
  });
  materials.push(needleMaterial);

  for (const rotationZ of NEEDLE_ROTATIONS_Z) {
    const needle = new Group();

    const shaft = new Mesh(
      track(
        new CylinderGeometry(
          NEEDLE_RADIUS,
          NEEDLE_RADIUS,
          NEEDLE_LENGTH,
          NEEDLE_SEGMENTS,
        ),
      ),
      needleMaterial,
    );
    const tip = new Mesh(
      track(
        new ConeGeometry(NEEDLE_RADIUS, NEEDLE_TIP_HEIGHT, NEEDLE_SEGMENTS),
      ),
      needleMaterial,
    );
    tip.position.y = NEEDLE_TIP_Y;
    const knob = new Mesh(
      track(
        new SphereGeometry(
          NEEDLE_KNOB_RADIUS,
          NEEDLE_KNOB_SEGMENTS.width,
          NEEDLE_KNOB_SEGMENTS.height,
        ),
      ),
      needleMaterial,
    );
    knob.position.y = NEEDLE_KNOB_Y;

    needle.add(shaft, tip, knob);
    needle.rotation.set(NEEDLE_TILT_X, 0, rotationZ);
    needle.position.y = NEEDLE_OFFSET_Y;
    group.add(needle);
  }

  group.rotation.x = GROUP_TILT_X;
  scene.add(group);

  return {
    scene,
    camera,
    group,
    dispose: () => {
      for (const geometry of geometries) {
        geometry.dispose();
      }
      for (const material of materials) {
        material.dispose();
      }
    },
  };
}
