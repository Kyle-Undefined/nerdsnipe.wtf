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
  // initialize to "skipped" defaults so server render (if any) and first
  // client render agree — the actual decision happens in the mount effect
  // below, which only runs in the browser.
  const [typing, setTyping] = useState(false);
  const [prompted, setPrompted] = useState(true);
  const [assistantStarted, setAssistantStarted] = useState(true);

  // tracks replay timers so we can clear them on re-replay or unmount
  const replayTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (shouldSkip()) return;

    // user hasn't seen the intro — play it now
    setTyping(true);
    setPrompted(false);
    setAssistantStarted(false);

    const t1 = setTimeout(() => {
      setTyping(false);
      setPrompted(true);
    }, 1400);

    const t2 = setTimeout(() => {
      setAssistantStarted(true);
      // mark as seen so subsequent visits skip the animation
      localStorage.setItem(SKIP_KEY, "1");
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

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
