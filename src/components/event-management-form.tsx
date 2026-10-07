"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileImage,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import type { CreateEventRequest } from "@/client/services/ticketing-api.service";
import { useAuth } from "@/components/auth-provider";
import {
  Button,
  Field,
  InlineAlert,
  Panel,
  PanelHeader,
  inputCls,
  selectCls,
  textareaCls,
} from "@/components/ui";
import { BannerImageDomainService } from "@/modules/ticketing/domain/events/services/banner-image.domain-service";
import { EventConfigurationDomainService } from "@/modules/ticketing/domain/events/services/event-configuration.domain-service";
import { Email } from "@/modules/ticketing/domain/participants/value-objects/email.vo";
import { EventSlug } from "@/modules/ticketing/domain/events/value-objects/event-slug.vo";
import { EventTitle } from "@/modules/ticketing/domain/events/value-objects/event-title.vo";
import type { FormFieldType } from "@/modules/ticketing/domain/registrations/services/registration-form.domain-service";

type EventDraft = {
  title: string;
  description: string;
  summary: string;
  slug: string;
  bannerUrl: string;
  modality: "presencial" | "online";
  chargeType: "gratuito" | "pago";
  startAt: string;
  endAt: string;
  registrationStartAt: string;
  registrationEndAt: string;
  maxCapacity: string;
  allowsWaitlist: boolean;
  onlineUrl: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressMunicipality: string;
  addressState: string;
  responsibleName: string;
  responsibleEmail: string;
  certificateEnabled: boolean;
  workloadHours: string;
  certificateDescription: string;
  lots: LotDraft[];
  fields: FieldDraft[];
  activities: ActivityDraft[];
};
type LotDraft = {
  rowId: string;
  name: string;
  price: string;
  quantity: string;
  startAt: string;
  endAt: string;
};
type FieldDraft = {
  rowId: string;
  label: string;
  description: string;
  type: FormFieldType;
  required: boolean;
  optionsText: string;
};
type ActivityDraft = {
  rowId: string;
  title: string;
  description: string;
  speakerName: string;
  speakerBio: string;
  room: string;
  startAt: string;
  endAt: string;
};
type DraftFieldChangeParams = {
  field: keyof EventDraft;
  value: EventDraft[keyof EventDraft];
};
type LotFieldChangeParams = {
  rowId: string;
  field: keyof LotDraft;
  value: string;
};
type CustomFieldChangeParams = {
  rowId: string;
  field: keyof FieldDraft;
  value: string | boolean | FormFieldType;
};
type ActivityFieldChangeParams = {
  rowId: string;
  field: keyof ActivityDraft;
  value: string;
};
type DateFieldParams = {
  value: string;
  label: string;
  key: "startAt" | "endAt" | "registrationStartAt" | "registrationEndAt";
};
type ValidateEventDraftParams = { draft: EventDraft };
type EventDraftValidation = {
  request: CreateEventRequest | null;
  errors: Record<string, string>;
};
type UploadBannerParams = { file: File };

const configurationValidator = new EventConfigurationDomainService();
const bannerValidator = new BannerImageDomainService();
const fieldTypes: Array<{ value: FormFieldType; label: string }> = [
  { value: "texto", label: "Texto curto" },
  { value: "texto_longo", label: "Texto longo" },
  { value: "numero", label: "Número" },
  { value: "data", label: "Data" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "select", label: "Seleção única" },
  { value: "checkbox", label: "Múltipla escolha" },
  { value: "boolean", label: "Sim ou não" },
  { value: "arquivo", label: "Anexo (PDF, PNG, JPG)" },
];
const inputClass = inputCls;
const textAreaClass = textareaCls;

function createEmptyDraft(): EventDraft {
  return {
    title: "",
    description: "",
    summary: "",
    slug: "",
    bannerUrl: "",
    modality: "presencial",
    chargeType: "gratuito",
    startAt: "",
    endAt: "",
    registrationStartAt: "",
    registrationEndAt: "",
    maxCapacity: "100",
    allowsWaitlist: false,
    onlineUrl: "",
    addressStreet: "",
    addressNumber: "",
    addressComplement: "",
    addressNeighborhood: "",
    addressMunicipality: "",
    addressState: "",
    responsibleName: "",
    responsibleEmail: "",
    certificateEnabled: false,
    workloadHours: "",
    certificateDescription: "",
    lots: [],
    fields: [],
    activities: [],
  };
}

export function EventManagementForm() {
  const auth = useAuth();
  const [draft, setDraft] = useState<EventDraft>(createEmptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bannerState, setBannerState] = useState<
    "idle" | "uploading" | "uploaded"
  >("idle");
  const [bannerError, setBannerError] = useState<string | null>(null);
  const canWrite = Boolean(auth.session?.permissions.includes("events:write"));

  function updateDraft(params: DraftFieldChangeParams): void {
    setDraft((current) => ({ ...current, [params.field]: params.value }));
    setErrors((current) => ({ ...current, [String(params.field)]: "" }));
  }

  function updateLot(params: LotFieldChangeParams): void {
    setDraft((current) => ({
      ...current,
      lots: current.lots.map((lot) =>
        lot.rowId === params.rowId
          ? { ...lot, [params.field]: params.value }
          : lot,
      ),
    }));
  }

  function updateCustomField(params: CustomFieldChangeParams): void {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.rowId === params.rowId
          ? { ...field, [params.field]: params.value }
          : field,
      ),
    }));
  }

  function updateActivity(params: ActivityFieldChangeParams): void {
    setDraft((current) => ({
      ...current,
      activities: current.activities.map((activity) =>
        activity.rowId === params.rowId
          ? { ...activity, [params.field]: params.value }
          : activity,
      ),
    }));
  }

  function addLot(): void {
    setDraft((current) => ({
      ...current,
      lots: [
        ...current.lots,
        {
          rowId: createRowId(),
          name: `Lote ${current.lots.length + 1}`,
          price: "",
          quantity: "50",
          startAt: current.registrationStartAt,
          endAt: current.registrationEndAt,
        },
      ],
    }));
  }

  function addCustomField(): void {
    setDraft((current) => ({
      ...current,
      fields: [
        ...current.fields,
        {
          rowId: createRowId(),
          label: "",
          description: "",
          type: "texto",
          required: false,
          optionsText: "",
        },
      ],
    }));
  }

  function addActivity(): void {
    setDraft((current) => ({
      ...current,
      activities: [
        ...current.activities,
        {
          rowId: createRowId(),
          title: "",
          description: "",
          speakerName: "",
          speakerBio: "",
          room: "",
          startAt: current.startAt,
          endAt: current.endAt,
        },
      ],
    }));
  }

  function removeRow(params: {
    kind: "lot" | "field" | "activity";
    rowId: string;
  }): void {
    setDraft((current) => ({
      ...current,
      lots:
        params.kind === "lot"
          ? current.lots.filter((row) => row.rowId !== params.rowId)
          : current.lots,
      fields:
        params.kind === "field"
          ? current.fields.filter((row) => row.rowId !== params.rowId)
          : current.fields,
      activities:
        params.kind === "activity"
          ? current.activities.filter((row) => row.rowId !== params.rowId)
          : current.activities,
    }));
  }

  async function uploadBanner(params: UploadBannerParams): Promise<void> {
    setBannerError(null);
    setBannerState("uploading");
    try {
      const content = new Uint8Array(await params.file.arrayBuffer());
      const validation = bannerValidator.execute({
        mimeType: params.file.type,
        sizeBytes: params.file.size,
        content,
      });
      if (validation.isFailure) throw validation.error;
      const bannerUrl = await ticketingApi.uploadEventBanner({
        file: params.file,
      });
      setDraft((current) => ({ ...current, bannerUrl }));
      setBannerState("uploaded");
    } catch (caught) {
      setBannerState("idle");
      setBannerError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível enviar o banner.",
      );
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const validation = validateEventDraft({ draft });
    setErrors(validation.errors);
    if (!validation.request) {
      setError("Revise os campos destacados e tente novamente.");
      return;
    }
    if (!canWrite) {
      setError("Seu perfil não tem permissão para criar eventos.");
      return;
    }
    setSaving(true);
    try {
      const created = await ticketingApi.createEvent({
        request: validation.request,
      });
      setSuccess(`Evento “${created.props.title}” criado como rascunho.`);
      window.location.assign(`/painel/eventos/${created.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar o evento.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!canWrite)
    return (
      <InlineAlert tone="danger">
        Seu perfil tem acesso somente à consulta de eventos.
      </InlineAlert>
    );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-app-primary">
            Gestão de eventos
          </p>
          <h2 className="mt-1 text-xl font-bold text-app-foreground">
            Criar evento
          </h2>
          <p className="mt-1 text-xs text-app-muted-foreground">
            Configure publicação, inscrições, lotes, formulário e programação.
          </p>
        </div>
        <Link
          href="/painel/eventos"
          className="inline-flex h-10 items-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-3 text-sm font-semibold text-app-foreground hover:bg-app-surface"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar aos eventos
        </Link>
      </div>
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      {errors.configuration ? (
        <InlineAlert tone="danger">{errors.configuration}</InlineAlert>
      ) : null}
      {success ? <InlineAlert tone="success">{success}</InlineAlert> : null}
      <form
        onSubmit={(formEvent) => void submit(formEvent)}
        className="flex flex-col gap-5"
        noValidate
      >
        <BasicEventSection
          draft={draft}
          errors={errors}
          onChange={updateDraft}
          onBanner={uploadBanner}
          bannerState={bannerState}
          bannerError={bannerError}
        />
        <EventScheduleSection
          draft={draft}
          errors={errors}
          onChange={updateDraft}
        />
        {draft.modality === "presencial" ? (
          <EventAddressSection
            draft={draft}
            errors={errors}
            onChange={updateDraft}
          />
        ) : (
          <EventOnlineSection
            draft={draft}
            errors={errors}
            onChange={updateDraft}
          />
        )}
        <TicketLotsSection
          draft={draft}
          errors={errors}
          onAdd={addLot}
          onChange={updateLot}
          onRemove={(rowId) => removeRow({ kind: "lot", rowId })}
        />
        <CustomFieldsSection
          fields={draft.fields}
          onAdd={addCustomField}
          onChange={updateCustomField}
          onRemove={(rowId) => removeRow({ kind: "field", rowId })}
        />
        <ActivitiesSection
          activities={draft.activities}
          onAdd={addActivity}
          onChange={updateActivity}
          onRemove={(rowId) => removeRow({ kind: "activity", rowId })}
        />
        <EventCertificateSection draft={draft} onChange={updateDraft} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="submit"
            disabled={saving || bannerState === "uploading"}
          >
            {saving ? (
              <>
                <LoaderCircle
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Salvando…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                Salvar rascunho
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export type EventSectionProps = {
  draft: EventDraft;
  errors: Record<string, string>;
  onChange: (params: DraftFieldChangeParams) => void;
};
function BasicEventSection({
  draft,
  errors,
  onChange,
  onBanner,
  bannerState,
  bannerError,
}: EventSectionProps & {
  onBanner: (params: UploadBannerParams) => Promise<void>;
  bannerState: "idle" | "uploading" | "uploaded";
  bannerError: string | null;
}) {
  function change(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof EventDraft,
  ): void {
    onChange({ field, value: event.target.value });
  }
  return (
    <Panel>
      <PanelHeader
        title="Informações principais"
        description="Dados públicos que serão exibidos na vitrine de eventos."
      />
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <Field
          label="Título do evento *"
          htmlFor="event-title"
          error={errors.title}
        >
          <input
            id="event-title"
            value={draft.title}
            onChange={(event) => change(event, "title")}
            maxLength={140}
            className={inputClass}
            aria-invalid={Boolean(errors.title)}
          />
        </Field>
        <Field
          label="Identificador público"
          htmlFor="event-slug"
          hint="Deixe em branco para gerar a partir do título."
          error={errors.slug}
        >
          <input
            id="event-slug"
            value={draft.slug}
            onChange={(event) => change(event, "slug")}
            maxLength={180}
            className={inputClass}
            placeholder="meu-evento"
            aria-invalid={Boolean(errors.slug)}
          />
        </Field>
        <Field
          label="Resumo curto *"
          htmlFor="event-summary"
          hint="Entre 10 e 220 caracteres."
          error={errors.summary}
          className="sm:col-span-2"
        >
          <input
            id="event-summary"
            value={draft.summary}
            onChange={(event) => change(event, "summary")}
            maxLength={220}
            className={inputClass}
            aria-invalid={Boolean(errors.summary)}
          />
        </Field>
        <Field
          label="Descrição detalhada *"
          htmlFor="event-description"
          hint="Descreva o propósito e o conteúdo do evento."
          error={errors.description}
          className="sm:col-span-2"
        >
          <textarea
            id="event-description"
            value={draft.description}
            onChange={(event) => change(event, "description")}
            rows={5}
            className={textAreaClass}
            aria-invalid={Boolean(errors.description)}
          />
        </Field>
        <Field label="Modalidade" htmlFor="event-modality">
          <select
            id="event-modality"
            value={draft.modality}
            onChange={(event) => change(event, "modality")}
            className={selectCls}
          >
            <option value="presencial">Presencial</option>
            <option value="online">Online</option>
          </select>
        </Field>
        <Field label="Tipo de cobrança" htmlFor="event-charge-type">
          <select
            id="event-charge-type"
            value={draft.chargeType}
            onChange={(event) => change(event, "chargeType")}
            className={selectCls}
          >
            <option value="gratuito">Gratuito</option>
            <option value="pago">Pago</option>
          </select>
        </Field>
        <Field
          label="Banner público"
          htmlFor="event-banner"
          hint="Imagem PNG ou JPG de até 10 MB; o arquivo é enviado ao storage privado do sistema."
          error={bannerError ?? undefined}
          className="sm:col-span-2"
        >
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="event-banner"
              type="file"
              accept="image/png,image/jpeg,.png,.jpg,.jpeg"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onBanner({ file });
              }}
              className="min-w-0 flex-1 text-xs text-app-muted-foreground file:mr-3 file:rounded-app-sm file:border-0 file:bg-app-surface-elevated file:px-3 file:py-2 file:text-xs file:font-semibold file:text-app-foreground"
            />
            <span className="inline-flex items-center gap-1.5 text-xs text-app-muted-foreground">
              {bannerState === "uploading" ? (
                <LoaderCircle
                  className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <FileImage className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {bannerState === "uploading"
                ? "Enviando…"
                : bannerState === "uploaded"
                  ? "Banner enviado"
                  : "Opcional"}
            </span>
          </div>
          {draft.bannerUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={draft.bannerUrl}
                alt="Prévia do banner do evento"
                className="mt-3 h-32 w-full rounded-app-md border border-app-border object-cover"
              />
            </>
          ) : null}
        </Field>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-app-muted-foreground">
            <input
              type="checkbox"
              checked={draft.allowsWaitlist}
              onChange={(event) =>
                onChange({
                  field: "allowsWaitlist",
                  value: event.target.checked,
                })
              }
              className="h-4 w-4 accent-app-primary"
            />
            Permitir lista de espera quando as vagas esgotarem
          </label>
        </div>
        <Field
          label="Nome do responsável *"
          htmlFor="event-responsible-name"
          error={errors.responsibleName}
        >
          <input
            id="event-responsible-name"
            value={draft.responsibleName}
            onChange={(event) => change(event, "responsibleName")}
            className={inputClass}
            aria-invalid={Boolean(errors.responsibleName)}
          />
        </Field>
        <Field
          label="E-mail do responsável *"
          htmlFor="event-responsible-email"
          error={errors.responsibleEmail}
        >
          <input
            id="event-responsible-email"
            type="email"
            value={draft.responsibleEmail}
            onChange={(event) => change(event, "responsibleEmail")}
            className={inputClass}
            aria-invalid={Boolean(errors.responsibleEmail)}
          />
        </Field>
      </div>
    </Panel>
  );
}

function EventScheduleSection({ draft, errors, onChange }: EventSectionProps) {
  function change(
    event: ChangeEvent<HTMLInputElement>,
    field: keyof EventDraft,
  ): void {
    onChange({ field, value: event.target.value });
  }
  return (
    <Panel>
      <PanelHeader
        title="Datas, inscrições e capacidade"
        description="Todos os horários são exibidos no fuso local do evento e armazenados em UTC."
      />
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <Field
          label="Início do evento *"
          htmlFor="event-start"
          error={errors.startAt}
        >
          <input
            id="event-start"
            type="datetime-local"
            value={draft.startAt}
            onChange={(event) => change(event, "startAt")}
            className={inputClass}
          />
        </Field>
        <Field
          label="Término do evento *"
          htmlFor="event-end"
          error={errors.endAt}
        >
          <input
            id="event-end"
            type="datetime-local"
            value={draft.endAt}
            onChange={(event) => change(event, "endAt")}
            className={inputClass}
          />
        </Field>
        <Field
          label="Abertura das inscrições *"
          htmlFor="registration-start"
          error={errors.registrationStartAt}
        >
          <input
            id="registration-start"
            type="datetime-local"
            value={draft.registrationStartAt}
            onChange={(event) => change(event, "registrationStartAt")}
            className={inputClass}
          />
        </Field>
        <Field
          label="Encerramento das inscrições *"
          htmlFor="registration-end"
          error={errors.registrationEndAt}
        >
          <input
            id="registration-end"
            type="datetime-local"
            value={draft.registrationEndAt}
            onChange={(event) => change(event, "registrationEndAt")}
            className={inputClass}
          />
        </Field>
        <Field
          label="Capacidade máxima *"
          htmlFor="event-capacity"
          error={errors.maxCapacity}
        >
          <input
            id="event-capacity"
            type="number"
            min="1"
            step="1"
            value={draft.maxCapacity}
            onChange={(event) => change(event, "maxCapacity")}
            className={inputClass}
          />
        </Field>
      </div>
    </Panel>
  );
}

function EventAddressSection({ draft, errors, onChange }: EventSectionProps) {
  function change(
    event: ChangeEvent<HTMLInputElement>,
    field: keyof EventDraft,
  ): void {
    onChange({ field, value: event.target.value });
  }
  return (
    <Panel>
      <PanelHeader
        title="Endereço presencial"
        description="O endereço completo é obrigatório para eventos presenciais."
      />
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <Field
          label="Logradouro *"
          htmlFor="address-street"
          error={errors.addressStreet}
        >
          <input
            id="address-street"
            value={draft.addressStreet}
            onChange={(event) => change(event, "addressStreet")}
            className={inputClass}
          />
        </Field>
        <Field
          label="Número *"
          htmlFor="address-number"
          error={errors.addressNumber}
        >
          <input
            id="address-number"
            value={draft.addressNumber}
            onChange={(event) => change(event, "addressNumber")}
            className={inputClass}
          />
        </Field>
        <Field label="Complemento" htmlFor="address-complement">
          <input
            id="address-complement"
            value={draft.addressComplement}
            onChange={(event) => change(event, "addressComplement")}
            className={inputClass}
          />
        </Field>
        <Field
          label="Bairro *"
          htmlFor="address-neighborhood"
          error={errors.addressNeighborhood}
        >
          <input
            id="address-neighborhood"
            value={draft.addressNeighborhood}
            onChange={(event) => change(event, "addressNeighborhood")}
            className={inputClass}
          />
        </Field>
        <Field
          label="Município *"
          htmlFor="address-municipality"
          error={errors.addressMunicipality}
        >
          <input
            id="address-municipality"
            value={draft.addressMunicipality}
            onChange={(event) => change(event, "addressMunicipality")}
            className={inputClass}
          />
        </Field>
        <Field label="UF *" htmlFor="address-state" error={errors.addressState}>
          <input
            id="address-state"
            value={draft.addressState}
            onChange={(event) =>
              onChange({
                field: "addressState",
                value: event.target.value.toUpperCase().slice(0, 2),
              })
            }
            maxLength={2}
            className={inputClass}
            placeholder="PE"
          />
        </Field>
      </div>
    </Panel>
  );
}

function EventOnlineSection({ draft, errors, onChange }: EventSectionProps) {
  return (
    <Panel>
      <PanelHeader
        title="Acesso online"
        description="O link de transmissão será revelado somente a participantes confirmados."
      />
      <div className="p-4 sm:p-5">
        <Field
          label="URL da transmissão *"
          htmlFor="event-online-url"
          hint="Use uma URL HTTPS. O participante verá o link apenas após a confirmação."
          error={errors.onlineUrl}
        >
          <input
            id="event-online-url"
            type="url"
            value={draft.onlineUrl}
            onChange={(event) =>
              onChange({ field: "onlineUrl", value: event.target.value })
            }
            className={inputClass}
            placeholder="https://…"
          />
        </Field>
      </div>
    </Panel>
  );
}

function TicketLotsSection({
  draft,
  errors,
  onAdd,
  onChange,
  onRemove,
}: {
  draft: EventDraft;
  errors: Record<string, string>;
  onAdd: () => void;
  onChange: (params: LotFieldChangeParams) => void;
  onRemove: (rowId: string) => void;
}) {
  if (draft.chargeType !== "pago") return null;
  return (
    <Panel>
      <PanelHeader
        title="Lotes de ingressos"
        description="Lotes ativos são liberados automaticamente por período e disponibilidade."
        right={
          <Button type="button" variant="secondary" onClick={onAdd}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar lote
          </Button>
        }
      />
      <div className="space-y-4 p-4 sm:p-5">
        {draft.lots.length ? (
          draft.lots.map((lot, index) => (
            <div
              key={lot.rowId}
              className="rounded-app-md border border-app-border p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-app-muted-foreground">
                  Lote {index + 1}
                </p>
                <Button
                  type="button"
                  compact
                  variant="ghost"
                  aria-label={`Remover lote ${index + 1}`}
                  onClick={() => onRemove(lot.rowId)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Nome *"
                  htmlFor={`lot-${lot.rowId}-name`}
                  error={errors[`lots.${index}.name`]}
                >
                  <input
                    id={`lot-${lot.rowId}-name`}
                    value={lot.name}
                    onChange={(event) =>
                      onChange({
                        rowId: lot.rowId,
                        field: "name",
                        value: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Valor (R$) *" htmlFor={`lot-${lot.rowId}-price`}>
                  <input
                    id={`lot-${lot.rowId}-price`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={lot.price}
                    onChange={(event) =>
                      onChange({
                        rowId: lot.rowId,
                        field: "price",
                        value: event.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="0,00"
                  />
                </Field>
                <Field
                  label="Quantidade máxima *"
                  htmlFor={`lot-${lot.rowId}-quantity`}
                >
                  <input
                    id={`lot-${lot.rowId}-quantity`}
                    type="number"
                    min="1"
                    step="1"
                    value={lot.quantity}
                    onChange={(event) =>
                      onChange({
                        rowId: lot.rowId,
                        field: "quantity",
                        value: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <div className="hidden sm:block" />
                <Field
                  label="Início do lote *"
                  htmlFor={`lot-${lot.rowId}-start`}
                >
                  <input
                    id={`lot-${lot.rowId}-start`}
                    type="datetime-local"
                    value={lot.startAt}
                    onChange={(event) =>
                      onChange({
                        rowId: lot.rowId,
                        field: "startAt",
                        value: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Término do lote *"
                  htmlFor={`lot-${lot.rowId}-end`}
                >
                  <input
                    id={`lot-${lot.rowId}-end`}
                    type="datetime-local"
                    value={lot.endAt}
                    onChange={(event) =>
                      onChange({
                        rowId: lot.rowId,
                        field: "endAt",
                        value: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          ))
        ) : (
          <InlineAlert tone="danger">
            Eventos pagos precisam de pelo menos um lote.
          </InlineAlert>
        )}
        {errors.lots ? (
          <p role="alert" className="text-xs text-app-danger">
            {errors.lots}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

function CustomFieldsSection({
  fields,
  onAdd,
  onChange,
  onRemove,
}: {
  fields: FieldDraft[];
  onAdd: () => void;
  onChange: (params: CustomFieldChangeParams) => void;
  onRemove: (rowId: string) => void;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Formulário de inscrição"
        description="Campos adicionais serão salvos como snapshot da inscrição."
        right={
          <Button type="button" variant="secondary" onClick={onAdd}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar campo
          </Button>
        }
      />
      <div className="space-y-4 p-4 sm:p-5">
        {fields.length ? (
          fields.map((field, index) => (
            <div
              key={field.rowId}
              className="rounded-app-md border border-app-border p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-app-muted-foreground">
                  Campo {index + 1}
                </p>
                <Button
                  type="button"
                  compact
                  variant="ghost"
                  aria-label={`Remover campo ${index + 1}`}
                  onClick={() => onRemove(field.rowId)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Rótulo *" htmlFor={`field-${field.rowId}-label`}>
                  <input
                    id={`field-${field.rowId}-label`}
                    value={field.label}
                    onChange={(event) =>
                      onChange({
                        rowId: field.rowId,
                        field: "label",
                        value: event.target.value,
                      })
                    }
                    maxLength={120}
                    className={inputClass}
                  />
                </Field>
                <Field label="Tipo" htmlFor={`field-${field.rowId}-type`}>
                  <select
                    id={`field-${field.rowId}-type`}
                    value={field.type}
                    onChange={(event) =>
                      onChange({
                        rowId: field.rowId,
                        field: "type",
                        value: event.target.value as FormFieldType,
                      })
                    }
                    className={selectCls}
                  >
                    {fieldTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Descrição / ajuda"
                  htmlFor={`field-${field.rowId}-description`}
                >
                  <input
                    id={`field-${field.rowId}-description`}
                    value={field.description}
                    onChange={(event) =>
                      onChange({
                        rowId: field.rowId,
                        field: "description",
                        value: event.target.value,
                      })
                    }
                    maxLength={300}
                    className={inputClass}
                  />
                </Field>
                {field.type === "select" || field.type === "checkbox" ? (
                  <Field
                    label="Opções (uma por linha) *"
                    htmlFor={`field-${field.rowId}-options`}
                  >
                    <textarea
                      id={`field-${field.rowId}-options`}
                      value={field.optionsText}
                      onChange={(event) =>
                        onChange({
                          rowId: field.rowId,
                          field: "optionsText",
                          value: event.target.value,
                        })
                      }
                      rows={2}
                      className={textAreaClass}
                      placeholder={"Opção 1\nOpção 2"}
                    />
                  </Field>
                ) : (
                  <div className="hidden sm:block" />
                )}
                <label className="flex items-center gap-2 text-xs text-app-muted-foreground sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) =>
                      onChange({
                        rowId: field.rowId,
                        field: "required",
                        value: event.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-app-primary"
                  />
                  Campo obrigatório
                </label>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-app-muted-foreground">
            Nenhum campo personalizado. O formulário utilizará os dados padrão
            da pessoa participante.
          </p>
        )}
      </div>
    </Panel>
  );
}

function ActivitiesSection({
  activities,
  onAdd,
  onChange,
  onRemove,
}: {
  activities: ActivityDraft[];
  onAdd: () => void;
  onChange: (params: ActivityFieldChangeParams) => void;
  onRemove: (rowId: string) => void;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Programação e palestrantes"
        description="Adicione atividades, palestras e workshops ao evento."
        right={
          <Button type="button" variant="secondary" onClick={onAdd}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar atividade
          </Button>
        }
      />
      <div className="space-y-4 p-4 sm:p-5">
        {activities.length ? (
          activities.map((activity, index) => (
            <div
              key={activity.rowId}
              className="rounded-app-md border border-app-border p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-app-muted-foreground">
                  Atividade {index + 1}
                </p>
                <Button
                  type="button"
                  compact
                  variant="ghost"
                  aria-label={`Remover atividade ${index + 1}`}
                  onClick={() => onRemove(activity.rowId)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Título *"
                  htmlFor={`activity-${activity.rowId}-title`}
                >
                  <input
                    id={`activity-${activity.rowId}-title`}
                    value={activity.title}
                    onChange={(event) =>
                      onChange({
                        rowId: activity.rowId,
                        field: "title",
                        value: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Palestrante *"
                  htmlFor={`activity-${activity.rowId}-speaker`}
                >
                  <input
                    id={`activity-${activity.rowId}-speaker`}
                    value={activity.speakerName}
                    onChange={(event) =>
                      onChange({
                        rowId: activity.rowId,
                        field: "speakerName",
                        value: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Descrição"
                  htmlFor={`activity-${activity.rowId}-description`}
                  className="sm:col-span-2"
                >
                  <textarea
                    id={`activity-${activity.rowId}-description`}
                    rows={2}
                    value={activity.description}
                    onChange={(event) =>
                      onChange({
                        rowId: activity.rowId,
                        field: "description",
                        value: event.target.value,
                      })
                    }
                    className={textAreaClass}
                  />
                </Field>
                <Field
                  label="Minicurrículo"
                  htmlFor={`activity-${activity.rowId}-bio`}
                >
                  <textarea
                    id={`activity-${activity.rowId}-bio`}
                    rows={2}
                    value={activity.speakerBio}
                    onChange={(event) =>
                      onChange({
                        rowId: activity.rowId,
                        field: "speakerBio",
                        value: event.target.value,
                      })
                    }
                    className={textAreaClass}
                  />
                </Field>
                <Field
                  label="Sala / local"
                  htmlFor={`activity-${activity.rowId}-room`}
                >
                  <input
                    id={`activity-${activity.rowId}-room`}
                    value={activity.room}
                    onChange={(event) =>
                      onChange({
                        rowId: activity.rowId,
                        field: "room",
                        value: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Início *"
                  htmlFor={`activity-${activity.rowId}-start`}
                >
                  <input
                    id={`activity-${activity.rowId}-start`}
                    type="datetime-local"
                    value={activity.startAt}
                    onChange={(event) =>
                      onChange({
                        rowId: activity.rowId,
                        field: "startAt",
                        value: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Término *"
                  htmlFor={`activity-${activity.rowId}-end`}
                >
                  <input
                    id={`activity-${activity.rowId}-end`}
                    type="datetime-local"
                    value={activity.endAt}
                    onChange={(event) =>
                      onChange({
                        rowId: activity.rowId,
                        field: "endAt",
                        value: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-app-muted-foreground">
            A programação é opcional e pode ser adicionada depois.
          </p>
        )}
      </div>
    </Panel>
  );
}

function EventCertificateSection({
  draft,
  onChange,
}: {
  draft: EventDraft;
  onChange: (params: DraftFieldChangeParams) => void;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Certificado"
        description="Certificados são emitidos após o evento e exigem presença validada."
      />
      <div className="space-y-4 p-4 sm:p-5">
        <label className="flex items-center gap-2 text-sm text-app-muted-foreground">
          <input
            type="checkbox"
            checked={draft.certificateEnabled}
            onChange={(event) =>
              onChange({
                field: "certificateEnabled",
                value: event.target.checked,
              })
            }
            className="h-4 w-4 accent-app-primary"
          />
          Este evento emitirá certificados digitais
        </label>
        {draft.certificateEnabled ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Carga horária (horas)" htmlFor="certificate-hours">
              <input
                id="certificate-hours"
                type="number"
                min="1"
                step="1"
                value={draft.workloadHours}
                onChange={(event) =>
                  onChange({
                    field: "workloadHours",
                    value: event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field
              label="Descrição do certificado"
              htmlFor="certificate-description"
            >
              <textarea
                id="certificate-description"
                rows={2}
                value={draft.certificateDescription}
                onChange={(event) =>
                  onChange({
                    field: "certificateDescription",
                    value: event.target.value,
                  })
                }
                className={textAreaClass}
              />
            </Field>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function validateEventDraft(
  params: ValidateEventDraftParams,
): EventDraftValidation {
  const draft = params.draft;
  const errors: Record<string, string> = {};
  const title = EventTitle.create(draft.title);
  if (title.isFailure) errors.title = title.error.message;
  if (draft.description.trim().length < 20)
    errors.description =
      "A descrição detalhada precisa ter pelo menos 20 caracteres.";
  if (draft.summary.trim().length < 10 || draft.summary.length > 220)
    errors.summary = "O resumo precisa ter entre 10 e 220 caracteres.";
  const slug = EventSlug.create(draft.slug || draft.title);
  if (slug.isFailure) errors.slug = slug.error.message;
  if (Email.create(draft.responsibleEmail).isFailure)
    errors.responsibleEmail = "Informe um e-mail válido.";
  if (!draft.responsibleName.trim())
    errors.responsibleName = "Informe a pessoa responsável pelo evento.";
  const startAt = parseDateTime({
    value: draft.startAt,
    label: "Início do evento",
    key: "startAt",
    errors,
  });
  const endAt = parseDateTime({
    value: draft.endAt,
    label: "Término do evento",
    key: "endAt",
    errors,
  });
  const registrationStartAt = parseDateTime({
    value: draft.registrationStartAt,
    label: "Abertura das inscrições",
    key: "registrationStartAt",
    errors,
  });
  const registrationEndAt = parseDateTime({
    value: draft.registrationEndAt,
    label: "Encerramento das inscrições",
    key: "registrationEndAt",
    errors,
  });
  const maxCapacity = Number(draft.maxCapacity);
  if (!Number.isInteger(maxCapacity) || maxCapacity <= 0)
    errors.maxCapacity = "A capacidade precisa ser maior que zero.";
  const address =
    draft.modality === "presencial"
      ? {
          street: draft.addressStreet.trim(),
          number: draft.addressNumber.trim(),
          complement: draft.addressComplement.trim() || null,
          neighborhood: draft.addressNeighborhood.trim(),
          municipality: draft.addressMunicipality.trim(),
          state: draft.addressState.trim().toUpperCase(),
        }
      : null;
  if (
    draft.modality === "presencial" &&
    (!address?.street ||
      !address.number ||
      !address.neighborhood ||
      !address.municipality ||
      !/^[A-Z]{2}$/.test(address.state))
  )
    errors.addressStreet =
      "Preencha o endereço completo e informe uma UF válida.";
  if (draft.modality === "online" && !isSecureUrl(draft.onlineUrl))
    errors.onlineUrl = "Informe uma URL HTTPS válida.";
  const lots =
    draft.chargeType === "pago"
      ? draft.lots.map((lot) => ({
          name: lot.name.trim(),
          priceCents: Math.round(Number(lot.price) * 100),
          maxQuantity: Number(lot.quantity),
          startAt: parseSilentDate(lot.startAt),
          endAt: parseSilentDate(lot.endAt),
          active: true,
          sortOrder: draft.lots.indexOf(lot),
        }))
      : [];
  const fields = draft.fields.map((field, index) => ({
    label: field.label.trim(),
    description: field.description.trim() || null,
    type: field.type,
    required: field.required,
    options: field.optionsText
      .split(/\r?\n/)
      .map((option) => option.trim())
      .filter(Boolean),
    displayOrder: index,
  }));
  const activities = draft.activities.map((activity) => ({
    title: activity.title.trim(),
    description: activity.description.trim(),
    speakerName: activity.speakerName.trim(),
    speakerBio: activity.speakerBio.trim() || null,
    room: activity.room.trim() || null,
    startAt: parseSilentDate(activity.startAt),
    endAt: parseSilentDate(activity.endAt),
  }));
  if (startAt && endAt && registrationStartAt && registrationEndAt) {
    if (endAt <= startAt)
      errors.endAt = "O término deve ocorrer depois do início.";
    if (registrationStartAt >= registrationEndAt || registrationEndAt > endAt)
      errors.registrationEndAt = "O período de inscrição é inválido.";
    const configuration = configurationValidator.execute({
      chargeType: draft.chargeType,
      registrationStartAt,
      registrationEndAt,
      eventStartAt: startAt,
      eventEndAt: endAt,
      lots,
      fields,
      activities,
    });
    if (configuration.isFailure)
      errors.configuration = configuration.error.message;
  }
  if (Object.keys(errors).length) return { request: null, errors };
  if (
    !startAt ||
    !endAt ||
    !registrationStartAt ||
    !registrationEndAt ||
    !slug.isSuccess ||
    !title.isSuccess
  )
    return {
      request: null,
      errors: {
        ...errors,
        general: "Confira as datas e os dados obrigatórios.",
      },
    };
  const request: CreateEventRequest = {
    title: title.value.value,
    description: draft.description.trim(),
    summary: draft.summary.trim(),
    slug: slug.value.value,
    bannerUrl: draft.bannerUrl || null,
    modality: draft.modality,
    chargeType: draft.chargeType,
    startAt,
    endAt,
    registrationStartAt,
    registrationEndAt,
    maxCapacity,
    allowsWaitlist: draft.allowsWaitlist,
    onlineUrl: draft.modality === "online" ? draft.onlineUrl.trim() : null,
    address,
    responsibleName: draft.responsibleName.trim(),
    responsibleEmail: draft.responsibleEmail.trim(),
    certificateEnabled: draft.certificateEnabled,
    workloadHours: draft.certificateEnabled
      ? Number(draft.workloadHours) || 0
      : 0,
    certificateDescription: draft.certificateEnabled
      ? draft.certificateDescription.trim() || null
      : null,
    lots: lots.map((lot) => ({
      ...lot,
      startAt: lot.startAt,
      endAt: lot.endAt,
    })),
    fields: fields.map((field) => ({ ...field })),
    activities: activities.map((activity) => ({
      ...activity,
      startAt: activity.startAt,
      endAt: activity.endAt,
    })),
  };
  return { request, errors };
}

function parseDateTime(
  params: DateFieldParams & { errors: Record<string, string> },
): Date | null {
  if (!params.value) {
    params.errors[params.key] = `${params.label} é obrigatório.`;
    return null;
  }
  const date = new Date(params.value);
  if (Number.isNaN(date.getTime())) {
    params.errors[params.key] =
      `Informe uma data válida para ${params.label.toLowerCase()}.`;
    return null;
  }
  return date;
}

function parseSilentDate(value: string): Date {
  return new Date(value);
}

function isSecureUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function createRowId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
