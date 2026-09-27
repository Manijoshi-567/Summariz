import mammoth from "mammoth";

const MAX_UNCOMPRESSED_CHARS = 2_000_000; // 2MB / 2M char safety limit against Zip Bombs

export async function extractTextFromDocx(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    if (onProgress) onProgress(20);
    const arrayBuffer = await file.arrayBuffer();
    if (onProgress) onProgress(50);
    
    // Convert arrayBuffer to structured HTML via mammoth
    const result = await mammoth.convertToHtml({ arrayBuffer });
    if (onProgress) onProgress(80);

    const html = result.value || "";

    // Zip Bomb / Memory Exhaustion Guard
    if (html.length > MAX_UNCOMPRESSED_CHARS * 3) {
      throw new Error("Security Alert: Document expansion exceeds safety limit (Decompression Bomb Protection).");
    }

    let markdown = htmlToMarkdown(html);
    if (markdown.length > MAX_UNCOMPRESSED_CHARS) {
      markdown = markdown.slice(0, MAX_UNCOMPRESSED_CHARS) + "\n\n[Content truncated for memory security]";
    }
    
    if (onProgress) onProgress(100);
    return markdown.trim() || result.value.replace(/<[^>]+>/g, " ").trim();
  } catch (error: any) {
    console.error("DOCX Text Extraction Error:", error);
    if (error.message && error.message.includes("Security Alert")) {
      throw error;
    }
    // Fallback to extractRawText if HTML conversion encounters issues
    try {
      const arrayBuffer = await file.arrayBuffer();
      const rawResult = await mammoth.extractRawText({ arrayBuffer });
      let text = rawResult.value.trim();
      if (text.length > MAX_UNCOMPRESSED_CHARS) {
        text = text.slice(0, MAX_UNCOMPRESSED_CHARS) + "\n\n[Content truncated for memory security]";
      }
      return text;
    } catch (fallbackErr) {
      throw new Error("Failed to extract text from Word document. The file might be corrupted.");
    }
  }
}

function htmlToMarkdown(html: string): string {
  let text = html;

  // Convert headings
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n\n# $1\n");
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n\n## $1\n");
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n\n### $1\n");
  text = text.replace(/<h[4-6][^>]*>(.*?)<\/h[4-6]>/gi, "\n\n#### $1\n");

  // Convert lists
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, "\n* $1");
  text = text.replace(/<\/?ul[^>]*>/gi, "\n");
  text = text.replace(/<\/?ol[^>]*>/gi, "\n");

  // Convert table elements
  text = text.replace(/<tr[^>]*>(.*?)<\/tr>/gi, (_, rowContent) => {
    const cells = rowContent
      .replace(/<th[^>]*>(.*?)<\/th>/gi, "| $1 ")
      .replace(/<td[^>]*>(.*?)<\/td>/gi, "| $1 ");
    return `\n${cells}|`;
  });
  text = text.replace(/<\/?table[^>]*>/gi, "\n");
  text = text.replace(/<\/?tbody[^>]*>/gi, "");
  text = text.replace(/<\/?thead[^>]*>/gi, "");

  // Convert paragraphs and line breaks
  text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, "\n\n$1");
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up excessive blank lines
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
