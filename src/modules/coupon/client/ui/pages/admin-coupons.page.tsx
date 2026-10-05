import { useState } from 'react';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDate, formatMoney } from '@client/shared/format';
import { Badge } from '@client/ui/components/badge.component';
import { Button } from '@client/ui/components/button.component';
import { SectionCard } from '@client/ui/components/card.component';
import { DataTable } from '@client/ui/components/data-table.component';
import { CheckboxField, SelectField, TextField } from '@client/ui/components/form-fields.component';
import { Modal } from '@client/ui/components/modal.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { Pagination } from '@client/ui/components/pagination.component';
import { useSession } from '@client/state/session.state';
import { useToast } from '@client/state/toast.state';

type CouponForm = {
  eventId: string;
  code: string;
  type: string;
  value: number;
  maxUses: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

/** Cupons de desconto e cortesia por evento (§25). */
export function AdminCouponsPage() {
  const { can } = useSession();
  const toast = useToast();
  const [eventId, setEventId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreating, setCreating] = useState(false);
  const [form, setForm] = useState<CouponForm>({
    eventId: '',
    code: '',
    type: 'PERCENTUAL',
    value: 10,
    maxUses: 50,
    startDate: '',
    endDate: '',
    isActive: true,
  });

  const events = useAsync(() => api.events.listAdmin({ perPage: 100 }), []);
  const { data, isLoading, error, reload } = useAsync(
    () => api.coupons.list({ eventId: eventId || undefined, search: search || undefined, page }),
    [eventId, search, page],
  );

  const handleCreate = async () => {
    try {
      await api.coupons.create({ ...form, eventId: form.eventId || events.data?.events[0]?.id });
      toast.show({ tone: 'success', title: 'Cupom criado', description: form.code.toUpperCase() });
      setCreating(false);
      setForm({ ...form, code: '' });
      await reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Falha ao criar cupom', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  const handleDeactivate = async (couponId: string) => {
    try {
      await api.coupons.deactivate(couponId);
      toast.show({ tone: 'success', title: 'Cupom desativado' });
      await reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Falha ao desativar', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  return (
    <div>
      <PageHeader
        title="Cupons"
        description="Descontos percentuais, valores fixos e cortesias com controle de uso."
        actions={
          can('COUPON_MANAGE') ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              Novo cupom
            </Button>
          ) : undefined
        }
      />

      <SectionCard className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Evento"
            placeholder="Todos"
            value={eventId}
            onChange={(event) => {
              setEventId(event.target.value);
              setPage(1);
            }}
            options={(events.data?.events ?? []).map((event) => ({ value: event.id, label: event.title }))}
          />
          <TextField
            label="Buscar"
            placeholder="Código do cupom"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value.toUpperCase());
              setPage(1);
            }}
          />
        </div>
      </SectionCard>

      {error && <p className="mb-3 text-[13px] text-app-danger">{error}</p>}

      <DataTable
        rows={data?.coupons ?? []}
        isLoading={isLoading}
        rowKey={(coupon) => coupon.id}
        emptyTitle="Nenhum cupom encontrado"
        columns={[
          { key: 'code', header: 'Código', primary: true, render: (coupon) => coupon.code },
          { key: 'type', header: 'Tipo', render: (coupon) => <Badge tone="primary">{coupon.typeLabel}</Badge> },
          { key: 'value', header: 'Benefício', render: (coupon) => coupon.valueLabel },
          {
            key: 'usage',
            header: 'Uso',
            align: 'right',
            render: (coupon) => `${coupon.usedCount}/${coupon.maxUses}`,
          },
          {
            key: 'period',
            header: 'Validade',
            render: (coupon) => `${formatDate(coupon.startDate)} a ${formatDate(coupon.endDate)}`,
          },
          {
            key: 'status',
            header: 'Situação',
            render: (coupon) =>
              coupon.isActive ? <Badge tone="success">Ativo</Badge> : <Badge tone="danger">Inativo</Badge>,
          },
          {
            key: 'actions',
            header: 'Ações',
            render: (coupon) =>
              can('COUPON_MANAGE') && coupon.isActive ? (
                <Button size="sm" variant="danger" onClick={() => void handleDeactivate(coupon.id)}>
                  Desativar
                </Button>
              ) : (
                '—'
              ),
          },
        ]}
      />

      <div className="mt-3">
        <Pagination page={page} perPage={30} total={data?.total ?? 0} onChange={setPage} />
      </div>

      <Modal
        open={isCreating}
        title="Novo cupom"
        description="Descontos nunca deixam o valor final negativo: o domínio aplica o limite."
        onClose={() => setCreating(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreate()}>Criar cupom</Button>
          </>
        }
      >
        <div className="space-y-3">
          <SelectField
            label="Evento"
            value={form.eventId}
            onChange={(event) => setForm({ ...form, eventId: event.target.value })}
            options={(events.data?.events ?? []).map((event) => ({ value: event.id, label: event.title }))}
          />
          <TextField
            label="Código"
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
          />
          <SelectField
            label="Tipo"
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
            options={[
              { value: 'PERCENTUAL', label: 'Percentual' },
              { value: 'VALOR_FIXO', label: 'Valor fixo' },
              { value: 'CORTESIA', label: 'Cortesia (100%)' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={form.type === 'PERCENTUAL' ? 'Percentual' : 'Valor (centavos)'}
              type="number"
              min={0}
              value={form.value}
              onChange={(event) => setForm({ ...form, value: Number(event.target.value) })}
              hint={form.type === 'VALOR_FIXO' ? formatMoney(form.value) : `${form.value}%`}
            />
            <TextField
              label="Limite de usos"
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(event) => setForm({ ...form, maxUses: Number(event.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Início"
              type="date"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
            />
            <TextField
              label="Fim"
              type="date"
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
            />
          </div>
          <CheckboxField
            label="Cupom ativo"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
          />
        </div>
      </Modal>
    </div>
  );
}
