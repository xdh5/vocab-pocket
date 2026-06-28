export type LearningMode = "listening_speaking" | "reading";
export type FrequencyLevel = "重点" | "常用" | "了解" | "废弃";
export type EnrichmentStatus = "pending" | "ready" | "failed" | "not_configured";
export type ImageStatus = "not_requested" | "pending" | "ready" | "failed";
export type ReviewRating = "again" | "known";

export type WordMeaning = {
  part_of_speech: string;
  meaning: string;
};

export type WordCollocation = {
  phrase: string;
  chinese_meaning: string;
  usage_explanation: string;
};

export type WordForm = {
  id: number;
  form: string;
  form_type: string;
  add_count: number;
  last_seen_at: string;
  created_at: string;
};

export type Word = {
  id: number;
  term: string;
  note: string;
  has_listening_speaking: boolean;
  has_reading: boolean;
  add_count: number;
  pronunciation: string;
  meanings: WordMeaning[];
  common_forms: string[];
  forms: WordForm[];
  collocations: WordCollocation[];
  example_sentence: string;
  example_translation: string;
  scenarios: string[];
  frequency_level: FrequencyLevel;
  is_visualizable: boolean;
  image_url: string;
  image_source: string;
  image_source_url: string;
  image_attribution: string;
  image_status: ImageStatus;
  enrichment_status: EnrichmentStatus;
  enrichment_error: string;
  ai_model: string;
  enriched_at: string | null;
  review_count: number;
  known_count: number;
  mastery_level: number;
  is_mastered: boolean;
  next_review_at: string | null;
  mastered_at: string | null;
  last_reviewed_at: string | null;
  created_at: string;
};

export type WordCreate = {
  term: string;
  headword?: string;
  form_type?: string;
  common_forms?: string[];
  note: string;
  mode: LearningMode;
};
