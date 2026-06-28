import { useCallback, useState } from "react";

import { AddWordForm } from "../components/AddWordForm";
import { AppHeader } from "../components/AppHeader";
import { WordDetailDialog } from "../components/WordDetailDialog";
import { WordList } from "../components/WordList";
import { useWords } from "../hooks/useWords";

type WordBookPageProps = { username: string; onLogout: () => void };

export function WordBookPage({ username, onLogout }: WordBookPageProps) {
  const { words, error, loading, addWord, removeWord } = useWords();
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const selectedWord = words.find((word) => word.id === selectedWordId) ?? null;
  const closeDetail = useCallback(() => setSelectedWordId(null), []);

  async function deleteSelectedWord(wordId: number) {
    closeDetail();
    await removeWord(wordId);
  }

  return (
    <main className="app-shell">
      <AppHeader wordCount={words.length} username={username} onLogout={onLogout} />
      <AddWordForm onAdd={addWord} />
      {error && <p className="error">{error}</p>}
      <section className="word-section">
        <div className="section-title">
          <h2>最近收集</h2>
          <span>Newest first</span>
        </div>
        <WordList words={words} loading={loading} onOpen={(word) => setSelectedWordId(word.id)} />
      </section>
      {selectedWord && (
        <WordDetailDialog
          word={selectedWord}
          onClose={closeDetail}
          onDelete={(wordId) => void deleteSelectedWord(wordId)}
        />
      )}
    </main>
  );
}
