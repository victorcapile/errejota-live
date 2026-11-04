"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

const STORAGE_KEY = "errejota-presence";
const PING_INTERVAL_MS = 30_000;

function readSessionId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9-]{8,64}$/.test(existing)) {
      return existing;
    }
    const created =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

type Props = {
  /**
   * "header": pílula compacta para o header no desktop.
   * "floating": pílula flutuante para a parte inferior da tela no mobile.
   */
  variant?: "header" | "floating";
  className?: string;
};

export function PresenceBadge({ variant = "header", className = "" }: Props) {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    const sessionId = readSessionId();
    let cancelled = false;

    const ping = async () => {
      try {
        const response = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { online?: unknown };
        if (!cancelled && typeof payload.online === "number") {
          setOnline(payload.online);
        }
      } catch {
        // Sem conexão: mantém o último valor conhecido.
      }
    };

    void ping();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void ping();
      }
    }, PING_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void ping();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const base =
    "items-center gap-1.5 rounded-full border border-line bg-card/95 text-[11px] font-medium text-muted shadow-sm backdrop-blur";

  if (variant === "floating") {
    return (
      <span
        className={`${base} inline-flex px-3 py-1.5 shadow-lg ${className}`}
        role="status"
        aria-live="polite"
        title="Pessoas com o site aberto agora"
        data-testid="presence-badge"
      >
        <PresenceDot />
        <span className="tabular-nums text-foreground">{online ?? "—"}</span>
        <span>online</span>
      </span>
    );
  }

  return (
    <span
      className={`${base} inline-flex h-8 shrink-0 px-2.5 sm:h-9 ${className}`}
      role="status"
      aria-live="polite"
      title="Pessoas com o site aberto agora"
      data-testid="presence-badge"
    >
      <PresenceDot />
      <Users aria-hidden className="size-3.5" />
      <span className="tabular-nums text-foreground">{online ?? "—"}</span>
      <span className="hidden sm:inline">online</span>
    </span>
  );
}

function PresenceDot() {
  return (
    <span className="relative flex size-2" aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
    </span>
  );
}
