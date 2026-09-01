// ============================================================
// APLICADOR DE MIGRACIONES HYUK — Supabase Management API
// Uso:
//   1) Genera un token en https://supabase.com/dashboard/account/tokens
//   2) Añade a .env.local:  SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxx
//   3) node scripts/apply-migrations.mjs
// Aplica las migraciones pendientes y verifica el resultado.
// ============================================================
import { readFileSync, existsSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const get = (k) => {
  const line = env.split('\n').find((l) => l.startsWith(k + '='));
  return line ? line.slice(k.length + 1).trim() : null;
};

const TOKEN = get('SUPABASE_ACCESS_TOKEN');
const URL_ENV = get('NEXT_PUBLIC_SUPABASE_URL');
if (!TOKEN) {
  console.error('❌ Falta SUPABASE_ACCESS_TOKEN en .env.local');
  console.error('   Genera uno en: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}
const ref = URL_ENV.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!ref) { console.error('❌ No pude derivar el project-ref de la URL'); process.exit(1); }

const api = async (query) => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const body = await res.text();
  return { status: res.status, body: body.slice(0, 600) };
};

const MIGRATIONS = [
  'supabase/migrations/20240101000011_phase0_security.sql',
  'supabase/migrations/20240101000012_phase05_stability.sql',
  'supabase/migrations/20240101000013_security_hardening.sql',
  'supabase/migrations/20240101000014_checkout_integrity.sql',
];

let failures = 0;
for (const file of MIGRATIONS) {
  const path = new URL('../' + file, import.meta.url);
  if (!existsSync(path)) { console.error(`❌ No existe ${file}`); failures++; continue; }
  const sql = readFileSync(path, 'utf8');
  console.log(`\n▶ Aplicando ${file} ...`);
  const { status, body } = await api(sql);
  console.log(`  HTTP ${status} ${status < 300 ? '✅' : '❌'}${status >= 300 ? '\n  ' + body : ''}`);
  if (status >= 300) failures++;
}

// ---------- VERIFICACIÓN ----------
const CHECKS = [
  ['orders.tracking_token', "SELECT count(*) AS cols FROM information_schema.columns WHERE table_name='orders' AND column_name='tracking_token'"],
  ['customers columnas CRM', "SELECT count(*) AS cols FROM information_schema.columns WHERE table_name='customers' AND column_name IN ('address','total_spent','total_orders','last_order_date')"],
  ['índices únicos customers', "SELECT count(*) AS n FROM pg_indexes WHERE tablename='customers' AND indexname LIKE 'uq_customers%'"],
  ['función CRM', "SELECT count(*) AS n FROM pg_proc WHERE proname='upsert_customer_from_order'"],
  ['CHECK orders incluye paid', "SELECT pg_get_constraintdef(oid) LIKE '%paid%' AS ok FROM pg_constraint WHERE conrelid='public.orders'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%status%'"],
  ['policies storage nuevas', "SELECT count(*) AS n FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND (policyname LIKE '%own folder%' OR policyname='Public read store media')"],
  ['sin lectura pública orders', "SELECT count(*) AS n FROM pg_policies WHERE tablename='orders' AND cmd='SELECT' AND qual='true'"],
];
console.log('\n════════ VERIFICACIÓN ════════');
for (const [name, query] of CHECKS) {
  const { status, body } = await api(query);
  console.log(`${status < 300 ? '•' : '❌'} ${name}: ${status < 300 ? body.trim() : 'ERROR ' + body}`);
}
console.log(`\n${failures ? '⚠️  ' + failures + ' migración(es) con error' : '✅ Proceso terminado'}`);
