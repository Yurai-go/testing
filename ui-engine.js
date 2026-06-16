'use strict';

/* ═══════════════════════════════════════════════════════
   FABCARE — UI-ENGINE.JS
   Wardrobe Asset Vault — DOM Elements Layout Rendering & Handlers
═══════════════════════════════════════════════════════ */

/* ─── METRICS CALCULATION STRIP ────────────────────────── */
function updateMetrics() {
  D.metricTotal.textContent  = state.assets.length;
  D.metricCats.textContent   = new Set(state.assets.map(a => a.type)).size;
  if (state.assets.length) {
    D.metricLatest.textContent = fmtDate(state.assets[0].created_at);
  } else {
    D.metricLatest.textContent = '—';
  }
}

/* ─── FILTER & CLIENT-SIDE SORT ROUTING ────────────────── */
function applyFilters() {
  let r = [...state.assets];

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    r = r.filter(a => [a.brand, a.name, a.type, a.color, a.fabric].some(v => v && v.toLowerCase().includes(q)));
  }

  if (state.filterType) r = r.filter(a => a.type === state.filterType);

  if (state.filterSort === 'name') r.sort((a, b) => a.name.localeCompare(b.name));
  else r.sort((a, b) => b.id - a.id);

  state.filtered = r;
  renderGrid();
}

/* ─── INTERFACE GRID RENDER ────────────────────────────── */
function renderGrid() {
  D.grid.innerHTML = '';
  if (!state.filtered.length) { D.emptyState.classList.add('visible'); return; }
  D.emptyState.classList.remove('visible');
  state.filtered.forEach((a, i) => D.grid.appendChild(createCard(a, i)));
}

function createCard(asset, index) {
  const card = document.createElement('article');
  card.className = 'asset-card';
  if (state.isTreatmentMode && state.selectedAssets.has(asset.id)) card.classList.add('selected');
  card.style.animationDelay = `${index * 35}ms`;
  card.dataset.id = asset.id;
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');

  card.innerHTML = `
    <div class="card-image-wrap">
      ${asset.img
        ? `<img class="card-image" src="${asset.img}" alt="${asset.brand} ${asset.name}" loading="lazy" />`
        : `<div class="card-image-placeholder">${asset.brand.charAt(0)}</div>`
      }
      <span class="card-type-badge">${cap(asset.type)}</span>
    </div>
    <div class="card-body">
      <p class="card-brand">${asset.brand}</p>
      <h3 class="card-name">${asset.name}</h3>
      <span class="card-fabric">${asset.fabric}</span>
    </div>`;

  card.addEventListener('click', () => handleCardClick(asset.id, card));
  return card;
}

function handleCardClick(id, cardEl) {
  if (state.isTreatmentMode) {
    if (state.selectedAssets.has(id)) { state.selectedAssets.delete(id); cardEl.classList.remove('selected'); }
    else                              { state.selectedAssets.add(id);    cardEl.classList.add('selected'); }
    updateTreatBar();
  } else {
    openModal(id);
  }
}

/* ─── TREATMENT MODE PROCESS ───────────────────────────── */
function startTreatmentMode(type) {
  state.isTreatmentMode = true;
  state.treatmentType   = type;
  state.selectedAssets.clear();

  const meta = TREAT_META[type];
  D.treatBadgeLabel.textContent  = meta.label;
  D.btnTreatments.classList.add('active');
  D.treatBar.classList.add('visible');
  D.metricStrip.style.opacity        = '0.3';
  D.metricStrip.style.pointerEvents  = 'none';

  updateTreatBar();
  renderGrid();
}

/* ─── TREATMENT INTERACTION LAYOUT ENDERS ──────────────── */
function endTreatmentMode() {
  state.isTreatmentMode = false;
  state.treatmentType   = '';
  state.selectedAssets.clear();

  D.btnTreatments.classList.remove('active');
  D.treatBar.classList.remove('visible');
  D.metricStrip.style.opacity       = '';
  D.metricStrip.style.pointerEvents = '';

  renderGrid();
}

function updateTreatBar() {
  const n = state.selectedAssets.size;
  D.treatCount.textContent = `${n} item${n !== 1 ? 's' : ''}`;
  D.btnConfirmTreat.classList.toggle('ready', n > 0);
}

function openTreatConfirm() {
  const meta = TREAT_META[state.treatmentType];
  const selectedGarments = state.assets.filter(a => state.selectedAssets.has(a.id));

  D.stageReview.classList.add('active');
  D.stageWizard.classList.remove('active');

  D.treatConfirmIcon.textContent    = meta.icon;
  D.treatConfirmHeading.textContent = meta.heading;
  D.treatConfirmSub.textContent     = meta.sub;
  D.treatConfirmItems.innerHTML     = selectedGarments
    .map(a => `<span class="treat-confirm-pill">${a.brand} ${a.name}</span>`)
    .join('');

  D.treatConfirmOverlay.classList.add('open');
  D.treatConfirmOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeTreatConfirm() {
  D.treatConfirmOverlay.classList.remove('open');
  D.treatConfirmOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ─── PROPERTIES INFO MODAL DISPLAY ────────────────────── */
function openModal(id) {
  const a = state.assets.find(x => x.id === id);
  if (!a) return;

  state.activeAssetId = id;
  D.modalImgMain.src        = a.img || '';
  D.modalImgMain.alt        = `${a.brand} ${a.name}`;
  D.modalImgTexture.src     = a.texture || '';
  D.modalBadge.textContent  = cap(a.type);
  D.modalBrand.textContent  = a.brand;
  D.modalTitle.textContent  = a.name;
  D.modalType.textContent   = cap(a.type);
  D.modalColor.textContent  = a.color;
  D.modalFabric.textContent = a.fabric;
  D.modalAcquired.textContent = fmtDate(a.created_at);
  D.modalId.textContent     = `FAB-${String(a.id).padStart(3, '0')}`;

  D.modalOverlay.classList.add('open');
  D.modalOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  D.modalOverlay.classList.remove('open');
  D.modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.activeAssetId = null;
}

/* ─── INGESTION PROFILE DRAWER OVERLAY ─────────────────── */
function openDrawer(edit = false) {
  if (edit) {
    const a = state.assets.find(x => x.id === state.activeAssetId);
    if (!a) return;

    state.isEditing      = true;
    state.editingAssetId = a.id;
    D.fBrand.value = a.brand;
    D.fType.value  = a.type;
    D.fColor.value = a.color;
    D.fFabric.value = a.fabric;

    if (a.img)     { D.previewGarment.src = a.img;     D.dzGarment.classList.add('has-image'); }
    if (a.texture) { D.previewTexture.src = a.texture; D.dzTexture.classList.add('has-image'); }

    D.drawerTitle.textContent   = 'Edit Asset';
    D.drawerSub.textContent     = `Updating asset FAB-${String(a.id).padStart(3, '0')}`;
    D.submitLabel.textContent   = 'Save Changes';
    closeModal();
  }

  D.drawerOverlay.classList.add('open');
  D.drawerOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  D.drawerOverlay.classList.remove('open');
  D.drawerOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  D.ingestionForm.reset();
  [D.dzGarment, D.dzTexture].forEach(dz => dz.classList.remove('has-image'));
  D.previewGarment.src = '';
  D.previewTexture.src = '';
  D.submitLabel.style.display = 'inline';
  D.submitLabel.textContent   = 'Secure to Vault';
  D.btnLoader.style.display   = 'none';
  D.drawerTitle.textContent   = 'Ingest New Asset';
  D.drawerSub.textContent     = 'Register a garment into the vault';

  state.isEditing      = false;
  state.editingAssetId = null;

  // Clear ML/AI state on drawer close
  if (D.fFabric) delete D.fFabric.dataset.userEdited;
  if (D.fBrand)  delete D.fBrand.dataset.userEdited;
  if (D.fType)   delete D.fType.dataset.userEdited;
  if (D.fColor)  delete D.fColor.dataset.userEdited;
  document.dispatchEvent(new CustomEvent('drawerClosed'));
}

/* ─── GARMENT AI — LLAMA 4 SCOUT VISION ANALYZER ────────── */
const GarmentAI = (() => {
  // Canonical type values the drawer field accepts
  const VALID_TYPES = new Set(['jacket','blazer','coat','shirt','t-shirt','trousers','jeans','shoes','belt','accessory']);

  // Client-side normalization map — mirrors the server-side map in main.py.
  // Catches any variant the backend didn't normalize before sending.
  const TYPE_NORMALIZE = {
    // jacket family
    windbreaker:'jacket', bomber:'jacket', varsity:'jacket',
    'denim jacket':'jacket', 'leather jacket':'jacket',
    'sport jacket':'jacket', 'sports jacket':'jacket',
    // blazer / coat family
    'suit jacket':'blazer', 'sport coat':'blazer', sportscoat:'blazer',
    overcoat:'coat', 'trench coat':'coat', trench:'coat',
    parka:'coat', raincoat:'coat', peacoat:'coat',
    // shirt / tee family
    polo:'shirt', 'polo shirt':'shirt', 'dress shirt':'shirt',
    'button-up':'shirt', 'button-down':'shirt', 'oxford shirt':'shirt',
    top:'shirt',
    tee:'t-shirt', 'tee shirt':'t-shirt', tshirt:'t-shirt',
    'graphic tee':'t-shirt', 'tank top':'t-shirt',
    // trousers / jeans family
    pants:'trousers', slacks:'trousers', chinos:'trousers',
    'dress pants':'trousers', 'dress trousers':'trousers',
    shorts:'trousers',
    denim:'jeans', 'denim pants':'jeans',
    // shoes family
    sneakers:'shoes', sneaker:'shoes', boots:'shoes',
    boot:'shoes', loafers:'shoes', loafer:'shoes',
    sandals:'shoes', sandal:'shoes', heels:'shoes',
    oxford:'shoes', oxfords:'shoes',
    // accessories
    scarf:'accessory', hat:'accessory', cap:'accessory',
    bag:'accessory', watch:'accessory', tie:'accessory',
    gloves:'accessory', sunglasses:'accessory',
    wallet:'accessory', purse:'accessory',
  };

  function _normalizeType(raw) {
    if (typeof raw !== 'string') return null;
    const cleaned = raw.trim().toLowerCase();
    if (VALID_TYPES.has(cleaned)) return cleaned;
    return TYPE_NORMALIZE[cleaned] || null;
  }

  async function analyze(file) {
    const formData = new FormData();
    formData.append('image', file, file.name);
    const response = await fetch('/api/analyze-garment', { method: 'POST', body: formData });
    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}`);
      err.httpStatus = response.status;
      throw err;
    }
    return await response.json();
  }

  function sanitize(result) {
    return {
      brand: (typeof result.brand === 'string' && result.brand.trim()) ? result.brand.trim() : null,
      type:  _normalizeType(result.type),
      color: (typeof result.color === 'string' && result.color.trim()) ? result.color.trim() : null,
    };
  }

  return { analyze, sanitize };
})();

/* ─── GARMENT AI HOOK ────────────────────────────────────── */
function initGarmentAIHook() {
  const dz      = D.dzGarment;
  const input   = D.fileGarment;
  const preview = D.previewGarment;

  const badge        = document.getElementById('ai-garment-badge');
  const badgeSpinner = document.getElementById('ai-garment-spinner');
  const badgeLabel   = document.getElementById('ai-garment-label');
  const alertEl      = document.getElementById('ai-garment-alert');

  // Fields to auto-fill
  const brandField = D.fBrand;
  const typeField  = D.fType;
  const colorField = D.fColor;

  function resetAI() {
    badge.hidden    = true;
    badge.className = 'ml-badge ai-badge';
    alertEl.hidden  = true;
  }

  function flashField(field) {
    field.style.borderColor = 'rgba(61,190,122,0.65)';
    field.style.boxShadow   = '0 0 0 3px rgba(61,190,122,0.12)';
    setTimeout(() => { field.style.borderColor = ''; field.style.boxShadow = ''; }, 1400);
  }

  async function runAnalysis(file) {
    // Show scanning state
    badge.hidden = false;
    badge.className = 'ml-badge ai-badge ml-badge--scanning';
    badgeSpinner.hidden = false;
    badgeLabel.textContent = 'Analyzing garment…';
    alertEl.hidden = true;

    try {
      const raw    = await GarmentAI.analyze(file);
      const result = GarmentAI.sanitize(raw);

      badgeSpinner.hidden = true;

      // If AI flagged the image as unrecognized, show alert and stop
      if (raw.unrecognized === true) {
        badge.hidden   = true;
        alertEl.hidden = false;
        return;
      }

      const filled = [];

      if (result.brand && !brandField.dataset.userEdited) {
        brandField.value = result.brand;
        flashField(brandField);
        filled.push('brand');
      }
      if (result.type && !typeField.dataset.userEdited) {
        typeField.value = result.type;
        flashField(typeField);
        filled.push('type');
      }
      if (result.color && !colorField.dataset.userEdited) {
        colorField.value = result.color;
        flashField(colorField);
        filled.push('color');
      }

      if (filled.length > 0) {
        badge.className = 'ml-badge ai-badge ml-badge--done';
        badgeLabel.textContent = `✓ Auto-filled ${filled.join(', ')}`;
        // Auto-hide success badge after 4s
        setTimeout(() => { badge.hidden = true; }, 4000);
      } else {
        badge.className = 'ml-badge ai-badge ml-badge--scanning';
        badgeLabel.textContent = 'Fields already filled';
        setTimeout(() => { badge.hidden = true; }, 2500);
      }

    } catch (err) {
      console.error('[GarmentAI] Analysis failed:', err);
      badgeSpinner.hidden = true;

      // Server/network error — NOT a garment recognition failure.
      // Show a specific error badge so the user knows it's a backend issue,
      // not that their photo is bad.
      const isServerError = err.httpStatus && err.httpStatus >= 500;
      const isAuthError   = err.httpStatus === 403 || err.httpStatus === 401;

      if (isAuthError) {
        badge.hidden        = false;
        badge.className     = 'ml-badge ai-badge ml-badge--error';
        badgeLabel.textContent = '⚠ API key error — contact admin';
        setTimeout(() => { badge.hidden = true; }, 6000);
      } else if (isServerError) {
        badge.hidden        = false;
        badge.className     = 'ml-badge ai-badge ml-badge--error';
        badgeLabel.textContent = '⚠ Analysis unavailable — fill manually';
        setTimeout(() => { badge.hidden = true; }, 5000);
      } else {
        // Genuine network failure or unexpected error
        badge.hidden        = false;
        badge.className     = 'ml-badge ai-badge ml-badge--error';
        badgeLabel.textContent = '⚠ Could not reach server';
        setTimeout(() => { badge.hidden = true; }, 5000);
      }
      // Never show the "photo not recognized" alert for server errors
      alertEl.hidden = true;
    }
  }

  // Track manual edits per field — AI won't overwrite user input
  [
    [brandField, 'userEdited'],
    [typeField,  'userEdited'],
    [colorField, 'userEdited'],
  ].forEach(([field]) => {
    if (!field) return;
    field.addEventListener('input', () => {
      field.dataset.userEdited = field.value.length > 0 ? '1' : '';
    });
    field.addEventListener('change', () => {
      field.dataset.userEdited = field.value.length > 0 ? '1' : '';
    });
  });

  // Wire garment DZ file events
  const _onFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    resetAI();
    // loadPreview handles the visual, then we fire AI
    loadPreview(file, dz, preview, () => runAnalysis(file));
  };

  input.addEventListener('change', e => { if (e.target.files[0]) _onFile(e.target.files[0]); });
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    _onFile(e.dataTransfer?.files?.[0]);
  });

  // Reset AI badge and alert when drawer closes
  document.addEventListener('drawerClosed', () => {
    resetAI();
    // Clear userEdited flags for all three fields
    [brandField, typeField, colorField].forEach(f => { if (f) delete f.dataset.userEdited; });
  });
}

/* ─── FABRIC ML — TEACHABLE MACHINE CLASSIFIER ──────────── */
const FabricML = (() => {
  const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/BwlegFtsa/';
  let model = null;
  let loading = false;

  async function load() {
    if (model) return model;
    if (loading) {
      // Wait until the in-flight load resolves
      await new Promise(resolve => {
        const check = setInterval(() => { if (model || !loading) { clearInterval(check); resolve(); } }, 100);
      });
      return model;
    }
    loading = true;
    try {
      model = await window.tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');
    } catch (err) {
      console.error('[FabricML] Model load failed:', err);
      model = null;
    }
    loading = false;
    return model;
  }

  async function classify(imgElement) {
    const m = await load();
    if (!m) return null;
    try {
      const predictions = await m.predict(imgElement);
      // Return the class with highest probability
      return predictions.reduce((best, p) => p.probability > best.probability ? p : best, predictions[0]);
    } catch (err) {
      console.error('[FabricML] Inference failed:', err);
      return null;
    }
  }

  return { classify };
})();

/* ─── INTERACTION IMAGE DROPZONES ──────────────────────── */
function initDZ(dz, input, preview) {
  dz.addEventListener('click', () => input.click());

  input.addEventListener('change', e => {
    if (e.target.files[0]) loadPreview(e.target.files[0], dz, preview);
  });

  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) loadPreview(f, dz, preview);
  });
}

function loadPreview(file, dz, preview, onLoaded) {
  const r = new FileReader();
  r.onload = e => {
    preview.src = e.target.result;
    dz.classList.add('has-image');
    if (typeof onLoaded === 'function') onLoaded(preview);
  };
  r.readAsDataURL(file);
}

/* ─── FABRIC ML TEXTURE INFERENCE HOOK ─────────────────── */
function initTextureMLHook() {
  const dz      = D.dzTexture;
  const input   = D.fileTexture;
  const preview = D.previewTexture;

  const badge        = document.getElementById('ml-badge');
  const badgeSpinner = document.getElementById('ml-badge-spinner');
  const badgeLabel   = document.getElementById('ml-badge-label');
  const unknownAlert = document.getElementById('ml-unknown-alert');
  const fabricField  = D.fFabric;

  function resetML() {
    badge.hidden        = true;
    badge.className     = 'ml-badge';
    unknownAlert.hidden = true;
  }

  async function runInference(imgEl) {
    // Show scanning state
    badge.hidden = false;
    badge.className = 'ml-badge ml-badge--scanning';
    badgeSpinner.hidden = false;
    badgeLabel.textContent = 'Scanning fabric…';
    unknownAlert.hidden = true;

    const result = await FabricML.classify(imgEl);

    badgeSpinner.hidden = true;

    if (!result) {
      badge.hidden = true;
      return;
    }

    const className    = result.className;   // 'Cotton' | 'Polyester' | 'Unknown'
    const confidence   = Math.round(result.probability * 100);

    if (className === 'Unknown') {
      badge.className     = 'ml-badge ml-badge--unknown';
      badgeLabel.textContent = `Unknown (${confidence}%)`;
      unknownAlert.hidden = false;
      // Clear the fabric field so user fills it manually
      if (fabricField && !fabricField.dataset.userEdited) fabricField.value = '';
    } else {
      badge.className     = 'ml-badge';
      badgeLabel.textContent = `${className} · ${confidence}%`;
      unknownAlert.hidden = true;
      // Auto-fill fabric field only if user hasn't manually typed in it
      if (fabricField && !fabricField.dataset.userEdited) {
        fabricField.value = `100% ${className}`;
        // Flash the field to signal auto-fill
        fabricField.style.borderColor = 'rgba(201,169,110,0.6)';
        fabricField.style.boxShadow   = '0 0 0 3px rgba(201,169,110,0.12)';
        setTimeout(() => { fabricField.style.borderColor = ''; fabricField.style.boxShadow = ''; }, 1400);
      }
    }
  }

  // Track manual edits so ML doesn't stomp user input
  if (fabricField) {
    fabricField.addEventListener('input', () => {
      fabricField.dataset.userEdited = fabricField.value.length > 0 ? '1' : '';
    });
  }

  // Re-wire texture DZ to trigger ML on every new upload
  dz.removeEventListener('click', () => input.click()); // DOM ref still valid via initDZ

  const _onFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    resetML();
    loadPreview(file, dz, preview, (imgEl) => runInference(imgEl));
  };

  input.addEventListener('change', e => { if (e.target.files[0]) _onFile(e.target.files[0]); });
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    _onFile(e.dataTransfer.files[0]);
  });

  // Also reset ML badge when the drawer is closed/reset
  const origCloseDrawer = window._origCloseDrawer;
  document.addEventListener('drawerClosed', resetML);
}

/* ─── GLOBAL EVENT ROUTING CONTROL BINDINGS ────────────── */
function bindEvents() {
  D.btnAddAsset.addEventListener('click', () => openDrawer(false));
  D.btnEditAsset.addEventListener('click', () => openDrawer(true));
  D.drawerClose.addEventListener('click', closeDrawer);
  D.btnCancelDrawer.addEventListener('click', closeDrawer);
  D.drawerOverlay.addEventListener('click', e => { if (e.target === D.drawerOverlay) closeDrawer(); });

  D.modalClose.addEventListener('click', closeModal);
  D.modalOverlay.addEventListener('click', e => { if (e.target === D.modalOverlay) closeModal(); });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (D.treatConfirmOverlay.classList.contains('open')) closeTreatConfirm();
    else if (D.modalOverlay.classList.contains('open'))   closeModal();
    else if (D.drawerOverlay.classList.contains('open'))  closeDrawer();
    else if (state.isTreatmentMode)                       endTreatmentMode();
  });

  D.btnTreatments.addEventListener('click', e => {
    if (state.isTreatmentMode) { endTreatmentMode(); return; }
    e.stopPropagation();
    D.dropdown.classList.toggle('open', !D.dropdown.classList.contains('open'));
  });
  document.addEventListener('click', () => D.dropdown.classList.remove('open'));

  D.dropdown.querySelectorAll('.treat-option').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      D.dropdown.classList.remove('open');
      startTreatmentMode(btn.dataset.treat);
    });
  });

  D.btnCancelTreat.addEventListener('click', endTreatmentMode);
  D.btnConfirmTreat.addEventListener('click', () => {
    if (state.selectedAssets.size === 0) return;
    openTreatConfirm();
  });

  D.treatConfirmCancel.addEventListener('click', closeTreatConfirm);
  D.treatConfirmOk.addEventListener('click', startWizardPresentation);

  // Wizard close (X) button — exits wizard and ends treatment mode entirely
  const wizardCloseBtn = document.getElementById('wizard-close-btn');
  if (wizardCloseBtn) {
    wizardCloseBtn.addEventListener('click', () => {
      closeTreatConfirm();
      endTreatmentMode();
    });
  }

  D.btnWizardNext.addEventListener('click', handleWizardNext);
  D.btnWizardPrev.addEventListener('click', handleWizardPrev);

  D.searchInput.addEventListener('input',  e => { state.searchQuery = e.target.value; applyFilters(); });
  D.filterType.addEventListener('change',  e => { state.filterType  = e.target.value; applyFilters(); });
  D.filterSort.addEventListener('change',  e => { state.filterSort  = e.target.value; applyFilters(); });

  D.ingestionForm.addEventListener('submit', handleFormSubmit);

  initDZ(D.dzGarment, D.fileGarment, D.previewGarment);
  initDZ(D.dzTexture,  D.fileTexture,  D.previewTexture);
  initGarmentAIHook();
  initTextureMLHook();
}

/* ─── INITIALIZATION STARTUP ENGINE ────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  fetchFromSupabase();
});