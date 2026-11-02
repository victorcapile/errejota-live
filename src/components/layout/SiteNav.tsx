"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Mapa",
    isActive: (pathname: string) =>
      pathname === "/" || pathname.startsWith("/fontes"),
  },
  {
    href: "/sobre",
    label: "Sobre",
    isActive: (pathname: string) => pathname.startsWith("/sobre"),
  },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="flex min-w-0 flex-1 justify-center"
    >
      <ul className="flex items-center gap-0.5 rounded-full border border-line/70 bg-card/60 p-0.5 sm:gap-1 sm:p-1">
        {NAV_ITEMS.map((item) => {
          const active = item.isActive(pathname);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition-colors sm:h-9 sm:px-5 sm:text-sm ${
                  active
                    ? "bg-brand text-white shadow-sm"
                    : "text-muted hover:text-brand"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}