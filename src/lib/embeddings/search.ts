import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { db } from '../db/client';
import { embeddings } from '../db/schema';
import { sql, gt, like } from 'drizzle-orm';

export interface SearchResult {
  filePath: string;
  content: string;
  similarity: number;
  metadata: {
    language?: string;
    startLine?: number;
    endLine?: number;
    hasImports?: boolean;
    hasExports?: boolean;
  };
}

export async function searchEmbeddings(
  searchQuery: string,
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<SearchResult[]> {
  // Generate embedding for search query
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: searchQuery,
  });

  const vectorString = `[${embedding.join(',')}]`;

  // Search for similar embeddings using cosine similarity
  const results = await db.select({
    filePath: embeddings.filePath,
    content: embeddings.content,
    similarity: sql<number>`1 - (${embeddings.vector} <=> ${vectorString}::vector)`,
    metadata: embeddings.metadata,
  })
  .from(embeddings)
  .where(sql`1 - (${embeddings.vector} <=> ${vectorString}::vector) > ${similarityThreshold}`)
  .orderBy(sql`1 - (${embeddings.vector} <=> ${vectorString}::vector) DESC`)
  .limit(limit);

  return results.map((row) => ({
    filePath: row.filePath,
    content: row.content,
    similarity: row.similarity,
    metadata: row.metadata as any,
  }));
}

export async function searchByFilePath(
  filePath: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const results = await db.select()
    .from(embeddings)
    .where(like(embeddings.filePath, `%${filePath}%`))
    .orderBy(embeddings.chunkIndex)
    .limit(limit);

  return results.map((row) => ({
    filePath: row.filePath,
    content: row.content,
    similarity: 1.0,
    metadata: row.metadata as any,
  }));
}
