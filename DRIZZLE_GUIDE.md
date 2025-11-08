# Drizzle ORM Guide for Streamyfin AI Bot

## What is Drizzle?

Drizzle is a TypeScript ORM that provides:
- ✅ **Type-safe queries** - Auto-completion and type checking
- ✅ **SQL-like syntax** - Familiar to SQL developers
- ✅ **Zero dependencies** - Lightweight and fast
- ✅ **Drizzle Studio** - Visual database management UI

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

This installs:
- `drizzle-orm` - ORM runtime
- `drizzle-kit` - CLI tool for migrations
- `postgres` - PostgreSQL driver (faster than `pg`)

### 2. Define Schema

Schema is in `src/lib/db/schema.ts`:

```typescript
import { pgTable, serial, text, vector } from 'drizzle-orm/pg-core';

export const embeddings = pgTable('embeddings', {
  id: serial('id').primaryKey(),
  filePath: text('file_path').notNull(),
  vector: vector('vector', { dimensions: 1536 }),
  metadata: jsonb('metadata'),
});
```

### 3. Generate Migrations

After changing schema:

```bash
bun run db:generate
```

This creates SQL migration files in `drizzle/` directory.

### 4. Run Migrations

```bash
bun run db:migrate
```

Applies migrations to database.

## Using Drizzle in Code

### Import Client

```typescript
import { db } from './src/lib/db/client';
import { embeddings } from './src/lib/db/schema';
```

### Insert Data

```typescript
await db.insert(embeddings).values({
  filePath: '/path/to/file.ts',
  content: 'console.log("hello")',
  vector: '[0.1, 0.2, 0.3]',
});
```

### Select Data

```typescript
import { eq } from 'drizzle-orm';

// Select all
const all = await db.select().from(embeddings);

// With conditions
const results = await db.select()
  .from(embeddings)
  .where(eq(embeddings.filePath, '/path/to/file.ts'));

// With limit and order
const latest = await db.select()
  .from(embeddings)
  .orderBy(desc(embeddings.createdAt))
  .limit(10);
```

### Update Data

```typescript
await db.update(embeddings)
  .set({ content: 'new content' })
  .where(eq(embeddings.id, 1));
```

### Delete Data

```typescript
await db.delete(embeddings)
  .where(eq(embeddings.id, 1));
```

### Complex Queries

```typescript
import { sql, and, like, gt } from 'drizzle-orm';

// Vector similarity search
const results = await db.select({
  filePath: embeddings.filePath,
  similarity: sql<number>`1 - (${embeddings.vector} <=> ${queryVector}::vector)`,
})
.from(embeddings)
.where(sql`1 - (${embeddings.vector} <=> ${queryVector}::vector) > 0.7`)
.orderBy(sql`similarity DESC`)
.limit(5);

// Multiple conditions
const filtered = await db.select()
  .from(embeddings)
  .where(and(
    like(embeddings.filePath, '%auth%'),
    gt(embeddings.chunkIndex, 0)
  ));
```

## Drizzle Studio

Visual database management UI:

```bash
bun run db:studio
```

Opens at `https://local.drizzle.studio`

Features:
- Browse all tables
- View and edit data
- Execute custom queries
- Export data

## Common Patterns

### Check if Exists

```typescript
const existing = await db.select()
  .from(embeddings)
  .where(eq(embeddings.filePath, filePath))
  .limit(1);

if (existing.length > 0) {
  // Record exists
}
```

### Upsert (Insert or Ignore)

```typescript
await db.insert(messageHistory)
  .values({ channelId, messageId, content })
  .onConflictDoNothing();
```

### Get Count

```typescript
import { sql } from 'drizzle-orm';

const result = await db.select({ 
  count: sql<number>`count(*)` 
})
.from(embeddings);

const total = Number(result[0].count);
```

### Batch Insert

```typescript
const values = [
  { filePath: 'file1.ts', content: 'content1' },
  { filePath: 'file2.ts', content: 'content2' },
];

await db.insert(embeddings).values(values);
```

## Type Safety

Drizzle provides full type inference:

```typescript
// ✅ Type-safe
const result = await db.select().from(embeddings);
// result is typed as Embedding[]

// ✅ Auto-completion
result[0].filePath; // TypeScript knows this exists
result[0].content;  // Auto-completes available fields

// ❌ Type error
result[0].nonexistent; // TypeScript error: property doesn't exist
```

## Schema Changes Workflow

1. **Edit schema** in `src/lib/db/schema.ts`

```typescript
export const embeddings = pgTable('embeddings', {
  id: serial('id').primaryKey(),
  filePath: text('file_path').notNull(),
  // Add new field
  language: text('language'),
});
```

2. **Generate migration**

```bash
bun run db:generate
```

3. **Review migration** in `drizzle/` folder

4. **Apply migration**

```bash
bun run db:migrate
```

5. **Update TypeScript types** (automatic!)

## Comparison with Raw SQL

### Raw SQL (old way)

```typescript
import { query } from './db/client';

const result = await query(
  'SELECT * FROM embeddings WHERE file_path = $1',
  [filePath]
);

// No type safety, manual parameter handling
```

### Drizzle (new way)

```typescript
import { db } from './db/client';
import { embeddings } from './db/schema';
import { eq } from 'drizzle-orm';

const result = await db.select()
  .from(embeddings)
  .where(eq(embeddings.filePath, filePath));

// ✅ Type-safe
// ✅ Auto-completion
// ✅ SQL injection protection
```

## Performance

Drizzle is designed for performance:
- No runtime overhead
- Generates optimal SQL
- Connection pooling built-in
- Prepared statements by default

## Migration Files

Located in `drizzle/` directory:

```
drizzle/
├── 0000_init.sql
├── 0001_add_language.sql
└── meta/
    ├── _journal.json
    └── 0000_snapshot.json
```

These are auto-generated and should be committed to git.

## Troubleshooting

### Migration conflicts

```bash
# Reset migrations (⚠️ drops all data)
docker-compose down -v
docker-compose up -d postgres
bun run db:migrate
```

### Type errors after schema change

```bash
# Regenerate types
bun run db:generate
```

### View generated SQL

```typescript
import { sql } from 'drizzle-orm';

const query = db.select().from(embeddings).toSQL();
console.log(query.sql);
console.log(query.params);
```

## Best Practices

1. **Always use transactions for multiple operations**

```typescript
await db.transaction(async (tx) => {
  await tx.insert(embeddings).values(...);
  await tx.update(messageHistory).set(...);
});
```

2. **Use indexes for performance**

```typescript
export const embeddings = pgTable('embeddings', {
  // ...
}, (table) => ({
  filePathIdx: index('file_path_idx').on(table.filePath),
}));
```

3. **Validate data with Zod**

```typescript
import { z } from 'zod';

const insertSchema = z.object({
  filePath: z.string().min(1),
  content: z.string(),
});

const data = insertSchema.parse(userInput);
await db.insert(embeddings).values(data);
```

## Resources

- [Drizzle Docs](https://orm.drizzle.team/)
- [Drizzle with PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview)
- [pgvector with Drizzle](https://orm.drizzle.team/docs/extensions/pg#pgvector)



