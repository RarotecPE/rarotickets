import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@shared/constants/route.constants';
import { Button } from '@client/ui/components/button.component';
import { Alert } from '@client/ui/components/feedback.component';
import { TextField } from '@client/ui/components/form-fields.component';
import { useSession } from '@client/state/session.state';
import { useTheme } from '@client/state/theme.state';

/** Login da equipe (§35) — cria a sessão exigida pelas rotas administrativas. */
export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useSession();
  const { mode, toggle } = useTheme();
  const [email, setEmail] = useState('admin@rarotickets.com.br');
  const [password, setPassword] = useState('RaroTickets2026');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ email, password });
      const from = (location.state as { from?: string } | null)?.from ?? ROUTES.adminDashboard;
      void navigate(from, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível entrar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-app-background px-4">
      <div className="w-full max-w-sm rounded-[12px] border border-app-border bg-app-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-[8px] bg-app-primary text-sm font-bold text-app-primary-foreground">
              R
            </span>
            <div>
              <p className="text-[15px] font-semibold">RaroTickets</p>
              <p className="text-[12px] text-app-muted">Área da equipe</p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label={mode === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="grid size-9 place-items-center rounded-[8px] border border-app-border text-app-muted"
          >
            {mode === 'dark' ? '☀' : '☾'}
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          {error && <Alert tone="danger">{error}</Alert>}
          <TextField
            label="E-mail"
            type="email"
            value={email}
            autoComplete="username"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <TextField
            label="Senha"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Button type="submit" block isLoading={isSubmitting}>
            Entrar
          </Button>
        </form>

        <p className="mt-4 text-[12px] text-app-muted">
          Seed: admin@rarotickets.com.br · financeiro@rarotickets.com.br · checkin@rarotickets.com.br — senha{' '}
          <span className="text-app-foreground">RaroTickets2026</span>
        </p>
      </div>
    </div>
  );
}
