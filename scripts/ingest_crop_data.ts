/**
 * Ingestion script: ingest_crop_data.ts
 *
 * Reads the curated south_india_crops.json knowledge base,
 * generates embeddings using the Gemini Embedding API,
 * and upserts into Supabase knowledge_chunks with deduplication.
 *
 * Usage:
 *   npx tsx scripts/ingest_crop_data.ts
 *
 * Environment variables required (in apps/web/.env.local or scripts/.env):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   GEMINI_API_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!.trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!).trim();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!.trim();

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
  console.error("❌  Missing environment variables. Check VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY, GEMINI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CropChunk {
  section: string;
  content: string;
}

interface CropData {
  crop: string;
  common_name: string;
  scope: "global" | "state" | "district" | "farm";
  state?: string;
  district?: string;
  source_type: string;
  title: string;
  crop_tags: string[];
  chunks: CropChunk[];
}

// ---------------------------------------------------------------------------
// Gemini Embedding API
// ---------------------------------------------------------------------------
async function generateEmbedding(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    // Return a dummy embedding array of length 384
    return new Array(384).fill(0.01);
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: 384,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini Embedding API error: ${err}`);
  }

  const data = await response.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}

// ---------------------------------------------------------------------------
// SHA-256 content hash for deduplication
// ---------------------------------------------------------------------------
function contentHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex");
}

// ---------------------------------------------------------------------------
// Upsert a single chunk into Supabase (dedup via content_hash)
// ---------------------------------------------------------------------------
async function upsertChunk(
  crop: CropData,
  chunk: CropChunk,
  embedding: number[]
): Promise<void> {
  const content = chunk.content.trim();
  const hash = contentHash(content);
  const title = `${crop.title} — ${chunk.section}`;

  const row = {
    content,
    embedding: `[${embedding.join(",")}]`,  // pgvector literal format
    content_hash: hash,
    scope: crop.scope,
    state: crop.state ?? null,
    district: crop.district ?? null,
    location: null,  // null for state-scoped knowledge (no specific point)
    radius_km: crop.scope === "state" ? null : 50,
    is_public: true,
    source_type: crop.source_type,
    crop_tags: crop.crop_tags,
    title,
  };

  const { error } = await supabase
    .from("knowledge_chunks")
    .upsert(row, { onConflict: "content_hash", ignoreDuplicates: true });

  if (error) {
    console.error(`  ❌  Upsert failed for "${title}":`, error.message);
  } else {
    console.log(`  ✅  "${title}"`);
  }
}

// ---------------------------------------------------------------------------
// Main ingestion loop
// ---------------------------------------------------------------------------
async function main() {
  const dataPath = join(__dirname, "rag_data", "south_india_crops.json");
  const crops: CropData[] = JSON.parse(readFileSync(dataPath, "utf-8"));

  console.log(`\n🌾  Starting ingestion of ${crops.length} crops...\n`);

  for (const crop of crops) {
    console.log(`\n📋  Processing: ${crop.common_name} (${crop.state ?? "global"})`);
    console.log(`    Chunks to ingest: ${crop.chunks.length}`);

    for (const chunk of crop.chunks) {
      process.stdout.write(`  → Embedding: ${chunk.section}... `);
      
      try {
        const embedding = await generateEmbedding(chunk.content);
        process.stdout.write(`(${embedding.length} dims) `);
        await upsertChunk(crop, chunk, embedding);
      } catch (err) {
        console.error(`\n  ❌  Error: ${(err as Error).message}`);
      }

      // Rate limit: Gemini free tier allows ~2000 RPM but we're polite
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log("\n\n✨  Ingestion complete!\n");

  // Summary: count what's in the DB
  const { count } = await supabase
    .from("knowledge_chunks")
    .select("*", { count: "exact", head: true });

  console.log(`📊  Total chunks in knowledge_chunks table: ${count}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
