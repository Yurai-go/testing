/**
 * VELOUR — Elite Wardrobe Concierge
 * Client-Side Application Engine (Cinematic Rendering & Decoupled Streaming)
 */

'use strict';

const State = {
  currentSessionId: null,
  messages: [],
  pendingFiles: [],
  isStreaming: false,
  sidebarOpen: true,
  charCount: 0,
  selectedGarments: [],   // confirmed garments for context
  pickerSelection: new Set(), // transient while picker is open
  vaultAssets: [],        // garments loaded from Supabase
};

const DOM = {
  appShell:        () => document.getElementById('app-shell') || document.querySelector('.app-shell'),
  sidebarToggle:   () => document.getElementById('sidebar-toggle'),
  newChatBtn:      () => document.getElementById('new-chat-btn'),
  chatFeed:        () => document.getElementById('chat-feed'),
  messagesContainer: () => document.getElementById('messages-container'),
  welcomeState:    () => document.getElementById('welcome-state'),
  messageInput:    () => document.getElementById('message-input'),
  sendBtn:         () => document.getElementById('send-btn'),
  fileInput:       () => document.getElementById('file-input'),
  imageQueue:      () => document.getElementById('image-queue'),
  imageQueueScroll:() => document.getElementById('image-queue-scroll'),
  dropzoneOverlay: () => document.getElementById('dropzone-overlay'),
  charCount:       () => document.getElementById('char-count'),
  promptChips:     () => document.querySelectorAll('.prompt-chip'),
  sessionList:     () => document.getElementById('session-list'),
  // Tools & garment picker
  vaultToolsBtn:   () => document.getElementById('vault-tools-btn'),
  toolsDropdown:   () => document.getElementById('vc-tools-dropdown'),
  selectGarmentsBtn:()=> document.getElementById('vc-select-garments-btn'),
  garmentStrip:    () => document.getElementById('vc-garment-strip'),
  garmentStripInner:()=> document.getElementById('vc-garment-strip-inner'),
  garmentStripClear:()=> document.getElementById('vc-garment-strip-clear'),
  pickerOverlay:   () => document.getElementById('vc-picker-overlay'),
  pickerGrid:      () => document.getElementById('vc-picker-grid'),
  pickerCount:     () => document.getElementById('vc-picker-count'),
  pickerConfirm:   () => document.getElementById('vc-picker-confirm'),
  pickerClose:     () => document.getElementById('vc-picker-close'),
};

function initGrainTexture() {
  const canvas = document.getElementById('grain-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  function drawGrain() {
    const { width, height } = canvas;
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const val = Math.random() * 255 | 0;
      imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = val;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    requestAnimationFrame(drawGrain);
  }
  resize(); window.addEventListener('resize', resize, { passive: true }); drawGrain();
}

/* ── SESSION MANAGEMENT API ─────────────────────────────── */
async function fetchSessions() {
  try {
    const res = await fetch('/api/sessions');
    if (!res.ok) return;
    const sessions = await res.json();
    const list = DOM.sessionList();
    if (!list) return;
    list.innerHTML = '';
    
    sessions.forEach(s => {
      const li = document.createElement('li');
      li.className = 'session-item' + (s.session_id === State.currentSessionId ? ' session-item--active' : '');
      li.setAttribute('role', 'listitem');
      
      const content = document.createElement('div');
      content.style.display = 'flex';
      content.style.alignItems = 'center';
      content.style.gap = '8px';
      content.style.flex = '1';
      content.style.overflow = 'hidden';
      content.innerHTML = `<span class="session-icon" aria-hidden="true">◈</span><span class="session-title">${escapeHtml(s.title)}</span>`;
      
      const delBtn = document.createElement('button');
      delBtn.innerHTML = '✕';
      delBtn.style.marginLeft = 'auto';
      delBtn.style.opacity = '0.4';
      delBtn.style.padding = '2px 6px';
      delBtn.style.fontSize = '0.75rem';
      delBtn.style.transition = 'opacity 0.2s ease, color 0.2s ease';
      delBtn.setAttribute('aria-label', 'Delete session');
      
      delBtn.onmouseover = () => { delBtn.style.opacity = '1'; delBtn.style.color = '#F87171'; };
      delBtn.onmouseout = () => { delBtn.style.opacity = '0.4'; delBtn.style.color = 'inherit'; };
      
      delBtn.onclick = async (e) => {
        e.stopPropagation(); 
        if (!confirm("Remove this consultation from the vault permanently?")) return;
        try {
          const res = await fetch(`/api/sessions/${s.session_id}`, { method: 'DELETE' });
          if (res.ok) {
            if (State.currentSessionId === s.session_id) resetUIState();
            fetchSessions();
          }
        } catch(err) { console.error("Deletion failed", err); }
      };

      li.appendChild(content);
      li.appendChild(delBtn);
      li.addEventListener('click', () => loadSessionHistory(s.session_id));
      list.appendChild(li);
    });
  } catch (err) { console.error("Error loading sessions", err); }
}

async function loadSessionHistory(sessionId) {
  if (State.isStreaming) return;
  resetUIState();
  State.currentSessionId = sessionId;
  fetchSessions(); 
  
  DOM.welcomeState().hidden = true;
  DOM.welcomeState().setAttribute('aria-hidden', 'true');

  try {
    const res = await fetch(`/api/sessions/${sessionId}`);
    const history = await res.json();
    State.messages = history.map(m => ({ id: m.message_id, role: m.role, content: m.content }));
    State.messages.forEach(msg => renderMessage(msg));
    scrollToBottom();
  } catch (err) { console.error("Error loading chat history", err); }
}

function initSidebar() {
  const toggle = DOM.sidebarToggle();
  const shell  = DOM.appShell();
  const isMobile = () => window.innerWidth <= 820;

  function openSidebar() {
    State.sidebarOpen = true;
    isMobile() ? (shell.classList.add('sidebar-open'), shell.classList.remove('sidebar-collapsed')) : (shell.classList.remove('sidebar-collapsed'), shell.style.gridTemplateColumns = 'var(--sidebar-width) 1fr');
    toggle?.setAttribute('aria-expanded', 'true');
  }
  function closeSidebar() {
    State.sidebarOpen = false;
    isMobile() ? shell.classList.remove('sidebar-open') : (shell.classList.add('sidebar-collapsed'), shell.style.gridTemplateColumns = '0 1fr');
    toggle?.setAttribute('aria-expanded', 'false');
  }

  toggle?.addEventListener('click', () => State.sidebarOpen ? closeSidebar() : openSidebar());
  DOM.newChatBtn()?.addEventListener('click', () => { resetUIState(); fetchSessions(); });
}

function initComposer() {
  const input = DOM.messageInput();
  const sendBtn = DOM.sendBtn();
  const counter = DOM.charCount();

  window._syncSendButton = () => {
    const canSend = (input.value.trim().length > 0 || State.pendingFiles.length > 0) && !State.isStreaming;
    sendBtn.disabled = !canSend;
    // Update placeholder to reflect garment context state
    const hasGarments = State.selectedGarments.length > 0;
    input.placeholder = hasGarments
      ? 'Ask about your selected garments…'
      : 'Describe your garment or ask for care guidance…';
  };

  input?.addEventListener('input', () => {
    input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 180) + 'px';
    State.charCount = input.value.length;
    if (counter) counter.textContent = `${State.charCount} / 4000`;
    window._syncSendButton();
  });
  
  input?.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      if (!sendBtn.disabled) handleSend(); 
    } 
  });
  
  sendBtn?.addEventListener('click', handleSend);
}

function initFileUpload() {
  const fileInput = DOM.fileInput(), overlay = DOM.dropzoneOverlay(), chatMain = document.querySelector('.chat-main');
  let dragCounter = 0;
  function addFiles(files) {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/') && f.size <= 20 * 1024 * 1024);
    State.pendingFiles.push(...valid.slice(0, 8 - State.pendingFiles.length));
    renderImageQueue(); window._syncSendButton();
  }
  fileInput?.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
  chatMain?.addEventListener('dragenter', e => { e.preventDefault(); if (++dragCounter === 1) overlay?.classList.add('is-active'); });
  chatMain?.addEventListener('dragleave', e => { e.preventDefault(); if (--dragCounter === 0) overlay?.classList.remove('is-active'); });
  chatMain?.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  chatMain?.addEventListener('drop', e => { e.preventDefault(); dragCounter = 0; overlay?.classList.remove('is-active'); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
}

function renderImageQueue() {
  const queue = DOM.imageQueue(), scroll = DOM.imageQueueScroll();
  if (!queue || !scroll) return;
  scroll.innerHTML = '';
  if (State.pendingFiles.length === 0) return queue.setAttribute('hidden', '');
  queue.removeAttribute('hidden');
  State.pendingFiles.forEach((file, i) => {
    const url = URL.createObjectURL(file), item = document.createElement('div');
    item.className = 'queue-item'; item.innerHTML = `<img src="${url}" /><button class="queue-item__remove">✕</button>`;
    item.querySelector('.queue-item__remove').onclick = () => { URL.revokeObjectURL(url); State.pendingFiles.splice(i, 1); renderImageQueue(); window._syncSendButton(); };
    scroll.appendChild(item);
  });
}

function renderMessage(msg) {
  const container = DOM.messagesContainer();
  const el = document.createElement('article');
  el.className = `message message--${msg.role}`;
  el.dataset.id = msg.id;

  if (msg.role === 'user') {
    const imageHtml = (msg.images || []).map(src => `<img class="message__image-thumb" src="${src}" loading="lazy" />`).join('');
    el.innerHTML = `${imageHtml ? `<div class="message__images">${imageHtml}</div>` : ''}<div class="bubble"><div class="message__content">${escapeHtml(msg.content)}</div></div>`;
  } else if (msg.role === 'assistant' || msg.role === 'loading') {
    el.innerHTML = `
      <div class="message__header"><div class="message__avatar">◈</div><span class="message__role">Velour Advisor</span></div>
      <div class="bubble">
        ${msg.role === 'loading' ? `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>` : `<div class="message__content" id="content-${msg.id}">${parseMarkdown(msg.content)}</div>`}
      </div>`;
  }
  container.appendChild(el); scrollToBottom(); return el;
}

async function handleSend() {
  const input = DOM.messageInput(), text = input?.value.trim() || '', files = [...State.pendingFiles];
  if ((!text && files.length === 0 && State.selectedGarments.length === 0) || State.isStreaming) return;

  DOM.welcomeState().hidden = true;
  const userMsgId = Date.now().toString(), imagePreviewUrls = files.map(f => URL.createObjectURL(f));

  // Build garment image previews for the user bubble
  const garmentImagePreviews = State.selectedGarments
    .filter(g => g.img)
    .map(g => g.img);

  const allPreviewImages = [...imagePreviewUrls, ...garmentImagePreviews];
  const displayContent = text || (State.selectedGarments.length > 0 ? `Analyzing ${State.selectedGarments.length} garment(s) from vault…` : '');

  State.messages.push({ id: userMsgId, role: 'user', content: displayContent, images: allPreviewImages });
  renderMessage({ id: userMsgId, role: 'user', content: displayContent, images: allPreviewImages });

  if (input) { input.value = ''; input.style.height = 'auto'; input.dispatchEvent(new Event('input')); }
  State.pendingFiles = []; renderImageQueue(); window._syncSendButton();

  State.isStreaming = true;
  const loadingId = 'load_' + Date.now();
  renderMessage({ id: loadingId, role: 'loading' });

  try {
    const formData = new FormData();
    if (text) formData.append('text', text);
    if (State.currentSessionId) formData.append('session_id', State.currentSessionId);

    // Append user-attached files
    files.forEach((file, i) => formData.append(`image_${i}`, file, file.name));

    // Append garment images fetched from vault URLs
    let garmentImageOffset = files.length;
    if (State.selectedGarments.length > 0) {
      const garmentImageFetches = State.selectedGarments
        .filter(g => g.img)
        .map(async (g, gIdx) => {
          try {
            const resp = await fetch(g.img);
            if (!resp.ok) return;
            const blob = await resp.blob();
            const ext = blob.type.includes('png') ? 'png' : 'jpg';
            const file = new File([blob], `vault-garment-${g.id}.${ext}`, { type: blob.type });
            formData.append(`image_${garmentImageOffset + gIdx}`, file, file.name);
          } catch (_) { /* skip if image fetch fails */ }
        });
      await Promise.all(garmentImageFetches);
    }

    // Inject garment text metadata as context
    if (State.selectedGarments.length > 0) {
      const garmentContext = State.selectedGarments
        .map((g, i) => `Garment ${i + 1}: ${g.brand} ${g.name} | Type: ${g.type} | Color: ${g.color} | Fabric: ${g.fabric}`)
        .join('\n');
      formData.append('garment_context', garmentContext);
    }

    formData.append('history', JSON.stringify(State.messages.filter(m => m.role !== 'user' || m.content).slice(-10)));

    const response = await fetch('/api/chat', { method: 'POST', body: formData });
    if (!response.ok) throw new Error("HTTP " + response.status);

    document.querySelector(`[data-id="${loadingId}"]`)?.remove();
    const assistantId = 'asst_' + Date.now(), assistantMsg = { id: assistantId, role: 'assistant', content: '' };
    State.messages.push(assistantMsg); renderMessage(assistantMsg);

    const reader = response.body.getReader(), decoder = new TextDecoder('utf-8');
    
    // Decoupled Cinematic Render Variables
    let accumulated = '';
    let displayed = '';
    let renderComplete = false;

    // The high-performance easing loop
    const renderLoop = () => {
      if (displayed.length < accumulated.length) {
        const charsToTake = Math.max(1, Math.ceil((accumulated.length - displayed.length) * 0.25));
        displayed += accumulated.slice(displayed.length, displayed.length + charsToTake);
        
        const el = document.querySelector(`#content-${assistantId}`);
        if (el) {
          el.innerHTML = parseMarkdown(displayed) + '<span class="stream-cursor"></span>';
          scrollToBottom();
        }
      }

      if (State.isStreaming || displayed.length < accumulated.length) {
        requestAnimationFrame(renderLoop);
      } else {
        renderComplete = true;
        const el = document.querySelector(`#content-${assistantId}`);
        if (el) el.innerHTML = parseMarkdown(displayed);
        assistantMsg.content = displayed;
      }
    };
    
    requestAnimationFrame(renderLoop);

    // Network ingestion loop
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value, { stream: true }).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.session_id && !State.currentSessionId) {
             State.currentSessionId = parsed.session_id; 
             fetchSessions(); 
          }
          accumulated += parsed.token || '';
        } catch(e) {}
      }
    }
    
    State.isStreaming = false; 

  } catch (err) {
    document.querySelector(`[data-id="${loadingId}"]`)?.remove();
    renderMessage({ id: 'err', role: 'error', content: `Advisory service error: ${err.message}` });
    State.isStreaming = false;
  } finally {
    window._syncSendButton();
    imagePreviewUrls.forEach(URL.revokeObjectURL);
  }
}

function resetUIState() {
  State.messages = []; State.pendingFiles = []; State.isStreaming = false; State.currentSessionId = null;
  State.selectedGarments = []; State.pickerSelection = new Set();
  DOM.messagesContainer().innerHTML = ''; DOM.welcomeState().removeAttribute('hidden');
  renderImageQueue(); renderGarmentStrip(); window._syncSendButton();
}

function scrollToBottom() { const f = DOM.chatFeed(); if(f) requestAnimationFrame(() => f.scrollTo({ top: f.scrollHeight, behavior: 'smooth' })); }
function escapeHtml(str) { const d = document.createElement('div'); d.appendChild(document.createTextNode(String(str))); return d.innerHTML; }
function parseMarkdown(t) {
  if (!t) return ''; let h = escapeHtml(t);
  h = h.replace(/```([^`]*?)```/gs, (_, c) => `<pre><code>${c.trim()}</code></pre>`).replace(/`([^`\n]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Images must be processed before links (![alt](url) is a subset of [text](url))
  h = h.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '<img class="md-inline-img" src="$2" alt="$1" loading="lazy"/>');
  // Clickable links — always open in new tab with safe rel
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a class="md-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  h = h.replace(/^[*\-] (.+)$/gm, '<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/gs, m => `<ul>${m}</ul>`);
  return h.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>');
}

/* ── GARMENT STRIP ───────────────────────────────────────── */
function renderGarmentStrip() {
  const strip = DOM.garmentStrip(), inner = DOM.garmentStripInner();
  if (!strip || !inner) return;
  inner.innerHTML = '';
  if (State.selectedGarments.length === 0) { strip.setAttribute('hidden', ''); return; }
  strip.removeAttribute('hidden');
  State.selectedGarments.forEach(g => {
    const pill = document.createElement('span');
    pill.className = 'vc-garment-pill';
    pill.textContent = `${g.brand} ${g.name}`;
    inner.appendChild(pill);
  });
}

/* ── GARMENT PICKER ──────────────────────────────────────── */
function openGarmentPicker() {
  State.pickerSelection = new Set(State.selectedGarments.map(g => g.id));
  const grid = DOM.pickerGrid();
  if (!grid) return;
  grid.innerHTML = '';

  const assets = State.vaultAssets;
  if (assets.length === 0) {
    grid.innerHTML = '<p class="vc-picker-empty">No garments in your vault yet. Add one from the Dashboard.</p>';
  } else {
    assets.forEach(asset => {
      const card = document.createElement('div');
      const isSelected = State.pickerSelection.has(asset.id);
      card.className = 'vc-picker-card' + (isSelected ? ' vc-picker-card--selected' : '');
      card.dataset.id = asset.id;
      card.setAttribute('role', 'checkbox');
      card.setAttribute('aria-checked', String(isSelected));
      card.setAttribute('tabindex', '0');
      const escapedBrand = asset.brand.replace(/"/g, '&quot;');
      const escapedName = asset.name.replace(/</g, '&lt;');
      const escapedFabric = (asset.fabric || '').replace(/</g, '&lt;');
      card.innerHTML = `
        ${asset.img
          ? `<img class="vc-picker-card__img" src="${asset.img}" alt="${escapedBrand}" loading="lazy"/>`
          : `<div class="vc-picker-card__placeholder">${asset.brand.charAt(0)}</div>`}
        <div class="vc-picker-card__body">
          <span class="vc-picker-card__brand">${escapedBrand}</span>
          <span class="vc-picker-card__name">${escapedName}</span>
          <span class="vc-picker-card__meta">${escapedFabric}</span>
        </div>
        <div class="vc-picker-card__check" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>`;
      const toggle = () => {
        if (State.pickerSelection.has(asset.id)) {
          State.pickerSelection.delete(asset.id);
          card.classList.remove('vc-picker-card--selected');
          card.setAttribute('aria-checked', 'false');
        } else {
          State.pickerSelection.add(asset.id);
          card.classList.add('vc-picker-card--selected');
          card.setAttribute('aria-checked', 'true');
        }
        updatePickerCount();
      };
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }});
      grid.appendChild(card);
    });
  }
  updatePickerCount();
  const overlay = DOM.pickerOverlay();
  if (overlay) { overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
}

function updatePickerCount() {
  const n = State.pickerSelection.size;
  const countEl = DOM.pickerCount(), confirmBtn = DOM.pickerConfirm();
  if (countEl) countEl.textContent = `${n} selected`;
  if (confirmBtn) confirmBtn.disabled = n === 0;
}

function closeGarmentPicker(confirm = false) {
  if (confirm) {
    State.selectedGarments = State.vaultAssets.filter(a => State.pickerSelection.has(a.id));
    renderGarmentStrip();
    window._syncSendButton();
  }
  State.pickerSelection = new Set();
  const overlay = DOM.pickerOverlay();
  if (overlay) { overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
}

/* ── TOOLS DROPDOWN ──────────────────────────────────────── */
function initToolsDropdown() {
  const toolsBtn   = DOM.vaultToolsBtn();
  const dropdown   = DOM.toolsDropdown();
  const selectBtn  = DOM.selectGarmentsBtn();
  if (!toolsBtn || !dropdown) return;

  toolsBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('is-open');
    dropdown.setAttribute('aria-hidden', String(!isOpen));
    toolsBtn.setAttribute('aria-expanded', String(isOpen));
    toolsBtn.classList.toggle('composer__action-btn--active', isOpen);
  });

  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target) && e.target !== toolsBtn) {
      dropdown.classList.remove('is-open');
      dropdown.setAttribute('aria-hidden', 'true');
      toolsBtn.setAttribute('aria-expanded', 'false');
      toolsBtn.classList.remove('composer__action-btn--active');
    }
  });

  selectBtn?.addEventListener('click', () => {
    dropdown.classList.remove('is-open');
    dropdown.setAttribute('aria-hidden', 'true');
    toolsBtn.setAttribute('aria-expanded', 'false');
    toolsBtn.classList.remove('composer__action-btn--active');
    openGarmentPicker();
  });

  DOM.garmentStripClear()?.addEventListener('click', () => {
    State.selectedGarments = [];
    renderGarmentStrip();
    window._syncSendButton();
  });

  DOM.pickerClose()?.addEventListener('click', () => closeGarmentPicker(false));
  DOM.pickerConfirm()?.addEventListener('click', () => closeGarmentPicker(true));
  DOM.pickerOverlay()?.addEventListener('click', e => { if (e.target === DOM.pickerOverlay()) closeGarmentPicker(false); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && DOM.pickerOverlay()?.classList.contains('is-open')) closeGarmentPicker(false);
  });
}

/* ── VAULT ASSET LOADER ──────────────────────────────────── */
async function loadVaultAssets() {
  try {
    const SUPABASE_URL = 'https://qigkcngxqizwobvmtdea.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZ2tjbmd4cWl6d29idm10ZGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDI5OTYsImV4cCI6MjA5NjAxODk5Nn0.EMO_p7d9zvJb8lYcnnAllG5tkrkl8SkXm5HKM3i5IOg';
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await client.from('clothes').select('*').order('id', { ascending: false });
    if (error) throw error;
    State.vaultAssets = data || [];
  } catch (err) {
    console.warn('Could not load vault assets for picker:', err.message);
    State.vaultAssets = [];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initGrainTexture(); initSidebar(); initComposer(); initFileUpload();
  initToolsDropdown();
  DOM.promptChips().forEach(chip => chip.addEventListener('click', () => { DOM.messageInput().value = chip.dataset.prompt; DOM.messageInput().dispatchEvent(new Event('input')); DOM.messageInput().focus(); }));
  fetchSessions();
  // Load vault garments for the picker (non-blocking)
  if (window.supabase) loadVaultAssets();
});