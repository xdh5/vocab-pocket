/// <reference types="vite/client" />

interface Window {
  desktop: {
    platform: string;
    version: string;
    onWordsChanged: (callback: () => void) => () => void;
    hover: {
      addWord: (word: string, category: "listening_speaking" | "reading") => Promise<{ ok: boolean; count?: number }>;
      dismiss: () => void;
    };
  };
}
