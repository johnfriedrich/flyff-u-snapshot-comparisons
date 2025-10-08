import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

window.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ model-viewer script loaded");

  const container = document.getElementById("model-viewer");
  if (!container) {
    console.error("❌ model-viewer container not found!");
    return;
  }

  // basic setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(3, 3, 3);
  scene.add(light);

  const ambient = new THREE.AmbientLight(0x404040);
  scene.add(ambient);

  // load JSON model
  try {
   // const response = await fetch("/media/mesh.json");
    //const data = await response.json();
    //console.log("✅ Model data loaded:", data);

    const loader = new THREE.BufferGeometryLoader();
    loader.load('/media/mesh.json', geometry => {
    const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
});
    const controls = new OrbitControls(camera, renderer.domElement);
    camera.position.z = 5;

    function animate() {
      requestAnimationFrame(animate);
      mesh.rotation.y += 0.01;
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  } catch (err) {
    console.error("❌ Failed to load model:", err);
  }
});
