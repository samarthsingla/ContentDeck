// ═══════════════════════════════════════════
// ContentDeck v4 — Module Entry Point
// New ES module features (graph, embeddings, editor)
// Legacy code (app.js, ai.js, stats.js) loaded via script tags
// ═══════════════════════════════════════════

import { GraphView } from './graph.js';
import { EmbeddingEngine } from './embeddings.js';
import { Editor } from './editor.js';

// Expose new modules to legacy code via window globals
window.GraphView = GraphView;
window.EmbeddingEngine = EmbeddingEngine;
window.Editor = Editor;

// Initialize embedding engine (lazy — loads model on first use)
window.embeddingEngine = new EmbeddingEngine();

// Initialize graph view and editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('graph-canvas');
  if (canvas) {
    window.graphView = new GraphView(canvas);
  }

  // Initialize editor
  window.editor = new Editor();

  // Wire editor save to app.js CRUD (if available)
  window.editor.onSave = async (bookmark, changes) => {
    if (!window.db) return;
    const update = {};
    if (changes.title !== undefined) update.title = changes.title;
    if (changes.content !== undefined) update.content = changes.content;
    if (changes.nugget !== undefined) update.nugget = changes.nugget;
    if (changes.status !== undefined) update.status = changes.status;

    await window.db.from('bookmarks').update(update).eq('id', bookmark.id);

    // Refresh UI if loadBookmarks is available
    if (window.loadBookmarks) window.loadBookmarks();
  };

  // Wire graph node clicks to editor
  if (window.graphView) {
    window.graphView.onNodeClick = (bookmark) => {
      if (bookmark.node_type === 'note' || !bookmark.url) {
        // Open in editor for notes
        window.editor.open(bookmark);
      } else {
        // Open URL for media bookmarks
        window.open(bookmark.url, '_blank');
      }
    };
  }
});
