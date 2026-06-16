'use strict';

/* ═══════════════════════════════════════════════════════
   FABCARE — CARE-WIZARD.JS
   Wardrobe Asset Vault — Interactive Treatment Slideshow System
═══════════════════════════════════════════════════════ */

/* ─── STEP BUILDERS ─────────────────────────────────────── */

function buildWashSteps(garments) {
  const steps = [];
  const groups       = new Set(garments.map(g => g.color_group));
  const containsPoly = garments.some(g => g.fabric_type === 'polyester');

  const hasWhiteCotton  = garments.some(g => g.color_group === 'white' && g.fabric_type !== 'polyester');
  const hasWhitePoly    = garments.some(g => g.color_group === 'white' && g.fabric_type === 'polyester');
  const hasColorCotton  = garments.some(g => g.color_group !== 'white' && g.fabric_type !== 'polyester');
  const hasColorPoly    = garments.some(g => g.color_group !== 'white' && g.fabric_type === 'polyester');

  // Step 1 — Color Sorting
  if (groups.has('dark') && groups.has('white')) {
    steps.push({
      title: 'Color Sorting Evaluation',
      rules: [
        { type: 'dont', icon: '❌', text: '<strong>High Bleeding Danger!</strong>' },
        { type: 'dont', icon: '⚠️', text: 'You grouped Dark with Whites. Dyes can transfer in the water, causing permanent stains.' },
        { type: 'do',   icon: '🧼', text: '<strong>Fix:</strong> Remove white items and wash them in a completely separate load.' }
      ]
    });
  } else if (groups.has('dark') && groups.has('light')) {
    steps.push({
      title: 'Color Sorting Evaluation',
      rules: [
        { type: 'dont', icon: '⚠️', text: 'Mixing darks with light/pastels causes subtle dye bleed — lights will fade and look dull over time.' },
        { type: 'do',   icon: '❄️', text: 'If washing together, set the machine completely to cold water to minimize bleeding risk.' }
      ]
    });
  } else {
    steps.push({
      title: 'Color Sorting Evaluation',
      rules: [
        { type: 'do', icon: '✅', text: 'Nice work! This batch has safe color composition. No high-risk dye bleeding detected.' }
      ]
    });
  }

  // Step 2 — Chemical Restrictions (personalized per fabric+color combo)
  const chemRules = [];
  if (hasColorCotton) chemRules.push({ type: 'do', icon: '🧪', text: 'For your <strong>colored cotton</strong>: use a gentle liquid color detergent — dissolves in cold water without stripping dyes.', ruleKey: 'detergent-colored-cotton' });
  if (hasWhiteCotton) chemRules.push({ type: 'do', icon: '🧪', text: 'For your <strong>white cotton</strong>: use a powder or oxygen-boosted detergent to brighten and lift body oils.', ruleKey: 'detergent-white-cotton' });
  if (hasColorPoly)   chemRules.push({ type: 'do', icon: '🧪', text: 'For your <strong>colored polyester</strong>: use a low-suds odor-targeting liquid — lifts oils without sticky residue.', ruleKey: 'detergent-colored-poly' });
  if (hasWhitePoly)   chemRules.push({ type: 'do', icon: '🧪', text: 'For your <strong>white polyester</strong>: use residue-free liquid + oxygen bleach to keep synthetics bright without yellowing.', ruleKey: 'detergent-white-poly' });
  if (chemRules.length === 0) chemRules.push({ type: 'do', icon: '🧪', text: 'Use a pH-neutral liquid detergent suitable for your fabric type.', ruleKey: 'detergent-general' });
  chemRules.push({ type: 'dont', icon: '🚫', text: 'Never use Chlorine Bleach. It eats away at natural fibers, causing permanent yellowing.' });
  if (containsPoly)   chemRules.push({ type: 'dont', icon: '❌', text: '<strong>No Fabric Softener</strong> on polyester — it leaves a waxy coating that breaks down breathability.' });
  steps.push({ title: 'Chemical Restrictions', rules: chemRules });

  // Step 3 — Temperature
  steps.push({
    title: 'Temperature Configuration',
    rules: containsPoly ? [
      { type: 'do', icon: '💧', text: 'Set your washing machine to <strong>30°C (Cold Water)</strong>.' },
      { type: 'do', icon: '🛡️', text: 'Cold water prevents synthetic fiber warping, shrinking, and seam stretching.' }
    ] : [
      { type: 'do', icon: '🔥', text: 'Set your washing machine to <strong>40°C (Warm Water)</strong>.' },
      { type: 'do', icon: '🧼', text: 'Warm water breaks down body oils and surface dirt effectively on cotton loads.' }
    ]
  });

  // Step 4 — Machine Cycle
  const needsDelicate = garments.some(g => ['knitwear', 't-shirt'].includes(g.type));
  steps.push({
    title: 'Machine Cycle Selector',
    rules: needsDelicate ? [
      { type: 'do',   icon: '⚙️', text: 'Set your cycle to <strong>Delicate / Low Agitation Spin</strong>.' },
      { type: 'dont', icon: '⚠️', text: 'Avoid high-speed spinning — knits and lightweight cotton warp under aggressive agitation.' }
    ] : [
      { type: 'do', icon: '🔄', text: 'Set your cycle to <strong>Normal / Standard Cycle</strong>.' },
      { type: 'do', icon: '👕', text: 'Sturdy woven items handle traditional spin cycles well to extract dirt effectively.' }
    ]
  });

  // Step 5 — Loading
  steps.push({
    title: 'Loading Execution',
    rules: [
      { type: 'do',   icon: '🪙', text: 'Empty all pockets. Coins and keys can damage drums or melt onto fabrics.' },
      { type: 'do',   icon: '🙃', text: 'Turn graphic shirts inside out to protect prints from frictional peeling.' },
      { type: 'dont', icon: '❌', text: 'Do not overstuff the drum — load loosely to allow proper water circulation.' }
    ]
  });

  return steps;
}

function buildDrySteps(garments) {
  const containsPoly = garments.some(g => g.fabric_type === 'polyester');
  const dryRule = containsPoly
    ? { type: 'do', icon: '💨', text: 'Recommended: <strong>Line Hang Dry</strong>. Synthetics air-dry fast and need no heat.', ruleKey: 'line-dry' }
    : { type: 'do', icon: '💨', text: 'Recommended: <strong>Flat Air Drying</strong>. Lay delicates flat to maintain shape.', ruleKey: 'flat-dry' };
  return [
    {
      title: 'Drying Strategy',
      rules: [
        dryRule,
        { type: 'dont', icon: '🔥', text: 'Avoid direct heat. Forced heat shrinks natural fibers and stiffens synthetic bonds.' }
      ]
    },
    {
      title: 'Drying Placement',
      rules: [
        { type: 'do', icon: '👋', text: 'Snap-shake each garment firmly after the spin to dislodge wrinkles before drying.' },
        { type: 'do', icon: '📐', text: 'Air-dry sweaters completely flat on a rack — vertical hanging stretches knits permanently.', ruleKey: 'drying-general' }
      ]
    }
  ];
}

function buildStoreSteps(garments) {
  const needsFolding  = garments.some(g => ['t-shirt', 'knitwear', 'sweater'].includes(g.type));
  const needsHanging  = garments.some(g => ['jacket', 'blazer', 'coat', 'shirt'].includes(g.type));
  const storageRuleKey = needsFolding ? 'storage-fold' : 'storage-hanger';
  return [
    {
      title: 'Storage Layout',
      rules: [
        needsFolding
          ? { type: 'do', icon: '📦', text: 'Fold knitwear and t-shirts <strong>flat horizontally</strong> — never hang them, it stretches the body permanently.', ruleKey: 'storage-fold' }
          : { type: 'do', icon: '🧥', text: 'Hang structured pieces (blazers, coats, shirts) on <strong>padded contoured hangers</strong>.', ruleKey: 'storage-hanger' },
        { type: 'dont', icon: '🚫', text: 'Never use wire hangers for heavy knitwear — they permanently stretch the shoulder seams.' }
      ]
    },
    {
      title: 'Preservation Rules',
      rules: [
        { type: 'do',   icon: '💧', text: 'Ensure items are 100% dry before storing. Humidity in a closed space breeds mildew.', ruleKey: 'storage-general' },
        { type: 'dont', icon: '🌅', text: 'Keep clothes away from direct sunlight — UV rays cause colors to fade unevenly over time.' }
      ]
    }
  ];
}

/* ─── MAIN GENERATOR ────────────────────────────────────── */
// CHANGED: generateWizardSteps() — inject section transition slides
function generateWizardSteps() {
  const garments = state.assets.filter(a =>
    state.selectedAssets.has(String(a.id)) || state.selectedAssets.has(Number(a.id))
  );
  let steps = [];

  if (state.treatmentType === 'wash') {
    steps.push({ isSectionHeader: true, section: 'wash' });
    steps.push(...buildWashSteps(garments));
    steps.push({ isSectionHeader: true, section: 'dry' });
    steps.push(...buildDrySteps(garments));
    steps.push({ isSectionHeader: true, section: 'store' });
    steps.push(...buildStoreSteps(garments));
  } else if (state.treatmentType === 'dry') {
    steps.push({ isSectionHeader: true, section: 'dry' });
    steps.push(...buildDrySteps(garments));
    steps.push({ isSectionHeader: true, section: 'store' });
    steps.push(...buildStoreSteps(garments));
  } else if (state.treatmentType === 'store') {
    steps.push({ isSectionHeader: true, section: 'store' });
    steps.push(...buildStoreSteps(garments));
  }

  if (steps.filter(s => !s.isSectionHeader).length === 0) {
    steps.push({ title: 'Ready to Process', rules: [{ type: 'do', icon: '✅', text: '<strong>All Cleared!</strong> No conflicts detected. Safe to proceed.' }] });
  }

  steps.push({ title: 'Care Guide Finalized', isFinal: true, rules: [{ type: 'do', icon: '🎉', text: 'All steps complete! Your garments are ready for processing.' }] });
  return steps;
}

/* ─── SLIDESHOW SETUP ───────────────────────────────────── */
function startWizardPresentation() {
  state.wizardSteps = generateWizardSteps();
  state.currentStepIndex = 0;

  D.stageReview.classList.remove('active');
  D.stageWizard.classList.add('active');

  const track = D.wizardSlideTrack;
  track.innerHTML = '';
  state.wizardSteps.forEach((step, idx) => track.appendChild(buildSlideDOM(step, idx)));
  moveTrackPosition();
}

/* ─── SLIDE DOM BUILDER ─────────────────────────────────── */
// CHANGED: buildSlideDOM() — add isSectionHeader block + fix step numbering to skip headers
function buildSlideDOM(step, index) {
  const slide = document.createElement('div');
  slide.className = 'wizard-slide-view';

  // ── Section transition header slide ──
  if (step.isSectionHeader) {
    const META = {
      wash:  {
        svg: `<svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" class="care-section-header__svg">
          <defs>
            <radialGradient id="bubble1" cx="38%" cy="32%" r="60%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
              <stop offset="40%" stop-color="#b8d8ff" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#7eb8f7" stop-opacity="0.4"/>
            </radialGradient>
            <radialGradient id="bubble2" cx="38%" cy="32%" r="60%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
              <stop offset="40%" stop-color="#e0b8ff" stop-opacity="0.75"/>
              <stop offset="100%" stop-color="#c07ef7" stop-opacity="0.35"/>
            </radialGradient>
            <radialGradient id="bubble3" cx="38%" cy="32%" r="60%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.88"/>
              <stop offset="40%" stop-color="#ffb8e8" stop-opacity="0.7"/>
              <stop offset="100%" stop-color="#f77ec0" stop-opacity="0.3"/>
            </radialGradient>
            <filter id="glow-b" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx="96" cy="72" r="52" fill="url(#bubble1)" filter="url(#glow-b)" opacity="0.95"/>
          <circle cx="48" cy="104" r="30" fill="url(#bubble3)" filter="url(#glow-b)" opacity="0.88"/>
          <circle cx="52" cy="60" r="22" fill="url(#bubble2)" filter="url(#glow-b)" opacity="0.85"/>
          <circle cx="108" cy="52" r="10" fill="white" opacity="0.5"/>
          <circle cx="56" cy="44" r="6" fill="white" opacity="0.45"/>
        </svg>`,
        label: 'Washing', subtitle: 'Fabric-safe cleaning protocol', accent: '#7eb8f7'
      },
      dry: {
        svg: `<svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" class="care-section-header__svg">
          <defs>
            <radialGradient id="sun-core" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stop-color="#fff9c4"/>
              <stop offset="50%" stop-color="#FFD54F"/>
              <stop offset="100%" stop-color="#FF8F00" stop-opacity="0.7"/>
            </radialGradient>
            <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FFD54F" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="#FF8F00" stop-opacity="0"/>
            </radialGradient>
            <filter id="glow-s" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="10" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx="80" cy="80" r="62" fill="url(#sun-glow)"/>
          <circle cx="80" cy="80" r="40" fill="url(#sun-core)" filter="url(#glow-s)"/>
          <g stroke="#FFD54F" stroke-width="4" stroke-linecap="round" opacity="0.75">
            <line x1="80" y1="18" x2="80" y2="28"/>
            <line x1="80" y1="132" x2="80" y2="142"/>
            <line x1="18" y1="80" x2="28" y2="80"/>
            <line x1="132" y1="80" x2="142" y2="80"/>
            <line x1="34" y1="34" x2="41" y2="41"/>
            <line x1="119" y1="119" x2="126" y2="126"/>
            <line x1="126" y1="34" x2="119" y2="41"/>
            <line x1="41" y1="119" x2="34" y2="126"/>
          </g>
        </svg>`,
        label: 'Drying', subtitle: 'Controlled drying technique', accent: '#FFD54F'
      },
      store: {
        svg: `<svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" class="care-section-header__svg">
          <defs>
            <linearGradient id="box-face" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#E2C99A"/>
              <stop offset="100%" stop-color="#8B6914"/>
            </linearGradient>
            <linearGradient id="box-top" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f0deb0"/>
              <stop offset="100%" stop-color="#C9A96E"/>
            </linearGradient>
            <linearGradient id="box-side" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#b8861a"/>
              <stop offset="100%" stop-color="#7a5410"/>
            </linearGradient>
            <filter id="glow-box" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <g filter="url(#glow-box)">
            <polygon points="80,42 130,62 130,118 80,138 30,118 30,62" fill="url(#box-face)" opacity="0.95"/>
            <polygon points="80,42 130,62 80,82 30,62" fill="url(#box-top)"/>
            <polygon points="130,62 130,118 80,138 80,82" fill="url(#box-side)" opacity="0.85"/>
            <line x1="80" y1="82" x2="80" y2="138" stroke="#C9A96E" stroke-width="1.5" opacity="0.5"/>
            <line x1="80" y1="42" x2="80" y2="82" stroke="#f0deb0" stroke-width="1.5" opacity="0.4"/>
          </g>
          <rect x="56" y="58" width="48" height="8" rx="4" fill="#f0deb0" opacity="0.55"/>
        </svg>`,
        label: 'Storing', subtitle: 'Long-term preservation strategy', accent: '#C9A96E'
      },
    };
    const m = META[step.section];
    slide.innerHTML = `
      <div class="care-section-header">
        <div class="care-section-header__visual">${m.svg}</div>
        <div class="care-section-header__label" style="color:${m.accent}">Next Up</div>
        <h2 class="care-section-header__title">${m.label} <em>Section</em></h2>
        <p class="care-section-header__sub">${m.subtitle}</p>
      </div>`;
    return slide;
  }

  if (step.isFinal) {
    slide.innerHTML = `
      <div class="care-interactive-box revealed">
        <div class="care-box-step-tag">🎉</div>
        <h3 class="care-box-title">${step.title}</h3>
        <div class="care-instructions-container">
          <div class="care-rule-item do" style="animation-delay:100ms;">
            <span class="care-rule-icon">🎉</span>
            <div class="care-rule-text">${step.rules[0].text}</div>
          </div>
        </div>
      </div>`;
    return slide;
  }

  // Count real step number (skip section headers)
  const realStepNum = state.wizardSteps.slice(0, index + 1).filter(s => !s.isSectionHeader && !s.isFinal).length;

  const box = document.createElement('div');
  if (index === 0 || (index === 1 && state.wizardSteps[0]?.isSectionHeader)) {
    box.className = 'care-interactive-box clickable';
    box.innerHTML = `
      <div class="care-box-step-tag">Step ${realStepNum}</div>
      <h3 class="care-box-title">${step.title}</h3>
      <p class="care-click-prompt">👇 Click to view step details</p>
      <div class="care-instructions-container"></div>`;
  } else {
    box.className = 'care-interactive-box revealed';
    box.innerHTML = `
      <div class="care-box-step-tag">Step ${realStepNum}</div>
      <h3 class="care-box-title">${step.title}</h3>
      <div class="care-instructions-container"></div>`;
  }

  const container = box.querySelector('.care-instructions-container');
  step.rules.forEach((rule, rIdx) => container.appendChild(buildRuleItem(rule, rIdx)));

  // Only first real content slide (after optional section header) is clickable
  const isFirstContent = state.wizardSteps.slice(0, index).every(s => s.isSectionHeader);
  if (isFirstContent) {
    box.addEventListener('click', () => {
      if (!box.classList.contains('revealed')) {
        box.classList.remove('clickable');
        box.classList.add('revealed');
        if (index === state.currentStepIndex) D.btnWizardNext.classList.add('visible');
      }
    });
  }

  slide.appendChild(box);
  return slide;
}

/* ─── RULE ITEM BUILDER ─────────────────────────────────── */
function buildRuleItem(rule, rIdx) {
  const products = typeof getProductsForRule === 'function' ? getProductsForRule(rule.ruleKey) : [];
  const hasProducts = products.length > 0;

  const item = document.createElement('div');
  item.className = `care-rule-item ${rule.type}${hasProducts ? ' has-products' : ''}`;
  item.style.animationDelay = `${rIdx * 150}ms`;

  // Top row
  const topRow = document.createElement('div');
  topRow.className = 'care-rule-top-row';
  topRow.innerHTML = `
    <span class="care-rule-icon">${rule.icon}</span>
    <div class="care-rule-body">
      <div class="care-rule-text">${rule.text}</div>
      ${hasProducts ? '<span class="care-rule-shop-hint">🛍️ Hover to see recommended products</span>' : ''}
    </div>
    ${hasProducts ? '<span class="care-rule-chevron">›</span>' : ''}`;
  item.appendChild(topRow);

  if (hasProducts) {
    const panel = buildProductPanel(products);
    panel.style.display = 'none';
    item.appendChild(panel);

    function openPanel() {
      item.classList.add('product-panel-open');
      panel.style.display = 'block';
      // measure after display:block so scrollHeight is accurate
      requestAnimationFrame(() => {
        panel.style.maxHeight = panel.scrollHeight + 'px';
        panel.style.opacity = '1';
      });
    }

    function closePanel() {
      item.classList.remove('product-panel-open');
      panel.style.maxHeight = '0';
      panel.style.opacity = '0';
      const onTransEnd = function (ev) {
        if (ev.propertyName === 'max-height') {
          panel.style.display = 'none';
          panel.removeEventListener('transitionend', onTransEnd);
        }
      };
      panel.addEventListener('transitionend', onTransEnd);
    }

    // Hover on the whole item (top row + panel) so moving into
    // the panel itself doesn't trigger a close
    item.addEventListener('mouseenter', openPanel);
    item.addEventListener('mouseleave', closePanel);
  }

  return item;
}

/* ─── PRODUCT PANEL BUILDER ─────────────────────────────── */
function buildProductPanel(products) {
  const panel = document.createElement('div');
  panel.className = 'product-panel';
  panel.style.maxHeight = '0';
  panel.style.opacity   = '0';

  panel.innerHTML = `
    <div class="product-panel__label">Recommended Products</div>
    <div class="product-panel__grid">
      ${products.map(p => `
        <a class="product-card" href="${p.shopUrl}" target="_blank" rel="noopener noreferrer">
          <div class="product-card__img-wrap">
            <img class="product-card__img" src="${p.img}" alt="${p.name}" loading="lazy"/>
          </div>
          <div class="product-card__body">
            <p class="product-card__name">${p.name}</p>
            <p class="product-card__desc">${p.desc}</p>
            <div class="product-card__footer">
              <span class="product-card__price">${p.price}</span>
              <span class="product-card__cta">Shop →</span>
            </div>
          </div>
        </a>`).join('')}
    </div>`;

  return panel;
}

/* ─── TRACK MOVEMENT ────────────────────────────────────── */
// CHANGED: moveTrackPosition() — progress badge excludes section header slides
function moveTrackPosition() {
  const track = D.wizardSlideTrack;
  const total = state.wizardSteps.length;
  const slideWidth = track.parentElement.offsetWidth;
  track.style.transform = `translateX(-${state.currentStepIndex * slideWidth}px)`;

  // For progress display, count only non-header slides
  const realTotal = state.wizardSteps.filter(s => !s.isSectionHeader).length;
  const realCurrent = state.wizardSteps.slice(0, state.currentStepIndex + 1).filter(s => !s.isSectionHeader).length;
  D.wizardProgress.textContent = `Step ${realCurrent} of ${realTotal}`;
  D.wizardProgressBar.style.width = `${((state.currentStepIndex + 1) / total) * 100}%`;
  D.btnWizardPrev.style.visibility = state.currentStepIndex === 0 ? 'hidden' : 'visible';

  const currentStep = state.wizardSteps[state.currentStepIndex];
  if (currentStep.isFinal) {
    D.btnWizardNext.textContent = 'Finish Ledger';
    D.btnWizardNext.classList.add('finish-btn', 'visible');
  } else if (currentStep.isSectionHeader) {
    // Section headers: Next is always visible and labeled "Continue"
    D.btnWizardNext.textContent = 'Continue';
    D.btnWizardNext.classList.remove('finish-btn');
    D.btnWizardNext.classList.add('visible');
  } else {
    D.btnWizardNext.textContent = 'Next';
    D.btnWizardNext.classList.remove('finish-btn');
    const isFirstContent = state.wizardSteps.slice(0, state.currentStepIndex).every(s => s.isSectionHeader);
    if (!isFirstContent) {
      D.btnWizardNext.classList.add('visible');
    } else {
      const firstBox = track.querySelector('.wizard-slide-view .care-interactive-box');
      firstBox?.classList.contains('revealed')
        ? D.btnWizardNext.classList.add('visible')
        : D.btnWizardNext.classList.remove('visible');
    }
  }
}

function handleWizardNext() {
  if (state.wizardSteps[state.currentStepIndex].isFinal) {
    closeTreatConfirm();
    endTreatmentMode();
  } else {
    state.currentStepIndex++;
    moveTrackPosition();
  }
}

function handleWizardPrev() {
  if (state.currentStepIndex > 0) {
    state.currentStepIndex--;
    moveTrackPosition();
  }
}