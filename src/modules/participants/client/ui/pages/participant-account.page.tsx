import { CalendarDays, LogOut, ShieldCheck, TicketCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useParticipantAuth } from '../../state/participant-auth-context';

export function ParticipantAccountPage() {
  const auth = useParticipantAuth();
  const navigate = useNavigate();
  const participant = auth.participant;

  const signOut = async () => {
    await auth.logout().catch(() => undefined);
    navigate('/account/login', { replace: true });
  };

  if (!participant) return null;

  return (
    <main className="participant-account-page">
      <header className="participant-account-header">
        <Link className="brand-lockup" to="/account" aria-label="RaroTickets — conta do participante">
          <span className="brand-mark"><TicketCheck size={20} /></span>
          <span className="brand-name">raro<span>tickets</span></span>
        </Link>
        <button className="button button-quiet" type="button" onClick={() => void signOut()}><LogOut size={16} /> Sair</button>
      </header>
      <section className="participant-account-intro">
        <span className="eyebrow">ÁREA DO PARTICIPANTE</span>
        <h1>Olá, {participant.name.split(' ')[0]}.</h1>
        <p>Esta é sua conta para acompanhar sua participação nos eventos Raro.</p>
      </section>
      <section className="participant-profile-card">
        <div className="participant-profile-heading"><span className="participant-profile-icon"><ShieldCheck size={18} /></span><div><h2>Seus dados</h2><p>Cadastro independente da conta da equipe Raro.</p></div></div>
        <dl className="participant-profile-details">
          <div><dt>Nome</dt><dd>{participant.name}</dd></div>
          <div><dt>E-mail</dt><dd>{participant.email}</dd></div>
          <div><dt>CPF</dt><dd>{participant.cpfMasked}</dd></div>
          <div><dt>Conta criada</dt><dd>{formatAccountDate({ value: participant.createdAt })}</dd></div>
        </dl>
      </section>
      <section className="participant-history-card">
        <span className="participant-history-icon"><CalendarDays size={19} /></span>
        <h2>Seu histórico de eventos</h2>
        <p>Suas inscrições, pagamentos, credenciais e certificados aparecerão aqui quando esses fluxos forem disponibilizados.</p>
        <span className="participant-history-status"><span /> Conta de participante ativa</span>
      </section>
    </main>
  );
}

type FormatAccountDateParams = { value: string };

function formatAccountDate(params: FormatAccountDateParams): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(params.value));
}
