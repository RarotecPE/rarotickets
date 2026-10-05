import { Link, NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '@shared/constants/route.constants';
import { useParticipant } from '@client/state/participant.state';
import { useTheme } from '@client/state/theme.state';
import { Button } from '../components/button.component';

const NAV_LINKS = [
  { to: ROUTES.home, label: 'Eventos' },
  { to: ROUTES.certificateValidation(''), label: 'Certificados' },
] as const;

/** Layout público, mobile first: navegação enxuta e ações ao alcance do polegar. */
export function PublicLayout() {
  const { mode, toggle } = useTheme();
  const { isAuthenticated, participant } = useParticipant();

  return (
    <div className="min-h-dvh bg-app-background">
      <header className="sticky top-0 z-40 border-b border-app-border bg-app-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to={ROUTES.home} className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-[8px] bg-app-primary text-sm font-bold text-app-primary-foreground">
              R
            </span>
            <span className="text-[15px] font-semibold">RaroTickets</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={mode === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              className="grid size-9 place-items-center rounded-[8px] border border-app-border text-app-muted hover:text-app-foreground"
            >
              {mode === 'dark' ? '☀' : '☾'}
            </button>
            {isAuthenticated ? (
              <Link to={ROUTES.participantArea}>
                <Button size="sm" variant="secondary">
                  {participant?.name.split(' ')[0] ?? 'Minha área'}
                </Button>
              </Link>
            ) : (
              <Link to={ROUTES.participantArea}>
                <Button size="sm" variant="secondary">
                  Minha área
                </Button>
              </Link>
            )}
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-4 px-4 pb-2 md:hidden">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === ROUTES.home}
              className={({ isActive }) =>
                `pb-1 text-[13px] ${isActive ? 'border-b-2 border-app-primary text-app-foreground' : 'text-app-muted'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 pt-6 text-[12px] text-app-muted">
        <div className="flex flex-col gap-2 border-t border-app-border pt-4 md:flex-row md:items-center md:justify-between">
          <p>RaroTickets — gestão de eventos, inscrições, pagamentos e certificados.</p>
          <div className="flex gap-4">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="hover:text-app-foreground">
                {link.label}
              </Link>
            ))}
            <Link to={ROUTES.adminDashboard} className="hover:text-app-foreground">
              Área da equipe
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
