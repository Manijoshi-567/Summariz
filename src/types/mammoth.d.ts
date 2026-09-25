declare module "mammoth" {
  export interface Result {
    value: string;
    messages: any[];
  }

  export interface ExtractRawTextOptions {
    arrayBuffer: ArrayBuffer;
  }

  export function extractRawText(options: ExtractRawTextOptions): Promise<Result>;
  export function convertToHtml(options: { arrayBuffer: ArrayBuffer }): Promise<Result>;
}
