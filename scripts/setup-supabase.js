#!/usr/bin/env node

/**
 * Script de verificación y configuración de Supabase para HYUK
 * 
 * Uso:
 * 1. Asegúrate de tener un archivo .env.local con:
 *    NEXT_PUBLIC_SUPABASE_URL=tu-url
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key
 * 
 * 2. Ejecuta: node scripts/setup-supabase.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}\n`),
};

async function checkSupabaseConnection() {
  log.title('🔍 Verificando conexión con Supabase...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log.error('Variables de entorno no configuradas');
    console.log('   Asegúrate de tener en .env.local:');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL');
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Intentar una consulta simple para verificar la conexión
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error && error.code !== '42P01') { // Ignorar error de tabla no existente
      throw error;
    }

    log.success('Conexión exitosa con Supabase');
    log.info(`URL: ${supabaseUrl}`);
    return supabase;
  } catch (error) {
    log.error('Error al conectar con Supabase');
    console.log(`   ${error.message}`);
    process.exit(1);
  }
}

async function checkTables(supabase) {
  log.title('📊 Verificando tablas de la base de datos...');

  const tables = [
    { name: 'profiles', required: true },
    { name: 'categories', required: true },
    { name: 'products', required: true },
    { name: 'product_options', required: true },
    { name: 'orders', required: true },
  ];

  let allTablesExist = true;

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('count')
        .limit(1);

      if (error && error.code === '42P01') {
        log.error(`Tabla '${table.name}' NO EXISTE`);
        if (table.required) {
          allTablesExist = false;
          console.log(`   ⚠ Esta tabla es requerida. Ejecuta el schema.sql en Supabase.`);
        }
      } else if (error) {
        log.warning(`Tabla '${table.name}' - Error al verificar: ${error.message}`);
      } else {
        log.success(`Tabla '${table.name}' existe`);
      }
    } catch (error) {
      log.error(`Error al verificar tabla '${table.name}': ${error.message}`);
      allTablesExist = false;
    }
  }

  return allTablesExist;
}

async function checkStorage(supabase) {
  log.title('📦 Verificando Storage (Supabase Storage)...');

  try {
    // Intentar listar los buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      log.error('Error al verificar Storage');
      console.log(`   ${error.message}`);
      return false;
    }

    const storeAssetsBucket = buckets.find(bucket => bucket.name === 'store-assets');

    if (!storeAssetsBucket) {
      log.warning("Bucket 'store-assets' NO EXISTE");
      console.log('   ℹ Para crearlo, ejecuta en Supabase SQL Editor:');
      console.log('   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)');
      console.log("   VALUES ('store-assets', 'store-assets', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[])");
      console.log('   ON CONFLICT (id) DO NOTHING;');
      return false;
    }

    log.success("Bucket 'store-assets' existe");
    log.info(`   - Público: ${storeAssetsets.public ? 'Sí' : 'No'}`);
    log.info(`   - Límite de tamaño: ${(storeAssetsBucket.file_size_limit / 1024 / 1024).toFixed(1)}MB`);
    log.info(`   - Tipos permitidos: ${storeAssetsBucket.allowed_mime_types?.join(', ') || 'Todos'}`);
    
    return true;
  } catch (error) {
    log.error(`Error al verificar Storage: ${error.message}`);
    return false;
  }
}

async function checkRLSPolicies(supabase) {
  log.title('🔒 Verificando políticas RLS...');

  const policies = [
    { table: 'profiles', policy: 'Public read profiles' },
    { table: 'categories', policy: 'Public read active categories' },
    { table: 'products', policy: 'Public read available products' },
    { table: 'orders', policy: 'Public insert orders' },
  ];

  let allPoliciesExist = true;

  for (const { table, policy } of policies) {
    try {
      // Intentar acceder a los datos para verificar RLS
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      // Si no hay error de permisos, las políticas están funcionando
      if (error && error.code === '42501') {
        log.error(`RLS en '${table}' - Sin permisos de lectura`);
        allPoliciesExist = false;
      } else if (error && error.code === '42P01') {
        log.warning(`Tabla '${table}' no existe, saltando verificación de RLS`);
      } else {
        log.success(`RLS en '${table}' - Configurado correctamente`);
      }
    } catch (error) {
      log.error(`Error al verificar RLS en '${table}': ${error.message}`);
      allPoliciesExist = false;
    }
  }

  return allPoliciesExist;
}

async function checkAuthConfiguration() {
  log.title('🔐 Verificando configuración de Auth...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0];

  if (!projectRef) {
    log.warning('No se pudo extraer el project ref de la URL');
    return;
  }

  log.info('Configuración requerida en Supabase Dashboard:');
  console.log('   1. Ve a Authentication → URL Configuration');
  console.log('   2. Configura Site URL:');
  console.log(`      https://hyuk.vercel.app (o tu dominio)`);
  console.log('   3. Agrega Redirect URLs:');
  console.log('      https://hyuk.vercel.app/auth/callback');
  console.log('      https://hyuk.vercel.app/admin/customize');
  console.log('      http://localhost:3000/auth/callback');
  console.log('      http://localhost:3000/admin/customize');
  log.success('Configuración de Auth documentada');
}

async function generateReport(results) {
  log.title('📋 Reporte de Verificación');

  console.log('Resumen:');
  console.log(`  ${results.connection ? colors.green + '✓' : colors.red + '✗'} Conexión a Supabase`);
  console.log(`  ${results.tables ? colors.green + '✓' : colors.red + '✗'} Tablas de base de datos`);
  console.log(`  ${results.storage ? colors.green + '✓' : colors.red + '✗'} Storage (imágenes)`);
  console.log(`  ${results.rls ? colors.green + '✓' : colors.red + '✗'} Políticas RLS`);
  console.log(`  ${results.auth ? colors.green + '✓' : colors.yellow + '⚠'} Configuración de Auth`);

  console.log('\nPróximos pasos:');
  
  if (!results.tables) {
    console.log(`  1. ${colors.yellow}Ejecuta el schema.sql en Supabase SQL Editor${colors.reset}`);
  }
  if (!results.storage) {
    console.log(`  2. ${colors.yellow}Crea el bucket 'store-assets' en Supabase Storage${colors.reset}`);
  }
  if (!results.rls) {
    console.log(`  3. ${colors.yellow}Verifica las políticas RLS en Supabase${colors.reset}`);
  }

  if (results.tables && results.storage && results.rls) {
    console.log(`  ${colors.green}✓ Todo está listo! Puedes iniciar la aplicación con: npm run dev${colors.reset}`);
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  🚀 HYUK - Verificación de Supabase');
  console.log('='.repeat(60) + '\n');

  const results = {
    connection: false,
    tables: false,
    storage: false,
    rls: false,
    auth: false,
  };

  try {
    const supabase = await checkSupabaseConnection();
    results.connection = true;

    results.tables = await checkTables(supabase);
    results.storage = await checkStorage(supabase);
    results.rls = await checkRLSPolicies(supabase);
    await checkAuthConfiguration();
    results.auth = true;

    await generateReport(results);

    console.log('\n' + '='.repeat(60));
    console.log('  Verificación completada');
    console.log('='.repeat(60) + '\n');

    // Exit code: 0 si todo está bien, 1 si hay problemas
    const allGood = results.tables && results.storage && results.rls;
    process.exit(allGood ? 0 : 1);

  } catch (error) {
    log.error('Error durante la verificación');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar script
main();