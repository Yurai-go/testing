'use strict';

/* ═══════════════════════════════════════════════════════
   FABCARE — PRODUCT-DB.JS
   Local product database for affiliate recommendations.
═══════════════════════════════════════════════════════ */

const PRODUCT_DB = {
  'p001': {
    name: 'Persil Color Protect Liquid',
    desc: 'pH-neutral formula that locks in color and protects fibers during every wash.',
    price: 'Rp 89.000',
    img: 'https://images.unsplash.com/photo-1585441695325-21e9bbfffe57?w=300&q=80',
    shopUrl: 'https://shopee.co.id'
  },
  'p002': {
    name: 'Attack Whitening Powder',
    desc: 'Oxygen-boosted powder. Penetrates cotton fibers to lift oils and brighten whites.',
    price: 'Rp 34.000',
    img: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=300&q=80',
    shopUrl: 'https://shopee.co.id'
  },
  'p003': {
    name: 'Vanish Oxi Action Liquid',
    desc: 'Oxygen bleach alternative. Keeps synthetics bright without the yellowing risk of chlorine.',
    price: 'Rp 62.000',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80',
    shopUrl: 'https://shopee.co.id'
  },
  'p004': {
    name: 'Downy Sport Odor Protect',
    desc: 'Low-suds odor-targeting liquid. Lifts sweat and oils from synthetic fibers without residue.',
    price: 'Rp 45.000',
    img: 'https://images.unsplash.com/photo-1585441695325-21e9bbfffe57?w=300&q=80',
    shopUrl: 'https://tokopedia.com'
  },
  'p005': {
    name: 'IKEA MULIG Drying Rack',
    desc: 'Freestanding flat drying rack. Keeps knitwear and delicates in a horizontal lay-flat position.',
    price: 'Rp 149.000',
    img: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&q=80',
    shopUrl: 'https://www.ikea.com/id'
  },
  'p006': {
    name: 'Stainless Clothes Hanger Set (10pcs)',
    desc: 'Rust-proof stainless hangers. No sharp edges that snag synthetic fabric.',
    price: 'Rp 55.000',
    img: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&q=80',
    shopUrl: 'https://tokopedia.com'
  },
  'p007': {
    name: 'Velvet Padded Hanger Set (5pcs)',
    desc: 'Contoured velvet hangers that grip fabric without stretching shoulders. Ideal for blazers and coats.',
    price: 'Rp 75.000',
    img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&q=80',
    shopUrl: 'https://shopee.co.id'
  },
  'p008': {
    name: 'Vacuum Storage Bag (3pcs)',
    desc: 'Airtight compression bags. Removes humidity and prevents mildew during long-term storage.',
    price: 'Rp 65.000',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80',
    shopUrl: 'https://tokopedia.com'
  },
  'p009': {
    name: 'Cedar Wood Block Set',
    desc: 'Natural cedar repels moths and absorbs moisture. Safe for all fabrics, no chemical residue.',
    price: 'Rp 48.000',
    img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&q=80',
    shopUrl: 'https://shopee.co.id'
  },
  'p010': {
    name: 'UV-Blocking Garment Bag',
    desc: 'Breathable cover that blocks UV rays. Prevents color fading for garments stored near windows.',
    price: 'Rp 85.000',
    img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&q=80',
    shopUrl: 'https://tokopedia.com'
  }
};

/* Maps a ruleKey to product IDs */
const RULE_PRODUCTS = {
  'detergent-colored-cotton': ['p001'],
  'detergent-white-cotton':   ['p002'],
  'detergent-colored-poly':   ['p001', 'p004'],
  'detergent-white-poly':     ['p003'],
  'detergent-general':        ['p001'],
  'line-dry':                 ['p006'],
  'flat-dry':                 ['p005'],
  'drying-general':           ['p005', 'p006'],
  'storage-hanger':           ['p007', 'p009', 'p010'],
  'storage-fold':             ['p008', 'p009'],
  'storage-general':          ['p007', 'p008', 'p009', 'p010'],
};

function getProductsForRule(ruleKey) {
  if (!ruleKey) return [];
  const ids = RULE_PRODUCTS[ruleKey] || [];
  return ids.map(id => ({ id, ...PRODUCT_DB[id] })).filter(p => p.name);
}
