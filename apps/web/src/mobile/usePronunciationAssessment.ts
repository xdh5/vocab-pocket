import { useEffect, useRef, useState } from "react";

import { assessPronunciation, type PronunciationAssessment } from "../utils/pronunciation";

const recognitionErrors: Record<string, string> = {
  "not-allowed": "没有麦克风权限，请在 Safari 设置中允许麦克风。",
  "audio-capture": "没有检测到可用的麦克风。",
  "no-speech": "没有听清，请靠近麦克风再读一次。",
  network: "语音识别服务连接失败，请检查网络。",
};

export function usePronunciationAssessment(expectedWord: string) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [assessment, setAssessment] = useState<PronunciationAssessment | null>(null);
  const [error, setError] = useState("");

  function reset() {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
    setAssessment(null);
    setError("");
  }

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
    },
    [],
  );

  function start() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!window.isSecureContext) {
      setError("朗读评分需要 HTTPS；当前局域网 HTTP 页面不能使用麦克风。");
      return;
    }
    if (!Recognition) {
      setError("当前浏览器不支持语音识别，请使用最新版 Safari。");
      return;
    }

    window.speechSynthesis.cancel();
    recognitionRef.current?.abort();
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.onstart = () => {
      setAssessment(null);
      setError("");
      setListening(true);
    };
    recognition.onresult = (event) => {
      const result = event.results[event.resultIndex];
      const alternatives = Array.from({ length: result.length }, (_, index) => result[index]);
      const best = alternatives
        .map((alternative) => assessPronunciation(expectedWord, alternative.transcript))
        .sort((left, right) => right.score - left.score)[0];
      setAssessment(best ?? null);
    };
    recognition.onerror = (event) => {
      setError(recognitionErrors[event.error] ?? "识别失败，请再试一次。");
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  return { listening, assessment, error, start, reset };
}
