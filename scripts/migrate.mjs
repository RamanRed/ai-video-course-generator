#!/usr/bin/env node

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';

async function runMigrations() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL is not set');
      console.error('Make sure .env file has DATABASE_URL configured');
      process.exit(1);
    }

    console.log('🔄 Connecting to database...');
    const sql = neon(databaseUrl);
    const db = drizzle(sql);

    console.log('📦 Running migrations...');
    await migrate(db, { migrationsFolder: 'drizzle' });

    console.log('✅ Migrations completed successfully!');
    console.log('💾 Chat persistence tables have been created:');
    console.log('   - chat_conversations');
    console.log('   - chat_messages');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error);
    process.exit(1);
  }
}

runMigrations();
