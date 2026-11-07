"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Flag,
  Loader2,
  Send,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import {
  CAMERA_REPORT_REASON_LABELS,
  CAMERA_REPORT_REASON_VALUES,
  type CameraReportReason,
} from "@/lib/constants";
import type { Camera } from "@/lib/types";

type SubmitStatus = "idle" | "sending" | "sent" | "error";

const REASON_META: Record<
  CameraReportReason,
  {
    icon: typeof WifiOff;
    description: string;
  }
> = {
  offline: {
    icon: WifiOff,
    description: "A imagem não carrega ou a câmera está fora do ar.",
  },
  online: {
    icon: Wifi,
    description: "A câmera está funcionando e o status exibido está errado.",
  },
  other: {
    icon: AlertTriangle,
    description: "Imagem congelada, apontamento errado ou outro problema.",
  },
};

export function CameraReportButton({ camera }: { camera: Camera }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CameraReportReason>("offline");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function submit() {
    setStatus("sending");
    setError(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cameraId: camera.id,
          cameraExternalId: camera.externalId,
          cameraName: camera.name,
          reason,
          note,
          website,
        }),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível enviar o relato.");
      }
      setStatus("sent");
      setNote("");
    } catch (submitError) {
      setStatus("error");
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível enviar o relato.",
      );
    }
  }

  function close() {
    setOpen(false);
    setStatus("idle");
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStatus("idle");
          setError(null);
          setOpen(true);
        }}
        aria-label={`Reportar problema em ${camera.name}`}
        title="Reportar problema"
        className="grid size-9 shrink-0 place-items-center rounded-lg border border-amber-200/30 bg-amber-500/5 text-amber-500/35 transition-all duration-200 hover:border-amber-400/70 hover:bg-amber-500/15 hover:text-amber-600 hover:shadow-[0_0_0_3px_rgba(245,158,11,0.12)] dark:border-amber-300/20 dark:bg-amber-400/5 dark:text-amber-400/35 dark:hover:text-amber-300"
      >
        <Flag aria-hidden className="size-4" fill="currentColor" />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  close();
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-line bg-card shadow-2xl sm:rounded-3xl"
              >
                <div className="flex items-start gap-3 border-b border-line/70 bg-gradient-to-br from-amber-500/10 via-card to-card px-5 pb-4 pt-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-amber-300/40 bg-amber-500/10 text-amber-600 dark:text-amber-300">
                    <Flag aria-hidden className="size-5" fill="currentColor" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      id={titleId}
                      className="text-base font-semibold leading-snug"
                    >
                      Reportar problema
                    </h2>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">
                      {camera.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Fechar"
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-card text-muted transition-colors hover:text-brand"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  {status === "sent" ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <span className="grid size-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                        <CheckCircle2 aria-hidden className="size-7" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">
                          Relato enviado
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          Ele foi para a fila de moderação e não altera o status
                          da câmera sozinho. Obrigado por ajudar!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={close}
                        className="mt-1 inline-flex h-9 items-center justify-center rounded-xl border border-line bg-background px-4 text-xs font-semibold text-foreground transition-colors hover:border-brand/30 hover:text-brand"
                      >
                        Fechar
                      </button>
                    </div>
                  ) : (
                    <form
                      className="space-y-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void submit();
                      }}
                    >
                      <fieldset>
                        <legend className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                          O que está errado?
                        </legend>
                        <div className="mt-2 grid gap-2">
                          {CAMERA_REPORT_REASON_VALUES.map((value) => {
                            const meta = REASON_META[value];
                            const Icon = meta.icon;
                            const selected = reason === value;
                            return (
                              <label
                                key={value}
                                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                                  selected
                                    ? "border-brand/50 bg-brand/5 ring-1 ring-brand/20"
                                    : "border-line bg-background hover:border-brand/30"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="reason"
                                  value={value}
                                  checked={selected}
                                  onChange={() => setReason(value)}
                                  className="sr-only"
                                />
                                <span
                                  className={`grid size-8 shrink-0 place-items-center rounded-lg border ${
                                    selected
                                      ? "border-brand/30 bg-brand/10 text-brand"
                                      : "border-line bg-card text-muted"
                                  }`}
                                >
                                  <Icon aria-hidden className="size-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-xs font-medium">
                                    {CAMERA_REPORT_REASON_LABELS[value]}
                                  </span>
                                  <span className="mt-0.5 block text-[10px] leading-snug text-muted">
                                    {meta.description}
                                  </span>
                                </span>
                                <span
                                  aria-hidden
                                  className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${
                                    selected
                                      ? "border-brand bg-brand text-white"
                                      : "border-line"
                                  }`}
                                >
                                  {selected ? (
                                    <Check className="size-3" />
                                  ) : null}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>

                      <label className="block">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                          Observação{" "}
                          <span className="font-normal normal-case tracking-normal">
                            (opcional)
                          </span>
                        </span>
                        <textarea
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          rows={3}
                          maxLength={500}
                          className="mt-1.5 min-h-20 w-full resize-y rounded-xl border border-line bg-background px-3 py-2.5 text-xs leading-relaxed text-foreground outline-none transition-colors focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                          placeholder="Ex.: a imagem está congelada desde ontem."
                        />
                        <span className="mt-1 block text-right text-[9px] tabular-nums text-muted">
                          {note.length}/500
                        </span>
                      </label>

                      {/* Honeypot: invisível para pessoas; bots costumam preencher. */}
                      <input
                        type="text"
                        name="website"
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        className="hidden"
                      />

                      {error ? (
                        <p className="rounded-xl border border-red-300/50 bg-red-500/10 px-3 py-2 text-[11px] text-red-700 dark:text-red-300">
                          {error}
                        </p>
                      ) : null}

                      <p className="rounded-xl border border-line/70 bg-background/60 px-3 py-2 text-[10px] leading-relaxed text-muted">
                        Seu relato vai para a fila de moderação. Ele não altera o
                        status da câmera sozinho.
                      </p>

                      <button
                        type="submit"
                        disabled={status === "sending"}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-50"
                      >
                        {status === "sending" ? (
                          <Loader2
                            aria-hidden
                            className="size-4 animate-spin"
                          />
                        ) : (
                          <Send aria-hidden className="size-4" />
                        )}
                        {status === "sending" ? "Enviando…" : "Enviar relato"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
