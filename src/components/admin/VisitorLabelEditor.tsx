"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function VisitorLabelEditor({
  visitorKey,
  nickname,
}: {
  visitorKey: string;
  nickname: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(false);

    try {
      const response = await fetch("/api/admin/visitor-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorKey, nickname: value }),
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="apelido"
        aria-label="Apelido do visitante"
        maxLength={40}
        className={`h-8 w-28 rounded-lg border bg-background px-2 text-[11px] outline-none transition-colors focus:border-brand/80 ${
          error ? "border-amber-500/60" : "border-line"
        }`}
      />
      <button
        type="submit"
        disabled={saving}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-card px-2 text-[10px] font-medium text-muted transition-colors hover:border-brand/30 hover:text-brand disabled:opacity-60"
      >
        {saving ? <Loader2 aria-hidden className="size-3 animate-spin" /> : null}
        Salvar
      </button>
    </form>
  );
}
