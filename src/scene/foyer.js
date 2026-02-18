import * as THREE from 'three';
import { createRoom } from './room.js';
import { createFoyerLight } from './lighting.js';
import { FOYER_WIDTH, FOYER_DEPTH, FOYER_HEIGHT } from './layout.js';

/**
 * Render text to a canvas and return it as a Three.js texture.
 */
function createTextTexture(text, opts = {}) {
  const {
    fontSize = 64,
    fontFamily = 'Georgia, serif',
    color = '#f0e6d6',
    width = 1024,
    height = 256,
    textAlign = 'center',
  } = opts;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'transparent';
  ctx.clearRect(0, 0, width, height);
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textAlign = textAlign;
  ctx.textBaseline = 'middle';

  // Word-wrap for long text
  const lines = wrapText(ctx, text, width - 40);
  const lineHeight = fontSize * 1.3;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], width / 2, startY + i * lineHeight);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Build the foyer scene.
 * @param {number} photoCount
 * @param {object} foyerDescriptor - from computeLayout
 * @returns {THREE.Group}
 */
export function createFoyer(photoCount, foyerDescriptor) {
  const { group, wallSegments } = createRoom({
    width: FOYER_WIDTH,
    depth: FOYER_DEPTH,
    height: FOYER_HEIGHT,
    doorways: foyerDescriptor.doorways,
  });

  // Welcome title on the north wall (back wall)
  const titleTexture = createTextTexture('Welcome to the Personal Museum', {
    fontSize: 72,
    width: 2048,
    height: 256,
  });
  const titleMat = new THREE.MeshStandardMaterial({ map: titleTexture, transparent: true });
  const titleMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.5), titleMat);
  titleMesh.position.set(0, FOYER_HEIGHT * 0.65, -FOYER_DEPTH / 2 + 0.05);
  group.add(titleMesh);

  // Exhibit info on a side wall
  const infoText = photoCount > 0
    ? `This exhibit contains ${photoCount} photograph${photoCount !== 1 ? 's' : ''}`
    : 'Upload photos to open the gallery';
  const infoTexture = createTextTexture(infoText, {
    fontSize: 40,
    width: 1024,
    height: 128,
    color: '#a09080',
  });
  const infoMat = new THREE.MeshStandardMaterial({ map: infoTexture, transparent: true });
  const infoMesh = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.8), infoMat);
  infoMesh.position.set(-FOYER_WIDTH / 2 + 0.05, 1.6, 0);
  infoMesh.rotation.y = Math.PI / 2;
  group.add(infoMesh);

  // Central bench
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x2a2018 });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 0.8), benchMat);
  bench.position.set(0, 0.25, 0);
  bench.castShadow = true;
  bench.receiveShadow = true;
  group.add(bench);

  // Foyer chandelier light
  createFoyerLight(group, FOYER_HEIGHT);

  group.position.set(foyerDescriptor.position.x, 0, foyerDescriptor.position.z);

  return group;
}
