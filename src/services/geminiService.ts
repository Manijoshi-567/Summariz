export interface SummaryOptions {
  tone?: string;
  format?: string;
  length?: string;
  file?: File;
}

export interface SummaryResult {
  short: string;
  medium: string;
  long: string;
  keyPoints: string[];
  custom?: string;
}

export async function generateSummary(
  text: string,
  options?: SummaryOptions | string,
  providedKey?: string
): Promise<SummaryResult> {
  // Support overload where options argument is providedKey string
  let opts: SummaryOptions = {};
  let keyToUse = providedKey;

  if (typeof options === "string") {
    keyToUse = options;
  } else if (options && typeof options === "object") {
    opts = options;
  }

  const apiKey = (keyToUse && keyToUse.trim()) 
    ? keyToUse.trim() 
    : (typeof window !== 'undefined' 
        ? localStorage.getItem('summify_gemini_api_key') || localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '' 
        : import.meta.env.VITE_GEMINI_API_KEY || '');

  if (!apiKey) {
    return generateLocalFallbackSummary(text, opts);
  }

  // Primary model: gemini-2.5-flash, with fallback to gemini-1.5-flash
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];

  for (const model of models) {
    try {
      return await callGeminiModel(text, opts, apiKey, model);
    } catch (err: any) {
      console.warn(`Model ${model} failed, trying next fallback...`, err);
      if (err.message && err.message.includes('404')) {
        continue; // try next model
      }
    }
  }

  return generateLocalFallbackSummary(text, opts);
}

async function callGeminiModel(
  text: string,
  options: SummaryOptions,
  apiKey: string,
  model: string
): Promise<SummaryResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const tone = options.tone || "Professional / Executive";
  const format = options.format || "Executive Bullet Points";
  const length = options.length || "Medium";

  const prompt = `System Instruction:
You are an expert document analyst and research synthesizer. Your task is to produce a high-density, accurate summary of the provided text strictly according to the user's requirements.

Methodology (Chain of Density):
1. Extract the core entities, metrics, arguments, and actionable takeaways from the document.
2. Weave these into the requested format and tone without adding fluff or meta-announcements (do NOT say "In this document", "This summary explains", etc.).
3. Grounding: Rely 100% on the source material. Do not extrapolate, assume, or hallucinate external facts.

Parameters:
- Tone: ${tone}
- Format: ${format}
- Target Length Preference: ${length}

Document:
"""
${text}
"""

You must respond ONLY with a JSON object matching this schema:
{
  "short": "A concise ~100-150 word summary in the requested tone and format.",
  "medium": "A standard briefing summary ~250-400 words in the requested tone and format.",
  "long": "A detailed deep-dive summary ~600+ words in the requested tone and format.",
  "keyPoints": [
    "Key takeaway 1",
    "Key takeaway 2",
    "Key takeaway 3"
  ]
}`;

  const parts: any[] = [];

  // Pass PDF / Image inline data if provided for visual layout parsing
  if (options.file && (options.file.type === "application/pdf" || options.file.type.startsWith("image/"))) {
    try {
      const base64Data = await fileToBase64(options.file);
      parts.push({
        inlineData: {
          mimeType: options.file.type,
          data: base64Data
        }
      });
    } catch (e) {
      console.warn("Failed to convert file to inlineData buffer, falling back to text prompt:", e);
    }
  }

  parts.push({ text: prompt });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`Gemini API Error: ${message}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("No response received from Gemini model.");
  }

  const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleanedText) as SummaryResult;

  if (
    typeof parsed.short !== "string" ||
    typeof parsed.medium !== "string" ||
    typeof parsed.long !== "string" ||
    !Array.isArray(parsed.keyPoints)
  ) {
    throw new Error("JSON structure did not match SummaryResult schema");
  }

  return parsed;
}

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function generateLocalFallbackSummary(text: string, options?: SummaryOptions): SummaryResult {
  const cleanText = text.trim() || "Sample document text.";
  const sentences = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
  
  const short = sentences.slice(0, 2).join(" ") || cleanText.slice(0, 150);
  const medium = sentences.slice(0, 5).join(" ") || cleanText.slice(0, 350);
  const long = sentences.length > 5 
    ? `${sentences.slice(0, 4).join(" ")}\n\n${sentences.slice(4, 9).join(" ")}\n\n${sentences.slice(9, 14).join(" ")}`.trim()
    : cleanText;

  const keyPoints = sentences.slice(0, 4).map((s) => `• ${s}`);

  return {
    short: short.trim(),
    medium: medium.trim(),
    long: long.trim(),
    keyPoints: keyPoints.length > 0 ? keyPoints : ["Extracted key takeaway from document."]
  };
}
