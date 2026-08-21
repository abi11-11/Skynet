import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

const CHUNK_SIZE = 600;    // characters per chunk
const CHUNK_OVERLAP = 80;  // overlap between chunks for continuity

// ---------------------------------------------------------------------------
// Chunking: split text into overlapping segments
// ---------------------------------------------------------------------------
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk); // ignore tiny fragments
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// SHA-256 hash for deduplication
// ---------------------------------------------------------------------------
function contentHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex");
}

// ---------------------------------------------------------------------------
// Generate embedding via Gemini
// ---------------------------------------------------------------------------
async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${GEMINI_EMBED_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 384,
    }),
  });
  if (!res.ok) throw new Error(`Embedding API error: ${await res.text()}`);
  const data = await res.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body = await req.json() as {
      farm_id: string;
      farm_lat: number;
      farm_lng: number;
      farm_state: string;
      document_text: string;
      title: string;
      is_public: boolean;
      radius_km: number;
      crop_tags: string[];
      uploaded_by: string;
    };

    const {
      farm_id, farm_lat, farm_lng, farm_state,
      document_text, title, is_public, radius_km,
      crop_tags, uploaded_by
    } = body;

    if (!farm_id || !document_text || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: farm_id, document_text, title" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Chunk the document
    const chunks = chunkText(document_text);
    console.log(`📄 Document "${title}" → ${chunks.length} chunks`);

    let newChunks = 0;
    let dedupedChunks = 0;
    const chunkIds: number[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];
      const hash = contentHash(chunkContent);
      const chunkTitle = `${title} — Part ${i + 1}`;

      // Check deduplication: does this hash already exist?
      const { data: existing } = await supabase
        .from("knowledge_chunks")
        .select("id")
        .eq("content_hash", hash)
        .maybeSingle();

      let chunkId: number;

      if (existing) {
        // Chunk already exists — reuse it
        chunkId = existing.id;
        dedupedChunks++;
        console.log(`  ♻️  Deduped chunk ${i + 1}: "${chunkTitle}"`);
      } else {
        // New chunk — generate embedding and insert
        const embedding = await generateEmbedding(chunkContent);

        // Build location for PostGIS (only if coordinates provided and is_public)
        const locationValue = (is_public && farm_lat && farm_lng)
          ? `SRID=4326;POINT(${farm_lng} ${farm_lat})`
          : null;

        const { data: inserted, error: insertError } = await supabase
          .from("knowledge_chunks")
          .insert({
            content: chunkContent,
            embedding: `[${embedding.join(",")}]`,
            content_hash: hash,
            scope: is_public ? "district" : "farm",
            state: farm_state,
            district: null,
            location: locationValue,
            radius_km: is_public ? radius_km : null,
            is_public,
            source_type: "customer_upload",
            crop_tags: crop_tags ?? [],
            title: chunkTitle,
          })
          .select("id")
          .single();

        if (insertError || !inserted) {
          console.error(`Insert failed for chunk ${i + 1}:`, insertError?.message);
          continue;
        }

        chunkId = inserted.id;
        newChunks++;
        console.log(`  ✅  New chunk ${i + 1}: "${chunkTitle}"`);

        // Rate limit
        await new Promise((r) => setTimeout(r, 150));
      }

      chunkIds.push(chunkId);
    }

    // Link all chunks to this farm (deduped chunks also get linked if not already)
    const links = chunkIds.map((chunk_id) => ({
      farm_id,
      chunk_id,
      uploaded_by,
    }));

    const { error: linkError } = await supabase
      .from("farm_knowledge_links")
      .upsert(links, { onConflict: "farm_id,chunk_id", ignoreDuplicates: true });

    if (linkError) {
      console.error("Link error:", linkError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_chunks: chunks.length,
        new_chunks: newChunks,
        deduped_chunks: dedupedChunks,
        message: `Document "${title}" ingested successfully. ${newChunks} new chunks stored, ${dedupedChunks} already existed and were linked.`,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("ingest-document error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
