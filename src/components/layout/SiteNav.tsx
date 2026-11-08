"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Info, Map, ShieldCheck } from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Mapa",
    icon: Map,
    isActive: (pathname: string) =>
      pathname === "/" || pathname.startsWith("/fontes"),
  },
  {
    href: "/sobre",
    label: "Sobre",
    icon: Info,
    isActive: (pathname: string) => pathname.startsWith("/sobre"),
  },
] as const;

const ADMIN_ITEM = {
  href: "/admin",
  label: "Admin",
  icon: ShieldCheck,
  isActive: (pathname: string) => pathname.startsWith("/admin"),
} as const;

export function SiteNav() {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [serverAllowed, setServerAllowed] = useState<boolean | null>(null);
  const isLocal = useSyncExternalStore(
    () => () => {},
    () => {
      const host = window.location.hostname;
      return host === "localhost" || host === "127.0.0.1" || host === "::1";
    },
    () => false,
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/availability", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { allowed?: boolean } | null) => {
        if (!cancelled) {
          setServerAllowed(Boolean(payload?.allowed));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServerAllowed(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const showAdmin = serverAllowed ?? (mounted && isLocal);
  const items = showAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  return (
    <nav
      aria-label="Navegação principal"
      className="flex min-w-0 justify-center"
    >
      <ul className="flex items-center gap-4 sm:gap-6">
        {items.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          const isAdmin = item.href === "/admin";

          return (
            <li key={item.href} className={isAdmin ? "hidden lg:block" : undefined}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.label}
                style={
                  active
                    ? {
                        borderColor:
                          "var(--stage-color, var(--theme-accent))",
                      }
                    : undefined
                }
                className={`inline-flex h-8 items-center gap-1.5 border-b-2 px-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${
                  active
                    ? "text-foreground"
                    : "border-transparent text-muted hover:border-line hover:text-foreground"
                }`}
              >
                <Icon aria-hidden className="size-3 shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
