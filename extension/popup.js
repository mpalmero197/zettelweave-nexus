// PendragonX Quick Notes - Chrome Extension with Supabase Sync
const SUPABASE_URL = 'https://sckglgjydlbztxjupbsk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNja2dsZ2p5ZGxienR4anVwYnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzYzMjUsImV4cCI6MjA3MTkxMjMyNX0.3uZ0NUIN3yJsUgsCWdTKAhWf_DdLDiDske83hBpK3Yw';

const STORAGE_KEYS = {
  SCRATCH_NOTES: 'pendragonx_scratch_notes',
  STICKY_NOTES: 'pendragonx_sticky_notes',
  SELECTED_COLOR: 'pendragonx_selected_color',
  AUTH_TOKEN: 'pendragonx_auth_token',
  USER_EMAIL: 'pendragonx_user_email',
  POMO_STATE: 'pendragonx_pomo_state',
  POMO_STATS: 'pendragonx_pomo_stats',
  HABITS: 'pendragonx_habits',
};

const STICKY_COLORS = [
  '#fef08a', '#fed7aa', '#fecaca', '#d9f99d',
  '#a5f3fc', '#ddd6fe', '#fbcfe8', '#e5e5e5'
];

let selectedColor = STICKY_COLORS[0];
let scratchNotes = [];
let stickyNotes = [];
let habits = [];
let authToken = null;
let userEmail = null;

let syncInterval = null;

// ── Pomodoro State ──
const CIRCUMFERENCE = 2 * Math.PI * 70; // ~439.82
let pomoDuration = 25 * 60; // seconds
let pomoRemaining = pomoDuration;
let pomoRunning = false;
let pomoInterval = null;
let pomoIsBreak = false;
const BREAK_DURATION = 5 * 60; // 5 min break

let pomoStats = { sessions: 0, totalMinutes: 0, streak: 0, lastDate: null };

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupTabs();
  setupScratchPad();
  setupStickyNotes();
  setupAuth();
  renderColorPicker();
  setupPomodoro();
  setupHabits();
  setupAIChat();
});

// Clean up polling when popup closes
window.addEventListener('unload', () => {
  if (syncInterval) clearInterval(syncInterval);
  // Persist pomodoro state so it survives popup close
  savePomodoroState();
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
    habits = result[STORAGE_KEYS.HABITS] || [];
    pomoStats = result[STORAGE_KEYS.POMO_STATS] || { sessions: 0, totalMinutes: 0, streak: 0, lastDate: null };

    // Restore running timer state
    const savedPomo = result[STORAGE_KEYS.POMO_STATE];
    if (savedPomo) {
      pomoDuration = savedPomo.duration || 25 * 60;
      pomoIsBreak = savedPomo.isBreak || false;
      if (savedPomo.running && savedPomo.endTime) {
        const now = Date.now();
        const remaining = Math.round((savedPomo.endTime - now) / 1000);
        if (remaining > 0) {
          pomoRemaining = remaining;
          pomoRunning = true;
        } else {
          // Timer expired while popup was closed
          pomoRemaining = 0;
          pomoRunning = false;
          handlePomodoroComplete();
        }
      } else {
        pomoRemaining = savedPomo.remaining || pomoDuration;
      }
    }

    renderScratchNotes();
    renderStickyNotes();
    renderHabits();
    updateAuthUI();
    updatePomoUI();
    updatePomoStats();

    // Check streak
    checkStreak();

    if (pomoRunning) startPomoTick();

    if (authToken) {
      syncFromCloud();
      syncHabitsFromCloud();
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
    [STORAGE_KEYS.USER_EMAIL]: userEmail,
    [STORAGE_KEYS.HABITS]: habits,
  });
}

function savePomodoroState() {
  const state = {
    duration: pomoDuration,
    remaining: pomoRemaining,
    running: pomoRunning,
    isBreak: pomoIsBreak,
    endTime: pomoRunning ? Date.now() + pomoRemaining * 1000 : null,
  };
  chrome.storage.local.set({
    [STORAGE_KEYS.POMO_STATE]: state,
    [STORAGE_KEYS.POMO_STATS]: pomoStats,
  });
}

// ── Pomodoro Logic ──

function setupPomodoro() {
  const startBtn = document.getElementById('pomo-start');
  const resetBtn = document.getElementById('pomo-reset');
  const presetBtns = document.querySelectorAll('.pomo-preset-btn');

  startBtn?.addEventListener('click', togglePomodoro);
  resetBtn?.addEventListener('click', resetPomodoro);

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (pomoRunning) return; // Can't change while running
      const minutes = parseInt(btn.dataset.minutes);
      pomoDuration = minutes * 60;
      pomoRemaining = pomoDuration;
      pomoIsBreak = false;

      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      updatePomoUI();
      savePomodoroState();
    });
  });

  // Highlight current preset
  highlightActivePreset();
}

function highlightActivePreset() {
  const presetBtns = document.querySelectorAll('.pomo-preset-btn');
  const currentMinutes = Math.round(pomoDuration / 60);
  presetBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.minutes) === currentMinutes && !pomoIsBreak);
  });
}

function togglePomodoro() {
  if (pomoRunning) {
    pausePomodoro();
  } else {
    startPomodoro();
  }
}

function startPomodoro() {
  pomoRunning = true;
  startPomoTick();
  updatePomoUI();
  savePomodoroState();
}

function pausePomodoro() {
  pomoRunning = false;
  if (pomoInterval) { clearInterval(pomoInterval); pomoInterval = null; }
  updatePomoUI();
  savePomodoroState();
}

function resetPomodoro() {
  pomoRunning = false;
  pomoIsBreak = false;
  if (pomoInterval) { clearInterval(pomoInterval); pomoInterval = null; }
  pomoRemaining = pomoDuration;
  updatePomoUI();
  highlightActivePreset();
  savePomodoroState();

  const banner = document.getElementById('pomo-break-banner');
  if (banner) banner.classList.remove('visible');
}

function startPomoTick() {
  if (pomoInterval) clearInterval(pomoInterval);
  pomoInterval = setInterval(() => {
    if (pomoRemaining <= 0) {
      clearInterval(pomoInterval);
      pomoInterval = null;
      pomoRunning = false;
      handlePomodoroComplete();
      return;
    }
    pomoRemaining--;
    updatePomoUI();
  }, 1000);
}

function handlePomodoroComplete() {
  if (!pomoIsBreak) {
    // Focus session completed
    pomoStats.sessions++;
    pomoStats.totalMinutes += Math.round(pomoDuration / 60);
    pomoStats.lastDate = new Date().toDateString();
    checkStreak();
    updatePomoStats();
    savePomodoroState();

    // Switch to break
    pomoIsBreak = true;
    pomoRemaining = BREAK_DURATION;
    const banner = document.getElementById('pomo-break-banner');
    if (banner) banner.classList.add('visible');

    // Auto-start break
    startPomodoro();
  } else {
    // Break completed
    pomoIsBreak = false;
    pomoRemaining = pomoDuration;
    const banner = document.getElementById('pomo-break-banner');
    if (banner) banner.classList.remove('visible');
    highlightActivePreset();
    updatePomoUI();
    savePomodoroState();
  }
}

function checkStreak() {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (pomoStats.lastDate === today) {
    // Already active today, streak continues
  } else if (pomoStats.lastDate === yesterday) {
    pomoStats.streak++;
  } else if (pomoStats.lastDate !== today) {
    pomoStats.streak = pomoStats.sessions > 0 && pomoStats.lastDate === null ? 1 : 0;
  }
}

function updatePomoUI() {
  const timeEl = document.getElementById('pomo-time');
  const labelEl = document.getElementById('pomo-label');
  const ringEl = document.getElementById('pomo-ring');
  const startBtn = document.getElementById('pomo-start');

  if (timeEl) {
    const mins = Math.floor(pomoRemaining / 60);
    const secs = pomoRemaining % 60;
    timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  if (labelEl) {
    labelEl.textContent = pomoIsBreak ? 'Break' : 'Focus';
  }

  if (ringEl) {
    const total = pomoIsBreak ? BREAK_DURATION : pomoDuration;
    const progress = total > 0 ? (total - pomoRemaining) / total : 0;
    ringEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
    ringEl.classList.toggle('break', pomoIsBreak);
  }

  if (startBtn) {
    if (pomoRunning) {
      startBtn.textContent = 'Pause';
      startBtn.className = 'btn btn-secondary';
    } else {
      startBtn.textContent = pomoRemaining < (pomoIsBreak ? BREAK_DURATION : pomoDuration) ? 'Resume' : 'Start';
      startBtn.className = 'btn btn-primary';
    }
  }
}

function updatePomoStats() {
  const sessionsEl = document.getElementById('pomo-sessions');
  const totalEl = document.getElementById('pomo-total-time');
  const streakEl = document.getElementById('pomo-streak');

  if (sessionsEl) sessionsEl.textContent = pomoStats.sessions;
  if (totalEl) {
    const hrs = Math.floor(pomoStats.totalMinutes / 60);
    totalEl.textContent = hrs > 0 ? `${hrs}h ${pomoStats.totalMinutes % 60}m` : `${pomoStats.totalMinutes}m`;
  }
  if (streakEl) streakEl.textContent = pomoStats.streak;
}

// ── Auth ──

function setupAuth() {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const syncBtn = document.getElementById('sync-btn');

  loginBtn?.addEventListener('click', handleLogin);
  logoutBtn?.addEventListener('click', handleLogout);
  syncBtn?.addEventListener('click', () => {
    if (authToken) syncFromCloud();
  });

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

  if (!authEmailEl || !authPasswordEl || !errorEl || !loginBtn) return;

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
    startLiveSync();

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
  const adminBadge = document.getElementById('admin-badge');

  if (authToken && userEmail) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (userBar) userBar.style.display = 'flex';
    if (appContent) appContent.style.display = 'block';
    if (userEmailEl) userEmailEl.textContent = userEmail;
    if (syncStatus) syncStatus.textContent = '';
    // Detect admin role to surface the badge (admin tool gating is enforced server-side).
    checkAdminRole().then((isAdmin) => {
      if (adminBadge) adminBadge.style.display = isAdmin ? 'inline-block' : 'none';
    });
  } else {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (userBar) userBar.style.display = 'none';
    if (appContent) appContent.style.display = 'none';
    if (adminBadge) adminBadge.style.display = 'none';
  }
}

async function checkAdminRole() {
  if (!authToken) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/has_role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ _user_id: await getUserId(), _role: 'admin' }),
    });
    if (!res.ok) return false;
    const v = await res.json();
    return v === true;
  } catch { return false; }
}

let _cachedUserId = null;
async function getUserId() {
  if (_cachedUserId) return _cachedUserId;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${authToken}`, 'apikey': SUPABASE_ANON_KEY },
    });
    if (!res.ok) return null;
    const u = await res.json();
    _cachedUserId = u?.id || null;
    return _cachedUserId;
  } catch { return null; }
}

// ── Cloud Sync ──

async function syncFromCloud(silent = false) {
  if (!authToken) return;

  const syncStatus = document.getElementById('sync-status');
  if (!silent && syncStatus) {
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

    const cloudIds = new Set(cloudNotes.map(n => n.id));
    scratchNotes = scratchNotes.filter(n => !n.synced || cloudIds.has(n.id));

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
        localNote.content = cloudNote.content;
        localNote.synced = true;
      }
    });

    scratchNotes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    saveData();
    renderScratchNotes();

    if (!silent && syncStatus) {
      syncStatus.textContent = 'Synced ✓';
      syncStatus.className = 'sync-status success';
      setTimeout(() => { if (syncStatus) syncStatus.textContent = ''; }, 2000);
    }
  } catch (error) {
    if (!silent && syncStatus) {
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

// ── Tabs ──

function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = {
    ai: document.getElementById('ai-tab'),
    scratch: document.getElementById('scratch-tab'),
    sticky: document.getElementById('sticky-tab'),
    pomodoro: document.getElementById('pomodoro-tab'),
    habits: document.getElementById('habits-tab'),
  };
  const displayMap = { ai: 'flex', scratch: 'flex', sticky: 'block', pomodoro: 'block', habits: 'block' };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.dataset.tab;
      Object.entries(panels).forEach(([k, el]) => {
        if (el) el.style.display = k === tabName ? displayMap[k] : 'none';
      });
    });
  });
}

// ── Scratch Pad ──

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

// ── Sticky Notes ──

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

// ── Habits ──

function setupHabits() {
  const addBtn = document.getElementById('add-habit-btn');
  const input = document.getElementById('habit-name-input');
  if (!addBtn || !input) return;

  addBtn.addEventListener('click', () => addHabit());
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addHabit(); });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getHabitStreak(checkins) {
  const sorted = [...new Set(checkins)].sort().reverse();
  if (!sorted.length) return 0;
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().slice(0, 10);
    if (sorted.includes(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else if (i === 0) { d.setDate(d.getDate() - 1); continue; }
    else break;
  }
  return streak;
}

function addHabit() {
  const input = document.getElementById('habit-name-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;

  const habit = { id: Date.now().toString(), name, checkins: [], synced: false };
  habits.push(habit);
  input.value = '';
  saveData();
  renderHabits();

  if (authToken) syncHabitToCloud(habit);
}

function checkinHabit(id) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  const today = todayStr();
  if (habit.checkins.includes(today)) return;
  habit.checkins.push(today);
  saveData();
  renderHabits();

  if (authToken) syncHabitCheckinToCloud(habit);
}

function deleteHabit(id) {
  habits = habits.filter(h => h.id !== id);
  saveData();
  renderHabits();
}

function renderHabits() {
  const container = document.getElementById('habits-list');
  if (!container) return;

  if (habits.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No habits yet. Add one above!</p></div>';
    return;
  }

  const today = todayStr();

  container.innerHTML = habits.map(h => {
    const streak = getHabitStreak(h.checkins);
    const doneToday = h.checkins.includes(today);

    // Build 28-day heatmap
    const cells = [];
    const d = new Date();
    for (let i = 27; i >= 0; i--) {
      const nd = new Date(d);
      nd.setDate(nd.getDate() - i);
      const ds = nd.toISOString().slice(0, 10);
      cells.push(`<div class="heat-cell ${h.checkins.includes(ds) ? 'active' : ''}" title="${ds}"></div>`);
    }

    return `
      <div class="habit-card" data-id="${h.id}">
        <div class="habit-header">
          <span class="habit-name">${escapeHtml(h.name)}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="habit-streak">🔥 ${streak}d</span>
            <button class="habit-delete" data-id="${h.id}">✕</button>
          </div>
        </div>
        <div class="habit-heatmap">${cells.join('')}</div>
        <button class="habit-checkin-btn ${doneToday ? 'done' : 'pending'}" data-id="${h.id}" ${doneToday ? 'disabled' : ''}>
          ${doneToday ? '✓ Done today' : '✓ Check in'}
        </button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.habit-checkin-btn.pending').forEach(btn => {
    btn.addEventListener('click', () => checkinHabit(btn.dataset.id));
  });
  container.querySelectorAll('.habit-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteHabit(btn.dataset.id));
  });
}

async function syncHabitsFromCloud() {
  if (!authToken) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/habits?select=id,name,color,streak`, {
      headers: { 'Authorization': `Bearer ${authToken}`, 'apikey': SUPABASE_ANON_KEY }
    });
    if (!res.ok) return;
    const cloudHabits = await res.json();

    const compRes = await fetch(`${SUPABASE_URL}/rest/v1/habit_completions?select=habit_id,completion_date,completed`, {
      headers: { 'Authorization': `Bearer ${authToken}`, 'apikey': SUPABASE_ANON_KEY }
    });
    const completions = compRes.ok ? await compRes.json() : [];

    const byHabit = {};
    completions.forEach(c => {
      if (!byHabit[c.habit_id]) byHabit[c.habit_id] = [];
      if (c.completed) byHabit[c.habit_id].push(c.completion_date);
    });

    habits = cloudHabits.map(h => ({
      id: h.id,
      name: h.name,
      checkins: byHabit[h.id] || [],
      synced: true,
    }));

    saveData();
    renderHabits();
  } catch (e) {
    console.error('Habit sync failed:', e);
  }
}

async function syncHabitToCloud(habit) {
  if (!authToken) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/habits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ name: habit.name, color: '#3b82f6', streak: 0 }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        const local = habits.find(h => h.id === habit.id);
        if (local) { local.id = data[0].id; local.synced = true; saveData(); renderHabits(); }
      }
    }
  } catch (e) { console.error('Failed to sync habit:', e); }
}

async function syncHabitCheckinToCloud(habit) {
  if (!authToken || !habit.synced) return;
  const today = todayStr();
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/habit_completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ habit_id: habit.id, completion_date: today, completed: true }),
    });
  } catch (e) { console.error('Failed to sync checkin:', e); }
}

// ── Helpers ──

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── AI Assistant ──

let aiMessages = [];   // { role, content }
let aiLoading = false;
let aiContextCache = null;
let aiContextFetchedAt = 0;
const AI_CONTEXT_TTL = 60 * 1000; // 1 minute

function setupAIChat() {
  const sendBtn = document.getElementById('ai-send');
  const input = document.getElementById('ai-input');
  const newThreadBtn = document.getElementById('ai-new-thread');

  sendBtn?.addEventListener('click', () => sendAIMessage());
  newThreadBtn?.addEventListener('click', () => {
    aiMessages = [];
    aliceThreadId = null;
    chrome.storage.local.remove(['pendragonx_alice_thread_id']);
    renderAIMessages();
  });
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAIMessage();
    }
  });
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  document.querySelectorAll('.ai-suggestion').forEach(btn => {
    btn.addEventListener('click', () => sendAIMessage(btn.dataset.q));
  });

  // Restore the last ALICE thread so the conversation continues across popup opens.
  chrome.storage.local.get(['pendragonx_alice_thread_id'], (r) => {
    aliceThreadId = r.pendragonx_alice_thread_id || null;
  });
}

let aliceThreadId = null;

async function fetchAIContext() {
  if (!authToken) return {};
  const now = Date.now();
  if (aiContextCache && (now - aiContextFetchedAt) < AI_CONTEXT_TTL) return aiContextCache;

  const headers = { 'Authorization': `Bearer ${authToken}`, 'apikey': SUPABASE_ANON_KEY };
  const tryFetch = async (path) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  };

  const [cards, notes, catalystDocs, calendarEvents, tasks, scratchPad] = await Promise.all([
    tryFetch('zettel_cards?select=id,title,content,category,tags&deleted_at=is.null&order=created_at.desc&limit=50'),
    tryFetch('notes?select=id,title,content&deleted_at=is.null&order=created_at.desc&limit=50'),
    tryFetch('catalyst_documents?select=id,title,content&deleted_at=is.null&order=updated_at.desc&limit=25'),
    tryFetch('calendar_events?select=id,title,event_date,description&order=event_date.desc&limit=30'),
    tryFetch('tasks?select=id,title,notes,is_completed,due_date,priority&order=created_at.desc&limit=30'),
    tryFetch('scratchpad_notes?select=id,content&order=updated_at.desc&limit=20'),
  ]);

  aiContextCache = {
    cards: (cards || []).map(c => ({ ...c, content: (c.content || '').substring(0, 400) })),
    notes: (notes || []).map(n => ({ ...n, content: (n.content || '').substring(0, 400) })),
    catalystDocs: (catalystDocs || []).map(d => ({ ...d, content: (d.content || '').substring(0, 400) })),
    calendarEvents: calendarEvents || [],
    tasks: tasks || [],
    scratchPad: scratchPad || [],
  };
  aiContextFetchedAt = now;
  return aiContextCache;
}

function renderAIMessages() {
  const container = document.getElementById('ai-messages');
  const empty = document.getElementById('ai-empty');
  if (!container) return;

  if (aiMessages.length === 0 && !aiLoading) {
    if (empty) {
      container.innerHTML = '';
      container.appendChild(empty);
      empty.style.display = 'block';
    }
    return;
  }

  container.innerHTML = '';
  aiMessages.forEach(m => {
    const div = document.createElement('div');
    div.className = `ai-msg ${m.role}`;
    div.textContent = m.content;
    container.appendChild(div);
  });

  if (aiLoading) {
    const typing = document.createElement('div');
    typing.className = 'ai-msg assistant';
    typing.innerHTML = '<span class="ai-typing"><span></span><span></span><span></span></span>';
    container.appendChild(typing);
  }

  container.scrollTop = container.scrollHeight;
}

async function sendAIMessage(prefilled) {
  const input = document.getElementById('ai-input');
  const text = (prefilled || input?.value || '').trim();
  if (!text || aiLoading) return;

  if (!authToken) {
    aiMessages.push({ role: 'assistant', content: 'Please sign in to chat with your knowledge base.' });
    renderAIMessages();
    return;
  }

  aiMessages.push({ role: 'user', content: text });
  if (input) { input.value = ''; input.style.height = 'auto'; }
  aiLoading = true;
  renderAIMessages();

  try {
    const useInternet = document.getElementById('ai-use-internet')?.checked || false;
    const context = await fetchAIContext();
    const trimmed = aiMessages.slice(-8);

    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ messages: trimmed, context, useInternet }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }

    aiMessages.push({ role: 'assistant', content: data.response || 'No response.' });
  } catch (e) {
    aiMessages.push({ role: 'assistant', content: `⚠️ ${e.message || 'Failed to reach AI assistant.'}` });
  } finally {
    aiLoading = false;
    renderAIMessages();
  }
}
