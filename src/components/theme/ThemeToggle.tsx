"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

/**
 * Alternância de tema em texto + ícone, no espírito do restante da v2.0:
 * sem pílula e com o estado ativo em tinta sobre papel.
 */
export function ThemeToggle() {
  const { theme, mounted, toggle } = useTheme();
  const isDark = theme === "dark";

  if (!mounted) {
    return (
      <div
        aria-hidden
        className="h-8 w-[118px] shrink-0 border border-line"
      />
    );
  }

  return (
    <div
      role="group"
      aria-label="Tema da interface"
      className="inline-flex h-8 shrink-0 items-center border border-line"
    >
      <button
        type="button"
        onClick={() => {
          if (isDark) {
            toggle();
          }
        }}
        aria-pressed={!isDark}
        className={`inline-flex h-full items-center gap-1.5 px-2 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${
          !isDark
            ? "bg-foreground text-background"
            : "text-muted hover:text-foreground"
        }`}
      >
        <Sun aria-hidden className="size-3" />
        Dia
      </button>
      <button
        type="button"
        onClick={() => {
          if (!isDark) {
            toggle();
          }
        }}
        aria-pressed={isDark}
        className={`inline-flex h-full items-center gap-1.5 border-l border-line px-2 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${
          isDark
            ? "bg-foreground text-background"
            : "text-muted hover:text-foreground"
        }`}
      >
        <Moon aria-hidden className="size-3" />
        Noite
      </button>
    </div>
  );
}
