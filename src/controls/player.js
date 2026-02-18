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
      const originalPos = this.camera.position.clone();
      // Try sliding along X only
      const slideX = originalPos.clone();
      slideX.x = newPos.x;
      if (!collisionCheck(slideX)) {
        this.camera.position.copy(slideX);
      } else {
        // Try sliding along Z only
        const slideZ = originalPos.clone();
        slideZ.z = newPos.z;
        if (!collisionCheck(slideZ)) {
          this.camera.position.copy(slideZ);
        }
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
