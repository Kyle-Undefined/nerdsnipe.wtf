import { useState, useEffect, useCallback } from "react";

const SKIP_KEY = "nerdsnipe:skip-intro";

function shouldSkip(): boolean {
  return (
    localStorage.getItem(SKIP_KEY) === "1" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface IntroState {
  typing: boolean;
  prompted: boolean;
  assistantStarted: boolean;
  replay: () => void;
}

export function useIntro(): IntroState {
  const skip = shouldSkip();

  const [typing, setTyping] = useState(!skip);
  const [prompted, setPrompted] = useState(skip);
  const [assistantStarted, setAssistantStarted] = useState(skip);

  useEffect(() => {
    if (skip) return;

    // mark as seen so subsequent visits skip the animation
    const t1 = setTimeout(() => {
      setTyping(false);
      setPrompted(true);
    }, 1400);

    const t2 = setTimeout(() => {
      setAssistantStarted(true);
      localStorage.setItem(SKIP_KEY, "1");
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [skip]);

  const replay = useCallback(() => {
    localStorage.removeItem(SKIP_KEY);
    setTyping(true);
    setPrompted(false);
    setAssistantStarted(false);

    setTimeout(() => {
      setTyping(false);
      setPrompted(true);
    }, 1400);

    setTimeout(() => {
      setAssistantStarted(true);
      localStorage.setItem(SKIP_KEY, "1");
    }, 2000);
  }, []);

  return { typing, prompted, assistantStarted, replay };
}
