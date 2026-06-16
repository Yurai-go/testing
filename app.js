'use strict';

/* ═══════════════════════════════════════════════════════
   FABCARE — APP.JS
   Wardrobe Asset Vault — State & DOM Engine
═══════════════════════════════════════════════════════ */

/* ─── MOCK DATA ────────────────────────────────────────── */

const INITIAL_ASSETS = [
  {
    id: 'FAB-001', brand: 'Loro Piana', name: 'Cashmere Field Jacket',
    type: 'jacket', color: 'Vicuña Brown', fabric: '100% Cashmere',
    acquired: '2023-09-14',
    img: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80',
    texture: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80',
  },
  {
    id: 'FAB-002', brand: 'Brioni', name: 'Wool Silk Blazer',
    type: 'blazer', color: 'Charcoal Grey', fabric: '70% Wool, 30% Silk',
    acquired: '2022-11-03',
    img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80',
    texture: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=200&q=80',
  },
  {
    id: 'FAB-003', brand: 'Kiton', name: 'Neapolitan Sport Shirt',
    type: 'shirt', color: 'Ivory White', fabric: '100% Sea Island Cotton',
    acquired: '2024-01-22',
    img: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80',
    texture: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=200&q=80',
  },
  {
    id: 'FAB-004', brand: 'Tom Ford', name: 'Slim Wool Trousers',
    type: 'trousers', color: 'Midnight Navy', fabric: '95% Wool, 5% Elastane',
    acquired: '2023-06-07',
    img: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80',
    texture: 'https://images.unsplash.com/photo-1579298245158-33e8f568f7d3?w=200&q=80',
  },
  {
    id: 'FAB-005', brand: 'John Lobb', name: 'St. James II Oxford',
    type: 'shoes', color: 'Dark Chestnut', fabric: 'Calf Leather',
    acquired: '2022-04-18',
    img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
    texture: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&q=80',
  },
  {
    id: 'FAB-006', brand: 'Hermès', name: 'Cashmere Silk Scarf',
    type: 'accessory', color: 'Burnt Orange', fabric: '70% Cashmere, 30% Silk',
    acquired: '2024-03-10',
    img: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=600&q=80',
    texture: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&q=80',
  },
];

/* ─── TREATMENT METADATA ───────────────────────────────── */

const TREAT_META = {
  wash:  { icon: '🫧', label: 'Wash',  heading: 'Schedule a Wash',     sub: 'The following garments will be queued for professional cleaning.' },
  dry:   { icon: '☀️', label: 'Dry',   heading: 'Schedule Drying',     sub: 'The following garments will be prepared for carefully controlled drying.' },
  store: { icon: '📦', label: 'Store', heading: 'Archive to Storage',  sub: 'The following garments will be moved to long-term preservation storage.' },
};

/* ─── STATE ────────────────────────────────────────────── */

const state = {
  assets:          [...INITIAL_ASSETS],
  filtered:        [...INITIAL_ASSETS],
  activeAssetId:   null,
  isEditing:       false,
  editingAssetId:  null,
  searchQuery:     '',
  filterType:      '',
  filterSort:      'recent',
  isTreatmentMode: false,
  treatmentType:   '',
  selectedAssets:  new Set(),
};

/* ─── DOM REFS ─────────────────────────────────────────── */

const $ = id => document.getElementById(id);

const D = {
  // Grid & Empty State
  grid:              $('asset-grid'),
  emptyState:        $('empty-state'),

  // Metrics
  metricStrip:       $('metric-strip'),
  metricTotal:       $('metric-total'),
  metricCats:        $('metric-cats'),
  metricLatest:      $('metric-latest'),

  // Header Controls
  searchInput:       $('search-input'),
  filterType:        $('filter-type'),
  filterSort:        $('filter-sort'),

  // Treatments
  btnTreatments:     $('btn-treatments'),
  dropdown:          $('treatments-dropdown'),
  treatBar:          $('treatment-bar'),
  treatBadgeLabel:   $('treat-badge-label'),
  treatCount:        $('treat-count'),
  btnCancelTreat:    $('btn-cancel-treat'),
  btnConfirmTreat:   $('btn-confirm-treat'),

  // Add / Edit Asset
  btnAddAsset:       $('btn-add-asset'),
  drawerOverlay:     $('drawer-overlay'),
  drawerClose:       $('drawer-close'),
  btnCancelDrawer:   $('btn-cancel-drawer'),
  drawerTitle:       $('drawer-title'),
  drawerSub:         $('drawer-sub'),
  ingestionForm:     $('ingestion-form'),
  submitLabel:       $('submit-label'),
  btnLoader:         $('btn-loader'),

  // Detail Modal
  modalOverlay:      $('modal-overlay'),
  modalClose:        $('modal-close'),
  modalImgMain:      $('modal-img-main'),
  modalImgTexture:   $('modal-img-texture'),
  modalBadge:        $('modal-badge'),
  modalBrand:        $('modal-brand'),
  modalTitle:        $('modal-title'),
  modalType:         $('modal-type'),
  modalColor:        $('modal-color'),
  modalFabric:       $('modal-fabric'),
  modalAcquired:     $('modal-acquired'),
  modalId:           $('modal-id'),
  btnEditAsset:      $('btn-edit-asset'),

  // Dropzones
  dzGarment:         $('dz-garment'),
  dzTexture:         $('dz-texture'),
  fileGarment:       $('file-garment'),
  fileTexture:       $('file-texture'),
  previewGarment:    $('preview-garment'),
  previewTexture:    $('preview-texture'),

  // Form Fields
  fBrand:            $('f-brand'),
  fType:             $('f-type'),
  fColor:            $('f-color'),
  fFabric:           $('f-fabric'),

  // Treatment Confirm Modal
  treatConfirmOverlay: $('treat-confirm-overlay'),
  treatConfirmIcon:    $('treat-confirm-icon'),
  treatConfirmHeading: $('treat-confirm-heading'),
  treatConfirmSub:     $('treat-confirm-sub'),
  treatConfirmItems:   $('treat-confirm-items'),
  treatConfirmCancel:  $('treat-confirm-cancel'),
  treatConfirmOk:      $('treat-confirm-ok'),
};

/* ─── UTILS ────────────────────────────────────────────── */

const cap     = str => str.charAt(0).toUpperCase() + str.slice(1);
const genId   = ()  => 'FAB-' + String(state.assets.length + 1).padStart(3, '0');
const fmtDate = iso => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

/* ─── METRICS ──────────────────────────────────────────── */

function updateMetrics() {
  D.metricTotal.textContent  = state.assets.length;
  D.metricCats.textContent   = new Set(state.assets.map(a => a.type)).size;
  if (state.assets.length) {
    const latest = state.assets.reduce((a, b) => a.acquired > b.acquired ? a : b);
    D.metricLatest.textContent = fmtDate(latest.acquired);
  } else {
    D.metricLatest.textContent = '—';
  }
}

/* ─── FILTER & SORT ────────────────────────────────────── */

function applyFilters() {
  let r = [...state.assets];

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    r = r.filter(a => [a.brand, a.name, a.type, a.color, a.fabric].some(v => v.toLowerCase().includes(q)));
  }

  if (state.filterType) r = r.filter(a => a.type === state.filterType);

  if (state.filterSort === 'name') r.sort((a, b) => a.name.localeCompare(b.name));
  else r.sort((a, b) => b.id.localeCompare(a.id));

  state.filtered = r;
  renderGrid();
}

/* ─── RENDER ───────────────────────────────────────────── */

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
  card.style.animationDelay = `${index * 55}ms`;
  card.dataset.id = asset.id;
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${asset.brand} ${asset.name}`);

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
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(asset.id, card); }
  });

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

/* ─── TREATMENT MODE ───────────────────────────────────── */

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

/* ─── TREATMENT CONFIRM MODAL ──────────────────────────── */

function openTreatConfirm() {
  const meta     = TREAT_META[state.treatmentType];
  const selected = state.assets.filter(a => state.selectedAssets.has(a.id));

  D.treatConfirmIcon.textContent    = meta.icon;
  D.treatConfirmHeading.textContent = meta.heading;
  D.treatConfirmSub.textContent     = meta.sub;
  D.treatConfirmItems.innerHTML     = selected
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

/* ─── DETAIL MODAL ─────────────────────────────────────── */

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
  D.modalAcquired.textContent = fmtDate(a.acquired);
  D.modalId.textContent     = a.id;

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

/* ─── INGESTION DRAWER ─────────────────────────────────── */

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
    D.drawerSub.textContent     = `Updating asset ${a.id}`;
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
}

/* ─── DROPZONES ────────────────────────────────────────── */

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

function loadPreview(file, dz, preview) {
  const r = new FileReader();
  r.onload = e => { preview.src = e.target.result; dz.classList.add('has-image'); };
  r.readAsDataURL(file);
}

/* ─── FORM SUBMISSION ──────────────────────────────────── */

function handleFormSubmit(e) {
  e.preventDefault();

  const brand  = D.fBrand.value.trim();
  const type   = D.fType.value;
  const color  = D.fColor.value.trim();
  const fabric = D.fFabric.value.trim();

  if (!brand || !type || !color || !fabric) {
    [D.fBrand, D.fType, D.fColor, D.fFabric].forEach(f => {
      if (!f.value.trim()) {
        f.style.borderColor = 'var(--danger)';
        f.addEventListener('input', () => { f.style.borderColor = ''; }, { once: true });
      }
    });
    return;
  }

  D.submitLabel.style.display = 'none';
  D.btnLoader.style.display   = 'block';

  setTimeout(() => {
    if (state.isEditing) {
      const i = state.assets.findIndex(a => a.id === state.editingAssetId);
      if (i > -1) state.assets[i] = {
        ...state.assets[i], brand,
        name: `${brand} ${cap(type)}`,
        type, color, fabric,
        img:     D.previewGarment.src || null,
        texture: D.previewTexture.src || null,
      };
    } else {
      state.assets.unshift({
        id:       genId(),
        brand,
        name:     `${brand} ${cap(type)}`,
        type, color, fabric,
        acquired: new Date().toISOString().split('T')[0],
        img:      D.previewGarment.src || null,
        texture:  D.previewTexture.src || null,
      });
    }
    applyFilters();
    updateMetrics();
    closeDrawer();
  }, 900);
}

/* ─── EVENT BINDINGS ───────────────────────────────────── */

function bindEvents() {
  // Add / Edit asset
  D.btnAddAsset.addEventListener('click', () => openDrawer(false));
  D.btnEditAsset.addEventListener('click', () => openDrawer(true));
  D.drawerClose.addEventListener('click', closeDrawer);
  D.btnCancelDrawer.addEventListener('click', closeDrawer);
  D.drawerOverlay.addEventListener('click', e => { if (e.target === D.drawerOverlay) closeDrawer(); });

  // Detail modal
  D.modalClose.addEventListener('click', closeModal);
  D.modalOverlay.addEventListener('click', e => { if (e.target === D.modalOverlay) closeModal(); });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (D.treatConfirmOverlay.classList.contains('open')) closeTreatConfirm();
    else if (D.modalOverlay.classList.contains('open'))   closeModal();
    else if (D.drawerOverlay.classList.contains('open'))  closeDrawer();
    else if (state.isTreatmentMode)                       endTreatmentMode();
  });

  // Treatments dropdown
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

  // Treatment action bar
  D.btnCancelTreat.addEventListener('click', endTreatmentMode);
  D.btnConfirmTreat.addEventListener('click', () => {
    if (state.selectedAssets.size === 0) return;
    openTreatConfirm();
  });

  // Treatment confirm modal
  D.treatConfirmCancel.addEventListener('click', closeTreatConfirm);
  D.treatConfirmOk.addEventListener('click', () => { closeTreatConfirm(); endTreatmentMode(); });

  // Filters
  D.searchInput.addEventListener('input',  e => { state.searchQuery = e.target.value; applyFilters(); });
  D.filterType.addEventListener('change',  e => { state.filterType  = e.target.value; applyFilters(); });
  D.filterSort.addEventListener('change',  e => { state.filterSort  = e.target.value; applyFilters(); });

  // Form submit
  D.ingestionForm.addEventListener('submit', handleFormSubmit);

  // Dropzones
  initDZ(D.dzGarment, D.fileGarment, D.previewGarment);
  initDZ(D.dzTexture,  D.fileTexture,  D.previewTexture);
}

/* ─── INIT ─────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  applyFilters();
  updateMetrics();
  bindEvents();
});