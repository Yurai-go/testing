/**
 * FABCARE — SPLIT-VIEW ENGINE
 * split-view.js  ·  Full in-panel conversation (no redirect required)
 *
 * Features:
 *  - Real scrollable message feed with user + assistant bubbles
 *  - Image thumbnails in user messages
 *  - Typing indicator while waiting for first token
 *  - Decoupled cinematic streaming render loop
 *  - Full session persistence via /api/chat + /api/sessions
 *  - New conversation reset
 *  - Panel collapse / expand toggle (keyboard + button)
 *  - Drag-and-drop image upload scoped to the chat panel
 *  - Prompt chips on welcome state
 */

'use strict';

/* ═══════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════ */
const SV = {
  sessionId:        null,
  messages:         [],      // { id, role, content, images? }
  pendingFiles:     [],      // File[]
  isStreaming:      false,
  charCount:        0,
  selectedGarments: [],      // { id, brand, name, type, color, fabric } — vault items chosen via picker
  pickerSelection:  new Set(), // transient set while picker modal is open
};

/* ═══════════════════════════════════════════════════════
   DOM REFS
═══════════════════════════════════════════════════════ */
const SVD = {
  viewport:         () => document.getElementById('app-split-viewport'),
  toggleBtn:        () => document.getElementById('split-toggle-btn'),
  panel:            () => document.getElementById('split-panel-chat'),
  statusDot:        () => document.querySelector('.sv-status-dot'),
  statusLabel:      () => document.querySelector('.sv-brand-status span:last-child'),

  // Feed
  feed:             () => document.getElementById('sv-feed'),
  welcome:          () => document.getElementById('sv-welcome'),
  messages:         () => document.getElementById('sv-messages'),

  // Prompt chips
  promptChips:      () => document.querySelectorAll('.sv-chip'),

  // Composer
  messageInput:     () => document.getElementById('sv-message-input'),
  sendBtn:          () => document.getElementById('sv-send-btn'),
  charCount:        () => document.getElementById('sv-char-count'),
  fileInput:        () => document.getElementById('sv-file-input'),
  newChatBtn:       () => document.getElementById('sv-new-chat-btn'),

  // Image queue
  imageQueue:       () => document.getElementById('sv-image-queue'),
  imageQueueScroll: () => document.getElementById('sv-image-queue-scroll'),

  // Dropzone overlay
  dropzoneOverlay:  () => document.getElementById('sv-dropzone-overlay'),

  // Tools dropdown
  toolsBtn:         () => document.getElementById('sv-tools-btn'),
  toolsDropdown:    () => document.getElementById('sv-tools-dropdown'),
  selectGarmentsBtn:() => document.getElementById('sv-select-garments-btn'),

  // Garment context strip
  garmentStrip:     () => document.getElementById('sv-garment-strip'),
  garmentStripInner:() => document.getElementById('sv-garment-strip-inner'),
  garmentStripClear:() => document.getElementById('sv-garment-strip-clear'),

  // Garment picker overlay
  pickerOverlay:    () => document.getElementById('sv-picker-overlay'),
  pickerGrid:       () => document.getElementById('sv-picker-grid'),
  pickerCount:      () => document.getElementById('sv-picker-count'),
  pickerConfirm:    () => document.getElementById('sv-picker-confirm'),
  pickerClose:      () => document.getElementById('sv-picker-close'),
};

/* ═══════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════ */
function svEscape(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

function svParseMarkdown(t) {
  if (!t) return '';
  let h = svEscape(t);
  h = h
    .replace(/```([^`]*?)```/gs, (_, c) => `<pre><code>${c.trim()}</code></pre>`)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');
  h = h
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>');
  // Images must be processed before links (![alt](url) is a subset of [text](url))
  h = h.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '<img class="md-inline-img" src="$2" alt="$1" loading="lazy"/>');
  // Clickable links — always open in new tab with safe rel
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a class="md-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  h = h
    .replace(/^[*\-] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, m => `<ul>${m}</ul>`);
  return h.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>');
}

function svSyncSend() {
  const input = SVD.messageInput();
  if (!input) return;
  // In the split-view panel, garments must be selected before sending
  const hasGarments = SV.selectedGarments.length > 0;
  const canSend = hasGarments && (input.value.trim().length > 0 || SV.pendingFiles.length > 0) && !SV.isStreaming;
  const btn = SVD.sendBtn();
  if (btn) btn.disabled = !canSend;
  // Update textarea placeholder to reflect gate state
  input.placeholder = hasGarments
    ? 'Ask about your selected garments…'
    : 'Select garments via Tools to begin…';
}

function svScrollToBottom() {
  const feed = SVD.feed();
  if (feed) requestAnimationFrame(() => feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' }));
}

function svSetStatus(state) {
  // state: 'ready' | 'thinking'
  const dot   = SVD.statusDot();
  const label = SVD.statusLabel();
  if (!dot || !label) return;
  if (state === 'thinking') {
    dot.classList.add('sv-status-dot--thinking');
    label.textContent = 'Thinking…';
  } else {
    dot.classList.remove('sv-status-dot--thinking');
    label.textContent = 'Ready for consultation';
  }
}

/* ═══════════════════════════════════════════════════════
   WELCOME STATE
═══════════════════════════════════════════════════════ */
function svShowWelcome() {
  const welcome = SVD.welcome();
  if (welcome) welcome.removeAttribute('hidden');
}

function svHideWelcome() {
  const welcome = SVD.welcome();
  if (welcome) welcome.setAttribute('hidden', '');
}

/* ═══════════════════════════════════════════════════════
   MESSAGE RENDERING
═══════════════════════════════════════════════════════ */
function svRenderMessage(msg) {
  const container = SVD.messages();
  if (!container) return null;

  const article = document.createElement('article');
  article.className = `sv-msg sv-msg--${msg.role}`;
  article.dataset.id = msg.id;

  if (msg.role === 'user') {
    const imagesHtml = (msg.images || [])
      .map(src => `<img class="sv-msg__img-thumb" src="${src}" loading="lazy" alt="Attached image" />`)
      .join('');
    article.innerHTML = `
      ${imagesHtml ? `<div class="sv-msg__images">${imagesHtml}</div>` : ''}
      <div class="sv-bubble">
        <div class="sv-msg__content">${svEscape(msg.content)}</div>
      </div>`;

  } else if (msg.role === 'assistant') {
    article.innerHTML = `
      <div class="sv-msg__header">
        <div class="sv-msg__avatar">◈</div>
        <span class="sv-msg__role">Velour Advisor</span>
      </div>
      <div class="sv-bubble">
        <div class="sv-msg__content" id="sv-content-${msg.id}">${svParseMarkdown(msg.content)}</div>
      </div>`;

  } else if (msg.role === 'loading') {
    article.innerHTML = `
      <div class="sv-msg__header">
        <div class="sv-msg__avatar">◈</div>
        <span class="sv-msg__role">Velour Advisor</span>
      </div>
      <div class="sv-bubble">
        <span class="sv-typing-dot"></span>
        <span class="sv-typing-dot"></span>
        <span class="sv-typing-dot"></span>
      </div>`;

  } else if (msg.role === 'error') {
    article.innerHTML = `<div class="sv-bubble">${svEscape(msg.content)}</div>`;
  }

  container.appendChild(article);
  svScrollToBottom();
  return article;
}

/* ═══════════════════════════════════════════════════════
   SEND & STREAM
═══════════════════════════════════════════════════════ */
async function svHandleSend() {
  const input = SVD.messageInput();
  const text  = input?.value.trim() || '';
  const files = [...SV.pendingFiles];

  if ((!text && files.length === 0) || SV.isStreaming) return;

  // Hide welcome, start streaming state
  svHideWelcome();
  SV.isStreaming = true;
  svSyncSend();
  svSetStatus('thinking');

  const sendBtn = SVD.sendBtn();
  if (sendBtn) sendBtn.classList.add('sv-sending');

  // Clear input
  if (input) {
    input.value = '';
    input.style.height = 'auto';
    input.dispatchEvent(new Event('input'));
  }
  SV.pendingFiles = [];
  svRenderImageQueue();

  // Render user message with image blob previews
  const imagePreviewUrls = files.map(f => URL.createObjectURL(f));
  const userMsgId = 'u_' + Date.now();
  const userMsg   = { id: userMsgId, role: 'user', content: text, images: imagePreviewUrls };
  SV.messages.push(userMsg);
  svRenderMessage(userMsg);

  // Append loading indicator
  const loadingId = 'load_' + Date.now();
  svRenderMessage({ id: loadingId, role: 'loading' });

  // Build FormData
  const formData = new FormData();
  if (text)          formData.append('text', text);
  if (SV.sessionId)  formData.append('session_id', SV.sessionId);
  files.forEach((f, i) => formData.append(`image_${i}`, f, f.name));
  formData.append(
    'history',
    JSON.stringify(
      SV.messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }))
    )
  );

  // Inject selected garment context so the backend system can surface it to the LLM
  if (SV.selectedGarments.length > 0) {
    const garmentContext = SV.selectedGarments
      .map((g, i) => `Garment ${i + 1}: ${g.brand} ${g.name} | Type: ${g.type} | Color: ${g.color} | Fabric: ${g.fabric}`)
      .join('\n');
    formData.append('garment_context', garmentContext);
  }

  // Cinematic render variables
  let accumulated = '';
  let displayed   = '';

  // Decoupled render loop — smooth eased drain of the buffer
  const renderLoop = () => {
    if (displayed.length < accumulated.length) {
      const take = Math.max(1, Math.ceil((accumulated.length - displayed.length) * 0.25));
      displayed += accumulated.slice(displayed.length, displayed.length + take);

      const el = document.querySelector(`#sv-content-${assistantId}`);
      if (el) {
        el.innerHTML = svParseMarkdown(displayed) + '<span class="sv-stream-cursor"></span>';
        svScrollToBottom();
      }
    }

    if (SV.isStreaming || displayed.length < accumulated.length) {
      requestAnimationFrame(renderLoop);
    } else {
      // Finalise — remove cursor, store content
      const el = document.querySelector(`#sv-content-${assistantId}`);
      if (el) el.innerHTML = svParseMarkdown(displayed);
      assistantMsg.content = displayed;
    }
  };

  let assistantId  = '';
  let assistantMsg = null;

  try {
    const response = await fetch('/api/chat', { method: 'POST', body: formData });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // Swap loading bubble → real assistant bubble
    document.querySelector(`[data-id="${loadingId}"]`)?.remove();
    assistantId  = 'a_' + Date.now();
    assistantMsg = { id: assistantId, role: 'assistant', content: '' };
    SV.messages.push(assistantMsg);
    svRenderMessage(assistantMsg);

    // Fire the render loop
    requestAnimationFrame(renderLoop);

    // Network ingestion loop
    const reader  = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value, { stream: true }).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.session_id && !SV.sessionId) {
            SV.sessionId = parsed.session_id;
          }
          accumulated += parsed.token || '';
        } catch (_) { /* skip malformed */ }
      }
    }

  } catch (err) {
    document.querySelector(`[data-id="${loadingId}"]`)?.remove();
    svRenderMessage({ id: 'err_' + Date.now(), role: 'error', content: `Advisory error: ${err.message}` });
  } finally {
    SV.isStreaming = false;
    if (sendBtn) sendBtn.classList.remove('sv-sending');
    svSyncSend();
    svSetStatus('ready');
    imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
  }
}

/* ═══════════════════════════════════════════════════════
   NEW CONVERSATION
═══════════════════════════════════════════════════════ */
function svResetConversation() {
  if (SV.isStreaming) return;

  SV.sessionId        = null;
  SV.messages         = [];
  SV.pendingFiles     = [];
  SV.isStreaming      = false;
  SV.selectedGarments = [];
  SV.pickerSelection  = new Set();

  const container = SVD.messages();
  if (container) container.innerHTML = '';

  svRenderGarmentStrip();
  svRenderImageQueue();
  svShowWelcome();
  svSetStatus('ready');
  svSyncSend();

  const input = SVD.messageInput();
  if (input) {
    input.value = '';
    input.style.height = 'auto';
    input.dispatchEvent(new Event('input'));
  }
}

/* ═══════════════════════════════════════════════════════
   IMAGE QUEUE
═══════════════════════════════════════════════════════ */
function svRenderImageQueue() {
  const queue  = SVD.imageQueue();
  const scroll = SVD.imageQueueScroll();
  if (!queue || !scroll) return;

  scroll.innerHTML = '';

  if (SV.pendingFiles.length === 0) {
    queue.setAttribute('hidden', '');
    return;
  }

  queue.removeAttribute('hidden');

  SV.pendingFiles.forEach((file, i) => {
    const url  = URL.createObjectURL(file);
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.setAttribute('role', 'listitem');
    item.innerHTML = `
      <img src="${url}" alt="Pending image ${i + 1}" />
      <button class="queue-item__remove" aria-label="Remove image">✕</button>`;
    item.querySelector('.queue-item__remove').addEventListener('click', () => {
      URL.revokeObjectURL(url);
      SV.pendingFiles.splice(i, 1);
      svRenderImageQueue();
      svSyncSend();
    });
    scroll.appendChild(item);
  });
}

/* ═══════════════════════════════════════════════════════
   FILE UPLOAD + DRAG & DROP
═══════════════════════════════════════════════════════ */
function initFileUpload() {
  const fileInput = SVD.fileInput();
  const panel     = SVD.panel();
  const overlay   = SVD.dropzoneOverlay();
  let dragCounter = 0;

  function addFiles(files) {
    const valid = Array.from(files)
      .filter(f => f.type.startsWith('image/') && f.size <= 20 * 1024 * 1024)
      .slice(0, 8 - SV.pendingFiles.length);
    SV.pendingFiles.push(...valid);
    svRenderImageQueue();
    svSyncSend();
  }

  fileInput?.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });

  panel?.addEventListener('dragenter', e => {
    e.preventDefault();
    if (++dragCounter === 1) overlay?.classList.add('is-active');
  });
  panel?.addEventListener('dragleave', e => {
    e.preventDefault();
    if (--dragCounter === 0) overlay?.classList.remove('is-active');
  });
  panel?.addEventListener('dragover', e => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });
  panel?.addEventListener('drop', e => {
    e.preventDefault();
    dragCounter = 0;
    overlay?.classList.remove('is-active');
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });
}

/* ═══════════════════════════════════════════════════════
   COMPOSER
═══════════════════════════════════════════════════════ */
function initComposer() {
  const input   = SVD.messageInput();
  const counter = SVD.charCount();
  if (!input) return;

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 130) + 'px';
    SV.charCount = input.value.length;
    if (counter) counter.textContent = `${SV.charCount} / 4000`;
    svSyncSend();
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!SVD.sendBtn()?.disabled) svHandleSend();
    }
  });

  SVD.sendBtn()?.addEventListener('click', svHandleSend);
}

/* ═══════════════════════════════════════════════════════
   PROMPT CHIPS
═══════════════════════════════════════════════════════ */
function initPromptChips() {
  SVD.promptChips().forEach(chip => {
    chip.addEventListener('click', () => {
      const input = SVD.messageInput();
      if (!input) return;
      input.value = chip.dataset.prompt || '';
      input.dispatchEvent(new Event('input'));
      input.focus();
    });
  });
}

/* ═══════════════════════════════════════════════════════
   PANEL TOGGLE
═══════════════════════════════════════════════════════ */
function initSplitToggle() {
  const btn = SVD.toggleBtn();
  if (!btn) return;

  btn.addEventListener('click', () => {
    const vp            = SVD.viewport();
    const panel         = SVD.panel();
    const isNowCollapsed = vp.classList.toggle('chat-collapsed');

    btn.setAttribute('aria-expanded', String(!isNowCollapsed));
    btn.setAttribute('aria-label',
      isNowCollapsed ? 'Show consultation panel' : 'Hide consultation panel');
    panel?.setAttribute('aria-hidden', String(isNowCollapsed));
  });
}

/* ═══════════════════════════════════════════════════════
   KEYBOARD BINDINGS
═══════════════════════════════════════════════════════ */
function initKeyboardBindings() {
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;

    // Let app.js handle its own modals first
    const anyModalOpen =
      document.querySelector('.modal-overlay.open') ||
      document.querySelector('.drawer-overlay.open') ||
      document.querySelector('.treat-confirm-overlay.open');
    if (anyModalOpen) return;

    const vp = SVD.viewport();
    if (!vp || vp.classList.contains('chat-collapsed')) return;

    vp.classList.add('chat-collapsed');
    const btn = SVD.toggleBtn();
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Show consultation panel');
    }
    SVD.panel()?.setAttribute('aria-hidden', 'true');
  });
}

/* ═══════════════════════════════════════════════════════
   GARMENT CONTEXT STRIP
═══════════════════════════════════════════════════════ */
function svRenderGarmentStrip() {
  const strip = SVD.garmentStrip();
  const inner = SVD.garmentStripInner();
  if (!strip || !inner) return;

  inner.innerHTML = '';

  if (SV.selectedGarments.length === 0) {
    strip.setAttribute('hidden', '');
    return;
  }

  strip.removeAttribute('hidden');

  SV.selectedGarments.forEach(g => {
    const pill = document.createElement('span');
    pill.className = 'sv-garment-pill';
    pill.textContent = `${g.brand} ${g.name}`;
    inner.appendChild(pill);
  });
}

/* ═══════════════════════════════════════════════════════
   GARMENT PICKER
═══════════════════════════════════════════════════════ */
function svOpenGarmentPicker() {
  // Clone current confirmed selection into transient picker state
  SV.pickerSelection = new Set(SV.selectedGarments.map(g => g.id));

  const grid = SVD.pickerGrid();
  if (!grid) return;
  grid.innerHTML = '';

  // Pull garments from the shared vault state (populated by database.js / config.js)
  const assets = (typeof state !== 'undefined' && state.assets) ? state.assets : [];

  if (assets.length === 0) {
    grid.innerHTML = '<p class="sv-picker-empty">No garments in your vault yet. Add one using "Add Asset".</p>';
  } else {
    assets.forEach(asset => {
      const card = document.createElement('div');
      card.className = 'sv-picker-card' + (SV.pickerSelection.has(asset.id) ? ' sv-picker-card--selected' : '');
      card.dataset.id = asset.id;
      card.setAttribute('role', 'checkbox');
      card.setAttribute('aria-checked', String(SV.pickerSelection.has(asset.id)));
      card.setAttribute('tabindex', '0');

      card.innerHTML = `
        ${asset.img ? `<img class="sv-picker-card__img" src="${asset.img}" alt="${svEscape(asset.brand)}" loading="lazy"/>` : `<div class="sv-picker-card__placeholder">${svEscape(asset.brand.charAt(0))}</div>`}
        <div class="sv-picker-card__body">
          <span class="sv-picker-card__brand">${svEscape(asset.brand)}</span>
          <span class="sv-picker-card__name">${svEscape(asset.name)}</span>
          <span class="sv-picker-card__meta">${svEscape(asset.fabric)}</span>
        </div>
        <div class="sv-picker-card__check" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>`;

      const toggle = () => {
        if (SV.pickerSelection.has(asset.id)) {
          SV.pickerSelection.delete(asset.id);
          card.classList.remove('sv-picker-card--selected');
          card.setAttribute('aria-checked', 'false');
        } else {
          SV.pickerSelection.add(asset.id);
          card.classList.add('sv-picker-card--selected');
          card.setAttribute('aria-checked', 'true');
        }
        svUpdatePickerCount();
      };

      card.addEventListener('click', toggle);
      card.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
      grid.appendChild(card);
    });
  }

  svUpdatePickerCount();

  const overlay = SVD.pickerOverlay();
  if (overlay) {
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

function svUpdatePickerCount() {
  const n = SV.pickerSelection.size;
  const countEl = SVD.pickerCount();
  const confirmBtn = SVD.pickerConfirm();
  if (countEl) countEl.textContent = `${n} selected`;
  if (confirmBtn) confirmBtn.disabled = n === 0;
}

function svCloseGarmentPicker(confirm = false) {
  if (confirm) {
    // Commit transient picker selection to confirmed state
    const assets = (typeof state !== 'undefined' && state.assets) ? state.assets : [];
    SV.selectedGarments = assets.filter(a => SV.pickerSelection.has(a.id));
    svRenderGarmentStrip();
    svSyncSend();
  }

  SV.pickerSelection = new Set();

  const overlay = SVD.pickerOverlay();
  if (overlay) {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

/* ═══════════════════════════════════════════════════════
   TOOLS DROPDOWN
═══════════════════════════════════════════════════════ */
function initToolsDropdown() {
  const toolsBtn  = SVD.toolsBtn();
  const dropdown  = SVD.toolsDropdown();
  const selectBtn = SVD.selectGarmentsBtn();

  if (!toolsBtn || !dropdown) return;

  toolsBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('is-open');
    dropdown.setAttribute('aria-hidden', String(!isOpen));
    toolsBtn.classList.toggle('sv-composer__action-btn--active', isOpen);
  });

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target) && e.target !== toolsBtn) {
      dropdown.classList.remove('is-open');
      dropdown.setAttribute('aria-hidden', 'true');
      toolsBtn.classList.remove('sv-composer__action-btn--active');
    }
  });

  selectBtn?.addEventListener('click', () => {
    dropdown.classList.remove('is-open');
    dropdown.setAttribute('aria-hidden', 'true');
    toolsBtn.classList.remove('sv-composer__action-btn--active');
    svOpenGarmentPicker();
  });

  // Garment strip clear button
  SVD.garmentStripClear()?.addEventListener('click', () => {
    SV.selectedGarments = [];
    svRenderGarmentStrip();
    svSyncSend();
  });

  // Picker close / confirm buttons
  SVD.pickerClose()?.addEventListener('click', () => svCloseGarmentPicker(false));
  SVD.pickerConfirm()?.addEventListener('click', () => svCloseGarmentPicker(true));

  // Close picker on overlay backdrop click
  SVD.pickerOverlay()?.addEventListener('click', e => {
    if (e.target === SVD.pickerOverlay()) svCloseGarmentPicker(false);
  });

  // Close picker on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && SVD.pickerOverlay()?.classList.contains('is-open')) {
      svCloseGarmentPicker(false);
    }
  });
}

/* ═══════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  if (!SVD.viewport() || !SVD.panel()) return;

  initSplitToggle();
  initComposer();
  initFileUpload();
  initPromptChips();
  initKeyboardBindings();
  initToolsDropdown();

  // New chat button
  SVD.newChatBtn()?.addEventListener('click', svResetConversation);

  // Initial ARIA state
  SVD.panel()?.setAttribute('aria-hidden', 'false');
  SVD.toggleBtn()?.setAttribute('aria-expanded', 'true');
  SVD.toggleBtn()?.setAttribute('aria-label', 'Hide consultation panel');

  // Initial sync so placeholder reflects gate state
  svSyncSend();
});