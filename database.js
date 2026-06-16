'use strict';

/* ═══════════════════════════════════════════════════════
   FABCARE — DATABASE.JS
   Wardrobe Asset Vault — Supabase Communication Service
═══════════════════════════════════════════════════════ */

/* ─── DATA ENGINE FEEDS FROM SUPABASE CLOUD ────────────── */
async function fetchFromSupabase() {
  try {
    const { data, error } = await supabaseClient
      .from('clothes')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;

    state.assets = data || [];
    applyFilters();
    updateMetrics();
  } catch (err) {
    console.error("Critical Cloud Retrieval Failure:", err.message);
  }
}

/* ─── MUTATION SUBMISSIONS BACK TO SUPABASE CLOUD ──────── */
async function handleFormSubmit(e) {
  e.preventDefault();

  const brand  = D.fBrand.value.trim();
  const type   = D.fType.value.trim().toLowerCase();  // normalize: text input may be capitalized
  const color  = D.fColor.value.trim();
  const fabric = D.fFabric.value.trim();

  if (!brand || !type || !color || !fabric) return;

  D.submitLabel.style.display = 'none';
  D.btnLoader.style.display   = 'block';

  const lowerFabric = fabric.toLowerCase();
  let fabric_type = 'cotton'; 
  if (lowerFabric.includes('poly') || lowerFabric.includes('dacron') || lowerFabric.includes('nylon')) {
    fabric_type = 'polyester';
  }

  const lowerColor = color.toLowerCase();
  let color_group = 'light'; 
  const darks = ['black', 'navy', 'dark', 'charcoal', 'grey', 'brown', 'maroon', 'indigo', 'blue'];
  const whites = ['white', 'ivory', 'cream', 'optic white', 'undyed'];
  
  if (darks.some(d => lowerColor.includes(d))) {
    color_group = 'dark';
  } else if (whites.some(w => lowerColor.includes(w))) {
    color_group = 'white';
  }

  const payload = {
    brand,
    name:     `${brand} ${cap(type)}`,
    type, 
    color, 
    fabric,
    fabric_type, 
    color_group,  
    img:      D.previewGarment.src || null,
    texture:  D.previewTexture.src || null
  };

  try {
    if (state.isEditing) {
      const { data, error } = await supabaseClient
        .from('clothes')
        .update(payload)
        .eq('id', state.editingAssetId)
        .select();

      if (error) throw error;
      
      const i = state.assets.findIndex(a => a.id === state.editingAssetId);
      if (i > -1) state.assets[i] = data[0];
    } else {
      const { data, error } = await supabaseClient
        .from('clothes')
        .insert([payload])
        .select();

      if (error) throw error;
      state.assets.unshift(data[0]);
    }

    applyFilters();
    updateMetrics();
    closeDrawer();
  } catch (err) {
    console.error("Database Write Error Failed:", err.message);
    D.submitLabel.style.display = 'inline';
    D.btnLoader.style.display   = 'none';
  }
}