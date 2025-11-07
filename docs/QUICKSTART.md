# Quick Start Guide - Streamyfin AI Bot with Bun

## Prerequisites

- Bun installed: `curl -fsSL https://bun.sh/install | bash`
- Docker and Docker Compose
- Discord Bot Token & Credentials
- OpenAI API Key
- GitHub Token

## Step 1: Install Dependencies

```bash
bun install
```

## Step 2: Start Infrastructure

```bash
# Start PostgreSQL with pgvector and GitHub MCP server
docker-compose -f docker-compose.local.yml up -d

# Wait for services to be ready (check with docker ps)
```

## Step 3: Configure Environment

Create `.env` file:

```bash
cp .env.local.example .env
```

Fill in your credentials:

```bash
# Discord (from Discord Developer Portal)
DISCORD_TOKEN=<Your Bot Token>
DISCORD_APPLICATION_ID=<Your Application ID>
DISCORD_PUBLIC_KEY=<Your Public Key>

# OpenAI
OPENAI_API_KEY=sk-...

# Database (already configured for local)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamyfin_bot

# GitHub
GITHUB_TOKEN=ghp_...
GITHUB_MCP_SERVER_URL=http://localhost:3001

# App
NODE_ENV=development
PORT=3000
CODEBASE_PATH=./codebase
PROJECT_NAME=Streamyfin
```

## Step 4: Setup Database

```bash
# Generate Drizzle migrations from schema
bun run db:generate

# Apply migrations to database
bun run db:migrate
```

Expected output:
```
Enabling pgvector extension...
✓ pgvector extension enabled

Running migrations...
✓ Migrations completed successfully
✓ pgvector is working
```

## Step 5: Prepare Codebase for Embeddings

```bash
# Create codebase directory
mkdir -p codebase

# Copy your project files to codebase/
# For example:
cp -r ../your-project/* codebase/
```

## Step 6: Generate Embeddings

```bash
bun run embeddings:init
```

This will:
- Scan all files in `./codebase`
- Generate embeddings using OpenAI
- Store in PostgreSQL with pgvector

To force regenerate all embeddings:
```bash
bun run embeddings:init --force
```

## Step 7: Start the Bot Server

```bash
bun start
```

Expected output:
```
🚀 Starting Streamyfin AI Bot with Bun...

Logging in to Discord...
✓ Discord bot ready as YourBot#1234
Bot ID: 1234567890
Servers: 1
  - Your Server Name (9876543210)

✓ Bot server running on http://localhost:3000
✓ Health check: http://localhost:3000/health
```

## Step 8: Test the Bot

### Option A: Test in Discord

Mention your bot in a Discord channel:
```
@YourBot what is the authentication flow?
```

Check logs:
```
[MESSAGE] YourUsername: @YourBot what is the authentication flow?
  ↳ Processing (mention)
```

The bot will reply immediately with "Thinking..." then edit the message with the AI response.

### Option B: Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-07T12:00:00.000Z",
  "bot": "running"
}
```

## Bot Features

The bot can:
1. **Search codebase** - "Find the database schema"
2. **Get file content** - "Show me the API routes"
3. **List GitHub issues** - "What are the open issues?"
4. **Get specific issue** - "Tell me about issue #123"
5. **List PRs** - "Show me open pull requests"
6. **Get specific PR** - "Details on PR #45"

## Performance Benefits with Bun

- ⚡ **25x faster** package installs vs npm
- ⚡ **~28x faster** script execution vs npm run
- ⚡ **Native TypeScript** - no transpilation needed
- ⚡ **Built-in APIs** - optimized file I/O and HTTP server

## Troubleshooting

### Bot shows offline ❌

Check Discord Developer Portal:
1. Bot → Enable **MESSAGE CONTENT INTENT**
2. Bot → Enable **SERVER MEMBERS INTENT**
3. Regenerate token if needed

### Database connection error

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
docker exec -it streamyfin-postgres-local psql -U postgres -d streamyfin_bot -c "SELECT 1;"
```

### Embeddings error: "no such directory"

```bash
# Make sure codebase directory exists
mkdir -p codebase

# Add some files
echo "console.log('test')" > codebase/test.ts
```

### GitHub MCP not working

```bash
# Check MCP server is running
docker logs streamyfin-github-mcp-local

# Verify GitHub token has correct permissions
# Token needs: repo, read:org
```

## Commands Reference

```bash
# Development
bun start                  # Start bot server with job processor
bun run dev                # Start Next.js (if using web UI)
bun run bot:test           # Test bot connection only

# Database
bun run db:migrate         # Run migrations

# Embeddings
bun run embeddings:init    # Generate embeddings
bun run embeddings:init --force  # Force regenerate

# Docker
docker-compose -f docker-compose.local.yml up -d    # Start infra
docker-compose -f docker-compose.local.yml down     # Stop infra
docker-compose -f docker-compose.local.yml logs -f  # View logs
```

## Next Steps

1. **Add more code** to `./codebase` and regenerate embeddings
2. **Configure system prompt** in `src/lib/ai/prompt.ts`
3. **Add custom tools** in `src/lib/ai/tools.ts`
4. **Deploy to production** using `docker-compose.yml`

## Production Deployment

See main README.md for Docker deployment instructions.

For Dokploy:
1. Push to Git
2. Create app in Dokploy
3. Use `docker-compose.yml`
4. Set environment variables
5. Deploy!
