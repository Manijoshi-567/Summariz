import { createWorker } from "tesseract.js";

export async function extractTextFromImage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    if (onProgress) onProgress(5);
    
    // Tesseract.js v5+ expects language and oem parameters in createWorker, followed by options
    const worker = await createWorker("eng", 1, {
      logger: (m) => {
        if (onProgress) {
          if (m.status === "loading tesseract core") {
            onProgress(10 + Math.round(m.progress * 20)); // 10% to 30%
          } else if (m.status === "initializing api" || m.status === "initializing tesseract") {
            onProgress(30 + Math.round(m.progress * 20)); // 30% to 50%
          } else if (m.status === "recognizing text") {
            onProgress(50 + Math.round(m.progress * 50)); // 50% to 100%
          }
        }
      },
    });

    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();
    
    if (onProgress) onProgress(100);
    return text;
  } catch (error) {
    console.error("OCR Extraction Error:", error);
    throw new Error("Failed to perform OCR on the image. Make sure it contains readable text.");
  }
}
