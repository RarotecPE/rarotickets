import { useState } from 'react';
import { ArrowRight, CalendarDays, Check, CircleHelp, LockKeyhole, ShieldCheck, TicketCheck } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../state/auth-context';

type SsoLoginMode = 'interactive' | 'silent';
type LoginNextPathCandidate = string | null;

const SSO_MESSAGES: Record<string, string> = {
  login_required: 'Não encontramos uma sessão ativa do RaroNexus. Entre para continuar.',
  not_configured: 'O SSO ainda não foi configurado neste ambiente. Fale com a equipe responsável pelo RaroNexus.',
  state_mismatch: 'A solicitação de acesso expirou ou não pôde ser validada. Tente novamente.',
  missing_code: 'O RaroNexus não retornou um código de autorização. Inicie o acesso novamente.',
  access_denied: 'Seu perfil foi autenticado, mas não tem uma função autorizada no RaroTickets.',
  provider_error: 'Não foi possível concluir o acesso pelo RaroNexus. Tente novamente.',
  provider_unavailable: 'O RaroNexus está indisponível no momento. Tente novamente em alguns instantes.',
};

export function LoginPage() {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const [demoError, setDemoError] = useState('');
  const [isStartingDemo, setIsStartingDemo] = useState(false);
  const statusMessage = SSO_MESSAGES[searchParams.get('sso') ?? ''];
  const logoutMessage = searchParams.get('logout') === 'local_only'
    ? 'Sua sessão local foi encerrada. Não foi possível confirmar o encerramento da sessão global no RaroNexus.'
    : null;
  const nextPath = getSafeNextPath(searchParams.get('next'));

  if (auth.status === 'loading') {
    return <main className="login-loading"><span className="spinner" />Preparando seu acesso…</main>;
  }
  if (auth.status === 'authenticated') return <Navigate to={nextPath} replace />;

  const startSso = (mode: SsoLoginMode) => {
    const query = new URLSearchParams({ next: nextPath });
    if (mode === 'silent') query.set('mode', 'silent');
    window.location.assign(`/api/auth/raronexus/start?${query.toString()}`);
  };

  const startDemo = async () => {
    setDemoError('');
    setIsStartingDemo(true);
    try {
      await auth.loginDemo();
      window.location.assign('/dashboard');
    } catch {
      setDemoError('Não foi possível iniciar a demonstração. Tente novamente.');
      setIsStartingDemo(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Sobre o RaroTickets">
        <div className="login-story-top">
          <a className="brand-lockup" href="/login" aria-label="RaroTickets — início">
            <span className="brand-mark"><TicketCheck size={21} strokeWidth={2.2} /></span>
            <span className="brand-name">raro<span>tickets</span></span>
          </a>
          <span className="story-pill"><span className="status-dot" /> Gestão de eventos Raro</span>
        </div>
        <div className="login-story-copy">
          <p className="eyebrow">DO PRIMEIRO CONVITE AO ÚLTIMO CHECK-IN</p>
          <h1>Eventos que<br /><span>ficam na memória.</span></h1>
          <p className="story-description">Um só lugar para cuidar de cada detalhe — da inscrição à experiência no dia do evento.</p>
          <div className="story-features">
            <div><span className="feature-icon"><CalendarDays size={18} /></span><span>Organize seus eventos</span><Check size={16} className="feature-check" /></div>
            <div><span className="feature-icon"><ShieldCheck size={18} /></span><span>Gerencie acessos com segurança</span><Check size={16} className="feature-check" /></div>
          </div>
        </div>
        <div className="login-story-footer"><span>RARO ECOSSISTEMA</span><span>Um acesso. Muitas possibilidades.</span></div>
        <div className="story-orb story-orb-one" /><div className="story-orb story-orb-two" />
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-panel-mobile-brand">
          <span className="brand-mark"><TicketCheck size={21} strokeWidth={2.2} /></span>
          <span className="brand-name">raro<span>tickets</span></span>
        </div>
        <div className="login-card">
          <span className="login-icon"><LockKeyhole size={20} /></span>
          <p className="eyebrow">BEM-VINDO DE VOLTA</p>
          <h2 id="login-title">Acesse sua conta</h2>
          <p className="login-intro">Use sua identidade RaroNexus para entrar no painel de eventos.</p>

          {statusMessage && <div className="callout callout-warning" role="status">{statusMessage}</div>}
          {logoutMessage && <div className="callout callout-warning" role="status">{logoutMessage}</div>}
          {auth.status === 'forbidden' && <div className="callout callout-danger" role="alert">Seu perfil foi autenticado, mas não está autorizado a usar o RaroTickets.</div>}
          {auth.status === 'unavailable' && <div className="callout callout-danger" role="alert">Não foi possível consultar sua sessão. Verifique a conexão e tente novamente.</div>}
          {demoError && <div className="callout callout-danger" role="alert">{demoError}</div>}

          <button
            className="button button-primary login-main-action"
            type="button"
            disabled={!auth.raronexusConfigured}
            onClick={() => startSso('interactive')}
          >
            <span>Entrar com RaroNexus</span><ArrowRight size={18} />
          </button>
          <button
            className="button button-secondary login-silent-action"
            type="button"
            disabled={!auth.raronexusConfigured}
            onClick={() => startSso('silent')}
          >
            Tentar sessão já aberta
          </button>
          {!auth.raronexusConfigured && <p className="setup-hint"><CircleHelp size={15} /> SSO indisponível até cadastrar as credenciais deste ambiente.</p>}

          {auth.demoLoginEnabled && (
            <div className="demo-access">
              <div className="separator-label"><span /> <span>ou</span> <span /></div>
              <button className="button button-quiet demo-button" type="button" disabled={isStartingDemo} onClick={() => void startDemo()}>
                {isStartingDemo ? <span className="spinner spinner-small" /> : <span className="demo-avatar">SM</span>}
                <span><strong>Acessar demonstração</strong><small>Ambiente de desenvolvimento</small></span>
                <ArrowRight size={16} />
              </button>
              <p className="demo-disclaimer">A demonstração usa dados fictícios e uma sessão local temporária.</p>
            </div>
          )}

          <div className="login-trust"><ShieldCheck size={16} /><span>Autenticação protegida pelo RaroNexus</span></div>
        </div>
        <p className="login-help">Precisa de ajuda? <a href="mailto:suporte@raro.com.br">Fale com o suporte</a></p>
      </section>
    </main>
  );
}

function getSafeNextPath(candidate: LoginNextPathCandidate): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return '/dashboard';
  try {
    const destination = new URL(candidate, window.location.origin);
    if (destination.origin !== window.location.origin || destination.pathname.startsWith('/api/')) return '/dashboard';
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return '/dashboard';
  }
}
