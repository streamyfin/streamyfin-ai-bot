import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { createHash } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { embeddings } from "../db/schema";
import { chunkCode, CodeChunk } from "./chunker";
import { listRepositoryFiles, getMultipleFiles } from "../github/api";

export interface GenerateEmbeddingsOptions {
  owner: string;
  repo: string;
  branch?: string;
  forceRegenerate?: boolean;
}

export async function generateEmbeddingsFromGitHub(
  options: GenerateEmbeddingsOptions
): Promise<number> {
  const { owner, repo, branch = "develop", forceRegenerate = false } = options;

  console.log(`Fetching repository: ${owner}/${repo}@${branch}`);

  // Get list of all supported files
  const fileList = await listRepositoryFiles(owner, repo, branch);
  console.log(`Found ${fileList.length} files to process`);

  let totalChunks = 0;

  // Process files in batches
  const batchSize = 10;
  for (let i = 0; i < fileList.length; i += batchSize) {
    const batch = fileList.slice(i, i + batchSize);
    const paths = batch.map((f) => f.path);

    console.log(
      `\nFetching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        fileList.length / batchSize
      )}...`
    );
    const files = await getMultipleFiles(owner, repo, paths, branch);

    for (const file of files) {
      try {
        const contentHash = createHash("sha256")
          .update(file.content)
          .digest("hex");

        // Check if file already processed with same content
        if (!forceRegenerate) {
          const existing = await db
            .select({ count: sql<number>`count(*)` })
            .from(embeddings)
            .where(
              and(
                eq(embeddings.filePath, file.path),
                eq(embeddings.contentHash, contentHash)
              )
            );

          if (existing[0] && Number(existing[0].count) > 0) {
            console.log(`Skipping ${file.path} (already processed)`);
            continue;
          }
        }

        // Delete old embeddings for this file
        await db.delete(embeddings).where(eq(embeddings.filePath, file.path));

        // Chunk the file and filter out empty chunks
        const allChunks = chunkCode(file.content, file.path);
        const chunks = allChunks.filter(
          (chunk) => chunk.content.trim().length > 0
        );

        if (chunks.length === 0) {
          console.log(`Skipping ${file.path} (no valid chunks)`);
          continue;
        }

        console.log(`Processing ${file.path}: ${chunks.length} chunks`);

        // Generate embeddings in batches
        const embeddingBatchSize = 100;
        for (let j = 0; j < chunks.length; j += embeddingBatchSize) {
          const chunkBatch = chunks.slice(j, j + embeddingBatchSize);
          await processBatch(file.path, contentHash, chunkBatch, j);
        }

        totalChunks += chunks.length;
      } catch (error) {
        console.error(`Error processing ${file.path}:`, error);
      }
    }
  }

  console.log(`✓ Generated embeddings for ${totalChunks} chunks`);
  return totalChunks;
}

async function processBatch(
  filePath: string,
  contentHash: string,
  chunks: CodeChunk[],
  startIndex: number
): Promise<void> {
  // Double-check: filter out any empty chunks
  const validChunks = chunks.filter((chunk) => chunk.content.trim().length > 0);

  if (validChunks.length === 0) {
    console.log(`Skipping batch for ${filePath} (no valid chunks)`);
    return;
  }

  const texts = validChunks.map((chunk) => chunk.content);

  const { embeddings: vectors } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: texts,
  });

  // Insert embeddings into database
  const values = validChunks.map((chunk, i) => ({
    filePath,
    content: chunk.content,
    contentHash,
    chunkIndex: startIndex + i,
    vector: vectors[i],
    metadata: {
      ...chunk.metadata,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
    },
  }));

  await db.insert(embeddings).values(values);
}
