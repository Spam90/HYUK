// =============================================================
// Prueba de humo: verificar que YA se puede insertar un producto
// Uso: node scripts/test-product-insert.mjs
// Inserta un producto de prueba y lo ELIMINA al final (no deja basura).
// =============================================================
import { readFileSync } from 'node:fs';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET = 'c7c749f3-38a9-4d61-aa47-133d8f6050b7';
const H = { apikey: srk, Authorization: `Bearer ${srk}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

async function rest(method, path, body, headers = H) {
  const res = await fetch(`${url}${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text.slice(0, 300); }
  return { status: res.status, ok: res.ok, data };
}

console.log('\n🧪 PRUEBA DE INSERCIÓN DE PRODUCTO\n');

const ins = await rest('POST', '/rest/v1/products', {
  store_id: TARGET,
  name: '__TEST_SMOKE__',
  description: 'Producto temporal de verificación',
  price: 0.01,
  is_available: false,
});

if (ins.status === 201 && Array.isArray(ins.data)) {
  const p = ins.data[0];
  console.log(`✅ INSERT exitoso (HTTP 201). Producto creado con id=${p.id}`);
  console.log('   → La FK products_store_id_fkey se cumple: TU PERFIL FUNCIONA.');

  // Verificar que aparece en un SELECT (service_role)
  const sel = await rest('GET', `/rest/v1/products?id=eq.${p.id}&select=name,store_id`);
  console.log(sel.ok ? `✅ SELECT del producto OK: ${JSON.stringify(sel.data[0])}` : `⚠ SELECT falló: ${sel.status}`);

  // Limpieza
  const del = await rest('DELETE', `/rest/v1/products?id=eq.${p.id}`);
  console.log(del.ok || del.status === 204
    ? '🧹 Producto de prueba eliminado. No quedó basura.'
    : `⚠ No se pudo eliminar el producto ${p.id} (HTTP ${del.status}) — bórralo desde /admin/products.`);
  console.log('\n🎉 CONCLUSIÓN: la base de datos YA acepta productos para tu tienda.');
  console.log('   Si la app aún falla al guardar, el bloqueo restante son las');
  console.log('   políticas RLS rotas (request.store_slug) → ejecuta');
  console.log('   supabase/FIX_DEFINITIVO_SCHEMA.sql o dame PAT/DATABASE_URL.');
} else {
  console.log(`❌ INSERT falló con HTTP ${ins.status}:`, ins.data);
  if (ins.status === 400 && JSON.stringify(ins.data).includes('store_slug')) {
    console.log('   → Confirma que las políticas RLS rotas también afectan INSERT.');
  }
}
