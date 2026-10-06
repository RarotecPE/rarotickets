import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Activity, Bell, CalendarDays, Check, ChevronDown, ChevronRight, CircleDollarSign, ClipboardCheck, FileChartColumn, LayoutDashboard, LogOut, Menu, Moon, Settings2, Sun, TicketCheck, UserRound, Users, X } from 'lucide-react';
import { authApiService } from '../../../../../client/bootstrap/container';
import { useAuth } from '../../../../auth/client/state/auth-context';
import type { ApplicationPermission } from '../../../../auth/domain/value-objects/application-role.vo';
import type { ApplicationCatalogResponse } from '../../../../auth/client/types/auth.types';

export type NavigationItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  permission: ApplicationPermission;
};

type PageName = { path: string; label: string };
type AppsMenuState = 'closed' | 'loading' | 'open' | 'error';

const NAVIGATION_ITEMS: NavigationItem[] = [
  { path: '/dashboard', label: 'Visão geral', icon: LayoutDashboard, permission: 'dashboard:read' },
  { path: '/events', label: 'Eventos', icon: CalendarDays, permission: 'events:read' },
  { path: '/registrations', label: 'Inscrições', icon: TicketCheck, permission: 'registrations:read' },
  { path: '/participants', label: 'Participantes', icon: Users, permission: 'participants:read' },
  { path: '/finance', label: 'Financeiro', icon: CircleDollarSign, permission: 'finance:read' },
  { path: '/check-in', label: 'Check-in', icon: ClipboardCheck, permission: 'checkin:manage' },
  { path: '/reports', label: 'Relatórios', icon: FileChartColumn, permission: 'reports:read' },
];

const PAGE_NAMES: PageName[] = NAVIGATION_ITEMS.map(({ path, label }) => ({ path, label }));

export function AppShell() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [appsMenuState, setAppsMenuState] = useState<AppsMenuState>('closed');
  const [applications, setApplications] = useState<ApplicationCatalogResponse['data']['applications']>([]);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getSavedTheme());
  const pageName = PAGE_NAMES.find((page) => location.pathname.startsWith(page.path))?.label ?? 'Visão geral';
  const visibleNavigation = NAVIGATION_ITEMS.filter((item) => auth.session?.permissions.includes(item.permission));
  const user = auth.session?.user;

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    window.localStorage.setItem('rarotickets-theme', theme);
  }, [theme]);

  useEffect(() => {
    setMobileNavigationOpen(false);
    setAppsMenuState('closed');
    setAccountMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavigationOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavigationOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileNavigationOpen]);

  const toggleApplications = async () => {
    if (appsMenuState === 'open') {
      setAppsMenuState('closed');
      return;
    }
    setAppsMenuState('loading');
    try {
      const response = await authApiService.getApplications();
      setApplications(response.data.applications);
      setAppsMenuState('open');
    } catch {
      setAppsMenuState('error');
    }
  };

  const signOut = async () => {
    const isDemoSession = auth.demo;
    let revocationConfirmed = isDemoSession;
    try {
      revocationConfirmed = await auth.logout();
    } catch {
      revocationConfirmed = false;
    }
    const logoutQuery = revocationConfirmed || isDemoSession ? '' : '?logout=local_only';
    navigate(`/login${logoutQuery}`, { replace: true });
  };

  const toggleTheme = () => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark');

  return (
    <div className="app-shell">
      {mobileNavigationOpen && <button className="sidebar-backdrop" aria-label="Fechar navegação" onClick={() => setMobileNavigationOpen(false)} />}
      <aside className={`app-sidebar ${mobileNavigationOpen ? 'app-sidebar-open' : ''}`} aria-label="Navegação principal">
        <div className="sidebar-brand-row">
          <a className="brand-lockup" href="/dashboard" aria-label="RaroTickets — visão geral">
            <span className="brand-mark"><TicketCheck size={20} strokeWidth={2.2} /></span>
            <span className="brand-name">raro<span>tickets</span></span>
          </a>
          <button className="icon-button sidebar-close" type="button" aria-label="Fechar menu" onClick={() => setMobileNavigationOpen(false)}><X size={19} /></button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-monogram">R</div>
          <div className="workspace-text"><span>Espaço de trabalho</span><strong>Raro Eventos</strong></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <div className="sidebar-section-label">MENU PRINCIPAL</div>
        <nav className="primary-navigation">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => `navigation-link${isActive ? ' navigation-link-active' : ''}`}>
                <Icon size={18} strokeWidth={1.85} /><span>{item.label}</span>
                {item.path === '/events' && <span className="navigation-indicator" />}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-section-label sidebar-secondary-label">ESPAÇO DE TRABALHO</div>
        <button className="navigation-link navigation-link-muted" type="button" onClick={() => navigate('/events')}>
          <Settings2 size={18} strokeWidth={1.85} /><span>Configurações</span><ChevronRight size={15} className="navigation-trailing" />
        </button>

        <div className="sidebar-bottom">
          <div className="sidebar-help-card">
            <div className="help-card-icon"><Activity size={16} /></div>
            <strong>Precisa de ajuda?</strong>
            <span>Estamos aqui para você.</span>
            <a href="mailto:suporte@raro.com.br">Falar com suporte <ChevronRight size={13} /></a>
          </div>
          <div className="sidebar-version">RARO ECOSSISTEMA <span>·</span> v1.0</div>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-topbar">
          <div className="topbar-page">
            <button className="icon-button mobile-menu-button" type="button" aria-label="Abrir menu de navegação" aria-expanded={mobileNavigationOpen} onClick={() => setMobileNavigationOpen(true)}><Menu size={20} /></button>
            <div className="topbar-page-title"><span className="topbar-breadcrumb">Raro Eventos</span><span className="breadcrumb-divider">/</span><strong>{pageName}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="apps-menu-wrap">
              <button className={`topbar-apps-button${appsMenuState === 'open' ? ' is-open' : ''}`} type="button" aria-haspopup="menu" aria-expanded={appsMenuState === 'open' || appsMenuState === 'loading'} onClick={() => void toggleApplications()}>
                <span className="apps-grid-icon"><span /><span /><span /><span /></span><span>Aplicativos</span><ChevronDown size={14} />
              </button>
              {appsMenuState !== 'closed' && (
                <div className="apps-dropdown" role="menu" aria-label="Aplicativos autorizados">
                  <div className="dropdown-heading"><div><strong>Seus aplicativos</strong><span>Conectados ao RaroNexus</span></div><button className="mini-icon-button" type="button" aria-label="Fechar aplicativos" onClick={() => setAppsMenuState('closed')}><X size={15} /></button></div>
                  {appsMenuState === 'loading' && <div className="dropdown-message"><span className="spinner spinner-small" /> Carregando seus aplicativos…</div>}
                  {appsMenuState === 'error' && <div className="dropdown-message dropdown-message-error">Não foi possível carregar os aplicativos.<button type="button" onClick={() => void toggleApplications()}>Tentar novamente</button></div>}
                  {appsMenuState === 'open' && applications.length === 0 && <div className="dropdown-message">Nenhum outro aplicativo autorizado foi disponibilizado.</div>}
                  {appsMenuState === 'open' && applications.map((application) => (
                    <a className="application-link" href={application.homepageUrl} key={application.clientId} role="menuitem" target="_blank" rel="noreferrer">
                      <span className="application-logo">{application.logoUrl ? <img src={application.logoUrl} alt="" /> : <span>{application.name.charAt(0)}</span>}</span>
                      <span className="application-link-name">{application.name}<small>Aplicativo Raro</small></span><ChevronRight size={15} />
                    </a>
                  ))}
                  {auth.raronexusHomeUrl && <a className="dropdown-footer-link" href={auth.raronexusHomeUrl} target="_blank" rel="noreferrer">Acessar RaroNexus <ChevronRight size={14} /></a>}
                </div>
              )}
            </div>
            <button className="icon-button topbar-theme-button" type="button" aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="icon-button topbar-notification-button" type="button" aria-label="Notificações"><Bell size={18} /><span className="notification-dot" /></button>
            <div className="account-menu-wrap">
              <button className="account-trigger" type="button" aria-haspopup="menu" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen((currentValue) => !currentValue)}>
                <span className="user-avatar">{getInitials(user?.name ?? 'Raro')}</span>
                <span className="account-text"><strong>{user?.name ?? 'Usuário Raro'}</strong><small>{auth.session?.role.name ?? 'Conta'}</small></span>
                <ChevronDown size={14} className="muted-icon" />
              </button>
              {accountMenuOpen && (
                <div className="account-dropdown" role="menu">
                  <div className="account-dropdown-user"><strong>{user?.name}</strong><span>{user?.email}</span><small>{auth.session?.role.name}</small></div>
                  {auth.raronexusProfileUrl && <a className="account-dropdown-link" href={auth.raronexusProfileUrl} target="_blank" rel="noreferrer" role="menuitem"><UserRound size={16} /> Perfil no RaroNexus</a>}
                  <button type="button" role="menuitem" onClick={() => void signOut()}><LogOut size={16} /> Sair da conta</button>
                </div>
              )}
            </div>
          </div>
        </header>
        {auth.demo && <div className="demo-ribbon"><span className="demo-ribbon-dot" /> Modo demonstração <span>Dados fictícios · alterações salvas apenas neste ambiente</span><Check size={14} /></div>}
        <main className="app-main"><Outlet /></main>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'R';
}

function getSavedTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem('rarotickets-theme') === 'light' ? 'light' : 'dark';
}
