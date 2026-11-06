"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";

export function AdminLogin({ localOnly }: { localOnly: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Não foi possível entrar.");
        return;
      }

      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand text-white shadow-sm">
            <LockKeyhole aria-hidden className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
              Área restrita
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-line bg-card p-5 shadow-sm"
        >
          <label className="block text-[11px] font-medium text-muted" htmlFor="admin-user">
            Usuário
          </label>
          <input
            id="admin-user"
            name="user"
            autoComplete="username"
            autoFocus
            value={user}
            onChange={(event) => setUser(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-brand/80"
          />

          <label
            className="mt-4 block text-[11px] font-medium text-muted"
            htmlFor="admin-password"
          >
            Senha
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-brand/80"
          />

          {error ? (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || !user || !password}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            Entrar
          </button>
        </form>

        {localOnly ? (
          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
            Disponível apenas no navegador deste computador (localhost).
          </p>
        ) : null}
      </div>
    </div>
  );
}
