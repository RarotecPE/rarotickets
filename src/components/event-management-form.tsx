"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  FileImage,
  LoaderCircle,
  Plus,
  QrCode,
  Save,
  Tag,
  Trash2,
} from "lucide-react";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import type { CreateEventRequest } from "@/client/services/ticketing-api.service";
import { useAuth } from "@/components/auth-provider";
import { Dialog } from "@/components/dialog";
import {
  Button,
  Field,
  InlineAlert,
  Panel,
  PanelHeader,
  Spinner,
  inputCls,
  selectCls,
  textareaCls,
} from "@/components/ui";
import { BannerImageDomainService } from "@/modules/ticketing/domain/events/services/banner-image.domain-service";
import { EventConfigurationDomainService } from "@/modules/ticketing/domain/events/services/event-configuration.domain-service";
import { Email } from "@/modules/ticketing/domain/participants/value-objects/email.vo";
import { Cpf } from "@/modules/ticketing/domain/participants/value-objects/cpf.vo";
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
  paymentMode: "pagbank" | "pix_manual";
  pixCode: string;
  pixQrCodeUrl: string;
  pixBankName: string;
  pixBankAgency: string;
  pixBankAccount: string;
  pixBankAccountType: string;
  pixBankCnpj: string;
  pixBankAccountHolder: string;
  pixNotificationEmail: string;
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
type CouponDraft = {
  rowId: string;
  id?: string;
  code: string;
  type: "percentual" | "valor_fixo";
  discountValue: string;
  maxUses: string;
  startAt: string;
  endAt: string;
  active: boolean;
  allowedEmailsText: string;
  allowedCpfsText: string;
};
type LotDraft = {
  rowId: string;
  id?: string;
  name: string;
  price: string;
  quantity: string;
  startAt: string;
  endAt: string;
  coupons?: CouponDraft[];
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
type CouponFieldChangeParams = {
  lotRowId: string;
  couponRowId: string;
  field: keyof CouponDraft;
  value: any;
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
type ValidateEventDraftParams = {
  draft: EventDraft;
  confirmedCount?: number;
};
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
    paymentMode: "pagbank",
    pixCode: "",
    pixQrCodeUrl: "",
    pixBankName: "",
    pixBankAgency: "",
    pixBankAccount: "",
    pixBankAccountType: "corrente",
    pixBankCnpj: "",
    pixBankAccountHolder: "",
    pixNotificationEmail: "",
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

function toDatetimeLocalValue(
  value: Date | string | null | undefined,
): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const PENDENCY_FIELD_METADATA: Record<
  string,
  { label: string; targetId?: string }
> = {
  title: { label: "Título do evento", targetId: "event-title" },
  slug: { label: "Identificador (slug)", targetId: "event-slug" },
  summary: { label: "Resumo", targetId: "event-summary" },
  description: { label: "Descrição detalhada", targetId: "event-description" },
  responsibleName: {
    label: "Pessoa responsável",
    targetId: "event-responsible-name",
  },
  responsibleEmail: {
    label: "E-mail do responsável",
    targetId: "event-responsible-email",
  },
  startAt: { label: "Início do evento", targetId: "event-start" },
  endAt: { label: "Término do evento", targetId: "event-end" },
  registrationStartAt: {
    label: "Abertura das inscrições",
    targetId: "registration-start",
  },
  registrationEndAt: {
    label: "Encerramento das inscrições",
    targetId: "registration-end",
  },
  maxCapacity: { label: "Capacidade máxima", targetId: "event-capacity" },
  addressStreet: { label: "Endereço (logradouro)", targetId: "address-street" },
  addressNumber: { label: "Número do endereço", targetId: "address-number" },
  addressNeighborhood: { label: "Bairro", targetId: "address-neighborhood" },
  addressMunicipality: { label: "Município", targetId: "address-municipality" },
  addressState: { label: "UF / Estado", targetId: "address-state" },
  onlineUrl: {
    label: "Link de transmissão online",
    targetId: "event-online-url",
  },
  pixCode: {
    label: "Código PIX Copia e Cola",
    targetId: "event-pix-code",
  },
  pixQrCodeUrl: { label: "QR Code do PIX", targetId: "event-pix-qr" },
  pixBankName: {
    label: "Banco para depósito PIX",
    targetId: "event-pix-bank-name",
  },
  pixBankAgency: {
    label: "Agência da conta PIX",
    targetId: "event-pix-bank-agency",
  },
  pixBankAccount: {
    label: "Número da conta PIX",
    targetId: "event-pix-bank-account",
  },
  pixBankAccountType: {
    label: "Tipo de conta PIX",
    targetId: "event-pix-bank-account-type",
  },
  pixBankCnpj: { label: "CNPJ da conta PIX", targetId: "event-pix-bank-cnpj" },
  pixBankAccountHolder: {
    label: "Titular da conta PIX",
    targetId: "event-pix-bank-account-holder",
  },
  pixNotificationEmail: {
    label: "E-mail de notificação PIX",
    targetId: "event-pix-notification-email",
  },
  lots: { label: "Lotes de ingressos", targetId: "ticket-lots-section" },
  configuration: {
    label: "Configuração do evento",
    targetId: "ticket-lots-section",
  },
  general: { label: "Dados obrigatórios" },
};

export type EventManagementFormProps = {
  eventId?: string;
};

export function EventManagementForm({ eventId }: EventManagementFormProps = {}) {
  const auth = useAuth();
  const isEditing = Boolean(eventId);
  const [draft, setDraft] = useState<EventDraft>(createEmptyDraft);
  const [initialFields, setInitialFields] = useState<FieldDraft[]>([]);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [pendingRequest, setPendingRequest] = useState<CreateEventRequest | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(isEditing);
  const [isFinalized, setIsFinalized] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bannerState, setBannerState] = useState<
    "idle" | "uploading" | "uploaded"
  >("idle");
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [pixQrState, setPixQrState] = useState<
    "idle" | "uploading" | "uploaded"
  >("idle");
  const [pixQrError, setPixQrError] = useState<string | null>(null);
  const canWrite = Boolean(auth.session?.permissions.includes("events:write"));

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    async function loadEvent(): Promise<void> {
      try {
        setLoadingEvent(true);
        const data = await ticketingApi.getManagedEvent({ eventId: eventId! });
        if (!active) return;
        if (data.props.status === "finalizado") {
          setIsFinalized(true);
        }
        const loadedFields: FieldDraft[] = data.formFields.map((field) => ({
          rowId: field.id || createRowId(),
          label: field.label,
          description: field.description ?? "",
          type: field.type,
          required: field.required,
          optionsText: (field.options || []).join("\n"),
        }));
        setInitialFields(loadedFields);
        setConfirmedCount(data.capacity.confirmed);
        setTotalRegistrations(
          data.capacity.total ??
            data.capacity.confirmed +
              data.capacity.reserved +
              data.capacity.waitlisted,
        );
        setDraft({
          title: data.props.title,
          description: data.props.description,
          summary: data.props.summary,
          slug: data.props.slug,
          bannerUrl: data.props.bannerUrl ?? "",
          modality: data.props.modality,
          chargeType: data.props.chargeType,
          paymentMode: data.props.paymentMode ?? "pagbank",
          pixCode: data.props.pixCode ?? "",
          pixQrCodeUrl: data.props.pixQrCodeUrl ?? "",
          pixBankName: data.props.pixBankName ?? "",
          pixBankAgency: data.props.pixBankAgency ?? "",
          pixBankAccount: data.props.pixBankAccount ?? "",
          pixBankAccountType: data.props.pixBankAccountType ?? "corrente",
          pixBankCnpj: data.props.pixBankCnpj ?? "",
          pixBankAccountHolder: data.props.pixBankAccountHolder ?? "",
          pixNotificationEmail: data.props.pixNotificationEmail ?? "",
          startAt: toDatetimeLocalValue(data.props.startAt),
          endAt: toDatetimeLocalValue(data.props.endAt),
          registrationStartAt: toDatetimeLocalValue(data.props.registrationStartAt),
          registrationEndAt: toDatetimeLocalValue(data.props.registrationEndAt),
          maxCapacity: String(data.props.maxCapacity),
          allowsWaitlist: data.props.allowsWaitlist,
          onlineUrl: data.props.onlineUrl ?? "",
          addressStreet: data.props.address?.street ?? "",
          addressNumber: data.props.address?.number ?? "",
          addressComplement: data.props.address?.complement ?? "",
          addressNeighborhood: data.props.address?.neighborhood ?? "",
          addressMunicipality: data.props.address?.municipality ?? "",
          addressState: data.props.address?.state ?? "",
          responsibleName: data.props.responsibleName,
          responsibleEmail: data.props.responsibleEmail,
          certificateEnabled: data.props.certificateEnabled,
          workloadHours: data.props.workloadHours ? String(data.props.workloadHours) : "",
          certificateDescription: data.props.certificateDescription ?? "",
          lots: data.lots.map((lot) => ({
            rowId: lot.id || createRowId(),
            name: lot.name,
            price: (lot.priceCents / 100).toFixed(2),
            quantity: String(lot.maxQuantity),
            startAt: toDatetimeLocalValue(lot.startAt),
            endAt: toDatetimeLocalValue(lot.endAt),
            coupons: (lot.coupons ?? []).map((c) => ({
              rowId: c.id || createRowId(),
              id: c.id,
              code: c.code,
              type: c.type,
              discountValue:
                c.type === "percentual"
                  ? String(c.discountValue)
                  : (c.discountValue / 100).toFixed(2),
              maxUses:
                c.maxUses !== null && c.maxUses !== undefined
                  ? String(c.maxUses)
                  : "",
              startAt: toDatetimeLocalValue(c.startAt),
              endAt: toDatetimeLocalValue(c.endAt),
              active: c.active,
              allowedEmailsText: (c.allowedEmails ?? []).join("\n"),
              allowedCpfsText: (c.allowedCpfs ?? []).join("\n"),
            })),
          })),
          fields: loadedFields,
          activities: data.activities.map((act) => ({
            rowId: act.id || createRowId(),
            title: act.title,
            description: act.description,
            speakerName: act.speakerName,
            speakerBio: act.speakerBio ?? "",
            room: act.room ?? "",
            startAt: toDatetimeLocalValue(act.startAt),
            endAt: toDatetimeLocalValue(act.endAt),
          })),
        });
        if (data.props.bannerUrl) {
          setBannerState("uploaded");
        }
        if (data.props.pixQrCodeUrl) {
          setPixQrState("uploaded");
        }
      } catch (caught) {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível carregar os dados do evento.",
        );
      } finally {
        if (active) setLoadingEvent(false);
      }
    }
    void loadEvent();
    return () => {
      active = false;
    };
  }, [eventId]);

  function updateDraft(params: DraftFieldChangeParams): void {
    setDraft((current) => {
      const nextDraft = { ...current, [params.field]: params.value };
      if (
        params.field === "maxCapacity" &&
        current.lots.length === 1 &&
        current.lots[0].quantity === current.maxCapacity
      ) {
        nextDraft.lots = [
          { ...current.lots[0], quantity: String(params.value) },
        ];
      }
      return nextDraft;
    });
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
          coupons: [],
        },
      ],
    }));
  }

  function addLotCoupon(lotRowId: string): void {
    setDraft((current) => ({
      ...current,
      lots: current.lots.map((lot) => {
        if (lot.rowId !== lotRowId) return lot;
        return {
          ...lot,
          coupons: [
            ...(lot.coupons ?? []),
            {
              rowId: createRowId(),
              code: "",
              type: "percentual",
              discountValue: "10",
              maxUses: "",
              startAt: lot.startAt,
              endAt: lot.endAt,
              active: true,
              allowedEmailsText: "",
              allowedCpfsText: "",
            },
          ],
        };
      }),
    }));
  }

  function updateLotCoupon(params: CouponFieldChangeParams): void {
    setDraft((current) => ({
      ...current,
      lots: current.lots.map((lot) => {
        if (lot.rowId !== params.lotRowId) return lot;
        return {
          ...lot,
          coupons: (lot.coupons ?? []).map((c) =>
            c.rowId === params.couponRowId
              ? { ...c, [params.field]: params.value }
              : c,
          ),
        };
      }),
    }));
  }

  function removeLotCoupon(params: {
    lotRowId: string;
    couponRowId: string;
  }): void {
    setDraft((current) => ({
      ...current,
      lots: current.lots.map((lot) => {
        if (lot.rowId !== params.lotRowId) return lot;
        return {
          ...lot,
          coupons: (lot.coupons ?? []).filter(
            (c) => c.rowId !== params.couponRowId,
          ),
        };
      }),
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

  async function uploadPixQr(params: { file: File }): Promise<void> {
    setPixQrError(null);
    setPixQrState("uploading");
    try {
      const content = new Uint8Array(await params.file.arrayBuffer());
      const validation = bannerValidator.execute({
        mimeType: params.file.type,
        sizeBytes: params.file.size,
        content,
      });
      if (validation.isFailure) throw validation.error;
      const pixQrCodeUrl = await ticketingApi.uploadEventPixQr({
        file: params.file,
      });
      setDraft((current) => ({ ...current, pixQrCodeUrl }));
      setPixQrState("uploaded");
    } catch (caught) {
      setPixQrState("idle");
      setPixQrError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível enviar o QR Code do PIX.",
      );
    }
  }

  const fieldsChanged =
    isEditing && hasCustomFieldsChanged(initialFields, draft.fields);

  async function persistEvent(request: CreateEventRequest): Promise<void> {
    setSaving(true);
    try {
      if (isEditing && eventId) {
        const updated = await ticketingApi.updateEvent({
          eventId,
          request,
        });
        setPendingRequest(null);
        setSuccess(`Evento “${updated.props.title}” atualizado com sucesso.`);
        window.location.assign(`/painel/eventos/${updated.id}`);
      } else {
        const created = await ticketingApi.createEvent({
          request,
        });
        setSuccess(`Evento “${created.props.title}” criado como rascunho.`);
        window.location.assign(`/painel/eventos/${created.id}`);
      }
    } catch (caught) {
      setPendingRequest(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar o evento.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const validation = validateEventDraft({
      draft,
      confirmedCount: isEditing ? confirmedCount : 0,
    });
    setErrors(validation.errors);
    if (!validation.request) {
      setError("Revise os campos destacados e tente novamente.");
      return;
    }
    if (!canWrite) {
      setError(
        isEditing
          ? "Seu perfil não tem permissão para editar eventos."
          : "Seu perfil não tem permissão para criar eventos.",
      );
      return;
    }
    if (isEditing && totalRegistrations > 0 && fieldsChanged) {
      setPendingRequest(validation.request);
      return;
    }
    await persistEvent(validation.request);
  }

  if (!canWrite)
    return (
      <InlineAlert tone="danger">
        Seu perfil tem acesso somente à consulta de eventos.
      </InlineAlert>
    );

  if (loadingEvent) {
    return (
      <Panel>
        <div className="p-8">
          <Spinner label="Carregando dados do evento…" />
        </div>
      </Panel>
    );
  }

  if (isFinalized) {
    return (
      <div className="flex flex-col gap-4">
        <InlineAlert tone="danger">
          Este evento está finalizado e não pode ser editado.
        </InlineAlert>
        <Link
          href={`/painel/eventos/${eventId}`}
          className="inline-flex min-h-8 items-center gap-2 text-xs font-semibold text-app-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar aos detalhes do evento
        </Link>
      </div>
    );
  }

  const pendencies: Array<{
    key: string;
    label: string;
    message: string;
    targetId?: string;
  }> = [];

  for (const [key, msg] of Object.entries(errors)) {
    if (!msg || typeof msg !== "string" || !msg.trim()) continue;
    const meta = PENDENCY_FIELD_METADATA[key];
    if (meta) {
      pendencies.push({
        key,
        label: meta.label,
        message: msg,
        targetId: meta.targetId,
      });
    } else if (key.startsWith("lots.")) {
      const parts = key.split(".");
      const lotIndex = Number(parts[1]) + 1;
      if (parts[2] === "coupons") {
        const couponIndex = Number(parts[3]) + 1;
        const field = parts[4];
        const fieldLabels: Record<string, string> = {
          code: "Código",
          discountValue: "Valor do desconto",
          startAt: "Início da validade",
          endAt: "Término da validade",
          maxUses: "Limite de usos",
          allowedEmailsText: "E-mails permitidos",
          allowedCpfsText: "CPFs permitidos",
        };
        pendencies.push({
          key,
          label: `Lote ${lotIndex} > Cupom ${couponIndex} (${fieldLabels[field] || field})`,
          message: msg,
          targetId: `lot-${Number(parts[1])}-coupon-${Number(parts[3])}-${field}`,
        });
      } else {
        const field = parts[2];
        const fieldLabels: Record<string, string> = {
          name: "Nome do lote",
          price: "Valor do lote",
          quantity: "Quantidade do lote",
          startAt: "Início do lote",
          endAt: "Término do lote",
        };
        pendencies.push({
          key,
          label: `Lote ${lotIndex} (${fieldLabels[field] || field})`,
          message: msg,
          targetId: `lot-${Number(parts[1])}-${field}`,
        });
      }
    } else {
      pendencies.push({
        key,
        label: key,
        message: msg,
      });
    }
  }

  if (bannerError) {
    pendencies.push({
      key: "bannerError",
      label: "Banner público",
      message: bannerError,
      targetId: "event-banner",
    });
  }

  if (pixQrError && !errors.pixQrCodeUrl) {
    pendencies.push({
      key: "pixQrError",
      label: "QR Code do PIX",
      message: pixQrError,
      targetId: "event-pix-qr",
    });
  }

  if (error && error !== "Revise os campos destacados e tente novamente.") {
    pendencies.push({
      key: "formError",
      label: "Erro ao salvar",
      message: error,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-app-primary">
            Gestão de eventos
          </p>
          <h2 className="mt-1 text-xl font-bold text-app-foreground">
            {isEditing ? "Editar evento" : "Criar evento"}
          </h2>
          <p className="mt-1 text-xs text-app-muted-foreground">
            {isEditing
              ? "Atualize publicação, inscrições, lotes, formulário e programação."
              : "Configure publicação, inscrições, lotes, formulário e programação."}
          </p>
        </div>
        <Link
          href={isEditing ? `/painel/eventos/${eventId}` : "/painel/eventos"}
          className="inline-flex h-10 items-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-3 text-sm font-semibold text-app-foreground hover:bg-app-surface"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {isEditing ? "Voltar aos detalhes" : "Voltar aos eventos"}
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
          onPixQr={uploadPixQr}
          pixQrState={pixQrState}
          pixQrError={pixQrError}
        />
        <EventScheduleSection
          draft={draft}
          errors={errors}
          onChange={updateDraft}
          confirmedCount={isEditing ? confirmedCount : 0}
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
          onAddCoupon={addLotCoupon}
          onChangeCoupon={updateLotCoupon}
          onRemoveCoupon={removeLotCoupon}
        />
        <CustomFieldsSection
          fields={draft.fields}
          totalRegistrations={isEditing ? totalRegistrations : 0}
          fieldsChanged={fieldsChanged}
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
        {pendencies.length > 0 ? (
          <div
            role="alert"
            className="rounded-app-md border border-app-danger/40 bg-app-danger/10 p-4 text-app-foreground"
          >
            <div className="flex items-center gap-2 font-semibold text-app-danger">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {pendencies.length === 1
                  ? "Existe 1 pendência no formulário para salvar o evento:"
                  : `Existem ${pendencies.length} pendências no formulário para salvar o evento:`}
              </span>
            </div>
            <ul className="mt-2.5 space-y-1.5 pl-5 text-xs text-app-foreground/90 list-disc">
              {pendencies.map((pendency) => (
                <li key={pendency.key}>
                  <strong className="text-app-foreground">{pendency.label}:</strong>{" "}
                  <span>{pendency.message}</span>
                  {pendency.targetId ? (
                    <button
                      type="button"
                      onClick={() => {
                        const element = document.getElementById(pendency.targetId!);
                        if (element) {
                          element.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                          if ("focus" in element && typeof element.focus === "function") {
                            element.focus();
                          }
                        }
                      }}
                      className="ml-2 inline-flex items-center gap-0.5 font-medium text-app-primary underline hover:opacity-80"
                    >
                      Ir para o campo &rarr;
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="submit"
            disabled={
              saving ||
              bannerState === "uploading" ||
              pixQrState === "uploading"
            }
          >
            {saving ? (
              <>
                <LoaderCircle
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                {isEditing ? "Salvando alterações…" : "Salvando…"}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                {isEditing ? "Salvar alterações" : "Salvar rascunho"}
              </>
            )}
          </Button>
        </div>
      </form>

      <Dialog
        open={Boolean(pendingRequest)}
        onClose={() => {
          if (!saving) setPendingRequest(null);
        }}
        title="Atenção ao editar campos do formulário"
        description={`Este evento já possui ${totalRegistrations} inscrição(ões) registrada(s).`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-app-md border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-app-foreground">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
              aria-hidden="true"
            />
            <div className="space-y-1.5 leading-relaxed">
              <p className="font-semibold">
                A edição dos campos adicionais pode impactar as inscrições já
                preenchidas.
              </p>
              <p className="text-app-muted-foreground">
                As respostas enviadas anteriormente são preservadas no histórico
                de cada inscrição, porém alterar rótulos, opções, tipos ou
                adicionar/remover campos fará com que novas inscrições tenham um
                formulário diferente das inscrições anteriores.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => setPendingRequest(null)}
            >
              Voltar e revisar
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => {
                if (pendingRequest) void persistEvent(pendingRequest);
              }}
            >
              {saving ? (
                <>
                  <LoaderCircle
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  Salvando alterações…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Confirmar e salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>
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
  onPixQr,
  pixQrState,
  pixQrError,
}: EventSectionProps & {
  onBanner: (params: UploadBannerParams) => Promise<void>;
  bannerState: "idle" | "uploading" | "uploaded";
  bannerError: string | null;
  onPixQr: (params: { file: File }) => Promise<void>;
  pixQrState: "idle" | "uploading" | "uploaded";
  pixQrError: string | null;
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

        {draft.chargeType === "pago" ? (
          <>
            <Field
              label="Modo de pagamento"
              htmlFor="event-payment-mode"
              hint="Selecione o provedor para eventos pagos."
            >
              <select
                id="event-payment-mode"
                value={draft.paymentMode}
                onChange={(event) => change(event, "paymentMode")}
                className={selectCls}
              >
                <option value="pagbank">
                  PagBank (Gateway: Cartão, Boleto e PIX automático)
                </option>
                <option value="pix_manual">
                  PIX Direto / Manual (QR Code e Copia e Cola)
                </option>
              </select>
            </Field>

            {draft.paymentMode === "pix_manual" ? (
              <div className="space-y-4 rounded-app-md border border-app-primary/30 bg-app-surface-elevated/40 p-4 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-app-primary" aria-hidden="true" />
                  <p className="text-xs font-bold uppercase tracking-wider text-app-foreground">
                    Configuração do PIX Direto
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Código PIX Copia e Cola *"
                    htmlFor="event-pix-code"
                    hint="Cole o código PIX Copia e Cola (payload EMV) gerado pelo seu banco."
                    error={errors.pixCode}
                    className="sm:col-span-2"
                  >
                    <textarea
                      id="event-pix-code"
                      value={draft.pixCode}
                      onChange={(event) => change(event, "pixCode")}
                      rows={3}
                      className={textAreaClass}
                      placeholder="00020126...5802BR59..."
                      aria-invalid={Boolean(errors.pixCode)}
                    />
                  </Field>

                  <Field
                    label="Imagem do QR Code do PIX *"
                    htmlFor="event-pix-qr"
                    hint="Imagem PNG ou JPG de até 10 MB com o QR Code para pagamento."
                    error={pixQrError ?? errors.pixQrCodeUrl}
                    className="sm:col-span-2"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        id="event-pix-qr"
                        type="file"
                        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void onPixQr({ file });
                        }}
                        className="min-w-0 flex-1 text-xs text-app-muted-foreground file:mr-3 file:rounded-app-sm file:border-0 file:bg-app-surface-elevated file:px-3 file:py-2 file:text-xs file:font-semibold file:text-app-foreground"
                      />
                      <span className="inline-flex items-center gap-1.5 text-xs text-app-muted-foreground">
                        {pixQrState === "uploading" ? (
                          <LoaderCircle
                            className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                            aria-hidden="true"
                          />
                        ) : (
                          <FileImage className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {pixQrState === "uploading"
                          ? "Enviando…"
                          : pixQrState === "uploaded"
                            ? "QR Code enviado"
                            : "Obrigatório no PIX"}
                      </span>
                    </div>
                    {draft.pixQrCodeUrl ? (
                      <div className="mt-3 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={draft.pixQrCodeUrl}
                          alt="Prévia do QR Code PIX"
                          className="h-32 w-32 rounded-app-md border border-app-border bg-white p-1 object-contain"
                        />
                        <p className="text-xs text-app-muted-foreground">
                          QR Code carregado. Os participantes escanearão esta imagem para realizar o pagamento.
                        </p>
                      </div>
                    ) : null}
                  </Field>

                  <div className="sm:col-span-2 pt-2 border-t border-app-border/40">
                    <p className="text-xs font-semibold text-app-foreground mb-1">
                      Dados da Conta Bancária (opcional)
                    </p>
                    <p className="text-xs text-app-muted-foreground">
                      Informe os dados bancários para participantes que optarem por conferência, transferência bancária ou PIX por agência/conta.
                    </p>
                  </div>

                  <Field
                    label="Banco"
                    htmlFor="event-pix-bank-name"
                    hint="Nome ou código do banco (ex: Banco do Brasil, Itaú, Nubank)."
                    error={errors.pixBankName}
                  >
                    <input
                      id="event-pix-bank-name"
                      type="text"
                      value={draft.pixBankName}
                      onChange={(event) => change(event, "pixBankName")}
                      className={inputClass}
                      placeholder="Ex: Banco do Brasil, Itaú, Nubank"
                    />
                  </Field>

                  <Field
                    label="Agência"
                    htmlFor="event-pix-bank-agency"
                    hint="Número da agência sem dígito (se houver)."
                    error={errors.pixBankAgency}
                  >
                    <input
                      id="event-pix-bank-agency"
                      type="text"
                      value={draft.pixBankAgency}
                      onChange={(event) => change(event, "pixBankAgency")}
                      className={inputClass}
                      placeholder="Ex: 0001"
                    />
                  </Field>

                  <Field
                    label="Número da conta"
                    htmlFor="event-pix-bank-account"
                    hint="Número da conta com dígito verificador."
                    error={errors.pixBankAccount}
                  >
                    <input
                      id="event-pix-bank-account"
                      type="text"
                      value={draft.pixBankAccount}
                      onChange={(event) => change(event, "pixBankAccount")}
                      className={inputClass}
                      placeholder="Ex: 1234567-8"
                    />
                  </Field>

                  <Field
                    label="Tipo de conta"
                    htmlFor="event-pix-bank-account-type"
                    error={errors.pixBankAccountType}
                  >
                    <select
                      id="event-pix-bank-account-type"
                      value={draft.pixBankAccountType}
                      onChange={(event) => change(event, "pixBankAccountType")}
                      className={selectCls}
                    >
                      <option value="corrente">Conta Corrente</option>
                      <option value="poupanca">Conta Poupança</option>
                      <option value="pagamento">Conta de Pagamento</option>
                    </select>
                  </Field>

                  <Field
                    label="CNPJ"
                    htmlFor="event-pix-bank-cnpj"
                    hint="CNPJ da conta para identificação pelo participante."
                    error={errors.pixBankCnpj}
                  >
                    <input
                      id="event-pix-bank-cnpj"
                      type="text"
                      value={draft.pixBankCnpj}
                      onChange={(event) => change(event, "pixBankCnpj")}
                      className={inputClass}
                      placeholder="00.000.000/0001-00"
                    />
                  </Field>

                  <Field
                    label="Nome / Razão Social"
                    htmlFor="event-pix-bank-account-holder"
                    hint="Nome do titular ou razão social da conta."
                    error={errors.pixBankAccountHolder}
                  >
                    <input
                      id="event-pix-bank-account-holder"
                      type="text"
                      value={draft.pixBankAccountHolder}
                      onChange={(event) => change(event, "pixBankAccountHolder")}
                      className={inputClass}
                      placeholder="Ex: Razão Social ou Nome do Titular"
                    />
                  </Field>

                  <div className="sm:col-span-2 pt-2 border-t border-app-border/40">
                    <p className="text-xs font-semibold text-app-foreground mb-1">
                      Aviso de Inscrições para a Equipe
                    </p>
                  </div>

                  <Field
                    label="E-mail para notificação de inscrições PIX"
                    htmlFor="event-pix-notification-email"
                    hint="E-mail que receberá um aviso imediato a cada inscrição via PIX para verificar a transferência e confirmar o pagamento."
                    error={errors.pixNotificationEmail}
                    className="sm:col-span-2"
                  >
                    <input
                      id="event-pix-notification-email"
                      type="email"
                      value={draft.pixNotificationEmail}
                      onChange={(event) => change(event, "pixNotificationEmail")}
                      className={inputClass}
                      placeholder="financeiro@empresa.com.br"
                      aria-invalid={Boolean(errors.pixNotificationEmail)}
                    />
                  </Field>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

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

function EventScheduleSection({
  draft,
  errors,
  onChange,
  confirmedCount = 0,
}: EventSectionProps & { confirmedCount?: number }) {
  function change(
    event: ChangeEvent<HTMLInputElement>,
    field: keyof EventDraft,
  ): void {
    onChange({ field, value: event.target.value });
  }
  const minCapacity = Math.max(1, confirmedCount);
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
          hint={
            confirmedCount > 0
              ? `Mínimo permitido: ${confirmedCount} inscrição(ões) já confirmada(s).`
              : undefined
          }
          error={errors.maxCapacity}
        >
          <input
            id="event-capacity"
            type="number"
            min={minCapacity}
            step="1"
            value={draft.maxCapacity}
            onChange={(event) => change(event, "maxCapacity")}
            className={inputClass}
            aria-invalid={Boolean(errors.maxCapacity)}
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
  onAddCoupon,
  onChangeCoupon,
  onRemoveCoupon,
}: {
  draft: EventDraft;
  errors: Record<string, string>;
  onAdd: () => void;
  onChange: (params: LotFieldChangeParams) => void;
  onRemove: (rowId: string) => void;
  onAddCoupon: (lotRowId: string) => void;
  onChangeCoupon: (params: CouponFieldChangeParams) => void;
  onRemoveCoupon: (params: { lotRowId: string; couponRowId: string }) => void;
}) {
  if (draft.chargeType !== "pago") return null;
  return (
    <Panel id="ticket-lots-section">
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
              className="rounded-app-md border border-app-border p-3 sm:p-4 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-app-muted-foreground uppercase tracking-wider">
                  Lote {index + 1}
                </p>
                <Button
                  type="button"
                  compact
                  variant="ghost"
                  aria-label={`Remover lote ${index + 1}`}
                  onClick={() => onRemove(lot.rowId)}
                >
                  <Trash2 className="h-4 w-4 text-app-danger" aria-hidden="true" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Nome *"
                  htmlFor={`lot-${index}-name`}
                  error={errors[`lots.${index}.name`]}
                >
                  <input
                    id={`lot-${index}-name`}
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
                <Field
                  label="Valor (R$) *"
                  htmlFor={`lot-${index}-price`}
                  error={errors[`lots.${index}.price`]}
                >
                  <input
                    id={`lot-${index}-price`}
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
                  htmlFor={`lot-${index}-quantity`}
                  error={errors[`lots.${index}.quantity`]}
                >
                  <input
                    id={`lot-${index}-quantity`}
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
                  htmlFor={`lot-${index}-startAt`}
                  error={errors[`lots.${index}.startAt`]}
                >
                  <input
                    id={`lot-${index}-startAt`}
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
                  htmlFor={`lot-${index}-endAt`}
                  error={errors[`lots.${index}.endAt`]}
                >
                  <input
                    id={`lot-${index}-endAt`}
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

              {/* Sub-seção de Cupons do Lote */}
              <div className="border-t border-app-border/60 pt-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-app-foreground">
                    <Tag className="h-3.5 w-3.5 text-app-primary" aria-hidden="true" />
                    <span>Cupons de desconto do lote ({lot.coupons?.length ?? 0})</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    compact
                    onClick={() => onAddCoupon(lot.rowId)}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Adicionar cupom
                  </Button>
                </div>

                {lot.coupons && lot.coupons.length > 0 ? (
                  <div className="space-y-3">
                    {lot.coupons.map((coupon, cIdx) => (
                      <div
                        key={coupon.rowId}
                        className="rounded-app-md border border-app-border/80 bg-app-surface/50 p-3 sm:p-4 text-xs space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-app-border/40 pb-2">
                          <span className="font-semibold text-app-foreground">
                            Cupom #{cIdx + 1}
                          </span>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-app-muted-foreground cursor-pointer">
                              <input
                                type="checkbox"
                                checked={coupon.active}
                                onChange={(e) =>
                                  onChangeCoupon({
                                    lotRowId: lot.rowId,
                                    couponRowId: coupon.rowId,
                                    field: "active",
                                    value: e.target.checked,
                                  })
                                }
                                className="rounded border-app-border text-app-primary focus:ring-app-primary"
                              />
                              <span>Ativo</span>
                            </label>
                            <Button
                              type="button"
                              compact
                              variant="ghost"
                              aria-label={`Remover cupom ${cIdx + 1}`}
                              onClick={() =>
                                onRemoveCoupon({
                                  lotRowId: lot.rowId,
                                  couponRowId: coupon.rowId,
                                })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5 text-app-danger" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <Field
                            label="Código do cupom *"
                            htmlFor={`lot-${index}-coupon-${cIdx}-code`}
                            error={errors[`lots.${index}.coupons.${cIdx}.code`]}
                          >
                            <input
                              id={`lot-${index}-coupon-${cIdx}-code`}
                              value={coupon.code}
                              onChange={(e) =>
                                onChangeCoupon({
                                  lotRowId: lot.rowId,
                                  couponRowId: coupon.rowId,
                                  field: "code",
                                  value: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                                })
                              }
                              className={`${inputClass} uppercase font-mono`}
                              placeholder="EX: PROMO10"
                            />
                          </Field>

                          <Field
                            label="Tipo de desconto *"
                            htmlFor={`lot-${index}-coupon-${cIdx}-type`}
                          >
                            <select
                              id={`lot-${index}-coupon-${cIdx}-type`}
                              value={coupon.type}
                              onChange={(e) =>
                                onChangeCoupon({
                                  lotRowId: lot.rowId,
                                  couponRowId: coupon.rowId,
                                  field: "type",
                                  value: e.target.value as "percentual" | "valor_fixo",
                                })
                              }
                              className={selectCls}
                            >
                              <option value="percentual">Percentual (%)</option>
                              <option value="valor_fixo">Valor fixo (R$)</option>
                            </select>
                          </Field>

                          <Field
                            label={
                              coupon.type === "percentual"
                                ? "Desconto (%) *"
                                : "Desconto (R$) *"
                            }
                            htmlFor={`lot-${index}-coupon-${cIdx}-discountValue`}
                            error={errors[`lots.${index}.coupons.${cIdx}.discountValue`]}
                          >
                            <input
                              id={`lot-${index}-coupon-${cIdx}-discountValue`}
                              type="number"
                              min="0.01"
                              step={coupon.type === "percentual" ? "1" : "0.01"}
                              max={coupon.type === "percentual" ? "100" : lot.price || undefined}
                              value={coupon.discountValue}
                              onChange={(e) =>
                                onChangeCoupon({
                                  lotRowId: lot.rowId,
                                  couponRowId: coupon.rowId,
                                  field: "discountValue",
                                  value: e.target.value,
                                })
                              }
                              className={inputClass}
                              placeholder={coupon.type === "percentual" ? "10" : "0,00"}
                            />
                          </Field>

                          <Field
                            label="Limite de usos"
                            htmlFor={`lot-${index}-coupon-${cIdx}-maxUses`}
                            error={errors[`lots.${index}.coupons.${cIdx}.maxUses`]}
                          >
                            <input
                              id={`lot-${index}-coupon-${cIdx}-maxUses`}
                              type="number"
                              min="1"
                              step="1"
                              value={coupon.maxUses}
                              onChange={(e) =>
                                onChangeCoupon({
                                  lotRowId: lot.rowId,
                                  couponRowId: coupon.rowId,
                                  field: "maxUses",
                                  value: e.target.value,
                                })
                              }
                              className={inputClass}
                              placeholder="Ilimitado se vazio"
                            />
                          </Field>

                          <Field
                            label="Início da validade *"
                            htmlFor={`lot-${index}-coupon-${cIdx}-startAt`}
                            error={errors[`lots.${index}.coupons.${cIdx}.startAt`]}
                          >
                            <input
                              id={`lot-${index}-coupon-${cIdx}-startAt`}
                              type="datetime-local"
                              value={coupon.startAt}
                              onChange={(e) =>
                                onChangeCoupon({
                                  lotRowId: lot.rowId,
                                  couponRowId: coupon.rowId,
                                  field: "startAt",
                                  value: e.target.value,
                                })
                              }
                              className={inputClass}
                            />
                          </Field>

                          <Field
                            label="Término da validade *"
                            htmlFor={`lot-${index}-coupon-${cIdx}-endAt`}
                            error={errors[`lots.${index}.coupons.${cIdx}.endAt`]}
                          >
                            <input
                              id={`lot-${index}-coupon-${cIdx}-endAt`}
                              type="datetime-local"
                              value={coupon.endAt}
                              onChange={(e) =>
                                onChangeCoupon({
                                  lotRowId: lot.rowId,
                                  couponRowId: coupon.rowId,
                                  field: "endAt",
                                  value: e.target.value,
                                })
                              }
                              className={inputClass}
                            />
                          </Field>

                          <div className="sm:col-span-3 grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
                            <Field
                              label="Vincular a E-mails específicos (opcional)"
                              htmlFor={`lot-${index}-coupon-${cIdx}-allowedEmailsText`}
                              error={errors[`lots.${index}.coupons.${cIdx}.allowedEmailsText`]}
                            >
                              <textarea
                                id={`lot-${index}-coupon-${cIdx}-allowedEmailsText`}
                                rows={2}
                                value={coupon.allowedEmailsText}
                                onChange={(e) =>
                                  onChangeCoupon({
                                    lotRowId: lot.rowId,
                                    couponRowId: coupon.rowId,
                                    field: "allowedEmailsText",
                                    value: e.target.value,
                                  })
                                }
                                className={textAreaClass}
                                placeholder="Deixe vazio para qualquer participante, ou informe e-mails separados por vírgula ou linha"
                              />
                            </Field>

                            <Field
                              label="Vincular a CPFs específicos (opcional)"
                              htmlFor={`lot-${index}-coupon-${cIdx}-allowedCpfsText`}
                              error={errors[`lots.${index}.coupons.${cIdx}.allowedCpfsText`]}
                            >
                              <textarea
                                id={`lot-${index}-coupon-${cIdx}-allowedCpfsText`}
                                rows={2}
                                value={coupon.allowedCpfsText}
                                onChange={(e) =>
                                  onChangeCoupon({
                                    lotRowId: lot.rowId,
                                    couponRowId: coupon.rowId,
                                    field: "allowedCpfsText",
                                    value: e.target.value,
                                  })
                                }
                                className={textAreaClass}
                                placeholder="Deixe vazio para qualquer participante, ou informe CPFs separados por vírgula ou linha"
                              />
                            </Field>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-app-muted-foreground italic">
                    Nenhum cupom cadastrado para este lote.
                  </p>
                )}
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
  totalRegistrations = 0,
  fieldsChanged = false,
  onAdd,
  onChange,
  onRemove,
}: {
  fields: FieldDraft[];
  totalRegistrations?: number;
  fieldsChanged?: boolean;
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
        {totalRegistrations > 0 ? (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-app-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-app-foreground"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">
                Este evento já possui {totalRegistrations} inscrição(ões)
                registrada(s).
              </p>
              <p className="mt-0.5 text-app-muted-foreground">
                {fieldsChanged
                  ? "Você alterou os campos do formulário. Ao salvar, você precisará confirmar esta alteração, pois mudanças nos campos podem impactar a padronização em relação às inscrições já preenchidas."
                  : "A edição, adição ou remoção de campos é permitida, mas pode impactar a padronização em relação às inscrições já preenchidas."}
              </p>
            </div>
          </div>
        ) : null}
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
  const confirmedCount = params.confirmedCount ?? 0;
  if (!Number.isInteger(maxCapacity) || maxCapacity <= 0) {
    errors.maxCapacity = "A capacidade precisa ser maior que zero.";
  } else if (maxCapacity < confirmedCount) {
    errors.maxCapacity = `A capacidade máxima não pode ser menor que a quantidade de inscrições já confirmadas (${confirmedCount}).`;
  }
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
  if (draft.chargeType === "pago" && draft.paymentMode === "pix_manual") {
    if (!draft.pixCode.trim())
      errors.pixCode = "Informe o código PIX Copia e Cola.";
    if (!draft.pixQrCodeUrl.trim())
      errors.pixQrCodeUrl = "Anexe a imagem do QR Code para o PIX.";
    if (
      draft.pixNotificationEmail.trim() &&
      Email.create(draft.pixNotificationEmail.trim()).isFailure
    ) {
      errors.pixNotificationEmail = "Informe um e-mail válido para notificação.";
    }
  }
  const seenCouponCodes = new Set<string>();
  const lots =
    draft.chargeType === "pago"
      ? draft.lots.map((lot, lotIndex) => {
          const lotPriceCents = Math.round(Number(lot.price) * 100);
          const lotStart = parseSilentDate(lot.startAt);
          const lotEnd = parseSilentDate(lot.endAt);
          if (!lot.name.trim()) {
            errors[`lots.${lotIndex}.name`] = "Informe o nome do lote.";
          }
          if (isNaN(lotPriceCents) || lotPriceCents <= 0) {
            errors[`lots.${lotIndex}.price`] = "Informe um valor válido para o lote.";
          }
          const qty = Number(lot.quantity);
          if (!Number.isInteger(qty) || qty <= 0) {
            errors[`lots.${lotIndex}.quantity`] = "Informe uma quantidade válida para o lote.";
          }
          if (!lot.startAt || isNaN(lotStart.getTime())) {
            errors[`lots.${lotIndex}.startAt`] = "Informe o início do lote.";
          }
          if (!lot.endAt || isNaN(lotEnd.getTime())) {
            errors[`lots.${lotIndex}.endAt`] = "Informe o término do lote.";
          }
          if (!isNaN(lotStart.getTime()) && !isNaN(lotEnd.getTime()) && lotEnd <= lotStart) {
            errors[`lots.${lotIndex}.endAt`] = "O término do lote deve ser posterior ao início.";
          }

          const coupons = (lot.coupons ?? []).map((coupon, couponIndex) => {
            const rawCode = coupon.code.trim().toUpperCase();
            if (!rawCode) {
              errors[`lots.${lotIndex}.coupons.${couponIndex}.code`] = "Informe o código do cupom.";
            } else if (!/^[A-Z0-9]+$/.test(rawCode)) {
              errors[`lots.${lotIndex}.coupons.${couponIndex}.code`] =
                "O código deve conter apenas letras e números (sem espaços ou acentos).";
            } else if (seenCouponCodes.has(rawCode)) {
              errors[`lots.${lotIndex}.coupons.${couponIndex}.code`] =
                `O código “${rawCode}” já está sendo utilizado em outro cupom do evento.`;
            } else {
              seenCouponCodes.add(rawCode);
            }

            const couponStart = coupon.startAt ? parseSilentDate(coupon.startAt) : null;
            const couponEnd = coupon.endAt ? parseSilentDate(coupon.endAt) : null;
            if (!coupon.startAt || !couponStart || isNaN(couponStart.getTime())) {
              errors[`lots.${lotIndex}.coupons.${couponIndex}.startAt`] =
                "Informe o início da validade.";
            }
            if (!coupon.endAt || !couponEnd || isNaN(couponEnd.getTime())) {
              errors[`lots.${lotIndex}.coupons.${couponIndex}.endAt`] =
                "Informe o término da validade.";
            }
            if (
              couponStart &&
              couponEnd &&
              !isNaN(couponStart.getTime()) &&
              !isNaN(couponEnd.getTime())
            ) {
              if (couponEnd <= couponStart) {
                errors[`lots.${lotIndex}.coupons.${couponIndex}.endAt`] =
                  "O término da validade deve ocorrer após o início.";
              }
              if (!isNaN(lotStart.getTime()) && couponStart < lotStart) {
                errors[`lots.${lotIndex}.coupons.${couponIndex}.startAt`] =
                  "O início do cupom não pode ser anterior ao início do lote.";
              }
              if (!isNaN(lotEnd.getTime()) && couponEnd > lotEnd) {
                errors[`lots.${lotIndex}.coupons.${couponIndex}.endAt`] =
                  "O término do cupom não pode ser posterior ao término do lote.";
              }
            }

            const rawVal = Number(coupon.discountValue);
            let discountValueNumber = 0;
            if (!coupon.discountValue || isNaN(rawVal) || rawVal <= 0) {
              errors[`lots.${lotIndex}.coupons.${couponIndex}.discountValue`] =
                "Informe um valor de desconto válido maior que zero.";
            } else if (coupon.type === "percentual") {
              if (rawVal > 100) {
                errors[`lots.${lotIndex}.coupons.${couponIndex}.discountValue`] =
                  "O desconto percentual não pode exceder 100%.";
              }
              discountValueNumber = Math.round(rawVal);
            } else {
              const valCents = Math.round(rawVal * 100);
              if (lotPriceCents > 0 && valCents > lotPriceCents) {
                errors[`lots.${lotIndex}.coupons.${couponIndex}.discountValue`] =
                  "O desconto não pode exceder o valor total do lote.";
              }
              discountValueNumber = valCents;
            }

            let maxUsesNumber: number | null = null;
            if (coupon.maxUses && coupon.maxUses.trim()) {
              const uses = Number(coupon.maxUses);
              if (!Number.isInteger(uses) || uses <= 0) {
                errors[`lots.${lotIndex}.coupons.${couponIndex}.maxUses`] =
                  "O limite de usos deve ser um número inteiro maior que zero.";
              } else {
                maxUsesNumber = uses;
              }
            }

            const allowedEmails = coupon.allowedEmailsText
              ? coupon.allowedEmailsText
                  .split(/[\n,;]+/)
                  .map((e) => e.trim().toLowerCase())
                  .filter(Boolean)
              : [];
            for (const email of allowedEmails) {
              if (Email.create(email).isFailure) {
                errors[`lots.${lotIndex}.coupons.${couponIndex}.allowedEmailsText`] =
                  `E-mail inválido: “${email}”.`;
                break;
              }
            }

            const allowedCpfs = coupon.allowedCpfsText
              ? coupon.allowedCpfsText
                  .split(/[\n,;]+/)
                  .map((c) => c.replace(/\D/g, ""))
                  .filter(Boolean)
              : [];
            for (const cpf of allowedCpfs) {
              if (Cpf.create(cpf).isFailure) {
                errors[`lots.${lotIndex}.coupons.${couponIndex}.allowedCpfsText`] =
                  `CPF inválido: “${cpf}”. Deve conter 11 dígitos.`;
                break;
              }
            }

            return {
              id: coupon.id || coupon.rowId,
              code: rawCode,
              type: coupon.type,
              discountValue: discountValueNumber,
              maxUses: maxUsesNumber,
              startAt: couponStart ?? new Date(),
              endAt: couponEnd ?? new Date(),
              active: coupon.active,
              allowedEmails,
              allowedCpfs,
            };
          });

          return {
            id: lot.rowId,
            name: lot.name.trim(),
            priceCents: lotPriceCents,
            maxQuantity: Number(lot.quantity),
            startAt: lotStart,
            endAt: lotEnd,
            active: true,
            sortOrder: draft.lots.indexOf(lot),
            coupons,
          };
        })
      : [];
  const fields = draft.fields.map((field, index) => ({
    id: field.rowId,
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
    id: activity.rowId,
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
    paymentMode: draft.paymentMode,
    pixCode:
      draft.chargeType === "pago" && draft.paymentMode === "pix_manual"
        ? draft.pixCode.trim() || null
        : null,
    pixQrCodeUrl:
      draft.chargeType === "pago" && draft.paymentMode === "pix_manual"
        ? draft.pixQrCodeUrl.trim() || null
        : null,
    pixBankName:
      draft.chargeType === "pago" && draft.paymentMode === "pix_manual"
        ? draft.pixBankName.trim() || null
        : null,
    pixBankAgency:
      draft.chargeType === "pago" && draft.paymentMode === "pix_manual"
        ? draft.pixBankAgency.trim() || null
        : null,
    pixBankAccount:
      draft.chargeType === "pago" && draft.paymentMode === "pix_manual"
        ? draft.pixBankAccount.trim() || null
        : null,
    pixBankAccountType:
      draft.chargeType === "pago" && draft.paymentMode === "pix_manual"
        ? draft.pixBankAccountType.trim() || null
        : null,
    pixBankCnpj:
      draft.chargeType === "pago" && draft.paymentMode === "pix_manual"
        ? draft.pixBankCnpj.trim() || null
        : null,
    pixBankAccountHolder:
      draft.chargeType === "pago" && draft.paymentMode === "pix_manual"
        ? draft.pixBankAccountHolder.trim() || null
        : null,
    pixNotificationEmail:
      draft.chargeType === "pago" && draft.paymentMode === "pix_manual"
        ? draft.pixNotificationEmail.trim() || null
        : null,
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

function hasCustomFieldsChanged(
  initial: FieldDraft[],
  current: FieldDraft[],
): boolean {
  if (initial.length !== current.length) return true;
  for (let index = 0; index < initial.length; index += 1) {
    const a = initial[index];
    const b = current[index];
    if (
      a.rowId !== b.rowId ||
      a.label.trim() !== b.label.trim() ||
      a.description.trim() !== b.description.trim() ||
      a.type !== b.type ||
      a.required !== b.required ||
      normalizeOptionsText(a.optionsText) !== normalizeOptionsText(b.optionsText)
    ) {
      return true;
    }
  }
  return false;
}

function normalizeOptionsText(value: string): string {
  return value
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean)
    .join("\n");
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
