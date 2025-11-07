import { loginDiscordBot } from "./src/lib/discord/client";
import { searchEmbeddings } from "./src/lib/embeddings/search";
import { generateEmbeddingsFromGitHub } from "./src/lib/embeddings/generator";
import { db, sql } from "./src/lib/db/client";

console.log("🚀 Starting Streamyfin AI Bot with Bun...\n");

// Initialize Discord bot
await loginDiscordBot();

// Bot API server using Bun.serve
const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint
      if (url.pathname === "/health" || url.pathname === "/") {
        await sql`SELECT 1`;

        return Response.json(
          {
            status: "healthy",
            timestamp: new Date().toISOString(),
            bot: "running",
            services: {
              database: "up",
              discord: "connected",
            },
          },
          { headers: corsHeaders }
        );
      }

      // Embed Streamyfin repository from GitHub
      if (url.pathname === "/api/streamyfin/sync" && req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const {
          owner = "fredrikburmester",
          repo = "streamyfin",
          branch = "develop",
          forceRegenerate = false,
        } = body;

        // Process asynchronously
        (async () => {
          try {
            console.log(`\n🔄 Starting Streamyfin sync...`);
            console.log(`   Repository: ${owner}/${repo}@${branch}`);

            // Fetch files from GitHub and generate embeddings
            const totalChunks = await generateEmbeddingsFromGitHub({
              owner,
              repo,
              branch,
              forceRegenerate,
            });

            console.log(`\n✅ Streamyfin sync complete!`);
            console.log(`   - Repository: ${owner}/${repo}`);
            console.log(`   - Branch: ${branch}`);
            console.log(`   - Embeddings: ${totalChunks} chunks`);
          } catch (error) {
            console.error("❌ Streamyfin sync failed:", error);
          }
        })();

        return Response.json(
          {
            success: true,
            message: "Streamyfin sync started",
            repository: `${owner}/${repo}`,
            branch,
          },
          { headers: corsHeaders }
        );
      }

      // Generate embeddings endpoint
      if (
        url.pathname === "/api/embeddings/generate" &&
        req.method === "POST"
      ) {
        const body = await req.json();
        const {
          owner = "fredrikburmester",
          repo = "streamyfin",
          branch = "develop",
          forceRegenerate = false,
        } = body;

        // Generate embeddings asynchronously (don't await)
        generateEmbeddingsFromGitHub({
          owner,
          repo,
          branch,
          forceRegenerate,
        })
          .then((totalChunks) => {
            console.log(`✓ Generated ${totalChunks} embeddings`);
          })
          .catch((error) => {
            console.error("Error generating embeddings:", error);
          });

        return Response.json(
          {
            success: true,
            message: "Embedding generation started",
            repository: `${owner}/${repo}`,
            branch,
          },
          { headers: corsHeaders }
        );
      }

      // Search embeddings endpoint
      if (url.pathname === "/api/embeddings/search" && req.method === "POST") {
        const body = await req.json();
        const { query, limit = 5, threshold = 0.7 } = body;

        if (!query) {
          return Response.json(
            { error: "Query is required" },
            { status: 400, headers: corsHeaders }
          );
        }

        const results = await searchEmbeddings(query, limit, threshold);

        return Response.json(
          {
            success: true,
            results,
          },
          { headers: corsHeaders }
        );
      }

      // Default response
      return Response.json(
        {
          name: "Streamyfin AI Bot",
          status: "running",
          version: "1.0.0",
          endpoints: {
            health: "GET /",
            syncStreamyfin: "POST /api/streamyfin/sync",
            generateEmbeddings: "POST /api/embeddings/generate",
            searchEmbeddings: "POST /api/embeddings/search",
          },
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      console.error("API Error:", error);
      return Response.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500, headers: corsHeaders }
      );
    }
  },
});

console.log(`\n✓ Bot server running on http://localhost:${server.port}`);
console.log(`✓ Health check: http://localhost:${server.port}/health`);
console.log("\nAvailable endpoints:");
console.log(`  - GET  /health`);
console.log(`  - POST /api/streamyfin/sync`);
console.log(`  - POST /api/embeddings/generate`);
console.log(`  - POST /api/embeddings/search\n`);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\nShutting down...");
  server.stop();
  process.exit(0);
});
