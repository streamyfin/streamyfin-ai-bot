# API Reference

## Endpoints

### Health Check

**GET** `/health` or `/`

Check bot server health and database connection.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-07T12:00:00.000Z",
  "bot": "running",
  "services": {
    "database": "up",
    "discord": "connected"
  }
}
```

---

### Sync Streamyfin Codebase

**POST** `/api/streamyfin/sync`

Clone the Streamyfin repository and generate embeddings for all files.

**Request Body:**
```json
{
  "owner": "fredrikburmester",
  "repo": "streamyfin", 
  "branch": "main",
  "forceRegenerate": false
}
```

**Parameters:**
- `owner` (string, optional) - GitHub repository owner. Default: `"fredrikburmester"`
- `repo` (string, optional) - Repository name. Default: `"streamyfin"`
- `branch` (string, optional) - Branch to clone. Default: `"main"`
- `forceRegenerate` (boolean, optional) - Force regenerate all embeddings. Default: `false`

**Response:**
```json
{
  "success": true,
  "message": "Streamyfin sync started",
  "repository": "fredrikburmester/streamyfin",
  "branch": "main"
}
```

**Notes:**
- Returns immediately while processing in background
- Check server logs for progress
- Downloads entire repository to `CODEBASE_PATH/streamyfin`
- Automatically generates embeddings after cloning

**Example:**
```bash
curl -X POST http://localhost:3000/api/streamyfin/sync \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "fredrikburmester",
    "repo": "streamyfin",
    "branch": "main"
  }'
```

---

### Generate Embeddings

**POST** `/api/embeddings/generate`

Generate embeddings for files in the codebase directory.

**Request Body:**
```json
{
  "forceRegenerate": false
}
```

**Parameters:**
- `forceRegenerate` (boolean, optional) - Force regenerate all embeddings. Default: `false`

**Response:**
```json
{
  "success": true,
  "message": "Embedding generation started"
}
```

**Notes:**
- Returns immediately while processing in background
- Scans `CODEBASE_PATH` directory
- Skips already-embedded files unless `forceRegenerate` is true
- Check server logs for progress

**Example:**
```bash
curl -X POST http://localhost:3000/api/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{"forceRegenerate": false}'
```

---

### Search Embeddings

**POST** `/api/embeddings/search`

Semantic search over embedded code files.

**Request Body:**
```json
{
  "query": "user authentication flow",
  "limit": 5,
  "threshold": 0.7
}
```

**Parameters:**
- `query` (string, required) - Search query in natural language
- `limit` (number, optional) - Max results to return. Default: `5`
- `threshold` (number, optional) - Minimum similarity score (0-1). Default: `0.7`

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "filePath": "/app/codebase/streamyfin/src/auth.ts",
      "content": "export function authenticate(user) { ... }",
      "similarity": 0.92,
      "metadata": {
        "language": "typescript",
        "startLine": 10,
        "endLine": 25,
        "hasImports": true,
        "hasExports": true
      }
    }
  ]
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/embeddings/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "authentication middleware",
    "limit": 3,
    "threshold": 0.75
  }'
```

---

## Error Responses

All endpoints may return error responses:

```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad request (missing required parameters)
- `500` - Internal server error
- `503` - Service unhealthy

---

## CORS

All endpoints support CORS with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting in production.

---

## Webhooks

### Discord Webhook (Not implemented)

For production Discord bots, you may want to implement Discord interaction webhooks instead of WebSocket-based bots.

See: https://discord.com/developers/docs/interactions/receiving-and-responding

---

## Environment Variables

Configure the API via environment variables:

```bash
# Server
PORT=3000
NODE_ENV=production

# Paths
CODEBASE_PATH=/app/codebase

# Database
DATABASE_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=sk-...

# Discord
DISCORD_TOKEN=...
DISCORD_APPLICATION_ID=...
DISCORD_PUBLIC_KEY=...

# GitHub
GITHUB_TOKEN=ghp_...

# Streamyfin defaults
STREAMYFIN_OWNER=fredrikburmester
STREAMYFIN_REPO=streamyfin
STREAMYFIN_BRANCH=main
```

