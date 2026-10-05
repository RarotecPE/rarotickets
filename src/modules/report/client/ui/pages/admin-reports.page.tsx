import { useState } from 'react';
import { api, REPORT_KEYS } from '@client/config/services';
import type { ReportKey } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { Button } from '@client/ui/components/button.component';
import { SectionCard } from '@client/ui/components/card.component';
import { DataTable } from '@client/ui/components/data-table.component';
import { EmptyState, ErrorBlock } from '@client/ui/components/feedback.component';
import { SelectField, TextField } from '@client/ui/components/form-fields.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { Pagination } from '@client/ui/components/pagination.component';

const REPORT_LABELS: Record<ReportKey, string> = {
  'registrations-by-event': 'Inscrições por evento',
  'attendance-list': 'Lista de presença',
  'check-ins': 'Check-ins realizados',
  'registration-funnel': 'Funil de inscrições',
  'payments-by-period': 'Pagamentos por período',
  'open-payments': 'Pagamentos em aberto',
  refunds: 'Estornos',
  'coupon-usage': 'Uso de cupons',
  waitlist: 'Lista de espera',
  'participants-by-location': 'Participantes por localidade',
  'certificates-issued': 'Certificados emitidos',
  'revenue-by-lote': 'Receita por lote',
  communications: 'Comunicações enviadas',
};

/** Os 13 relatórios operacionais (§41) com filtros de período e evento. */
export function AdminReportsPage() {
  const [reportKey, setReportKey] = useState<ReportKey>('registrations-by-event');
  const [eventId, setEventId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, error, isLoading, reload } = useAsync(
    () => api.reports.report(reportKey, { eventId: eventId || undefined, from: from || undefined, to: to || undefined, page }),
    [reportKey, eventId, from, to, page],
  );

  const rows = data?.rows ?? [];
  const firstRow = rows.length > 0 ? rows[0] : null;
  const columns = firstRow
    ? Object.keys(firstRow).map((key) => ({
        key,
        header: key.replace(/_/g, ' ').replace(/^\w/, (char) => char.toUpperCase()),
        render: (row: Record<string, string | number | null>) => String(row[key] ?? '—'),
      }))
    : [];

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Extraia a visão operacional e financeira de qualquer evento."
        actions={
          <Button size="sm" variant="secondary" onClick={() => void reload()}>
            Atualizar
          </Button>
        }
      />

      <SectionCard>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Relatório"
            value={reportKey}
            onChange={(event) => {
              setReportKey(event.target.value as ReportKey);
              setPage(1);
            }}
            options={REPORT_KEYS.map((key) => ({ value: key, label: REPORT_LABELS[key] }))}
          />
          <TextField label="Evento (id)" value={eventId} placeholder="opcional" onChange={(event) => setEventId(event.target.value.trim())} />
          <TextField label="De" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <TextField label="Até" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </SectionCard>

      <div className="mt-4 space-y-3">
        {error && <ErrorBlock message={error} onRetry={() => void reload()} />}

        {data && data.summary && Object.keys(data.summary).length > 0 && (
          <SectionCard title="Resumo">
            <dl className="grid gap-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.summary).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-2 rounded-[8px] bg-app-surface-elevated px-3 py-2">
                  <dt className="text-app-muted">{key.replace(/_/g, ' ')}</dt>
                  <dd className="font-medium">{String(value ?? '—')}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
        )}

        <SectionCard title={REPORT_LABELS[reportKey]} description={`${data?.total ?? 0} registro(s) · gerado em ${data ? new Date(data.generatedAt).toLocaleString('pt-BR') : '—'}`}>
          {!isLoading && rows.length === 0 ? (
            <EmptyState title="Nenhum dado para os filtros selecionados" description="Ajuste o período ou escolha outro evento." />
          ) : (
            <>
              <DataTable
                rows={rows}
                rowKey={(row) => JSON.stringify(row)}
                isLoading={isLoading}
                columns={columns}
              />
              <div className="mt-3">
                <Pagination page={page} perPage={50} total={data?.total ?? 0} onChange={setPage} />
              </div>
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
