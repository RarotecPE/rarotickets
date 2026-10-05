import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@shared/constants/route.constants';
import { useSession } from '@client/state/session.state';
import { useParticipant } from '@client/state/participant.state';
import { LoadingBlock } from '@client/ui/components/feedback.component';

/** Exige sessão de usuário interno; guarda o destino para voltar após o login. */
export function RequireAdmin() {
  const { status } = useSession();
  const location = useLocation();

  if (status === 'loading') return <LoadingBlock label="Verificando sessão…" />;
  if (status === 'anonymous') return <Navigate to={ROUTES.adminLogin} replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Exige sessão de participante para a área "Minha área". */
export function RequireParticipant() {
  const { isLoading, isAuthenticated } = useParticipant();
  if (isLoading) return <LoadingBlock label="Carregando sua área…" />;
  if (!isAuthenticated) return <Navigate to={ROUTES.participantArea} replace />;
  return <Outlet />;
}
