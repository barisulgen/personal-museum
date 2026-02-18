# Personal Museum — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a client-side 3D virtual photo gallery where users upload photos, then walk through them in a first-person museum environment.

**Architecture:** Vanilla Three.js rendered to a full-page canvas. Vite for dev/build. Photos stored as blobs in IndexedDB via `idb`. Two UI states: a menu overlay for uploading/settings, and an immersive fullscreen tour with FPS controls. Rooms auto-generated based on photo count.

**Tech Stack:** Three.js, idb, Vite

**Design doc:** `docs/plans/2026-02-18-personal-museum-design.md`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`

**Step 1: Initialize npm project**

Run: `npm init -y`

**Step 2: Install dependencies**

Run: `npm install three idb`
Run: `npm install -D vite`

**Step 3: Create vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
});
```

**Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Personal Museum</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    #canvas { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div id="overlay"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

**Step 5: Create src/main.js with minimal Three.js scene**

A bare-bones scene with a colored background to verify everything works:

```js
import * as THREE from 'three';

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 0);
scene.add(camera);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
```

**Step 6: Add dev script to package.json**

Add to `scripts`: `"dev": "vite", "build": "vite build", "preview": "vite preview"`

**Step 7: Verify it works**

Run: `npm run dev`
Expected: Browser opens, shows dark blue canvas. No errors in console.

**Step 8: Create directory structure**

```bash
mkdir -p src/scene src/controls src/storage src/ui public/textures
```

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold project with Vite + Three.js"
```

---

### Task 2: IndexedDB Storage Layer

**Files:**
- Create: `src/storage/db.js`
- Create: `src/storage/db.test.js`

**Step 1: Write tests for the storage layer**

Create `src/storage/db.test.js`. Use Vitest with `fake-indexeddb` for testing:

Run: `npm install -D vitest fake-indexeddb`

```js
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDB, savePhoto, getAllPhotos, getPhotoCount, clearAllPhotos } from './db.js';

describe('photo storage', () => {
  beforeEach(async () => {
    // Delete the database before each test for isolation
    indexedDB.deleteDatabase('personal-museum');
  });

  it('should initialize the database', async () => {
    const db = await initDB();
    expect(db).toBeDefined();
    db.close();
  });

  it('should save and retrieve a photo', async () => {
    const blob = new Blob(['fake-image'], { type: 'image/png' });
    const photo = { blob, name: 'test.png', width: 800, height: 600 };

    await savePhoto(photo);
    const photos = await getAllPhotos();

    expect(photos).toHaveLength(1);
    expect(photos[0].name).toBe('test.png');
    expect(photos[0].width).toBe(800);
    expect(photos[0].height).toBe(600);
    expect(photos[0].blob).toBeInstanceOf(Blob);
    expect(photos[0].id).toBeDefined();
    expect(photos[0].addedAt).toBeDefined();
  });

  it('should save multiple photos and return all', async () => {
    const blob = new Blob(['fake'], { type: 'image/png' });
    await savePhoto({ blob, name: 'a.png', width: 100, height: 100 });
    await savePhoto({ blob, name: 'b.png', width: 200, height: 200 });
    await savePhoto({ blob, name: 'c.png', width: 300, height: 300 });

    const photos = await getAllPhotos();
    expect(photos).toHaveLength(3);
  });

  it('should return photo count', async () => {
    const blob = new Blob(['fake'], { type: 'image/png' });
    expect(await getPhotoCount()).toBe(0);

    await savePhoto({ blob, name: 'a.png', width: 100, height: 100 });
    expect(await getPhotoCount()).toBe(1);

    await savePhoto({ blob, name: 'b.png', width: 200, height: 200 });
    expect(await getPhotoCount()).toBe(2);
  });

  it('should clear all photos', async () => {
    const blob = new Blob(['fake'], { type: 'image/png' });
    await savePhoto({ blob, name: 'a.png', width: 100, height: 100 });
    await savePhoto({ blob, name: 'b.png', width: 200, height: 200 });

    await clearAllPhotos();
    expect(await getPhotoCount()).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Add to `package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`

Run: `npx vitest run src/storage/db.test.js`
Expected: FAIL — module `./db.js` has no exports

**Step 3: Implement the storage layer**

Create `src/storage/db.js`:

```js
import { openDB } from 'idb';

const DB_NAME = 'personal-museum';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

let dbInstance = null;

export async function initDB() {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
  return dbInstance;
}

export async function savePhoto({ blob, name, width, height }) {
  const db = await initDB();
  const record = {
    blob,
    name,
    width,
    height,
    addedAt: Date.now(),
  };
  const id = await db.add(STORE_NAME, record);
  return { ...record, id };
}

export async function getAllPhotos() {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function getPhotoCount() {
  const db = await initDB();
  return db.count(STORE_NAME);
}

export async function clearAllPhotos() {
  const db = await initDB();
  return db.clear(STORE_NAME);
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/storage/db.test.js`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/storage/db.js src/storage/db.test.js package.json package-lock.json
git commit -m "feat: add IndexedDB storage layer for photos"
```

---

### Task 3: Upload Handling

**Files:**
- Create: `src/ui/upload.js`

**Step 1: Implement upload handler**

This module handles file input, reads image dimensions, and stores photos in IndexedDB.

```js
import { savePhoto, getPhotoCount } from '../storage/db.js';

const MAX_TEXTURE_SIZE = 2048;

/**
 * Read image dimensions from a File/Blob.
 * Returns { width, height }.
 */
async function getImageDimensions(file) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  bitmap.close();
  return { width, height };
}

/**
 * Process and save uploaded files.
 * Accepts a FileList from an <input type="file">.
 * Returns the new total photo count.
 */
export async function handleUpload(fileList) {
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) continue;
    const { width, height } = await getImageDimensions(file);
    await savePhoto({ blob: file, name: file.name, width, height });
  }
  return getPhotoCount();
}
```

**Step 2: Verify manually**

Will be tested through the overlay UI in the next task.

**Step 3: Commit**

```bash
git add src/ui/upload.js
git commit -m "feat: add photo upload handler with dimension reading"
```

---

### Task 4: Menu Overlay UI

**Files:**
- Create: `src/ui/overlay.js`
- Modify: `index.html` (add overlay styles)
- Modify: `src/main.js` (import overlay)

**Step 1: Add overlay styles to index.html**

Add inside `<style>` after existing rules:

```css
#overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  background: rgba(0, 0, 0, 0.5);
}

#overlay.hidden {
  display: none;
}

.menu-panel {
  text-align: center;
  color: #e0d6c8;
  font-family: 'Georgia', 'Times New Roman', serif;
  max-width: 420px;
  padding: 48px 40px;
  background: rgba(20, 18, 15, 0.85);
  border: 1px solid rgba(180, 160, 130, 0.3);
  border-radius: 4px;
}

.menu-panel h1 {
  font-size: 28px;
  font-weight: 400;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 8px;
  color: #f0e6d6;
}

.menu-panel .subtitle {
  font-size: 13px;
  letter-spacing: 2px;
  color: #a09080;
  margin-bottom: 36px;
}

.menu-panel button {
  display: block;
  width: 100%;
  padding: 12px 24px;
  margin: 8px 0;
  font-family: 'Georgia', serif;
  font-size: 15px;
  letter-spacing: 1px;
  border: 1px solid rgba(180, 160, 130, 0.4);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
  color: #e0d6c8;
}

.menu-panel button:hover {
  background: rgba(180, 160, 130, 0.15);
  border-color: rgba(180, 160, 130, 0.7);
}

.menu-panel button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.menu-panel button:disabled:hover {
  background: transparent;
  border-color: rgba(180, 160, 130, 0.4);
}

.menu-panel .photo-count {
  font-size: 13px;
  color: #a09080;
  margin: 16px 0;
  letter-spacing: 1px;
}

.menu-panel .mute-btn {
  width: auto;
  display: inline-block;
  padding: 8px 16px;
  font-size: 13px;
  margin-top: 24px;
}

/* Hidden file input */
#file-input { display: none; }
```

**Step 2: Implement overlay.js**

```js
import { handleUpload } from './upload.js';
import { getPhotoCount } from '../storage/db.js';

let onStartTour = null;
let photoCount = 0;

export function initOverlay({ onStart }) {
  onStartTour = onStart;
  const overlay = document.getElementById('overlay');

  overlay.innerHTML = `
    <div class="menu-panel">
      <h1>Personal Museum</h1>
      <p class="subtitle">A private gallery for your photographs</p>
      <button id="upload-btn">Upload Photos</button>
      <input type="file" id="file-input" accept="image/*" multiple />
      <p class="photo-count" id="photo-count"></p>
      <button id="start-btn" disabled>Start the Tour</button>
      <button class="mute-btn" id="mute-btn">♪ Music: On</button>
    </div>
  `;

  const uploadBtn = document.getElementById('upload-btn');
  const fileInput = document.getElementById('file-input');
  const startBtn = document.getElementById('start-btn');
  const muteBtn = document.getElementById('mute-btn');

  uploadBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length === 0) return;
    photoCount = await handleUpload(e.target.files);
    updatePhotoCount();
    e.target.value = '';
  });

  startBtn.addEventListener('click', () => {
    if (photoCount > 0 && onStartTour) {
      onStartTour();
    }
  });

  // Mute toggle
  const muted = localStorage.getItem('museum-muted') === 'true';
  updateMuteBtn(muteBtn, muted);

  muteBtn.addEventListener('click', () => {
    const isMuted = localStorage.getItem('museum-muted') === 'true';
    const newMuted = !isMuted;
    localStorage.setItem('museum-muted', String(newMuted));
    updateMuteBtn(muteBtn, newMuted);
    document.dispatchEvent(new CustomEvent('museum-mute-toggle', { detail: { muted: newMuted } }));
  });

  // Load initial count
  getPhotoCount().then((count) => {
    photoCount = count;
    updatePhotoCount();
  });
}

function updatePhotoCount() {
  const el = document.getElementById('photo-count');
  const startBtn = document.getElementById('start-btn');
  if (photoCount === 0) {
    el.textContent = 'No photos yet';
  } else {
    el.textContent = `${photoCount} photo${photoCount !== 1 ? 's' : ''} uploaded`;
  }
  startBtn.disabled = photoCount === 0;
}

function updateMuteBtn(btn, muted) {
  btn.textContent = muted ? '♪ Music: Off' : '♪ Music: On';
}

export function showOverlay() {
  document.getElementById('overlay').classList.remove('hidden');
  // Refresh photo count when returning to menu
  getPhotoCount().then((count) => {
    photoCount = count;
    updatePhotoCount();
  });
}

export function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}
```

**Step 3: Wire overlay into main.js**

Update `src/main.js` to import and init the overlay:

```js
import * as THREE from 'three';
import { initOverlay, showOverlay, hideOverlay } from './ui/overlay.js';

// ... existing renderer/scene/camera setup ...

initOverlay({
  onStart: () => {
    hideOverlay();
    // Tour entry logic will be added in later tasks
    console.log('Starting tour...');
  },
});
```

**Step 4: Verify manually**

Run: `npm run dev`
Expected: Menu overlay visible over dark canvas. Upload button opens file picker. Photo count updates after uploading. Start button enables when photos exist.

**Step 5: Commit**

```bash
git add index.html src/ui/overlay.js src/main.js
git commit -m "feat: add menu overlay UI with upload and start tour"
```

---

### Task 5: Background Music

**Files:**
- Create: `src/ui/audio.js`
- Modify: `index.html` (add audio element)

**Step 1: Add audio element to index.html**

Add before `</body>`:

```html
<audio id="bg-music" loop preload="auto">
  <source src="/music.mp3" type="audio/mpeg" />
</audio>
```

**Step 2: Implement audio.js**

```js
let audioEl = null;

export function initAudio() {
  audioEl = document.getElementById('bg-music');
  const muted = localStorage.getItem('museum-muted') === 'true';
  audioEl.muted = muted;
  audioEl.volume = 0.4;

  // Listen for mute toggle from overlay
  document.addEventListener('museum-mute-toggle', (e) => {
    audioEl.muted = e.detail.muted;
  });

  // Start playback on first user interaction
  const startOnInteraction = () => {
    audioEl.play().catch(() => {});
    document.removeEventListener('click', startOnInteraction);
    document.removeEventListener('keydown', startOnInteraction);
  };
  document.addEventListener('click', startOnInteraction);
  document.addEventListener('keydown', startOnInteraction);
}
```

**Step 3: Wire into main.js**

Add to `src/main.js`:

```js
import { initAudio } from './ui/audio.js';
// After initOverlay:
initAudio();
```

**Step 4: Verify manually**

Place any MP3 at `public/music.mp3`. Run `npm run dev`. Click anywhere — music should start. Mute button should toggle it. Refresh — mute preference should persist.

**Step 5: Commit**

```bash
git add src/ui/audio.js index.html src/main.js
git commit -m "feat: add background music with mute toggle and persistence"
```

---

### Task 6: Single Room Builder

**Files:**
- Create: `src/scene/room.js`

**Step 1: Implement room.js**

This module creates a single rectangular room (walls, floor, ceiling) as a Three.js Group. Walls are individual planes so we can create doorway openings later. Each wall is tagged with metadata for frame placement.

```js
import * as THREE from 'three';

const WALL_COLOR = 0xf5f0e8;     // warm off-white
const FLOOR_COLOR = 0x3b2f1e;    // dark hardwood
const CEILING_COLOR = 0xfaf6f0;  // slightly lighter than walls
const BASEBOARD_COLOR = 0x2a2018; // dark strip

/**
 * Create a single room.
 * @param {object} opts
 * @param {number} opts.width   - room width (X axis)
 * @param {number} opts.depth   - room depth (Z axis)
 * @param {number} opts.height  - room height (Y axis)
 * @param {Array}  opts.doorways - array of { wall: 'north'|'south'|'east'|'west', position: number, width: number }
 * @returns {{ group: THREE.Group, wallSegments: Array<{ mesh, wall, start, end }> }}
 */
export function createRoom({ width, depth, height, doorways = [] }) {
  const group = new THREE.Group();
  const wallSegments = [];
  const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR });
  const ceilMat = new THREE.MeshStandardMaterial({ color: CEILING_COLOR });
  const baseboardMat = new THREE.MeshStandardMaterial({ color: BASEBOARD_COLOR });

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;
  group.add(ceiling);

  // Build walls with doorway cutouts
  const wallDefs = [
    { name: 'north', axis: 'x', pos: [0, height / 2, -depth / 2], rot: [0, 0, 0], length: width },
    { name: 'south', axis: 'x', pos: [0, height / 2, depth / 2], rot: [0, Math.PI, 0], length: width },
    { name: 'east',  axis: 'z', pos: [width / 2, height / 2, 0], rot: [0, -Math.PI / 2, 0], length: depth },
    { name: 'west',  axis: 'z', pos: [-width / 2, height / 2, 0], rot: [0, Math.PI / 2, 0], length: depth },
  ];

  for (const wallDef of wallDefs) {
    const wallDoorways = doorways.filter((d) => d.wall === wallDef.name);
    const segments = splitWallByDoorways(wallDef.length, height, wallDoorways);

    for (const seg of segments) {
      if (seg.isDoorway) continue;

      const geom = new THREE.PlaneGeometry(seg.width, height);
      const mesh = new THREE.Mesh(geom, wallMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Position relative to wall center
      const offset = seg.center - wallDef.length / 2;
      if (wallDef.axis === 'x') {
        mesh.position.set(wallDef.pos[0] + offset, wallDef.pos[1], wallDef.pos[2]);
      } else {
        mesh.position.set(wallDef.pos[0], wallDef.pos[1], wallDef.pos[2] + offset);
      }
      mesh.rotation.set(...wallDef.rot);

      group.add(mesh);
      wallSegments.push({ mesh, wall: wallDef.name, segWidth: seg.width });

      // Baseboard
      const bbGeom = new THREE.PlaneGeometry(seg.width, 0.12);
      const bb = new THREE.Mesh(bbGeom, baseboardMat);
      bb.position.copy(mesh.position);
      bb.position.y = 0.06;
      bb.rotation.copy(mesh.rotation);
      group.add(bb);
    }

    // Doorway frame (top piece above opening)
    for (const dw of wallDoorways) {
      const topH = height - dw.height;
      if (topH <= 0) continue;
      const geom = new THREE.PlaneGeometry(dw.width, topH);
      const mesh = new THREE.Mesh(geom, wallMat);
      const offset = dw.position - wallDef.length / 2;
      if (wallDef.axis === 'x') {
        mesh.position.set(wallDef.pos[0] + offset, dw.height + topH / 2, wallDef.pos[2]);
      } else {
        mesh.position.set(wallDef.pos[0], dw.height + topH / 2, wallDef.pos[2] + offset);
      }
      mesh.rotation.set(...wallDef.rot);
      group.add(mesh);
    }
  }

  return { group, wallSegments };
}

/**
 * Split a wall into solid segments and doorway gaps.
 */
function splitWallByDoorways(wallLength, wallHeight, doorways) {
  if (doorways.length === 0) {
    return [{ width: wallLength, center: wallLength / 2, isDoorway: false }];
  }

  // Sort doorways by position
  const sorted = [...doorways].sort((a, b) => (a.position - a.width / 2) - (b.position - b.width / 2));
  const segments = [];
  let cursor = 0;

  for (const dw of sorted) {
    const dwStart = dw.position - dw.width / 2;
    const dwEnd = dw.position + dw.width / 2;
    dw.height = dw.height || 2.8; // default doorway height

    if (dwStart > cursor) {
      const w = dwStart - cursor;
      segments.push({ width: w, center: cursor + w / 2, isDoorway: false });
    }
    segments.push({ width: dw.width, center: dw.position, isDoorway: true });
    cursor = dwEnd;
  }

  if (cursor < wallLength) {
    const w = wallLength - cursor;
    segments.push({ width: w, center: cursor + w / 2, isDoorway: false });
  }

  return segments;
}
```

**Step 2: Verify manually**

Add a test room to `main.js` temporarily:

```js
import { createRoom } from './scene/room.js';
const { group } = createRoom({ width: 10, depth: 8, height: 4, doorways: [] });
scene.add(group);
```

Run: `npm run dev`. Expected: A closed room visible around the camera.

**Step 3: Commit**

```bash
git add src/scene/room.js src/main.js
git commit -m "feat: add room builder with walls, floor, ceiling, and doorway support"
```

---

### Task 7: Photo Frame Builder

**Files:**
- Create: `src/scene/frame.js`

**Step 1: Implement frame.js**

```js
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
```

**Step 2: Commit**

```bash
git add src/scene/frame.js
git commit -m "feat: add photo frame builder with aspect-ratio-preserving layout"
```

---

### Task 8: Lighting

**Files:**
- Create: `src/scene/lighting.js`

**Step 1: Implement lighting.js**

```js
import * as THREE from 'three';

/**
 * Add ambient + foyer lighting to the scene.
 */
export function createAmbientLighting(scene) {
  const ambient = new THREE.AmbientLight(0xfff5e6, 0.3);
  scene.add(ambient);
}

/**
 * Create a warm point light for the foyer (chandelier effect).
 */
export function createFoyerLight(foyerGroup, height) {
  const light = new THREE.PointLight(0xffe8c8, 1.5, 20, 1);
  light.position.set(0, height - 0.5, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  foyerGroup.add(light);
}

/**
 * Create a spot light aimed at a photo frame.
 * @param {THREE.Vector3} framePosition - world position of the frame
 * @param {string} wallDirection - which wall the frame is on: 'north','south','east','west'
 * @param {number} ceilingHeight - room ceiling height
 * @returns {THREE.SpotLight}
 */
export function createFrameSpotlight(framePosition, wallDirection, ceilingHeight) {
  const light = new THREE.SpotLight(0xfff5e6, 1.2, 8, Math.PI / 8, 0.5, 1);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);

  // Position light on ceiling, offset from wall toward room center
  const offset = 1.5;
  const lightPos = framePosition.clone();
  lightPos.y = ceilingHeight - 0.1;

  switch (wallDirection) {
    case 'north': lightPos.z += offset; break;
    case 'south': lightPos.z -= offset; break;
    case 'east':  lightPos.x -= offset; break;
    case 'west':  lightPos.x += offset; break;
  }

  light.position.copy(lightPos);
  light.target.position.copy(framePosition);

  return light;
}
```

**Step 2: Commit**

```bash
git add src/scene/lighting.js
git commit -m "feat: add museum lighting — ambient, foyer chandelier, frame spotlights"
```

---

### Task 9: Layout Generator

**Files:**
- Create: `src/scene/layout.js`
- Create: `src/scene/layout.test.js`

**Step 1: Write tests for layout logic**

```js
import { describe, it, expect } from 'vitest';
import { computeLayout } from './layout.js';

describe('computeLayout', () => {
  it('should return just a foyer for 0 photos', () => {
    const layout = computeLayout(0);
    expect(layout.rooms).toHaveLength(1);
    expect(layout.rooms[0].type).toBe('foyer');
  });

  it('should create 1 gallery room for a small number of photos', () => {
    const layout = computeLayout(5);
    expect(layout.rooms).toHaveLength(2); // foyer + 1 gallery
    expect(layout.rooms[1].type).toBe('gallery');
    expect(layout.rooms[1].photoSlots).toBe(5);
  });

  it('should create multiple gallery rooms when photos exceed capacity', () => {
    const layout = computeLayout(20);
    expect(layout.rooms.length).toBeGreaterThan(2);
    const totalSlots = layout.rooms
      .filter((r) => r.type === 'gallery')
      .reduce((sum, r) => sum + r.photoSlots, 0);
    expect(totalSlots).toBeGreaterThanOrEqual(20);
  });

  it('should connect rooms with doorways', () => {
    const layout = computeLayout(10);
    for (let i = 0; i < layout.rooms.length - 1; i++) {
      const room = layout.rooms[i];
      expect(room.doorways.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should position rooms so they do not overlap', () => {
    const layout = computeLayout(40);
    for (let i = 0; i < layout.rooms.length; i++) {
      for (let j = i + 1; j < layout.rooms.length; j++) {
        const a = layout.rooms[i];
        const b = layout.rooms[j];
        // Check no center overlap (rooms are on a grid)
        const samePos = a.position.x === b.position.x && a.position.z === b.position.z;
        expect(samePos).toBe(false);
      }
    }
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/scene/layout.test.js`
Expected: FAIL — no `computeLayout` export

**Step 3: Implement layout.js**

```js
const GALLERY_WIDTH = 10;
const GALLERY_DEPTH = 8;
const GALLERY_HEIGHT = 4;
const FOYER_WIDTH = 14;
const FOYER_DEPTH = 12;
const FOYER_HEIGHT = 6;
const FRAMES_PER_ROOM = 8;
const DOORWAY_WIDTH = 2.4;
const DOORWAY_HEIGHT = 2.8;

/**
 * Compute the museum layout given a number of photos.
 * Returns an array of room descriptors with positions, dimensions, doorways, and frame assignments.
 */
export function computeLayout(photoCount) {
  const rooms = [];

  // Direction vectors for zigzag: south, east, south, west, south, east...
  const directions = [
    { dx: 0, dz: 1, from: 'north', to: 'south' },  // south
    { dx: 1, dz: 0, from: 'west', to: 'east' },     // east
    { dx: 0, dz: 1, from: 'north', to: 'south' },   // south
    { dx: -1, dz: 0, from: 'east', to: 'west' },    // west
  ];

  // Foyer
  const foyer = {
    type: 'foyer',
    width: FOYER_WIDTH,
    depth: FOYER_DEPTH,
    height: FOYER_HEIGHT,
    position: { x: 0, z: 0 },
    doorways: [],
    photoSlots: 0,
  };

  rooms.push(foyer);

  if (photoCount === 0) return { rooms };

  // Calculate number of gallery rooms needed
  const galleryCount = Math.ceil(photoCount / FRAMES_PER_ROOM);

  // Add doorway from foyer south wall to first gallery
  foyer.doorways.push({
    wall: 'south',
    position: FOYER_WIDTH / 2, // center of wall
    width: DOORWAY_WIDTH,
    height: DOORWAY_HEIGHT,
  });

  let curX = 0;
  let curZ = FOYER_DEPTH / 2 + GALLERY_DEPTH / 2; // first gallery is directly south of foyer
  let photosRemaining = photoCount;

  for (let i = 0; i < galleryCount; i++) {
    const slotsInThisRoom = Math.min(photosRemaining, FRAMES_PER_ROOM);
    const room = {
      type: 'gallery',
      width: GALLERY_WIDTH,
      depth: GALLERY_DEPTH,
      height: GALLERY_HEIGHT,
      position: { x: curX, z: curZ },
      doorways: [],
      photoSlots: slotsInThisRoom,
    };

    // Doorway connecting from previous room
    const dirIndex = i % directions.length;
    const dir = directions[dirIndex];
    room.doorways.push({
      wall: dir.from,
      position: (dir.from === 'north' || dir.from === 'south') ? GALLERY_WIDTH / 2 : GALLERY_DEPTH / 2,
      width: DOORWAY_WIDTH,
      height: DOORWAY_HEIGHT,
    });

    // Doorway to next room (if not the last)
    if (i < galleryCount - 1) {
      const nextDirIndex = (i + 1) % directions.length;
      const nextDir = directions[nextDirIndex];
      room.doorways.push({
        wall: nextDir.from === 'north' ? 'south' :
              nextDir.from === 'south' ? 'north' :
              nextDir.from === 'east' ? 'west' : 'east',
        position: (nextDir.from === 'north' || nextDir.from === 'south') ? GALLERY_WIDTH / 2 : GALLERY_DEPTH / 2,
        width: DOORWAY_WIDTH,
        height: DOORWAY_HEIGHT,
      });

      // Also add doorway to previous room's exit
      if (rooms.length > 0) {
        const prevRoom = rooms[rooms.length - 1];
        if (prevRoom.type === 'gallery') {
          prevRoom.doorways.push({
            wall: dir.to === 'south' ? 'south' : dir.to === 'east' ? 'east' : dir.to === 'west' ? 'west' : 'north',
            position: (dir.to === 'north' || dir.to === 'south') ? GALLERY_WIDTH / 2 : GALLERY_DEPTH / 2,
            width: DOORWAY_WIDTH,
            height: DOORWAY_HEIGHT,
          });
        }
      }
    }

    rooms.push(room);
    photosRemaining -= slotsInThisRoom;

    // Move to next position
    if (i < galleryCount - 1) {
      const nextDir = directions[(i + 1) % directions.length];
      curX += nextDir.dx * GALLERY_WIDTH;
      curZ += nextDir.dz * GALLERY_DEPTH;
    }
  }

  return { rooms };
}

export { FRAMES_PER_ROOM, GALLERY_WIDTH, GALLERY_DEPTH, GALLERY_HEIGHT, FOYER_WIDTH, FOYER_DEPTH, FOYER_HEIGHT, DOORWAY_WIDTH, DOORWAY_HEIGHT };
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/scene/layout.test.js`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/scene/layout.js src/scene/layout.test.js
git commit -m "feat: add room layout generator with zigzag room placement"
```

---

### Task 10: Foyer Builder

**Files:**
- Create: `src/scene/foyer.js`

**Step 1: Implement foyer.js**

The foyer creates the grand entrance room with welcome text and exhibit info using canvas-rendered textures.

```js
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
```

**Step 2: Commit**

```bash
git add src/scene/foyer.js
git commit -m "feat: add foyer builder with welcome text, bench, and chandelier"
```

---

### Task 11: Museum Assembly

**Files:**
- Create: `src/scene/museum.js`

**Step 1: Implement museum.js**

This is the top-level module that assembles the entire museum from the layout, rooms, frames, and lighting.

```js
import * as THREE from 'three';
import { computeLayout } from './layout.js';
import { createRoom } from './room.js';
import { createFoyer } from './foyer.js';
import { createFrame } from './frame.js';
import { createAmbientLighting, createFrameSpotlight } from './lighting.js';
import { getAllPhotos } from '../storage/db.js';

/**
 * Build the entire museum scene.
 * @returns {{ museumGroup: THREE.Group, collisionMeshes: THREE.Mesh[] }}
 */
export async function buildMuseum() {
  const photos = await getAllPhotos();
  const layout = computeLayout(photos.length);
  const museumGroup = new THREE.Group();
  const collisionMeshes = [];

  // Ambient lighting
  createAmbientLighting(museumGroup);

  // Fog
  // (will be set on the scene directly in main.js)

  let photoIndex = 0;

  for (const roomDesc of layout.rooms) {
    let roomGroup;

    if (roomDesc.type === 'foyer') {
      roomGroup = createFoyer(photos.length, roomDesc);
      museumGroup.add(roomGroup);
      // Collect wall meshes for collision
      // Foyer walls are inside the group — traverse
      roomGroup.traverse((child) => {
        if (child.isMesh && child.geometry.type === 'PlaneGeometry') {
          // Check if it's a wall (vertical plane)
          const isFloor = Math.abs(child.rotation.x) > 0.1;
          if (!isFloor) collisionMeshes.push(child);
        }
      });
      continue;
    }

    // Gallery room
    const { group, wallSegments } = createRoom({
      width: roomDesc.width,
      depth: roomDesc.depth,
      height: roomDesc.height,
      doorways: roomDesc.doorways,
    });

    group.position.set(roomDesc.position.x, 0, roomDesc.position.z);

    // Place photo frames on wall segments
    const frameable = wallSegments.filter((ws) => ws.segWidth >= 2.2); // min width to fit a frame
    let framesPlaced = 0;

    for (const ws of frameable) {
      if (framesPlaced >= roomDesc.photoSlots || photoIndex >= photos.length) break;

      const framesOnWall = ws.segWidth >= 5 ? 2 : 1;

      for (let f = 0; f < framesOnWall; f++) {
        if (framesPlaced >= roomDesc.photoSlots || photoIndex >= photos.length) break;

        const photo = photos[photoIndex];
        const url = URL.createObjectURL(photo.blob);
        const frame = createFrame({
          textureUrl: url,
          photoWidth: photo.width,
          photoHeight: photo.height,
        });

        // Position frame on the wall
        const framePos = ws.mesh.position.clone();
        // Offset along wall for multiple frames
        if (framesOnWall === 2) {
          const offsetAmount = ws.segWidth / 4;
          if (ws.wall === 'north' || ws.wall === 'south') {
            framePos.x += (f === 0 ? -offsetAmount : offsetAmount);
          } else {
            framePos.z += (f === 0 ? -offsetAmount : offsetAmount);
          }
        }
        framePos.y = 1.6; // eye height

        frame.position.copy(framePos);
        frame.rotation.copy(ws.mesh.rotation);

        // Push frame slightly off the wall
        const wallNormal = new THREE.Vector3(0, 0, 1).applyEuler(ws.mesh.rotation);
        frame.position.add(wallNormal.multiplyScalar(0.03));

        group.add(frame);

        // Spotlight for this frame
        const worldFramePos = framePos.clone().add(group.position);
        const spotlight = createFrameSpotlight(worldFramePos, ws.wall, roomDesc.height);
        group.add(spotlight);
        group.add(spotlight.target);

        photoIndex++;
        framesPlaced++;
      }
    }

    // Collect wall meshes for collision
    for (const ws of wallSegments) {
      collisionMeshes.push(ws.mesh);
    }

    museumGroup.add(group);
  }

  return { museumGroup, collisionMeshes, objectUrls: photos.map((p) => URL.createObjectURL(p.blob)) };
}
```

**Step 2: Commit**

```bash
git add src/scene/museum.js
git commit -m "feat: add museum assembler — combines layout, rooms, frames, and lighting"
```

---

### Task 12: FPS Player Controls

**Files:**
- Create: `src/controls/player.js`

**Step 1: Implement player.js**

```js
import * as THREE from 'three';

const MOVE_SPEED = 3.0;
const MOUSE_SENSITIVITY = 0.002;
const PLAYER_HEIGHT = 1.6;
const PITCH_LIMIT = Math.PI * 0.47; // ~85 degrees

/**
 * FPS player controller using Pointer Lock API.
 */
export class PlayerController {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isLocked = false;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onLockChange = this._onLockChange.bind(this);

    document.addEventListener('pointerlockchange', this._onLockChange);
  }

  lock() {
    this.canvas.requestPointerLock();
  }

  unlock() {
    document.exitPointerLock();
  }

  _onLockChange() {
    if (document.pointerLockElement === this.canvas) {
      this.isLocked = true;
      document.addEventListener('mousemove', this._onMouseMove);
      document.addEventListener('keydown', this._onKeyDown);
      document.addEventListener('keyup', this._onKeyUp);
    } else {
      this.isLocked = false;
      document.removeEventListener('mousemove', this._onMouseMove);
      document.removeEventListener('keydown', this._onKeyDown);
      document.removeEventListener('keyup', this._onKeyUp);
      this.moveForward = this.moveBackward = this.moveLeft = this.moveRight = false;
    }
  }

  _onMouseMove(e) {
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= e.movementX * MOUSE_SENSITIVITY;
    this.euler.x -= e.movementY * MOUSE_SENSITIVITY;
    this.euler.x = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  }

  _onKeyDown(e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    this.moveForward = true; break;
      case 'KeyS': case 'ArrowDown':  this.moveBackward = true; break;
      case 'KeyA': case 'ArrowLeft':  this.moveLeft = true; break;
      case 'KeyD': case 'ArrowRight': this.moveRight = true; break;
    }
  }

  _onKeyUp(e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    this.moveForward = false; break;
      case 'KeyS': case 'ArrowDown':  this.moveBackward = false; break;
      case 'KeyA': case 'ArrowLeft':  this.moveLeft = false; break;
      case 'KeyD': case 'ArrowRight': this.moveRight = false; break;
    }
  }

  /**
   * Update player position. Call once per frame.
   * @param {number} delta - time since last frame in seconds
   * @param {function} collisionCheck - (newPosition: Vector3) => boolean, returns true if blocked
   */
  update(delta, collisionCheck) {
    if (!this.isLocked) return;

    this.direction.set(0, 0, 0);
    if (this.moveForward) this.direction.z -= 1;
    if (this.moveBackward) this.direction.z += 1;
    if (this.moveLeft) this.direction.x -= 1;
    if (this.moveRight) this.direction.x += 1;
    this.direction.normalize();

    // Transform direction to camera's yaw orientation (ignore pitch)
    const yaw = this.euler.y;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const worldDir = new THREE.Vector3(
      this.direction.x * cos - this.direction.z * sin,
      0,
      this.direction.x * sin + this.direction.z * cos
    );

    const step = worldDir.multiplyScalar(MOVE_SPEED * delta);
    const newPos = this.camera.position.clone().add(step);
    newPos.y = PLAYER_HEIGHT;

    if (!collisionCheck || !collisionCheck(newPos)) {
      this.camera.position.copy(newPos);
    } else {
      // Try sliding along X only
      const slideX = this.camera.position.clone();
      slideX.x = newPos.x;
      if (!collisionCheck(slideX)) {
        this.camera.position.copy(slideX);
      }
      // Try sliding along Z only
      const slideZ = this.camera.position.clone();
      slideZ.z = newPos.z;
      if (!collisionCheck(slideZ)) {
        this.camera.position.copy(slideZ);
      }
    }
  }

  dispose() {
    document.removeEventListener('pointerlockchange', this._onLockChange);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
  }
}
```

**Step 2: Commit**

```bash
git add src/controls/player.js
git commit -m "feat: add FPS player controller with WASD, mouse look, and wall sliding"
```

---

### Task 13: Collision Detection

**Files:**
- Create: `src/controls/collision.js`

**Step 1: Implement collision.js**

```js
import * as THREE from 'three';

const COLLISION_RADIUS = 0.4;

/**
 * Create a collision checker against a set of wall meshes.
 * Uses raycasting in 8 directions to detect nearby walls.
 * @param {THREE.Mesh[]} wallMeshes - array of wall meshes to collide with
 * @returns {function} collisionCheck(position: Vector3) => boolean
 */
export function createCollisionChecker(wallMeshes) {
  const raycaster = new THREE.Raycaster();
  raycaster.far = COLLISION_RADIUS;

  // 8 horizontal directions
  const directions = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    directions.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
  }

  return function collisionCheck(position) {
    for (const dir of directions) {
      raycaster.set(position, dir);
      const hits = raycaster.intersectObjects(wallMeshes, true);
      if (hits.length > 0) return true;
    }
    return false;
  };
}
```

**Step 2: Commit**

```bash
git add src/controls/collision.js
git commit -m "feat: add raycasting collision detection against wall meshes"
```

---

### Task 14: Wire Everything Together in main.js

**Files:**
- Modify: `src/main.js`

**Step 1: Rewrite main.js to integrate all modules**

```js
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

  // Build museum
  if (museumGroup) {
    scene.remove(museumGroup);
  }
  const result = await buildMuseum();
  museumGroup = result.museumGroup;
  scene.add(museumGroup);
  collisionCheck = createCollisionChecker(result.collisionMeshes);

  // Reset player to foyer center
  camera.position.set(0, 1.6, 0);
  camera.rotation.set(0, 0, 0);

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
```

**Step 2: Verify manually**

Run: `npm run dev`
Expected: Menu overlay appears. Upload photos. Click "Start the Tour". Fullscreen activates, you're inside the foyer, can walk with WASD, look with mouse, ESC returns to menu.

**Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: wire up museum assembly, player controls, and tour flow in main.js"
```

---

### Task 15: Polish & Final Touches

**Files:**
- Modify: `index.html` (add favicon, meta tags)
- Create: `public/textures/.gitkeep`

**Step 1: Add meta tags and favicon placeholder**

In `index.html` `<head>`, add:

```html
<meta name="description" content="A personal 3D virtual photo gallery" />
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏛️</text></svg>" />
```

**Step 2: Create texture placeholder**

```bash
touch public/textures/.gitkeep
```

**Step 3: Final manual verification**

Run: `npm run dev`
Checklist:
- [ ] Menu loads with title, upload, mute, start button
- [ ] Upload accepts multiple images
- [ ] Photo count updates after upload
- [ ] Start button enables after upload
- [ ] Tour enters fullscreen + pointer lock
- [ ] WASD movement works
- [ ] Mouse look works
- [ ] Foyer has welcome text and bench
- [ ] Gallery rooms have photo frames on walls
- [ ] Frame spotlights illuminate photos
- [ ] ESC exits tour back to menu
- [ ] Music plays and mute persists
- [ ] No console errors

**Step 4: Build check**

Run: `npm run build`
Expected: Build succeeds, output in `dist/`

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add meta tags, favicon, and finalize Personal Museum v1"
```
