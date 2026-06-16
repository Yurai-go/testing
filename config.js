'use strict';

/* ═══════════════════════════════════════════════════════
   FABCARE — CONFIG.JS
   Wardrobe Asset Vault — Environment Configuration, State & DOM Cache
═══════════════════════════════════════════════════════ */

// ─── SUPABASE CLOUD CONNECTOR CONFIGURATION ───
const SUPABASE_URL = "https://qigkcngxqizwobvmtdea.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZ2tjbmd4cWl6d29idm10ZGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDI5OTYsImV4cCI6MjA5NjAxODk5Nn0.EMO_p7d9zvJb8lYcnnAllG5tkrkl8SkXm5HKM3i5IOg";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define D globally so other files can see it, initialized as an empty object
let D = {};

// Single helper function declaration
const $ = id => document.getElementById(id);

// Wait until HTML parses completely before caching elements
document.addEventListener('DOMContentLoaded', () => {
  D = {
    wizardSlideTrack: $('wizard-slide-track'),
    grid:              $('asset-grid'), // Changed to match your main configuration
    emptyState:        $('empty-state'),
    metricStrip:       $('metric-strip'),
    metricTotal:       $('metric-total'),
    metricCats:        $('metric-cats'),
    metricLatest:      $('metric-latest'),
    searchInput:       $('search-input'),
    filterType:        $('filter-type'),
    filterSort:        $('filter-sort'),
    btnTreatments:     $('btn-treatments'),
    dropdown:          $('treatments-dropdown'),
    treatBar:          $('treatment-bar'),
    treatBadgeLabel:   $('treat-badge-label'),
    treatCount:        $('treat-count'),
    btnCancelTreat:    $('btn-cancel-treat'),
    btnConfirmTreat:   $('btn-confirm-treat'),
    btnAddAsset:       $('btn-add-asset'),
    drawerOverlay:     $('drawer-overlay'),
    drawerClose:       $('drawer-close'),
    btnCancelDrawer:   $('btn-cancel-drawer'),
    drawerTitle:       $('drawer-title'),
    drawerSub:         $('drawer-sub'),
    ingestionForm:     $('ingestion-form'),
    submitLabel:       $('submit-label'),
    btnLoader:         $('btn-loader'),
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
    dzGarment:         $('dz-garment'),
    dzTexture:         $('dz-texture'),
    fileGarment:       $('file-garment'),
    fileTexture:       $('file-texture'),
    previewGarment:    $('preview-garment'),
    previewTexture:    $('preview-texture'),
    fBrand:            $('f-brand'),
    fType:             $('f-type'),
    fColor:            $('f-color'),
    fFabric:           $('f-fabric'),
    // Modals and Interactive Stages
    treatConfirmOverlay: $('treat-confirm-overlay'),
    treatConfirmIcon:    $('treat-confirm-icon'),
    treatConfirmHeading: $('treat-confirm-heading'),
    treatConfirmSub:     $('treat-confirm-sub'),
    treatConfirmItems:   $('treat-confirm-items'),
    treatConfirmCancel:  $('treat-confirm-cancel'),
    treatConfirmOk:      $('treat-confirm-ok'),
    stageReview:         $('treat-stage-review'),
    stageWizard:         $('treat-stage-wizard'),
    wizardSlideBody:     $('wizard-slide-body'),
    wizardProgress:      $('wizard-progress'),
    wizardProgressBar:   $('wizard-progress-bar'),
    btnWizardPrev:       $('btn-wizard-prev'),
    btnWizardNext:       $('btn-wizard-next')
  };

  // Safe execution of initial fetch once D is fully built
  if (typeof fetchFromSupabase === 'function') {
    fetchFromSupabase();
  }
});

/* ─── TREATMENT CONFIG METADATA ────────────────────────── */
const TREAT_META = {
  wash:  { icon: '🫧', label: 'Wash',  heading: 'Schedule a Wash', sub: 'The following garments will be queued for professional cleaning.' },
  dry:   { icon: '☀️', label: 'Dry',   heading: 'Schedule Drying', sub: 'The following garments will be processed for drying.' },
  store: { icon: '📦', label: 'Store', heading: 'Schedule Storage', sub: 'The following garments will be archived into seasonal vault storage.' },
};

/* ─── CENTRAL CLIENT-SIDE MANAGEMENT STATE ──────────────── */
const state = {
  assets:          [], 
  filtered:        [],
  activeAssetId:   null,
  isEditing:       false,
  editingAssetId:  null,
  searchQuery:     '',
  filterType:      '',
  filterSort:      'recent',
  isTreatmentMode: false,
  treatmentType:   '',
  selectedAssets:  new Set(),
  // Slideshow States
  wizardSteps:     [],
  currentStepIndex: 0
};

/* ─── HELPER STRING FORMATTERS ─────────────────────────── */
const cap     = str => str.charAt(0).toUpperCase() + str.slice(1);
const fmtDate = dateStr => {
  if(!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};