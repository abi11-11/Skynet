const SARVAM_API_KEY = "sk_1d0yca7m_QaILWV9Wd7xBtSwf7LjzmT3g";

export const SUPPORTED_LANGUAGES = [
  { code: "hi-IN", name: "Hindi" },
  { code: "bn-IN", name: "Bengali" },
  { code: "kn-IN", name: "Kannada" },
  { code: "ml-IN", name: "Malayalam" },
  { code: "mr-IN", name: "Marathi" },
  { code: "or-IN", name: "Odia" },
  { code: "pa-IN", name: "Punjabi" },
  { code: "ta-IN", name: "Tamil" },
  { code: "te-IN", name: "Telugu" },
  { code: "gu-IN", name: "Gujarati" },
  { code: "en-IN", name: "English (India)" },
];

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  // Provide a generic name for the audio file
  formData.append("file", audioBlob, "recording.wav");
  
  // As per sarvam STT docs, if model isn't specified it might default, but usually saaras:v3
  // we will omit it unless strictly required, or we can use translate endpoint if we want English text.
  // For now, let's try the basic speech-to-text endpoint.
  
  try {
    const res = await fetch("https://api.sarvam.ai/speech-to-text-translate", {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
      },
      body: formData,
    });
    
    if (!res.ok) {
      throw new Error(`STT API error: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data.transcript || ""; 
  } catch (err) {
    console.error("STT error:", err);
    return "";
  }
}

export async function synthesizeSpeech(text: string, targetLanguageCode: string): Promise<string | null> {
  // TTS API
  try {
    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": SARVAM_API_KEY,
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: targetLanguageCode,
        speaker: "meera",
        pitch: 0,
        pace: 1.05,
        loudness: 1.5,
        speech_sample_rate: 8000,
        enable_preprocessing: true,
        model: "bulbul:v1"
      }),
    });

    if (!res.ok) {
      throw new Error(`TTS API error: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.audios && data.audios.length > 0) {
      // Returns base64 audio string
      return `data:audio/wav;base64,${data.audios[0]}`;
    }
    return null;
  } catch (err) {
    console.error("TTS error:", err);
    return null;
  }
}
