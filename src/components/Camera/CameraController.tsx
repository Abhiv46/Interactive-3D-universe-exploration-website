import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useState } from 'react';

/**
 * Free-fly camera with WASD controls and mouse look
 * Exponential speed scaling for navigating vast distances
 */
export class FreeFlyCamera {
  public position = new THREE.Vector3(0, 0, 1e10);
  public rotation = new THREE.Euler(0, 0, 0, 'YXZ');
  public velocity = new THREE.Vector3();
  public acceleration = 1000; // m/s^2
  public maxSpeed = 1e12; // 1 trillion m/s (c * ~3333)
  public drag = 0.95;
  public mouseSensitivity = 0.002;
  public pitchLimits = [-Math.PI / 2 + 0.01, Math.PI / 2 - 0.01];
  public enabled = true;

  private keys: Record<string, boolean> = {};
  private mouseDelta = new THREE.Vector2();
  private lastMouse = new THREE.Vector2();
  private isMouseDown = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.bindEvents();
    }
  }

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled) return;
    this.keys[e.code] = true;
    // Prevent default for space and arrows
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (_e: KeyboardEvent) => {
    this.keys[_e.code] = false;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (!this.enabled) return;
    if (e.button === 0 || e.button === 2) {
      this.isMouseDown = true;
      this.lastMouse.set(e.clientX, e.clientY);
      document.body.style.cursor = 'grabbing';
      e.preventDefault();
    }
  };

  private onMouseUp = () => {
    this.isMouseDown = false;
    document.body.style.cursor = 'default';
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.enabled || !this.isMouseDown) return;
    this.mouseDelta.set(e.clientX - this.lastMouse.x, e.clientY - this.lastMouse.y);
    this.lastMouse.set(e.clientX, e.clientY);
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.enabled) return;
    // Adjust speed with scroll wheel
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    this.acceleration *= factor;
    this.acceleration = THREE.MathUtils.clamp(this.acceleration, 1, 1e15);
    e.preventDefault();
  };

  public update(deltaTime: number) {
    if (!this.enabled) return;

    // Handle mouse look
    if (this.mouseDelta.lengthSq() > 0) {
      this.rotation.y -= this.mouseDelta.x * this.mouseSensitivity;
      this.rotation.x -= this.mouseDelta.y * this.mouseSensitivity;
      this.rotation.x = THREE.MathUtils.clamp(this.rotation.x, this.pitchLimits[0], this.pitchLimits[1]);
      this.mouseDelta.set(0, 0);
    }

    // Calculate movement direction
    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(this.rotation);
    const up = new THREE.Vector3(0, 1, 0);

    if (this.keys['KeyW'] || this.keys['ArrowUp']) direction.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) direction.sub(forward);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) direction.add(right);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) direction.sub(right);
    if (this.keys['Space']) direction.add(up);
    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) direction.sub(up);

    // Apply acceleration
    if (direction.lengthSq() > 0) {
      direction.normalize();
      this.velocity.addScaledVector(direction, this.acceleration * deltaTime);
    }

    // Apply drag
    this.velocity.multiplyScalar(this.drag);

    // Clamp speed
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.setLength(this.maxSpeed);
    }

    // Update position
    this.position.addScaledVector(this.velocity, deltaTime);
  }

  public getViewMatrix(): THREE.Matrix4 {
    const matrix = new THREE.Matrix4();
    matrix.makeRotationFromEuler(this.rotation);
    matrix.setPosition(this.position);
    return matrix.invert();
  }

  public getProjectionMatrix(aspect: number, near: number, far: number): THREE.Matrix4 {
    const matrix = new THREE.Matrix4();
    const fov = 75 * (Math.PI / 180);
    const top = near * Math.tan(fov / 2);
    const bottom = -top;
    const right = top * aspect;
    const left = -right;
    return matrix.makePerspective(left, right, top, bottom, near, far);
  }

  public getWorldDirection(target: THREE.Vector3): THREE.Vector3 {
    return target.set(0, 0, -1).applyEuler(this.rotation);
  }

  public getRightDirection(target: THREE.Vector3): THREE.Vector3 {
    return target.set(1, 0, 0).applyEuler(this.rotation);
  }

  public dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('wheel', this.onWheel);
  }
}

/**
 * Orbit-focus camera for smooth orbital viewing of celestial objects
 */
export class OrbitFocusCamera {
  public position = new THREE.Vector3(0, 0, 1e10);
  public target = new THREE.Vector3(0, 0, 0);
  public distance = 1e10;
  public phi = Math.PI / 4; // Polar angle (0 = top, PI = bottom)
  public theta = 0; // Azimuthal angle
  public minDistance = 1000;
  public maxDistance = 1e15;
  public enableDamping = true;
  public dampingFactor = 0.05;
  public enableRotate = true;
  public rotateSpeed = 1.0;
  public enableZoom = true;
  public zoomSpeed = 1.0;
  public enablePan = true;
  public panSpeed = 1.0;
  public targetObject: CelestialObject | null = null;
  public enabled = true;

  private mouseDelta = new THREE.Vector2();
  private lastMouse = new THREE.Vector2();
  private isMouseDown = false;
  private mouseButton = -1;
  private keys: Record<string, boolean> = {};
  private spherical = new THREE.Spherical();
  private sphericalDelta = new THREE.Spherical();

  constructor() {
    if (typeof window !== 'undefined') {
      this.bindEvents();
    }
  }

  private bindEvents() {
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onMouseDown = (e: MouseEvent) => {
    if (!this.enableRotate && !this.enablePan) return;
    if (!this.enabled) return;
    this.isMouseDown = true;
    this.mouseButton = e.button;
    this.lastMouse.set(e.clientX, e.clientY);
    document.body.style.cursor = e.button === 0 ? 'grabbing' : 'grab';
    e.preventDefault();
  };

  private onMouseUp = () => {
    this.isMouseDown = false;
    this.mouseButton = -1;
    document.body.style.cursor = 'default';
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isMouseDown || !this.enabled) return;

    this.mouseDelta.set(e.clientX - this.lastMouse.x, e.clientY - this.lastMouse.y);
    this.lastMouse.set(e.clientX, e.clientY);

    if (this.mouseButton === 0 && this.enableRotate) {
      // Left click - rotate
      this.sphericalDelta.theta -= 2 * Math.PI * this.mouseDelta.x / window.innerWidth * this.rotateSpeed;
      this.sphericalDelta.phi -= 2 * Math.PI * this.mouseDelta.y / window.innerHeight * this.rotateSpeed;
    } else if (this.mouseButton === 2 && this.enablePan) {
      // Right click - pan
      const panOffset = new THREE.Vector3();
      panOffset.setFromMatrixColumn(this.getViewMatrix(), 0);
      panOffset.multiplyScalar(-this.mouseDelta.x * this.panSpeed * this.distance / 1000);
      panOffset.setFromMatrixColumn(this.getViewMatrix(), 1);
      panOffset.multiplyScalar(this.mouseDelta.y * this.panSpeed * this.distance / 1000);
      this.target.add(panOffset);
    } else if (this.mouseButton === 1 && this.enablePan) {
      // Middle click - pan
      const panOffset = new THREE.Vector3();
      const viewMatrix = this.getViewMatrix();
      panOffset.setFromMatrixColumn(viewMatrix, 0);
      panOffset.multiplyScalar(-this.mouseDelta.x * this.panSpeed * this.distance / 1000);
      const panOffsetY = new THREE.Vector3();
      panOffsetY.setFromMatrixColumn(viewMatrix, 1);
      panOffsetY.multiplyScalar(this.mouseDelta.y * this.panSpeed * this.distance / 1000);
      this.target.add(panOffset).add(panOffsetY);
    }
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.enableZoom || !this.enabled) return;
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    this.distance *= factor;
    this.distance = THREE.MathUtils.clamp(this.distance, this.minDistance, this.maxDistance);
    e.preventDefault();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  public focusOnObject(object: CelestialObject) {
    this.targetObject = object;
    this.target.copy(object.position);
    // Set distance to 5x radius or min 1000 km
    this.distance = Math.max(object.radius * 5, 1e6);
    this.updateCameraPosition();
  }

  public clearFocus() {
    this.targetObject = null;
  }

  public update(targetPosition: THREE.Vector3, distance: number, deltaTime: number) {
    if (this.targetObject) {
      this.target.copy(targetPosition);
      this.distance = distance;
    }

    // Handle keyboard panning
    if (this.keys['ArrowUp']) this.target.y += this.panSpeed * this.distance * deltaTime / 1000;
    if (this.keys['ArrowDown']) this.target.y -= this.panSpeed * this.distance * deltaTime / 1000;
    if (this.keys['ArrowLeft']) this.target.x -= this.panSpeed * this.distance * deltaTime / 1000;
    if (this.keys['ArrowRight']) this.target.x += this.panSpeed * this.distance * deltaTime / 1000;

    this.updateCameraPosition();

    if (this.enableDamping) {
      // Apply damping to spherical coordinates
      this.sphericalDelta.theta *= (1 - this.dampingFactor);
      this.sphericalDelta.phi *= (1 - this.dampingFactor);
    }
  }

  private updateCameraPosition() {
    this.spherical.set(this.distance, this.phi, this.theta);
    // Add sphericalDelta manually since .add doesn't exist on Spherical
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;

    // Clamp phi
    this.spherical.phi = THREE.MathUtils.clamp(this.spherical.phi, 0.01, Math.PI - 0.01);
    this.spherical.makeSafe();

    // Update spherical coordinates
    this.distance = this.spherical.radius;
    this.phi = this.spherical.phi;
    this.theta = this.spherical.theta;

    // Calculate position from spherical coordinates
    this.position.setFromSpherical(this.spherical);
    this.position.add(this.target);
  }

  public getViewMatrix(): THREE.Matrix4 {
    const matrix = new THREE.Matrix4();
    matrix.lookAt(this.position, this.target, new THREE.Vector3(0, 1, 0));
    return matrix.invert();
  }

  public getProjectionMatrix(aspect: number, near: number, far: number): THREE.Matrix4 {
    const matrix = new THREE.Matrix4();
    const fov = 60 * (Math.PI / 180);
    const top = near * Math.tan(fov / 2);
    const bottom = -top;
    const right = top * aspect;
    const left = -right;
    return matrix.makePerspective(left, right, top, bottom, near, far);
  }

  public dispose() {
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}

export interface CelestialObject {
  id: string;
  name: string;
  position: THREE.Vector3;
  radius: number;
}

/**
 * Camera controller that manages switching between free-fly and orbit-focus modes
 */
export class CameraController {
  public freeCamera: FreeFlyCamera;
  public orbitCamera: OrbitFocusCamera;
  public activeCamera: FreeFlyCamera | OrbitFocusCamera;
  public mode: 'free' | 'orbit' = 'free';

  constructor(freeCamera: FreeFlyCamera, orbitCamera: OrbitFocusCamera) {
    this.freeCamera = freeCamera;
    this.orbitCamera = orbitCamera;
    this.activeCamera = freeCamera;
  }

  public setMode(mode: 'free' | 'orbit') {
    this.mode = mode;
    this.activeCamera = mode === 'free' ? this.freeCamera : this.orbitCamera;

    if (mode === 'orbit') {
      this.freeCamera.enabled = false;
      this.orbitCamera.enabled = true;
    } else {
      this.freeCamera.enabled = true;
      this.orbitCamera.enabled = false;
    }
  }

  public focusOnObject(object: CelestialObject) {
    this.setMode('orbit');
    this.orbitCamera.focusOnObject(object);
  }

  public clearFocus() {
    this.setMode('free');
    this.orbitCamera.clearFocus();
  }

  public update(deltaTime: number) {
    if (this.mode === 'free') {
      this.freeCamera.update(deltaTime);
    } else if (this.mode === 'orbit' && this.orbitCamera.targetObject) {
      this.orbitCamera.update(
        this.orbitCamera.targetObject.position,
        this.orbitCamera.distance,
        deltaTime
      );
    }
  }

  public getViewMatrix(): THREE.Matrix4 {
    return this.activeCamera.getViewMatrix();
  }

  public getProjectionMatrix(aspect: number, near: number, far: number): THREE.Matrix4 {
    return this.activeCamera.getProjectionMatrix(aspect, near, far);
  }

  public dispose() {
    this.freeCamera.dispose();
    this.orbitCamera.dispose();
  }
}

/**
 * React component for camera controller integration with R3F
 */
export function CameraControllerComponent() {
  const { camera, gl } = useThree();
  const [controller] = useState(() => {
    const freeCam = new FreeFlyCamera();
    const orbitCam = new OrbitFocusCamera();
    return new CameraController(freeCam, orbitCam);
  });

  useFrame(({ clock }) => {
    controller.update(clock.getDelta());

    // Apply camera transform to Three.js camera
    const viewMatrix = controller.getViewMatrix();
    camera.matrix.copy(viewMatrix.invert());
    camera.matrixWorld.copy(camera.matrix);
    camera.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
    camera.updateMatrixWorld(true);

    // Update projection matrix for scale transitions
    const aspect = gl.domElement.clientWidth / gl.domElement.clientHeight;
    const near = 0.1;
    const far = 1e18; // Very far for interstellar distances
    camera.projectionMatrix.copy(controller.getProjectionMatrix(aspect, near, far));
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  });

  return null;
}