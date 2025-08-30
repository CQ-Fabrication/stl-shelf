import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset?: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
  }
}

type TurnstileProps = {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
};

export function Turnstile({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = 'auto',
  className,
}: TurnstileProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  // Keep latest callbacks without retriggering render effect
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !ref.current || !window.turnstile?.render) return;
      // Clean any previous widget DOM
      ref.current.innerHTML = '';
      // Render (idempotent via our widgetIdRef)
      widgetIdRef.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token) => !cancelled && onVerifyRef.current?.(token),
        'expired-callback': () => !cancelled && onExpireRef.current?.(),
        'error-callback': () => !cancelled && onErrorRef.current?.(),
        theme,
      });
    };

    // If script already present, render immediately
    if (window.turnstile?.render) {
      renderWidget();
    } else {
      // Inject script once
      const scriptId = 'cf-turnstile-script';
      let script = document.getElementById(
        scriptId
      ) as HTMLScriptElement | null;
      if (script) {
        // Will render when script has executed and window.turnstile is ready
        script.addEventListener('load', renderWidget, { once: true });
        // In case it's already loaded
        if (window.turnstile?.render) renderWidget();
      } else {
        script = document.createElement('script');
        script.id = scriptId;
        script.src =
          'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      // Remove widget instance to prevent duplicates on remounts/strict mode
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }
      widgetIdRef.current = null;
      if (ref.current) ref.current.innerHTML = '';
    };
  }, [siteKey, theme]);

  return <div className={className} ref={ref} />;
}
