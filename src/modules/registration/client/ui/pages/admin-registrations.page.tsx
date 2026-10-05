import { useState } from 'react';
import { ROUTES } from '@shared/constants/route.constants';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDateTime, formatMoney } from '@client/shared/format';
import { RegistrationStatusBadge } from '@client/ui/components/badge.component';
import { Button } from '@client/ui/components/button.component';
import { SectionCard } from '@client/ui/components/card.component';
import { DataTable } from '@client/ui/components/data-table.component';
import { CheckboxField, SelectField, TextField } from '@client/ui/components/form-fields.component';
import { Modal } from '@client/ui/components/modal.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { Pagination } from '@client/ui/components/pagination.component';
import { useSession } from '@client/state/session.state';
import { useToast } from '@client/state/toast.state';
import type { RegistrationView } from '../../services/registration-api.service';

/** Gestão de inscrições: cancelamento, promoção da lista de espera e check-in (§9, §26, §29). */
export function AdminRegistrationsPage() {
  const { can } = useSession();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [includingCancelled, setIncludingCancelled] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RegistrationView | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, error, reload } = useAsync(
    () => api.registrations.listAdmin({ status: status || undefined, search: search || undefined, includingCancelled, page }),
    [status, search, includingCancelled, page],
  );

  const handleCancel = async () => {
    if (!selected) return;
    try {
      await api.registrations.cancelAdmin({ registrationId: selected.id, reason: reason.trim() || 'Cancelamento administrativo' });
      toast.show({ tone: 'success', title: 'Inscrição cancelada', description: 'A vaga foi liberada.' });
      setSelected(null);
      setReason('');
      await reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Falha ao cancelar', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  const handlePromote = async (registration: RegistrationView) => {
    try {
      await api.registrations.promote({ registrationId: registration.id });
      toast.show({ tone: 'success', title: 'Inscrição promovida', description: registration.code });
      await reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Falha ao promover', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  const handleCheckIn = async (registration: RegistrationView) => {
    try {
      await api.registrations.checkInByRegistration({ registrationId: registration.id });
      toast.show({ tone: 'success', title: 'Check-in registrado', description: registration.code });
      await reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Check-in não permitido', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  const handleExpire = async () => {
    try {
      const result = await api.registrations.expireReservations();
      toast.show({ tone: 'info', title: 'Reservas expiradas', description: `${result.expired ?? 0} inscrição(ões) liberada(s).` });
      await reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Falha ao expirar reservas', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  return (
    <div>
      <PageHeader
        title="Inscrições"
        description="Acompanhe cada inscrição e execute ações operacionais."
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => void handleExpire()}>
              Expirar reservas
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void reload()}>
              Atualizar
            </Button>
          </>
        }
      />

      <SectionCard className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField
            label="Buscar"
            placeholder="Nome, e-mail ou código"
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
              { value: 'PENDENTE', label: 'Pendente' },
              { value: 'AGUARDANDO_PAGAMENTO', label: 'Aguardando pagamento' },
              { value: 'CONFIRMADA', label: 'Confirmada' },
              { value: 'LISTA_ESPERA', label: 'Lista de espera' },
              { value: 'CANCELADA', label: 'Cancelada' },
            ]}
          />
          <div className="flex items-end">
            <CheckboxField
              label="Incluir canceladas"
              checked={includingCancelled}
              onChange={(event) => setIncludingCancelled(event.target.checked)}
            />
          </div>
        </div>
      </SectionCard>

      {error && <p className="mb-3 text-[13px] text-app-danger">{error}</p>}

      <DataTable
        rows={data?.registrations ?? []}
        isLoading={isLoading}
        rowKey={(registration) => registration.id}
        emptyTitle="Nenhuma inscrição encontrada"
        columns={[
          {
            key: 'participant',
            header: 'Participante',
            primary: true,
            render: (registration) => (
              <div>
                <p>{registration.participantName ?? '—'}</p>
                <p className="text-[12px] text-app-muted">{registration.participantEmail ?? ''}</p>
              </div>
            ),
          },
          {
            key: 'event',
            header: 'Evento',
            render: (registration) => registration.eventTitle ?? '—',
          },
          { key: 'code', header: 'Código', render: (registration) => registration.code },
          { key: 'status', header: 'Status', render: (registration) => <RegistrationStatusBadge status={registration.status} /> },
          {
            key: 'amount',
            header: 'Valor',
            align: 'right',
            render: (registration) => (registration.isCourtesy ? 'Cortesia' : formatMoney(registration.finalAmountCents)),
          },
          {
            key: 'checkIn',
            header: 'Check-in',
            render: (registration) => (registration.hasCheckedIn ? formatDateTime(registration.checkInAt) : '—'),
          },
          {
            key: 'actions',
            header: 'Ações',
            render: (registration) => (
              <div className="flex flex-wrap gap-2">
                {registration.status === 'LISTA_ESPERA' && can('REGISTRATION_MANAGE') && (
                  <Button size="sm" variant="secondary" onClick={() => void handlePromote(registration)}>
                    Promover
                  </Button>
                )}
                {can('CHECKIN_PERFORM') && registration.status === 'CONFIRMADA' && !registration.hasCheckedIn && (
                  <Button size="sm" variant="success" onClick={() => void handleCheckIn(registration)}>
                    Check-in
                  </Button>
                )}
                {can('REGISTRATION_MANAGE') && registration.status !== 'CANCELADA' && (
                  <Button size="sm" variant="danger" onClick={() => setSelected(registration)}>
                    Cancelar
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />

      <div className="mt-3">
        <Pagination page={page} perPage={20} total={data?.total ?? 0} onChange={setPage} />
      </div>

      <Modal
        open={selected !== null}
        title="Cancelar inscrição"
        description={selected ? `${selected.code} · ${selected.participantName ?? ''}` : undefined}
        onClose={() => setSelected(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Voltar
            </Button>
            <Button variant="danger" onClick={() => void handleCancel()}>
              Confirmar cancelamento
            </Button>
          </>
        }
      >
        <TextField
          label="Motivo"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ex.: solicitação do participante"
        />
        <p className="mt-3 text-[12px] text-app-muted">
          O cancelamento libera a vaga, promove a lista de espera quando configurado e fica registrado na auditoria. Use{' '}
          <span className="text-app-foreground">{ROUTES.adminPayments}</span> para tratar valores já pagos.
        </p>
      </Modal>
    </div>
  );
}
