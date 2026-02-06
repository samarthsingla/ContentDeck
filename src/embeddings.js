// ═══════════════════════════════════════════
// ContentDeck v4 — Embedding Engine
// Client-side semantic embeddings via Transformers.js
// Runs MiniLM in a Web Worker for non-blocking inference
// ═══════════════════════════════════════════

export class EmbeddingEngine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.loading = false;
    this._pendingRequests = new Map();
    this._nextId = 0;
  }

  /**
   * Initialize the Web Worker and load the model.
   * Call this once; subsequent calls are no-ops.
   * Returns a promise that resolves when the model is ready.
   */
  async init() {
    if (this.ready) return;
    if (this.loading) {
      // Wait for existing init to complete
      return new Promise((resolve) => {
        const check = () => {
          if (this.ready) resolve();
          else setTimeout(check, 100);
        };
        check();
      });
    }

    this.loading = true;
    console.log('[Embeddings] Loading model...');

    return new Promise((resolve, reject) => {
      this.worker = new Worker(
        new URL('./embeddings-worker.js', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e) => {
        const { type, id, embedding, error } = e.data;

        if (type === 'ready') {
          this.ready = true;
          this.loading = false;
          console.log('[Embeddings] Model ready');
          resolve();
          return;
        }

        if (type === 'error') {
          console.error('[Embeddings] Worker error:', error);
          const pending = this._pendingRequests.get(id);
          if (pending) {
            pending.reject(new Error(error));
            this._pendingRequests.delete(id);
          }
          return;
        }

        if (type === 'result') {
          const pending = this._pendingRequests.get(id);
          if (pending) {
            pending.resolve(embedding);
            this._pendingRequests.delete(id);
          }
        }
      };

      this.worker.onerror = (err) => {
        this.loading = false;
        console.error('[Embeddings] Worker failed:', err);
        reject(err);
      };
    });
  }

  /**
   * Embed a single text string. Returns a Float64Array (384 dimensions).
   */
  async embed(text) {
    if (!this.ready) await this.init();

    const id = this._nextId++;
    return new Promise((resolve, reject) => {
      this._pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ type: 'embed', id, text });
    });
  }

  /**
   * Embed multiple texts in batch. Returns an array of embeddings.
   */
  async embedBatch(texts) {
    return Promise.all(texts.map(t => this.embed(t)));
  }

  /**
   * Compute cosine similarity between two embedding vectors.
   */
  static cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  /**
   * Compute the mean (centroid) of multiple embedding vectors.
   * Used to create an area's embedding from its seed keywords.
   */
  static meanVector(vectors) {
    if (!vectors.length) return [];
    const dim = vectors[0].length;
    const mean = new Array(dim).fill(0);
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) mean[i] += v[i];
    }
    // Normalize: average then unit-length
    let mag = 0;
    for (let i = 0; i < dim; i++) {
      mean[i] /= vectors.length;
      mag += mean[i] * mean[i];
    }
    mag = Math.sqrt(mag);
    if (mag > 0) {
      for (let i = 0; i < dim; i++) mean[i] /= mag;
    }
    return mean;
  }

  /**
   * Compute the area centroid embedding from its seed keywords.
   * Returns the embedding vector for the area.
   */
  async computeAreaEmbedding(seedKeywords) {
    if (!seedKeywords || !seedKeywords.length) return null;
    const vectors = await this.embedBatch(seedKeywords);
    return EmbeddingEngine.meanVector(vectors);
  }

  /**
   * Classify a text against a set of areas.
   * Returns sorted array of { area, similarity } objects.
   *
   * @param {string} text - The text to classify
   * @param {Array} areas - Array of { id, name, embedding } objects
   * @param {number} threshold - Minimum similarity to count as a match (default 0.3)
   * @returns {{ matches: Array<{area, similarity}>, unassigned: boolean }}
   */
  async classify(text, areas, threshold = 0.3) {
    const textEmbedding = await this.embed(text);

    const scored = areas
      .filter(a => a.embedding && a.embedding.length)
      .map(area => ({
        area,
        similarity: EmbeddingEngine.cosineSimilarity(textEmbedding, area.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    const matches = scored.filter(s => s.similarity >= threshold).slice(0, 3);

    return {
      embedding: textEmbedding,
      matches,
      unassigned: matches.length === 0,
    };
  }

  /**
   * Destroy the worker to free resources.
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
    }
  }
}
