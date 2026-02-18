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
