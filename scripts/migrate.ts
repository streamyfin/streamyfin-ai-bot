import { sql as rawSql } from '../src/lib/db/client';
import { runMigrations } from '../src/lib/db/migrate';

async function main() {
  console.log('Setting up database...\n');
  
  try {
    // Enable pgvector extension first
    console.log('Enabling pgvector extension...');
    await rawSql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('✓ pgvector extension enabled\n');

    // Run Drizzle migrations
    await runMigrations();
    
    // Test pgvector
    const result = await rawSql`SELECT '[1,2,3]'::vector`;
    console.log('✓ pgvector is working\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

main();
