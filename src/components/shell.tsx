"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import {
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  ScanLine,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Permission } from "@/modules/access/domain/services/role-permissions.domain-service";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { DataPageLoading } from "@/components/data-loading";
import { HeaderActions } from "@/components/header-actions";
import { OperationLoadingProvider } from "@/components/operation-loading";
import { Button, InlineAlert, btnPrimary } from "@/components/ui";
import { APP } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type NavigationItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
};
export const NAV_ITEMS: NavigationItem[] = [
  {
    href: "/painel",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "dashboard:read",
  },
  {
    href: "/painel/eventos",
    label: "Eventos",
    icon: CalendarDays,
    permission: "events:read",
  },
  {
    href: "/painel/inscricoes",
    label: "Inscrições",
    icon: ClipboardList,
    permission: "registrations:read",
  },
  {
    href: "/painel/credenciamento",
    label: "Credenciamento",
    icon: ScanLine,
    permission: "checkin:write",
  },
  {
    href: "/painel/relatorios",
    label: "Relatórios",
    icon: ChartNoAxesCombined,
    permission: "reports:read",
  },
];

type AppShellProps = { children: ReactNode };
type ShellContentProps = { children: ReactNode };

export function AppShell({ children }: AppShellProps) {
  return (
    <AuthProvider>
      <OperationLoadingProvider>
        <AuthenticatedShell>{children}</AuthenticatedShell>
      </OperationLoadingProvider>
    </AuthProvider>
  );
}

function AuthenticatedShell({ children }: ShellContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const navItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) =>
        auth.session?.permissions.includes(item.permission),
      ),
    [auth.session],
  );
  const startPath = getStartPath({
    permissions: auth.session?.permissions ?? [],
  });
  const current = navItems.find((item) =>
    isActivePath({ pathname, href: item.href }),
  );
  const canReadAudit = Boolean(
    auth.session?.permissions.includes("audit:read"),
  );
  const isAuditRoute = pathname === "/painel/auditoria" && canReadAudit;

  useEffect(() => {
    if (auth.status === "unauthenticated")
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [auth.status, pathname, router]);
  useEffect(() => {
    if (
      auth.status === "authenticated" &&
      pathname === "/painel" &&
      !auth.session?.permissions.includes("dashboard:read")
    )
      router.replace(startPath);
    if (
      auth.status === "authenticated" &&
      !current &&
      pathname !== "/painel" &&
      !isAuditRoute
    )
      router.replace(startPath);
  }, [
    auth.status,
    auth.session,
    current,
    isAuditRoute,
    pathname,
    router,
    startPath,
  ]);

  if (auth.status === "loading" || auth.status === "unauthenticated")
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <DataPageLoading panels={["Validando sessão RaroNexus"]} />
      </div>
    );
  if (auth.status === "error")
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <InlineAlert tone="danger" className="mb-4">
          {auth.error ?? "Não foi possível validar sua sessão."}
        </InlineAlert>
        <div className="flex gap-2">
          <Button onClick={() => void auth.refreshSession()}>
            Tentar novamente
          </Button>
          <Link href="/login" className={btnPrimary}>
            Ir para o acesso
          </Link>
        </div>
      </div>
    );
  if (pathname !== "/painel" && !current && !isAuditRoute)
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <DataPageLoading panels={["Abrindo sua área"]} />
      </div>
    );

  return (
    <div className="min-h-screen bg-app-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-app-border bg-app-surface lg:flex">
        <Link
          href={startPath}
          className="flex h-16 items-center gap-2.5 border-b border-app-border px-5 transition-colors hover:bg-app-surface-elevated/40"
          aria-label="Ir à página inicial do painel"
        >
          <BrandMark />
          <div className="leading-tight">
            <span className="block text-xl font-bold tracking-tight text-app-foreground">
              Raro<span className="text-app-primary">Tickets</span>
            </span>
            <p className="text-[11px] text-app-muted-foreground">
              Gestão de eventos
            </p>
          </div>
        </Link>
        <nav
          className="flex-1 space-y-1 overflow-y-auto p-3"
          aria-label="Navegação principal"
        >
          {navItems.map((item) => (
            <NavigationLink
              key={item.href}
              item={item}
              active={isActivePath({ pathname, href: item.href })}
            />
          ))}
        </nav>
        <div className="border-t border-app-border p-3">
          <p className="px-2 text-[11px] leading-relaxed text-app-muted-foreground">
            Conectado como{" "}
            <span className="font-semibold text-app-foreground">
              {auth.session?.user.nome}
            </span>
          </p>
          <p className="mt-1 px-2 text-[10px] uppercase tracking-wider text-app-muted-foreground">
            {auth.session?.label}
          </p>
        </div>
      </aside>

      <header className="sticky top-0 z-[45] flex h-16 items-center justify-between gap-3 border-b border-app-border bg-app-surface/95 px-4 backdrop-blur sm:px-6 lg:ml-64 lg:pl-6 lg:pr-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={startPath}
            aria-label="Ir ao painel inicial"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-app-md lg:hidden"
          >
            <BrandMark />
          </Link>
          <div className="min-w-0 leading-tight">
            <p className="text-[11px] font-semibold text-app-muted-foreground lg:hidden">
              {APP.name}
            </p>
            <h1 className="truncate text-base font-bold text-app-foreground lg:text-lg">
              {current?.label ?? (isAuditRoute ? "Auditoria" : "Dashboard")}
            </h1>
          </div>
        </div>
        <HeaderActions />
      </header>

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] sm:px-6 lg:px-8 lg:py-6 lg:pb-8">
          {children}
        </main>
      </div>

      <nav
        aria-label="Navegação inferior"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-app-border bg-app-surface lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {navItems.map((item) => (
          <NavigationLink
            key={item.href}
            item={item}
            active={isActivePath({ pathname, href: item.href })}
            mobile
          />
        ))}
      </nav>
    </div>
  );
}

export type NavigationLinkProps = {
  item: NavigationItem;
  active: boolean;
  mobile?: boolean;
};
function NavigationLink({ item, active, mobile = false }: NavigationLinkProps) {
  const Icon = item.icon;
  if (mobile)
    return (
      <Link
        href={item.href}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-[40px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
          active
            ? "text-app-primary"
            : "text-app-muted-foreground hover:text-app-foreground",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
        <span className="max-w-full truncate px-1">{item.label}</span>
      </Link>
    );
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-app-md px-3 text-sm font-medium transition-colors duration-150",
        active
          ? "bg-app-primary/10 text-app-primary"
          : "text-app-muted-foreground hover:bg-app-surface-elevated hover:text-app-foreground",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

export type ActivePathParams = { pathname: string; href: string };
function isActivePath(params: ActivePathParams): boolean {
  if (params.href === "/painel") {
    return params.pathname === "/painel";
  }
  return (
    params.pathname === params.href ||
    params.pathname.startsWith(`${params.href}/`)
  );
}

export type GetStartPathParams = { permissions: Permission[] };
function getStartPath(params: GetStartPathParams): string {
  if (params.permissions.includes("dashboard:read")) return "/painel";
  if (params.permissions.includes("registrations:read"))
    return "/painel/inscricoes";
  if (params.permissions.includes("checkin:write"))
    return "/painel/credenciamento";
  return "/login?reason=role_not_allowed";
}

function BrandMark() {
  return (
    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-app-md bg-app-primary">
      <span className="font-black tracking-tighter text-white">RT</span>
    </span>
  );
}
