export interface SummaryResult {
  short: string;
  medium: string;
  long: string;
  keyPoints: string[];
}

export async function generateSummary(
  text: string,
  providedKey?: string
): Promise<SummaryResult> {
  const apiKey = (providedKey && providedKey.trim()) 
    ? providedKey.trim() 
    : (typeof window !== 'undefined' ? localStorage.getItem('summify_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '' : import.meta.env.VITE_GEMINI_API_KEY || '');

  if (!apiKey) {
    return generateLocalFallbackSummary(text);
  }

  // Primary model: gemini-2.5-flash, with fallback to gemini-1.5-flash
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];

  for (const model of models) {
    try {
      return await callGeminiModel(text, apiKey, model);
    } catch (err: any) {
      console.warn(`Model ${model} failed, trying next fallback...`, err);
      if (err.message && err.message.includes('404')) {
        continue; // try next model
      }
      // If it's a key error or network error on last model, fallback to local summary
    }
  }

  return generateLocalFallbackSummary(text);
}

async function callGeminiModel(text: string, apiKey: string, model: string): Promise<SummaryResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `You are a professional document summarizer. Analyze the following document text and provide a structured summary including a short version, a medium version, a long version, and a list of key bullet points.

Document Text:
"""
${text}
"""

You must respond ONLY with a JSON object matching this schema:
{
  "short": "A concise 1-2 sentence summary of the main points (approx 50 words).",
  "medium": "A detailed 1-2 paragraph summary capturing the core arguments and details (approx 150 words).",
  "long": "A comprehensive, multi-paragraph summary outlining all major concepts, data points, and conclusions (approx 400 words). Use \\n\\n for paragraph breaks.",
  "keyPoints": [
    "Key point 1",
    "Key point 2",
    "Key point 3"
  ]
}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
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

function generateLocalFallbackSummary(text: string): SummaryResult {
  const cleanText = text.trim() || "Sample document text.";
  const sentences = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
  
  const short = sentences.slice(0, 2).join(" ") || cleanText.slice(0, 150);
  const medium = sentences.slice(0, 5).join(" ") || cleanText.slice(0, 350);
  const long = sentences.length > 5 
    ? `${sentences.slice(0, 4).join(" ")}\n\n${sentences.slice(4, 9).join(" ")}\n\n${sentences.slice(9, 14).join(" ")}`.trim()
    : cleanText;

  const keyPoints = sentences.slice(0, 4).map((s, idx) => `• ${s}`);

  return {
    short: short.trim(),
    medium: medium.trim(),
    long: long.trim(),
    keyPoints: keyPoints.length > 0 ? keyPoints : ["Extracted key takeaway from document."]
  };
}
