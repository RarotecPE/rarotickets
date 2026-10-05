import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@shared/constants/route.constants';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDate, formatDateTime, formatMoney } from '@client/shared/format';
import { EventStatusBadge } from '@client/ui/components/badge.component';
import { Button } from '@client/ui/components/button.component';
import { Card, SectionCard, StatCard } from '@client/ui/components/card.component';
import { Alert, ErrorBlock, LoadingBlock } from '@client/ui/components/feedback.component';
import { SelectField, TextField, TextareaField } from '@client/ui/components/form-fields.component';
import { Modal } from '@client/ui/components/modal.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { useToast } from '@client/state/toast.state';

const STATUS_FLOW = [
  { value: 'INSCRICOES_ABERTAS', label: 'Abrir inscrições' },
  { value: 'INSCRICOES_ENCERRADAS', label: 'Encerrar inscrições' },
  { value: 'EM_ANDAMENTO', label: 'Iniciar evento' },
  { value: 'FINALIZADO', label: 'Finalizar evento' },
  { value: 'CANCELADO', label: 'Cancelar evento' },
];

type LoteForm = { name: string; startDate: string; endDate: string; maxQuantity: number; priceCents: number };

/** Edição do evento, lotes, formulário e programação (§2–§5, §32, §33). */
export function AdminEventDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const eventId = params.eventId;
  const isNew = !eventId || eventId === 'novo';

  const detail = useAsync(
    async () => (isNew ? null : api.events.getAdmin(String(eventId))),
    [eventId],
  );

  const [form, setForm] = useState({
    title: '',
    summary: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '18:00',
    isOnline: false,
    venueName: '',
    address: '',
    city: '',
    state: '',
    capacity: 50,
    registrationStart: '',
    registrationEnd: '',
    responsibleName: '',
    workloadHours: 8,
    type: 'GRATUITO',
  });
  const [loteModal, setLoteModal] = useState(false);
  const [lote, setLote] = useState<LoteForm>({ name: '', startDate: '', endDate: '', maxQuantity: 20, priceCents: 0 });
  const [statusReason, setStatusReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);

  if (detail.isLoading) return <LoadingBlock label="Carregando evento…" />;
  if (detail.error) return <ErrorBlock message={detail.error} onRetry={() => void detail.reload()} />;

  const event = detail.data?.event ?? null;
  const seatUsage = detail.data?.seatUsage ?? null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const created = await api.events.create({
          ...form,
          imageUrl: null,
          onlineUrl: null,
          responsibleEmail: null,
          certificateEnabled: true,
          waitlistEnabled: true,
          waitlistAutoPromote: false,
        });
        toast.show({ tone: 'success', title: 'Evento criado', description: 'Ele nasce como rascunho.' });
        void navigate(ROUTES.adminEventDetail(created.event.id));
      } else {
        await api.events.update(String(eventId), {
          title: form.title || event?.title,
          summary: form.summary || event?.summary,
          description: form.description || event?.description,
          startDate: form.startDate || event?.startDate,
          endDate: form.endDate || event?.endDate,
          startTime: form.startTime,
          endTime: form.endTime,
          capacity: form.capacity,
          responsibleName: form.responsibleName || event?.responsibleName,
          workloadHours: form.workloadHours,
          city: form.city || event?.city,
          state: form.state || event?.state,
          venueName: form.venueName || event?.venueName,
        });
        toast.show({ tone: 'success', title: 'Evento atualizado' });
        await detail.reload();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o evento');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (nextStatus: string) => {
    if (!event) return;
    try {
      await api.events.changeStatus({ eventId: event.id, nextStatus, reason: statusReason || null });
      toast.show({ tone: 'success', title: `Status alterado para ${nextStatus}` });
      setStatusReason('');
      await detail.reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Transição não permitida', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  const handleCreateLote = async () => {
    if (!event) return;
    try {
      await api.events.saveLote({
        eventId: event.id,
        body: {
          action: 'CREATE',
          name: lote.name,
          startDate: lote.startDate,
          endDate: lote.endDate,
          maxQuantity: lote.maxQuantity,
          priceCents: lote.priceCents,
          isActive: true,
        },
      });
      toast.show({ tone: 'success', title: 'Lote criado' });
      setLoteModal(false);
      setLote({ name: '', startDate: '', endDate: '', maxQuantity: 20, priceCents: 0 });
      await detail.reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Falha ao criar lote', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  const fillFromEvent = () => {
    if (!event) return;
    setForm({
      title: event.title,
      summary: event.summary,
      description: event.description ?? '',
      startDate: String(event.startDate).slice(0, 10),
      endDate: String(event.endDate).slice(0, 10),
      startTime: event.startTime,
      endTime: event.endTime,
      isOnline: event.isOnline,
      venueName: event.venueName ?? '',
      address: event.address ?? '',
      city: event.city ?? '',
      state: event.state ?? '',
      capacity: event.capacity,
      registrationStart: String(event.registrationStart).slice(0, 10),
      registrationEnd: String(event.registrationEnd).slice(0, 10),
      responsibleName: event.responsibleName,
      workloadHours: event.workloadHours,
      type: event.type,
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb="Eventos"
        title={isNew ? 'Novo evento' : (event?.title ?? 'Evento')}
        description={isNew ? 'O evento é criado como rascunho e só aparece ao público quando publicado.' : event?.summary}
        actions={
          <>
            {!isNew && <EventStatusBadge status={event?.status ?? 'RASCUNHO'} />}
            {!isNew && (
              <Button size="sm" variant="secondary" onClick={fillFromEvent}>
                Carregar dados
              </Button>
            )}
            <Button size="sm" isLoading={isSaving} onClick={() => void handleSave()}>
              {isNew ? 'Criar evento' : 'Salvar alterações'}
            </Button>
          </>
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {event && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Inscrições" value={String(event.registrationCount)} hint="confirmadas + pendentes" />
          <StatCard
            label="Ocupação"
            value={`${(seatUsage?.occupiedSeats ?? 0) + (seatUsage?.reservedSeats ?? 0)}/${event.capacity}`}
            hint={`${seatUsage?.availableSeats ?? 0} vagas livres`}
          />
          <StatCard label="Lista de espera" value={String(seatUsage?.waitlistCount ?? 0)} />
          <StatCard
            label="Inscrições até"
            value={formatDate(event.registrationEnd)}
            hint={`Início ${formatDate(event.registrationStart)}`}
          />
        </div>
      )}

      <SectionCard title="Dados principais">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Título" value={form.title} placeholder={event?.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <TextField label="Responsável" value={form.responsibleName} placeholder={event?.responsibleName} onChange={(e) => setForm({ ...form, responsibleName: e.target.value })} />
          <div className="sm:col-span-2">
            <TextField label="Resumo" value={form.summary} placeholder={event?.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <TextareaField
              label="Descrição"
              value={form.description}
              placeholder={event?.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <TextField label="Início (data)" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <TextField label="Fim (data)" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          <TextField label="Hora de início" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <TextField label="Hora de término" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          <TextField label="Capacidade" type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          <TextField label="Carga horária (h)" type="number" min={1} value={form.workloadHours} onChange={(e) => setForm({ ...form, workloadHours: Number(e.target.value) })} />
          <TextField label="Local" value={form.venueName} placeholder={event?.venueName ?? 'Auditório, sala…'} onChange={(e) => setForm({ ...form, venueName: e.target.value })} />
          <TextField label="Endereço" value={form.address} placeholder={event?.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <TextField label="Cidade" value={form.city} placeholder={event?.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <TextField label="UF" maxLength={2} value={form.state} placeholder={event?.state ?? ''} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
          <TextField label="Inscrições abrem em" type="date" value={form.registrationStart} onChange={(e) => setForm({ ...form, registrationStart: e.target.value })} />
          <TextField label="Inscrições encerram em" type="date" value={form.registrationEnd} onChange={(e) => setForm({ ...form, registrationEnd: e.target.value })} />
          <SelectField
            label="Tipo"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={[
              { value: 'GRATUITO', label: 'Gratuito' },
              { value: 'PAGO', label: 'Pago' },
            ]}
          />
        </div>
      </SectionCard>

      {event && (
        <>
          <SectionCard
            title="Lotes"
            description="O lote vigente define o preço no momento da inscrição."
            actions={
              <Button size="sm" variant="secondary" onClick={() => setLoteModal(true)}>
                Novo lote
              </Button>
            }
          >
            {(detail.data?.lotes ?? []).length === 0 ? (
              <p className="text-[13px] text-app-muted">Nenhum lote cadastrado. Eventos pagos precisam de ao menos um lote ativo.</p>
            ) : (
              <ul className="space-y-2">
                {detail.data?.lotes.map((loteItem) => (
                  <li key={loteItem.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-app-border px-3 py-2 text-[13px]">
                    <div>
                      <p className="font-medium">{loteItem.name}</p>
                      <p className="text-[12px] text-app-muted">
                        {formatDate(loteItem.startDate)} a {formatDate(loteItem.endDate)} · {loteItem.soldQuantity}/{loteItem.maxQuantity} vendidos
                      </p>
                    </div>
                    <p className="font-semibold">{formatMoney(loteItem.priceCents)}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Formulário de inscrição" description={`${detail.data?.formFields.length ?? 0} campo(s) configurado(s) · versão ${event.formVersion}`}>
            <ul className="space-y-2">
              {(detail.data?.formFields ?? []).map((field) => (
                <li key={field.id} className="rounded-[8px] border border-app-border px-3 py-2 text-[13px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {field.label} {field.isRequired && <span className="text-app-danger">*</span>}
                    </p>
                    <span className="text-[12px] text-app-muted">
                      {field.fieldTypeLabel} · {field.fieldKey}
                    </span>
                  </div>
                  {field.options.length > 0 && (
                    <p className="mt-1 text-[12px] text-app-muted">{field.options.join(' · ')}</p>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-app-muted">
              Respostas antigas são preservadas: alterar o formulário cria uma nova versão sem apagar o histórico.
            </p>
          </SectionCard>

          <SectionCard title="Programação e palestrantes">
            {(detail.data?.activities ?? []).length === 0 ? (
              <p className="text-[13px] text-app-muted">Nenhuma atividade cadastrada.</p>
            ) : (
              <ul className="space-y-2">
                {detail.data?.activities.map((activity) => (
                  <li key={activity.id} className="rounded-[8px] border border-app-border px-3 py-2 text-[13px]">
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-[12px] text-app-muted">
                      {formatDateTime(activity.startAt)} · {activity.speakerName ?? 'sem palestrante'} · {activity.room ?? 'local a definir'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {(detail.data?.speakers ?? []).length > 0 && (
              <p className="mt-3 text-[12px] text-app-muted">
                Palestrantes: {detail.data?.speakers.map((speaker) => speaker.name).join(', ')}
              </p>
            )}
          </SectionCard>

          <SectionCard title="Status do evento" description="A mudança é auditada com quem, quando e motivo.">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <TextField
                  label="Motivo (opcional)"
                  value={statusReason}
                  onChange={(event_) => setStatusReason(event_.target.value)}
                  placeholder="Ex.: adiado por falta de vagas no local"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_FLOW.map((option) => (
                  <Button key={option.value} size="sm" variant="secondary" onClick={() => void handleStatus(option.value)}>
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </SectionCard>
        </>
      )}

      <Modal
        open={loteModal}
        title="Novo lote"
        description="Período e valor do lote. As inscrições usam automaticamente o lote vigente."
        onClose={() => setLoteModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLoteModal(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreateLote()}>Criar lote</Button>
          </>
        }
      >
        <div className="space-y-3">
          <TextField label="Nome" value={lote.name} onChange={(e) => setLote({ ...lote, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Início" type="date" value={lote.startDate} onChange={(e) => setLote({ ...lote, startDate: e.target.value })} />
            <TextField label="Fim" type="date" value={lote.endDate} onChange={(e) => setLote({ ...lote, endDate: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Vagas" type="number" min={1} value={lote.maxQuantity} onChange={(e) => setLote({ ...lote, maxQuantity: Number(e.target.value) })} />
            <TextField
              label="Valor (centavos)"
              type="number"
              min={0}
              value={lote.priceCents}
              onChange={(e) => setLote({ ...lote, priceCents: Number(e.target.value) })}
              hint={formatMoney(lote.priceCents)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
