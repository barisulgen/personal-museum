import * as THREE from 'three';
import { initDB } from './storage/db.js';
import { initOverlay, showOverlay, hideOverlay } from './ui/overlay.js';
import { initAudio } from './ui/audio.js';
import { buildMuseum } from './scene/museum.js';
import { PlayerController } from './controls/player.js';
import { createCollisionChecker } from './controls/collision.js';

// Renderer
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f0e8);
scene.fog = new THREE.Fog(0xf5f0e8, 10, 40);

// Camera
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 0);

// Player controller
const player = new PlayerController(camera, canvas);

// State
let collisionCheck = null;
let inTour = false;
let museumGroup = null;
let objectUrls = [];

// Clock
const clock = new THREE.Clock();

// Init
async function init() {
  await initDB();

  initOverlay({
    onStart: startTour,
  });

  initAudio();
  animate();
}

async function startTour() {
  hideOverlay();

  // Clean up previous museum
  if (museumGroup) {
    scene.remove(museumGroup);
    museumGroup.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => { m.map?.dispose(); m.dispose(); });
          } else {
            child.material.map?.dispose();
            child.material.dispose();
          }
        }
      }
    });
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls = [];
  }

  // Build museum
  const result = await buildMuseum();
  museumGroup = result.museumGroup;
  objectUrls = result.objectUrls;
  scene.add(museumGroup);
  collisionCheck = createCollisionChecker(result.collisionMeshes);

  // Reset player to foyer center
  camera.position.set(0, 1.6, 0);
  camera.rotation.set(0, 0, 0);
  player.euler.set(0, 0, 0, 'YXZ');

  // Fullscreen + pointer lock
  try {
    await canvas.requestFullscreen();
  } catch (e) {
    // Fullscreen may fail — continue anyway
  }
  player.lock();
  inTour = true;
}

function exitTour() {
  inTour = false;
  player.unlock();
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  // Revoke object URLs to free memory
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls = [];
  showOverlay();
}

// Listen for fullscreen exit
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && inTour) {
    exitTour();
  }
});

// Listen for pointer lock exit
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && inTour) {
    exitTour();
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (inTour) {
    player.update(delta, collisionCheck);
  }

  renderer.render(scene, camera);
}

init();
