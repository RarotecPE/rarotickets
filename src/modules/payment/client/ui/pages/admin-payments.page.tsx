import { useState } from 'react';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDateTime, formatMoney } from '@client/shared/format';
import { PaymentMethodBadge, PaymentStatusBadge } from '@client/ui/components/badge.component';
import { Button } from '@client/ui/components/button.component';
import { SectionCard, StatCard } from '@client/ui/components/card.component';
import { DataTable } from '@client/ui/components/data-table.component';
import { Modal } from '@client/ui/components/modal.component';
import { SelectField, TextField } from '@client/ui/components/form-fields.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { Pagination } from '@client/ui/components/pagination.component';
import { useSession } from '@client/state/session.state';
import { useToast } from '@client/state/toast.state';
import type { PaymentView } from '../../services/payment-api.service';

/** Financeiro: cobranças, estorno, cancelamento e reconciliação (§13–§22). */
export function AdminPaymentsPage() {
  const { can } = useSession();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PaymentView | null>(null);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'refund' | 'cancel' | null>(null);

  const { data, isLoading, error, reload } = useAsync(
    () => api.payments.listAdmin({ status: status || undefined, method: method || undefined, search: search || undefined, page }),
    [status, method, search, page],
  );

  const handleReconcile = async () => {
    try {
      const result = await api.payments.reconcile({});
      toast.show({
        tone: 'info',
        title: 'Reconciliação executada',
        description: `${result.checked} verificado(s) · ${result.applied} atualizado(s) · ${result.requiresReview} para revisão.`,
      });
      await reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Falha na reconciliação', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  const handleConfirm = async () => {
    if (!selected || !action) return;
    try {
      if (action === 'refund') {
        await api.payments.refund({
          paymentId: selected.id,
          reason: reason.trim(),
          amountCents: amount.trim() ? Number(amount) : null,
        });
        toast.show({ tone: 'success', title: 'Estorno registrado', description: selected.reference });
      } else {
        await api.payments.cancel({ paymentId: selected.id, reason: reason.trim() || 'Cancelamento administrativo' });
        toast.show({ tone: 'success', title: 'Cobrança cancelada', description: selected.reference });
      }
      setSelected(null);
      setAction(null);
      setReason('');
      setAmount('');
      await reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Operação não permitida', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  const handleSimulate = async (payment: PaymentView) => {
    try {
      await api.payments.simulate(payment.id);
      toast.show({ tone: 'success', title: 'Pagamento simulado', description: 'Equivalente ao webhook do PagBank.' });
      await reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Falha na simulação', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  const totals = data?.totals;

  return (
    <div>
      <PageHeader
        title="Pagamentos"
        description="Cobranças do PagBank, conciliação e estornos."
        actions={
          <>
            {can('PAYMENT_MANAGE') && (
              <Button size="sm" variant="secondary" onClick={() => void handleReconcile()}>
                Reconciliar agora
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => void reload()}>
              Atualizar
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Recebido" value={totals?.paidFormatted ?? '—'} tone="success" />
        <StatCard label="Em aberto" value={totals?.pendingFormatted ?? '—'} tone="warning" />
        <StatCard label="Estornado" value={totals?.refundedFormatted ?? '—'} />
      </div>

      <SectionCard className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField
            label="Buscar"
            placeholder="Referência, inscrição…"
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
              { value: 'AGUARDANDO', label: 'Aguardando' },
              { value: 'PAGO', label: 'Pago' },
              { value: 'RECUSADO', label: 'Recusado' },
              { value: 'CANCELADO', label: 'Cancelado' },
              { value: 'EXPIRADO', label: 'Expirado' },
              { value: 'ESTORNADO', label: 'Estornado' },
            ]}
          />
          <SelectField
            label="Forma"
            placeholder="Todas"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            options={[
              { value: 'PIX', label: 'PIX' },
              { value: 'BOLETO', label: 'Boleto' },
              { value: 'CARTAO_CREDITO', label: 'Cartão de crédito' },
            ]}
          />
        </div>
      </SectionCard>

      {error && <p className="mb-3 text-[13px] text-app-danger">{error}</p>}

      <DataTable
        rows={data?.payments ?? []}
        isLoading={isLoading}
        rowKey={(payment) => payment.id}
        emptyTitle="Nenhuma cobrança encontrada"
        columns={[
          {
            key: 'reference',
            header: 'Referência',
            primary: true,
            render: (payment) => (
              <div>
                <p>{payment.reference}</p>
                <p className="text-[12px] text-app-muted">{payment.providerName ?? '—'}</p>
              </div>
            ),
          },
          { key: 'method', header: 'Forma', render: (payment) => <PaymentMethodBadge method={payment.method} /> },
          { key: 'status', header: 'Status', render: (payment) => <PaymentStatusBadge status={payment.status} /> },
          { key: 'amount', header: 'Valor', align: 'right', render: (payment) => payment.amountFormatted },
          { key: 'created', header: 'Criado em', render: (payment) => formatDateTime(payment.createdAt) },
          {
            key: 'paid',
            header: 'Pago em',
            render: (payment) => (payment.paidAt ? formatDateTime(payment.paidAt) : '—'),
          },
          {
            key: 'actions',
            header: 'Ações',
            render: (payment) => (
              <div className="flex flex-wrap gap-2">
                {payment.status === 'AGUARDANDO' && (
                  <Button size="sm" variant="secondary" onClick={() => void handleSimulate(payment)}>
                    Simular
                  </Button>
                )}
                {can('PAYMENT_REFUND') && payment.status === 'PAGO' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelected(payment);
                      setAction('refund');
                    }}
                  >
                    Estornar
                  </Button>
                )}
                {can('PAYMENT_MANAGE') && ['PENDENTE', 'AGUARDANDO'].includes(payment.status) && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setSelected(payment);
                      setAction('cancel');
                    }}
                  >
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
        open={selected !== null && action !== null}
        title={action === 'refund' ? 'Estornar pagamento' : 'Cancelar cobrança'}
        description={selected?.reference}
        onClose={() => {
          setSelected(null);
          setAction(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setSelected(null);
                setAction(null);
              }}
            >
              Voltar
            </Button>
            <Button variant={action === 'refund' ? 'primary' : 'danger'} onClick={() => void handleConfirm()}>
              Confirmar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <TextField
            label="Motivo"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            hint="O histórico registra quem, quando, valor e motivo."
          />
          {action === 'refund' && (
            <TextField
              label="Valor do estorno (centavos)"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={String(selected?.refundedAmountCents ?? selected?.amountCents ?? '')}
              hint="Deixe vazio para estornar o valor total restante."
            />
          )}
          {action === 'refund' && selected && (
            <p className="text-[12px] text-app-muted">
              Valor original {formatMoney(selected.amountCents)}
              {selected.refundedAmountCents ? ` · já estornado ${formatMoney(selected.refundedAmountCents)}` : ''}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
