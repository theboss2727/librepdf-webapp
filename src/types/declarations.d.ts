declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: any[];
  }
  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer } | { buffer: Buffer } | { path: string },
    options?: any
  ): Promise<MammothResult>;
  export function extractRawText(
    input: { arrayBuffer: ArrayBuffer } | { buffer: Buffer } | { path: string },
    options?: any
  ): Promise<MammothResult>;
}
