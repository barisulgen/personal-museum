import * as THREE from 'three';
import { computeLayout } from './layout.js';
import { createRoom } from './room.js';
import { createFoyer } from './foyer.js';
import { createFrame } from './frame.js';
import { createAmbientLighting, createFrameSpotlight } from './lighting.js';
import { getAllPhotos } from '../storage/db.js';

/**
 * Build the entire museum scene.
 * @returns {{ museumGroup: THREE.Group, collisionMeshes: THREE.Mesh[], objectUrls: string[] }}
 */
export async function buildMuseum() {
  const photos = await getAllPhotos();
  const layout = computeLayout(photos.length);
  const museumGroup = new THREE.Group();
  const collisionMeshes = [];
  const objectUrls = [];

  // Ambient lighting
  createAmbientLighting(museumGroup);

  let photoIndex = 0;

  for (const roomDesc of layout.rooms) {
    let roomGroup;

    if (roomDesc.type === 'foyer') {
      roomGroup = createFoyer(photos.length, roomDesc);
      museumGroup.add(roomGroup);
      // Collect wall meshes for collision
      roomGroup.traverse((child) => {
        if (child.isMesh && child.geometry.type === 'PlaneGeometry') {
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
    const frameable = wallSegments.filter((ws) => ws.segWidth >= 3.0);
    let framesPlaced = 0;

    for (const ws of frameable) {
      if (framesPlaced >= roomDesc.photoSlots || photoIndex >= photos.length) break;

      // Wide walls get 2 standard paintings; narrower walls get 1 large feature painting
      const isFeatureWall = ws.segWidth < 8;
      const framesOnWall = (!isFeatureWall && ws.segWidth >= 8) ? 2 : 1;

      for (let f = 0; f < framesOnWall; f++) {
        if (framesPlaced >= roomDesc.photoSlots || photoIndex >= photos.length) break;

        const photo = photos[photoIndex];
        const url = URL.createObjectURL(photo.blob);
        objectUrls.push(url);

        // Feature walls get a large landscape frame covering most of the wall
        const frameOpts = { textureUrl: url, photoWidth: photo.width, photoHeight: photo.height };
        if (isFeatureWall) {
          frameOpts.maxFrameWidth = Math.min(ws.segWidth - 1.5, 7.0);
          frameOpts.maxFrameHeight = Math.min(roomDesc.height - 2.5, 4.0);
        }
        const frame = createFrame(frameOpts);

        // Position frame on the wall
        const framePos = ws.mesh.position.clone();
        if (framesOnWall === 2) {
          const offsetAmount = ws.segWidth / 4;
          if (ws.wall === 'north' || ws.wall === 'south') {
            framePos.x += (f === 0 ? -offsetAmount : offsetAmount);
          } else {
            framePos.z += (f === 0 ? -offsetAmount : offsetAmount);
          }
        }
        framePos.y = roomDesc.height * 0.38;

        frame.position.copy(framePos);
        frame.rotation.copy(ws.mesh.rotation);

        // Push frame off the wall surface (half wall thickness + small gap)
        const wallNormal = new THREE.Vector3(0, 0, 1).applyEuler(ws.mesh.rotation);
        frame.position.add(wallNormal.multiplyScalar(0.13));

        group.add(frame);

        // Spotlight for this frame (use local coords since spotlight is added to group)
        const spotlight = createFrameSpotlight(framePos.clone(), ws.wall, roomDesc.height);
        group.add(spotlight);
        group.add(spotlight.target);

        photoIndex++;
        framesPlaced++;
      }
    }

    // Overhead room light for general brightness
    const roomLight = new THREE.PointLight(0xfff5e6, 1.0, 20, 1);
    roomLight.position.set(0, roomDesc.height - 0.3, 0);
    group.add(roomLight);

    // Collect wall meshes for collision
    for (const ws of wallSegments) {
      collisionMeshes.push(ws.mesh);
    }

    museumGroup.add(group);
  }

  return { museumGroup, collisionMeshes, objectUrls };
}
