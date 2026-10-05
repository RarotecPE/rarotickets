import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROUTES } from '@shared/constants/route.constants';
import { useSession } from '@client/state/session.state';
import { Button } from '../components/button.component';

const ADMIN_LINKS = [
  { to: ROUTES.adminDashboard, label: 'Dashboard', permission: 'REPORT_VIEW' },
  { to: ROUTES.adminEvents, label: 'Eventos', permission: 'EVENT_UPDATE' },
  { to: ROUTES.adminRegistrations, label: 'Inscrições', permission: 'REGISTRATION_VIEW' },
  { to: ROUTES.adminCheckin, label: 'Check-in', permission: 'CHECKIN_PERFORM' },
  { to: ROUTES.adminPayments, label: 'Pagamentos', permission: 'PAYMENT_VIEW' },
  { to: ROUTES.adminCoupons, label: 'Cupons', permission: 'COUPON_MANAGE' },
  { to: ROUTES.adminReports, label: 'Relatórios', permission: 'REPORT_VIEW' },
  { to: ROUTES.adminUsers, label: 'Usuários', permission: 'USER_MANAGE' },
  { to: ROUTES.adminAudit, label: 'Auditoria', permission: 'AUDIT_VIEW' },
] as const;

/** Layout da equipe: navegação inferior no mobile e lateral a partir de `lg`. */
export function AdminLayout() {
  const navigate = useNavigate();
  const { user, can, logout } = useSession();
  const links = ADMIN_LINKS.filter((link) => can(link.permission));

  const handleLogout = async () => {
    await logout();
    void navigate(ROUTES.adminLogin);
  };

  return (
    <div className="min-h-dvh bg-app-background lg:flex">
      <aside className="hidden w-56 shrink-0 border-r border-app-border bg-app-surface lg:flex lg:flex-col">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="grid size-8 place-items-center rounded-[8px] bg-app-primary text-sm font-bold text-app-primary-foreground">
            R
          </span>
          <span className="text-[15px] font-semibold">RaroTickets</span>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === ROUTES.adminDashboard}
              className={({ isActive }) =>
                `block rounded-[8px] px-3 py-2 text-[13px] ${isActive ? 'bg-app-surface-elevated text-app-foreground' : 'text-app-muted hover:text-app-foreground'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-app-border p-3">
          <p className="truncate text-[13px] font-medium">{user?.name}</p>
          <p className="truncate text-[12px] text-app-muted">{user?.roleLabel}</p>
          <Button size="sm" variant="secondary" block className="mt-3" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-app-border bg-app-surface px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-[8px] bg-app-primary text-sm font-bold text-app-primary-foreground">
              R
            </span>
            <span className="text-[14px] font-semibold">RaroTickets</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="max-w-28 truncate text-[12px] text-app-muted">{user?.name}</span>
            <Button size="sm" variant="ghost" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4 lg:pb-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* No mobile todas as seções ficam acessíveis: a barra rola na horizontal. */}
        <nav className="app-scroll-x fixed bottom-0 left-0 right-0 z-40 flex gap-1 overflow-x-auto border-t border-app-border bg-app-surface px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === ROUTES.adminDashboard}
              className={({ isActive }) =>
                `shrink-0 rounded-[8px] px-3 py-3 text-center text-[11px] ${isActive ? 'text-app-primary' : 'text-app-muted'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
