// src/scripts/model-viewer-runner.js
import { initModelViewer } from './model-viewer-debug.js';

window.addEventListener('DOMContentLoaded', () => {
  // find all placeholders
  document.querySelectorAll('[data-model-src]').forEach(el => {
    const id = el.id || (() => { const gen = 'mv-' + Math.random().toString(36).slice(2); el.id = gen; return gen; })();
    const src = el.dataset.modelSrc;
    initModelViewer(id, src).catch(e => console.error("initModelViewer error:", e));
  });
});
