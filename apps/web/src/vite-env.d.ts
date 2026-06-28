/// <reference types="vite/client" />

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  desktop: {
    platform: string;
    version: string;
    onWordsChanged: (callback: () => void) => () => void;
    auth: {
      setToken: (token: string) => Promise<boolean>;
    };
    hover: {
      addWord: (
        word: string,
        mode: "listening_speaking" | "reading",
        wordInfo: { headword: string; formType: string; commonForms: string[] },
      ) => Promise<{ ok: boolean; count?: number; headword?: string }>;
      dismiss: () => void;
    };
    dictionary: {
      lookup: (word: string) => Promise<{
        headword: string;
        formType: string;
        commonForms: string[];
      }>;
    };
  };
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}
