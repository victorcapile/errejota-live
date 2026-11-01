import Link from "next/link";
import { Compass, MapPinned } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand text-white shadow-sm">
        <Compass aria-hidden className="size-7" />
      </span>
      <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
        Erro 404
      </p>
      <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Esta fonte saiu do mapa.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        O endereço não corresponde a nenhuma ficha do catálogo. Volte à busca ou
        explore os bairros já mapeados.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
        >
          Voltar ao catálogo
        </Link>
        <Link
          href="/bairros"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-card px-5 text-sm font-medium transition-colors hover:border-brand/30 hover:text-brand"
        >
          <MapPinned aria-hidden className="size-4" />
          Ver bairros
        </Link>
      </div>
    </div>
  );
}
