import { useEffect, useRef, useState } from "react";

const DEFAULT_REDIRECT_SECONDS = 5;
const REDIRECT_TICK_MS = 50;

type RedirectCountdownOptions = {
  seconds?: number;
  onRedirect?: () => void;
};

export function useRedirectCountdown({
  seconds = DEFAULT_REDIRECT_SECONDS,
  onRedirect,
}: RedirectCountdownOptions) {
  const [secondsLeft, setSecondsLeft] = useState(seconds);
  const [progress, setProgress] = useState(0);
  const hasRedirectedRef = useRef(false);
  const lastSecondRef = useRef(seconds);

  useEffect(() => {
    setSecondsLeft(seconds);
    setProgress(0);
    hasRedirectedRef.current = false;
    lastSecondRef.current = seconds;

    const start = performance.now();
    const totalMs = Math.max(0, seconds * 1000);
    const interval = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const remainingMs = Math.max(totalMs - elapsed, 0);
      const nextSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
      const nextProgress = totalMs === 0 ? 1 : Math.min(1, elapsed / totalMs);

      if (nextSeconds !== lastSecondRef.current) {
        lastSecondRef.current = nextSeconds;
        setSecondsLeft(nextSeconds);
      }

      setProgress(nextProgress);

      if (remainingMs === 0 && !hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        onRedirect?.();
      }
    }, REDIRECT_TICK_MS);

    return () => window.clearInterval(interval);
  }, [seconds, onRedirect]);

  return { secondsLeft, progress };
}
