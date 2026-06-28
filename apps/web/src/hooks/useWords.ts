import { useCallback, useEffect, useState } from "react";

import * as wordsApi from "../api/words";
import type { Word, WordCreate } from "../types/word";

export function useWords() {
  const [words, setWords] = useState<Word[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setWords(await wordsApi.listWords());
      setError("");
    } catch {
      setError("没有连接到本地服务，请确认 FastAPI 已启动。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return window.desktop?.onWordsChanged?.(() => void refresh());
  }, [refresh]);

  useEffect(() => {
    if (!words.some((word) => word.enrichment_status === "pending")) return undefined;
    const timer = window.setTimeout(() => void refresh(), 2000);
    return () => window.clearTimeout(timer);
  }, [refresh, words]);

  const addWord = useCallback(
    async (payload: WordCreate) => {
      try {
        const dictionaryEntry = window.desktop?.dictionary
          ? await window.desktop.dictionary.lookup(payload.term)
          : null;
        await wordsApi.createWord(
          dictionaryEntry
            ? {
                ...payload,
                headword: dictionaryEntry.headword,
                form_type: dictionaryEntry.formType,
                common_forms: dictionaryEntry.commonForms,
              }
            : payload,
        );
        await refresh();
        return true;
      } catch {
        setError("保存失败，请检查本地服务。");
        return false;
      }
    },
    [refresh],
  );

  const removeWord = useCallback(
    async (wordId: number) => {
      try {
        await wordsApi.deleteWord(wordId);
        await refresh();
      } catch {
        setError("删除失败，请稍后重试。");
      }
    },
    [refresh],
  );

  return { words, error, loading, addWord, removeWord };
}
