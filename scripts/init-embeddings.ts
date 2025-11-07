import { generateEmbeddings } from '../src/lib/embeddings/generator';
import { closeConnection } from '../src/lib/db/client';

async function main() {
  const codebasePath = process.env.CODEBASE_PATH || './codebase';
  const forceRegenerate = Bun.argv.includes('--force');

  console.log('Initializing embeddings...');
  console.log(`Codebase path: ${codebasePath}`);
  console.log(`Force regenerate: ${forceRegenerate}`);

  try {
    const totalChunks = await generateEmbeddings(codebasePath, forceRegenerate);
    console.log(`\n✓ Successfully generated ${totalChunks} embeddings`);
    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('Failed to generate embeddings:', error);
    await closeConnection();
    process.exit(1);
  }
}

main();

