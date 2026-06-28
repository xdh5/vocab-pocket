import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import "./hover.css";

type Meaning = { pos: string; text: string };

function parseMeanings(params: URLSearchParams): Meaning[] {
  try {
    return JSON.parse(params.get("meanings") || "[]");
  } catch {
    return [];
  }
}

function HoverCard() {
  const params = new URLSearchParams(window.location.search);
  const word = params.get("word") || "";
  const localHeadword = params.get("headword") || word;
  const formType = params.get("formType") || "原形";
  const commonForms = (() => {
    try {
      return JSON.parse(params.get("commonForms") || "[]") as string[];
    } catch {
      return [localHeadword];
    }
  })();
  const phonetic = params.get("phonetic") || "";
  const meanings = parseMeanings(params);
  const [count, setCount] = useState(Number(params.get("count") || 0));
  const [headword, setHeadword] = useState(localHeadword);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (status !== "idle") return undefined;
    const timer = window.setTimeout(() => window.desktop.hover.dismiss(), 8000);
    return () => window.clearTimeout(timer);
  }, [status]);

  function speak() {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    const voices = window.speechSynthesis.getVoices();
    const preferredNames = [
      "Microsoft Aria",
      "Microsoft Jenny",
      "Microsoft Guy",
      "Microsoft Zira",
      "Microsoft David",
    ];
    const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en-us"));
    utterance.voice =
      preferredNames.map((name) => englishVoices.find((voice) => voice.name.includes(name))).find(Boolean) ||
      englishVoices[0] ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
      null;
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function addWord(mode: "listening_speaking" | "reading") {
    setStatus("saving");
    const result = await window.desktop.hover.addWord(word, mode, {
      headword: localHeadword,
      formType,
      commonForms,
    });
    if (!result.ok) return setStatus("error");
    setCount(result.count || count + 1);
    setHeadword(result.headword || word);
    setStatus("saved");
    window.setTimeout(() => window.desktop.hover.dismiss(), 900);
  }

  const wasMerged = headword.localeCompare(word, undefined, { sensitivity: "accent" }) !== 0;
  const labels = {
    saving: "正在加入词库…",
    saved: wasMerged ? `已归入 ${headword} · 第 ${count} 次 ✓` : `第 ${count} 次 ✓`,
    error: "保存失败",
  };
  return (
    <div className="hover-card">
      <div className="word-info">
        <div className="word-line">
          <strong>{word}</strong>
          {phonetic && <span className="phonetic">/{phonetic}/</span>}
          <button
            type="button"
            className="speak-button"
            onClick={speak}
            aria-label={`播放 ${word} 的读音`}
            title="播放读音"
          >
            🔊
          </button>
        </div>
        <span className="count-line">累计加入 {count} 次</span>
        <div className="meaning-list">
          {meanings.length ? (
            meanings.map((meaning) => (
              <div key={`${meaning.pos}-${meaning.text}`}>
                <b>{meaning.pos}.</b>
                <span>{meaning.text}</span>
              </div>
            ))
          ) : (
            <div className="no-meaning">暂无基础释义</div>
          )}
        </div>
      </div>
      <div className="hover-footer">
        {status === "idle" ? (
          <div className="hover-actions">
            <button type="button" className="speaking" onClick={() => addWord("listening_speaking")}>
              ＋仅听说
            </button>
            <button type="button" onClick={() => addWord("reading")}>
              ＋读（含听说）
            </button>
          </div>
        ) : (
          <span className="hover-status">{labels[status]}</span>
        )}
      </div>
      <button
        type="button"
        className="hover-close"
        onClick={() => window.desktop.hover.dismiss()}
        aria-label="关闭"
      >
        ×
      </button>
    </div>
  );
}

const rootElement = document.getElementById("hover-root");
if (!rootElement) throw new Error("Hover root element was not found");
ReactDOM.createRoot(rootElement).render(<HoverCard />);
