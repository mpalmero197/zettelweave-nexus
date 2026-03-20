// PendragonX Quick Notes - Chrome Extension with Supabase Sync
const SUPABASE_URL = 'https://sckglgjydlbztxjupbsk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNja2dsZ2p5ZGxienR4anVwYnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzYzMjUsImV4cCI6MjA3MTkxMjMyNX0.3uZ0NUIN3yJsUgsCWdTKAhWf_DdLDiDske83hBpK3Yw';

const STORAGE_KEYS = {
  SCRATCH_NOTES: 'pendragonx_scratch_notes',
  STICKY_NOTES: 'pendragonx_sticky_notes',
  SELECTED_COLOR: 'pendragonx_selected_color',
  AUTH_TOKEN: 'pendragonx_auth_token',
  USER_EMAIL: 'pendragonx_user_email'
};

const STICKY_COLORS = [
  '#fef08a', '#fed7aa', '#fecaca', '#d9f99d',
  '#a5f3fc', '#ddd6fe', '#fbcfe8', '#e5e5e5'
];

let selectedColor = STICKY_COLORS[0];
let scratchNotes = [];
let stickyNotes = [];
let authToken = null;
let userEmail = null;

let syncInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupTabs();
  setupScratchPad();
  setupStickyNotes();
  setupAuth();
  renderColorPicker();
});

// Clean up polling when popup closes
window.addEventListener('unload', () => {
  if (syncInterval) clearInterval(syncInterval);
});

// Start polling every 3 seconds for live sync
function startLiveSync() {
  if (syncInterval) clearInterval(syncInterval);
  if (!authToken) return;
  syncInterval = setInterval(() => {
    if (authToken) syncFromCloud(true);
  }, 3000);
}

function stopLiveSync() {
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
}

// Load data from storage
function loadData() {
  chrome.storage.local.get(Object.values(STORAGE_KEYS), (result) => {
    scratchNotes = result[STORAGE_KEYS.SCRATCH_NOTES] || [];
    stickyNotes = result[STORAGE_KEYS.STICKY_NOTES] || [];
    selectedColor = result[STORAGE_KEYS.SELECTED_COLOR] || STICKY_COLORS[0];
    authToken = result[STORAGE_KEYS.AUTH_TOKEN] || null;
    userEmail = result[STORAGE_KEYS.USER_EMAIL] || null;

    renderScratchNotes();
    renderStickyNotes();
    updateAuthUI();

    // Auto-sync if logged in
    if (authToken) {
      syncFromCloud();
      startLiveSync();
    }
  });
}

// Save data to storage
function saveData() {
  chrome.storage.local.set({
    [STORAGE_KEYS.SCRATCH_NOTES]: scratchNotes,
    [STORAGE_KEYS.STICKY_NOTES]: stickyNotes,
    [STORAGE_KEYS.SELECTED_COLOR]: selectedColor,
    [STORAGE_KEYS.AUTH_TOKEN]: authToken,
    [STORAGE_KEYS.USER_EMAIL]: userEmail
  });
}

// Auth setup
function setupAuth() {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const syncBtn = document.getElementById('sync-btn');

  loginBtn?.addEventListener('click', handleLogin);
  logoutBtn?.addEventListener('click', handleLogout);
  syncBtn?.addEventListener('click', () => {
    if (authToken) syncFromCloud();
  });

  // Allow Enter key to submit login
  const passwordInput = document.getElementById('auth-password');
  passwordInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
}

async function handleLogin() {
  const authEmailEl = document.getElementById('auth-email');
  const authPasswordEl = document.getElementById('auth-password');
  const errorEl = document.getElementById('auth-error');
  const loginBtn = document.getElementById('login-btn');

  if (!authEmailEl || !authPasswordEl || !errorEl || !loginBtn) {
    console.error('Login elements not found');
    return;
  }

  const email = authEmailEl.value.trim();
  const password = authPasswordEl.value;

  if (!email || !password) {
    errorEl.textContent = 'Please enter your email and password.';
    errorEl.style.display = 'block';
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';
  errorEl.style.display = 'none';

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || data.msg || 'Login failed');

    authToken = data.access_token;
    userEmail = data.user.email;
    saveData();
    updateAuthUI();
    syncFromCloud();

    authEmailEl.value = '';
    authPasswordEl.value = '';
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
}

function handleLogout() {
  authToken = null;
  userEmail = null;
  stopLiveSync();
  saveData();
  updateAuthUI();
}

function updateAuthUI() {
  const loginScreen = document.getElementById('login-screen');
  const userBar = document.getElementById('user-bar');
  const appContent = document.getElementById('app-content');
  const userEmailEl = document.getElementById('user-email');
  const syncStatus = document.getElementById('sync-status');

  if (authToken && userEmail) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (userBar) userBar.style.display = 'flex';
    if (appContent) appContent.style.display = 'block';
    if (userEmailEl) userEmailEl.textContent = userEmail;
    if (syncStatus) syncStatus.textContent = '';
  } else {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (userBar) userBar.style.display = 'none';
    if (appContent) appContent.style.display = 'none';
  }
}

// Cloud sync functions
async function syncFromCloud() {
  if (!authToken) return;

  const syncStatus = document.getElementById('sync-status');
  if (syncStatus) {
    syncStatus.textContent = 'Syncing…';
    syncStatus.className = 'sync-status syncing';
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/scratchpad-sync`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired');
      }
      throw new Error('Sync failed');
    }

    const data = await response.json();
    const cloudNotes = data.notes || [];

    // Merge cloud notes with local (cloud takes priority for same IDs)
    cloudNotes.forEach(cloudNote => {
      const localNote = scratchNotes.find(n => n.id === cloudNote.id);
      if (!localNote) {
        scratchNotes.push({
          id: cloudNote.id,
          content: cloudNote.content,
          timestamp: cloudNote.created_at,
          synced: true
        });
      } else {
        localNote.synced = true;
      }
    });

    // Sort by timestamp
    scratchNotes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    saveData();
    renderScratchNotes();

    if (syncStatus) {
      syncStatus.textContent = 'Synced ✓';
      syncStatus.className = 'sync-status success';
      setTimeout(() => { if (syncStatus) syncStatus.textContent = ''; }, 2000);
    }
  } catch (error) {
    if (syncStatus) {
      syncStatus.textContent = error.message;
      syncStatus.className = 'sync-status error';
    }
  }
}

async function syncNoteToCloud(note) {
  if (!authToken) return;

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/scratchpad-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ content: note.content })
    });

    if (response.ok) {
      const data = await response.json();
      const localNote = scratchNotes.find(n => n.id === note.id);
      if (localNote && data.note) {
        localNote.id = data.note.id;
        localNote.synced = true;
        saveData();
        renderScratchNotes();
      }
    }
  } catch (error) {
    console.error('Failed to sync note:', error);
  }
}

async function deleteNoteFromCloud(noteId) {
  if (!authToken) return;

  try {
    await fetch(`${SUPABASE_URL}/functions/v1/scratchpad-sync`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ id: noteId })
    });
  } catch (error) {
    console.error('Failed to delete from cloud:', error);
  }
}

// Setup tabs
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const scratchTab = document.getElementById('scratch-tab');
  const stickyTab = document.getElementById('sticky-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const tabName = tab.dataset.tab;
      if (scratchTab) scratchTab.style.display = tabName === 'scratch' ? 'flex' : 'none';
      if (stickyTab) stickyTab.style.display = tabName === 'sticky' ? 'block' : 'none';
    });
  });
}

// Scratch Pad
function setupScratchPad() {
  const input = document.getElementById('scratch-input');
  const saveBtn = document.getElementById('save-scratch');
  const clearBtn = document.getElementById('clear-scratch');
  if (!input || !saveBtn || !clearBtn) return;

  saveBtn.addEventListener('click', () => {
    const content = input.value.trim();
    if (content) {
      const newNote = {
        id: Date.now().toString(),
        content,
        timestamp: new Date().toISOString(),
        synced: false
      };
      scratchNotes.unshift(newNote);
      saveData();
      renderScratchNotes();
      input.value = '';

      // Sync to cloud if logged in
      if (authToken) syncNoteToCloud(newNote);
    }
  });

  clearBtn.addEventListener('click', () => { input.value = ''; });
}

function renderScratchNotes() {
  const container = document.getElementById('notes-list');
  if (!container) return;

  if (scratchNotes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>No saved notes yet</p>
      </div>
    `;
    return;
  }

  container.innerHTML = scratchNotes.map(note => `
    <div class="note-card ${note.synced ? 'synced' : ''}" data-id="${note.id}">
      <p>${escapeHtml(note.content)}</p>
      <div class="note-meta">
        <span>${formatDate(note.timestamp)} ${note.synced ? '☁️' : '💾'}</span>
        <div class="note-actions">
          <button class="copy" title="Copy">Copy</button>
          <button class="delete" title="Delete">Delete</button>
        </div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.note-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('.copy').addEventListener('click', () => {
      const note = scratchNotes.find(n => n.id === id);
      if (note) navigator.clipboard.writeText(note.content);
    });
    card.querySelector('.delete').addEventListener('click', () => {
      const note = scratchNotes.find(n => n.id === id);
      if (note?.synced) deleteNoteFromCloud(id);
      scratchNotes = scratchNotes.filter(n => n.id !== id);
      saveData();
      renderScratchNotes();
    });
  });
}

// Sticky Notes
function setupStickyNotes() {
  const addStickyBtn = document.getElementById('add-sticky');
  if (!addStickyBtn) return;
  addStickyBtn.addEventListener('click', () => {
    stickyNotes.push({ id: Date.now().toString(), content: '', color: selectedColor });
    saveData();
    renderStickyNotes();
  });
}

function renderColorPicker() {
  const container = document.getElementById('color-picker');
  if (!container) return;
  container.innerHTML = STICKY_COLORS.map(color => `
    <button class="color-btn ${color === selectedColor ? 'active' : ''}" style="background: ${color};" data-color="${color}"></button>
  `).join('');

  container.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      saveData();
      container.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function renderStickyNotes() {
  const container = document.getElementById('sticky-grid');
  if (!container) return;

  if (stickyNotes.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column: span 2;"><p>No sticky notes yet</p></div>`;
    return;
  }

  container.innerHTML = stickyNotes.map(note => `
    <div class="sticky-note" style="background: ${note.color};" data-id="${note.id}">
      <button class="sticky-delete">×</button>
      <textarea placeholder="Write something...">${escapeHtml(note.content)}</textarea>
    </div>
  `).join('');

  container.querySelectorAll('.sticky-note').forEach(sticky => {
    const id = sticky.dataset.id;
    sticky.querySelector('textarea').addEventListener('input', (e) => {
      const note = stickyNotes.find(n => n.id === id);
      if (note) { note.content = e.target.value; saveData(); }
    });
    sticky.querySelector('.sticky-delete').addEventListener('click', () => {
      stickyNotes = stickyNotes.filter(n => n.id !== id);
      saveData();
      renderStickyNotes();
    });
  });
}

// Helpers
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
