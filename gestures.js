console.log('Gestures.js loaded');

// Gesture state variables
let isGrabbing = false;
let grabTimer = 0;
let isBuilding = false;
let buildTimer = 0;
let isErasing = false;
let eraseTimer = 0;
let resetTimer = 0;
let rotateTimer = 0;
let startPinchPos = null;
let activeAxis = null;
let sketchKeys = new Set();

const GRAB_HOLD = 300;
const INTENT_HOLD = 300;
const RESET_HOLD = 600;
const ROTATE_HOLD = 600;
const pinchThreshold = 0.05;
const gridSize = 1.2;

function getDist(p1, p2) {
 return Math.sqrt(
 Math.pow(p1.x - p2.x, 2) +
 Math.pow(p1.y - p2.y, 2) +
 ((p1.z && p2.z) ? Math.pow(p1.z - p2.z, 2) : 0)
 );
}

function addSketchVoxel(x, y, z) {
 const key = `${x.toFixed(1)},${y.toFixed(1)},${z.toFixed(1)}`;
 if (sketchKeys.has(key) || voxelManager.voxelData.has(key)) return;

 const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(gridSize * 0.98, gridSize * 0.98, gridSize * 0.98),
  new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true })
 );

 mesh.position.set(x, y, z);
 currentSketch.add(mesh);
 sketchKeys.add(key);
}

function commitVoxels() {
 while (currentSketch.children.length > 0) {
  const f = currentSketch.children[0];
  voxelManager.addVoxel(f.position.x, f.position.y, f.position.z, 0);
  currentSketch.remove(f);
 }
 document.getElementById("count").innerText = voxelManager.getVoxelCount();
}

console.log('Gestures.js initialized');
