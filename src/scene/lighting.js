import * as THREE from 'three';

/**
 * Add ambient + foyer lighting to the scene.
 */
export function createAmbientLighting(scene) {
  const ambient = new THREE.AmbientLight(0xfff5e6, 0.6);
  scene.add(ambient);
}

/**
 * Create a warm point light for the foyer (chandelier effect).
 */
export function createFoyerLight(foyerGroup, height) {
  const light = new THREE.PointLight(0xffe8c8, 2.0, 25, 1);
  light.position.set(0, height - 0.5, 0);
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
  const light = new THREE.SpotLight(0xfff5e6, 2.0, 12, Math.PI / 7, 0.5, 1);

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
