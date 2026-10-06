import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppShell } from '../modules/dashboard/client/ui/components/app-shell.component';
import { DashboardPage } from '../modules/dashboard/client/ui/pages/dashboard.page';
import { ModulePlaceholderPage } from '../modules/dashboard/client/ui/pages/module-placeholder.page';
import { LoginPage } from '../modules/auth/client/ui/pages/login.page';
import { EventsPage } from '../modules/events/client/ui/pages/events.page';
import { useAuth } from '../modules/auth/client/state/auth-context';
import type { ApplicationPermission } from '../modules/auth/domain/value-objects/application-role.vo';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuthenticated />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<RequirePermission permission="dashboard:read"><DashboardPage /></RequirePermission>} />
          <Route path="events" element={<RequirePermission permission="events:read"><EventsPage /></RequirePermission>} />
          <Route path="registrations" element={<RequirePermission permission="registrations:read"><ModulePlaceholderPage moduleKey="registrations" /></RequirePermission>} />
          <Route path="participants" element={<RequirePermission permission="participants:read"><ModulePlaceholderPage moduleKey="participants" /></RequirePermission>} />
          <Route path="finance" element={<RequirePermission permission="finance:read"><ModulePlaceholderPage moduleKey="finance" /></RequirePermission>} />
          <Route path="check-in" element={<RequirePermission permission="checkin:manage"><ModulePlaceholderPage moduleKey="check-in" /></RequirePermission>} />
          <Route path="reports" element={<RequirePermission permission="reports:read"><ModulePlaceholderPage moduleKey="reports" /></RequirePermission>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

function RequireAuthenticated() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === 'loading') return <FullPageState title="Conferindo sua sessão" description="Só um instante." />;
  if (auth.status === 'unavailable') {
    return <FullPageState title="Não foi possível conectar" description="Verifique sua conexão e tente novamente." action={<button className="button button-primary" onClick={() => void auth.refreshSession()}>Tentar novamente</button>} />;
  }
  if (auth.status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (auth.status === 'forbidden') {
    return <FullPageState title="Acesso não autorizado" description="Seu perfil no RaroNexus não possui uma função habilitada no RaroTickets." action={<a className="button button-quiet" href="/api/auth/logout" onClick={(event) => { event.preventDefault(); void auth.logout(); }}>Encerrar sessão</a>} />;
  }
  return <Outlet />;
}

export type RequirePermissionProps = {
  permission: ApplicationPermission;
  children: ReactNode;
};

function RequirePermission(params: RequirePermissionProps) {
  const auth = useAuth();
  if (!auth.session?.permissions.includes(params.permission)) {
    return <FullPageState title="Sem permissão" description="Seu perfil não possui acesso a esta área. Se precisar, fale com um administrador do RaroTickets." />;
  }
  return params.children;
}

export type FullPageStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

function FullPageState(params: FullPageStateProps) {
  return (
    <main className="full-page-state">
      <div className="brand-mark brand-mark-large"><span>R</span></div>
      <p className="eyebrow">RAROTICKETS</p>
      <h1>{params.title}</h1>
      <p className="muted-copy">{params.description}</p>
      {params.action}
    </main>
  );
}
