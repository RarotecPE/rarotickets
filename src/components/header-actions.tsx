"use client";

import { ExternalLink, Grid2X2, LoaderCircle, LogOut, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { HeaderDropdown, HeaderIconButton } from "@/components/header-dropdown";
import { useAuth } from "@/components/auth-provider";

type ColorTheme = "dark" | "light";
type OpenMenu = "applications" | "account" | null;

type HeaderApplication = {
  nome: string;
  client_id: string;
  logo_url: string | null;
  homepage_url: string;
};

type ApplicationsPayload = {
  applications?: HeaderApplication[];
  nexusProfileUrl?: string;
  error?: string;
};

const THEME_STORAGE_KEY = "theme";

function applyColorTheme(theme: ColorTheme) {
  document.body.classList.toggle("theme-light", theme === "light");
  document.documentElement.classList.toggle("theme-light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

function getStoredColorTheme(): ColorTheme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

function storeColorTheme(theme: ColorTheme) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyColorTheme(theme);
}

function HeaderUserAvatar() {
  const auth = useAuth();
  const [failed, setFailed] = useState(false);
  const avatarUrl = auth.user?.avatarUrl || "";
  const showImage = avatarUrl && !failed;
  const fallback = auth.user?.name?.trim().charAt(0).toUpperCase() || "U";

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-app-border bg-app-surface-elevated text-sm font-semibold text-app-foreground">
      {auth.loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-label="Carregando dados do usuario" />
      ) : showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        fallback
      )}
    </span>
  );
}

function ApplicationLogo({ application }: { application: HeaderApplication }) {
  const [failed, setFailed] = useState(false);
  const showImage = application.logo_url && !failed;

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-app-border bg-app-surface-elevated text-xs font-semibold text-app-foreground">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={application.logo_url!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        application.nome.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}

export function HeaderActions() {
  const auth = useAuth();
  const [theme, setTheme] = useState<ColorTheme>(() => getStoredColorTheme());
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [applications, setApplications] = useState<HeaderApplication[]>([]);
  const [nexusProfileUrl, setNexusProfileUrl] = useState("");
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState("");
  const displayName = auth.loading ? "Carregando..." : auth.user?.name || "Usuario";

  useEffect(() => { applyColorTheme(theme); }, [theme]);

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  const loadApplications = useCallback(async () => {
    setAppsLoading(true);
    setAppsError("");
    try {
      const response = await fetch("/api/auth/applications", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ApplicationsPayload | null;
      if (!response.ok) throw new Error(payload?.error || "Não foi possível carregar os aplicativos.");
      setApplications(payload?.applications ?? []);
      setNexusProfileUrl(payload?.nexusProfileUrl ?? "");
    } catch (error) {
      setAppsError(error instanceof Error ? error.message : "Erro ao carregar aplicativos.");
    } finally {
      setAppsLoading(false);
    }
  }, []);

  function openDropdown(menu: Exclude<OpenMenu, null>) {
    setOpenMenu((current) => {
      const next = current === menu ? null : menu;
      if ((menu === "applications" || menu === "account") && next === menu && !appsLoading && !nexusProfileUrl) {
        void loadApplications();
      }
      return next;
    });
  }

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    storeColorTheme(next);
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <HeaderIconButton
        label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
        onClick={toggleTheme}
      >
        {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </HeaderIconButton>

      <div className="relative">
        <HeaderIconButton label="Aplicativos" active={openMenu === "applications"} onClick={() => openDropdown("applications")}>
          <Grid2X2 className="h-5 w-5" />
        </HeaderIconButton>
        <HeaderDropdown open={openMenu === "applications"} onClose={closeMenu}>
          <div className="border-b border-app-border px-4 py-3">
            <h3 className="font-semibold text-app-foreground">Aplicativos</h3>
            <p className="text-xs text-app-muted-foreground">Sistemas disponíveis para sua conta</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {appsLoading ? <p className="px-3 py-4 text-sm text-app-muted-foreground">Carregando aplicativos...</p>
              : appsError ? (
                <div className="space-y-3 px-3 py-4">
                  <p className="text-sm text-app-danger">{appsError}</p>
                  <button type="button" onClick={() => void loadApplications()}
                    className="inline-flex min-h-9 items-center rounded-lg border border-app-border px-3 py-1.5 text-xs font-semibold text-app-muted-foreground transition-colors hover:bg-app-surface-elevated hover:text-app-foreground">
                    Tentar novamente
                  </button>
                </div>
              ) : applications.length === 0 ? (
                <p className="px-3 py-4 text-sm text-app-muted-foreground">Nenhum outro aplicativo disponível.</p>
              ) : applications.map((a) => (
                <a key={a.client_id} href={a.homepage_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-app-surface-elevated">
                  <ApplicationLogo application={a} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-app-foreground">{a.nome}</span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-app-muted-foreground" aria-hidden="true" />
                </a>
              ))}
          </div>
        </HeaderDropdown>
      </div>

      <div className="relative">
        <button type="button" onClick={(e) => { e.stopPropagation(); openDropdown("account"); }}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-85"
          aria-label="Conta do usuario" title="Conta do usuario">
          <HeaderUserAvatar />
        </button>
        <HeaderDropdown open={openMenu === "account"} onClose={closeMenu}>
          <div className="border-b border-app-border px-4 py-4">
            <div className="flex items-center gap-3">
              <HeaderUserAvatar />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-app-foreground">{displayName}</p>
                <p className="truncate text-xs text-app-muted-foreground">{auth.loading ? "Carregando dados..." : auth.user?.email}</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-app-border bg-app-surface-elevated/60 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-app-muted-foreground">Perfil no RaroTickets</p>
              <p className="text-sm font-medium text-app-foreground">{auth.loading ? "Carregando..." : auth.user?.label}</p>
            </div>
          </div>
          <div className="space-y-2 p-2">
            {nexusProfileUrl ? (
              <a href={nexusProfileUrl} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-app-muted-foreground transition-colors hover:bg-app-surface-elevated hover:text-app-foreground">
                Editar perfil
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : (
              <button type="button" onClick={() => void loadApplications()}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-app-muted-foreground transition-colors hover:bg-app-surface-elevated hover:text-app-foreground">
                {appsLoading ? "Carregando perfil..." : "Carregar perfil"}
              </button>
            )}
            <button type="button" onClick={() => void auth.logout()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-app-danger transition-colors hover:bg-app-danger/10">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </HeaderDropdown>
      </div>
    </div>
  );
}
