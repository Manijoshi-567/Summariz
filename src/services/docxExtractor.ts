import mammoth from "mammoth";

export async function extractTextFromDocx(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    if (onProgress) onProgress(20);
    const arrayBuffer = await file.arrayBuffer();
    if (onProgress) onProgress(50);
    
    // Convert arrayBuffer to text using mammoth
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (onProgress) onProgress(100);
    return result.value.trim();
  } catch (error) {
    console.error("DOCX Text Extraction Error:", error);
    throw new Error("Failed to extract text from Word document. The file might be corrupted.");
  }
}
