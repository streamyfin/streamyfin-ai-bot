# Streamyfin AI Bot

A high-performance Discord AI bot built with **Bun** and **Drizzle ORM** featuring codebase embeddings, GitHub MCP integration, and conversation history.

## Tech Stack

- **Bun** - Ultra-fast JavaScript runtime & server
- **Drizzle ORM** - TypeScript-first SQL ORM
- **PostgreSQL + pgvector** - Vector database for embeddings
- **discord.js** - Discord bot client
- **Vercel AI SDK** - OpenAI integration with function calling
- **GitHub MCP** - Model Context Protocol for GitHub data
- **Docker** - Containerized deployment

## Features

- 🔍 **Semantic Code Search** - Natural language codebase queries
- 💬 **Context-Aware Chat** - Maintains last 100 messages per channel
- 🔗 **GitHub Integration** - Fetch issues and PRs in real-time
- ⚡ **Real-time Processing** - Immediate message responses
- 🚫 **Read-Only** - Information only, never modifies code
- 🐳 **Docker Ready** - Easy deployment with docker-compose
- 📊 **Drizzle Studio** - Visual database management

## Documentation

- 📖 [Quick Start Guide](docs/QUICKSTART.md)
- 📊 [Drizzle ORM Guide](docs/DRIZZLE_GUIDE.md)
- 🔌 [API Reference](docs/API.md)

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed
- Docker & Docker Compose
- Discord Bot Token
- OpenAI API Key
- GitHub Personal Access Token

### 1. Install

```bash
bun install
```

### 2. Configure Environment

```bash
cp env.example .env
```

Fill in your credentials in `.env`

### 3. Start Infrastructure

```bash
docker-compose -f docker-compose.local.yml up -d
```

### 4. Generate Drizzle Schema & Migrate

```bash
# Generate migrations from schema
bun run db:generate

# Run migrations
bun run db:migrate
```

### 5. Start Bot

```bash
bun start
```

### 6. Sync Streamyfin Codebase

Once the bot is running, trigger the sync:

```bash
curl -X POST http://localhost:3000/api/streamyfin/sync
```

This will fetch and embed the entire Streamyfin codebase from GitHub automatically (no local cloning needed).

### 7. Interact in Discord

Mention your bot:
```
@YourBot what is the authentication flow?
```

## Commands

```bash
bun start                # Start bot server
bun dev                  # Start with auto-reload
bun run db:generate      # Generate Drizzle migrations
bun run db:migrate       # Run database migrations
bun run db:studio        # Open Drizzle Studio (database GUI)
bun run embeddings:init  # Generate embeddings
bun run bot:test         # Test bot connection only
```

## Drizzle Studio

Visual database management UI:

```bash
bun run db:studio
```

Opens at `https://local.drizzle.studio`

View and edit:
- Embeddings
- Message history
- GitHub cache

## Database Schema (Drizzle)

Located in `src/lib/db/schema.ts`:

```typescript
// Embeddings with vector search
export const embeddings = pgTable('embeddings', {
  id: serial('id').primaryKey(),
  filePath: text('file_path').notNull(),
  content: text('content').notNull(),
  vector: vector('vector', { dimensions: 1536 }),
  metadata: jsonb('metadata'),
  // ...
});

// Message history
export const messageHistory = pgTable('message_history', {
  id: serial('id').primaryKey(),
  channelId: text('channel_id').notNull(),
  messageId: text('message_id').notNull(),
  content: text('content').notNull(),
  // ...
});

// GitHub cache
export const githubCache = pgTable('github_cache', {
  id: serial('id').primaryKey(),
  cacheKey: text('cache_key').notNull().unique(),
  data: jsonb('data').notNull(),
  // ...
});
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Search Embeddings
```bash
curl -X POST http://localhost:3000/api/embeddings/search \
  -H "Content-Type: application/json" \
  -d '{"query": "authentication", "limit": 5}'
```

### Sync Streamyfin Codebase
```bash
curl -X POST http://localhost:3000/api/streamyfin/sync \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "fredrikburmester",
    "repo": "streamyfin",
    "branch": "develop",
    "forceRegenerate": false
  }'
```

This will:
1. Fetch all repository files via GitHub API
2. Generate embeddings for all files (on-demand, no cloning)
3. Make the codebase searchable by the bot

**Benefits:**
- ✅ No disk space needed
- ✅ Always up-to-date
- ✅ No git dependencies
- ✅ Faster initial setup

### Generate Embeddings (For any repo)
```bash
curl -X POST http://localhost:3000/api/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "username",
    "repo": "repository",
    "branch": "main",
    "forceRegenerate": false
  }'
```

## Discord Bot Capabilities

The bot can:
- **Search codebase**: "Find the user authentication code"
- **Get file content**: "Show me the database schema"
- **List GitHub issues**: "What are the open issues?"
- **Get specific issue**: "Tell me about issue #123"
- **List PRs**: "What pull requests are open?"
- **Get specific PR**: "Details on PR #45"

## Discord Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create application → Add Bot
3. Enable intents:
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT
4. Get credentials for `.env`
5. Invite bot with this URL:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&permissions=274878221376&scope=bot
```

## Project Structure

```
/
├── server.ts                 # Main Bun server
├── drizzle.config.ts         # Drizzle configuration
├── drizzle/                  # Generated migrations
├── src/
│   ├── lib/
│   │   ├── ai/              # AI chat, tools, prompts
│   │   ├── db/              
│   │   │   ├── schema.ts    # Drizzle schema
│   │   │   ├── client.ts    # Drizzle client
│   │   │   └── migrate.ts   # Migration runner
│   │   ├── discord/         # Discord bot client
│   │   ├── embeddings/      # Vector embeddings
│   │   ├── github/          
│   │   │   ├── api.ts       # GitHub API client
│   │   │   └── mcp-client.ts # GitHub MCP client
│   │   └── message-history/ # Chat history
├── scripts/                  # Utility scripts
└── docker-compose.yml       # Multi-container setup
```

## Production Deployment

### Using Docker

```bash
docker-compose up -d
```

### On Dokploy

1. Push to Git repository
2. Create new app in Dokploy
3. Select Docker Compose deployment
4. Set environment variables
5. Deploy

## Why Drizzle?

- ✅ **TypeScript-first** - Full type safety
- ✅ **SQL-like API** - If you know SQL, you know Drizzle
- ✅ **Zero dependencies** - Lightweight and fast
- ✅ **Serverless-ready** - Perfect for edge deployments
- ✅ **Drizzle Studio** - Visual database management
- ✅ **Auto-migrations** - Generate migrations from schema

## Performance

- ⚡ ~3x faster server startup vs Node.js
- ⚡ ~2x faster HTTP requests
- ⚡ Native TypeScript support (no transpilation)
- ⚡ Type-safe queries with Drizzle

## Configuration

### System Prompt
Edit `src/lib/ai/prompt.ts`

### Embedding Settings
Edit `src/lib/embeddings/chunker.ts`

### Database Schema
Edit `src/lib/db/schema.ts` then run `bun run db:generate`

## Troubleshooting

### Bot offline in Discord
- Enable **MESSAGE CONTENT INTENT** in Discord Dev Portal
- Verify `DISCORD_TOKEN` is correct

### Database errors
```bash
# Check PostgreSQL
docker ps | grep postgres

# Open Drizzle Studio
bun run db:studio
```

### Regenerate migrations
```bash
bun run db:generate
bun run db:migrate
```

## Learn More

- [Quick Start Guide](docs/QUICKSTART.md) - Detailed setup instructions
- [Drizzle ORM Guide](docs/DRIZZLE_GUIDE.md) - Database operations and patterns

## License

MIT
