// ═══════════════════════════════════════════
// ContentDeck v4.0 — Personal Content Dashboard
// https://github.com/aditya30103/ContentDeck
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
let currentSort = 'newest';

// Tag areas
let tagAreas = [];
let currentView = localStorage.getItem('view') || 'list'; // 'areas' or 'list'

// Bulk mode
let selectMode = false;
let selectedIds = new Set();

// ── Persistent Storage (localStorage + cookie fallback) ──

function saveCredential(key, value) {
  localStorage.setItem(key, value);
  // Cookie: 400-day expiry, SameSite=Strict, Secure on HTTPS
  const expires = new Date(Date.now() + 400 * 86400000).toUTCString();
  const secure = location.protocol === 'https:' ? ';Secure' : '';
  document.cookie = `${key}=${encodeURIComponent(value)};expires=${expires};path=/${secure};SameSite=Strict`;
}

function loadCredential(key) {
  const ls = localStorage.getItem(key);
  if (ls) return ls;
  // Fallback: read from cookie
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  if (match) {
    const val = decodeURIComponent(match[1]);
    localStorage.setItem(key, val); // Restore to localStorage
    return val;
  }
  return null;
}

function removeCredential(key) {
  localStorage.removeItem(key);
  document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// ── Bootstrap ─────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const url = loadCredential('sb_url');
  const key = loadCredential('sb_key');

  if (url && key) {
    db = supabase.createClient(url, key);
    showDashboard();
    // Load tag areas first, then bookmarks (so auto-tag has areas available)
    loadTagAreas().then(() => loadBookmarks());
    if (window.Stats) Stats.loadHistory(db);
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
  applyView();
}

// ── View Toggle ───────────────────────────

function applyView() {
  const areasView = $('areas-view');
  const listControls = $('list-controls');
  const bookmarksList = $('bookmarks-list');
  const viewBtn = $('view-toggle-btn');

  if (currentView === 'areas') {
    areasView.classList.remove('hidden');
    listControls.classList.add('hidden');
    bookmarksList.classList.add('hidden');
    if (viewBtn) viewBtn.title = 'List View';
  } else {
    areasView.classList.add('hidden');
    listControls.classList.remove('hidden');
    bookmarksList.classList.remove('hidden');
    if (viewBtn) viewBtn.title = 'Areas View';
  }
}

function toggleView() {
  // If graph is open, close it first
  if (!$('graph-view').classList.contains('hidden')) {
    hideGraphView();
  }
  currentView = currentView === 'areas' ? 'list' : 'areas';
  localStorage.setItem('view', currentView);
  applyView();
  if (currentView === 'areas') renderAreasView();
}

let graphVisible = false;

function toggleGraphView() {
  if (graphVisible) {
    hideGraphView();
    applyView();
    graphVisible = false;
  } else {
    showGraphView();
    graphVisible = true;
  }
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

  // Sort
  $('sort-select').addEventListener('change', e => {
    currentSort = e.target.value;
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

  // View toggle
  $('view-toggle-btn').addEventListener('click', toggleView);

  // Graph view
  $('graph-btn').addEventListener('click', toggleGraphView);
  $('graph-filter').addEventListener('change', () => {
    if (!$('graph-view').classList.contains('hidden')) renderGraph();
  });

  // Daily view
  $('calendar-btn').addEventListener('click', toggleDailyView);

  // Select mode
  $('select-btn').addEventListener('click', toggleSelectMode);

  // Stats bar click
  $('stats-bar').addEventListener('click', showStatsModal);

  // Modal backdrop
  $('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Keyboard: Escape closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (selectMode) exitSelectMode();
      else closeModal();
    }
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

    saveCredential('sb_url', url);
    saveCredential('sb_key', key);
    db = supabase.createClient(url, key);
    showDashboard();
    // Load tag areas first, then bookmarks (so auto-tag has areas available)
    loadTagAreas().then(() => loadBookmarks());
    if (window.Stats) Stats.loadHistory(db);
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
  if (currentView === 'areas') renderAreasView();

  autoFetchMissingMetadata();
  autoTagUntaggedBookmarks(); // Tag iOS/PC bookmarks that bypassed dashboard
}

async function loadTagAreas() {
  const { data } = await db
    .from('tag_areas')
    .select('*')
    .order('sort_order', { ascending: true });
  tagAreas = data || [];
  if (currentView === 'areas') renderAreasView();
}

// ── Auto Metadata Fetching (Title + Image) ──

async function autoFetchMissingMetadata() {
  // Check for missing title, image, or YouTube-specific fields
  const needsMetadata = allBookmarks.filter(b =>
    !b.title || !b.image ||
    (b.source_type === 'youtube' && !b.duration)
  );
  if (!needsMetadata.length) {
    console.log('Auto-fetch: All bookmarks have metadata');
    return;
  }

  console.log(`Auto-fetch: ${needsMetadata.length} bookmarks need metadata`);
  let updated = 0;

  for (const b of needsMetadata) {
    try {
      const meta = await fetchMetadata(b.url, b.source_type);
      const updates = {};
      if (!b.title && meta.title) updates.title = meta.title;
      if (!b.image && meta.image) updates.image = meta.image;
      if (!b.duration && meta.duration) updates.duration = meta.duration;
      if (!b.channel && meta.channel) updates.channel = meta.channel;

      if (Object.keys(updates).length) {
        const { error } = await db.from('bookmarks').update(updates).eq('id', b.id);
        if (!error) {
          Object.assign(b, updates);
          updated++;
        }
      }
    } catch (e) {
      console.warn('Auto-fetch failed for', b.url, e);
    }
  }

  if (updated) {
    console.log(`Auto-fetch: Updated ${updated} bookmarks`);
    applyFilters();
  }
}

// YouTube API key (stored in settings)
const YT_API_KEY = 'AIzaSyD-ehlrtDUos9il83eTs1AQVbDQKXuP7Fw';

function extractYouTubeId(url) {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/v\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function parseYouTubeDuration(iso) {
  // PT1H2M3S → 1:02:03 or PT5M30S → 5:30
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const h = parseInt(match[1] || 0);
  const m = parseInt(match[2] || 0);
  const s = parseInt(match[3] || 0);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function fetchMetadata(url, sourceType) {
  const result = { title: null, image: null, duration: null, channel: null };

  try {
    // YouTube: use Data API for rich metadata
    if (sourceType === 'youtube' || /youtube\.com|youtu\.be/i.test(url)) {
      const videoId = extractYouTubeId(url);
      if (videoId && YT_API_KEY) {
        const resp = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YT_API_KEY}`
        );
        if (resp.ok) {
          const data = await resp.json();
          if (data.items && data.items[0]) {
            const item = data.items[0];
            result.title = item.snippet.title;
            result.channel = item.snippet.channelTitle;
            result.image = item.snippet.thumbnails?.maxres?.url
              || item.snippet.thumbnails?.high?.url
              || item.snippet.thumbnails?.medium?.url;
            result.duration = parseYouTubeDuration(item.contentDetails.duration);
            return result;
          }
        }
      }
      // Fallback to oembed if Data API fails
      const resp = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      );
      if (resp.ok) {
        const data = await resp.json();
        result.title = data.title || null;
        result.image = data.thumbnail_url || null;
        return result;
      }
    }

    // Twitter: get author name (no image from oembed)
    if (sourceType === 'twitter' || /twitter\.com|x\.com/i.test(url)) {
      const resp = await fetch(
        `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`
      );
      if (resp.ok) {
        const data = await resp.json();
        result.title = data.author_name ? `Post by ${data.author_name}` : null;
        // Twitter oembed doesn't provide image, fall through to Microlink
      }
    }

    // Generic: use Microlink for title + OG image
    const resp = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}`
    );
    if (resp.ok) {
      const data = await resp.json();
      if (data.status === 'success' && data.data) {
        if (!result.title && data.data.title) result.title = data.data.title;
        if (data.data.image && data.data.image.url) result.image = data.data.image.url;
      }
    }
  } catch (e) { /* silent */ }

  return result;
}

// ── Auto-Tag Untagged Bookmarks (iOS/PC) ──

let autoTagInProgress = false;

async function autoTagUntaggedBookmarks() {
  // Skip if AI not configured, no tag areas, or already running
  if (!window.AI || !AI.isConfigured() || !tagAreas.length || autoTagInProgress) return;

  // Find recent untagged bookmarks (created in last 7 days, no tags)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const untagged = allBookmarks.filter(b =>
    (!b.tags || !b.tags.length) &&
    b.created_at > weekAgo
  );

  if (!untagged.length) return;

  autoTagInProgress = true;
  showAutoTagIndicator(untagged.length);

  let tagged = 0;
  for (const bm of untagged) {
    const result = await AI.suggestTags(bm, tagAreas);
    if (result && !result.error) {
      const matchedAreas = result._matchedAreas || [];
      if (matchedAreas.length) {
        const rows = matchedAreas.map(a => ({ bookmark_id: bm.id, tag_area_id: a.id }));
        const { error } = await db.from('bookmark_tags').upsert(rows, { onConflict: 'bookmark_id,tag_area_id' });
        if (!error) tagged++;
      }
    }
    updateAutoTagIndicator(tagged, untagged.length);
    // Rate limit
    await new Promise(r => setTimeout(r, 400));
  }

  hideAutoTagIndicator();
  autoTagInProgress = false;

  if (tagged > 0) {
    toast(`Auto-tagged ${tagged} new bookmark${tagged > 1 ? 's' : ''}`);
    await loadBookmarks();
  }
}

function showAutoTagIndicator(count) {
  // Remove existing
  document.querySelectorAll('.auto-tag-indicator').forEach(el => el.remove());

  const indicator = document.createElement('div');
  indicator.className = 'auto-tag-indicator';
  indicator.innerHTML = `<span class="auto-tag-spinner"></span><span id="auto-tag-text">AI tagging ${count} new...</span>`;
  $('stats-bar').after(indicator);
}

function updateAutoTagIndicator(done, total) {
  const text = $('auto-tag-text');
  if (text) text.textContent = `AI tagging... ${done}/${total}`;
}

function hideAutoTagIndicator() {
  document.querySelectorAll('.auto-tag-indicator').forEach(el => el.remove());
}

// ── Client-side Filtering ─────────────────

function applyFilters() {
  updateCounts();

  let filtered = allBookmarks;

  if (currentSource !== 'all') {
    filtered = filtered.filter(b => b.source_type === currentSource);
  }

  if (currentStatus !== 'all') {
    filtered = filtered.filter(b => b.status === currentStatus);
  }

  if (searchQuery) {
    filtered = filtered.filter(b =>
      (b.title || '').toLowerCase().includes(searchQuery) ||
      b.url.toLowerCase().includes(searchQuery) ||
      (b.notes || '').toLowerCase().includes(searchQuery) ||
      (b.tags || []).some(t => t.toLowerCase().includes(searchQuery))
    );
  }

  if (currentTag === '__unsorted__') {
    filtered = filtered.filter(b => !b.tags || !b.tags.length);
  } else if (currentTag) {
    filtered = filtered.filter(b => (b.tags || []).includes(currentTag));
  }

  filtered = sortBookmarks(filtered);
  renderBookmarks(filtered);
}

// ── Sort ──────────────────────────────────

function sortBookmarks(list) {
  const sorted = [...list];
  switch (currentSort) {
    case 'newest':
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    case 'oldest':
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case 'title-az':
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'title-za':
      sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      break;
    case 'source':
      sorted.sort((a, b) => (a.source_type || '').localeCompare(b.source_type || ''));
      break;
    case 'status':
      const order = { unread: 0, reading: 1, done: 2 };
      sorted.sort((a, b) => (order[a.status] || 0) - (order[b.status] || 0));
      break;
  }
  return sorted;
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
    const tag = currentTag === '__unsorted__' ? ' without tags' : currentTag ? ` tagged #${currentTag}` : '';

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
    const checked = selectedIds.has(b.id) ? 'checked' : '';
    const hasImage = b.image && b.image.trim();

    return `
      <div class="bookmark-card ${selectMode ? 'select-active' : ''}${hasImage ? ' has-thumb' : ''}" style="animation-delay:${Math.min(i * 25, 300)}ms"
           ${selectMode ? `onclick="toggleSelect('${b.id}')"` : ''}>
        ${selectMode ? `<input type="checkbox" class="bulk-check" ${checked} onclick="event.stopPropagation();toggleSelect('${b.id}')">` : ''}
        ${hasImage ? `
          <div class="bookmark-thumb">
            <img src="${esc(b.image)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('thumb-error')">
            <div class="source-badge ${esc(b.source_type)}">${src.icon}</div>
          </div>` : `
          <div class="source-icon ${esc(b.source_type)}">${src.icon}</div>`}
        <div class="bookmark-body" onclick="${selectMode ? '' : `event.stopPropagation();showDrawer('${b.id}')`}" style="cursor:${selectMode ? 'default' : 'pointer'}">
          <div class="bookmark-title">${title}</div>
          <div class="bookmark-meta">
            ${faviconUrl ? `<img class="favicon" src="${faviconUrl}" alt="${esc(host)}" loading="lazy" onerror="this.style.display='none'">` : ''}
            <span>${b.channel ? esc(b.channel) : esc(host)}</span>
            <span class="dot">&middot;</span>
            <span>${time}</span>
            ${b.duration ? `<span class="dot">&middot;</span><span class="duration-badge">${esc(b.duration)}</span>` : ''}
          </div>
          ${notes ? `<div class="bookmark-notes">${esc(notes)}</div>` : ''}
          ${tags.length ? `<div class="bookmark-tags">${tags.map(t =>
            `<button class="tag-pill" onclick="event.stopPropagation();filterByTag('${esc(t)}')">${esc(t)}</button>`
          ).join('')}</div>` : ''}
        </div>
        <div class="bookmark-actions">
          <button class="refresh-btn" onclick="event.stopPropagation();refreshMetadata('${b.id}')" title="Refresh metadata">↻</button>
          <button class="edit-btn" onclick="event.stopPropagation();showEditModal('${b.id}')" title="Edit">✎</button>
          <button class="status-badge ${esc(b.status)}"
                  onclick="event.stopPropagation();cycleStatus('${b.id}','${b.status}')">${b.status}</button>
          <button class="delete-btn" onclick="event.stopPropagation();deleteBookmark('${b.id}')">✕</button>
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
  // Switch to list view if in areas view
  if (currentView === 'areas') {
    currentView = 'list';
    localStorage.setItem('view', 'list');
    applyView();
  }
  const el = $('active-tag');
  el.classList.remove('hidden');
  const label = tag === '__unsorted__' ? 'Unsorted' : `#${esc(tag)}`;
  el.innerHTML = `${label} <button class="remove-tag" onclick="clearTagFilter()">✕</button>`;
  applyFilters();
}

function clearTagFilter() {
  currentTag = '';
  $('active-tag').classList.add('hidden');
  applyFilters();
}

// ── Add Bookmark ──────────────────────────

function showAddModal() {
  const tagsOptions = tagAreas.map(a =>
    `<label class="tag-check-label"><input type="checkbox" value="${esc(a.name)}" class="tag-area-check"> ${a.emoji} ${esc(a.name)}</label>`
  ).join('');

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
    ${tagAreas.length ? `
      <div class="setting-group">
        <label>Tag Areas</label>
        <div class="tag-checks">${tagsOptions}</div>
      </div>` : ''}
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
  const manualTags = tagsRaw
    ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    : [];

  // Checked tag areas
  const checkedAreas = [...document.querySelectorAll('.tag-area-check:checked')]
    .map(cb => cb.value);
  const allTags = [...new Set([...checkedAreas, ...manualTags])];

  $('btn-add').textContent = 'Saving...';
  $('btn-add').disabled = true;

  const { data, error } = await db.from('bookmarks').insert({
    url, title, source_type: sourceType, notes, tags: allTags, status: 'unread'
  }).select();

  if (error) {
    toast('Failed to save');
    $('btn-add').textContent = 'Save';
    $('btn-add').disabled = false;
    return;
  }

  // Sync junction table for checked tag areas
  if (data && data[0] && checkedAreas.length) {
    const bmId = data[0].id;
    const junctionRows = checkedAreas
      .map(name => tagAreas.find(a => a.name === name))
      .filter(Boolean)
      .map(a => ({ bookmark_id: bmId, tag_area_id: a.id }));
    if (junctionRows.length) {
      await db.from('bookmark_tags').insert(junctionRows);
    }
  }

  closeModal();
  await loadBookmarks();

  // Fetch metadata (image) for the new bookmark in background
  if (data && data[0]) {
    const bm = data[0];
    fetchMetadata(bm.url, bm.source_type).then(async meta => {
      if (meta.image) {
        await db.from('bookmarks').update({ image: meta.image }).eq('id', bm.id);
        // Update local cache and re-render
        const local = allBookmarks.find(b => b.id === bm.id);
        if (local) { local.image = meta.image; applyFilters(); }
      }
    });
  }

  // AI tag suggestion with indicator
  if (data && data[0] && window.AI && AI.isConfigured() && tagAreas.length && !checkedAreas.length) {
    toast('Saved! AI tagging...');
    await autoTagBookmark(data[0]);
  } else {
    toast('Saved!');
  }
}

// ── AI Auto-Tag ───────────────────────────

async function autoTagBookmark(bookmark) {
  const result = await AI.suggestTags(bookmark, tagAreas);
  if (!result || result.error) {
    if (result && result.error) console.warn('AI auto-tag failed:', result.error, result.details);
    return;
  }

  // Use pre-matched areas from AI module
  const matchedAreas = result._matchedAreas || [];

  if (matchedAreas.length) {
    const rows = matchedAreas.map(a => ({ bookmark_id: bookmark.id, tag_area_id: a.id }));
    const { error } = await db.from('bookmark_tags').upsert(rows, { onConflict: 'bookmark_id,tag_area_id' });
    if (error) {
      console.error('AI tag save error:', error);
    } else {
      toast(`AI tagged: ${matchedAreas.map(a => a.emoji + ' ' + a.name).join(', ')}`);
      loadBookmarks();
    }
  }

  if (result.suggest_new) {
    showAISuggestion(result.suggest_new, bookmark);
  }
}

function showAISuggestion(suggestion, bookmark) {
  // Remove any existing suggestion bar
  document.querySelectorAll('.ai-suggest-bar').forEach(el => el.remove());

  const bar = document.createElement('div');
  bar.className = 'ai-suggest-bar';
  bar.innerHTML = `
    <span>AI suggests new area: <strong>${esc(suggestion.emoji)} ${esc(suggestion.name)}</strong></span>
    <button class="btn-ai-accept" onclick="acceptAISuggestion(this, '${esc(suggestion.name)}', '${esc(suggestion.description || '')}', '${esc(suggestion.emoji)}', '${bookmark.id}')">Add</button>
    <button class="btn-ai-dismiss" onclick="this.parentElement.remove()">Dismiss</button>
  `;
  $('dashboard').insertBefore(bar, $('bookmarks-list'));

  // Auto-dismiss after 10s
  setTimeout(() => bar.remove(), 10000);
}

async function acceptAISuggestion(btn, name, description, emoji, bookmarkId) {
  btn.disabled = true;
  const { data, error } = await db.from('tag_areas').insert({
    name, description, emoji, color: '#6c63ff'
  }).select();

  if (error) { toast('Failed to create area'); return; }

  if (data && data[0]) {
    await db.from('bookmark_tags').insert({
      bookmark_id: bookmarkId,
      tag_area_id: data[0].id
    });
  }

  btn.closest('.ai-suggest-bar').remove();
  toast(`Created area: ${emoji} ${name}`);
  loadTagAreas();
  loadBookmarks();
}

// ── Edit Bookmark ─────────────────────────

function showEditModal(id) {
  const bm = allBookmarks.find(b => b.id === id);
  if (!bm) return;

  const tagsOptions = tagAreas.map(a => {
    const checked = (bm.tags || []).includes(a.name) ? 'checked' : '';
    return `<label class="tag-check-label"><input type="checkbox" value="${esc(a.name)}" class="tag-area-check" ${checked}> ${a.emoji} ${esc(a.name)}</label>`;
  }).join('');

  const sheet = $('modal-sheet');
  sheet.innerHTML = `
    <div class="handle"></div>
    <h2>Edit Bookmark</h2>
    <input type="url" id="edit-url" value="${esc(bm.url)}">
    <input type="text" id="edit-title" value="${esc(bm.title || '')}" placeholder="Title">
    <select id="edit-source">
      <option value="youtube" ${bm.source_type === 'youtube' ? 'selected' : ''}>YouTube</option>
      <option value="twitter" ${bm.source_type === 'twitter' ? 'selected' : ''}>Twitter / X</option>
      <option value="linkedin" ${bm.source_type === 'linkedin' ? 'selected' : ''}>LinkedIn</option>
      <option value="substack" ${bm.source_type === 'substack' ? 'selected' : ''}>Substack</option>
      <option value="blog" ${bm.source_type === 'blog' ? 'selected' : ''}>Blog</option>
      <option value="book" ${bm.source_type === 'book' ? 'selected' : ''}>Book</option>
    </select>
    <select id="edit-status">
      <option value="unread" ${bm.status === 'unread' ? 'selected' : ''}>Unread</option>
      <option value="reading" ${bm.status === 'reading' ? 'selected' : ''}>Reading</option>
      <option value="done" ${bm.status === 'done' ? 'selected' : ''}>Done</option>
    </select>
    ${tagAreas.length ? `
      <div class="setting-group">
        <label>Tag Areas</label>
        <div class="tag-checks">${tagsOptions}</div>
      </div>` : ''}
    <input type="text" id="edit-tags" value="${esc((bm.tags || []).join(', '))}" placeholder="Tags (comma separated)">
    <textarea id="edit-notes" placeholder="Notes">${esc(bm.notes || '')}</textarea>
    <div class="modal-btns">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-save" id="btn-edit">Save</button>
    </div>`;

  $('modal-overlay').classList.remove('hidden');
  $('btn-edit').addEventListener('click', () => handleEdit(id));
}

async function handleEdit(id) {
  const url = $('edit-url').value.trim();
  if (!url) { toast('URL is required'); return; }

  const title = $('edit-title').value.trim() || null;
  const sourceType = $('edit-source').value;
  const status = $('edit-status').value;
  const notes = $('edit-notes').value.trim() || null;
  const tagsRaw = $('edit-tags').value.trim();
  const manualTags = tagsRaw
    ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    : [];
  const checkedAreas = [...document.querySelectorAll('.tag-area-check:checked')]
    .map(cb => cb.value);
  const allTags = [...new Set([...checkedAreas, ...manualTags])];

  $('btn-edit').textContent = 'Saving...';
  $('btn-edit').disabled = true;

  const { error } = await db.from('bookmarks').update({
    url, title, source_type: sourceType, status, notes, tags: allTags
  }).eq('id', id);

  if (error) {
    toast('Update failed');
    $('btn-edit').textContent = 'Save';
    $('btn-edit').disabled = false;
    return;
  }

  // Sync junction table: delete old, insert new
  await db.from('bookmark_tags').delete().eq('bookmark_id', id);
  const junctionRows = checkedAreas
    .map(name => tagAreas.find(a => a.name === name))
    .filter(Boolean)
    .map(a => ({ bookmark_id: id, tag_area_id: a.id }));
  if (junctionRows.length) {
    await db.from('bookmark_tags').insert(junctionRows);
  }

  closeModal();
  await loadBookmarks();
  toast('Updated!');
}

// ── Bulk Actions ──────────────────────────

function toggleSelectMode() {
  if (selectMode) {
    exitSelectMode();
  } else {
    selectMode = true;
    selectedIds.clear();
    $('select-btn').classList.add('active');
    $('bulk-bar').classList.remove('hidden');
    updateBulkCount();
    applyFilters();
  }
}

function exitSelectMode() {
  selectMode = false;
  selectedIds.clear();
  $('select-btn').classList.remove('active');
  $('bulk-bar').classList.add('hidden');
  applyFilters();
}

function toggleSelect(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  updateBulkCount();
  applyFilters();
}

function updateBulkCount() {
  const el = $('bulk-count');
  if (el) el.textContent = `${selectedIds.size} selected`;
}

function bulkStatusPrompt() {
  if (!selectedIds.size) { toast('Select bookmarks first'); return; }

  const sheet = $('modal-sheet');
  sheet.innerHTML = `
    <div class="handle"></div>
    <h2>Change Status</h2>
    <p style="color:var(--text-secondary);font-size:14px;margin-bottom:16px">${selectedIds.size} bookmark${selectedIds.size > 1 ? 's' : ''} selected</p>
    <div class="modal-btns" style="flex-direction:column">
      <button class="btn btn-save" onclick="bulkSetStatus('unread')">Set Unread</button>
      <button class="btn btn-save" style="background:var(--amber)" onclick="bulkSetStatus('reading')">Set Reading</button>
      <button class="btn btn-save" style="background:var(--teal)" onclick="bulkSetStatus('done')">Set Done</button>
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
    </div>`;
  $('modal-overlay').classList.remove('hidden');
}

async function bulkSetStatus(status) {
  const ids = [...selectedIds];
  closeModal();

  const { error } = await db.from('bookmarks').update({ status }).in('id', ids);
  if (error) { toast('Bulk update failed'); return; }

  exitSelectMode();
  await loadBookmarks();
  if (window.Stats) Stats.loadHistory(db);
  toast(`${ids.length} bookmark${ids.length > 1 ? 's' : ''} → ${status}`);
}

async function bulkDelete() {
  if (!selectedIds.size) { toast('Select bookmarks first'); return; }
  if (!confirm(`Delete ${selectedIds.size} bookmark${selectedIds.size > 1 ? 's' : ''}?`)) return;

  const ids = [...selectedIds];
  const { error } = await db.from('bookmarks').delete().in('id', ids);
  if (error) { toast('Bulk delete failed'); return; }

  exitSelectMode();
  await loadBookmarks();
  toast(`Deleted ${ids.length} bookmark${ids.length > 1 ? 's' : ''}`);
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
    loadBookmarks();
  } else if (window.Stats) {
    Stats.loadHistory(db);
  }
}

async function deleteBookmark(id) {
  if (!confirm('Delete this bookmark?')) return;

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

async function refreshMetadata(id) {
  const bm = allBookmarks.find(b => b.id === id);
  if (!bm) return;

  toast('Fetching metadata...');

  try {
    const meta = await fetchMetadata(bm.url, bm.source_type);
    const updates = {};

    if (meta.title) updates.title = meta.title;
    if (meta.image) updates.image = meta.image;
    if (meta.duration) updates.duration = meta.duration;
    if (meta.channel) updates.channel = meta.channel;

    if (Object.keys(updates).length) {
      const { error } = await db.from('bookmarks').update(updates).eq('id', id);
      if (error) {
        toast('Update failed');
        return;
      }
      Object.assign(bm, updates);
      applyFilters();
      toast('Metadata updated!');
    } else {
      toast('No metadata found');
    }
  } catch (e) {
    toast('Fetch failed');
  }
}

// ── Daily Notes View ──────────────────────

let dailyCurrentMonth = new Date();
let dailySelectedDate = null;

function showDailyView() {
  $('list-controls').classList.add('hidden');
  $('bookmarks-list').classList.add('hidden');
  $('areas-view').classList.add('hidden');
  $('stats-bar').classList.add('hidden');
  $('graph-view').classList.add('hidden');

  $('daily-view').classList.remove('hidden');
  dailyCurrentMonth = new Date();
  dailySelectedDate = new Date().toISOString().slice(0, 10);
  renderDailyCalendar();
}

function hideDailyView() {
  $('daily-view').classList.add('hidden');
  $('list-controls').classList.remove('hidden');
  $('bookmarks-list').classList.remove('hidden');
  $('stats-bar').classList.remove('hidden');
}

function renderDailyCalendar() {
  const year = dailyCurrentMonth.getFullYear();
  const month = dailyCurrentMonth.getMonth();

  // Update header
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  $('daily-month-label').textContent = `${monthNames[month]} ${year}`;

  // Build calendar
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  // Count bookmarks per day
  const dayCounts = {};
  for (const b of allBookmarks) {
    const day = b.created_at.slice(0, 10);
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }

  const today = new Date().toISOString().slice(0, 10);
  let html = '';

  // Previous month days
  const prevMonth = new Date(year, month, 0);
  const prevDays = prevMonth.getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevDays - i;
    const dateStr = new Date(year, month - 1, d).toISOString().slice(0, 10);
    const count = dayCounts[dateStr] || 0;
    html += `<div class="daily-cell other-month${count ? ' has-items' : ''}" data-date="${dateStr}">
      <span class="daily-day">${d}</span>
    </div>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(year, month, d).toISOString().slice(0, 10);
    const count = dayCounts[dateStr] || 0;
    const isToday = dateStr === today;
    const isSelected = dateStr === dailySelectedDate;
    html += `<div class="daily-cell${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${count ? ' has-items' : ''}"
                  data-date="${dateStr}" onclick="selectDailyDate('${dateStr}')">
      <span class="daily-day">${d}</span>
    </div>`;
  }

  // Next month days
  const remaining = 42 - (startDay + daysInMonth);
  for (let d = 1; d <= remaining; d++) {
    const dateStr = new Date(year, month + 1, d).toISOString().slice(0, 10);
    const count = dayCounts[dateStr] || 0;
    html += `<div class="daily-cell other-month${count ? ' has-items' : ''}" data-date="${dateStr}">
      <span class="daily-day">${d}</span>
    </div>`;
  }

  $('daily-calendar').innerHTML = html;
  renderDailySelected();
}

function selectDailyDate(dateStr) {
  dailySelectedDate = dateStr;
  renderDailyCalendar();
}

function renderDailySelected() {
  if (!dailySelectedDate) {
    $('daily-selected-date').textContent = 'Select a day';
    $('daily-selected-count').textContent = '';
    $('daily-selected-list').innerHTML = '<p style="color:var(--text-tertiary);font-size:13px;text-align:center;padding:20px">Click on a day to see bookmarks</p>';
    return;
  }

  const date = new Date(dailySelectedDate);
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  $('daily-selected-date').textContent = date.toLocaleDateString('en-US', options);

  const dayBookmarks = allBookmarks.filter(b => b.created_at.slice(0, 10) === dailySelectedDate);
  $('daily-selected-count').textContent = `${dayBookmarks.length} bookmark${dayBookmarks.length !== 1 ? 's' : ''}`;

  if (!dayBookmarks.length) {
    $('daily-selected-list').innerHTML = '<p style="color:var(--text-tertiary);font-size:13px;text-align:center;padding:20px">No bookmarks saved this day</p>';
    return;
  }

  const icons = { youtube: '▶', twitter: '𝕏', linkedin: 'in', substack: '✉', blog: '📄', book: '📚' };

  $('daily-selected-list').innerHTML = dayBookmarks.map(b => {
    const time = new Date(b.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const title = b.title || hostname(b.url) || b.url;
    return `<div class="daily-item" onclick="showDrawer('${b.id}')">
      <div class="daily-item-icon ${b.source_type}">${icons[b.source_type] || '📑'}</div>
      <div class="daily-item-title">${esc(title)}</div>
      <div class="daily-item-time">${time}</div>
    </div>`;
  }).join('');
}

function dailyPrevMonth() {
  dailyCurrentMonth.setMonth(dailyCurrentMonth.getMonth() - 1);
  renderDailyCalendar();
}

function dailyNextMonth() {
  dailyCurrentMonth.setMonth(dailyCurrentMonth.getMonth() + 1);
  renderDailyCalendar();
}

function dailyGoToday() {
  dailyCurrentMonth = new Date();
  dailySelectedDate = new Date().toISOString().slice(0, 10);
  renderDailyCalendar();
}

let dailyVisible = false;

function toggleDailyView() {
  if (dailyVisible) {
    hideDailyView();
    applyView();
    dailyVisible = false;
  } else {
    // Close graph if open
    if (graphVisible) {
      hideGraphView();
      graphVisible = false;
    }
    showDailyView();
    dailyVisible = true;
  }
}

// ── Knowledge Graph View ──────────────────

let graphSimulation = null;
let graphZoom = null;
let graphSvg = null;

function showGraphView() {
  // Hide other views
  $('list-controls').classList.add('hidden');
  $('bookmarks-list').classList.add('hidden');
  $('areas-view').classList.add('hidden');
  $('stats-bar').classList.add('hidden');

  // Show graph
  $('graph-view').classList.remove('hidden');
  renderGraph();
}

function hideGraphView() {
  $('graph-view').classList.add('hidden');
  $('list-controls').classList.remove('hidden');
  $('bookmarks-list').classList.remove('hidden');
  $('stats-bar').classList.remove('hidden');

  // Clean up simulation and legend
  if (graphSimulation) {
    graphSimulation.stop();
    graphSimulation = null;
  }
  const legend = document.querySelector('.graph-legend');
  if (legend) legend.remove();
}

function renderGraph() {
  const svg = d3.select('#graph-svg');
  svg.selectAll('*').remove();

  const container = document.getElementById('graph-view');
  const width = container.clientWidth;
  const height = container.clientHeight - 50;

  graphSvg = svg.attr('viewBox', [0, 0, width, height]);

  // Build nodes
  const nodes = allBookmarks.map(b => ({
    id: b.id,
    title: b.title || hostname(b.url) || b.url,
    url: b.url,
    source_type: b.source_type,
    tags: b.tags || [],
    domain: hostname(b.url),
    image: b.image
  }));

  // Build edges based on connections
  const links = [];
  const filter = $('graph-filter').value;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      let connected = false;
      let type = 'default';

      // Same tags
      if (filter === 'all' || filter === 'tags') {
        const sharedTags = a.tags.filter(t => b.tags.includes(t));
        if (sharedTags.length > 0) {
          connected = true;
          type = 'same-tag';
        }
      }

      // Same domain
      if ((filter === 'all' || filter === 'domain') && a.domain && a.domain === b.domain) {
        connected = true;
        type = type === 'same-tag' ? 'same-tag' : 'same-domain';
      }

      // Same source type
      if ((filter === 'all' || filter === 'source') && a.source_type === b.source_type) {
        if (!connected) {
          connected = true;
          type = 'same-source';
        }
      }

      if (connected) {
        links.push({ source: a.id, target: b.id, type });
      }
    }
  }

  // Source colors
  const sourceColors = {
    youtube: '#ff4444',
    twitter: '#1da1f2',
    linkedin: '#0a66c2',
    substack: '#ff6719',
    blog: '#4ecdc4',
    book: '#f5a623'
  };

  // Create container group for zoom
  const g = svg.append('g');

  // Zoom behavior
  graphZoom = d3.zoom()
    .scaleExtent([0.2, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(graphZoom);

  // Create simulation
  graphSimulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(80))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(30));

  // Draw links
  const link = g.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', d => `graph-link ${d.type}`);

  // Draw nodes
  const node = g.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'graph-node')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))
    .on('click', (event, d) => {
      event.stopPropagation();
      showDrawer(d.id);
    })
    .on('mouseenter', (event, d) => showGraphTooltip(event, d))
    .on('mouseleave', hideGraphTooltip);

  // Node circles
  node.append('circle')
    .attr('r', 16)
    .attr('fill', d => sourceColors[d.source_type] || '#6c63ff');

  // Node icons
  node.append('text')
    .attr('dy', 4)
    .attr('font-size', 12)
    .text(d => {
      const icons = { youtube: '▶', twitter: '𝕏', linkedin: 'in', substack: '✉', blog: '📄', book: '📚' };
      return icons[d.source_type] || '📑';
    });

  // Simulation tick
  graphSimulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  // Add legend
  const legend = document.createElement('div');
  legend.className = 'graph-legend';
  legend.innerHTML = `
    <div class="graph-legend-item"><span class="tag-line"></span> Shared Tags</div>
    <div class="graph-legend-item"><span class="domain-line"></span> Same Domain</div>
    <div class="graph-legend-item"><span class="source-line"></span> Same Source</div>
  `;
  container.appendChild(legend);

  function dragstarted(event, d) {
    if (!event.active) graphSimulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) graphSimulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}

function showGraphTooltip(event, d) {
  const tooltip = $('graph-tooltip');
  tooltip.innerHTML = `
    <div class="title">${esc(d.title)}</div>
    <div class="meta">${esc(d.domain)}</div>
    ${d.tags.length ? `<div class="tags">${d.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
  `;
  tooltip.style.left = (event.pageX + 10) + 'px';
  tooltip.style.top = (event.pageY + 10) + 'px';
  tooltip.classList.remove('hidden');
}

function hideGraphTooltip() {
  $('graph-tooltip').classList.add('hidden');
}

function graphZoomIn() {
  if (graphZoom && graphSvg) {
    graphSvg.transition().duration(300).call(graphZoom.scaleBy, 1.5);
  }
}

function graphZoomOut() {
  if (graphZoom && graphSvg) {
    graphSvg.transition().duration(300).call(graphZoom.scaleBy, 0.67);
  }
}

function graphReset() {
  if (graphZoom && graphSvg) {
    graphSvg.transition().duration(500).call(graphZoom.transform, d3.zoomIdentity);
  }
}

// ── Tag Areas View ────────────────────────

function renderAreasView() {
  const container = $('areas-view');
  if (!container) return;

  // Count bookmarks per tag
  const tagCounts = {};
  let unsortedCount = 0;
  for (const bm of allBookmarks) {
    if (!bm.tags || !bm.tags.length) {
      unsortedCount++;
    } else {
      for (const t of bm.tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }
  }

  let html = `<div class="areas-grid">`;

  // Unsorted card
  html += `
    <div class="area-card" onclick="filterByTag('__unsorted__')">
      <span class="area-emoji">📥</span>
      <span class="area-name">Unsorted</span>
      <span class="area-count">${unsortedCount}</span>
    </div>`;

  // Tag area cards
  for (const area of tagAreas) {
    const count = tagCounts[area.name] || 0;
    html += `
      <div class="area-card" style="border-left:3px solid ${esc(area.color)}" onclick="filterByTag('${esc(area.name)}')">
        <div class="area-card-header">
          <span class="area-emoji">${esc(area.emoji)}</span>
          <div class="area-sort-btns">
            <button class="area-sort-btn" onclick="event.stopPropagation();moveArea('${area.id}',-1)" title="Move up">▲</button>
            <button class="area-sort-btn" onclick="event.stopPropagation();moveArea('${area.id}',1)" title="Move down">▼</button>
          </div>
        </div>
        <span class="area-name">${esc(area.name)}</span>
        <span class="area-count">${count}</span>
        <button class="area-edit-btn" onclick="event.stopPropagation();showEditAreaModal('${area.id}')">Edit</button>
      </div>`;
  }

  // Add new area card
  html += `
    <div class="area-card area-card-add" onclick="showAddAreaModal()">
      <span class="area-emoji">+</span>
      <span class="area-name">New Area</span>
    </div>`;

  html += `</div>`;
  container.innerHTML = html;
}

// ── Tag Area CRUD ─────────────────────────

function showAddAreaModal() {
  const sheet = $('modal-sheet');
  sheet.innerHTML = `
    <div class="handle"></div>
    <h2>New Tag Area</h2>
    <input type="text" id="area-name" placeholder="Area name" autofocus>
    <input type="text" id="area-emoji" placeholder="Emoji (e.g. 🎬)" maxlength="4" value="📁">
    <input type="color" id="area-color" value="#6c63ff" style="height:44px">
    <input type="text" id="area-desc" placeholder="Description (optional)">
    <div class="modal-btns">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-save" id="btn-add-area">Create</button>
    </div>`;

  $('modal-overlay').classList.remove('hidden');
  $('btn-add-area').addEventListener('click', handleAddArea);
}

async function handleAddArea() {
  const name = $('area-name').value.trim();
  if (!name) { toast('Name is required'); return; }

  const emoji = $('area-emoji').value.trim() || '📁';
  const color = $('area-color').value;
  const description = $('area-desc').value.trim() || null;
  const sort_order = tagAreas.length;

  $('btn-add-area').textContent = 'Creating...';
  $('btn-add-area').disabled = true;

  const { error } = await db.from('tag_areas').insert({ name, emoji, color, description, sort_order });
  if (error) {
    toast(error.message.includes('unique') ? 'Area name already exists' : 'Failed to create');
    $('btn-add-area').textContent = 'Create';
    $('btn-add-area').disabled = false;
    return;
  }

  closeModal();
  await loadTagAreas();
  toast(`Created: ${emoji} ${name}`);
}

function showEditAreaModal(id) {
  const area = tagAreas.find(a => a.id === id);
  if (!area) return;

  const mergeOptions = tagAreas
    .filter(a => a.id !== id)
    .map(a => `<option value="${a.id}">${a.emoji} ${esc(a.name)}</option>`)
    .join('');

  const sheet = $('modal-sheet');
  sheet.innerHTML = `
    <div class="handle"></div>
    <h2>Edit Area</h2>
    <input type="text" id="area-name" value="${esc(area.name)}">
    <input type="text" id="area-emoji" value="${esc(area.emoji)}" maxlength="4">
    <input type="color" id="area-color" value="${esc(area.color)}" style="height:44px">
    <input type="text" id="area-desc" value="${esc(area.description || '')}" placeholder="Description">
    <div class="modal-btns">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-save" id="btn-save-area">Save</button>
    </div>
    ${mergeOptions ? `
      <div class="section-title">Merge into another area</div>
      <div class="setting-group">
        <select id="merge-target">
          <option value="">Select target area...</option>
          ${mergeOptions}
        </select>
        <button class="btn-danger" id="btn-merge-area" style="margin-top:8px">Merge &amp; Delete</button>
      </div>` : ''}
    <button class="btn-danger" id="btn-delete-area">Delete Area</button>`;

  $('modal-overlay').classList.remove('hidden');

  $('btn-save-area').addEventListener('click', async () => {
    const name = $('area-name').value.trim();
    if (!name) { toast('Name is required'); return; }

    const { error } = await db.from('tag_areas').update({
      name,
      emoji: $('area-emoji').value.trim() || '📁',
      color: $('area-color').value,
      description: $('area-desc').value.trim() || null
    }).eq('id', id);

    if (error) { toast('Update failed'); return; }
    closeModal();
    await loadTagAreas();
    await loadBookmarks();
    toast('Area updated');
  });

  $('btn-delete-area').addEventListener('click', async () => {
    if (!confirm(`Delete area "${area.name}"? Bookmarks won't be deleted.`)) return;
    await db.from('tag_areas').delete().eq('id', id);
    closeModal();
    await loadTagAreas();
    await loadBookmarks();
    toast('Area deleted');
  });

  if ($('btn-merge-area')) {
    $('btn-merge-area').addEventListener('click', async () => {
      const targetId = $('merge-target').value;
      if (!targetId) { toast('Select a target area'); return; }
      if (!confirm(`Merge "${area.name}" into target? This cannot be undone.`)) return;

      // Reassign junction entries
      const { data: entries } = await db.from('bookmark_tags').select('bookmark_id').eq('tag_area_id', id);
      if (entries && entries.length) {
        const rows = entries.map(e => ({ bookmark_id: e.bookmark_id, tag_area_id: targetId }));
        await db.from('bookmark_tags').upsert(rows, { onConflict: 'bookmark_id,tag_area_id' });
      }

      // Delete source area (cascade deletes its junction entries)
      await db.from('tag_areas').delete().eq('id', id);

      closeModal();
      await loadTagAreas();
      await loadBookmarks();
      toast('Areas merged');
    });
  }
}

async function moveArea(id, direction) {
  const idx = tagAreas.findIndex(a => a.id === id);
  if (idx < 0) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= tagAreas.length) return;

  // Swap sort_order
  const a = tagAreas[idx];
  const b = tagAreas[newIdx];

  await db.from('tag_areas').update({ sort_order: newIdx }).eq('id', a.id);
  await db.from('tag_areas').update({ sort_order: idx }).eq('id', b.id);

  await loadTagAreas();
}

// ── Re-tag All ────────────────────────────

async function retagAll() {
  if (!window.AI || !AI.isConfigured()) {
    toast('Configure AI key in Settings first');
    return;
  }
  if (!tagAreas.length) {
    toast('Create some tag areas first');
    return;
  }
  if (!confirm(`Re-tag ${allBookmarks.length} bookmarks with AI? This may take a while.`)) return;

  const progressEl = document.createElement('div');
  progressEl.className = 'retag-progress';
  progressEl.innerHTML = `<div class="retag-bar"><div class="retag-fill" id="retag-fill"></div></div><span id="retag-text">0/${allBookmarks.length}</span>`;
  $('dashboard').insertBefore(progressEl, $('bookmarks-list'));

  let tagged = 0;
  let errors = 0;
  const suggestedAreas = new Map(); // name -> { emoji, description, count }

  await AI.retagAll(allBookmarks, tagAreas, async (done, total, bm, result) => {
    const fill = $('retag-fill');
    const text = $('retag-text');
    if (fill) fill.style.width = `${(done / total) * 100}%`;
    if (text) text.textContent = `${done}/${total}`;

    if (result && result.error) {
      errors++;
      console.warn(`AI retag failed for "${bm.title || bm.url}":`, result.error);
      return;
    }

    // Use pre-matched areas from AI module
    const matchedAreas = (result && result._matchedAreas) || [];
    if (matchedAreas.length) {
      const rows = matchedAreas.map(a => ({ bookmark_id: bm.id, tag_area_id: a.id }));
      const { error } = await db.from('bookmark_tags').upsert(rows, { onConflict: 'bookmark_id,tag_area_id' });
      if (!error) tagged++;
      else console.error('Junction save error:', error);
    }

    // Collect suggested new areas
    if (result && result.suggest_new && result.suggest_new.name) {
      const name = result.suggest_new.name.toLowerCase();
      if (suggestedAreas.has(name)) {
        suggestedAreas.get(name).count++;
      } else {
        suggestedAreas.set(name, {
          emoji: result.suggest_new.emoji || '📁',
          description: result.suggest_new.description || '',
          count: 1
        });
      }
    }
  });

  progressEl.remove();
  await loadBookmarks();

  // Show summary modal if there are suggested areas
  if (suggestedAreas.size > 0) {
    showRetagSummary(tagged, errors, suggestedAreas);
  } else if (errors > 0) {
    toast(`Done: ${tagged} tagged, ${errors} failed — check console`);
  } else {
    toast(`Re-tag complete! ${tagged} bookmarks tagged.`);
  }
}

function showRetagSummary(tagged, errors, suggestedAreas) {
  const suggestions = [...suggestedAreas.entries()]
    .sort((a, b) => b[1].count - a[1].count) // Sort by count descending
    .slice(0, 8); // Max 8 suggestions

  const suggestionsHtml = suggestions.map(([name, data]) => `
    <label class="suggest-area-item">
      <input type="checkbox" value="${esc(name)}" data-emoji="${esc(data.emoji)}" checked>
      <span class="suggest-emoji">${esc(data.emoji)}</span>
      <span class="suggest-name">${esc(name)}</span>
      <span class="suggest-count">${data.count} bookmark${data.count > 1 ? 's' : ''}</span>
    </label>
  `).join('');

  const sheet = $('modal-sheet');
  sheet.innerHTML = `
    <div class="handle"></div>
    <h2>Re-tag Complete</h2>
    <div class="retag-summary">
      <div class="summary-stat"><span class="summary-num">${tagged}</span> tagged</div>
      ${errors ? `<div class="summary-stat summary-error"><span class="summary-num">${errors}</span> failed</div>` : ''}
      <div class="summary-stat summary-new"><span class="summary-num">${suggestedAreas.size}</span> new areas suggested</div>
    </div>

    <div class="section-title" style="border-top:none;margin-top:12px">Create suggested areas?</div>
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">Select which areas to add:</p>
    <div class="suggest-areas-list">${suggestionsHtml}</div>

    <div class="modal-btns">
      <button class="btn btn-cancel" onclick="closeModal()">Skip</button>
      <button class="btn btn-save" id="btn-create-suggested">Create Selected</button>
    </div>`;

  $('modal-overlay').classList.remove('hidden');

  $('btn-create-suggested').addEventListener('click', async () => {
    const checked = [...document.querySelectorAll('.suggest-area-item input:checked')];
    if (!checked.length) {
      closeModal();
      return;
    }

    $('btn-create-suggested').textContent = 'Creating...';
    $('btn-create-suggested').disabled = true;

    let created = 0;
    for (const cb of checked) {
      const name = cb.value;
      const emoji = cb.dataset.emoji || '📁';
      const { error } = await db.from('tag_areas').insert({
        name,
        emoji,
        color: '#6c63ff',
        sort_order: tagAreas.length + created
      });
      if (!error) created++;
    }

    closeModal();
    await loadTagAreas();
    toast(`Created ${created} new area${created > 1 ? 's' : ''}`);
  });
}

// ── Stats Modal ───────────────────────────

async function showStatsModal() {
  if (!window.Stats) return;

  await Stats.loadHistory(db);
  const stats = Stats.computeStats(allBookmarks, tagAreas);

  const sheet = $('modal-sheet');
  sheet.innerHTML = Stats.renderStatsModal(stats);
  $('modal-overlay').classList.remove('hidden');
}

// ── Settings Modal ────────────────────────

function showSettingsModal() {
  const sbUrl = loadCredential('sb_url') || '';
  const sbKey = loadCredential('sb_key') || '';
  const bookmarkletCode = generateBookmarklet(sbUrl, sbKey);

  const aiKey = window.AI ? AI.getKey() : '';
  const aiModel = window.AI ? AI.getModel() : '';

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

    <!-- AI Settings -->
    <div class="section-title">AI Tag Suggestions (OpenRouter)</div>
    <div class="setting-group">
      <label>API Key</label>
      <input type="password" id="set-ai-key" value="${esc(aiKey)}" placeholder="sk-or-...">
    </div>
    <div class="setting-group">
      <label>Model</label>
      <select id="set-ai-model">
        <option value="meta-llama/llama-3.3-70b-instruct:free" ${aiModel === 'meta-llama/llama-3.3-70b-instruct:free' ? 'selected' : ''}>Llama 3.3 70B (Free)</option>
        <option value="google/gemma-3-27b-it:free" ${aiModel === 'google/gemma-3-27b-it:free' ? 'selected' : ''}>Gemma 3 27B (Free)</option>
        <option value="mistralai/mistral-small-3.1-24b-instruct:free" ${aiModel === 'mistralai/mistral-small-3.1-24b-instruct:free' ? 'selected' : ''}>Mistral Small 3.1 (Free)</option>
        <option value="qwen/qwen3-coder:free" ${aiModel === 'qwen/qwen3-coder:free' ? 'selected' : ''}>Qwen3 Coder (Free)</option>
      </select>
    </div>
    <button class="btn btn-save" id="btn-save-ai" style="width:100%;margin-top:4px">Save AI Settings</button>
    <button class="btn btn-cancel" id="btn-retag-all" style="width:100%;margin-top:8px;background:var(--primary-dim);color:var(--primary)">Re-tag All Bookmarks with AI</button>

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
    </div>

    <!-- Obsidian Export -->
    <div class="section-title">Obsidian Export</div>
    <div class="setting-group">
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
        Export all bookmarks as Markdown files with YAML frontmatter, organized by source type. Perfect for importing into Obsidian or any note-taking app.
      </p>
      <button class="btn btn-save" id="btn-export-obsidian" style="width:100%">Export to Markdown</button>
    </div>`;

  $('modal-overlay').classList.remove('hidden');

  // Bind settings events
  $('btn-save-settings').addEventListener('click', () => {
    const url = $('set-url').value.trim();
    const key = $('set-key').value.trim();
    if (!url || !key) { toast('Both fields required'); return; }
    saveCredential('sb_url', url);
    saveCredential('sb_key', key);
    db = supabase.createClient(url, key);
    closeModal();
    loadBookmarks();
    toast('Settings saved');
  });

  $('btn-save-ai').addEventListener('click', () => {
    if (window.AI) {
      AI.saveSettings($('set-ai-key').value.trim(), $('set-ai-model').value);
      toast('AI settings saved');
    }
  });

  $('btn-retag-all').addEventListener('click', () => {
    closeModal();
    retagAll();
  });

  $('btn-reset').addEventListener('click', () => {
    if (confirm('Disconnect and reset the app?')) {
      removeCredential('sb_url');
      removeCredential('sb_key');
      removeCredential('ai_key');
      removeCredential('ai_model');
      localStorage.clear();
      location.reload();
    }
  });

  $('btn-export-obsidian').addEventListener('click', exportToObsidian);

  $('btn-copy-bml').addEventListener('click', () => {
    navigator.clipboard.writeText(bookmarkletCode).then(() => {
      toast('Copied! Create a bookmark and paste as URL.');
    }).catch(() => {
      toast('Copy failed — try manually selecting the code');
    });
  });
}

// ── Obsidian Export ───────────────────────

async function exportToObsidian() {
  if (!allBookmarks.length) {
    toast('No bookmarks to export');
    return;
  }

  closeModal();
  toast('Generating export...');

  const sourceLabels = {
    youtube: 'YouTube', twitter: 'Twitter', linkedin: 'LinkedIn',
    substack: 'Substack', blog: 'Blog', book: 'Book'
  };

  // Group by source type
  const bySource = {};
  for (const b of allBookmarks) {
    const src = b.source_type || 'blog';
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(b);
  }

  // Generate markdown content
  let allContent = '';
  let fileCount = 0;

  for (const [source, bookmarks] of Object.entries(bySource)) {
    allContent += `\n\n# ${sourceLabels[source] || source}\n\n`;

    for (const b of bookmarks) {
      const title = (b.title || hostname(b.url) || b.url).replace(/[\\/:*?"<>|]/g, '-');
      const created = new Date(b.created_at).toISOString().slice(0, 10);
      const tags = (b.tags || []).map(t => `"${t}"`).join(', ');

      const md = `---
title: "${title.replace(/"/g, '\\"')}"
url: ${b.url}
source: ${source}
status: ${b.status}
created: ${created}
${b.channel ? `channel: "${b.channel}"` : ''}
${b.duration ? `duration: ${b.duration}` : ''}
tags: [${tags}]
---

# ${title}

- **URL**: [${b.url}](${b.url})
- **Source**: ${sourceLabels[source] || source}
- **Status**: ${b.status}
- **Saved**: ${created}
${b.channel ? `- **Channel**: ${b.channel}` : ''}
${b.duration ? `- **Duration**: ${b.duration}` : ''}

${(b.tags || []).length ? `## Tags\n${b.tags.map(t => `- #${t}`).join('\n')}\n` : ''}
${b.notes ? `## Notes\n\n${b.notes}\n` : ''}
---
`;
      allContent += `## ${title}\n\n\`\`\`\n${md}\`\`\`\n\n`;
      fileCount++;
    }
  }

  // Create combined markdown file
  const header = `# ContentDeck Export

Exported on ${new Date().toLocaleString()}
Total bookmarks: ${fileCount}

---
${allContent}`;

  // Download as single file
  const blob = new Blob([header], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contentdeck-export-${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast(`Exported ${fileCount} bookmarks!`);
}

// ── Bookmarklet Generator ─────────────────

function generateBookmarklet(sbUrl, sbKey) {
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

// ── Detail Drawer ─────────────────────────

let currentDrawerBookmark = null;

function showDrawer(id) {
  const bm = allBookmarks.find(b => b.id === id);
  if (!bm) return;

  currentDrawerBookmark = bm;
  renderDrawerContent(bm);

  $('drawer-overlay').classList.remove('hidden');
  $('detail-drawer').classList.remove('hidden');

  // Trigger animation
  requestAnimationFrame(() => {
    $('drawer-overlay').classList.add('show');
    $('detail-drawer').classList.add('show');
  });

  // Close on overlay click
  $('drawer-overlay').onclick = closeDrawer;

  // Close on Escape
  document.addEventListener('keydown', handleDrawerEscape);
}

function closeDrawer() {
  $('drawer-overlay').classList.remove('show');
  $('detail-drawer').classList.remove('show');

  setTimeout(() => {
    $('drawer-overlay').classList.add('hidden');
    $('detail-drawer').classList.add('hidden');
  }, 300);

  document.removeEventListener('keydown', handleDrawerEscape);
  currentDrawerBookmark = null;
}

function handleDrawerEscape(e) {
  if (e.key === 'Escape') closeDrawer();
}

function renderDrawerContent(bm) {
  const src = SOURCE[bm.source_type] || SOURCE.blog;
  const host = hostname(bm.url);
  const time = timeAgo(bm.created_at);
  const faviconUrl = host
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`
    : '';

  const sourceLabel = {
    youtube: 'YouTube', twitter: 'Twitter', linkedin: 'LinkedIn',
    substack: 'Substack', blog: 'Blog', book: 'Book'
  };

  // Notes will be loaded from bookmark_notes table later
  const notesHtml = bm.notes
    ? `<div class="drawer-note">
         <div class="drawer-note-content">${esc(bm.notes)}</div>
       </div>`
    : '<p style="color:var(--text-tertiary);font-size:13px">No notes yet. Add your thoughts below.</p>';

  const tagsHtml = (bm.tags || []).map(t =>
    `<button class="tag-pill" onclick="filterByTag('${esc(t)}');closeDrawer()">${esc(t)}</button>`
  ).join('') || '<span style="color:var(--text-tertiary);font-size:13px">No tags</span>';

  $('drawer-content').innerHTML = `
    ${bm.image ? `
      <div class="drawer-thumb">
        <img src="${esc(bm.image)}" alt="" onerror="this.parentElement.classList.add('no-image');this.parentElement.innerHTML='${src.icon}'">
      </div>
    ` : `
      <div class="drawer-thumb no-image">${src.icon}</div>
    `}

    <h2 class="drawer-title">
      <a href="${esc(bm.url)}" target="_blank" rel="noopener">${esc(bm.title || host || bm.url)}</a>
    </h2>

    <div class="drawer-meta">
      ${faviconUrl ? `<img class="favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'">` : ''}
      <span>${bm.channel ? esc(bm.channel) : esc(host)}</span>
      <span style="opacity:0.3">&middot;</span>
      <span>${time}</span>
      ${bm.duration ? `<span style="opacity:0.3">&middot;</span><span class="duration-badge">${esc(bm.duration)}</span>` : ''}
      <span class="source-pill ${esc(bm.source_type)}">${sourceLabel[bm.source_type] || 'Blog'}</span>
      <button class="drawer-status ${esc(bm.status)}" onclick="cycleDrawerStatus()">${bm.status}</button>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Tags</div>
      <div class="drawer-tags">${tagsHtml}</div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Notes & Reflections</div>
      <div class="drawer-notes-list" id="drawer-notes-list">
        ${notesHtml}
      </div>
      <div class="drawer-add-note">
        <textarea id="drawer-note-input" placeholder="Add a note, insight, or question..."></textarea>
        <div class="drawer-note-actions">
          <button class="note-type-btn active" data-type="note">Note</button>
          <button class="note-type-btn" data-type="insight">Insight</button>
          <button class="note-type-btn" data-type="question">Question</button>
          <button class="note-type-btn" data-type="highlight">Highlight</button>
          <button class="btn-add-note" onclick="addDrawerNote()">Add</button>
        </div>
      </div>
    </div>

    <div class="drawer-actions">
      <button class="btn btn-edit" onclick="closeDrawer();showEditModal('${bm.id}')">Edit</button>
      <button class="btn btn-open" onclick="window.open('${esc(bm.url)}','_blank')">Open Link</button>
      <button class="btn btn-delete" onclick="if(confirm('Delete?')){closeDrawer();deleteBookmark('${bm.id}')}">Delete</button>
    </div>
  `;

  // Note type button handling
  document.querySelectorAll('.note-type-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.note-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });
}

async function cycleDrawerStatus() {
  if (!currentDrawerBookmark) return;
  const order = ['unread', 'reading', 'done'];
  const idx = order.indexOf(currentDrawerBookmark.status);
  const next = order[(idx + 1) % 3];

  const { error } = await db.from('bookmarks').update({ status: next }).eq('id', currentDrawerBookmark.id);
  if (!error) {
    currentDrawerBookmark.status = next;
    renderDrawerContent(currentDrawerBookmark);
    applyFilters();
    toast(`Status: ${next}`);
  }
}

async function addDrawerNote() {
  if (!currentDrawerBookmark) return;
  const input = $('drawer-note-input');
  const content = input.value.trim();
  if (!content) return;

  const activeType = document.querySelector('.note-type-btn.active');
  const noteType = activeType ? activeType.dataset.type : 'note';

  // For now, append to notes field (later: use bookmark_notes table)
  const existingNotes = currentDrawerBookmark.notes || '';
  const newNotes = existingNotes
    ? `${existingNotes}\n\n[${noteType.toUpperCase()}] ${content}`
    : `[${noteType.toUpperCase()}] ${content}`;

  const { error } = await db.from('bookmarks').update({ notes: newNotes }).eq('id', currentDrawerBookmark.id);
  if (!error) {
    currentDrawerBookmark.notes = newNotes;
    input.value = '';
    renderDrawerContent(currentDrawerBookmark);
    toast('Note added!');
  }
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
