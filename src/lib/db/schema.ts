import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  vector,
  jsonb,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Embeddings table for code and documentation
export const embeddings = pgTable(
  "embeddings",
  {
    id: serial("id").primaryKey(),
    filePath: text("file_path").notNull(),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    vector: vector("vector", { dimensions: 1536 }).notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    filePathChunkIdx: uniqueIndex("embeddings_file_path_chunk_idx").on(
      table.filePath,
      table.chunkIndex
    ),
    vectorIdx: index("embeddings_vector_idx").using(
      "hnsw",
      table.vector.op("vector_cosine_ops")
    ),
    filePathIdx: index("embeddings_file_path_idx").on(table.filePath),
    contentHashIdx: index("embeddings_content_hash_idx").on(table.contentHash),
  })
);

// Message history for Discord channels
export const messageHistory = pgTable(
  "message_history",
  {
    id: serial("id").primaryKey(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id").notNull(),
    content: text("content").notNull(),
    authorId: text("author_id").notNull(),
    authorName: text("author_name").notNull(),
    isBot: boolean("is_bot").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    channelMessageIdx: uniqueIndex("message_history_channel_message_idx").on(
      table.channelId,
      table.messageId
    ),
    channelCreatedIdx: index("message_history_channel_created_idx").on(
      table.channelId,
      table.createdAt
    ),
  })
);

// GitHub cache for reducing API calls
export const githubCache = pgTable(
  "github_cache",
  {
    id: serial("id").primaryKey(),
    cacheKey: text("cache_key").notNull().unique(),
    data: jsonb("data").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    keyExpiresIdx: index("github_cache_key_expires_idx").on(
      table.cacheKey,
      table.expiresAt
    ),
  })
);

// Types
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;

export type MessageHistory = typeof messageHistory.$inferSelect;
export type NewMessageHistory = typeof messageHistory.$inferInsert;

export type GithubCache = typeof githubCache.$inferSelect;
export type NewGithubCache = typeof githubCache.$inferInsert;
