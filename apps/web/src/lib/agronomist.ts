import { supabase } from "./supabase";

export interface AgronomistMessage {
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; source_type: string; similarity: number }[];
  timestamp: Date;
}

export interface AskAgronomistParams {
  question: string;
  farmId: string;
  farmLat: number;
  farmLng: number;
  farmState: string;
  cropName?: string;
}

export interface IngestDocumentParams {
  farmId: string;
  farmLat: number;
  farmLng: number;
  farmState: string;
  documentText: string;
  title: string;
  isPublic: boolean;
  radiusKm: number;
  cropTags: string[];
}

/**
 * Ask the AI Agronomist a question about a specific farm plot.
 * The response is grounded in geo-scoped knowledge chunks from our RAG pipeline.
 */
export async function askAgronomist(params: AskAgronomistParams): Promise<{
  answer: string;
  sources: { title: string; source_type: string; similarity: number }[];
  error?: string;
}> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const { data, error } = await supabase.functions.invoke("ask-agronomist", {
    body: {
      question: params.question,
      farm_id: params.farmId,
      farm_lat: params.farmLat,
      farm_lng: params.farmLng,
      farm_state: params.farmState,
      crop_name: params.cropName,
    },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (error) {
    return { answer: "", sources: [], error: error.message };
  }

  return {
    answer: data.answer ?? "",
    sources: data.sources ?? [],
    error: data.error,
  };
}

/**
 * Upload a document to the farm's private knowledge base.
 * The document is chunked, embedded, and stored in Supabase pgvector.
 * Deduplication happens automatically via SHA-256 content hash.
 */
export async function ingestDocument(params: IngestDocumentParams): Promise<{
  success: boolean;
  newChunks: number;
  dedupedChunks: number;
  message: string;
  error?: string;
}> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id ?? "anonymous";
  const token = sessionData?.session?.access_token;

  const { data, error } = await supabase.functions.invoke("ingest-document", {
    body: {
      farm_id: params.farmId,
      farm_lat: params.farmLat,
      farm_lng: params.farmLng,
      farm_state: params.farmState,
      document_text: params.documentText,
      title: params.title,
      is_public: params.isPublic,
      radius_km: params.radiusKm,
      crop_tags: params.cropTags,
      uploaded_by: userId,
    },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (error) {
    return { success: false, newChunks: 0, dedupedChunks: 0, message: "", error: error.message };
  }

  return {
    success: data.success ?? false,
    newChunks: data.new_chunks ?? 0,
    dedupedChunks: data.deduped_chunks ?? 0,
    message: data.message ?? "",
    error: data.error,
  };
}
