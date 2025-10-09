import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function initModelViewer(container, { width = 400, height = 200 } = {}) {

    if (!container || !(container instanceof HTMLElement)) {
    console.error("initModelViewer: Invalid container element");
    return;
  }

  if (container.__hasViewer) {
    console.warn("Model viewer already initialized for this container");
    return;
  }
  container.__hasViewer = true;

  const src = container.dataset.modelSrc;
  if (!src) {
    console.error("initModelViewer: Missing data-model-src attribute");
    return;
  }

  // 🟦 Assign default size and style dynamically
  container.style.width = width + "px";
  container.style.height = height + "px";
  container.style.position = "relative";
  container.style.background = "#ffffffff";
  container.style.overflow = "hidden";

  console.log("[debug] Initializing model viewer:", src);
    
      // Ensure container has sensible size
      if (!container.style.height) container.style.height = container.clientHeight ? `${container.clientHeight}px` : "500px";
    
            // Scene setup
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xe8f4f8);
            scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);
            const { clientWidth, clientHeight } = container;
    
            // Camera
            const camera = new THREE.PerspectiveCamera(
                50,
                width / height,
                0.1,
                1000
            );
            camera.position.set(0, 2, -4);
    
            // Renderer
            const renderer = new THREE.WebGLRenderer({ antialias: true });

            // Apply to renderer + camera
            renderer.setSize(width, height);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(renderer.domElement);
    
            // Lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
            scene.add(ambientLight);
    
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(5, 10, 7.5);
            directionalLight.castShadow = true;
            directionalLight.shadow.camera.near = 0.1;
            directionalLight.shadow.camera.far = 50;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            scene.add(directionalLight);
    
            const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
            fillLight.position.set(-5, 5, -5);
            scene.add(fillLight);
    
            // Controls
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.minDistance = 0.5;
            controls.maxDistance = 10;
    
            // Load GLB model
            const loader = new GLTFLoader();
            let model;
    
            loader.load(src,
                function (gltf) {
                    model = gltf.scene;
                    
                    // Enable shadows
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
    
                    // Center and scale the model
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = 3 / maxDim;
                    model.scale.multiplyScalar(scale);
                    
                    // Recalculate bounding box after scaling
                    box.setFromObject(model);
                    box.getCenter(center);
                    
                    // Position model: center X/Z, bottom at Y=0
                    model.position.x = -center.x;
                    model.position.z = -center.z;
                    model.position.y = -box.min.y; // This puts the bottom of the model at y=0
    
                    scene.add(model);
    
                    // Update camera to look at model center
                    const modelCenter = new THREE.Vector3();
                    box.setFromObject(model); // Recalculate after positioning
                    box.getCenter(modelCenter);
                    
                    controls.target.copy(modelCenter);
                    controls.update();
    
                    // Hide loading, show info
                    
                    console.log(
                        `Model loaded!<br>
                        Triangles: ${gltf.scene.children.length > 0 ? 
                            (gltf.scene.children[0].geometry?.index?.count / 3 || 'N/A') : 'N/A'}<br>
                        Size: ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}`);
                },
                function (xhr) {
                    const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
                    
                },
                function (error) {
                    console.error('Error loading model:', error);
                   
                }
            );
    
            // Animation loop
            function animate() {
                requestAnimationFrame(animate);
                
                // Rotate model slowly
                //if (model) {
                //    model.rotation.y += 0.001;
                //}
                
                controls.update();
                renderer.render(scene, camera);
            }
    
            // Handle window resize
            window.addEventListener('resize', () => {
                const { clientWidth, clientHeight } = container;
                camera.aspect = clientWidth / clientHeight;
                renderer.setSize(clientWidth, clientHeight);
                camera.updateProjectionMatrix();
            });
    
            // Start animation
            animate();
  
}
