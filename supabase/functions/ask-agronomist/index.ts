import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AgronomistRequest {
  question: string;
  farm_id: string;
  farm_lat: number;
  farm_lng: number;
  farm_state: string;
  crop_name?: string;
}

interface KnowledgeChunk {
  chunk_id: number;
  content: string;
  title: string;
  source_type: string;
  scope: string;
  similarity: number;
}

// ---------------------------------------------------------------------------
// Gemini helpers
// ---------------------------------------------------------------------------
const GEMINI_API_KEY = (Deno.env.get("GEMINI_API_KEY") || "").trim();
const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";
const GEMINI_GENERATE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

async function generateEmbedding(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    // Return a dummy embedding array of length 384
    return new Array(384).fill(0.01);
  }

  try {
    const res = await fetch(`${GEMINI_EMBED_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 384,
      }),
    });

    if (!res.ok) throw new Error(`Embedding API error: ${await res.text()}`);
    const data = await res.json() as { embedding: { values: number[] } };
    return data.embedding.values;
  } catch (err) {
    console.error("generateEmbedding error:", err);
    throw new Error(`generateEmbedding failed: ${(err as Error).message}`);
  }
}

async function generateAnswer(
  question: string,
  chunks: KnowledgeChunk[],
  farmState: string,
  cropName?: string
): Promise<string> {
  // Build context from retrieved chunks — prioritize higher similarity chunks
  const context = chunks
    .map((c) => `[Source: ${c.title}]\n${c.content}`)
    .join("\n\n---\n\n");

  if (!GEMINI_API_KEY) {
    // Return a dummy answer
    return `**(Mock Mode)** This is a mock response from the AI Agronomist because a valid Gemini API key is missing. 
Based on the provided mock context, the yield timeline for ${cropName || 'your crop'} in ${farmState} typically spans 120-150 days. 
Please configure a valid Gemini API key to receive real generative answers based on your knowledge base.`;
  }

  const systemPrompt = `You are an expert agronomist specializing in ${farmState} agriculture${cropName ? ` and ${cropName} cultivation` : ""}. 
You provide precise, locally-relevant crop management advice based only on the provided context documents.
If the context does not contain enough information to answer confidently, say so clearly and suggest the farmer consult their local agricultural extension office.
Always cite which source document your recommendation is from.
Respond in clear, practical language that a working farmer or farm manager can act on immediately.`;

  const userPrompt = `CONTEXT DOCUMENTS:
${context}

FARM LOCATION: ${farmState}, India
${cropName ? `CROP: ${cropName}` : ""}

FARMER'S QUESTION: ${question}

Provide a specific, actionable answer based only on the context above.`;

  const res = await fetch(`${GEMINI_GENERATE_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }], role: "user" }],
      generationConfig: {
        temperature: 0.2,  // low temperature for factual agronomic advice
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) throw new Error(`Generation API error: ${await res.text()}`);
  const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
  return data.candidates[0]?.content.parts[0]?.text ?? "Unable to generate a response.";
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  // DEBUG ENDPOINT
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        geminiKey: Deno.env.get("GEMINI_API_KEY"),
        geminiKeyLength: Deno.env.get("GEMINI_API_KEY")?.length,
        mockMatch: !Deno.env.get("GEMINI_API_KEY"),
        supabaseUrl: Deno.env.get("SUPABASE_URL") ? "SET" : "MISSING"
      }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  try {
    const body: AgronomistRequest = await req.json();
    const { question, farm_id, farm_lat, farm_lng, farm_state, crop_name } = body;

    if (!question || !farm_id || farm_lat == null || farm_lng == null || !farm_state) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: question, farm_id, farm_lat, farm_lng, farm_state" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Init Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Step 1: Generate query embedding
    let queryEmbedding: number[];
    try {
      queryEmbedding = await generateEmbedding(question);
    } catch (err) {
      console.error("Step 1 Failed:", err);
      throw new Error(`Step 1 (Gemini) failed: ${(err as Error).message}`);
    }

    // Step 2: Retrieve geo-scoped relevant chunks
    let chunks: any;
    let retrievalError: any;
    try {
      const result = await supabase.rpc(
        "match_knowledge_chunks",
        {
          query_embedding: `[${queryEmbedding.join(",")}]`,
          p_farm_id: farm_id,
          p_farm_lat: farm_lat,
          p_farm_lng: farm_lng,
          p_farm_state: farm_state,
          p_match_count: 8,
        }
      );
      chunks = result.data;
      retrievalError = result.error;
    } catch (err) {
      console.error("Step 2 RPC Failed:", err);
      throw new Error(`Step 2 (Supabase RPC) failed: ${(err as Error).message}`);
    }

    if (retrievalError) {
      console.error("Retrieval error:", retrievalError);
      throw new Error(`Knowledge retrieval failed: ${retrievalError.message}`);
    }

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({
          answer: `I don't have specific knowledge about this topic for ${farm_state} yet. Please consult your local TNAU/ICAR extension office or upload relevant documents to your Farm Knowledge Hub.`,
          sources: [],
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Step 3: Generate grounded answer
    const answer = await generateAnswer(question, chunks as KnowledgeChunk[], farm_state, crop_name);

    // Return answer + sources for citation display
    const sources = (chunks as KnowledgeChunk[])
      .filter((c) => c.similarity > 0.5)
      .map((c) => ({ title: c.title, source_type: c.source_type, similarity: Math.round(c.similarity * 100) }));

    return new Response(
      JSON.stringify({ answer, sources }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("ask-agronomist error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
