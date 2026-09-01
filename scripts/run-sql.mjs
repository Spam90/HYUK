// =============================================================
// scripts/run-sql.mjs — Ejecuta SQL contra el proyecto Supabase
// conectado usando la Management API.
//
// Uso: node scripts/run-sql.mjs <archivo.sql | "SQL inline">
//
// SEGURIDAD: nunca imprime tokens ni claves. Solo imprime la
// respuesta JSON de la API (resultado de la consulta o error).
// =============================================================
import { readFileSync } from 'node:fs';

// Lee .env.local sin volcar su contenido
function readEnvKey(key) {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    const line = raw.split('\n').find((l) => l.trim().startsWith(`${key}=`));
    return line ? line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') : null;
  } catch {
    return null;
  }
}

const token = readEnvKey('SUPABASE_ACCESS_TOKEN');
const url = readEnvKey('NEXT_PUBLIC_SUPABASE_URL');
if (!token || !url) {
  console.error('Faltan SUPABASE_ACCESS_TOKEN o NEXT_PUBLIC_SUPABASE_URL en .env.local');
  process.exit(1);
}

const ref = url.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1];
if (!ref) {
  console.error('No se pudo derivar el project ref de NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

const arg = process.argv[2];
if (!arg) {
  console.error('Uso: node scripts/run-sql.mjs <archivo.sql | "SQL">');
  process.exit(1);
}

const sql = arg.endsWith('.sql') ? readFileSync(arg, 'utf8') : arg;

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const body = await res.text();
console.log(`HTTP ${res.status}`);
console.log(body);
process.exit(res.ok ? 0 : 1);
