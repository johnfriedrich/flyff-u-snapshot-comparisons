// src/components/ModelViewer.jsx
import { useEffect } from 'preact/hooks';
import { initModelViewer } from '../scripts/model-viewer.js';

export default function ModelViewer({ modelSrc, width = 200, height = 200, containerId, buttonId }) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    const button = document.getElementById(buttonId);

    if (button && container) {
      button.addEventListener("click", () => {
        initModelViewer(container, { width, height });
      });
    }
  }, []);

  return (
    <>
      <div id={containerId} data-model-src={modelSrc} style={{ width, height }}></div>
      <button id={buttonId}>Load 3D Model</button>
    </>
  );
}