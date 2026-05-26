// PendragonX Toolbox - Chrome Extension Side Panel
const SUPABASE_URL = 'https://sckglgjydlbztxjupbsk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNja2dsZ2p5ZGxienR4anVwYnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzYzMjUsImV4cCI6MjA3MTkxMjMyNX0.3uZ0NUIN3yJsUgsCWdTKAhWf_DdLDiDske83hBpK3Yw';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'pendragonx_auth_token',
  REFRESH_TOKEN: 'pendragonx_refresh_token',
  SESSION_EXPIRES_AT: 'pendragonx_session_expires_at',
  USER_EMAIL: 'pendragonx_user_email',
  POMO_STATE: 'pendragonx_pomo_state',
  POMO_STATS: 'pendragonx_pomo_stats',
  HABITS: 'pendragonx_habits',
  CACHE_CARDS: 'pendragonx_cache_cards',
  CACHE_NOTES: 'pendragonx_cache_notes',
  CACHE_CALENDAR: 'pendragonx_cache_calendar',
  CACHE_TASKS: 'pendragonx_cache_tasks',
};

let authToken = null;
let refreshToken = null;
let sessionExpiresAt = 0;
let userEmail = null;
let habits = [];
let authMode = 'signin'; // 'signin' | 'signup'

// Pomodoro
const CIRCUMFERENCE = 2 * Math.PI * 70;
let pomoDuration = 25 * 60;
let pomoRemaining = pomoDuration;
let pomoRunning = false;
let pomoInterval = null;
let pomoIsBreak = false;
const BREAK_DURATION = 5 * 60;
let pomoStats = { sessions: 0, totalMinutes: 0, streak: 0, lastDate: null };

// Server-fetched lists
let cardsList = [];
let notesList = [];
let calendarList = [];
let tasksList = [];
let calFilter = 'all';
let focusRange = 'day';
let mcCursor = new Date(); // anchor for mini calendar (1st of displayed month)
mcCursor.setDate(1);
let mcSelected = null; // 'YYYY-MM-DD' filter

// Auto-sync
let _syncTimer = null;
let _refreshTimer = null;

// ALICE
let aiMessages = [];
let aiLoading = false;
let aliceThreadId = null;

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupTabs();
  setupAuth();
  setupPomodoro();
  setupHabits();
  setupAIChat();
  setupCards();
  setupNotes();
  setupCalendar();
  setupCapture();
  setupFocusRange();
  setupModals();
  setupAutoSync();
});

window.addEventListener('unload', () => {
  savePomodoroState();
});

// ── Storage / load ──
function loadData() {
  chrome.storage.local.get([...Object.values(STORAGE_KEYS), 'pendragonx_alice_thread_id'], (r) => {
    authToken = r[STORAGE_KEYS.AUTH_TOKEN] || null;
    refreshToken = r[STORAGE_KEYS.REFRESH_TOKEN] || null;
    sessionExpiresAt = Number(r[STORAGE_KEYS.SESSION_EXPIRES_AT] || 0);
    userEmail = r[STORAGE_KEYS.USER_EMAIL] || null;
    cardsList = Array.isArray(r[STORAGE_KEYS.CACHE_CARDS]) ? r[STORAGE_KEYS.CACHE_CARDS] : [];
    notesList = Array.isArray(r[STORAGE_KEYS.CACHE_NOTES]) ? r[STORAGE_KEYS.CACHE_NOTES] : [];
    calendarList = Array.isArray(r[STORAGE_KEYS.CACHE_CALENDAR]) ? r[STORAGE_KEYS.CACHE_CALENDAR] : [];
    tasksList = Array.isArray(r[STORAGE_KEYS.CACHE_TASKS]) ? r[STORAGE_KEYS.CACHE_TASKS] : [];
    habits = r[STORAGE_KEYS.HABITS] || [];
    pomoStats = r[STORAGE_KEYS.POMO_STATS] || { sessions: 0, totalMinutes: 0, streak: 0, lastDate: null };
    aliceThreadId = r.pendragonx_alice_thread_id || null;

    const savedPomo = r[STORAGE_KEYS.POMO_STATE];
    if (savedPomo) {
      pomoDuration = savedPomo.duration || 25 * 60;
      pomoIsBreak = savedPomo.isBreak || false;
      if (savedPomo.running && savedPomo.endTime) {
        const remaining = Math.round((savedPomo.endTime - Date.now()) / 1000);
        if (remaining > 0) { pomoRemaining = remaining; pomoRunning = true; }
        else { pomoRemaining = 0; handlePomodoroComplete(); }
      } else {
        pomoRemaining = savedPomo.remaining || pomoDuration;
      }
    }

    renderCards();
    renderNotes();
    renderCalendar();
    renderFocusTasks();
    renderHabits();
    updateAuthUI();
    updatePomoUI();
    updatePomoStats();
    if (pomoRunning) startPomoTick();

    if (authToken) loadAllServerData();
  });
}

function saveLocal() {
  chrome.storage.local.set({
    [STORAGE_KEYS.AUTH_TOKEN]: authToken,
    [STORAGE_KEYS.REFRESH_TOKEN]: refreshToken,
    [STORAGE_KEYS.SESSION_EXPIRES_AT]: sessionExpiresAt,
    [STORAGE_KEYS.USER_EMAIL]: userEmail,
    [STORAGE_KEYS.HABITS]: habits,
  });
}

function savePomodoroState() {
  chrome.storage.local.set({
    [STORAGE_KEYS.POMO_STATE]: {
      duration: pomoDuration,
      remaining: pomoRemaining,
      running: pomoRunning,
      isBreak: pomoIsBreak,
      endTime: pomoRunning ? Date.now() + pomoRemaining * 1000 : null,
    },
    [STORAGE_KEYS.POMO_STATS]: pomoStats,
  });
}

// ── Toast ──
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 1800);
}

// ── Auth (sign in + sign up) ──
function setupAuth() {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const syncBtn = document.getElementById('sync-btn');
  const modeSignin = document.getElementById('auth-mode-signin');
  const modeSignup = document.getElementById('auth-mode-signup');
  const passwordInput = document.getElementById('auth-password');

  modeSignin?.addEventListener('click', () => setAuthMode('signin'));
  modeSignup?.addEventListener('click', () => setAuthMode('signup'));

  loginBtn?.addEventListener('click', handleAuth);
  logoutBtn?.addEventListener('click', handleLogout);
  syncBtn?.addEventListener('click', () => { if (authToken) loadAllServerData(); });
  passwordInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAuth(); });
}

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('auth-mode-signin').classList.toggle('active', mode === 'signin');
  document.getElementById('auth-mode-signup').classList.toggle('active', mode === 'signup');
  document.getElementById('auth-title').textContent = mode === 'signup' ? 'Create your account' : 'Welcome back';
  document.getElementById('auth-subtitle').textContent = mode === 'signup'
    ? 'Sign up for a free PendragonX account.'
    : 'Sign in to your PendragonX account.';
  document.getElementById('auth-name').style.display = mode === 'signup' ? 'block' : 'none';
  document.getElementById('login-btn').textContent = mode === 'signup' ? 'Sign Up' : 'Sign In';
  document.getElementById('auth-password').setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
}

async function handleAuth() {
  const emailEl = document.getElementById('auth-email');
  const passEl = document.getElementById('auth-password');
  const nameEl = document.getElementById('auth-name');
  const errEl = document.getElementById('auth-error');
  const btn = document.getElementById('login-btn');
  const email = emailEl.value.trim();
  const password = passEl.value;
  const displayName = nameEl.value.trim();

  if (!email || !password) {
    errEl.textContent = 'Please enter your email and password.';
    errEl.style.display = 'block';
    return;
  }
  btn.disabled = true;
  btn.textContent = authMode === 'signup' ? 'Creating account…' : 'Signing in…';
  errEl.style.display = 'none';

  try {
    if (authMode === 'signup') {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({
          email, password,
          data: { display_name: displayName || email.split('@')[0] },
          options: { emailRedirectTo: 'https://pendragonx.com' },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error_description || d.msg || d.error || 'Sign up failed');
      if (d.access_token) {
        applySession(d, email);
      } else {
        // Email confirmation required
        toast('Check your email to confirm your account.');
        setAuthMode('signin');
        return;
      }
    } else {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error_description || d.msg || 'Login failed');
      applySession(d, email);
    }
    saveLocal();
    updateAuthUI();
    loadAllServerData();
    emailEl.value = ''; passEl.value = ''; if (nameEl) nameEl.value = '';
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === 'signup' ? 'Sign Up' : 'Sign In';
  }
}

function handleLogout() {
  authToken = null;
  userEmail = null;
  saveLocal();
  updateAuthUI();
}

function updateAuthUI() {
  const loginScreen = document.getElementById('login-screen');
  const userBar = document.getElementById('user-bar');
  const appContent = document.getElementById('app-content');
  const userEmailEl = document.getElementById('user-email');
  const adminBadge = document.getElementById('admin-badge');

  if (authToken && userEmail) {
    loginScreen.style.display = 'none';
    userBar.style.display = 'flex';
    appContent.style.display = 'block';
    userEmailEl.textContent = userEmail;
    checkAdminRole().then((isAdmin) => {
      if (adminBadge) adminBadge.style.display = isAdmin ? 'inline-block' : 'none';
    });
  } else {
    loginScreen.style.display = 'flex';
    userBar.style.display = 'none';
    appContent.style.display = 'none';
    if (adminBadge) adminBadge.style.display = 'none';
  }
}

let _cachedUserId = null;
async function getUserId() {
  if (_cachedUserId) return _cachedUserId;
  if (!(await ensureFreshSession())) return null;
  try {
    let r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${authToken}`, apikey: SUPABASE_ANON_KEY },
    });
    if (r.status === 401 && await ensureFreshSession(true)) {
      r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${authToken}`, apikey: SUPABASE_ANON_KEY },
      });
    }
    if (!r.ok) return null;
    const u = await r.json();
    _cachedUserId = u?.id || null;
    return _cachedUserId;
  } catch { return null; }
}

async function checkAdminRole() {
  if (!authToken) return false;
  try {
    const uid = await getUserId();
    if (!uid) return false;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/has_role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ _user_id: uid, _role: 'admin' }),
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch { return false; }
}

// ── Tabs ──
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = {
    ai: document.getElementById('ai-tab'),
    cards: document.getElementById('cards-tab'),
    notes: document.getElementById('notes-tab'),
    calendar: document.getElementById('calendar-tab'),
    focus: document.getElementById('focus-tab'),
  };
  const display = { ai: 'flex', cards: 'block', notes: 'flex', calendar: 'block', focus: 'block' };
  tabs.forEach((t) => {
    t.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      const k = t.dataset.tab;
      Object.entries(panels).forEach(([key, el]) => {
        if (el) el.style.display = key === k ? display[key] : 'none';
      });
      if (k === 'notes') refreshCurrentTabUrl();
    });
  });
}

// ── REST helpers ──
function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${authToken}`,
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...extra,
  };
}
async function rest(path, opts = {}) {
  if (!authToken) return null;
  if (!(await ensureFreshSession())) return null;
  try {
    const makeRequest = () => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: { ...authHeaders(opts.headers || {}), ...(opts.headers || {}) },
    });
    let r = await makeRequest();
    if (r.status === 401 && await ensureFreshSession(true)) r = await makeRequest();
    if (!r.ok) {
      setSyncStatus('error');
      return null;
    }
    if (r.status === 204) return true;
    return await r.json();
  } catch { setSyncStatus('error'); return null; }
}

async function loadAllServerData() {
  await ensureFreshSession();
  await Promise.all([loadCards(), loadNotes(), loadCalendar(), loadTasks(), syncHabitsFromCloud()]);
}

// ── Cards ──
function setupCards() {
  document.getElementById('save-card')?.addEventListener('click', async () => {
    const title = document.getElementById('card-title').value.trim();
    const content = document.getElementById('card-content').value.trim();
    if (!title && !content) return;
    toast('Categorizing…');
    const created = await createCardAutoDewey({ title: title || 'Untitled', content });
    document.getElementById('card-title').value = '';
    document.getElementById('card-content').value = '';
    toast(created?.number ? `Card saved · ${created.number}` : 'Card saved');
    loadCards();
  });
}

async function loadCards() {
  const data = await rest('zettel_cards?select=id,title,content,category,number,linked_cards,created_at&deleted_at=is.null&order=created_at.desc&limit=50');
  if (Array.isArray(data)) {
    cardsList = data;
    chrome.storage.local.set({ [STORAGE_KEYS.CACHE_CARDS]: cardsList });
  }
  renderCards();
}

// Call the ai-categorize-card edge function to get a Dewey {number, category}
async function categorizeWithDewey(title, content) {
  if (!authToken) return null;
  try {
    if (!(await ensureFreshSession())) return null;
    const existingNumbers = (cardsList || []).map(c => c.number).filter(Boolean).slice(0, 200);
    const r = await fetch(`${SUPABASE_URL}/functions/v1/ai-categorize-card`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: (title || '').slice(0, 500),
        content: (content || '').slice(0, 49000),
        method: 'dewey',
        existingNumbers,
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (data?.error || !data?.number) return null;
    return { number: String(data.number), category: String(data.category || data.number) };
  } catch { return null; }
}

// Topic-graph linking: find sibling cards sharing the same Dewey trunk
function findRelatedByDewey(newNumber, limit = 5) {
  if (!newNumber || !cardsList?.length) return [];
  const trunk = String(newNumber).split('-')[0];                 // strip "-suffix"
  const head = trunk.split('.')[0];                              // "005.437" -> "005"
  const branch = trunk.includes('.') ? trunk.split('.').slice(0, 2).join('.') : trunk;
  const scored = cardsList
    .filter(c => c.id && c.number)
    .map(c => {
      const cTrunk = String(c.number).split('-')[0];
      let score = 0;
      if (cTrunk === trunk) score = 3;
      else if (cTrunk.startsWith(branch + '.') || cTrunk === branch) score = 2;
      else if (cTrunk.startsWith(head)) score = 1;
      return { id: c.id, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.id);
  return scored;
}

// Reciprocal link: append the new card id to each related card's linked_cards
async function linkBack(relatedIds, newCardId) {
  if (!relatedIds?.length || !newCardId) return;
  await Promise.all(relatedIds.map(async (id) => {
    try {
      const rows = await rest(`zettel_cards?id=eq.${id}&select=linked_cards`);
      const existing = Array.isArray(rows) && rows[0]?.linked_cards ? rows[0].linked_cards : [];
      if (existing.includes(newCardId)) return;
      const next = Array.from(new Set([...existing, newCardId]));
      await rest(`zettel_cards?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ linked_cards: next }),
      });
    } catch {}
  }));
}

async function createCard({ title, content, number, category, tags, linked_cards }) {
  const uid = await getUserId();
  if (!uid) return null;
  return await rest('zettel_cards', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: uid,
      title,
      content: content || '',
      number: number || `000-${Date.now().toString(36)}`,
      category: category || '000 - General',
      tags: tags || [],
      linked_cards: linked_cards || [],
    }),
  });
}

// Categorize via Dewey, create the card, and reciprocally link to siblings.
async function createCardAutoDewey({ title, content, tags }) {
  // Ensure we have a fresh cardsList so existingNumbers/linking are accurate
  if (!cardsList?.length) await loadCards();
  const cat = await categorizeWithDewey(title, content);
  const number = cat?.number || `000-${Date.now().toString(36)}`;
  const category = cat?.category || '000 - General';
  const related = findRelatedByDewey(number, 5);
  const rows = await createCard({
    title, content, number, category,
    tags: Array.from(new Set([...(tags || []), 'auto-dewey'])),
    linked_cards: related,
  });
  const created = Array.isArray(rows) ? rows[0] : null;
  if (created?.id) linkBack(related, created.id); // fire and forget
  return created ? { ...created, number, category } : null;
}


function renderCards() {
  const c = document.getElementById('cards-list');
  if (!c) return;
  if (!cardsList.length) {
    c.innerHTML = '<div class="empty-state"><p>No cards yet</p></div>';
    return;
  }
  c.innerHTML = cardsList.map((card) => `
    <div class="item-row" data-id="${card.id}">
      <div class="item-title">${escapeHtml(card.title || 'Untitled')}</div>
      <div class="item-snippet">${escapeHtml((card.content || '').slice(0, 140))}</div>
      <div class="item-meta"><span>${escapeHtml(card.category || 'general')}</span><span>${formatDate(card.created_at)}</span></div>
    </div>
  `).join('');
  c.querySelectorAll('.item-row').forEach((el) => {
    el.addEventListener('click', () => openItemModal('card', el.dataset.id));
  });
}

// ── Notes ──
function setupNotes() {
  document.getElementById('save-scratch')?.addEventListener('click', async () => {
    const v = document.getElementById('scratch-input').value.trim();
    if (!v) return;
    await createNote({ title: v.split('\n')[0].slice(0, 80), content: v });
    document.getElementById('scratch-input').value = '';
    toast('Note saved');
    loadNotes();
  });
  document.getElementById('clear-scratch')?.addEventListener('click', () => {
    document.getElementById('scratch-input').value = '';
  });
}

async function loadNotes() {
  const data = await rest('notes?select=id,title,content,created_at&deleted_at=is.null&order=created_at.desc&limit=50');
  if (Array.isArray(data)) {
    notesList = data;
    chrome.storage.local.set({ [STORAGE_KEYS.CACHE_NOTES]: notesList });
  }
  renderNotes();
}

async function createNote({ title, content, tags }) {
  const uid = await getUserId();
  if (!uid) return null;
  return await rest('notes', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ user_id: uid, title: title || 'Untitled', content: content || '', tags: tags || [] }),
  });
}

function renderNotes() {
  const c = document.getElementById('notes-list');
  if (!c) return;
  if (!notesList.length) {
    c.innerHTML = '<div class="empty-state"><p>No notes yet</p></div>';
    return;
  }
  c.innerHTML = notesList.map((n) => `
    <div class="note-card" data-id="${n.id}">
      <p><strong>${escapeHtml(n.title || 'Untitled')}</strong>\n${escapeHtml((n.content || '').slice(0, 200))}</p>
      <div class="note-meta">
        <span>${formatDate(n.created_at)} ☁️</span>
      </div>
    </div>
  `).join('');
  c.querySelectorAll('.note-card').forEach((el) => {
    el.addEventListener('click', () => openItemModal('note', el.dataset.id));
  });
}

// ── Web capture (active tab) ──
function setupCapture() {
  refreshCurrentTabUrl();
  document.getElementById('capture-text')?.addEventListener('click', () => captureFromPage('text'));
  document.getElementById('capture-html')?.addEventListener('click', () => captureFromPage('html'));
  document.getElementById('capture-card')?.addEventListener('click', () => captureFromPage('card'));
  document.getElementById('capture-pdf')?.addEventListener('click', captureAsPdf);
}

async function refreshCurrentTabUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const el = document.getElementById('capture-url');
    if (el) el.textContent = tab?.title ? `${tab.title}` : tab?.url || 'No active tab';
  } catch {}
}

async function captureFromPage(mode) {
  if (!authToken) { toast('Sign in first'); return; }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        title: document.title,
        url: location.href,
        text: document.body?.innerText || '',
        html: document.documentElement?.outerHTML || '',
      }),
    });
    if (!result) return;
    const sourceLine = `\n\n---\nSource: ${result.url}`;

    // All three capture modes now produce a Dewey-categorized, graph-linked Card.
    let title = result.title || 'Untitled page';
    let body = '';
    const extraTags = ['web-capture'];

    if (mode === 'text') {
      body = (result.text || '').slice(0, 8000);
    } else if (mode === 'html') {
      const cleaned = (result.html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      body = cleaned.slice(0, 8000);
      extraTags.push('full-page');
    } else if (mode === 'card') {
      body = (result.text || '').slice(0, 1500);
    }

    toast('Categorizing & linking…');
    const created = await createCardAutoDewey({
      title,
      content: body + sourceLine,
      tags: extraTags,
    });
    if (!created) { toast('Save failed'); return; }
    toast(`Saved to Cards · ${created.number}${created.linked_cards?.length ? ` · linked ${created.linked_cards.length}` : ''}`);
    await loadCards();
    document.querySelector('.tab[data-tab="cards"]')?.click();
    if (created.id) setTimeout(() => openItemModal('card', created.id), 200);
  } catch (e) {
    toast(`Capture failed: ${e.message}`);
  }
}

async function captureAsPdf() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.print(),
    });
    toast('Print → choose "Save as PDF"');
  } catch (e) {
    toast(`PDF failed: ${e.message}`);
  }
}

// ── Calendar ──
function setupCalendar() {
  document.querySelectorAll('#cal-filter .cal-chip').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#cal-filter .cal-chip').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      calFilter = b.dataset.type;
      renderCalendar();
    });
  });
  document.getElementById('mc-prev')?.addEventListener('click', () => {
    mcCursor = new Date(mcCursor.getFullYear(), mcCursor.getMonth() - 1, 1);
    renderMiniCal();
  });
  document.getElementById('mc-next')?.addEventListener('click', () => {
    mcCursor = new Date(mcCursor.getFullYear(), mcCursor.getMonth() + 1, 1);
    renderMiniCal();
  });
  document.getElementById('save-cal')?.addEventListener('click', addCalendarEvent);
  renderMiniCal();
}

async function addCalendarEvent() {
  const title = document.getElementById('cal-title-input').value.trim();
  const event_date = document.getElementById('cal-date-input').value || new Date().toISOString().slice(0,10);
  let event_time = document.getElementById('cal-time-input').value || null;
  const event_category = document.getElementById('cal-cat-input').value || 'event';
  if (!title) return;
  if (event_time && event_time.length === 5) event_time = event_time + ':00';

  // Duplicate detection
  const dup = await findDuplicateEvent(event_date, event_time);
  if (dup.length) {
    const choice = await askDuplicate(dup);
    if (choice === 'cancel') return;
    if (choice === 'replace') {
      for (const d of dup) await rest(`calendar_events?id=eq.${d.id}`, { method: 'DELETE' });
    }
  }

  const uid = await getUserId();
  await rest('calendar_events', {
    method: 'POST',
    body: JSON.stringify({ user_id: uid, title, event_date, event_time, event_category, status: 'scheduled' }),
  });
  document.getElementById('cal-title-input').value = '';
  document.getElementById('cal-date-input').value = '';
  document.getElementById('cal-time-input').value = '';
  toast('Added to calendar');
  loadCalendar();
}

async function findDuplicateEvent(date, time, excludeId) {
  if (!date) return [];
  const uid = await getUserId();
  let q = `calendar_events?select=id,title,event_date,event_time,event_category&user_id=eq.${uid}&event_date=eq.${date}`;
  q += time ? `&event_time=eq.${time}` : `&event_time=is.null`;
  const data = await rest(q) || [];
  return excludeId ? data.filter(d => d.id !== excludeId) : data;
}

function askDuplicate(matches) {
  return new Promise((resolve) => {
    const m = document.getElementById('dup-modal');
    const list = document.getElementById('dup-list');
    list.innerHTML = matches.map(d => `<div>• ${escapeHtml(d.title)} <span style="color:var(--fg-subtle)">(${d.event_category})</span></div>`).join('');
    m.classList.add('visible');
    const close = (val) => { m.classList.remove('visible'); resolve(val); cleanup(); };
    const onCancel = () => close('cancel');
    const onReplace = () => close('replace');
    const onKeep = () => close('keep');
    function cleanup(){
      document.getElementById('dup-cancel').removeEventListener('click', onCancel);
      document.getElementById('dup-replace').removeEventListener('click', onReplace);
      document.getElementById('dup-keep').removeEventListener('click', onKeep);
    }
    document.getElementById('dup-cancel').addEventListener('click', onCancel);
    document.getElementById('dup-replace').addEventListener('click', onReplace);
    document.getElementById('dup-keep').addEventListener('click', onKeep);
  });
}

async function loadCalendar() {
  const data = await rest('calendar_events?select=id,title,description,event_date,event_time,event_category,status,color&order=event_date.desc&limit=200');
  if (Array.isArray(data)) {
    calendarList = data;
    chrome.storage.local.set({ [STORAGE_KEYS.CACHE_CALENDAR]: calendarList });
  }
  renderCalendar();
  renderMiniCal();
}

function renderMiniCal() {
  const grid = document.getElementById('mc-grid');
  const title = document.getElementById('mc-title');
  if (!grid || !title) return;
  const y = mcCursor.getFullYear(), mo = mcCursor.getMonth();
  title.textContent = mcCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const first = new Date(y, mo, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const prevMonthDays = new Date(y, mo, 0).getDate();
  const todayStr = new Date().toISOString().slice(0,10);
  const dotDates = new Set(calendarList.map(e => e.event_date));

  let html = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="mc-dow">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    let dnum, mm = mo, yy = y, other = false;
    if (i < startDow) { dnum = prevMonthDays - startDow + 1 + i; mm = mo - 1; other = true; }
    else if (i >= startDow + daysInMonth) { dnum = i - startDow - daysInMonth + 1; mm = mo + 1; other = true; }
    else dnum = i - startDow + 1;
    const date = new Date(yy, mm, dnum);
    const ds = date.toISOString().slice(0,10);
    const cls = ['mc-day'];
    if (other) cls.push('other');
    if (ds === todayStr) cls.push('today');
    if (ds === mcSelected) cls.push('selected');
    html += `<div class="${cls.join(' ')}" data-date="${ds}">${dnum}${dotDates.has(ds) ? '<div class="mc-dot"></div>' : ''}</div>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll('.mc-day').forEach(el => {
    el.addEventListener('click', () => {
      const ds = el.dataset.date;
      mcSelected = mcSelected === ds ? null : ds;
      renderMiniCal(); renderCalendar();
    });
  });
}

function renderCalendar() {
  const c = document.getElementById('cal-list');
  if (!c) return;
  let items = calendarList;
  if (calFilter !== 'all') items = items.filter((e) => (e.event_category || '').toLowerCase() === calFilter);
  if (mcSelected) items = items.filter((e) => e.event_date === mcSelected);
  if (!items.length) {
    c.innerHTML = '<div class="empty-state"><p>Nothing scheduled</p></div>';
    return;
  }
  c.innerHTML = items.map((e) => `
    <div class="cal-row" data-id="${e.id}">
      <div class="cal-dot" style="background: ${e.color || 'var(--fg)'};"></div>
      <div class="cal-body">
        <div class="cal-title">${escapeHtml(e.title || 'Untitled')}</div>
        <div class="cal-when">${e.event_date}${e.event_time ? ' · ' + (e.event_time || '').slice(0, 5) : ''}</div>
      </div>
      <span class="cal-type">${escapeHtml(e.event_category || 'event')}</span>
      <div class="cal-actions">
        <button class="edit" data-action="edit">✏</button>
        <button class="del" data-action="del">🗑</button>
      </div>
    </div>
  `).join('');
  c.querySelectorAll('.cal-row').forEach((el) => {
    const id = el.dataset.id;
    el.querySelector('[data-action="edit"]').addEventListener('click', (ev) => { ev.stopPropagation(); openCalModal(id); });
    el.querySelector('[data-action="del"]').addEventListener('click', async (ev) => {
      ev.stopPropagation();
      if (!confirm('Delete this event?')) return;
      await rest(`calendar_events?id=eq.${id}`, { method: 'DELETE' });
      toast('Deleted');
      loadCalendar();
    });
    el.addEventListener('click', () => openCalModal(id));
  });
}

// ── Focus tasks ──
function setupFocusRange() {
  document.querySelectorAll('.focus-tabs button').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.focus-tabs button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      focusRange = b.dataset.range;
      renderFocusTasks();
    });
  });
}

async function loadTasks() {
  const data = await rest('tasks?select=id,title,is_completed,due_date,priority&order=due_date.asc.nullslast,created_at.desc&limit=200');
  if (Array.isArray(data)) {
    tasksList = data;
    chrome.storage.local.set({ [STORAGE_KEYS.CACHE_TASKS]: tasksList });
  }
  renderFocusTasks();
}

function renderFocusTasks() {
  const c = document.getElementById('focus-tasks');
  if (!c) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  if (focusRange === 'day') end.setDate(end.getDate() + 1);
  else if (focusRange === 'week') end.setDate(end.getDate() + 7);
  else end.setMonth(end.getMonth() + 1);

  const items = tasksList.filter((t) => {
    if (!t.due_date) return focusRange === 'day' && !t.is_completed;
    const d = new Date(t.due_date);
    return d >= today && d < end;
  });
  if (!items.length) {
    c.innerHTML = '<div class="empty-state"><p>No tasks for this range</p></div>';
    return;
  }
  c.innerHTML = items.map((t) => `
    <div class="task-card" data-id="${t.id}">
      <div class="task-check ${t.is_completed ? 'done' : ''}">${t.is_completed ? '✓' : ''}</div>
      <div class="task-name ${t.is_completed ? 'done' : ''}">${escapeHtml(t.title || 'Untitled')}</div>
      ${t.due_date ? `<div class="task-due">${t.due_date}</div>` : ''}
    </div>
  `).join('');
  c.querySelectorAll('.task-card').forEach((el) => {
    el.querySelector('.task-check').addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const t = tasksList.find((x) => x.id === el.dataset.id);
      if (!t) return;
      const newVal = !t.is_completed;
      t.is_completed = newVal;
      renderFocusTasks();
      await rest(`tasks?id=eq.${t.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_completed: newVal, completed_at: newVal ? new Date().toISOString() : null }),
      });
    });
  });
}

// ── Pomodoro ──
function setupPomodoro() {
  document.getElementById('pomo-start')?.addEventListener('click', togglePomodoro);
  document.getElementById('pomo-reset')?.addEventListener('click', resetPomodoro);
  document.querySelectorAll('.pomo-preset-btn').forEach((b) => {
    b.addEventListener('click', () => {
      if (pomoRunning) return;
      pomoDuration = parseInt(b.dataset.minutes) * 60;
      pomoRemaining = pomoDuration;
      pomoIsBreak = false;
      document.querySelectorAll('.pomo-preset-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      updatePomoUI();
      savePomodoroState();
    });
  });
}
function togglePomodoro() {
  if (pomoRunning) { pomoRunning = false; if (pomoInterval) clearInterval(pomoInterval); }
  else { pomoRunning = true; startPomoTick(); }
  updatePomoUI(); savePomodoroState();
}
function resetPomodoro() {
  pomoRunning = false; pomoIsBreak = false;
  if (pomoInterval) clearInterval(pomoInterval);
  pomoRemaining = pomoDuration;
  updatePomoUI(); savePomodoroState();
  document.getElementById('pomo-break-banner')?.classList.remove('visible');
}
function startPomoTick() {
  if (pomoInterval) clearInterval(pomoInterval);
  pomoInterval = setInterval(() => {
    if (pomoRemaining <= 0) { clearInterval(pomoInterval); pomoRunning = false; handlePomodoroComplete(); return; }
    pomoRemaining--; updatePomoUI();
  }, 1000);
}
function handlePomodoroComplete() {
  if (!pomoIsBreak) {
    pomoStats.sessions++;
    pomoStats.totalMinutes += Math.round(pomoDuration / 60);
    pomoStats.lastDate = new Date().toDateString();
    updatePomoStats();
    pomoIsBreak = true;
    pomoRemaining = BREAK_DURATION;
    document.getElementById('pomo-break-banner')?.classList.add('visible');
    pomoRunning = true; startPomoTick();
  } else {
    pomoIsBreak = false;
    pomoRemaining = pomoDuration;
    document.getElementById('pomo-break-banner')?.classList.remove('visible');
  }
  updatePomoUI(); savePomodoroState();
}
function updatePomoUI() {
  const t = document.getElementById('pomo-time');
  if (t) {
    const m = Math.floor(pomoRemaining / 60), s = pomoRemaining % 60;
    t.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const lbl = document.getElementById('pomo-label');
  if (lbl) lbl.textContent = pomoIsBreak ? 'Break' : 'Focus';
  const ring = document.getElementById('pomo-ring');
  if (ring) {
    const total = pomoIsBreak ? BREAK_DURATION : pomoDuration;
    const p = total > 0 ? (total - pomoRemaining) / total : 0;
    ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - p);
    ring.classList.toggle('break', pomoIsBreak);
  }
  const btn = document.getElementById('pomo-start');
  if (btn) {
    btn.textContent = pomoRunning ? 'Pause' : (pomoRemaining < (pomoIsBreak ? BREAK_DURATION : pomoDuration) ? 'Resume' : 'Start');
    btn.className = pomoRunning ? 'btn btn-secondary' : 'btn btn-primary';
  }
}
function updatePomoStats() {
  document.getElementById('pomo-sessions').textContent = pomoStats.sessions;
  const tot = document.getElementById('pomo-total-time');
  if (tot) {
    const h = Math.floor(pomoStats.totalMinutes / 60);
    tot.textContent = h > 0 ? `${h}h ${pomoStats.totalMinutes % 60}m` : `${pomoStats.totalMinutes}m`;
  }
  document.getElementById('pomo-streak').textContent = pomoStats.streak;
}

// ── Habits ──
function setupHabits() {
  const add = document.getElementById('add-habit-btn');
  const inp = document.getElementById('habit-name-input');
  add?.addEventListener('click', addHabit);
  inp?.addEventListener('keydown', (e) => { if (e.key === 'Enter') addHabit(); });
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function getHabitStreak(checkins) {
  const sorted = [...new Set(checkins)].sort().reverse();
  if (!sorted.length) return 0;
  let s = 0; const d = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().slice(0, 10);
    if (sorted.includes(ds)) { s++; d.setDate(d.getDate() - 1); }
    else if (i === 0) { d.setDate(d.getDate() - 1); continue; }
    else break;
  }
  return s;
}
function addHabit() {
  const inp = document.getElementById('habit-name-input');
  const name = inp.value.trim();
  if (!name) return;
  const h = { id: Date.now().toString(), name, checkins: [], synced: false };
  habits.push(h); inp.value = ''; saveLocal(); renderHabits();
  if (authToken) syncHabitToCloud(h);
}
function renderHabits() {
  const c = document.getElementById('habits-list');
  if (!c) return;
  if (!habits.length) { c.innerHTML = '<div class="empty-state"><p>No habits yet</p></div>'; return; }
  const today = todayStr();
  c.innerHTML = habits.map((h) => {
    const streak = getHabitStreak(h.checkins);
    const done = h.checkins.includes(today);
    return `
      <div class="habit-card" data-id="${h.id}">
        <div class="habit-header">
          <span class="habit-name">${escapeHtml(h.name)}</span>
          <span class="habit-streak">🔥 ${streak}d</span>
        </div>
        <button class="habit-checkin-btn ${done ? 'done' : 'pending'}" ${done ? 'disabled' : ''}>
          ${done ? '✓ Done today' : '✓ Check in'}
        </button>
      </div>`;
  }).join('');
  c.querySelectorAll('.habit-checkin-btn.pending').forEach((b, i) => {
    b.addEventListener('click', () => {
      const card = b.closest('.habit-card');
      const id = card.dataset.id;
      const h = habits.find((x) => x.id === id);
      if (!h || h.checkins.includes(todayStr())) return;
      h.checkins.push(todayStr());
      saveLocal(); renderHabits();
      if (authToken) syncHabitCheckinToCloud(h);
    });
  });
}
async function syncHabitsFromCloud() {
  if (!authToken) return;
  try {
    const cloud = await rest('habits?select=id,name');
    const comp = await rest('habit_completions?select=habit_id,completion_date,completed') || [];
    const byHabit = {};
    comp.forEach((c) => { if (c.completed) (byHabit[c.habit_id] ||= []).push(c.completion_date); });
    if (cloud) {
      habits = cloud.map((h) => ({ id: h.id, name: h.name, checkins: byHabit[h.id] || [], synced: true }));
      saveLocal(); renderHabits();
    }
  } catch {}
}
async function syncHabitToCloud(habit) {
  try {
    const uid = await getUserId();
    const r = await fetch(`${SUPABASE_URL}/rest/v1/habits`, {
      method: 'POST',
      headers: { ...authHeaders(), Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: uid, name: habit.name, color: '#3b82f6', streak: 0 }),
    });
    if (r.ok) {
      const d = await r.json();
      if (d?.[0]) {
        const local = habits.find((h) => h.id === habit.id);
        if (local) { local.id = d[0].id; local.synced = true; saveLocal(); renderHabits(); }
      }
    }
  } catch {}
}
async function syncHabitCheckinToCloud(habit) {
  if (!habit.synced) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/habit_completions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ habit_id: habit.id, completion_date: todayStr(), completed: true }),
    });
  } catch {}
}

// ── Helpers ──
function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML;
}
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── ALICE ──
function setupAIChat() {
  document.getElementById('ai-send')?.addEventListener('click', () => sendAIMessage());
  document.getElementById('ai-new-thread')?.addEventListener('click', () => {
    aiMessages = []; aliceThreadId = null;
    chrome.storage.local.remove(['pendragonx_alice_thread_id']);
    renderAIMessages();
  });
  const inp = document.getElementById('ai-input');
  inp?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(); }
  });
  inp?.addEventListener('input', () => {
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
  });
  document.querySelectorAll('.ai-suggestion').forEach((b) => {
    b.addEventListener('click', () => sendAIMessage(b.dataset.q));
  });
}

function renderAIMessages() {
  const c = document.getElementById('ai-messages');
  const empty = document.getElementById('ai-empty');
  if (!c) return;
  if (!aiMessages.length && !aiLoading) {
    if (empty) { c.innerHTML = ''; c.appendChild(empty); empty.style.display = 'block'; }
    return;
  }
  c.innerHTML = '';
  const aliceSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/></svg>';
  aiMessages.forEach((m) => {
    if (m.role === 'system') {
      const s = document.createElement('div');
      s.className = 'ai-msg system';
      s.textContent = m.content;
      c.appendChild(s);
      return;
    }
    const row = document.createElement('div');
    row.className = `ai-row ${m.role}`;
    if (m.role === 'assistant') {
      const av = document.createElement('div');
      av.className = 'ai-avatar';
      av.innerHTML = aliceSvg;
      row.appendChild(av);
    }
    const d = document.createElement('div');
    d.className = `ai-msg ${m.role}`;
    d.textContent = m.content;
    row.appendChild(d);
    c.appendChild(row);
  });
  if (aiLoading) {
    const row = document.createElement('div');
    row.className = 'ai-row assistant';
    const av = document.createElement('div');
    av.className = 'ai-avatar';
    av.innerHTML = aliceSvg;
    row.appendChild(av);
    const t = document.createElement('div');
    t.className = 'ai-msg assistant';
    t.innerHTML = '<span class="ai-typing">Thinking<span class="ai-dots"><span></span><span></span><span></span></span></span>';
    row.appendChild(t);
    c.appendChild(row);
  }
  c.scrollTop = c.scrollHeight;
}

async function sendAIMessage(prefilled) {
  const inp = document.getElementById('ai-input');
  const text = (prefilled || inp?.value || '').trim();
  if (!text || aiLoading) return;
  if (!authToken) {
    aiMessages.push({ role: 'assistant', content: 'Please sign in to chat with ALICE.' });
    renderAIMessages();
    return;
  }
  aiMessages.push({ role: 'user', content: text });
  if (inp) { inp.value = ''; inp.style.height = 'auto'; }
  aiLoading = true; renderAIMessages();

  try {
    await ensureFreshSession();
    const deepThink = document.getElementById('ai-deep-think')?.checked || false;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const r = await fetch(`${SUPABASE_URL}/functions/v1/jarvis-chat`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        message: text,
        threadId: aliceThreadId,
        timeZone: tz,
        locale: navigator.language || 'en-US',
        deepThink,
        screen: { surface: 'chrome-extension' },
      }),
    });
    let d = await r.json().catch(() => ({}));
    if (r.status === 401 && await ensureFreshSession(true)) {
      const retry = await fetch(`${SUPABASE_URL}/functions/v1/jarvis-chat`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          message: text, threadId: aliceThreadId, timeZone: tz, locale: navigator.language || 'en-US',
          deepThink, screen: { surface: 'chrome-extension' },
        }),
      });
      d = await retry.json().catch(() => ({}));
      if (!retry.ok || d.error) throw new Error(d.error || `Request failed (${retry.status})`);
    } else if (!r.ok || d.error) throw new Error(d.error || `Request failed (${r.status})`);
    if (d.threadId && d.threadId !== aliceThreadId) {
      aliceThreadId = d.threadId;
      chrome.storage.local.set({ pendragonx_alice_thread_id: aliceThreadId });
    }
    const parts = Array.isArray(d.parts) ? d.parts : [];
    const reply = parts.filter((p) => p?.type === 'text').map((p) => p.text).join('\n').trim() || 'Done.';
    aiMessages.push({ role: 'assistant', content: reply });
    // ALICE asked us to take the user somewhere in the web app.
    // Open it in a new tab and pass the toolbox session along so the user
    // lands signed in — no "please log in" detour.
    if (d.navigate_to && typeof d.navigate_to === 'string') {
      openInWebAppSignedIn(d.navigate_to);
      aiMessages.push({ role: 'system', content: `Opening ${d.navigate_to} on pendragonx.com…` });
    }
  } catch (e) {
    aiMessages.push({ role: 'assistant', content: `⚠️ ${e.message || 'Failed to reach ALICE.'}` });
  } finally {
    aiLoading = false; renderAIMessages();
  }
}

// Open a path on the web app with the current toolbox session handed off,
// so the user doesn't have to sign in again on the site.
async function openInWebAppSignedIn(path) {
  let to = path && path.startsWith('/') ? path : '/app';
  try {
    if (authToken && refreshToken) {
      // Refresh first if we're close to expiry so the handoff token is valid.
      await ensureFreshSession();
      const hash = new URLSearchParams({
        at: authToken,
        rt: refreshToken,
        to,
      }).toString();
      const url = `https://pendragonx.com/sso#${hash}`;
      chrome.tabs.create({ url });
      return;
    }
  } catch (e) {
    console.warn('[Toolbox] SSO handoff failed, opening anonymously', e);
  }
  // Fallback: just open the destination; the site will prompt for login.
  chrome.tabs.create({ url: `https://pendragonx.com${to}` });
}

// ── In-panel item viewer/editor (notes & cards) ──
let _imCurrent = null; // { type, id }
function setupModals() {
  document.getElementById('im-close')?.addEventListener('click', closeItemModal);
  document.getElementById('im-save')?.addEventListener('click', saveItemModal);
  document.getElementById('im-delete')?.addEventListener('click', deleteItemModal);
  document.getElementById('im-open')?.addEventListener('click', () => {
    if (!_imCurrent) return;
    const path = _imCurrent.type === 'card'
      ? `/app?card=${_imCurrent.id}`
      : `/app?note=${_imCurrent.id}`;
    openInWebAppSignedIn(path);
  });

  document.getElementById('cm-close')?.addEventListener('click', closeCalModal);
  document.getElementById('cm-save')?.addEventListener('click', saveCalModal);
  document.getElementById('cm-delete')?.addEventListener('click', deleteCalModal);

  // Click backdrop to close
  ['item-modal','cal-modal','dup-modal'].forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('click', (e) => { if (e.target === el) el.classList.remove('visible'); });
  });
}

function openItemModal(type, id) {
  const list = type === 'card' ? cardsList : notesList;
  const item = list.find((x) => x.id === id);
  if (!item) return;
  _imCurrent = { type, id };
  document.getElementById('im-title-label').textContent = type === 'card' ? 'Edit Card' : 'Edit Note';
  document.getElementById('im-title').value = item.title || '';
  document.getElementById('im-content').value = item.content || '';
  document.getElementById('item-modal').classList.add('visible');
}
function closeItemModal() {
  document.getElementById('item-modal').classList.remove('visible');
  _imCurrent = null;
}
async function saveItemModal() {
  if (!_imCurrent) return;
  const title = document.getElementById('im-title').value.trim() || 'Untitled';
  const content = document.getElementById('im-content').value;
  const table = _imCurrent.type === 'card' ? 'zettel_cards' : 'notes';
  await rest(`${table}?id=eq.${_imCurrent.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title, content }),
  });
  toast('Saved');
  closeItemModal();
  if (_imCurrent?.type === 'card') loadCards(); else loadNotes();
  if (table === 'zettel_cards') loadCards(); else loadNotes();
}
async function deleteItemModal() {
  if (!_imCurrent) return;
  if (!confirm('Delete this item?')) return;
  const table = _imCurrent.type === 'card' ? 'zettel_cards' : 'notes';
  await rest(`${table}?id=eq.${_imCurrent.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ deleted_at: new Date().toISOString() }),
  });
  toast('Deleted');
  const wasCard = _imCurrent.type === 'card';
  closeItemModal();
  if (wasCard) loadCards(); else loadNotes();
}

// ── Calendar event modal ──
let _cmCurrent = null;
function openCalModal(id) {
  const ev = calendarList.find((x) => x.id === id);
  if (!ev) return;
  _cmCurrent = id;
  document.getElementById('cm-title').value = ev.title || '';
  document.getElementById('cm-date').value = ev.event_date || '';
  document.getElementById('cm-time').value = (ev.event_time || '').slice(0, 5);
  document.getElementById('cm-cat').value = ev.event_category || 'event';
  document.getElementById('cal-modal').classList.add('visible');
}
function closeCalModal() {
  document.getElementById('cal-modal').classList.remove('visible');
  _cmCurrent = null;
}
async function saveCalModal() {
  if (!_cmCurrent) return;
  const title = document.getElementById('cm-title').value.trim() || 'Untitled';
  const event_date = document.getElementById('cm-date').value;
  let event_time = document.getElementById('cm-time').value || null;
  const event_category = document.getElementById('cm-cat').value;
  if (event_time && event_time.length === 5) event_time = event_time + ':00';

  // Duplicate detection (excluding self)
  const dup = await findDuplicateEvent(event_date, event_time, _cmCurrent);
  if (dup.length) {
    const choice = await askDuplicate(dup);
    if (choice === 'cancel') return;
    if (choice === 'replace') {
      for (const d of dup) await rest(`calendar_events?id=eq.${d.id}`, { method: 'DELETE' });
    }
  }

  await rest(`calendar_events?id=eq.${_cmCurrent}`, {
    method: 'PATCH',
    body: JSON.stringify({ title, event_date, event_time, event_category }),
  });
  toast('Updated');
  closeCalModal();
  loadCalendar();
}
async function deleteCalModal() {
  if (!_cmCurrent) return;
  if (!confirm('Delete this event?')) return;
  await rest(`calendar_events?id=eq.${_cmCurrent}`, { method: 'DELETE' });
  toast('Deleted');
  closeCalModal();
  loadCalendar();
}

// ── Auto-sync ──
function setupAutoSync() {
  // Periodic refresh every 30s while panel is open
  if (_syncTimer) clearInterval(_syncTimer);
  _syncTimer = setInterval(() => {
    if (authToken && document.visibilityState === 'visible') doSync();
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && authToken) doSync();
  });
  // Keep the Supabase session warm. Access tokens expire; refresh tokens should keep
  // the toolbox signed in without dropping lists after idle time.
  if (_refreshTimer) clearInterval(_refreshTimer);
  _refreshTimer = setInterval(() => { if (authToken) ensureFreshSession(true); }, 10 * 60 * 1000);
}

async function doSync() {
  setSyncStatus('syncing');
  try {
    await loadAllServerData();
    setSyncStatus('ok');
  } catch {
    setSyncStatus('error');
  }
}

function setSyncStatus(state) {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-label');
  if (!dot || !lbl) return;
  dot.classList.remove('syncing','error');
  if (state === 'syncing') { dot.classList.add('syncing'); lbl.textContent = 'Syncing…'; }
  else if (state === 'error') { dot.classList.add('error'); lbl.textContent = 'Offline'; }
  else lbl.textContent = 'Synced';
}

function applySession(d, fallbackEmail) {
  authToken = d.access_token || authToken;
  refreshToken = d.refresh_token || refreshToken;
  userEmail = d.user?.email || fallbackEmail || userEmail;
  const expiresIn = Number(d.expires_in || 3600);
  sessionExpiresAt = d.expires_at ? Number(d.expires_at) * 1000 : Date.now() + expiresIn * 1000;
  _cachedUserId = d.user?.id || null;
  saveLocal();
}

async function ensureFreshSession(force = false) {
  if (!authToken) return false;
  if (!force && sessionExpiresAt && sessionExpiresAt - Date.now() > 2 * 60 * 1000) return true;
  if (!refreshToken) return true;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) throw new Error(d.error_description || d.msg || 'Refresh failed');
    applySession(d);
    setSyncStatus('ok');
    return true;
  } catch {
    setSyncStatus('error');
    return false;
  }
}

async function refreshAuthToken() {
  return ensureFreshSession(true);
}
