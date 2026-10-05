import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@shared/constants/route.constants';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDateRange } from '@client/shared/format';
import { Button } from '@client/ui/components/button.component';
import { DataTable } from '@client/ui/components/data-table.component';
import { EventStatusBadge } from '@client/ui/components/badge.component';
import { SelectField, TextField } from '@client/ui/components/form-fields.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { Pagination } from '@client/ui/components/pagination.component';
import { SectionCard } from '@client/ui/components/card.component';
import { ErrorBlock } from '@client/ui/components/feedback.component';

/** Gestão de eventos (§2): listagem com filtros e atalho para criação. */
export function AdminEventsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, isLoading, reload } = useAsync(
    () => api.events.listAdmin({ search: search || undefined, status: status || undefined, page }),
    [search, status, page],
  );

  return (
    <div>
      <PageHeader
        title="Eventos"
        description="Crie, publique e acompanhe a operação de cada evento."
        actions={
          <Link to="/admin/eventos/novo">
            <Button size="sm">Novo evento</Button>
          </Link>
        }
      />

      <SectionCard className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField
            label="Buscar"
            placeholder="Título, cidade…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <SelectField
            label="Status"
            placeholder="Todos"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            options={[
              { value: 'RASCUNHO', label: 'Rascunho' },
              { value: 'AGENDADO', label: 'Agendado' },
              { value: 'INSCRICOES_ABERTAS', label: 'Inscrições abertas' },
              { value: 'INSCRICOES_ENCERRADAS', label: 'Inscrições encerradas' },
              { value: 'EM_ANDAMENTO', label: 'Em andamento' },
              { value: 'FINALIZADO', label: 'Finalizado' },
              { value: 'CANCELADO', label: 'Cancelado' },
            ]}
          />
          <div className="flex items-end">
            <Button variant="secondary" block onClick={() => void reload()}>
              Atualizar
            </Button>
          </div>
        </div>
      </SectionCard>

      {error && <ErrorBlock message={error} onRetry={() => void reload()} />}

      <DataTable
        rows={data?.events ?? []}
        isLoading={isLoading}
        rowKey={(event) => event.id}
        emptyTitle="Nenhum evento encontrado"
        emptyDescription="Ajuste os filtros ou cadastre um novo evento."
        columns={[
          {
            key: 'title',
            header: 'Evento',
            primary: true,
            render: (event) => (
              <Link to={ROUTES.adminEventDetail(event.id)} className="text-app-primary underline">
                {event.title}
              </Link>
            ),
          },
          { key: 'status', header: 'Status', render: (event) => <EventStatusBadge status={event.status} /> },
          { key: 'period', header: 'Período', render: (event) => formatDateRange(event.startDate, event.endDate) },
          { key: 'type', header: 'Tipo', render: (event) => (event.type === 'GRATUITO' ? 'Gratuito' : 'Pago') },
          {
            key: 'seats',
            header: 'Ocupação',
            align: 'right',
            render: (event) =>
              `${event.seatUsage.occupiedSeats + event.seatUsage.reservedSeats}/${event.capacity}`,
          },
          { key: 'waitlist', header: 'Espera', align: 'right', render: (event) => String(event.seatUsage.waitlistCount) },
        ]}
      />

      <div className="mt-3">
        <Pagination page={page} perPage={20} total={data?.total ?? 0} onChange={setPage} />
      </div>
    </div>
  );
}
