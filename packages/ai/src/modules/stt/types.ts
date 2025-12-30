export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
}
