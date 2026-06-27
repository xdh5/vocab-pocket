import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./hover.css";

type Meaning = { pos: string; text: string };

function HoverCard() {
  const params = new URLSearchParams(window.location.search);
  const word = params.get("word") || "";
  const phonetic = params.get("phonetic") || "";
  const initialCount = Number(params.get("count") || 0);
  let meanings: Meaning[] = [];
  try { meanings = JSON.parse(params.get("meanings") || "[]"); } catch { meanings = []; }

  const [count, setCount] = useState(initialCount);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const timer = window.setTimeout(() => window.desktop.hover.dismiss(), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  function speak() {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    const voices = window.speechSynthesis.getVoices();
    const preferredNames = ["Microsoft Aria", "Microsoft Jenny", "Microsoft Guy", "Microsoft Zira", "Microsoft David"];
    const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en-us"));
    utterance.voice = preferredNames
      .map((name) => englishVoices.find((voice) => voice.name.includes(name)))
      .find(Boolean) || englishVoices[0] || voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) || null;
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function addWord(category: "listening_speaking" | "reading") {
    setStatus("saving");
    const result = await window.desktop.hover.addWord(word, category);
    if (!result.ok) return setStatus("error");
    setCount(result.count || count + 1);
    setStatus("saved");
    window.setTimeout(() => window.desktop.hover.dismiss(), 900);
  }

  const labels = { saving: "保存中…", saved: `第 ${count} 次 ✓`, error: "保存失败" };
  return (
    <div className="hover-card" onContextMenu={(event) => event.preventDefault()}>
      <div className="word-info">
        <div className="word-line">
          <strong>{word}</strong>
          {phonetic && <span className="phonetic">/{phonetic}/</span>}
          <button className="speak-button" onClick={speak} aria-label={`播放 ${word} 的读音`} title="播放读音">🔊</button>
        </div>
        <span className="count-line">累计加入 {count} 次</span>
        <div className="meaning-list">
          {meanings.length ? meanings.map((meaning, index) => (
            <div key={`${meaning.pos}-${index}`}><b>{meaning.pos}.</b><span>{meaning.text}</span></div>
          )) : <div className="no-meaning">暂无基础释义</div>}
        </div>
      </div>
      <div className="hover-footer">
        {status === "idle" ? (
          <div className="hover-actions">
            <button className="speaking" onClick={() => addWord("listening_speaking")}>＋仅听说</button>
            <button onClick={() => addWord("reading")}>＋读（含听说）</button>
          </div>
        ) : <span className="hover-status">{labels[status]}</span>}
      </div>
      <button className="hover-close" onClick={() => window.desktop.hover.dismiss()} aria-label="关闭">×</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("hover-root")!).render(<HoverCard />);
