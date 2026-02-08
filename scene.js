// Instanced Rendering System for High-Performance Voxel Rendering
class VoxelManager {
    constructor(scene, gridSize) {
        this.scene = scene;
        this.gridSize = gridSize;
        this.maxInstances = 10000; // Support up to 10,000 voxels per color
        this.instanceGroups = new Map(); // color -> InstancedMesh
        this.voxelData = new Map(); // key -> {matrix, velocity, origin, colorIndex}
        this.colorPalette = [
            0x00f0ff, 0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff,
            0xffa500, 0x800080, 0x00ff7f, 0xff1493, 0x7fff00, 0x40e0d0,
            0xffd700, 0xff4500, 0x9370db, 0x00ced1, 0xf08080, 0xadff2f,
            0xff6347, 0x00bfff, 0xda70d6
        ];
    }

    createInstancedMesh(color) {
        const geometry = new THREE.BoxGeometry(this.gridSize * 0.95, this.gridSize * 0.95, this.gridSize * 0.95);
        const material = new THREE.MeshPhongMaterial({
            color: 0x001122,
            emissive: color,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.8
        });

        const instancedMesh = new THREE.InstancedMesh(geometry, material, this.maxInstances);
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        instancedMesh.count = 0;

        // Add wireframe edges
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: color });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        instancedMesh.add(wireframe);

        this.scene.add(instancedMesh);
        return instancedMesh;
    }

    getOrCreateInstanceGroup(color) {
        const colorHex = color;
        if (!this.instanceGroups.has(colorHex)) {
            this.instanceGroups.set(colorHex, this.createInstancedMesh(color));
        }
        return this.instanceGroups.get(colorHex);
    }

    addVoxel(x, y, z, colorIndex = 0) {
        const key = `${x.toFixed(1)},${y.toFixed(1)},${z.toFixed(1)}`;
        if (this.voxelData.has(key)) return; // Already exists

        const color = this.colorPalette[colorIndex];
        const instancedMesh = this.getOrCreateInstanceGroup(color);

        if (instancedMesh.count >= this.maxInstances) {
            console.warn('Max instances reached for color', color);
            return;
        }

        const matrix = new THREE.Matrix4();
        matrix.setPosition(x, y, z);

        const instanceIndex = instancedMesh.count;
        instancedMesh.setMatrixAt(instanceIndex, matrix);
        instancedMesh.count++;
        instancedMesh.instanceMatrix.needsUpdate = true;

        this.voxelData.set(key, {
            matrix: matrix,
            velocity: new THREE.Vector3(0, 0, 0),
            origin: new THREE.Vector3(x, y, z),
            colorIndex: colorIndex,
            instanceIndex: instanceIndex,
            instancedMesh: instancedMesh
        });

        return key;
    }

    removeVoxel(key) {
        if (!this.voxelData.has(key)) return false;

        const voxel = this.voxelData.get(key);
        const instancedMesh = voxel.instancedMesh;
        const instanceIndex = voxel.instanceIndex;

        // Move the last instance to this position to fill the gap
        if (instancedMesh.count > 1) {
            const lastMatrix = new THREE.Matrix4();
            instancedMesh.getMatrixAt(instancedMesh.count - 1, lastMatrix);
            instancedMesh.setMatrixAt(instanceIndex, lastMatrix);

            // Update the moved voxel's instance index
            const lastKey = this.findVoxelByInstanceIndex(instancedMesh, instancedMesh.count - 1);
            if (lastKey && this.voxelData.has(lastKey)) {
                this.voxelData.get(lastKey).instanceIndex = instanceIndex;
            }
        }

        instancedMesh.count--;
        instancedMesh.instanceMatrix.needsUpdate = true;

        this.voxelData.delete(key);
        return true;
    }

    findVoxelByInstanceIndex(instancedMesh, instanceIndex) {
        for (const [key, voxel] of this.voxelData) {
            if (voxel.instancedMesh === instancedMesh && voxel.instanceIndex === instanceIndex) {
                return key;
            }
        }
        return null;
    }

    updateVoxelPosition(key, newPosition) {
        if (!this.voxelData.has(key)) return;

        const voxel = this.voxelData.get(key);
        voxel.matrix.setPosition(newPosition);
        voxel.instancedMesh.setMatrixAt(voxel.instanceIndex, voxel.matrix);
        voxel.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    getVoxelCount() {
        return this.voxelData.size;
    }

    clearAll() {
        for (const instancedMesh of this.instanceGroups.values()) {
            this.scene.remove(instancedMesh);
        }
        this.instanceGroups.clear();
        this.voxelData.clear();
    }

    // Physics update for gravity
    updatePhysics(gravityEnabled, floorY) {
        for (const [key, voxel] of this.voxelData) {
            if (gravityEnabled) {
                const position = new THREE.Vector3();
                voxel.matrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());

                if (position.y > floorY || voxel.velocity.y > 0) {
                    voxel.velocity.y -= 0.025;
                    position.add(voxel.velocity);
                } else if (!voxel.isBouncing) {
                    position.y = floorY;
                    voxel.velocity.y *= -0.15;
                    voxel.velocity.x *= 0.5;
                    voxel.isBouncing = true;
                } else {
                    voxel.velocity.set(0, 0, 0);
                }

                this.updateVoxelPosition(key, position);
            } else {
                // Lerp back to origin
                const position = new THREE.Vector3();
                voxel.matrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
                position.lerp(voxel.origin, 0.1);
                this.updateVoxelPosition(key, position);
                voxel.isBouncing = false;
            }
        }
    }

    // Rainbow mode update
    updateRainbowMode(rainbowActive) {
        if (rainbowActive) {
            for (const instancedMesh of this.instanceGroups.values()) {
                const hsl = { h: Math.random(), s: 1, l: 0.5 };
                instancedMesh.material.emissive.setHSL(hsl.h, hsl.s, hsl.l);
                instancedMesh.material.emissiveIntensity = 2.5;
                // Update wireframe color too
                if (instancedMesh.children[0]) {
                    instancedMesh.children[0].material.color.setHSL(hsl.h, hsl.s, hsl.l);
                }
            }
        } else {
            // Reset to original colors
            for (const [colorHex, instancedMesh] of this.instanceGroups) {
                const color = parseInt(colorHex);
                instancedMesh.material.emissive.setHex(color);
                instancedMesh.material.emissiveIntensity = 0.4;
                if (instancedMesh.children[0]) {
                    instancedMesh.children[0].material.color.setHex(color);
                }
            }
        }
    }
}

// Basic scene setup
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("three_canvas"),
    antialias: true,
    alpha: true
});

renderer.setSize(window.innerWidth, window.innerHeight);

const voxelGroup = new THREE.Group();
scene.add(voxelGroup);

const currentSketch = new THREE.Group();
scene.add(currentSketch);

camera.position.z = 20;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const sun = new THREE.DirectionalLight(0x00f0ff, 1);
sun.position.set(5, 5, 5);
scene.add(sun);

// Global voxel manager instance
const voxelManager = new VoxelManager(scene, 1.2);
