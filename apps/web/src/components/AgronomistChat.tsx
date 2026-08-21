import { useState, useRef, useEffect } from "react";
import type { FarmPlot, GeoJSONPolygon } from "@skynet/types";
import { askAgronomist, ingestDocument, type AgronomistMessage } from "../lib/agronomist";
import { transcribeAudio, synthesizeSpeech, SUPPORTED_LANGUAGES } from "../lib/sarvam";
import { Mic, MicOff, Volume2 } from "lucide-react";

interface AgronomistChatProps {
  plot: FarmPlot;
}

function getPlotCentroid(plot: FarmPlot): { lat: number; lng: number } | null {
  if (!plot.area || typeof plot.area === "string") return null;
  const polygon = plot.area as GeoJSONPolygon;
  const ring = polygon.coordinates[0];
  const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  return { lat, lng };
}

function SourceBadge({ source }: { source: { title: string; source_type: string; similarity: number } }) {
  const typeLabels: Record<string, string> = {
    tnau: "TNAU",
    icar: "ICAR",
    imd: "IMD",
    skynet_curated: "Skynet",
    customer_upload: "Your Upload",
  };
  return (
    <span className="agro-source-badge">
      📄 {typeLabels[source.source_type] ?? source.source_type}: {source.title} ({source.similarity}% match)
    </span>
  );
}

export default function AgronomistChat({ plot }: AgronomistChatProps) {
  const [messages, setMessages] = useState<AgronomistMessage[]>([
    {
      role: "assistant",
      content: `Hello! I'm your AI Agronomist for **${plot.name}**. I have knowledge of South Indian crop management, pest control, and soil practices. Ask me anything about your farm, or upload a document to expand my knowledge.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadText, setUploadText] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [radiusKm, setRadiusKm] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  
  // Voice & Multi-lingual State
  const [language, setLanguage] = useState(SUPPORTED_LANGUAGES[0].code);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const centroid = getPlotCentroid(plot);
  const farmState = "Tamil Nadu";

  const handleSend = async (customQuestion?: string) => {
    const question = customQuestion ?? input.trim();
    if (!question || loading || !centroid) return;

    if (!customQuestion) setInput("");
    
    const userMsg: AgronomistMessage = { role: "user", content: question, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const langName = SUPPORTED_LANGUAGES.find(l => l.code === language)?.name ?? "English";
    const languagePrompt = `Please reply in ${langName}.`;

    const result = await askAgronomist({
      question: `${question}\n${languagePrompt}`,
      farmId: plot.id,
      farmLat: centroid.lat,
      farmLng: centroid.lng,
      farmState,
      cropName: plot.metadata?.crop_type,
    });

    const assistantMsg: AgronomistMessage = {
      role: "assistant",
      content: result.error
        ? `Sorry, I encountered an error: ${result.error}. Please try again.`
        : result.answer,
      sources: result.sources,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, assistantMsg]);
    setLoading(false);
    
    // Automatically play response if not English
    if (language !== "en-IN" && !result.error) {
      playAudio(result.answer, language);
    }
  };
  
  const playAudio = async (text: string, targetLang: string) => {
    setAudioLoading(true);
    const audioDataUri = await synthesizeSpeech(text, targetLang);
    setAudioLoading(false);
    if (audioDataUri) {
      const audio = new Audio(audioDataUri);
      audio.play();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
        setIsRecording(false);
        setLoading(true);
        const transcript = await transcribeAudio(audioBlob);
        setLoading(false);
        if (transcript) {
          setInput(transcript);
          // Optional: handleSend(transcript); // auto send
        }
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadTitle(file.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (ev) => setUploadText(ev.target?.result as string ?? "");
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!uploadText || !uploadTitle || !centroid) return;
    setUploading(true);
    setUploadFeedback(null);

    const result = await ingestDocument({
      farmId: plot.id,
      farmLat: centroid.lat,
      farmLng: centroid.lng,
      farmState,
      documentText: uploadText,
      title: uploadTitle,
      isPublic,
      radiusKm,
      cropTags: plot.metadata?.crop_type ? [plot.metadata.crop_type] : [],
    });

    if (result.error) {
      setUploadFeedback(`❌ Upload failed: ${result.error}`);
    } else {
      setUploadFeedback(`✅ ${result.message}`);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I've ingested your document **"${uploadTitle}"** into my knowledge base. ${result.newChunks} new knowledge chunks added${result.dedupedChunks > 0 ? `, ${result.dedupedChunks} were already known` : ""}. You can now ask me questions about it!`,
          timestamp: new Date(),
        },
      ]);
      setUploadText("");
      setUploadTitle("");
      setUploadOpen(false);
    }
    setUploading(false);
  };

  return (
    <div className="agro-chat-container">
      {/* Header */}
      <div className="agro-chat-header">
        <span className="agro-chat-icon">🌿</span>
        <div style={{ flex: 1 }}>
          <div className="agro-chat-title">AI Agronomist</div>
          <div className="agro-chat-subtitle">Powered by geo-scoped RAG · {farmState}</div>
        </div>
        
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-app)", color: "var(--text-primary)" }}
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
          
          <button
            id="agro-upload-toggle"
            className="agro-upload-btn"
            onClick={() => setUploadOpen((v) => !v)}
            title="Upload document to knowledge base"
          >
            📎 Upload
          </button>
        </div>
      </div>

      {/* Document Upload Panel */}
      {uploadOpen && (
        <div className="agro-upload-panel">
          <h4 className="agro-upload-panel-title">📄 Add to Farm Knowledge</h4>
          <p className="agro-upload-panel-desc">
            Upload advisories, pest reports, flood alerts, or any documents relevant to your farm.
          </p>
          <input
            type="file"
            accept=".txt,.md,.csv,.json"
            id="agro-file-input"
            className="agro-file-input"
            onChange={handleFileRead}
          />
          <input
            className="agro-input-field"
            placeholder="Document title..."
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            id="agro-upload-title"
          />
          {uploadText && (
            <div className="agro-preview-box">
              <strong>Preview:</strong> {uploadText.slice(0, 200)}...
            </div>
          )}
          <div className="agro-scope-row">
            <label className="agro-scope-label">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                id="agro-is-public"
              />
              Share with nearby farms
            </label>
            {isPublic && (
              <div className="agro-radius-row">
                <label>Radius: <strong>{radiusKm} km</strong></label>
                <input
                  type="range"
                  min={10}
                  max={200}
                  step={10}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  id="agro-radius-slider"
                />
              </div>
            )}
          </div>
          {uploadFeedback && (
            <div className={`agro-upload-feedback ${uploadFeedback.startsWith("✅") ? "success" : "error"}`}>
              {uploadFeedback}
            </div>
          )}
          <button
            id="agro-upload-submit"
            className="agro-upload-submit-btn"
            onClick={handleUpload}
            disabled={uploading || !uploadText || !uploadTitle}
          >
            {uploading ? "Ingesting..." : "Ingest Document"}
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="agro-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`agro-message agro-message-${msg.role}`}>
            <div className="agro-message-bubble">
              {msg.content.split("**").map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
              )}
              {msg.role === "assistant" && (
                <button 
                  onClick={() => playAudio(msg.content, language)}
                  style={{ background: "none", border: "none", padding: 0, margin: "0 0 0 8px", cursor: "pointer", color: "var(--accent)" }}
                  title="Listen to response"
                >
                  <Volume2 size={16} />
                </button>
              )}
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="agro-sources">
                {msg.sources.map((s, si) => <SourceBadge key={si} source={s} />)}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="agro-message agro-message-assistant">
            <div className="agro-message-bubble agro-loading-bubble">
              <span className="agro-dot" /><span className="agro-dot" /><span className="agro-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="agro-input-row" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{ 
            background: isRecording ? "#ef4444" : "var(--bg-card)",
            color: isRecording ? "#fff" : "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0
          }}
          title={isRecording ? "Stop Recording" : "Start Voice Input"}
        >
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <input
          id="agro-question-input"
          className="agro-question-input"
          style={{ flex: 1 }}
          placeholder={centroid ? (isRecording ? "Listening..." : "Ask about your crop...") : "Select a plot with a boundary to begin..."}
          value={input}
          disabled={!centroid || loading || isRecording}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          id="agro-send-btn"
          className="agro-send-btn"
          onClick={() => handleSend()}
          disabled={!centroid || loading || !input.trim() || isRecording}
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>
    </div>
  );
}
