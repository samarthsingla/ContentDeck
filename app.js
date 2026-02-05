// ═══════════════════════════════════════════
// ContentDeck v2 — Personal Content Dashboard
// ═══════════════════════════════════════════

const SOURCE = {
  youtube:  { icon: '▶',  label: 'YouTube'  },
  twitter:  { icon: '𝕏',  label: 'Twitter'  },
  linkedin: { icon: 'in', label: 'LinkedIn' },
  substack: { icon: '✉',  label: 'Substack' },
  blog:     { icon: '✎',  label: 'Blog'     },
  book:     { icon: '📖', label: 'Book'     },
};

const STATUS_NEXT = { unread: 'reading', reading: 'done', done: 'unread' };

let db = null;
let allBookmarks = [];
let currentSource = 'all';
let currentStatus = 'unread';
let searchQuery = '';
let currentTag = '';

// ── Bootstrap ─────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const url = localStorage.getItem('sb_url');
  const key = localStorage.getItem('sb_key');

  if (url && key) {
    db = supabase.createClient(url, key);
    showDashboard();
    loadBookmarks();
  } else {
    showSetup();
  }

  bindEvents();
  registerSW();
});

// ── Navigation ────────────────────────────

function showSetup() {
  $('setup-screen').classList.remove('hidden');
  $('dashboard').classList.add('hidden');
}

function showDashboard() {
  $('setup-screen').classList.add('hidden');
  $('dashboard').classList.remove('hidden');
}

// ── Events ────────────────────────────────

function bindEvents() {
  // Setup
  $('setup-save').addEventListener('click', handleSetup);
  $('setup-url').addEventListener('keydown', e => e.key === 'Enter' && $('setup-key').focus());
  $('setup-key').addEventListener('keydown', e => e.key === 'Enter' && handleSetup());

  // Source tabs
  $('source-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentSource = tab.dataset.source;
    applyFilters();
  });

  // Status filters
  $('status-filters').addEventListener('click', e => {
    const btn = e.target.closest('.status-filter');
    if (!btn) return;
    document.querySelectorAll('.status-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentStatus = btn.dataset.status;
    applyFilters();
  });

  // Search (debounced)
  let searchTimer;
  $('search-input').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value.trim().toLowerCase();
      applyFilters();
    }, 200);
  });

  // FAB
  $('add-btn').addEventListener('click', showAddModal);

  // Settings
  $('settings-btn').addEventListener('click', showSettingsModal);

  // Modal backdrop
  $('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Keyboard: Escape closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

// ── Setup ─────────────────────────────────

async function handleSetup() {
  const url = $('setup-url').value.trim();
  const key = $('setup-key').value.trim();

  if (!url || !key) { toast('Please fill in both fields'); return; }

  $('setup-save').textContent = 'Connecting...';
  $('setup-save').disabled = true;

  try {
    const testDb = supabase.createClient(url, key);
    const { error } = await testDb.from('bookmarks').select('id').limit(1);

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        toast('Table "bookmarks" not found — run setup.sql first');
      } else {
        toast('Error: ' + error.message);
      }
      return;
    }

    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    db = supabase.createClient(url, key);
    showDashboard();
    loadBookmarks();
    toast('Connected!');
  } catch (err) {
    toast('Connection failed');
  } finally {
    $('setup-save').textContent = 'Connect';
    $('setup-save').disabled = false;
  }
}

// ── Data Loading ──────────────────────────

async function loadBookmarks() {
  const list = $('bookmarks-list');
  list.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  const { data, error } = await db
    .from('bookmarks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = '<div class="empty-state"><p>Failed to load bookmarks.</p></div>';
    console.error(error);
    return;
  }

  allBookmarks = data || [];
  updateStats();
  updateCounts();
  applyFilters();

  // Auto-fetch missing titles in the background
  autoFetchMissingTitles();
}

// ── Auto Title Fetching ───────────────────

async function autoFetchMissingTitles() {
  const untitled = allBookmarks.filter(b => !b.title);
  if (!untitled.length) return;

  let updated = false;

  for (const b of untitled) {
    const title = await fetchTitle(b.url, b.source_type);
    if (title) {
      await db.from('bookmarks').update({ title }).eq('id', b.id);
      b.title = title;
      updated = true;
    }
  }

  if (updated) applyFilters(); // re-render with new titles
}

async function fetchTitle(url, sourceType) {
  try {
    // YouTube — free oEmbed API
    if (sourceType === 'youtube' || /youtube\.com|youtu\.be/i.test(url)) {
      const resp = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      );
      if (resp.ok) {
        const data = await resp.json();
        return data.title || null;
      }
    }

    // Twitter/X — publish.twitter.com oEmbed
    if (sourceType === 'twitter' || /twitter\.com|x\.com/i.test(url)) {
      const resp = await fetch(
        `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`
      );
      if (resp.ok) {
        const data = await resp.json();
        return data.author_name ? `Post by ${data.author_name}` : null;
      }
    }

    // All other sources (Substack, blogs, LinkedIn, etc.) — use Microlink API
    // Free tier: 50 req/day, returns page title/description
    const resp = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}`
    );
    if (resp.ok) {
      const data = await resp.json();
      if (data.status === 'success' && data.data && data.data.title) {
        return data.data.title;
      }
    }
  } catch (e) { /* silent — CORS or network errors are expected */ }

  return null;
}

// ── Client-side Filtering ─────────────────

function applyFilters() {
  // Update tab counts to reflect current status filter
  updateCounts();

  let filtered = allBookmarks;

  // Source
  if (currentSource !== 'all') {
    filtered = filtered.filter(b => b.source_type === currentSource);
  }

  // Status
  if (currentStatus !== 'all') {
    filtered = filtered.filter(b => b.status === currentStatus);
  }

  // Search
  if (searchQuery) {
    filtered = filtered.filter(b =>
      (b.title || '').toLowerCase().includes(searchQuery) ||
      b.url.toLowerCase().includes(searchQuery) ||
      (b.notes || '').toLowerCase().includes(searchQuery) ||
      (b.tags || []).some(t => t.toLowerCase().includes(searchQuery))
    );
  }

  // Tag
  if (currentTag) {
    filtered = filtered.filter(b => (b.tags || []).includes(currentTag));
  }

  renderBookmarks(filtered);
}

// ── Stats ─────────────────────────────────

function updateStats() {
  const unread  = allBookmarks.filter(b => b.status === 'unread').length;
  const reading = allBookmarks.filter(b => b.status === 'reading').length;
  const done    = allBookmarks.filter(b => b.status === 'done').length;
  const total   = allBookmarks.length;

  $('stats-bar').innerHTML = `
    <div class="stat"><span class="stat-num unread">${unread}</span> unread</div>
    <div class="stat"><span class="stat-num reading">${reading}</span> reading</div>
    <div class="stat"><span class="stat-num done">${done}</span> done</div>
    <div class="stat"><span class="stat-num">${total}</span> total</div>
  `;
}

// ── Tab Counts ────────────────────────────

function updateCounts() {
  // Counts reflect current status filter so numbers match what you see
  const pool = currentStatus === 'all'
    ? allBookmarks
    : allBookmarks.filter(b => b.status === currentStatus);

  document.querySelectorAll('.tab').forEach(tab => {
    const src = tab.dataset.source;
    const count = src === 'all'
      ? pool.length
      : pool.filter(b => b.source_type === src).length;
    const el = tab.querySelector('.count');
    if (el) el.textContent = count > 0 ? count : '';
  });
}

// ── Render ────────────────────────────────

function renderBookmarks(bookmarks) {
  const list = $('bookmarks-list');

  if (!bookmarks.length) {
    const label = currentSource === 'all' ? '' : ` in ${(SOURCE[currentSource] || {}).label || currentSource}`;
    const status = currentStatus === 'all' ? '' : currentStatus + ' ';
    const search = searchQuery ? ` matching "${searchQuery}"` : '';
    const tag = currentTag ? ` tagged #${currentTag}` : '';

    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📑</div>
        <p>No ${status}bookmarks${label}${search}${tag}.<br>Tap <strong>+</strong> to add one.</p>
      </div>`;
    return;
  }

  list.innerHTML = bookmarks.map((b, i) => {
    const src = SOURCE[b.source_type] || SOURCE.blog;
    const host = hostname(b.url);
    const time = timeAgo(b.created_at);
    const title = esc(b.title || host || b.url);
    const tags = b.tags || [];
    const notes = b.notes || '';
    const faviconUrl = host
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`
      : '';

    return `
      <div class="bookmark-card" style="animation-delay:${Math.min(i * 25, 300)}ms">
        <div class="source-icon ${esc(b.source_type)}">${src.icon}</div>
        <div class="bookmark-body">
          <div class="bookmark-title">
            <a href="${esc(b.url)}" target="_blank" rel="noopener">${title}</a>
          </div>
          <div class="bookmark-meta">
            ${faviconUrl ? `<img class="favicon" src="${faviconUrl}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
            <span>${esc(host)}</span>
            <span class="dot">&middot;</span>
            <span>${time}</span>
          </div>
          ${notes ? `<div class="bookmark-notes">${esc(notes)}</div>` : ''}
          ${tags.length ? `<div class="bookmark-tags">${tags.map(t =>
            `<button class="tag-pill" onclick="filterByTag('${esc(t)}')">${esc(t)}</button>`
          ).join('')}</div>` : ''}
        </div>
        <div class="bookmark-actions">
          <button class="status-badge ${esc(b.status)}"
                  onclick="cycleStatus('${b.id}','${b.status}')">${b.status}</button>
          <button class="delete-btn" onclick="deleteBookmark('${b.id}')">✕</button>
        </div>
      </div>`;
  }).join('');
}

// ── Tag Filter ────────────────────────────

function filterByTag(tag) {
  if (currentTag === tag) {
    clearTagFilter();
    return;
  }
  currentTag = tag;
  const el = $('active-tag');
  el.classList.remove('hidden');
  el.innerHTML = `#${esc(tag)} <button class="remove-tag" onclick="clearTagFilter()">✕</button>`;
  applyFilters();
}

function clearTagFilter() {
  currentTag = '';
  $('active-tag').classList.add('hidden');
  applyFilters();
}

// ── Add Bookmark ──────────────────────────

function showAddModal() {
  const sheet = $('modal-sheet');
  sheet.innerHTML = `
    <div class="handle"></div>
    <h2>Add Bookmark</h2>
    <input type="url" id="inp-url" placeholder="Paste URL here..." autofocus>
    <input type="text" id="inp-title" placeholder="Title (optional)">
    <select id="inp-source">
      <option value="auto">Auto-detect source</option>
      <option value="youtube">YouTube</option>
      <option value="twitter">Twitter / X</option>
      <option value="linkedin">LinkedIn</option>
      <option value="substack">Substack</option>
      <option value="blog">Blog</option>
      <option value="book">Book</option>
    </select>
    <input type="text" id="inp-tags" placeholder="Tags (comma separated, e.g. must-read, weekend)">
    <textarea id="inp-notes" placeholder="Notes (optional)"></textarea>
    <div class="modal-btns">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-save" id="btn-add">Save</button>
    </div>`;

  $('modal-overlay').classList.remove('hidden');

  $('btn-add').addEventListener('click', handleAdd);
  $('inp-url').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('inp-title').focus();
  });
}

async function handleAdd() {
  const url = $('inp-url').value.trim();
  if (!url) { toast('Enter a URL'); return; }

  const srcVal = $('inp-source').value;
  const sourceType = srcVal === 'auto' ? detectSource(url) : srcVal;
  const title = $('inp-title').value.trim() || null;
  const notes = $('inp-notes').value.trim() || null;
  const tagsRaw = $('inp-tags').value.trim();
  const tags = tagsRaw
    ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    : [];

  $('btn-add').textContent = 'Saving...';
  $('btn-add').disabled = true;

  const { error } = await db.from('bookmarks').insert({
    url, title, source_type: sourceType, notes, tags, status: 'unread'
  });

  if (error) {
    toast('Failed to save');
    $('btn-add').textContent = 'Save';
    $('btn-add').disabled = false;
    return;
  }

  closeModal();
  await loadBookmarks(); // this triggers autoFetchMissingTitles
  toast('Saved!');
}

// ── Status & Delete ───────────────────────

async function cycleStatus(id, current) {
  const next = STATUS_NEXT[current];

  // Optimistic update
  const bm = allBookmarks.find(b => b.id === id);
  if (bm) {
    bm.status = next;
    updateStats();
    updateCounts();
    applyFilters();
  }

  const { error } = await db.from('bookmarks').update({ status: next }).eq('id', id);
  if (error) {
    toast('Update failed');
    loadBookmarks(); // revert
  }
}

async function deleteBookmark(id) {
  if (!confirm('Delete this bookmark?')) return;

  // Optimistic
  allBookmarks = allBookmarks.filter(b => b.id !== id);
  updateStats();
  updateCounts();
  applyFilters();

  const { error } = await db.from('bookmarks').delete().eq('id', id);
  if (error) {
    toast('Delete failed');
    loadBookmarks();
    return;
  }
  toast('Deleted');
}

// ── Settings Modal ────────────────────────

function showSettingsModal() {
  const sbUrl = localStorage.getItem('sb_url') || '';
  const sbKey = localStorage.getItem('sb_key') || '';
  const bookmarkletCode = generateBookmarklet(sbUrl, sbKey);

  const sheet = $('modal-sheet');
  sheet.innerHTML = `
    <div class="handle"></div>
    <h2>Settings</h2>

    <div class="setting-group">
      <label>Supabase Project URL</label>
      <input type="url" id="set-url" value="${esc(sbUrl)}">
    </div>
    <div class="setting-group">
      <label>Supabase Anon Key</label>
      <input type="text" id="set-key" value="${esc(sbKey)}">
    </div>

    <div class="modal-btns">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-save" id="btn-save-settings">Save</button>
    </div>

    <button class="btn-danger" id="btn-reset">Reset App</button>

    <!-- PC Bookmarklet -->
    <div class="section-title">PC Browser — One-Click Bookmark</div>
    <div class="bookmarklet-area">
      <a class="bookmarklet-link" href="${bookmarkletCode}" onclick="event.preventDefault();toast('Drag this to your bookmarks bar!')"
         title="Drag to bookmarks bar">📑 + ContentDeck</a>
      <p class="bookmarklet-help">
        Drag the button above to your <strong>bookmarks bar</strong>.<br>
        Then click it on any webpage to save it instantly.
      </p>
      <button class="copy-btn" id="btn-copy-bml">Copy bookmarklet code</button>
    </div>

    <!-- iOS Shortcut -->
    <div class="section-title">iPhone — Share Sheet Shortcut</div>
    <div class="shortcut-guide">
      <strong>Set up a one-tap iOS Shortcut</strong>
      <ol>
        <li>Open <b>Shortcuts</b> app → tap <b>+</b> to create new</li>
        <li>Tap the <b>info button (ⓘ)</b> at the bottom</li>
        <li>Toggle on <b>"Show in Share Sheet"</b> → select <b>URLs</b> → tap <b>checkmark</b></li>
        <li>Add action: search <b>"Get URLs from Input"</b></li>
        <li>Add action: search <b>"Get Contents of URL"</b>, then tap <b>Show More</b> and configure:<br>
          URL: <code>${esc(sbUrl)}/rest/v1/bookmarks</code><br>
          Method: <code>POST</code><br>
          Headers (add 4):<br>
          &nbsp;&nbsp;<code>apikey</code> → your anon key<br>
          &nbsp;&nbsp;<code>Authorization</code> → <code>Bearer</code> + your anon key<br>
          &nbsp;&nbsp;<code>Content-Type</code> → <code>application/json</code><br>
          &nbsp;&nbsp;<code>Prefer</code> → <code>return=minimal</code><br>
          Body: <b>JSON</b> → add key <code>url</code> → set value to the <b>URLs</b> variable (tap the variable bar above keyboard)
        </li>
        <li>Tap the name at top → rename to <b>"Bookmark"</b> → tap <b>Done</b></li>
      </ol>
    </div>`;

  $('modal-overlay').classList.remove('hidden');

  // Bind settings events
  $('btn-save-settings').addEventListener('click', () => {
    const url = $('set-url').value.trim();
    const key = $('set-key').value.trim();
    if (!url || !key) { toast('Both fields required'); return; }
    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    db = supabase.createClient(url, key);
    closeModal();
    loadBookmarks();
    toast('Settings saved');
  });

  $('btn-reset').addEventListener('click', () => {
    if (confirm('Disconnect and reset the app?')) {
      localStorage.clear();
      location.reload();
    }
  });

  $('btn-copy-bml').addEventListener('click', () => {
    navigator.clipboard.writeText(bookmarkletCode).then(() => {
      toast('Copied! Create a bookmark and paste as URL.');
    }).catch(() => {
      toast('Copy failed — try manually selecting the code');
    });
  });
}

// ── Bookmarklet Generator ─────────────────

function generateBookmarklet(sbUrl, sbKey) {
  // Minified bookmarklet that grabs page URL + title, POSTs to Supabase, shows toast
  return `javascript:void(function(){var u=location.href,t=document.title;fetch('${sbUrl}/rest/v1/bookmarks',{method:'POST',headers:{'apikey':'${sbKey}','Authorization':'Bearer ${sbKey}','Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({url:u,title:t})}).then(function(r){var d=document.createElement('div');d.style.cssText='position:fixed;top:20px;right:20px;padding:14px 24px;border-radius:12px;font:600 14px -apple-system,system-ui,sans-serif;z-index:2147483647;box-shadow:0 4px 24px rgba(0,0,0,.3);transition:opacity .3s;';if(r.ok){d.style.background='%236c63ff';d.style.color='%23fff';d.textContent='\\u2713 Saved to ContentDeck'}else{d.style.background='%23ff6b6b';d.style.color='%23fff';d.textContent='\\u2717 Failed to save'}document.body.appendChild(d);setTimeout(function(){d.style.opacity='0';setTimeout(function(){d.remove()},300)},2e3)})})()`;
}

// ── Helpers ───────────────────────────────

function detectSource(url) {
  if (/youtube\.com|youtu\.be|youtube\.app\.goo\.gl/i.test(url)) return 'youtube';
  if (/twitter\.com|x\.com|\/t\.co\//i.test(url))               return 'twitter';
  if (/linkedin\.com|lnkd\.in/i.test(url))                      return 'linkedin';
  if (/substack\.com/i.test(url))                                return 'substack';
  return 'blog';
}

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)     return 'just now';
  if (s < 3600)   return Math.floor(s / 60) + 'm ago';
  if (s < 86400)  return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(iso).toLocaleDateString();
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function $(id) { return document.getElementById(id); }

function closeModal() {
  $('modal-overlay').classList.add('hidden');
}

function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
