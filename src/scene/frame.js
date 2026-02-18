import * as THREE from 'three';

const FRAME_DEPTH = 0.05;
const MAT_WIDTH = 0.04;    // white mat border
const FRAME_BORDER = 0.06; // frame molding width
const FRAME_COLOR = 0x3e2c1a; // dark wood

/**
 * Create a photo frame mesh with a texture.
 * @param {object} opts
 * @param {string} opts.textureUrl - URL for the photo texture
 * @param {number} opts.photoWidth - original photo width in pixels
 * @param {number} opts.photoHeight - original photo height in pixels
 * @param {number} opts.maxFrameWidth - max width for the frame in world units (default 1.8)
 * @param {number} opts.maxFrameHeight - max height for the frame in world units (default 1.4)
 * @returns {THREE.Group}
 */
export function createFrame({ textureUrl, photoWidth, photoHeight, maxFrameWidth = 1.8, maxFrameHeight = 1.4 }) {
  const group = new THREE.Group();

  // Calculate photo dimensions to fit within max bounds, preserving aspect ratio
  const aspect = photoWidth / photoHeight;
  let w, h;
  if (aspect > maxFrameWidth / maxFrameHeight) {
    w = maxFrameWidth;
    h = maxFrameWidth / aspect;
  } else {
    h = maxFrameHeight;
    w = maxFrameHeight * aspect;
  }

  // Photo plane
  const texture = new THREE.TextureLoader().load(textureUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  const photoMat = new THREE.MeshStandardMaterial({ map: texture });
  const photoMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), photoMat);
  photoMesh.position.z = FRAME_DEPTH / 2 + 0.001;
  group.add(photoMesh);

  // White mat (slightly larger than photo)
  const matW = w + MAT_WIDTH * 2;
  const matH = h + MAT_WIDTH * 2;
  const matMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const matMesh = new THREE.Mesh(new THREE.PlaneGeometry(matW, matH), matMat);
  matMesh.position.z = FRAME_DEPTH / 2;
  group.add(matMesh);

  // Frame border (box around the mat)
  const frameW = matW + FRAME_BORDER * 2;
  const frameH = matH + FRAME_BORDER * 2;
  const frameMat = new THREE.MeshStandardMaterial({ color: FRAME_COLOR });

  // Top
  const top = new THREE.Mesh(new THREE.BoxGeometry(frameW, FRAME_BORDER, FRAME_DEPTH), frameMat);
  top.position.set(0, matH / 2 + FRAME_BORDER / 2, 0);
  top.castShadow = true;
  group.add(top);

  // Bottom
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(frameW, FRAME_BORDER, FRAME_DEPTH), frameMat);
  bottom.position.set(0, -(matH / 2 + FRAME_BORDER / 2), 0);
  bottom.castShadow = true;
  group.add(bottom);

  // Left
  const left = new THREE.Mesh(new THREE.BoxGeometry(FRAME_BORDER, matH, FRAME_DEPTH), frameMat);
  left.position.set(-(matW / 2 + FRAME_BORDER / 2), 0, 0);
  left.castShadow = true;
  group.add(left);

  // Right
  const right = new THREE.Mesh(new THREE.BoxGeometry(FRAME_BORDER, matH, FRAME_DEPTH), frameMat);
  right.position.set(matW / 2 + FRAME_BORDER / 2, 0, 0);
  right.castShadow = true;
  group.add(right);

  // Back panel
  const backMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(frameW, frameH), backMat);
  back.position.z = -FRAME_DEPTH / 2;
  back.rotation.y = Math.PI;
  group.add(back);

  // Store total frame dimensions for placement calculations
  group.userData.frameWidth = frameW;
  group.userData.frameHeight = frameH;

  return group;
}
