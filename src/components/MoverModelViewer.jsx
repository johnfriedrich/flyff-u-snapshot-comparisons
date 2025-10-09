// src/components/ModelViewer.jsx
import { useEffect } from 'preact/hooks';
import { initModelViewer } from '../scripts/model-viewer.js';

export default function MoverModelViewer({ modelSrc, containerId, buttonId }) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    const button = document.getElementById(buttonId);

    if (button && container) {
      button.addEventListener("click", () => {
        initModelViewer(container, { width: 800, height: 800 });
      });
    }
  }, []);

  return (
    <>
      <div id={containerId} data-model-src={modelSrc} style="width=800;height=800"></div>
      <button id={buttonId}>Load 3D Model</button>
    </>
  );
}