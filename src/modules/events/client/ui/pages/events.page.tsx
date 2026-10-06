import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, ArrowRight, CalendarDays, Check, ChevronDown, CircleAlert, Filter, MapPin, Plus, Search, TicketCheck, Users, X } from 'lucide-react';
import { ApiClientError } from '../../../../../client/services/api-service.base';
import { eventsApiService } from '../../../../../client/bootstrap/container';
import { useAuth } from '../../../../auth/client/state/auth-context';
import type { EventView } from '../../types/event.types';
import type { EventStatus } from '../../../domain/value-objects/event-status.vo';
import { CreateEventDialog } from '../components/create-event-dialog.component';

export type EventFilterKey = 'all' | 'open' | 'draft' | 'closed';
type EventFilter = { key: EventFilterKey; label: string };
type EventStatusOption = { value: EventStatus; label: string };
type FilterEventsParams = { events: EventView[]; filter: EventFilterKey; search: string };
type ChangeEventStatusParams = { eventId: string; status: EventStatus };
type OnEventStatusChange = (params: ChangeEventStatusParams) => Promise<void>;
type OnCreateEvent = () => void;

const EVENT_FILTERS: EventFilter[] = [
  { key: 'all', label: 'Todos' },
  { key: 'open', label: 'Inscrições abertas' },
  { key: 'draft', label: 'Rascunhos' },
  { key: 'closed', label: 'Encerrados' },
];

const STATUS_OPTIONS: EventStatusOption[] = [
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'AGENDADO', label: 'Agendado' },
  { value: 'INSCRICOES_ABERTAS', label: 'Inscrições abertas' },
  { value: 'INSCRICOES_ENCERRADAS', label: 'Encerradas' },
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export function EventsPage() {
  const auth = useAuth();
  const [events, setEvents] = useState<EventView[]>([]);
  const [filter, setFilter] = useState<EventFilterKey>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadEvents = async () => {
    setErrorMessage('');
    setIsRefreshing(true);
    try {
      const response = await eventsApiService.list();
      setEvents(response.data.events);
    } catch {
      setErrorMessage('Não foi possível carregar seus eventos. Tente novamente.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  const filteredEvents = useMemo(() => filterEvents({ events, filter, search }), [events, filter, search]);
  const canCreate = auth.session?.permissions.includes('events:create') ?? false;
  const canUpdate = auth.session?.permissions.includes('events:update') ?? false;
  const canCancel = auth.session?.permissions.includes('events:cancel') ?? false;
  const openEvents = events.filter((event) => event.status === 'INSCRICOES_ABERTAS').length;
  const draftEvents = events.filter((event) => event.status === 'RASCUNHO').length;

  const onEventCreated = (event: EventView) => {
    setEvents((currentEvents) => [event, ...currentEvents].sort((first, second) => first.startAt.localeCompare(second.startAt)));
    setIsDialogOpen(false);
    setFeedback({ tone: 'success', message: 'Rascunho criado. Você pode publicar o evento quando estiver pronto.' });
  };

  const onStatusChange = async (params: ChangeEventStatusParams) => {
    const { eventId, status } = params;
    setFeedback(null);
    setUpdatingEventId(eventId);
    try {
      const response = await eventsApiService.updateStatus({ eventId, status });
      setEvents((currentEvents) => currentEvents.map((event) => event.id === eventId ? response.data.event : event));
      setFeedback({ tone: 'success', message: `Situação atualizada para ${getStatusLabel(status).toLowerCase()}.` });
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : 'Não foi possível atualizar a situação do evento.';
      setFeedback({ tone: 'danger', message });
    } finally {
      setUpdatingEventId(null);
    }
  };

  return (
    <div className="page-content events-page">
      <section className="page-intro events-intro">
        <div><p className="eyebrow">GESTÃO DE EVENTOS</p><h1>Seus eventos</h1><p>Crie, acompanhe e mantenha cada experiência em movimento.</p></div>
        {canCreate && <button className="button button-primary" type="button" onClick={() => setIsDialogOpen(true)}><Plus size={17} /> Criar evento</button>}
      </section>

      <section className="event-overview-strip" aria-label="Resumo de eventos">
        <div><span className="event-overview-icon"><CalendarDays size={17} /></span><span><strong>{events.length}</strong><small>eventos no total</small></span></div>
        <span className="overview-divider" />
        <div><span className="overview-live-dot" /><span><strong>{openEvents}</strong><small>com inscrições abertas</small></span></div>
        <span className="overview-divider" />
        <div><span className="overview-draft-icon"><TicketCheck size={17} /></span><span><strong>{draftEvents}</strong><small>rascunhos</small></span></div>
        <button className="event-refresh-button" type="button" onClick={() => void loadEvents()} disabled={isRefreshing} aria-label="Atualizar eventos"><ArrowDownUp size={15} className={isRefreshing ? 'spin-icon' : ''} /></button>
      </section>

      {feedback && <div className={`callout ${feedback.tone === 'success' ? 'callout-success' : 'callout-danger'}`} role="status"><span>{feedback.tone === 'success' ? <Check size={16} /> : <CircleAlert size={16} />}</span>{feedback.message}<button type="button" className="mini-icon-button" onClick={() => setFeedback(null)} aria-label="Fechar aviso"><X size={15} /></button></div>}
      {errorMessage && <div className="callout callout-danger" role="alert"><CircleAlert size={16} />{errorMessage}<button type="button" className="button button-quiet button-small" onClick={() => void loadEvents()}>Tentar novamente</button></div>}

      <section className="surface-card events-list-card">
        <div className="events-list-heading">
          <div><p className="eyebrow">CATÁLOGO</p><h2>Todos os eventos</h2><p className="section-subtitle">Filtre por situação ou encontre um evento pelo nome.</p></div>
          <div className="events-sort-label"><Filter size={15} /> Mais recentes</div>
        </div>
        <div className="events-toolbar">
          <div className="event-filter-tabs" role="tablist" aria-label="Filtrar eventos">
            {EVENT_FILTERS.map((option) => <button key={option.key} type="button" role="tab" aria-selected={filter === option.key} className={filter === option.key ? 'event-filter-tab event-filter-tab-active' : 'event-filter-tab'} onClick={() => setFilter(option.key)}>{option.label}{option.key === 'all' && <span>{events.length}</span>}</button>)}
          </div>
          <label className="event-search"><Search size={16} /><span className="sr-only">Buscar evento</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar evento..." /></label>
        </div>

        {isLoading ? <EventListLoading /> : filteredEvents.length === 0 ? <EventsEmptyState hasSearch={Boolean(search.trim())} canCreate={canCreate} onCreate={() => setIsDialogOpen(true)} /> : (
          <>
            <div className="events-table-wrap">
              <table className="events-table">
                <thead><tr><th>Evento</th><th>Data e local</th><th>Tipo</th><th>Inscrições</th><th>Situação</th><th><span className="sr-only">Ações</span></th></tr></thead>
                <tbody>{filteredEvents.map((event) => <EventTableRow key={event.id} event={event} canUpdate={canUpdate} canCancel={canCancel} isUpdating={updatingEventId === event.id} onStatusChange={onStatusChange} />)}</tbody>
              </table>
            </div>
            <div className="mobile-event-cards">{filteredEvents.map((event) => <EventMobileCard key={event.id} event={event} canUpdate={canUpdate} canCancel={canCancel} isUpdating={updatingEventId === event.id} onStatusChange={onStatusChange} />)}</div>
          </>
        )}
        {!isLoading && filteredEvents.length > 0 && <div className="events-list-footer"><span>Exibindo {filteredEvents.length} de {events.length} eventos</span><button type="button" className="text-link" onClick={() => void loadEvents()} disabled={isRefreshing}>Atualizar lista <ArrowRight size={14} /></button></div>}
      </section>

      {isDialogOpen && <CreateEventDialog onClose={() => setIsDialogOpen(false)} onCreated={onEventCreated} />}
    </div>
  );
}

export type EventRowProps = {
  event: EventView;
  canUpdate: boolean;
  canCancel: boolean;
  isUpdating: boolean;
  onStatusChange: OnEventStatusChange;
};

function EventTableRow(params: EventRowProps) {
  const { event } = params;
  const statusOptions = STATUS_OPTIONS.filter((option) => option.value !== 'CANCELADO' || params.canCancel);
  return (
    <tr>
      <td><div className="table-event-title"><span className={`event-list-mark event-mark-${event.eventType.toLowerCase()}`}><CalendarDays size={16} /></span><div><strong>{event.title}</strong><span>{event.shortDescription}</span></div></div></td>
      <td><div className="event-location-cell"><strong>{formatEventDate(event.startAt)}</strong><span><MapPin size={13} />{event.modality === 'ONLINE' ? 'Online' : event.location || 'Local a definir'}</span></div></td>
      <td><span className={`event-kind-badge event-kind-${event.eventType.toLowerCase()}`}>{event.eventType === 'PAGO' ? 'Pago' : 'Gratuito'}</span>{event.eventType === 'PAGO' && <small className="event-price-hint">{formatCurrency(event.priceCents)}</small>}</td>
      <td><div className="table-registration-count"><strong>{event.registrationsCount.toLocaleString('pt-BR')}</strong><span>{event.capacity ? `de ${event.capacity.toLocaleString('pt-BR')}` : 'inscrições'}</span></div></td>
      <td><span className={`status-pill status-${event.status.toLowerCase()}`}>{getStatusLabel(event.status)}</span></td>
      <td><label className={`status-select-wrap${!params.canUpdate ? ' status-select-disabled' : ''}`}><span className="sr-only">Alterar situação de {event.title}</span><select value={event.status} disabled={!params.canUpdate || params.isUpdating} onChange={(changeEvent) => void params.onStatusChange({ eventId: event.id, status: changeEvent.target.value as EventStatus })}>{statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>{params.isUpdating ? <span className="spinner spinner-small" /> : <ChevronDown size={13} />}</label></td>
    </tr>
  );
}

function EventMobileCard(params: EventRowProps) {
  const { event } = params;
  const statusOptions = STATUS_OPTIONS.filter((option) => option.value !== 'CANCELADO' || params.canCancel);
  const progress = event.capacity ? Math.min(100, Math.round((event.confirmedRegistrationsCount / event.capacity) * 100)) : null;
  return (
    <article className="event-mobile-card">
      <div className="event-mobile-top"><span className={`event-list-mark event-mark-${event.eventType.toLowerCase()}`}><CalendarDays size={16} /></span><span className={`status-pill status-${event.status.toLowerCase()}`}>{getStatusLabel(event.status)}</span></div>
      <h3>{event.title}</h3><p>{event.shortDescription}</p>
      <div className="event-mobile-meta"><span><CalendarDays size={14} />{formatEventDate(event.startAt)}</span><span><MapPin size={14} />{event.modality === 'ONLINE' ? 'Online' : event.location || 'Local a definir'}</span></div>
      <div className="event-mobile-stats"><span><TicketCheck size={15} /><strong>{event.registrationsCount.toLocaleString('pt-BR')}</strong> inscrições</span><span><Users size={15} /><strong>{event.capacity ? event.capacity.toLocaleString('pt-BR') : '∞'}</strong> vagas</span><span className={`event-kind-badge event-kind-${event.eventType.toLowerCase()}`}>{event.eventType === 'PAGO' ? formatCurrency(event.priceCents) : 'Gratuito'}</span></div>
      {progress !== null && <div className="mobile-capacity-progress"><div className="progress-track"><span className={`progress-fill ${progress >= 85 ? 'progress-fill-warning' : ''}`} style={{ width: `${progress}%` }} /></div><small>{progress}% de vagas confirmadas</small></div>}
      <div className="event-mobile-actions"><span>Alterar situação</span><label className={`status-select-wrap${!params.canUpdate ? ' status-select-disabled' : ''}`}><span className="sr-only">Alterar situação de {event.title}</span><select value={event.status} disabled={!params.canUpdate || params.isUpdating} onChange={(changeEvent) => void params.onStatusChange({ eventId: event.id, status: changeEvent.target.value as EventStatus })}>{statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>{params.isUpdating ? <span className="spinner spinner-small" /> : <ChevronDown size={13} />}</label></div>
    </article>
  );
}

export type EventsEmptyStateProps = { hasSearch: boolean; canCreate: boolean; onCreate: OnCreateEvent };

function EventsEmptyState(params: EventsEmptyStateProps) {
  return (
    <div className="events-empty-state"><span className="events-empty-icon"><CalendarDays size={21} /></span><h3>{params.hasSearch ? 'Nenhum evento encontrado' : 'Ainda não há eventos por aqui'}</h3><p>{params.hasSearch ? 'Tente outro termo ou ajuste os filtros.' : 'Crie seu primeiro evento e comece a organizar cada detalhe.'}</p>{!params.hasSearch && params.canCreate && <button className="button button-primary" type="button" onClick={params.onCreate}><Plus size={16} /> Criar evento</button>}</div>
  );
}

function EventListLoading() {
  return <div className="event-list-loading"><span /><span /><span /><span /></div>;
}

function filterEvents(params: FilterEventsParams): EventView[] {
  const query = params.search.trim().toLocaleLowerCase('pt-BR');
  return params.events.filter((event) => {
    if (params.filter === 'open' && event.status !== 'INSCRICOES_ABERTAS') return false;
    if (params.filter === 'draft' && event.status !== 'RASCUNHO') return false;
    if (params.filter === 'closed' && !['INSCRICOES_ENCERRADAS', 'FINALIZADO', 'CANCELADO'].includes(event.status)) return false;
    return !query || `${event.title} ${event.shortDescription} ${event.location}`.toLocaleLowerCase('pt-BR').includes(query);
  });
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)).replace('.', '');
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(cents / 100);
}

function getStatusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
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
