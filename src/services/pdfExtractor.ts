import * as pdfjsLib from "pdfjs-dist";

const PDFJS_VERSION = "4.0.379";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

const MAX_PAGES = 250;
const MAX_UNCOMPRESSED_CHARS = 2_000_000;

export async function extractTextFromPDF(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

    if (onProgress) {
      onProgress(10);
    }

    const pdf = await loadingTask.promise;
    const numPages = Math.min(pdf.numPages, MAX_PAGES);
    let fullText = "";

    if (onProgress) {
      onProgress(30);
    }

    for (let i = 1; i <= numPages; i++) {
      if (fullText.length >= MAX_UNCOMPRESSED_CHARS) {
        fullText += "\n\n[PDF content truncated for memory security]";
        break;
      }

      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const items = textContent.items as any[];
      let lastY: number | null = null;
      let pageText = "";

      for (const item of items) {
        if (!item.str || item.str.trim().length === 0) continue;
        
        const y = item.transform ? Math.round(item.transform[5]) : null;
        if (lastY !== null && y !== null) {
          const deltaY = Math.abs(lastY - y);
          if (deltaY > 14) {
            pageText += "\n\n";
          } else if (deltaY > 3) {
            pageText += "\n";
          } else {
            pageText += " ";
          }
        } else if (pageText.length > 0) {
          pageText += " ";
        }
        
        pageText += item.str.trim();
        if (y !== null) lastY = y;
      }

      fullText += `--- Page ${i} ---\n` + pageText.trim() + "\n\n";

      if (onProgress) {
        const percent = 30 + Math.round((i / numPages) * 70);
        onProgress(percent);
      }
    }

    return fullText.slice(0, MAX_UNCOMPRESSED_CHARS).trim();
  } catch (error: any) {
    console.error("PDF Text Extraction Error:", error);
    throw new Error("Failed to extract text from PDF. The document might be corrupted, password-protected, or oversized.");
  }
}
