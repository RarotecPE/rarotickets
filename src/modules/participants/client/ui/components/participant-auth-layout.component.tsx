import type { ReactNode } from 'react';
import { TicketCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export type ParticipantAuthLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function ParticipantAuthLayout(params: ParticipantAuthLayoutProps) {
  return (
    <main className="participant-auth-page">
      <section className="participant-auth-card" aria-labelledby="participant-auth-title">
        <Link className="brand-lockup participant-auth-brand" to="/account/login" aria-label="RaroTickets — conta do participante">
          <span className="brand-mark"><TicketCheck size={20} strokeWidth={2.2} /></span>
          <span className="brand-name">raro<span>tickets</span></span>
        </Link>
        <p className="eyebrow">{params.eyebrow}</p>
        <h1 id="participant-auth-title">{params.title}</h1>
        <p className="participant-auth-description">{params.description}</p>
        {params.children}
      </section>
    </main>
  );
}
