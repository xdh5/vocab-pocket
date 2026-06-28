import type { FrequencyLevel, Word } from "../types/word";

type WordListProps = {
  words: Word[];
  loading: boolean;
  onOpen: (word: Word) => void;
};

const frequencyClass: Record<FrequencyLevel, string> = {
  重点: "essential",
  常用: "common",
  了解: "recognition",
  废弃: "discarded",
};

export function WordList({ words, loading, onOpen }: WordListProps) {
  if (!loading && words.length === 0) {
    return (
      <div className="empty">
        <span>Aa</span>
        <p>词库还是空的，先放进第一个单词吧。</p>
      </div>
    );
  }

  return (
    <div className="word-list">
      {words.map((word) => (
        <button className="word-row" key={word.id} type="button" onClick={() => onOpen(word)}>
          <span className="word-row-main">
            <strong>{word.term}</strong>
            {word.pronunciation && <span className="pronunciation">/{word.pronunciation}/</span>}
          </span>
          <span className="word-row-meta">
            <span className={`frequency ${frequencyClass[word.frequency_level]}`}>
              {word.frequency_level}
            </span>
            {word.has_listening_speaking && <span className="tag listening_speaking">听说</span>}
            {word.has_reading && <span className="tag reading">读</span>}
            <span className={`mastery-badge ${word.is_mastered ? "mastered" : ""}`}>
              {word.is_mastered ? "已掌握" : `掌握 ${word.mastery_level}/8`}
            </span>
            {word.forms.length > 1 && <span className="form-count">{word.forms.length} 种变体</span>}
            <span className="encounter-count">{word.add_count} 次</span>
            <span className="row-arrow" aria-hidden="true">
              ›
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
