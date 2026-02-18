import * as THREE from 'three';

const WALL_COLOR = 0xf5f0e8;     // warm off-white
const FLOOR_COLOR = 0x3b2f1e;    // dark hardwood
const CEILING_COLOR = 0xfaf6f0;  // slightly lighter than walls
const BASEBOARD_COLOR = 0x2a2018; // dark strip
const WALL_THICKNESS = 0.2;      // 20cm thick walls

/**
 * Create a single room.
 * @param {object} opts
 * @param {number} opts.width   - room width (X axis)
 * @param {number} opts.depth   - room depth (Z axis)
 * @param {number} opts.height  - room height (Y axis)
 * @param {Array}  opts.doorways - array of { wall: 'north'|'south'|'east'|'west', position: number, width: number }
 * @returns {{ group: THREE.Group, wallSegments: Array<{ mesh, wall, segWidth }> }}
 */
export function createRoom({ width, depth, height, doorways = [] }) {
  const group = new THREE.Group();
  const wallSegments = [];
  const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR });
  const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, side: THREE.DoubleSide });
  const ceilMat = new THREE.MeshStandardMaterial({ color: CEILING_COLOR, side: THREE.DoubleSide });
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

      const geom = new THREE.BoxGeometry(seg.width, height, WALL_THICKNESS);
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

      // Baseboard (slightly thicker than wall so it protrudes, raised above floor)
      const bbGeom = new THREE.BoxGeometry(seg.width, 0.10, WALL_THICKNESS + 0.03);
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
      const geom = new THREE.BoxGeometry(dw.width, topH, WALL_THICKNESS);
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
