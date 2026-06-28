import { useEffect, useMemo, useState } from "react";

import { resolveApiAssetUrl } from "../config";
import type { LearningMode, Word } from "../types/word";
import { speakEnglish } from "../utils/speech";
import "./mobile.css";
import { usePronunciationAssessment } from "./usePronunciationAssessment";
import { useReviewQueue } from "./useReviewQueue";

type ReviewFilter = "all" | LearningMode;
type MobileScreen = "home" | "review" | "library" | "settings" | "reward";
type LibraryFilter = "learning" | "mastered" | "all";

type DailyProgress = { date: string; completed: number; known: number; target: number };
type StudySettings = { reviewTarget: number; newTarget: number };

function todayKey() {
  const learningDay = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return learningDay.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}

function loadDailyProgress(): DailyProgress {
  try {
    const saved = JSON.parse(localStorage.getItem("vocaboom-daily-progress") || "null");
    if (saved?.date === todayKey()) return saved;
  } catch {}
  return { date: todayKey(), completed: 0, known: 0, target: 0 };
}

function matchesFilter(word: Word, filter: ReviewFilter) {
  if (filter === "listening_speaking") return word.has_listening_speaking && !word.has_reading;
  if (filter === "reading") return word.has_reading;
  return true;
}

type MobileReviewPageProps = {
  username: string;
  dailyReviewTarget: number;
  dailyNewTarget: number;
  onSettingsChange: (reviewTarget: number, newTarget: number) => void;
  onLogout: () => void;
};

export function MobileReviewPage({
  username,
  dailyReviewTarget,
  dailyNewTarget,
  onSettingsChange,
  onLogout,
}: MobileReviewPageProps) {
  const { words, queue, loading, submitting, error, reviewed, known, submitReview, startReview } =
    useReviewQueue();
  const [screen, setScreen] = useState<MobileScreen>("home");
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("learning");
  const [studySettings, setStudySettings] = useState<StudySettings>({
    reviewTarget: dailyReviewTarget,
    newTarget: dailyNewTarget,
  });
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionDone, setSessionDone] = useState(0);
  const [daily, setDaily] = useState<DailyProgress>(loadDailyProgress);
  const [revealed, setRevealed] = useState(false);
  const filteredQueue = useMemo(() => queue.filter((word) => matchesFilter(word, filter)), [queue, filter]);
  const currentWord = filteredQueue[0] ?? null;
  const isListeningOnly = Boolean(currentWord?.has_listening_speaking && !currentWord.has_reading);
  const exampleToPlay = currentWord && isListeningOnly && !revealed ? currentWord.example_sentence : "";
  const pronunciation = usePronunciationAssessment(currentWord?.term ?? "");
  const readyWords = useMemo(() => words.filter((word) => word.enrichment_status === "ready"), [words]);
  const newWords = useMemo(() => readyWords.filter((word) => word.review_count === 0), [readyWords]);
  const dueWords = useMemo(
    () =>
      readyWords.filter(
        (word) =>
          word.review_count > 0 &&
          (!word.next_review_at || new Date(word.next_review_at).getTime() <= Date.now()),
      ),
    [readyWords],
  );
  const masteredWords = useMemo(() => words.filter((word) => word.is_mastered), [words]);
  useEffect(() => {
    document.body.classList.add("mobile-body");
    return () => document.body.classList.remove("mobile-body");
  }, []);

  useEffect(() => {
    const synchronizeLearningDay = () => {
      setDaily((current) => {
        const date = todayKey();
        const target = studySettings.reviewTarget + studySettings.newTarget;
        const updated =
          current.date === date ? { ...current, target } : { date, completed: 0, known: 0, target };
        if (JSON.stringify(updated) === JSON.stringify(current)) return current;
        localStorage.setItem("vocaboom-daily-progress", JSON.stringify(updated));
        return updated;
      });
    };
    synchronizeLearningDay();
    const timer = window.setInterval(synchronizeLearningDay, 60_000);
    return () => window.clearInterval(timer);
  }, [studySettings]);

  useEffect(() => {
    setStudySettings({ reviewTarget: dailyReviewTarget, newTarget: dailyNewTarget });
  }, [dailyReviewTarget, dailyNewTarget]);

  useEffect(() => {
    if (exampleToPlay) speakEnglish(exampleToPlay);
  }, [exampleToPlay]);

  async function rateCurrent(rating: "again" | "known") {
    if (!currentWord) return;
    const saved = await submitReview(currentWord, rating);
    if (saved) {
      setSessionDone((count) => count + 1);
      setDaily((current) => {
        const updated = {
          ...current,
          completed: current.completed + 1,
          known: current.known + (rating === "known" ? 1 : 0),
        };
        localStorage.setItem("vocaboom-daily-progress", JSON.stringify(updated));
        return updated;
      });
      pronunciation.reset();
      setRevealed(false);
      if (queue.length === 1) setScreen("reward");
    }
  }

  function beginSession(reviewCount = studySettings.reviewTarget, freshCount = studySettings.newTarget) {
    const reviews = dueWords.slice(0, reviewCount);
    const fresh = newWords.slice(0, freshCount);
    const selected: Word[] = [];
    for (let index = 0; index < Math.max(reviews.length, fresh.length); index += 1) {
      if (reviews[index]) selected.push(reviews[index]);
      if (fresh[index]) selected.push(fresh[index]);
    }
    if (!selected.length) return;
    startReview(selected);
    setSessionTotal(selected.length);
    setSessionDone(0);
    setFilter("all");
    setRevealed(false);
    setDaily((current) => {
      const updated = {
        ...current,
        target: studySettings.reviewTarget + studySettings.newTarget,
      };
      localStorage.setItem("vocaboom-daily-progress", JSON.stringify(updated));
      return updated;
    });
    setScreen("review");
  }

  const scoreTone = pronunciation.assessment
    ? pronunciation.assessment.score >= 85
      ? "good"
      : pronunciation.assessment.score >= 60
        ? "medium"
        : "poor"
    : "";

  if (screen === "home") {
    return (
      <main className="mobile-app mobile-home">
        <header className="home-topbar">
          <b>VOCABOOM</b>
          <span>{username}</span>
        </header>
        {loading ? (
          <p className="mobile-message">正在读取词库…</p>
        ) : (
          <>
            <section className="home-action-card">
              {queue.length > 0 && sessionDone < sessionTotal ? (
                <button type="button" className="home-primary-button" onClick={() => setScreen("review")}>
                  继续学习 · 还差 {sessionTotal - sessionDone} 个
                </button>
              ) : (
                <button
                  type="button"
                  className="home-primary-button"
                  disabled={!dueWords.length && !newWords.length}
                  onClick={() => beginSession()}
                >
                  {daily.completed >= daily.target && daily.target > 0 ? "再学一组" : "开始学习"}
                </button>
              )}
            </section>

            <section
              className={`home-progress-card ${daily.target > 0 && daily.completed >= daily.target ? "complete" : ""}`}
            >
              <div className="home-progress-heading">
                <div>
                  <span>今日学习进度</span>
                  <strong>
                    {daily.completed}
                    <small> / {daily.target}</small>
                  </strong>
                </div>
                <b>{daily.target ? Math.min(100, Math.round((daily.completed / daily.target) * 100)) : 0}%</b>
              </div>
              <div className="home-progress-track">
                <i
                  style={{
                    width: `${daily.target ? Math.min(100, (daily.completed / daily.target) * 100) : 0}%`,
                  }}
                />
              </div>
              <p>
                {daily.completed >= daily.target && daily.target > 0
                  ? "太棒了，今天的目标已经完成！"
                  : `今天已学习 ${daily.completed} 个，还差 ${Math.max(0, daily.target - daily.completed)} 个`}
              </p>
            </section>

            <section className="home-stats-card">
              <h2>词库统计</h2>
              <div>
                <span>
                  <strong>{words.length}</strong>
                  <small>总词数</small>
                </span>
                <span>
                  <strong>{words.length - masteredWords.length}</strong>
                  <small>学习中</small>
                </span>
                <span>
                  <strong>{masteredWords.length}</strong>
                  <small>已掌握</small>
                </span>
              </div>
            </section>
          </>
        )}
        <nav className="mobile-bottom-nav">
          <button className="active" type="button">
            首页
          </button>
          <button type="button" onClick={() => setScreen("library")}>
            词库
          </button>
          <button type="button" onClick={() => setScreen("settings")}>
            设置
          </button>
        </nav>
      </main>
    );
  }

  if (screen === "library") {
    const visibleWords = words.filter(
      (word) =>
        libraryFilter === "all" || (libraryFilter === "mastered" ? word.is_mastered : !word.is_mastered),
    );
    return (
      <main className="mobile-app mobile-library">
        <header className="mobile-header">
          <div>
            <p>VOCABOOM</p>
            <h1>我的词库</h1>
          </div>
          <strong>{words.length} 词</strong>
        </header>
        <nav className="review-filters">
          {[
            ["learning", "学习中"],
            ["mastered", "已掌握"],
            ["all", "全部"],
          ].map(([value, label]) => (
            <button
              type="button"
              className={libraryFilter === value ? "active" : ""}
              onClick={() => setLibraryFilter(value as LibraryFilter)}
              key={value}
            >
              {label}
            </button>
          ))}
        </nav>
        <section className="mobile-word-list">
          {visibleWords.map((word) => (
            <article key={word.id}>
              <div>
                <strong>{word.term}</strong>
                <span>
                  {word.review_count === 0
                    ? "未开始"
                    : word.is_mastered
                      ? "已掌握"
                      : `掌握 ${word.mastery_level}/8`}
                </span>
              </div>
              <small>
                累计加入 {word.add_count} 次 · 复习 {word.review_count} 次
              </small>
            </article>
          ))}
          {!visibleWords.length && <p className="mobile-message">这里暂时没有单词。</p>}
        </section>
        <nav className="mobile-bottom-nav">
          <button type="button" onClick={() => setScreen("home")}>
            首页
          </button>
          <button className="active" type="button">
            词库
          </button>
          <button type="button" onClick={() => setScreen("settings")}>
            设置
          </button>
        </nav>
      </main>
    );
  }

  if (screen === "settings") {
    function updateSettings(next: StudySettings) {
      setStudySettings(next);
      onSettingsChange(next.reviewTarget, next.newTarget);
      setDaily((current) => {
        const updated = { ...current, target: next.reviewTarget + next.newTarget };
        localStorage.setItem("vocaboom-daily-progress", JSON.stringify(updated));
        return updated;
      });
    }
    return (
      <main className="mobile-app mobile-settings">
        <header className="mobile-header">
          <div>
            <p>VOCABOOM</p>
            <h1>学习设置</h1>
          </div>
          <strong>{username}</strong>
        </header>
        <section className="study-plan-card settings-card">
          <h2>每日固定目标</h2>
          <p>每天凌晨 5:00 开始新的一天。</p>
          <label>
            <span>到期复习</span>
            <select
              value={studySettings.reviewTarget}
              onChange={(event) =>
                updateSettings({ ...studySettings, reviewTarget: Number(event.target.value) })
              }
            >
              {[0, 5, 10, 20, 30, 50].map((value) => (
                <option value={value} key={value}>
                  {value} 个
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>新背单词</span>
            <select
              value={studySettings.newTarget}
              onChange={(event) =>
                updateSettings({ ...studySettings, newTarget: Number(event.target.value) })
              }
            >
              {[0, 5, 10, 20, 30].map((value) => (
                <option value={value} key={value}>
                  {value} 个
                </option>
              ))}
            </select>
          </label>
        </section>
        <section className="account-settings">
          <span>当前账号</span>
          <strong>{username}</strong>
          <button type="button" onClick={onLogout}>
            退出登录
          </button>
        </section>
        <nav className="mobile-bottom-nav">
          <button type="button" onClick={() => setScreen("home")}>
            首页
          </button>
          <button type="button" onClick={() => setScreen("library")}>
            词库
          </button>
          <button className="active" type="button">
            设置
          </button>
        </nav>
      </main>
    );
  }

  if (screen === "reward") {
    return (
      <main className="mobile-app reward-screen">
        <div className="reward-burst">★</div>
        <p>VOCABOOM</p>
        <h1>这一组完成啦！</h1>
        <strong>今天已经背了 {daily.completed} 个</strong>
        <span>其中认识 {daily.known} 个，记忆正在一点点变牢。</span>
        <button
          type="button"
          className="start-study-button"
          disabled={!newWords.length}
          onClick={() => beginSession(0, Math.min(5, newWords.length))}
        >
          再背一组新词
        </button>
        <button type="button" className="reward-home-button" onClick={() => setScreen("home")}>
          回到首页
        </button>
      </main>
    );
  }

  return (
    <main className="mobile-app">
      <header className="mobile-header">
        <div>
          <p>VOCABOOM</p>
          <h1>今天背几个？</h1>
        </div>
        <div className="session-header-actions">
          <div className="today-stat">
            <strong>{reviewed}</strong>
            <span>本次复习</span>
          </div>
          <button type="button" onClick={() => setScreen("home")}>
            返回首页
          </button>
        </div>
      </header>

      <nav className="review-filters" aria-label="复习类型">
        {[
          ["all", "全部"],
          ["listening_speaking", "仅听说"],
          ["reading", "阅读"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={filter === value ? "active" : ""}
            onClick={() => {
              setFilter(value as ReviewFilter);
              pronunciation.reset();
              setRevealed(false);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {error && <p className="mobile-error">{error}</p>}

      <section className="review-stage">
        {loading ? (
          <p className="mobile-message">正在读取词库…</p>
        ) : currentWord ? (
          <article className={`review-card ${revealed ? "revealed" : ""}`}>
            <div className="review-card-topline">
              <span>{currentWord.frequency_level}</span>
              <span>
                {currentWord.is_mastered ? "已掌握 · 维护复习" : `掌握 ${currentWord.mastery_level}/8`}
              </span>
              <span>还剩 {filteredQueue.length} 个</span>
            </div>

            <div className={`review-word ${isListeningOnly && !revealed ? "listening-prompt" : ""}`}>
              {isListeningOnly && !revealed ? (
                <>
                  <span className="listening-icon" aria-hidden="true">
                    〽
                  </span>
                  <h2 className="hidden-word-title">先听例句</h2>
                  <p>猜猜例句里是哪一个单词</p>
                  <button
                    type="button"
                    className="mobile-speak"
                    onClick={() => speakEnglish(currentWord.example_sentence)}
                  >
                    🔊 再听一遍例句
                  </button>
                </>
              ) : (
                <>
                  <h2>{currentWord.term}</h2>
                  {currentWord.pronunciation && <p>/{currentWord.pronunciation}/</p>}
                  <button
                    type="button"
                    className="mobile-speak"
                    onClick={() => speakEnglish(currentWord.term)}
                  >
                    🔊 播放单词
                  </button>
                </>
              )}
            </div>

            {!revealed ? (
              <button type="button" className="reveal-button" onClick={() => setRevealed(true)}>
                显示答案
              </button>
            ) : (
              <div className="review-answer">
                <section>
                  <h3>核心意思</h3>
                  {currentWord.meanings.map((meaning) => (
                    <p key={`${meaning.part_of_speech}-${meaning.meaning}`}>
                      <b>{meaning.part_of_speech}</b> {meaning.meaning}
                    </p>
                  ))}
                </section>

                {currentWord.common_forms.length > 1 && (
                  <section className="mobile-forms">
                    <h3>常见变体</h3>
                    <p>{currentWord.common_forms.join(" · ")}</p>
                  </section>
                )}

                {currentWord.image_status === "ready" && currentWord.image_url && (
                  <figure className="mobile-word-image">
                    <img
                      src={resolveApiAssetUrl(currentWord.image_url)}
                      alt={`${currentWord.term} 的词义图片`}
                    />
                    <figcaption>
                      {currentWord.image_source === "wikimedia" ? "Wikimedia 实图" : "豆包生成"}
                      {currentWord.image_attribution && ` · ${currentWord.image_attribution}`}
                    </figcaption>
                  </figure>
                )}

                <section className="pronunciation-assessment">
                  <div className="assessment-heading">
                    <div>
                      <h3>跟读评分</h3>
                      <p>读出这个单词，红色字母表示没有匹配上的部分。</p>
                    </div>
                    <button type="button" disabled={pronunciation.listening} onClick={pronunciation.start}>
                      {pronunciation.listening ? "正在听…" : "🎙 开始朗读"}
                    </button>
                  </div>
                  {pronunciation.error && <p className="assessment-error">{pronunciation.error}</p>}
                  {pronunciation.assessment && (
                    <div className="assessment-result">
                      <strong className={`score ${scoreTone}`}>{pronunciation.assessment.score}</strong>
                      <div>
                        <div className="assessed-word">
                          {pronunciation.assessment.letters.map((letter) => (
                            <span className={letter.correct ? "correct" : "incorrect"} key={letter.id}>
                              {letter.character}
                            </span>
                          ))}
                        </div>
                        <small>识别为：{pronunciation.assessment.transcript}</small>
                      </div>
                    </div>
                  )}
                </section>

                {currentWord.collocations.length > 0 && (
                  <section>
                    <h3>常见搭配</h3>
                    <div className="mobile-collocations">
                      {currentWord.collocations.map((item) => (
                        <article key={item.phrase}>
                          <strong>{item.phrase}</strong>
                          <span>{item.chinese_meaning}</span>
                          <small>{item.usage_explanation}</small>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
                <section className="mobile-example">
                  <h3>例句</h3>
                  <p>{currentWord.example_sentence}</p>
                  <small>{currentWord.example_translation}</small>
                </section>
                {currentWord.scenarios.length > 0 && (
                  <section className="mobile-scenario">
                    <h3>常用场景</h3>
                    <p>{currentWord.scenarios.join("；")}</p>
                  </section>
                )}
              </div>
            )}
          </article>
        ) : (
          <div className="review-finished">
            <span>✓</span>
            <h2>{reviewed ? "这一轮完成了" : "今天暂时没有到期单词"}</h2>
            <p>
              {reviewed
                ? `认识 ${known} 个，系统会按记忆曲线安排下次复习。`
                : "新加入的词和到期的词会自动出现在这里。"}
            </p>
          </div>
        )}
      </section>

      {currentWord && revealed && (
        <footer className="review-actions">
          <button
            type="button"
            className="again-button"
            disabled={submitting}
            onClick={() => void rateCurrent("again")}
          >
            再来一次
          </button>
          <button
            type="button"
            className="known-button"
            disabled={submitting}
            onClick={() => void rateCurrent("known")}
          >
            认识
          </button>
        </footer>
      )}
    </main>
  );
}
