import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { db } from "../db/client";
import { embeddings } from "../db/schema";
import { sql, gt, like } from "drizzle-orm";

export interface SearchResult {
  id?: number;
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
  score?: number;
}

export async function searchEmbeddings(
  searchQuery: string,
  limit: number = 5,
  similarityThreshold: number = 0.1,
  learn: boolean = false
): Promise<SearchResult[]> {
  // Generate embedding for search query
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-large"),
    value: searchQuery,
  });

  const vectorString = `[${embedding.join(",")}]`;

  const originalLimit = limit;
  if (learn && limit <= 20) limit = Math.max(limit * 5, 20);

  // Search for similar embeddings using cosine similarity
  const results = await db
    .select({
      id: embeddings.id,
      filePath: embeddings.filePath,
      content: embeddings.content,
      similarity: sql<number>`1 - (${embeddings.vector} <=> ${vectorString}::vector)`,
      metadata: embeddings.metadata,
    })
    .from(embeddings)
    .where(
      sql`1 - (${embeddings.vector} <=> ${vectorString}::vector) > ${similarityThreshold}`
    )
    .orderBy(sql`1 - (${embeddings.vector} <=> ${vectorString}::vector) DESC`)
    .limit(limit);

  if (learn) {
    const weight = 0.2; //0.08-0.5
    const scored = results.map((r) => {
      const meta: any = r.metadata || {};
      let feedbackScore = typeof meta.feedbackScore === 'number' ? meta.feedbackScore : (Number(meta.feedbackScore) || 0);
      // Normalize feedbackScore using a sigmoid-like transformation to bound it between -1 and 1.
      // This reduces the impact of extreme feedback values and ensures the score remains stable.
      feedbackScore = feedbackScore / (1 + Math.abs(feedbackScore));
      const score = r.similarity + (weight * feedbackScore);
      return {
        id: r.id,
        filePath: r.filePath,
        content: r.content,
        similarity: r.similarity,
        metadata: r.metadata as any,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, originalLimit).map((r) => ({
      id: r.id,
      filePath: r.filePath,
      content: r.content,
      similarity: r.similarity,
      metadata: r.metadata,
      score: r.score,
    }));
  }

  return results.map((row) => ({
    id: row.id,
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
  const results = await db
    .select()
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


export async function getTopAIMessagesForQuery(query: string, limit: number = 2): Promise<{ content: string, feedbackScore: number }[]> {
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-large"),
    value: query,
  });

  const vectorString = `[${embedding.join(",")}]`;

  const results = await db
    .select({
      id: embeddings.id,
      content: embeddings.content,
      feedbackScore: sql<number>`(metadata->>'feedbackScore')::float`,
      similarity: sql<number>`1 - (${embeddings.vector} <=> ${vectorString}::vector)`,
    })
    .from(embeddings)
    .where(sql`
      metadata->>'source' = 'ai_response'
      AND 1 - (${embeddings.vector} <=> ${vectorString}::vector) > 0.1
    `)
    .orderBy(
      sql`1 - (${embeddings.vector} <=> ${vectorString}::vector) DESC`,
      sql`(metadata->>'feedbackScore')::float DESC`)
    .limit(limit);

  return results.map(r => ({ content: r.content, feedbackScore: r.feedbackScore ?? 0 }));
}