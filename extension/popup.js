// ContentDeck Chrome Extension

const $ = id => document.getElementById(id);

let supabaseUrl = '';
let supabaseKey = '';
let tags = [];

// Source detection
const SOURCE_PATTERNS = {
  youtube: /youtube\.com|youtu\.be/i,
  twitter: /twitter\.com|x\.com/i,
  linkedin: /linkedin\.com/i,
  substack: /substack\.com/i
};

function detectSource(url) {
  for (const [type, pattern] of Object.entries(SOURCE_PATTERNS)) {
    if (pattern.test(url)) return type;
  }
  return 'blog';
}

// Toast notification
function toast(message, type = 'success') {
  const el = $('toast');
  el.textContent = message;
  el.className = `toast show ${type}`;
  setTimeout(() => el.classList.remove('show'), 2500);
}

// Tags management
function renderTags() {
  const container = $('tags-container');
  const input = $('tag-input');

  // Remove existing tags
  container.querySelectorAll('.tag').forEach(el => el.remove());

  // Add tag elements before input
  tags.forEach((tag, i) => {
    const el = document.createElement('span');
    el.className = 'tag';
    el.innerHTML = `${tag}<button data-index="${i}">&times;</button>`;
    container.insertBefore(el, input);
  });
}

function addTag(value) {
  const tag = value.trim().toLowerCase();
  if (tag && !tags.includes(tag)) {
    tags.push(tag);
    renderTags();
  }
}

function removeTag(index) {
  tags.splice(index, 1);
  renderTags();
}

// Initialize
async function init() {
  // Load credentials
  const stored = await chrome.storage.local.get(['supabaseUrl', 'supabaseKey']);
  supabaseUrl = stored.supabaseUrl || '';
  supabaseKey = stored.supabaseKey || '';

  if (supabaseUrl && supabaseKey) {
    $('setup').style.display = 'none';
    $('main').style.display = 'block';
    await loadCurrentTab();
  } else {
    $('setup').style.display = 'block';
    $('main').style.display = 'none';
  }
}

async function loadCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      $('url').value = tab.url;
      $('title').value = tab.title || '';

      const source = detectSource(tab.url);
      const sourceLabels = {
        youtube: 'YouTube',
        twitter: 'Twitter',
        linkedin: 'LinkedIn',
        substack: 'Substack',
        blog: 'Blog'
      };
      $('source-badge').textContent = sourceLabels[source];
    }
  } catch (e) {
    console.error('Failed to get tab:', e);
  }
}

// Save bookmark
async function saveBookmark() {
  const url = $('url').value;
  const title = $('title').value;
  const notes = $('notes').value;

  if (!url) {
    toast('No URL to save', 'error');
    return;
  }

  $('btn-save').disabled = true;
  $('btn-save').textContent = 'Saving...';

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/bookmarks`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        url,
        title: title || null,
        notes: notes || null,
        tags: tags.length ? tags : [],
        status: 'unread'
      })
    });

    if (response.ok) {
      toast('Saved!');
      $('status').textContent = 'Bookmark saved successfully';

      // Close popup after short delay
      setTimeout(() => window.close(), 1000);
    } else {
      const error = await response.text();
      console.error('Save failed:', error);
      toast('Failed to save', 'error');
    }
  } catch (e) {
    console.error('Save error:', e);
    toast('Connection failed', 'error');
  }

  $('btn-save').disabled = false;
  $('btn-save').textContent = 'Save Bookmark';
}

// Connect to Supabase
async function connect() {
  const url = $('supabase-url').value.trim();
  const key = $('supabase-key').value.trim();

  if (!url || !key) {
    toast('Please enter both URL and key', 'error');
    return;
  }

  $('btn-connect').disabled = true;
  $('btn-connect').textContent = 'Connecting...';

  try {
    // Test connection
    const response = await fetch(`${url}/rest/v1/bookmarks?limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    if (response.ok) {
      // Save credentials
      await chrome.storage.local.set({ supabaseUrl: url, supabaseKey: key });
      supabaseUrl = url;
      supabaseKey = key;

      toast('Connected!');
      $('setup').style.display = 'none';
      $('main').style.display = 'block';
      await loadCurrentTab();
    } else {
      toast('Invalid credentials', 'error');
    }
  } catch (e) {
    console.error('Connection error:', e);
    toast('Connection failed', 'error');
  }

  $('btn-connect').disabled = false;
  $('btn-connect').textContent = 'Connect';
}

// Event listeners
document.addEventListener('DOMContentLoaded', init);

$('btn-connect').addEventListener('click', connect);
$('btn-save').addEventListener('click', saveBookmark);

// Tag input
$('tag-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addTag(e.target.value);
    e.target.value = '';
  } else if (e.key === 'Backspace' && !e.target.value && tags.length) {
    removeTag(tags.length - 1);
  }
});

$('tags-container').addEventListener('click', e => {
  if (e.target.tagName === 'BUTTON' && e.target.dataset.index !== undefined) {
    removeTag(parseInt(e.target.dataset.index));
  }
});

// Enter to save
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.ctrlKey) {
    saveBookmark();
  }
});
