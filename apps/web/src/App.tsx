import { FormEvent, useEffect, useState } from "react";

type Word = {
  id: number;
  term: string;
  note: string;
  category: "listening_speaking" | "reading";
  has_listening_speaking: boolean;
  has_reading: boolean;
  add_count: number;
  created_at: string;
};

const API_URL = "http://127.0.0.1:8000";

export default function App() {
  const [words, setWords] = useState<Word[]>([]);
  const [term, setTerm] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<Word["category"]>("reading");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadWords() {
    try {
      const response = await fetch(`${API_URL}/api/words`);
      if (!response.ok) throw new Error("无法读取词库");
      setWords(await response.json());
      setError("");
    } catch {
      setError("没有连接到本地服务，请确认 FastAPI 已启动。");
    }
  }

  useEffect(() => {
    loadWords();
    if (!window.desktop?.onWordsChanged) return;
    return window.desktop.onWordsChanged(loadWords);
  }, []);

  async function addWord(event: FormEvent) {
    event.preventDefault();
    if (!term.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/words`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: term.trim(), note: note.trim(), category })
      });
      if (!response.ok) throw new Error("保存失败");
      setTerm("");
      setNote("");
      await loadWords();
    } catch {
      setError("保存失败，请检查本地服务。");
    } finally {
      setSaving(false);
    }
  }

  async function removeWord(id: number) {
    await fetch(`${API_URL}/api/words/${id}`, { method: "DELETE" });
    await loadWords();
  }

  return (
    <main className="app-shell">
      <header>
        <div>
          <p className="eyebrow">PERSONAL WORD BANK</p>
          <h1>我的单词本</h1>
          <p className="subtitle">先收集，稍后再慢慢认识它们。</p>
        </div>
        <div className="count"><strong>{words.length}</strong><span>个单词</span></div>
      </header>

      <section className="add-card">
        <form onSubmit={addWord}>
          <label>
            单词
            <input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="例如 serendipity" />
          </label>
          <label className="note-field">
            随手记（可选）
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="在哪里遇见的、你的理解……" />
          </label>
          <label className="category-field">
            分类
            <select value={category} onChange={(e) => setCategory(e.target.value as Word["category"])}>
              <option value="reading">读（同时加入听说）</option>
              <option value="listening_speaking">仅听说</option>
            </select>
          </label>
          <button disabled={saving || !term.trim()}>{saving ? "保存中" : "加入词库"}</button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="word-section">
        <div className="section-title"><h2>最近收集</h2><span>Newest first</span></div>
        {words.length === 0 && !error ? (
          <div className="empty"><span>Aa</span><p>词库还是空的，先放进第一个单词吧。</p></div>
        ) : (
          <div className="word-list">
            {words.map((word) => (
              <article key={word.id}>
                <div>
                  <h3>
                    {word.term}
                    {word.has_listening_speaking && <span className="tag listening_speaking">听说</span>}
                    {word.has_reading && <span className="tag reading">读</span>}
                  </h3>
                  <p>{word.note || "还没有笔记"}<span className="add-count">累计加入 {word.add_count} 次</span></p>
                </div>
                <button className="delete" onClick={() => removeWord(word.id)} aria-label={`删除 ${word.term}`}>删除</button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
