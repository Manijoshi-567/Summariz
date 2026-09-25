import * as XLSX from "xlsx";

export async function extractTextFromXlsx(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    if (onProgress) onProgress(20);
    const arrayBuffer = await file.arrayBuffer();
    if (onProgress) onProgress(40);
    
    // Parse XLSX file
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    if (onProgress) onProgress(70);
    
    let text = "";
    
    // Loop through all sheets and convert each sheet to CSV text format
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim().length > 0) {
        text += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
      }
    });
    
    if (onProgress) onProgress(100);
    return text.trim();
  } catch (error) {
    console.error("XLSX Text Extraction Error:", error);
    throw new Error("Failed to extract data from Excel spreadsheet. The file might be corrupted.");
  }
}
