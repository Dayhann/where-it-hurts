import type { Lang } from '@/contracts/types';

export type SpeechResultEvent = Event & {
  results: {
    length: number;
    [index: number]: {
      0: { transcript: string };
      isFinal: boolean;
    };
  };
};

export interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export type BrowserSpeechRecognitionConstructor =
  new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

export function recognitionLanguage(lang: Lang): 'en-AU' | 'ar' {
  return lang === 'ar' ? 'ar' : 'en-AU';
}

export function recognitionTranscript(event: SpeechResultEvent): string {
  let transcript = '';
  for (let index = 0; index < event.results.length; index += 1) {
    transcript += event.results[index][0].transcript;
  }
  return transcript.trim();
}
