import { type FormEvent, useState } from "react";

import type { LearningMode, WordCreate } from "../types/word";

type AddWordFormProps = {
  onAdd: (payload: WordCreate) => Promise<boolean>;
};

export function AddWordForm({ onAdd }: AddWordFormProps) {
  const [term, setTerm] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<LearningMode>("reading");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!term.trim()) return;
    setSaving(true);
    const saved = await onAdd({ term: term.trim(), note: note.trim(), mode });
    setSaving(false);
    if (saved) {
      setTerm("");
      setNote("");
    }
  }

  return (
    <section className="add-card">
      <form onSubmit={handleSubmit}>
        <label>
          单词
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="例如 serendipity"
          />
        </label>
        <label className="note-field">
          随手记（可选）
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="在哪里遇见的、你的理解……"
          />
        </label>
        <label className="category-field">
          加入方式
          <select value={mode} onChange={(event) => setMode(event.target.value as LearningMode)}>
            <option value="reading">读（同时加入听说）</option>
            <option value="listening_speaking">仅听说</option>
          </select>
        </label>
        <button type="submit" disabled={saving || !term.trim()}>
          {saving ? "正在加入…" : "加入词库"}
        </button>
      </form>
    </section>
  );
}
