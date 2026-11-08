import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="grid size-12 place-items-center border border-foreground bg-foreground text-background">
        <Compass aria-hidden className="size-6" />
      </span>
      <p className="mt-6 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-muted">
        Erro 404
      </p>
      <h1 className="mt-2 text-balance font-editorial text-3xl font-semibold tracking-tight sm:text-4xl">
        Esta fonte saiu do mapa.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        O endereço não corresponde a nenhuma ficha do catálogo. Volte ao mapa
        ou à busca.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex h-11 items-center bg-foreground px-5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-background transition-colors hover:bg-accent"
      >
        Voltar ao mapa
      </Link>
    </div>
  );
}
