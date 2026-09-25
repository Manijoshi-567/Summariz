import * as pdfjsLib from "pdfjs-dist";

// Set worker source dynamically using CDN to avoid Vite worker configuration complexities.
// Standard CDN for pdf.js worker matching the version of pdfjs-dist.
const PDFJS_VERSION = "4.0.379";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

export async function extractTextFromPDF(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

    // Initial load progress
    if (onProgress) {
      onProgress(10);
    }

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    let fullText = "";

    if (onProgress) {
      onProgress(30);
    }

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .map((str) => str.trim())
        .filter((str) => str.length > 0)
        .join(" ");

      fullText += `--- Page ${i} ---\n` + pageText + "\n\n";

      if (onProgress) {
        // Map page extraction progress from 30% to 100%
        const percent = 30 + Math.round((i / numPages) * 70);
        onProgress(percent);
      }
    }

    return fullText.trim();
  } catch (error) {
    console.error("PDF Text Extraction Error:", error);
    throw new Error("Failed to extract text from PDF. The document might be corrupted or scanned.");
  }
}
