import { useEffect } from "react";

import { resolveApiAssetUrl } from "../config";
import type { EnrichmentStatus, FrequencyLevel, Word } from "../types/word";

type WordDetailDialogProps = {
  word: Word;
  onClose: () => void;
  onDelete: (wordId: number) => void;
};

const statusText: Record<Exclude<EnrichmentStatus, "ready">, string> = {
  pending: "豆包正在生成词卡…",
  failed: "AI 词卡生成失败，重新加入这个单词时会自动重试。",
  not_configured: "配置火山方舟 API Key 后，重新加入这个单词即可生成词卡。",
};

const frequencyClass: Record<FrequencyLevel, string> = {
  重点: "essential",
  常用: "common",
  了解: "recognition",
  废弃: "discarded",
};

function reviewScheduleText(word: Word): string {
  if (word.is_mastered) return "已掌握";
  if (!word.next_review_at) return "等待安排复习";
  const reviewTime = new Date(word.next_review_at);
  if (reviewTime.getTime() <= Date.now()) return "现在可以复习";
  return `下次复习：${reviewTime.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function WordDetailDialog({ word, onClose, onDelete }: WordDetailDialogProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="dialog-backdrop">
      <button type="button" className="dialog-dismiss" onClick={onClose} aria-label="关闭详情" />
      <article className="word-detail" role="dialog" aria-modal="true" aria-labelledby="word-detail-title">
        <header className="word-detail-header">
          <div>
            <div className="word-title-line">
              <h3 id="word-detail-title">{word.term}</h3>
              {word.pronunciation && <span className="pronunciation">/{word.pronunciation}/</span>}
              <span className={`frequency ${frequencyClass[word.frequency_level]}`}>
                {word.frequency_level}
              </span>
            </div>
            <div className="word-meta">
              {word.has_listening_speaking && <span className="tag listening_speaking">听说</span>}
              {word.has_reading && <span className="tag reading">读</span>}
              <span>累计加入 {word.add_count} 次</span>
              <span>复习 {word.review_count} 次</span>
            </div>
            <div className="mastery-summary">
              <span>{word.is_mastered ? "已掌握" : `掌握程度 ${word.mastery_level}/8`}</span>
              <div
                className="mastery-track"
                role="progressbar"
                aria-label="掌握程度"
                aria-valuemin={0}
                aria-valuemax={8}
                aria-valuenow={word.mastery_level}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                  <i className={level <= word.mastery_level ? "filled" : ""} key={level} />
                ))}
              </div>
              <small>{reviewScheduleText(word)}</small>
            </div>
          </div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="关闭详情">
            ×
          </button>
        </header>

        {word.enrichment_status === "ready" ? (
          <div className="word-card-content">
            {word.image_status === "ready" && word.image_url && (
              <figure className="word-image">
                <img src={resolveApiAssetUrl(word.image_url)} alt={`${word.term} 的词义图片`} />
                <figcaption>
                  {word.image_source === "wikimedia" ? "真实图片 · Wikimedia Commons" : "豆包生成图片"}
                  {word.image_attribution && ` · ${word.image_attribution}`}
                  {word.image_source_url && (
                    <a href={word.image_source_url} target="_blank" rel="noreferrer">
                      查看来源
                    </a>
                  )}
                </figcaption>
              </figure>
            )}
            <section className="card-section meanings-section">
              <h4>核心意思和词性</h4>
              <div className="meaning-rows">
                {word.meanings.map((meaning) => (
                  <p key={`${meaning.part_of_speech}-${meaning.meaning}`}>
                    <b>{meaning.part_of_speech}</b>
                    <span>{meaning.meaning}</span>
                  </p>
                ))}
              </div>
            </section>
            <section className="card-section forms-section">
              <h4>原形与变体</h4>
              <p className="headword-line">
                原形 <strong>{word.term}</strong>
              </p>
              <div className="encountered-forms">
                {word.forms.map((form) => (
                  <span key={form.id}>
                    <b>{form.form}</b>
                    <small>{form.form_type}</small>
                    <em>遇到 {form.add_count} 次</em>
                  </span>
                ))}
              </div>
              {word.common_forms.length > 0 && (
                <p className="common-form-line">常见形式：{word.common_forms.join(" · ")}</p>
              )}
            </section>
            <section className="card-section">
              <h4>常见搭配</h4>
              <div className="collocations">
                {word.collocations.map((collocation) => (
                  <article key={collocation.phrase}>
                    <strong>{collocation.phrase}</strong>
                    <span>{collocation.chinese_meaning}</span>
                    <small>{collocation.usage_explanation}</small>
                  </article>
                ))}
              </div>
            </section>
            <section className="card-section example-section">
              <h4>简单例句</h4>
              <p>{word.example_sentence}</p>
              <small>{word.example_translation}</small>
            </section>
            <section className="card-section scenario-section">
              <h4>常用场景</h4>
              {word.scenarios.length ? (
                <ul>
                  {word.scenarios.map((scenario) => (
                    <li key={scenario}>{scenario}</li>
                  ))}
                </ul>
              ) : (
                <p>暂无补充场景。</p>
              )}
            </section>
          </div>
        ) : (
          <p className={`enrichment-state ${word.enrichment_status}`}>{statusText[word.enrichment_status]}</p>
        )}

        {word.note && <p className="word-note">笔记：{word.note}</p>}
        <footer className="word-detail-footer">
          <button type="button" className="danger-button" onClick={() => onDelete(word.id)}>
            删除这个单词
          </button>
        </footer>
      </article>
    </div>
  );
}
