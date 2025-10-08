// src/scripts/model-viewer-debug.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function arrayMinMax(arr) {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

function computeArrayStats(arr, stride) {
  const count = Math.floor(arr.length / stride);
  return { length: arr.length, stride, count };
}

export async function initModelViewer(containerId, src) {
  console.log("[debug] initModelViewer", containerId, src);
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[debug] container "${containerId}" not found`);
    return;
  }

  // Ensure container has sensible size
  if (!container.style.height) container.style.height = container.clientHeight ? `${container.clientHeight}px` : "500px";

  // Three.js basics
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 10000);
  camera.position.set(0, 0, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  // small debug overlay UI
  const panel = document.createElement("div");
  panel.style.position = "absolute";
  panel.style.right = "8px";
  panel.style.top = "8px";
  panel.style.zIndex = 999;
  panel.style.background = "rgba(0,0,0,0.5)";
  panel.style.color = "white";
  panel.style.padding = "8px";
  panel.style.borderRadius = "6px";
  panel.style.fontFamily = "monospace";
  panel.style.fontSize = "12px";
  panel.innerHTML = `
    <div id="${containerId}-log">Loading...</div>
    <div style="margin-top:6px">
      <button id="${containerId}-btn-recalc">Recompute normals</button>
      <button id="${containerId}-btn-fixidx">Fix 1-based indices</button>
      <button id="${containerId}-btn-swapyz">Swap Y/Z</button>
      <button id="${containerId}-btn-negx">Flip X</button>
      <button id="${containerId}-btn-center">Center & Zoom</button>
    </div>
  `;
  // position anchor
  container.style.position = container.style.position || "relative";
  container.appendChild(panel);
  const logEl = panel.querySelector(`#${containerId}-log`);

  // fetch JSON
  let data;
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error("[debug] failed to fetch model:", err);
    logEl.textContent = `Error loading: ${err.message}`;
    return;
  }

  // diagnostics
  const positions = data.positions ?? data.vertices ?? data.pos ?? data.v;
  const normals = data.normals ?? data.n;
  const uvs = data.uvs ?? data.uv ?? data.t;
  const indices = data.indices ?? data.triangles ?? data.faces;

  if (!positions || positions.length < 3) {
    console.error("[debug] positions missing or too short", positions && positions.length);
    logEl.textContent = "No positions array found or it's too short";
    return;
  }

  logEl.innerHTML = `
    positions: ${positions.length} (${positions.length/3} verts)<br>
    normals: ${normals ? normals.length : "n/a"}<br>
    uvs: ${uvs ? uvs.length : "n/a"}<br>
    indices: ${indices ? indices.length : "n/a"}
  `;

  console.log("[debug] positions length", positions.length, "normals length", normals?.length, "indices length", indices?.length);

  // create geometry
  const geometry = new THREE.BufferGeometry();

  // convert to typed arrays (copy)
  const posArr = new Float32Array(positions);
  geometry.setAttribute("position", new THREE.BufferAttribute(posArr, 3));

  // indices handling:
  let indexArr = null;
  if (indices && indices.length > 0) {
    // check if indices look 1-based
    let minIndex = Infinity, maxIndex = -Infinity;
    for (let i = 0; i < indices.length; i++) {
      const v = indices[i];
      if (v < minIndex) minIndex = v;
      if (v > maxIndex) maxIndex = v;
    }
    console.log("[debug] index min/max", minIndex, maxIndex);
    let raw = indices;
    // If minIndex is 1 (or >0), it's likely 1-based -> user may need to click "Fix 1-based indices"
    // But we'll not mutate automatically; we provide a fix button.
    // choose typed array based on maxIndex
    const useUint32 = maxIndex > 65535;
    indexArr = useUint32 ? new Uint32Array(raw) : new Uint32Array(raw); // use Uint32Array always for simplicity
    geometry.setIndex(new THREE.BufferAttribute(indexArr, 1));
  } else {
    // no indices — assume triangles in sequence (0,1,2)(3,4,5)...
    const vcount = posArr.length / 3;
    const triCount = Math.floor(vcount / 3);
    const idx = new Uint32Array(triCount * 3);
    for (let i = 0; i < idx.length; i++) idx[i] = i;
    geometry.setIndex(new THREE.BufferAttribute(idx, 1));
    console.log("[debug] created sequential index buffer length", idx.length);
  }

  // normals handling
  if (normals && normals.length === posArr.length) {
    const nArr = new Float32Array(normals);
    geometry.setAttribute("normal", new THREE.BufferAttribute(nArr, 3));
    // quick check: average normal length
    let sumLen = 0, nCount = nArr.length/3;
    for (let i = 0; i < nArr.length; i += 3) {
      const lx = nArr[i], ly = nArr[i+1], lz = nArr[i+2];
      sumLen += Math.hypot(lx, ly, lz);
    }
    const avgLen = sumLen / nCount;
    console.log("[debug] avg normal length", avgLen);
    if (!isFinite(avgLen) || avgLen > 3 || avgLen < 0.2) {
      console.warn("[debug] normals look suspicious (avg length)", avgLen, "- recomputing");
      geometry.deleteAttribute("normal");
      geometry.computeVertexNormals();
    }
  } else {
    console.log("[debug] normals missing or wrong length -> computing normals");
    geometry.computeVertexNormals();
  }

  // UVs (optional)
  if (uvs && uvs.length >= 2) {
    const uvArr = new Float32Array(uvs);
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvArr, 2));
    console.log("[debug] uv set, length", uvArr.length);
  }

  // create mesh & add to scene
  const material = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.1, roughness: 0.8, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // auto center + zoom
  function centerAndZoom() {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    mesh.position.sub(center);
    geometry.computeBoundingBox();
    camera.position.set(0, 0, Math.max(1.0, size * 1.2));
    controls.target.set(0, 0, 0);
    controls.update();
  }
  centerAndZoom();

  // helper: apply transform to the positions buffer
  function applyTransform({ swapYZ = false, flipX = false } = {}) {
    const pos = geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      let x = pos[i], y = pos[i+1], z = pos[i+2];
      if (swapYZ) {
        const ty = y;
        y = z;
        z = ty;
      }
      if (flipX) x = -x;
      pos[i] = x; pos[i+1] = y; pos[i+2] = z;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();
    controls.update();
  }

  // helper: fix 1-based indices
  function fixIndicesOneBased() {
    const idxAttr = geometry.index;
    if (!idxAttr) { console.warn("no index to fix"); return; }
    const idx = idxAttr.array;
    let min = Infinity;
    for (let i = 0; i < idx.length; i++) if (idx[i] < min) min = idx[i];
    if (min === 0) {
      console.log("indices already 0-based (min === 0)");
      return;
    }
    console.log("[debug] subtracting 1 from all indices (min was", min, ")");
    for (let i = 0; i < idx.length; i++) idx[i] = idx[i] - 1;
    geometry.index.needsUpdate = true;
  }

  // connect UI buttons
  panel.querySelector(`#${containerId}-btn-recalc`).addEventListener("click", () => {
    geometry.computeVertexNormals();
    console.log("[debug] recomputed normals");
  });
  panel.querySelector(`#${containerId}-btn-fixidx`).addEventListener("click", () => {
    fixIndicesOneBased();
    console.log("[debug] fixed indices (if needed)");
  });
  panel.querySelector(`#${containerId}-btn-swapyz`).addEventListener("click", () => {
    applyTransform({ swapYZ: true, flipX: false });
    console.log("[debug] swapped Y/Z");
  });
  panel.querySelector(`#${containerId}-btn-negx`).addEventListener("click", () => {
    applyTransform({ swapYZ: false, flipX: true });
    console.log("[debug] flipped X");
  });
  panel.querySelector(`#${containerId}-btn-center`).addEventListener("click", () => {
    centerAndZoom();
    console.log("[debug] centered & zoomed");
  });

  // animation loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  console.log("[debug] initial geometry:", {
    vertices: geometry.attributes.position.count,
    indexCount: geometry.index?.count ?? 0,
    hasNormals: !!geometry.attributes.normal,
    bbox: geometry.boundingBox?.toArray?.() ?? null
  });
  logEl.textContent = "Loaded. Open console for diagnostics.";
}
