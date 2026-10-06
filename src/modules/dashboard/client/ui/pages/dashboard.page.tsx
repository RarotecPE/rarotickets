import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, CircleDollarSign, Clock3, Plus, TicketCheck, Users, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { eventsApiService } from '../../../../../client/bootstrap/container';
import { useAuth } from '../../../../auth/client/state/auth-context';
import type { EventView } from '../../../../events/client/types/event.types';

type FormatDashboardDateParams = { date: Date };
type GetDashboardGreetingParams = { hour: number };

export function DashboardPage() {
  const auth = useAuth();
  const [events, setEvents] = useState<EventView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    eventsApiService.list()
      .then((response) => {
        if (isMounted) setEvents(response.data.events);
      })
      .catch(() => {
        if (isMounted) setErrorMessage('Não foi possível carregar os eventos. Tente atualizar a página.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const summary = useMemo(() => getDashboardSummary(events), [events]);
  const upcomingEvents = useMemo(() => getUpcomingEvents(events), [events]);
  const currentDate = new Date();
  const dateLabel = formatDashboardDate({ date: currentDate });
  const greeting = getDashboardGreeting({ hour: currentDate.getHours() });
  const firstName = auth.session?.user.name.split(' ')[0] ?? 'Olá';
  const canCreateEvents = auth.session?.permissions.includes('events:create') ?? false;

  return (
    <div className="page-content dashboard-page">
      <section className="page-intro dashboard-intro">
        <div>
          <p className="eyebrow">{dateLabel}</p>
          <h1>{greeting}, {firstName}<span className="wave-emoji" aria-hidden="true">✦</span></h1>
          <p>Veja o que está acontecendo com seus eventos.</p>
        </div>
        {canCreateEvents && <Link className="button button-primary dashboard-create-button" to="/events"><Plus size={17} /> Criar evento</Link>}
      </section>

      {errorMessage && <div className="callout callout-danger" role="alert">{errorMessage}</div>}
      {auth.demo && <div className="dashboard-demo-note"><span className="demo-ribbon-dot" /> Seus números são de demonstração e usam dados fictícios.</div>}

      <section className="metric-grid" aria-label="Indicadores dos eventos">
        <MetricCard icon={CalendarDays} label="Eventos em andamento" value={isLoading ? '—' : String(summary.activeEvents)} note={`${summary.openRegistrationEvents} com inscrições abertas`} tone="blue" />
        <MetricCard icon={TicketCheck} label="Inscrições confirmadas" value={isLoading ? '—' : summary.confirmedRegistrations.toLocaleString('pt-BR')} note={`${summary.pendingRegistrations.toLocaleString('pt-BR')} aguardando confirmação`} tone="green" />
        <MetricCard icon={CircleDollarSign} label="Receita recebida" value={isLoading ? '—' : formatCurrency(summary.revenueCents)} note="Total confirmado dos eventos" tone="violet" />
        <MetricCard icon={Users} label="Vagas disponíveis" value={isLoading ? '—' : summary.availableSeats === null ? 'Ilimitadas' : summary.availableSeats.toLocaleString('pt-BR')} note="Considerando inscrições confirmadas" tone="amber" />
      </section>

      <div className="dashboard-main-grid">
        <section className="surface-card occupancy-card">
          <div className="section-heading">
            <div><p className="eyebrow">ACOMPANHAMENTO</p><h2>Ocupação dos eventos</h2><p className="section-subtitle">Inscrições confirmadas em relação à capacidade.</p></div>
            <Link to="/events" className="text-link">Ver eventos <ArrowRight size={15} /></Link>
          </div>
          {isLoading ? <LoadingRows /> : summary.capacityEvents.length === 0 ? <EmptyDashboardState message="Cadastre eventos com capacidade para acompanhar a ocupação." /> : (
            <div className="occupancy-list">
              {summary.capacityEvents.slice(0, 4).map((event) => {
                const capacityPercent = getOccupancyPercent(event);
                return (
                  <article className="occupancy-row" key={event.id}>
                    <div className="occupancy-row-top"><div><strong>{event.title}</strong><span>{formatShortDate(event.startAt)} <span className="dot-separator">·</span> {event.modality === 'ONLINE' ? 'Online' : 'Presencial'}</span></div><b>{event.confirmedRegistrationsCount.toLocaleString('pt-BR')}<small> / {event.capacity?.toLocaleString('pt-BR')}</small></b></div>
                    <div className="progress-track" role="progressbar" aria-label={`Ocupação de ${event.title}`} aria-valuenow={capacityPercent} aria-valuemin={0} aria-valuemax={100}><span className={`progress-fill ${capacityPercent >= 85 ? 'progress-fill-warning' : ''}`} style={{ width: `${capacityPercent}%` }} /></div>
                  </article>
                );
              })}
            </div>
          )}
          <div className="occupancy-footer"><span><i className="legend-dot legend-dot-primary" /> Confirmações</span><span>{summary.capacityEvents.length} eventos com limite de vagas</span></div>
        </section>

        <section className="surface-card upcoming-card">
          <div className="section-heading">
            <div><p className="eyebrow">AGENDA</p><h2>Próximos eventos</h2></div>
            <Link to="/events" className="icon-link-button" aria-label="Ver todos os eventos"><ArrowRight size={17} /></Link>
          </div>
          {isLoading ? <LoadingRows /> : upcomingEvents.length === 0 ? <EmptyDashboardState message="Seus próximos eventos aparecerão aqui." /> : (
            <div className="upcoming-list">
              {upcomingEvents.slice(0, 3).map((event) => (
                <article className="upcoming-event" key={event.id}>
                  <div className="date-tile"><span>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(new Date(event.startAt))}</span><small>{new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(event.startAt)).replace('.', '')}</small></div>
                  <div className="upcoming-event-info"><strong>{event.title}</strong><span><Clock3 size={13} /> {formatTime(event.startAt)} <span className="dot-separator">·</span> {event.modality === 'ONLINE' ? 'Online' : 'Presencial'}</span></div>
                  <span className={`status-pill status-${event.status.toLowerCase()}`}>{getStatusLabel(event.status)}</span>
                </article>
              ))}
            </div>
          )}
          <Link className="upcoming-footer-link" to="/events">Abrir calendário <ArrowRight size={15} /></Link>
        </section>
      </div>

      <section className="surface-card recent-events-card">
        <div className="section-heading">
          <div><p className="eyebrow">VISÃO RÁPIDA</p><h2>Eventos recentes</h2><p className="section-subtitle">Acompanhe o status e as inscrições de cada evento.</p></div>
          <Link to="/events" className="text-link">Todos os eventos <ArrowRight size={15} /></Link>
        </div>
        {isLoading ? <LoadingRows /> : events.length === 0 ? <EmptyDashboardState message="Ainda não há eventos cadastrados." /> : (
          <div className="dashboard-event-list">
            {events.slice(0, 4).map((event) => <EventSummaryRow key={event.id} event={event} />)}
          </div>
        )}
      </section>

      <section className="dashboard-bottom-grid">
        <div className="surface-card dashboard-tip-card">
          <span className="tip-icon"><WalletCards size={18} /></span>
          <div><p className="eyebrow">DICA RÁPIDA</p><h3>Um bom evento começa por uma boa experiência.</h3><p>Revise o formulário de inscrição e mantenha as informações do evento atualizadas.</p></div>
          <Link to="/events" aria-label="Ir para eventos"><ArrowRight size={17} /></Link>
        </div>
        <div className="surface-card dashboard-summary-card">
          <div><span className="summary-icon"><TicketCheck size={17} /></span><span className="summary-label">Inscrições no período</span></div>
          <strong>{isLoading ? '—' : summary.registrations.toLocaleString('pt-BR')}</strong>
          <span className="summary-caption">Em todos os eventos cadastrados</span>
        </div>
      </section>
    </div>
  );
}

export type MetricCardProps = {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  note: string;
  tone: 'blue' | 'green' | 'violet' | 'amber';
};

function MetricCard(params: MetricCardProps) {
  const Icon = params.icon;
  return (
    <article className="metric-card surface-card">
      <div className="metric-card-heading"><span className={`metric-icon metric-icon-${params.tone}`}><Icon size={18} /></span><span className="metric-more">•••</span></div>
      <span className="metric-label">{params.label}</span>
      <strong className="metric-value">{params.value}</strong>
      <span className="metric-note">{params.note}</span>
    </article>
  );
}

export type EventSummaryRowProps = { event: EventView };

function EventSummaryRow(params: EventSummaryRowProps) {
  const { event } = params;
  return (
    <article className="dashboard-event-row">
      <div className="event-title-cell"><span className="event-list-mark"><CalendarDays size={16} /></span><div><strong>{event.title}</strong><span>{formatShortDate(event.startAt)} <span className="dot-separator">·</span> {event.modality === 'ONLINE' ? 'Online' : event.location || 'Local a definir'}</span></div></div>
      <span className="event-kind-label">{event.eventType === 'PAGO' ? 'Pago' : 'Gratuito'}</span>
      <div className="event-count-cell"><strong>{event.registrationsCount.toLocaleString('pt-BR')}</strong><span>inscrições</span></div>
      <span className={`status-pill status-${event.status.toLowerCase()}`}>{getStatusLabel(event.status)}</span>
    </article>
  );
}

export type DashboardSummary = {
  activeEvents: number;
  openRegistrationEvents: number;
  registrations: number;
  confirmedRegistrations: number;
  pendingRegistrations: number;
  revenueCents: number;
  availableSeats: number | null;
  capacityEvents: EventView[];
};

function getDashboardSummary(events: EventView[]): DashboardSummary {
  const activeStatuses = new Set(['AGENDADO', 'INSCRICOES_ABERTAS', 'EM_ANDAMENTO']);
  const activeEvents = events.filter((event) => activeStatuses.has(event.status));
  const confirmedRegistrations = events.reduce((total, event) => total + event.confirmedRegistrationsCount, 0);
  const registrations = events.reduce((total, event) => total + event.registrationsCount, 0);
  const hasUnlimitedEvent = activeEvents.some((event) => event.capacity === null);
  const capacityEvents = activeEvents.filter((event) => event.capacity !== null);
  const availableSeats = hasUnlimitedEvent
    ? null
    : capacityEvents.reduce((total, event) => total + Math.max((event.capacity ?? 0) - event.confirmedRegistrationsCount, 0), 0);
  return {
    activeEvents: activeEvents.length,
    openRegistrationEvents: events.filter((event) => event.status === 'INSCRICOES_ABERTAS').length,
    registrations,
    confirmedRegistrations,
    pendingRegistrations: Math.max(registrations - confirmedRegistrations, 0),
    revenueCents: events.reduce((total, event) => total + event.revenueCents, 0),
    availableSeats,
    capacityEvents: [...capacityEvents].sort((first, second) => getOccupancyPercent(second) - getOccupancyPercent(first)),
  };
}

function formatDashboardDate(params: FormatDashboardDateParams): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(params.date);
}

function getDashboardGreeting(params: GetDashboardGreetingParams): string {
  if (params.hour < 12) return 'Bom dia';
  if (params.hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getUpcomingEvents(events: EventView[]): EventView[] {
  return events
    .filter((event) => event.status !== 'CANCELADO' && event.status !== 'FINALIZADO' && new Date(event.startAt).getTime() >= Date.now())
    .sort((first, second) => first.startAt.localeCompare(second.startAt));
}

function getOccupancyPercent(event: EventView): number {
  if (!event.capacity) return 0;
  return Math.min(100, Math.round((event.confirmedRegistrationsCount / event.capacity) * 100));
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(cents / 100);
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)).replace('.', '');
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function getStatusLabel(status: EventView['status']): string {
  const labels: Record<EventView['status'], string> = {
    RASCUNHO: 'Rascunho',
    AGENDADO: 'Agendado',
    INSCRICOES_ABERTAS: 'Inscrições abertas',
    INSCRICOES_ENCERRADAS: 'Encerradas',
    EM_ANDAMENTO: 'Em andamento',
    FINALIZADO: 'Finalizado',
    CANCELADO: 'Cancelado',
  };
  return labels[status];
}

function LoadingRows() {
  return <div className="loading-rows" aria-label="Carregando dados"><span /><span /><span /></div>;
}

export type EmptyDashboardStateProps = { message: string };

function EmptyDashboardState(params: EmptyDashboardStateProps) {
  return <div className="empty-dashboard-state"><span className="empty-state-icon"><CalendarDays size={18} /></span><p>{params.message}</p></div>;
}
