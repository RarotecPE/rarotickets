"use client";

import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  QrCode,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { HeaderActions } from "@/components/header-actions";
import { APP } from "@/lib/constants";
import { cn } from "@/shared/utils/cn";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/inscricoes", label: "Inscrições", icon: Ticket },
  { href: "/checkin", label: "Check-in", icon: QrCode },
  { href: "/meus-ingressos", label: "Meus ingressos", icon: CalendarCheck },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((i) => isActive(pathname, i.href));

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      {/* Sidebar fixa — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-app-border bg-app-surface lg:flex">
        <Link
          href="/dashboard"
          aria-label="Ir para o dashboard"
          className="flex h-16 items-center gap-2.5 border-b border-app-border px-5 transition-colors hover:bg-app-surface-elevated/40"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-app-md bg-app-primary text-white font-bold">
            RT
          </span>
          <div className="leading-tight">
            <span className="block text-xl font-bold tracking-tight text-app-foreground">
              Raro<span className="text-app-primary">Tickets</span>
            </span>
            <p className="text-[11px] text-app-muted-foreground">Gestão de eventos</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-app-md px-3 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-app-primary/10 text-app-primary"
                    : "text-app-muted-foreground hover:bg-app-surface-elevated hover:text-app-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-app-border p-3">
          <p className="px-2 text-[11px] leading-relaxed text-app-muted-foreground">
            Eventos, lotes, inscrições e credenciamento com o PagBank.
          </p>
        </div>
      </aside>

      {/* Header */}
      <header className="sticky top-0 z-[45] flex h-16 items-center justify-between gap-3 border-b border-app-border bg-app-surface/95 px-4 backdrop-blur sm:px-6 lg:ml-64 lg:pl-6 lg:pr-8">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            aria-label="Ir para o dashboard"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-app-md bg-app-primary text-white font-bold lg:hidden"
          >
            RT
          </Link>
          <div className="leading-tight min-w-0">
            <p className="text-[11px] font-semibold text-app-muted-foreground lg:hidden truncate">{APP.name}</p>
            <h1 className="text-base font-bold text-app-foreground lg:text-lg truncate">{current?.label ?? APP.name}</h1>
          </div>
        </div>
        <HeaderActions />
      </header>

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] sm:px-6 lg:px-8 lg:py-6 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav
        aria-label="Navegação inferior"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-app-border bg-app-surface lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[40px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
                active ? "text-app-primary" : "text-app-muted-foreground hover:text-app-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </AuthProvider>
  );
}
