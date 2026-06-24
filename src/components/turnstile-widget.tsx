"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

export function TurnstileWidget({
  siteKey,
  onToken
}: {
  siteKey?: string;
  onToken: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    const scriptId = "turnstile-script";
    const render = () => {
      if (!window.turnstile || !containerRef.current) return;
      window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onToken,
        "expired-callback": () => onToken("")
      });
    };
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener("load", render, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", render, { once: true });
    document.head.appendChild(script);
  }, [onToken, siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} aria-label="Human verification" />;
}
