// ═══════════════════════════════════════════
// ContentDeck v4 — Markdown Editor Overlay
// Minimalist editor with Golden Nugget finish flow
// ═══════════════════════════════════════════

export class Editor {
  constructor() {
    this.overlay = document.getElementById('editor-overlay');
    this.titleEl = document.getElementById('editor-title');
    this.tagsEl = document.getElementById('editor-tags');
    this.container = document.getElementById('editor-container');
    this.backBtn = document.getElementById('editor-back');
    this.finishBtn = document.getElementById('editor-finish');

    this.bookmark = null;
    this.sourceArea = null; // which area the user navigated from
    this.onSave = null;     // callback(bookmark, { title, content, nugget, status })
    this.textarea = null;

    this._bindEvents();
  }

  _bindEvents() {
    this.backBtn.addEventListener('click', () => this.close());
    this.finishBtn.addEventListener('click', () => this._onFinish());

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });
  }

  /**
   * Open the editor for a bookmark.
   * @param {Object} bookmark - The bookmark object
   * @param {string} sourceArea - Area ID the user navigated from (for context persistence)
   */
  open(bookmark, sourceArea = null) {
    this.bookmark = bookmark;
    this.sourceArea = sourceArea;

    // Title
    this.titleEl.textContent = bookmark.title || 'Untitled';

    // Tags
    this._renderTags(bookmark.tags || []);

    // Editor textarea
    this.container.innerHTML = '';
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'editor-textarea';
    this.textarea.value = bookmark.content || '';
    this.textarea.placeholder = 'Start writing your notes in Markdown...';
    this.container.appendChild(this.textarea);

    // Auto-save on blur
    this.textarea.addEventListener('blur', () => this._autoSave());

    // Show overlay
    this.overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Focus textarea
    setTimeout(() => this.textarea.focus(), 100);
  }

  _renderTags(tags) {
    this.tagsEl.innerHTML = tags.map(tag =>
      `<span class="editor-tag-chip">${tag}</span>`
    ).join('');
  }

  /**
   * "Finish" flow — requires a Golden Nugget before marking as done.
   */
  _onFinish() {
    // Save any pending content first
    this._autoSave();

    // Prompt for nugget
    const existing = this.bookmark.nugget || '';
    const nugget = prompt(
      'What\'s the key insight? (1 sentence)\nThis will replace the title on the graph.',
      existing
    );

    if (nugget === null) return; // cancelled
    if (!nugget.trim()) {
      alert('A Golden Nugget is required to finish.');
      return;
    }

    // Save with done status + nugget
    if (this.onSave) {
      this.onSave(this.bookmark, {
        title: this.titleEl.textContent,
        content: this.textarea.value,
        nugget: nugget.trim(),
        status: 'done',
      });
    }

    this.close();
  }

  /**
   * Auto-save content without changing status.
   */
  _autoSave() {
    if (!this.bookmark || !this.textarea) return;

    const content = this.textarea.value;
    const title = this.titleEl.textContent;

    // Only save if something changed
    if (content !== (this.bookmark.content || '') || title !== this.bookmark.title) {
      if (this.onSave) {
        this.onSave(this.bookmark, { title, content });
      }
      // Update local reference
      this.bookmark.content = content;
      this.bookmark.title = title;
    }
  }

  close() {
    this._autoSave();
    this.overlay.classList.add('hidden');
    document.body.style.overflow = '';
    this.bookmark = null;
  }

  isOpen() {
    return !this.overlay.classList.contains('hidden');
  }
}
