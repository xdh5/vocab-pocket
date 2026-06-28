import { useCallback, useEffect, useState } from "react";

import * as wordsApi from "../api/words";
import type { ReviewRating, Word } from "../types/word";

export function useReviewQueue() {
  const [words, setWords] = useState<Word[]>([]);
  const [queue, setQueue] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reviewed, setReviewed] = useState(0);
  const [known, setKnown] = useState(0);

  useEffect(() => {
    wordsApi
      .listWords()
      .then((words) => {
        setWords(words);
        setError("");
      })
      .catch(() => setError("无法连接到电脑端词库，请确认电脑和手机在同一个网络。"))
      .finally(() => setLoading(false));
  }, []);

  const submitReview = useCallback(async (word: Word, rating: ReviewRating) => {
    setSubmitting(true);
    try {
      const updated = await wordsApi.reviewWord(word.id, rating);
      setWords((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setQueue((current) => {
        return current.filter((item) => item.id !== updated.id);
      });
      setReviewed((count) => count + 1);
      if (rating === "known") setKnown((count) => count + 1);
      setError("");
      return true;
    } catch {
      setError("复习结果保存失败，请检查电脑端服务。 ");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const startReview = useCallback((selectedWords: Word[]) => {
    setQueue(selectedWords);
    setReviewed(0);
    setKnown(0);
    setError("");
  }, []);

  return { words, queue, loading, submitting, error, reviewed, known, submitReview, startReview };
}
