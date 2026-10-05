import { useState } from 'react';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDateTime } from '@client/shared/format';
import { Button } from '@client/ui/components/button.component';
import { SectionCard, StatCard } from '@client/ui/components/card.component';
import { DataTable } from '@client/ui/components/data-table.component';
import { Alert, EmptyState, LoadingBlock } from '@client/ui/components/feedback.component';
import { CheckboxField, SelectField, TextField } from '@client/ui/components/form-fields.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { useToast } from '@client/state/toast.state';
import type { CheckInLookupView } from '../../services/checkin-api.service';

/** Credenciamento: leitura da credencial + registro de presença (§29). */
export function AdminCheckInPage() {
  const toast = useToast();
  const [eventId, setEventId] = useState('');
  const [search, setSearch] = useState('');
  const [onlyOverrides, setOnlyOverrides] = useState(false);
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState<CheckInLookupView | null>(null);
  const [isLooking, setLooking] = useState(false);
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const events = useAsync(() => api.events.listAdmin({ perPage: 50 }), []);
  const board = useAsync(
    async () => (eventId ? api.checkIn.board({ eventId, search: search || undefined, onlyOverrides }) : null),
    [eventId, search, onlyOverrides],
  );

  const eventOptions = (events.data?.events ?? []).map((event) => ({ value: event.id, label: event.title }));

  const handleLookup = async () => {
    setLooking(true);
    setLookup(null);
    try {
      const result = await api.checkIn.lookup({ code: code.trim(), eventId: eventId || undefined });
      setLookup(result);
      setOverride(false);
      setOverrideReason('');
    } catch (caught) {
      toast.show({ tone: 'warning', title: 'Credencial não localizada', description: caught instanceof Error ? caught.message : undefined });
    } finally {
      setLooking(false);
    }
  };

  const handleCheckIn = async () => {
    if (!lookup) return;
    try {
      await api.registrations.performCheckIn({
        code: lookup.registrationCode,
        override,
        overrideReason: override ? overrideReason.trim() : null,
      });
      toast.show({ tone: 'success', title: 'Check-in confirmado', description: lookup.participantName });
      setLookup(null);
      setCode('');
      await board.reload();
    } catch (caught) {
      toast.show({
        tone: 'danger',
        title: 'Check-in não realizado',
        description: caught instanceof Error ? caught.message : undefined,
      });
    }
  };

  const stats = board.data?.stats ?? null;

  return (
    <div className="space-y-4">
      <PageHeader title="Check-in" description="Valide a credencial e registre a presença." />

      <SectionCard title="Evento do credenciamento">
        <SelectField
          label="Evento"
          placeholder="Selecione o evento"
          value={eventId}
          onChange={(event) => setEventId(event.target.value)}
          options={eventOptions}
        />
      </SectionCard>

      {eventId && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Esperados" value={String(stats?.expected ?? 0)} hint="inscrições confirmadas" />
            <StatCard label="Presentes" value={String(stats?.checkedIn ?? 0)} tone="success" />
            <StatCard label="Ausentes" value={String(stats?.absent ?? 0)} />
            <StatCard label="Taxa de presença" value={stats?.attendanceRateLabel ?? '—'} tone="warning" />
          </div>

          <SectionCard title="Registrar entrada" description="Leia o QR Code ou digite o código da inscrição.">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <TextField
                  label="Código / credencial"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="RT-XXXXXX-0"
                />
              </div>
              <Button isLoading={isLooking} onClick={() => void handleLookup()}>
                Buscar
              </Button>
            </div>

            {lookup && (
              <div className="mt-4 space-y-3 rounded-[8px] border border-app-border p-3">
                <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
                  <div className="flex justify-between gap-2">
                    <dt className="text-app-muted">Participante</dt>
                    <dd>{lookup.participantName}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-app-muted">Inscrição</dt>
                    <dd>{lookup.registrationCode}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-app-muted">Evento</dt>
                    <dd className="text-right">{lookup.eventTitle}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-app-muted">Status</dt>
                    <dd>{lookup.status}</dd>
                  </div>
                </dl>

                {lookup.hasCheckedIn && (
                  <Alert tone="info" title="Check-in já registrado">
                    <p>Entrada registrada em {formatDateTime(lookup.checkedInAt)}. Não é possível registrar novamente.</p>
                  </Alert>
                )}

                {!lookup.canCheckIn && !lookup.hasCheckedIn && lookup.reason && (
                  <Alert tone="warning" title="Entrada não permitida">
                    <p>{lookup.reason}</p>
                    <div className="mt-2 space-y-2">
                      <CheckboxField
                        label="Autorizar entrada mesmo assim (registra operador e motivo)"
                        checked={override}
                        onChange={(event) => setOverride(event.target.checked)}
                      />
                      {override && (
                        <TextField
                          label="Justificativa"
                          value={overrideReason}
                          onChange={(event) => setOverrideReason(event.target.value)}
                        />
                      )}
                    </div>
                  </Alert>
                )}

                {(lookup.canCheckIn || (override && overrideReason.trim().length >= 5)) && (
                  <Button block variant="success" onClick={() => void handleCheckIn()}>
                    Confirmar check-in
                  </Button>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Presenças do evento"
            actions={
              <div className="flex flex-wrap items-end gap-3">
                <TextField
                  label="Buscar"
                  placeholder="Nome ou código"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <CheckboxField
                  label="Somente manuais"
                  checked={onlyOverrides}
                  onChange={(event) => setOnlyOverrides(event.target.checked)}
                />
              </div>
            }
          >
            {board.error && <p className="mb-3 text-[13px] text-app-danger">{board.error}</p>}
            {board.isLoading && <LoadingBlock />}
            {!board.isLoading && (board.data?.records ?? []).length === 0 && (
              <EmptyState title="Nenhum check-in registrado" description="As entradas validadas aparecem aqui em tempo real." />
            )}
            <DataTable
              rows={board.data?.records ?? []}
              rowKey={(record) => record.id}
              columns={[
                { key: 'participant', header: 'Participante', primary: true, render: (record) => record.participantName },
                { key: 'code', header: 'Inscrição', render: (record) => record.registrationCode },
                { key: 'at', header: 'Horário', render: (record) => formatDateTime(record.checkedInAt) },
                { key: 'operator', header: 'Operador', render: (record) => record.operatorName ?? '—' },
                { key: 'method', header: 'Método', render: (record) => (record.method === 'MANUAL' ? 'Manual' : 'QR Code') },
                {
                  key: 'override',
                  header: 'Exceção',
                  render: (record) => (record.isOverride ? (record.overrideReason ?? 'Sim') : '—'),
                },
              ]}
            />
          </SectionCard>
        </>
      )}

      {!eventId && (
        <Alert tone="info" title="Selecione um evento">
          <p>Escolha o evento para carregar as presenças e começar a validar credenciais.</p>
        </Alert>
      )}
    </div>
  );
}
