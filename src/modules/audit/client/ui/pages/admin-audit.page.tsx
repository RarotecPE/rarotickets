import { useState } from 'react';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDateTime } from '@client/shared/format';
import { Badge } from '@client/ui/components/badge.component';
import { Button } from '@client/ui/components/button.component';
import { SectionCard } from '@client/ui/components/card.component';
import { DataTable } from '@client/ui/components/data-table.component';
import { Modal } from '@client/ui/components/modal.component';
import { SelectField, TextField } from '@client/ui/components/form-fields.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { Pagination } from '@client/ui/components/pagination.component';
import type { AuditEntryView } from '../../services/audit-api.service';

/** Trilha de auditoria: quem, quando, o quê e valores antes/depois (§36). */
export function AdminAuditPage() {
  const [entity, setEntity] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditEntryView | null>(null);

  const { data, isLoading, error, reload } = useAsync(
    () =>
      api.audit.list({
        entity: entity || undefined,
        search: search || undefined,
        from: from ? `${from}T00:00:00.000Z` : undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined,
        page,
      }),
    [entity, search, from, to, page],
  );

  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Cada operação relevante registra autor, data/hora e os valores alterados."
        actions={
          <Button size="sm" variant="secondary" onClick={() => void reload()}>
            Atualizar
          </Button>
        }
      />

      <SectionCard className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Entidade"
            placeholder="Todas"
            value={entity}
            onChange={(event) => {
              setEntity(event.target.value);
              setPage(1);
            }}
            options={(data?.entities ?? []).map((item) => ({ value: item, label: item }))}
          />
          <TextField
            label="Buscar"
            placeholder="Descrição, autor, id…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <TextField label="De" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <TextField label="Até" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </SectionCard>

      {error && <p className="mb-3 text-[13px] text-app-danger">{error}</p>}

      <DataTable
        rows={data?.entries ?? []}
        isLoading={isLoading}
        rowKey={(entry) => entry.id}
        emptyTitle="Nenhum registro de auditoria"
        onRowClick={(entry) => setSelected(entry)}
        columns={[
          {
            key: 'when',
            header: 'Quando',
            primary: true,
            render: (entry) => (
              <div>
                <p>{formatDateTime(entry.createdAt)}</p>
                <p className="text-[12px] text-app-muted">{entry.actorName ?? 'Sistema'}</p>
              </div>
            ),
          },
          { key: 'action', header: 'Operação', render: (entry) => <Badge tone="primary">{entry.action}</Badge> },
          { key: 'entity', header: 'Entidade', render: (entry) => entry.entity },
          { key: 'entityId', header: 'Registro', hideOnMobile: true, render: (entry) => entry.entityId?.slice(0, 8) ?? '—' },
          {
            key: 'description',
            header: 'Descrição',
            render: (entry) => <span className="line-clamp-2">{entry.description ?? '—'}</span>,
          },
          { key: 'ip', header: 'IP', hideOnMobile: true, render: (entry) => entry.ip ?? '—' },
        ]}
      />

      <div className="mt-3">
        <Pagination page={page} perPage={30} total={data?.total ?? 0} onChange={setPage} />
      </div>

      <Modal
        open={selected !== null}
        title={selected?.action ?? 'Registro'}
        description={selected ? `${selected.entity} · ${formatDateTime(selected.createdAt)}` : undefined}
        onClose={() => setSelected(null)}
        size="lg"
      >
        {selected && (
          <div className="space-y-3 text-[13px]">
            <dl className="grid gap-2 sm:grid-cols-2">
              <Row label="Autor" value={selected.actorName ?? 'Sistema'} />
              <Row label="Perfil" value={selected.actorRole ?? '—'} />
              <Row label="Registro" value={selected.entityId ?? '—'} />
              <Row label="IP" value={selected.ip ?? '—'} />
            </dl>
            {selected.description && <p className="rounded-[8px] bg-app-surface-elevated p-3">{selected.description}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <JsonBlock title="Antes" value={selected.before} />
              <JsonBlock title="Depois" value={selected.after} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-app-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: Record<string, unknown> | null }) {
  return (
    <div>
      <p className="mb-1 text-[12px] text-app-muted">{title}</p>
      <pre className="app-scroll-x max-h-64 rounded-[8px] border border-app-border bg-app-surface-elevated p-3 text-[12px]">
        {value ? JSON.stringify(value, null, 2) : '—'}
      </pre>
    </div>
  );
}
