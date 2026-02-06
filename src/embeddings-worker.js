// ═══════════════════════════════════════════
// ContentDeck v4 — Embeddings Web Worker
// Runs Transformers.js MiniLM model off the main thread
// ═══════════════════════════════════════════

import { pipeline } from '@xenova/transformers';

let embedder = null;

async function init() {
  embedder = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
    { progress_callback: (progress) => {
      if (progress.status === 'progress') {
        console.log(`[Embeddings Worker] Loading: ${Math.round(progress.progress)}%`);
      }
    }}
  );
  self.postMessage({ type: 'ready' });
}

self.onmessage = async (e) => {
  const { type, id, text } = e.data;

  if (type === 'embed') {
    try {
      if (!embedder) {
        throw new Error('Model not loaded yet');
      }
      const output = await embedder(text, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);
      self.postMessage({ type: 'result', id, embedding });
    } catch (err) {
      self.postMessage({ type: 'error', id, error: err.message });
    }
  }
};

// Start loading immediately
init().catch((err) => {
  console.error('[Embeddings Worker] Init failed:', err);
});
