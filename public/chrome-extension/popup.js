// PendragonX Quick Notes - Chrome Extension

const STORAGE_KEYS = {
  SCRATCH_NOTES: 'pendragonx_scratch_notes',
  STICKY_NOTES: 'pendragonx_sticky_notes',
  SELECTED_COLOR: 'pendragonx_selected_color'
};

const STICKY_COLORS = [
  '#fef08a', // yellow
  '#fed7aa', // orange
  '#fecaca', // red
  '#d9f99d', // lime
  '#a5f3fc', // cyan
  '#ddd6fe', // violet
  '#fbcfe8', // pink
  '#e5e5e5'  // gray
];

let selectedColor = STICKY_COLORS[0];
let scratchNotes = [];
let stickyNotes = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupTabs();
  setupScratchPad();
  setupStickyNotes();
  renderColorPicker();
});

// Load data from storage
function loadData() {
  chrome.storage.local.get([STORAGE_KEYS.SCRATCH_NOTES, STORAGE_KEYS.STICKY_NOTES, STORAGE_KEYS.SELECTED_COLOR], (result) => {
    scratchNotes = result[STORAGE_KEYS.SCRATCH_NOTES] || [];
    stickyNotes = result[STORAGE_KEYS.STICKY_NOTES] || [];
    selectedColor = result[STORAGE_KEYS.SELECTED_COLOR] || STICKY_COLORS[0];
    renderScratchNotes();
    renderStickyNotes();
  });
}

// Save data to storage
function saveData() {
  chrome.storage.local.set({
    [STORAGE_KEYS.SCRATCH_NOTES]: scratchNotes,
    [STORAGE_KEYS.STICKY_NOTES]: stickyNotes,
    [STORAGE_KEYS.SELECTED_COLOR]: selectedColor
  });
}

// Setup tabs
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.tab;
      document.getElementById('scratch-tab').style.display = tabName === 'scratch' ? 'flex' : 'none';
      document.getElementById('sticky-tab').style.display = tabName === 'sticky' ? 'block' : 'none';
    });
  });
}

// Scratch Pad
function setupScratchPad() {
  const input = document.getElementById('scratch-input');
  const saveBtn = document.getElementById('save-scratch');
  const clearBtn = document.getElementById('clear-scratch');
  
  saveBtn.addEventListener('click', () => {
    const content = input.value.trim();
    if (content) {
      scratchNotes.unshift({
        id: Date.now().toString(),
        content,
        timestamp: new Date().toISOString()
      });
      saveData();
      renderScratchNotes();
      input.value = '';
    }
  });
  
  clearBtn.addEventListener('click', () => {
    input.value = '';
  });
}

function renderScratchNotes() {
  const container = document.getElementById('notes-list');
  
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
    <div class="note-card" data-id="${note.id}">
      <p>${escapeHtml(note.content)}</p>
      <div class="note-meta">
        <span>${formatDate(note.timestamp)}</span>
        <div class="note-actions">
          <button class="copy" title="Copy">Copy</button>
          <button class="delete" title="Delete">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
  
  // Add event listeners
  container.querySelectorAll('.note-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('.copy').addEventListener('click', () => {
      const note = scratchNotes.find(n => n.id === id);
      if (note) {
        navigator.clipboard.writeText(note.content);
      }
    });
    card.querySelector('.delete').addEventListener('click', () => {
      scratchNotes = scratchNotes.filter(n => n.id !== id);
      saveData();
      renderScratchNotes();
    });
  });
}

// Sticky Notes
function setupStickyNotes() {
  document.getElementById('add-sticky').addEventListener('click', () => {
    stickyNotes.push({
      id: Date.now().toString(),
      content: '',
      color: selectedColor
    });
    saveData();
    renderStickyNotes();
  });
}

function renderColorPicker() {
  const container = document.getElementById('color-picker');
  container.innerHTML = STICKY_COLORS.map(color => `
    <button 
      class="color-btn ${color === selectedColor ? 'active' : ''}" 
      style="background: ${color};"
      data-color="${color}"
    ></button>
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
  
  if (stickyNotes.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: span 2;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <p>No sticky notes yet</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = stickyNotes.map(note => `
    <div class="sticky-note" style="background: ${note.color};" data-id="${note.id}">
      <button class="sticky-delete">×</button>
      <textarea placeholder="Write something...">${escapeHtml(note.content)}</textarea>
    </div>
  `).join('');
  
  // Add event listeners
  container.querySelectorAll('.sticky-note').forEach(sticky => {
    const id = sticky.dataset.id;
    
    sticky.querySelector('textarea').addEventListener('input', (e) => {
      const note = stickyNotes.find(n => n.id === id);
      if (note) {
        note.content = e.target.value;
        saveData();
      }
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
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
