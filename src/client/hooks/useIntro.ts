import { useState, useEffect, useCallback, useRef } from "react";

const SKIP_KEY = "nerdsnipe:skip-intro";

function shouldSkip(): boolean {
  if (typeof window === "undefined") return true;
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

  // tracks replay timers so we can clear them on re-replay or unmount
  const replayTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  // cleanup replay timers on unmount
  useEffect(() => {
    return () => {
      replayTimers.current.forEach(clearTimeout);
    };
  }, []);

  const replay = useCallback(() => {
    if (typeof window === "undefined") return;

    replayTimers.current.forEach(clearTimeout);
    replayTimers.current = [];

    localStorage.removeItem(SKIP_KEY);
    setTyping(true);
    setPrompted(false);
    setAssistantStarted(false);

    replayTimers.current.push(
      setTimeout(() => {
        setTyping(false);
        setPrompted(true);
      }, 1400),
    );

    replayTimers.current.push(
      setTimeout(() => {
        setAssistantStarted(true);
        localStorage.setItem(SKIP_KEY, "1");
      }, 2000),
    );
  }, []);

  return { typing, prompted, assistantStarted, replay };
}
