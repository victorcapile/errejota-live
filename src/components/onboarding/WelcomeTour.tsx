"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";

const STORAGE_KEY = "errejota:onboarding:v2";

type TourStep = {
  id: string;
  title: string;
  body: string;
  target: string;
  placement?: "center" | "right" | "bottom";
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "3d",
    title: "A cidade em 3D.",
    body: "Bem-vindo à v2.0. Ligue o 3D para inclinar o mapa e ver os prédios em relevo. As câmeras continuam por cima.",
    target: "3d",
    placement: "right",
  },
  {
    id: "help",
    title: "Pontos de apoio.",
    body: "Ligue Ajuda para ver hospitais, abrigos e pontos de apoio, agrupados por bairro. Os filtros separam cada tipo.",
    target: "help",
    placement: "right",
  },
  {
    id: "risk",
    title: "Risco atual.",
    body: "A chuva de 1h, 24h e 96h cruza com o ISMFI do bairro. No modo avançado, o mapa é pintado pelo risco atual.",
    target: "rain",
    placement: "right",
  },
  {
    id: "stage",
    title: "O estágio do dia.",
    body: "O estágio define a cor da interface e o contexto da cidade. O alerta oficial é sempre do Alerta Rio / COR-Rio / Defesa Civil.",
    target: "stage",
    placement: "bottom",
  },
];

type Props = {
  sidebarOpen: boolean;
  onSidebarChange: (open: boolean) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function cardStyleFor(
  rect: DOMRect | null,
  anchorRect: DOMRect | null,
  placement: TourStep["placement"],
): CSSProperties {
  const margin = 16;
  const width = Math.min(
    window.innerWidth < 1024 ? 280 : 300,
    window.innerWidth - margin * 2,
  );
  const viewportMaxHeight = "calc(100dvh - 2rem)";

  if (!rect) {
    return {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width,
      maxHeight: viewportMaxHeight,
    };
  }

  if (window.innerWidth < 1024) {
    if (placement === "center") {
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width,
        maxHeight: viewportMaxHeight,
      };
    }
    const gap = 12;
    const left = clamp(
      rect.left + rect.width / 2 - width / 2,
      margin,
      window.innerWidth - width - margin,
    );
    const targetInTopHalf = rect.top + rect.height / 2 < window.innerHeight / 2;
    if (targetInTopHalf) {
      return {
        left,
        top: Math.min(rect.bottom + gap, window.innerHeight - margin),
        width,
        maxHeight: viewportMaxHeight,
      };
    }
    return {
      left,
      bottom: Math.min(
        window.innerHeight - rect.top + gap,
        window.innerHeight - margin,
      ),
      width,
      maxHeight: viewportMaxHeight,
    };
  }

  const estimatedHeight = 210;
  const anchor = anchorRect ?? rect;

  if (placement === "center") {
    return {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width,
      maxHeight: viewportMaxHeight,
    };
  }

  if (placement === "bottom") {
    const top = anchor.bottom + margin;
    return {
      left: clamp(
        anchor.left + anchor.width / 2 - width / 2,
        margin,
        window.innerWidth - width - margin,
      ),
      top,
      width,
      maxHeight: window.innerHeight - top - margin,
    };
  }

  const top = clamp(
    rect.top + rect.height / 2 - estimatedHeight / 2,
    margin,
    window.innerHeight - estimatedHeight - margin,
  );

  return {
    left: Math.min(anchor.right + margin, window.innerWidth - width - margin),
    top,
    width,
    maxHeight: window.innerHeight - top - margin,
  };
}

export function WelcomeTour({ sidebarOpen, onSidebarChange }: Props) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const sidebarBeforeRef = useRef<boolean | null>(null);
  const sidebarOpenRef = useRef(sidebarOpen);

  useEffect(() => {
    sidebarOpenRef.current = sidebarOpen;
  }, [sidebarOpen]);

  useEffect(() => {
    let seen = false;
    try {
      seen = Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      // Armazenamento indisponível: não bloqueia o mapa.
    }
    if (seen) return;

    const timer = window.setTimeout(() => {
      sidebarBeforeRef.current = sidebarOpenRef.current;
      if (!sidebarOpenRef.current) {
        onSidebarChange(true);
      }
      setOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [onSidebarChange]);

  useEffect(() => {
    const start = () => {
      sidebarBeforeRef.current = sidebarOpenRef.current;
      if (!sidebarOpenRef.current) {
        onSidebarChange(true);
      }
      setStepIndex(1);
      setRect(null);
      setAnchorRect(null);
      setOpen(true);
    };
    window.addEventListener("errejota:start-tour", start);
    return () => window.removeEventListener("errejota:start-tour", start);
  }, [onSidebarChange]);

  const step = TOUR_STEPS[stepIndex - 1];

  const persist = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // Sem persistência, o tour volta na próxima visita.
    }
  }, []);

  const dismiss = useCallback(() => {
    if (sidebarBeforeRef.current !== null) {
      onSidebarChange(sidebarBeforeRef.current);
    }
    sidebarBeforeRef.current = null;
    persist();
    setOpen(false);
    setStepIndex(1);
    setRect(null);
    setAnchorRect(null);
  }, [onSidebarChange, persist]);

  useEffect(() => {
    if (!open || !step?.target) {
      return;
    }

    const update = () => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-tour="${step.target}"]`,
        ),
      );
      const visible = nodes.find((node) => {
        const bounds = node.getBoundingClientRect();
        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          bounds.bottom > 0 &&
          bounds.right > 0 &&
          bounds.top < window.innerHeight &&
          bounds.left < window.innerWidth
        );
      });

      if (!visible) {
        setRect(null);
        setAnchorRect(null);
        return;
      }

      const nodeRect = visible.getBoundingClientRect();
      const container = visible.closest<HTMLElement>('[data-tour="index"]');
      const containerRect =
        container && container !== visible
          ? container.getBoundingClientRect()
          : null;

      setRect(nodeRect);
      setAnchorRect(containerRect ?? nodeRect);
    };

    update();
    const timers = [120, 300, 600, 1000].map((delay) =>
      window.setTimeout(update, delay),
    );
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => primaryRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open, stepIndex]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = cardRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, dismiss]);

  const goToStep = useCallback(
    (nextStep: number) => {
      const isMobile = window.innerWidth < 1024;
      const needsSidebar = nextStep <= 3;
      if (isMobile) {
        onSidebarChange(needsSidebar);
      } else if (needsSidebar && !sidebarOpen) {
        onSidebarChange(true);
      } else if (!needsSidebar && sidebarBeforeRef.current === false) {
        onSidebarChange(false);
      }
      setRect(null);
      setAnchorRect(null);
      setStepIndex(nextStep);
    },
    [onSidebarChange, sidebarOpen],
  );

  const next = useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length) {
      dismiss();
      return;
    }
    goToStep(stepIndex + 1);
  }, [dismiss, goToStep, stepIndex]);

  const previous = useCallback(() => {
    goToStep(Math.max(1, stepIndex - 1));
  }, [goToStep, stepIndex]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const cardStyle = cardStyleFor(
    rect,
    anchorRect,
    step?.placement ?? "center",
  );
  const isLast = stepIndex === TOUR_STEPS.length;
  const overlayAlpha = window.innerWidth < 1024 ? 0.55 : 0.72;

  return createPortal(
    <>
      {rect ? (
        <div className="fixed inset-0 z-[200]" aria-hidden>
          <div
            className="fixed border border-[var(--stage-color,var(--theme-accent))]"
            style={{
              top: rect.top - 8,
              left: rect.left - 8,
              width: rect.width + 16,
              height: rect.height + 16,
              boxShadow: `0 0 0 9999px rgba(8, 10, 10, ${overlayAlpha})`,
            }}
          />
        </div>
      ) : (
        <div
          className="fixed inset-0 z-[200] backdrop-blur-[2px]"
          style={{ backgroundColor: `rgba(8, 10, 10, ${overlayAlpha})` }}
          aria-hidden
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-tour-title"
        className="fixed z-[201] overflow-y-auto border border-line bg-card shadow-[0_16px_50px_rgba(0,0,0,0.3)]"
        style={cardStyle}
      >
        <div
          className="h-0.5 w-full"
          style={{
            background: "var(--stage-color, var(--theme-accent))",
          }}
        />
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
              v2.0 · Tour {stepIndex}/{TOUR_STEPS.length}
            </span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Pular tour"
              className="grid size-6 shrink-0 place-items-center border border-line text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <X aria-hidden className="size-3" />
            </button>
          </div>

          <h2
            id="welcome-tour-title"
            className="mt-2 font-editorial text-lg font-semibold tracking-tight sm:text-xl"
          >
            {step?.title}
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {step?.body}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
            <button
              type="button"
              onClick={dismiss}
              className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Pular
            </button>
            <div className="flex items-center gap-1.5">
              {stepIndex > 1 ? (
                <button
                  type="button"
                  onClick={previous}
                  className="inline-flex h-7 items-center border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Voltar
                </button>
              ) : null}
              <button
                ref={primaryRef}
                type="button"
                onClick={next}
                className="inline-flex h-7 items-center gap-1 bg-foreground px-2.5 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-background transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {isLast ? "Concluir" : "Próximo"}
                <ArrowRight aria-hidden className="size-2.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
