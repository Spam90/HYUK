// =============================================
// HYUK - Verificador de variables de entorno (deploy)
// Uso: npm run check:env
// Valida que no falten variables obligatorias antes de publicar.
// =============================================

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const optional = [
  ['GEMINI_API_KEY', 'El módulo de IA no funcionará'],
  ['NEXT_PUBLIC_ROOT_DOMAIN', 'Los URLs de tiendas usarán el fallback'],
  ['SENTRY_DSN', 'Sentry quedará desactivado'],
];

let errors = 0;

console.log('🔍 Verificando variables de entorno...\n');

for (const key of required) {
  if (!process.env[key]) {
    console.error(`✖ FALTA: ${key}`);
    errors += 1;
  } else {
    console.log(`✔ ${key} configurada`);
  }
}

for (const [key, hint] of optional) {
  if (!process.env[key]) {
    console.warn(`⚠ Opcional (${key}): ${hint}`);
  }
}

if (errors > 0) {
  console.error(`\n❌ ${errors} variable(s) obligatoria(s) ausente(s). Deteniendo.`);
  process.exit(1);
}

console.log('\n✅ Variables obligatorias completas. Listo para desplegar.');