// =============================================================
// Diagnóstico directo del esquema REAL de Supabase vía REST.
// Uso: node scripts/diagnose-db.mjs
//
// Interpreta los códigos HTTP de PostgREST:
//   200 -> tabla Y columna existen
//   400 -> tabla existe, columna NO existe (42703)
//   404 -> tabla NO existe (42P01)
// =============================================================

import { readFileSync } from 'node:fs';

// Auto-carga .env.local si las variables no están ya en el entorno
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* sin .env.local */ }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL / ANON_KEY');
  process.exit(1);
}

async function probe(table, column) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${column}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  let body = '';
  try { body = (await res.text()).slice(0, 220); } catch {}
  return { status: res.status, body };
}

const SCHEMA = {
  profiles: ['id', 'email', 'slug', 'business_name', 'full_name', 'tagline', 'phone_whatsapp',
    'is_open', 'store_currency', 'social_links', 'plan_type', 'plan', 'trial_ends_at',
    'layout_type', 'settings', 'stripe_customer_id', 'subscription_status', 'current_plan',
    'plan_expires_at'],
  categories: ['id', 'store_id', 'name', 'slug', 'icon', 'image_url', 'sort_order',
    'is_active', 'created_at'],
  products: ['id', 'store_id', 'category_id', 'name', 'description', 'price',
    'compare_at_price', 'original_price', 'image_url', 'badge', 'is_available',
    'sort_order', 'stock', 'flash_sale_end', 'flash_sale_price', 'created_at'],
  product_options: ['id', 'product_id', 'name', 'label', 'values', 'price_delta', 'sort_order'],
  product_skus: ['id', 'product_id', 'sku', 'stock', 'active', 'price_override'],
  orders: ['id', 'store_id', 'customer_name', 'customer_phone', 'delivery_address',
    'delivery_method', 'delivery_zone', 'delivery_fee', 'payment_method', 'items',
    'total_amount', 'total', 'coupon_code', 'discount_amount', 'status', 'notes',
    'currency', 'payment_status', 'payment_provider', 'stripe_session_id'],
  customers: ['id', 'store_id', 'name', 'phone', 'address', 'total_spent', 'total_orders'],
  coupons: ['id', 'store_id', 'code', 'discount_type', 'discount_value', 'is_active',
    'expires_at', 'max_uses', 'used_count'],
  analytics_events: ['id', 'store_id', 'event', 'session_id', 'metadata'],
  payment_events: ['id', 'order_id', 'provider', 'event_type', 'event_id', 'payload'],
};

console.log(`\n🔍 Diagnosticando esquema real en: ${url}\n`);

const missingCols = {};
const missingTables = [];

for (const [table, cols] of Object.entries(SCHEMA)) {
  const first = await probe(table, cols[0]);
  if (first.status === 404) {
    console.log(`❌ TABLA "${table}" NO EXISTE`);
    missingTables.push(table);
    continue;
  }
  if (first.status !== 200) {
    console.log(`❓ Tabla "${table}" primera sonda HTTP ${first.status}: ${first.body}`);
  }
  const missing = [];
  for (const col of cols) {
    const st = await probe(table, col);
    if (st.status !== 200) {
      missing.push(col);
      // Log detallado solo del primer fallo de cada tabla para no inundar
      if (missing.length === 1) {
        console.log(`   └─ detalle "${table}.${col}" HTTP ${st.status}: ${st.body}`);
      }
    }
  }
  if (missing.length) {
    console.log(`⚠  Tabla "${table}" -> ${missing.length}/${cols.length} sondas fallaron: ${missing.join(', ')}`);
    missingCols[table] = missing;
  } else {
    console.log(`✅ Tabla "${table}" completa (${cols.length} columnas verificadas)`);
  }
}

console.log('\n========== RESUMEN ==========');
if (!missingTables.length && !Object.keys(missingCols).length) {
  console.log('🎉 Esquema completo. El problema está en los DATOS (fila de profiles faltante).');
} else {
  if (missingTables.length) console.log(`Tablas faltantes: ${missingTables.join(', ')}`);
  for (const [t, cols] of Object.entries(missingCols)) {
    console.log(`Columnas faltantes en ${t}: ${cols.join(', ')}`);
  }
}
