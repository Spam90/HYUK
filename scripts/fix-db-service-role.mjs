// =============================================================
// FIX con SERVICE ROLE — arregla el 409 (FK profiles) y completa
// el diagnóstico de esquema que RLS rota impedía ver.
// Uso: node scripts/fix-db-service-role.mjs
//
// Hace (idempotente):
//   A) Sonda esquema REAL de products/categories/product_skus
//      (con service_role las políticas RLS ni se evalúan).
//   B) Lista usuarios de auth.users (Admin API).
//   C) Crea la fila en public.profiles para cada usuario sin ella.
//   D) Verifica la inserción.
// =============================================================
import { readFileSync } from 'node:fs';

// Auto-carga .env.local
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* sin .env.local */ }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !srk) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const H = { apikey: srk, Authorization: `Bearer ${srk}`, 'Content-Type': 'application/json' };

async function rest(method, path, body) {
  const res = await fetch(`${url}${path}`, {
    method,
    headers: H,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text.slice(0, 300); }
  return { status: res.status, ok: res.ok, data };
}

console.log(`\n🔧 FIX DB con service_role → ${url}\n`);

// ---------- A) Esquema real (ahora sin evaluación de políticas) ----------
console.log('─'.repeat(60));
console.log('A) ESQUEMA REAL (service_role bypassea RLS)');
console.log('─'.repeat(60));

const PROBES = {
  products: ['id', 'store_id', 'category_id', 'name', 'description', 'price',
    'compare_at_price', 'original_price', 'image_url', 'badge', 'is_available',
    'sort_order', 'stock', 'flash_sale_end', 'flash_sale_price'],
  categories: ['id', 'store_id', 'name', 'slug', 'icon', 'image_url',
    'sort_order', 'is_active'],
  product_skus: ['id', 'product_id', 'sku', 'stock', 'active', 'price_override'],
};

for (const [table, cols] of Object.entries(PROBES)) {
  const missing = [];
  for (const col of cols) {
    const r = await rest('GET', `/rest/v1/${table}?select=${col}&limit=1`);
    if (!r.ok) missing.push(`${col}(${r.status})`);
  }
  if (missing.length === 0) {
    console.log(`✅ ${table}: todas las ${cols.length} columnas existen`);
  } else {
    console.log(`❌ ${table}: FALTAN → ${missing.join(', ')}`);
  }
}

// ---------- B) Usuarios de auth ----------
console.log('\n' + '─'.repeat(60));
console.log('B) USUARIOS EN auth.users');
console.log('─'.repeat(60));

let users = [];
{
  let page = 1;
  for (;;) {
    const r = await rest('GET', `/auth/v1/admin/users?page=${page}&per_page=1000`);
    if (!r.ok) {
      console.log(`❌ No pude listar usuarios (HTTP ${r.status}):`, r.data);
      break;
    }
    const batch = r.data?.users || [];
    users = users.concat(batch);
    if (batch.length < 1000) break;
    page++;
  }
}
console.log(`Encontrados ${users.length} usuario(s):`);
users.forEach((u) => console.log(`   • ${u.id}  ${u.email || '(sin email)'}`));

// ---------- C) Backfill de profiles ----------
console.log('\n' + '─'.repeat(60));
console.log('C) BACKFILL DE PERFILES (profiles)');
console.log('─'.repeat(60));

let creados = 0, existentes = 0;
for (const u of users) {
  const chk = await rest('GET', `/rest/v1/profiles?id=eq.${u.id}&select=id,email`);
  if (chk.ok && Array.isArray(chk.data) && chk.data.length > 0) {
    console.log(`✔ Ya tenía perfil: ${u.email || u.id}`);
    existentes++;
    continue;
  }
  const meta = u.raw_user_meta_data || {};
  const fullName =
    meta.full_name || meta.name || meta.business_name || 'Mi Tienda';
  const ins = await rest('POST', '/rest/v1/profiles', {
    id: u.id,
    email: u.email || null,
    full_name: fullName,
    business_name: fullName,
    plan_type: 'free',
    trial_ends_at: new Date(Date.now() + 28 * 864e5).toISOString(),
  });
  if (ins.status === 201) {
    console.log(`✨ PERFIL CREADO para ${u.email || u.id} (${fullName})`);
    creados++;
  } else {
    console.log(`❌ Falló crear perfil para ${u.email || u.id}: HTTP ${ins.status}`, ins.data);
  }
}

// ---------- D) Verificación ----------
console.log('\n' + '─'.repeat(60));
console.log('D) VERIFICACIÓN FINAL');
console.log('─'.repeat(60));
const TARGET = 'c7c749f3-38a9-4d61-aa47-133d8f6050b7';
const v = await rest('GET', `/rest/v1/profiles?id=eq.${TARGET}&select=id,email,full_name,plan_type`);
if (v.ok && Array.isArray(v.data) && v.data.length > 0) {
  console.log(`✅ Tu usuario (${TARGET}) YA TIENE fila en profiles:`);
  console.log('   ', JSON.stringify(v.data[0]));
  console.log('\n🎉 El 409 (products_store_id_fkey) queda RESUELTO.');
  console.log('   Prueba crear un producto en /admin/products.');
} else {
  console.log(`⚠ El perfil de ${TARGET} sigue sin aparecer:`, v.status, v.data);
}

console.log(`\nResumen: ${creados} perfil(es) creado(s), ${existentes} ya existente(s).\n`);
