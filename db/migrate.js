/**
 * Script de Migración e Inicialización de Base de Datos PostgreSQL
 * Ejecuta `db/schema.sql` y opcionalmente `db/seed.sql` en la base de datos remota o local.
 * 
 * Uso:
 *   DATABASE_URL="tu_url_aqui" node db/migrate.js
 *   npm run db:setup
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Cargar variables de entorno locales si existe un archivo .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const DATABASE_URL = process.env.DATABASE_URL;

async function runMigration() {
  console.log('====================================================');
  console.log(' Inicializador de Esquema PostgreSQL - Reconocimiento Hospitalario');
  console.log('====================================================');

  if (!DATABASE_URL) {
    console.error('\n❌ ERROR: La variable de entorno DATABASE_URL no está configurada.');
    console.error('Proporciona una URL de PostgreSQL (ej. Supabase o Neon):');
    console.error('  Windows PowerShell: $env:DATABASE_URL="tu_url"; node db/migrate.js');
    console.error('  Linux / Mac:        DATABASE_URL="tu_url" node db/migrate.js\n');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📡 Conectando a la base de datos...');
    const client = await pool.connect();
    console.log('✅ Conexión establecida con éxito.\n');

    // 1. Ejecutar Schema DDL
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('📄 Aplicando esquema DDL (db/schema.sql)...');
    await client.query(schemaSql);
    console.log('✅ Tablas e índices creados o verificados (funcionarios, reconocimientos, ciclos_reconocimiento).\n');

    // 2. Preguntar o aplicar datos semilla si está vacía
    const checkCount = await client.query('SELECT COUNT(*) as count FROM funcionarios');
    const currentUsers = parseInt(checkCount.rows[0].count, 10);

    if (currentUsers === 0) {
      console.log('🌱 La tabla funcionarios está vacía. Aplicando datos semilla (db/seed.sql)...');
      const seedPath = path.join(__dirname, 'seed.sql');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await client.query(seedSql);
      console.log('✅ Datos semilla insertados (admin + funcionarios de prueba).\n');
    } else {
      console.log(`ℹ️ La base de datos ya contiene ${currentUsers} funcionarios registrados.`);
      console.log('   (Se omitió seed.sql para proteger los datos existentes).\n');
    }

    client.release();
    console.log('🎉 Migración completada con éxito.');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ Error ejecutando la migración:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
