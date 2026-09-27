import * as XLSX from "xlsx";

const MAX_UNCOMPRESSED_CHARS = 2_000_000;
const MAX_SHEETS = 30;

export async function extractTextFromXlsx(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    if (onProgress) onProgress(20);
    const arrayBuffer = await file.arrayBuffer();
    if (onProgress) onProgress(40);
    
    // Parse XLSX file with safe sheet caps
    const workbook = XLSX.read(arrayBuffer, { type: "array", sheetRows: 5000 });
    if (onProgress) onProgress(70);
    
    let text = "";
    const sheetNames = workbook.SheetNames.slice(0, MAX_SHEETS);
    
    // Loop through all sheets and convert each sheet to CSV text format
    for (const sheetName of sheetNames) {
      if (text.length >= MAX_UNCOMPRESSED_CHARS) {
        text += "\n\n[Spreadsheet output truncated for memory security]";
        break;
      }
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim().length > 0) {
        text += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
      }
    }
    
    if (onProgress) onProgress(100);
    return text.slice(0, MAX_UNCOMPRESSED_CHARS).trim();
  } catch (error: any) {
    console.error("XLSX Text Extraction Error:", error);
    throw new Error("Failed to extract data from Excel spreadsheet. The file might be corrupted or oversized.");
  }
}
