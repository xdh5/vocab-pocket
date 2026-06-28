import type { ReviewRating, Word, WordCreate } from "../types/word";
import { apiRequest } from "./http";

export function listWords(): Promise<Word[]> {
  return apiRequest<Word[]>("/api/words");
}

export function createWord(payload: WordCreate): Promise<Word> {
  return apiRequest<Word>("/api/words", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteWord(wordId: number): Promise<void> {
  return apiRequest<void>(`/api/words/${wordId}`, { method: "DELETE" });
}

export function listReviewQueue(): Promise<Word[]> {
  return apiRequest<Word[]>("/api/words/review");
}

export function reviewWord(wordId: number, rating: ReviewRating): Promise<Word> {
  return apiRequest<Word>(`/api/words/${wordId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });
}
