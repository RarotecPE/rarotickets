import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@shared/constants/route.constants';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDateRange } from '@client/shared/format';
import { Badge, EventStatusBadge } from '@client/ui/components/badge.component';
import { Button } from '@client/ui/components/button.component';
import { EmptyState, ErrorBlock, LoadingBlock } from '@client/ui/components/feedback.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { TextField } from '@client/ui/components/form-fields.component';

/** Vitrine pública de eventos (§1, §2) — cartões pensados para o toque. */
export function EventsPage() {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const { data, error, isLoading, reload } = useAsync(() => api.events.listPublic({ search: term }), [term]);

  const events = data?.events ?? [];

  return (
    <div>
      <PageHeader
        title="Próximos eventos"
        description="Escolha um evento, faça sua inscrição e acompanhe tudo pela sua área."
      />

      <form
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setTerm(search.trim());
        }}
      >
        <div className="flex-1">
          <TextField
            placeholder="Buscar por título, cidade…"
            aria-label="Buscar eventos"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {isLoading && <LoadingBlock label="Carregando eventos…" />}
      {error && <ErrorBlock message={error} onRetry={() => void reload()} />}

      {!isLoading && !error && events.length === 0 && (
        <EmptyState
          title="Nenhum evento encontrado"
          description="Ajuste a busca ou volte mais tarde: novos eventos aparecem aqui assim que publicados."
        />
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {events.map((event) => (
          <li key={event.id}>
            <Link
              to={ROUTES.eventDetail(event.slug)}
              className="block h-full rounded-[12px] border border-app-border bg-app-surface p-4 transition-colors hover:border-app-primary/60"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[15px] font-semibold leading-snug">{event.title}</h2>
                <EventStatusBadge status={event.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-[13px] text-app-muted">{event.summary}</p>
              <dl className="mt-3 space-y-1 text-[13px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-app-muted">Data</dt>
                  <dd>{formatDateRange(event.startDate, event.endDate)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-app-muted">Local</dt>
                  <dd className="truncate text-right">{event.locationLabel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-app-muted">Vagas</dt>
                  <dd>
                    {event.seatUsage.availableSeats} de {event.capacity}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Badge tone={event.type === 'GRATUITO' ? 'success' : 'primary'}>
                  {event.type === 'GRATUITO' ? 'Gratuito' : 'Evento pago'}
                </Badge>
                {event.isRegistrationOpen ? (
                  <span className="text-[12px] text-app-success">Inscrições abertas</span>
                ) : (
                  <span className="text-[12px] text-app-muted">Inscrições fechadas</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
