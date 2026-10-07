"use client";

import { useCallback, useState } from "react";
import { ExternalLink, Grid2X2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { authApi, type ApplicationsResponse, type NexusApplication } from "@/client/services/auth-api.service";
import { useAuth } from "@/components/auth-provider";
import { HeaderDropdown, HeaderIconButton } from "@/components/header-dropdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge, btnGhost, InlineAlert, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

type HeaderMenu = "applications" | "account" | null;
type ApplicationLoadState = "idle" | "loading" | "loaded" | "error";

export function HeaderActions() {
  const router = useRouter();
  const { session, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState<HeaderMenu>(null);
  const [loadState, setLoadState] = useState<ApplicationLoadState>("idle");
  const [catalog, setCatalog] = useState<ApplicationsResponse | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoadState("loading");
    try {
      setCatalog(await authApi.getApplications());
      setLoadState("loaded");
    } catch {
      setLoadState("error");
    }
  }, []);

  const open = useCallback((menu: Exclude<HeaderMenu, null>) => {
    setOpenMenu((current) => current === menu ? null : menu);
    if (loadState === "idle" || loadState === "error") void loadCatalog();
  }, [loadCatalog, loadState]);

  const close = useCallback(() => setOpenMenu(null), []);

  const handleLogout = useCallback(async () => {
    const result = await logout();
    const revocation = result.globalRevocationConfirmed ? "confirmed" : "unconfirmed";
    router.push(`/login?reason=logout&revocation=${revocation}`);
  }, [logout, router]);

  const applicationsOpen = openMenu === "applications";
  const accountOpen = openMenu === "account";
  return <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
    <ThemeToggle />
    <div className="relative">
      <HeaderIconButton label="Aplicativos" active={applicationsOpen} expanded={applicationsOpen} controls="header-applications" onClick={() => open("applications")}><Grid2X2 className="h-5 w-5" aria-hidden="true" /></HeaderIconButton>
      <HeaderDropdown id="header-applications" open={applicationsOpen} onClose={close}>
        <ApplicationsMenu state={loadState} applications={catalog?.applications ?? []} onRetry={loadCatalog} />
      </HeaderDropdown>
    </div>
    <div className="relative">
      <HeaderIconButton label="Conta" active={accountOpen} expanded={accountOpen} controls="header-account" onClick={() => open("account")}><Avatar name={session?.user.nome ?? "Usuário"} url={session?.user.avatar_url ?? null} failed={avatarFailed} onFail={() => setAvatarFailed(true)} /></HeaderIconButton>
      <HeaderDropdown id="header-account" open={accountOpen} onClose={close}>
        <AccountMenu name={session?.user.nome ?? "Usuário"} email={session?.user.email ?? ""} roleLabel={session?.label ?? ""} profileUrl={catalog?.nexusProfileUrl ?? null} state={loadState} onRetry={loadCatalog} onLogout={() => void handleLogout()} />
      </HeaderDropdown>
    </div>
  </div>;
}

export type ApplicationsMenuProps = { state: ApplicationLoadState; applications: NexusApplication[]; onRetry: () => void };
function ApplicationsMenu({ state, applications, onRetry }: ApplicationsMenuProps) {
  if (state === "idle" || state === "loading") return <div className="p-4"><Spinner label="Carregando aplicativos…" /></div>;
  if (state === "error") return <div className="space-y-3 p-4"><InlineAlert tone="danger">Não foi possível carregar os aplicativos do RaroNexus.</InlineAlert><button type="button" className={btnGhost} onClick={onRetry}>Tentar novamente</button></div>;
  if (!applications.length) return <p className="p-4 text-sm text-app-muted-foreground">Nenhum outro aplicativo disponível.</p>;
  return <ul className="space-y-1 p-2">{applications.map((application) => <li key={application.client_id}><a href={application.homepage_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-app-foreground transition-colors hover:bg-app-surface-elevated"><ApplicationLogo application={application} /><span className="min-w-0 flex-1 truncate font-medium">{application.nome}</span><ExternalLink className="h-4 w-4 shrink-0 text-app-muted-foreground" aria-hidden="true" /></a></li>)}</ul>;
}

export type AccountMenuProps = { name: string; email: string; roleLabel: string; profileUrl: string | null; state: ApplicationLoadState; onRetry: () => void; onLogout: () => void };
function AccountMenu({ name, email, roleLabel, profileUrl, state, onRetry, onLogout }: AccountMenuProps) {
  return <div className="p-3">
    <div className="flex items-center gap-3 border-b border-app-border px-2 pb-3"><Avatar name={name} url={null} failed={false} onFail={() => undefined} large /><div className="min-w-0"><p className="truncate text-sm font-semibold text-app-foreground">{name}</p><p className="truncate text-xs text-app-muted-foreground">{email}</p></div></div>
    {roleLabel ? <div className="px-2 py-3"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-app-muted-foreground">Papel de acesso</p><Badge tone="primary">{roleLabel}</Badge></div> : null}
    <div className="space-y-1 border-t border-app-border pt-2">
      {profileUrl ? <a href={profileUrl} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-app-md px-2 text-sm text-app-foreground hover:bg-app-surface-elevated"><UserRound className="h-4 w-4 text-app-muted-foreground" aria-hidden="true" />Perfil no RaroNexus</a> : <button type="button" onClick={onRetry} className="flex h-10 w-full items-center rounded-app-md px-2 text-left text-sm text-app-foreground hover:bg-app-surface-elevated">{state === "loading" ? "Carregando perfil…" : "Carregar perfil central"}</button>}
      <button type="button" onClick={onLogout} className="flex h-10 w-full items-center rounded-app-md px-2 text-left text-sm font-semibold text-app-danger hover:bg-app-danger/10">Sair</button>
    </div>
  </div>;
}

export type AvatarProps = { name: string; url: string | null; failed: boolean; onFail: () => void; large?: boolean };
function Avatar({ name, url, failed, onFail, large = false }: AvatarProps) {
  const size = large ? "h-9 w-9" : "h-9 w-9";
  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" onError={onFail} className={cn(size, "rounded-full border border-app-border bg-app-surface-elevated object-cover")} />;
  }
  return <span aria-hidden="true" className={cn(size, "inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-elevated text-sm font-semibold text-app-foreground")}>{name.trim().slice(0, 1).toUpperCase() || "U"}</span>;
}

export type ApplicationLogoProps = { application: NexusApplication };
function ApplicationLogo({ application }: ApplicationLogoProps) {
  const [failed, setFailed] = useState(false);
  if (application.logo_url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={application.logo_url} alt="" onError={() => setFailed(true)} className="h-9 w-9 rounded-lg border border-app-border bg-app-surface-elevated object-cover" />;
  }
  return <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-border bg-app-surface-elevated text-xs font-bold text-app-primary">{application.nome.trim().slice(0, 1).toUpperCase() || "A"}</span>;
}

