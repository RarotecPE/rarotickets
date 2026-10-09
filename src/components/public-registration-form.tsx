"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, FileUp, LoaderCircle, LogIn, TicketCheck, UserCheck, UserPlus } from "lucide-react";
import { ApiError } from "@/client/services/api-service.base";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import type { PublicRegistrationResult } from "@/client/services/ticketing-api.service";
import { useParticipantAuth } from "@/components/participant-auth-provider";
import { Badge, Button, Field, InlineAlert, Panel, PanelHeader, inputCls, selectCls, textareaCls } from "@/components/ui";
import { Cpf } from "@/modules/ticketing/domain/participants/value-objects/cpf.vo";
import { Email } from "@/modules/ticketing/domain/participants/value-objects/email.vo";
import { Phone } from "@/modules/ticketing/domain/participants/value-objects/phone.vo";
import { ParticipantName } from "@/modules/ticketing/domain/participants/value-objects/participant-name.vo";
import { RegistrationFormDomainService } from "@/modules/ticketing/domain/registrations/services/registration-form.domain-service";
import type { FormFieldDefinition } from "@/modules/ticketing/domain/registrations/services/registration-form.domain-service";
import type { EventReadModel } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import { formatCurrency, formatDate } from "@/lib/utils";

export type PublicRegistrationFormProps = { event: EventReadModel };
type ParticipantFormState = { name: string; cpf: string; email: string; phone: string; birthDate: string; company: string; jobTitle: string };
type ParticipantFormErrors = Partial<Record<keyof ParticipantFormState | "termsConsent", string>>;
type CreateRegistrationParams = { event: EventReadModel; participant: ParticipantFormState; answers: Record<string, unknown>; files: Record<string, File>; lotId: string | null; couponCode: string; marketingConsent: boolean };
type CustomRegistrationFieldProps = { field: EventReadModel["formFields"][number]; value: unknown; file?: File; error?: string; onChange: (value: unknown) => void; onFileChange: (file: File | undefined) => void };

const registrationFormValidator = new RegistrationFormDomainService();
const CUSTOM_INPUT_CLASS = `${inputCls} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary`;
const CUSTOM_TEXTAREA_CLASS = `${textareaCls} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary`;
const FILE_ACCEPT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

export function PublicRegistrationForm({ event }: PublicRegistrationFormProps) {
  const { participant: authParticipant, isAuthenticated, isLoading: authLoading } = useParticipantAuth();
  const [participantOverrides, setParticipantOverrides] = useState<Partial<ParticipantFormState>>({});
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [lotId, setLotId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [termsConsent, setTermsConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [participantErrors, setParticipantErrors] = useState<ParticipantFormErrors>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [created, setCreated] = useState<PublicRegistrationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const participant: ParticipantFormState = {
    name: participantOverrides.name ?? authParticipant?.name ?? "",
    email: participantOverrides.email ?? authParticipant?.email ?? "",
    cpf: participantOverrides.cpf ?? authParticipant?.cpf ?? "",
    phone: participantOverrides.phone ?? authParticipant?.phone ?? "",
    birthDate: participantOverrides.birthDate ?? "",
    company: participantOverrides.company ?? "",
    jobTitle: participantOverrides.jobTitle ?? "",
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const registrationStart = toDate(event.props.registrationStartAt);
  const registrationEnd = toDate(event.props.registrationEndAt);
  const eventPublished = event.props.status === "agendado" || event.props.status === "inscricoes_abertas";
  const registrationOpen = eventPublished && now >= registrationStart && now <= registrationEnd;
  const remaining = Math.max(0, event.props.maxCapacity - event.capacity.confirmed - event.capacity.reserved);
  const isWaitlist = remaining === 0 && event.props.allowsWaitlist;
  const availableLots = event.lots.filter((lot) => lot.active && now >= toDate(lot.startAt) && now <= toDate(lot.endAt) && lot.soldCount < lot.maxQuantity);
  const requiresLot = event.props.chargeType === "pago" && !isWaitlist;

  function updateParticipant<K extends keyof ParticipantFormState>(field: K, value: ParticipantFormState[K]): void {
    setParticipantOverrides((current) => ({ ...current, [field]: value }));
  }

  function updateAnswer(fieldId: string, value: unknown): void {
    setAnswers((current) => ({ ...current, [fieldId]: value }));
    setFieldErrors((current) => ({ ...current, [fieldId]: "" }));
  }

  function updateFile(fieldId: string, file: File | undefined): void {
    setFiles((current) => {
      const next = { ...current };
      if (file) next[fieldId] = file;
      else delete next[fieldId];
      return next;
    });
    setFieldErrors((current) => ({ ...current, [fieldId]: "" }));
  }

  async function submitRegistration(eventForm: FormEvent<HTMLFormElement>): Promise<void> {
    eventForm.preventDefault();
    setGeneralError(null);
    const validation = validateRegistration({ event, participant, answers, files, lotId, termsConsent });
    setParticipantErrors(validation.participantErrors);
    setFieldErrors(validation.fieldErrors);
    if (validation.error || Object.keys(validation.participantErrors).length || Object.keys(validation.fieldErrors).length) {
      setGeneralError(validation.error ?? "Revise os campos destacados antes de continuar.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createRegistration({ event, participant, answers: validation.answers, files, lotId: requiresLot ? lotId : null, couponCode, marketingConsent });
      setCreated(result);
    } catch (caught) {
      const apiErrors = readApiFieldErrors(caught);
      if (apiErrors) setFieldErrors(apiErrors);
      setGeneralError(caught instanceof Error ? caught.message : "Não foi possível concluir a inscrição.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) return <RegistrationConfirmation result={created} />;
  if (!registrationOpen) return <RegistrationAvailability event={event} now={now} />;
  if (remaining === 0 && !event.props.allowsWaitlist) return <Panel><PanelHeader title="Inscrições indisponíveis" /><div className="p-4"><InlineAlert tone="danger">As vagas deste evento se esgotaram e não há lista de espera.</InlineAlert></div></Panel>;
  if (requiresLot && availableLots.length === 0) return <Panel><PanelHeader title="Lotes indisponíveis" /><div className="p-4"><InlineAlert>Não há lotes com vagas disponíveis neste momento. Tente novamente mais tarde.</InlineAlert></div></Panel>;

  if (!authLoading && !isAuthenticated) {
    return <Panel>
      <PanelHeader title={isWaitlist ? "Entrar na lista de espera" : "Inscrição no evento"} description="Para participar dos eventos, é obrigatório estar cadastrado e conectado." />
      <div className="space-y-4 p-4 sm:p-5">
        <InlineAlert tone="info">Para garantir sua vaga e acessar sua credencial, você precisa estar conectado à sua conta de participante.</InlineAlert>
        <div className="space-y-2 pt-2">
          <Link href={`/participante/cadastro?redirect=/eventos/${encodeURIComponent(event.props.slug)}`} className="flex h-10 w-full items-center justify-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Cadastre-se para se inscrever
          </Link>
          <Link href={`/participante/login?redirect=/eventos/${encodeURIComponent(event.props.slug)}`} className="flex h-10 w-full items-center justify-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-4 text-sm font-semibold text-app-foreground transition hover:bg-app-surface">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Já possui cadastro? Fazer login
          </Link>
        </div>
        <p className="text-center text-xs text-app-muted-foreground">O cadastro leva menos de um minuto e é gratuito.</p>
      </div>
    </Panel>;
  }

  return <Panel>
    <PanelHeader title={isWaitlist ? "Entrar na lista de espera" : "Faça sua inscrição"} description={isWaitlist ? "Sua inscrição não gera cobrança enquanto aguarda uma vaga." : "Preencha seus dados para reservar sua vaga."} />
    <form onSubmit={(formEvent) => void submitRegistration(formEvent)} className="space-y-5 p-4 sm:p-5" noValidate>
      {generalError ? <InlineAlert tone="danger">{generalError}</InlineAlert> : null}
      {isWaitlist ? <InlineAlert>O evento está no limite de capacidade. Você pode solicitar uma vaga na lista de espera.</InlineAlert> : null}
      {authParticipant ? <div className="flex items-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated/60 px-3 py-2 text-xs text-app-muted-foreground"><UserCheck className="h-4 w-4 text-app-primary" aria-hidden="true" /><span>Conectado como <strong className="text-app-foreground">{authParticipant.name}</strong> ({authParticipant.email})</span></div> : null}
      <section className="space-y-3"><h3 className="text-xs font-bold uppercase tracking-wide text-app-muted-foreground">Dados da pessoa participante</h3>
        <Field label="Nome completo *" htmlFor="participant-name" error={participantErrors.name}><input id="participant-name" autoComplete="name" value={participant.name} onChange={(change) => updateParticipant("name", change.target.value)} className={CUSTOM_INPUT_CLASS} aria-invalid={Boolean(participantErrors.name)} aria-describedby={participantErrors.name ? "participant-name-error" : undefined} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="CPF *" htmlFor="participant-cpf" error={participantErrors.cpf}><input id="participant-cpf" inputMode="numeric" autoComplete="off" value={participant.cpf} onChange={(change) => updateParticipant("cpf", change.target.value)} placeholder="000.000.000-00" className={CUSTOM_INPUT_CLASS} aria-invalid={Boolean(participantErrors.cpf)} aria-describedby={participantErrors.cpf ? "participant-cpf-error" : undefined} /></Field>
          <Field label="Celular com DDD *" htmlFor="participant-phone" error={participantErrors.phone}><input id="participant-phone" type="tel" autoComplete="tel" value={participant.phone} onChange={(change) => updateParticipant("phone", change.target.value)} placeholder="(81) 99999-9999" className={CUSTOM_INPUT_CLASS} aria-invalid={Boolean(participantErrors.phone)} aria-describedby={participantErrors.phone ? "participant-phone-error" : undefined} /></Field>
        </div>
        <Field label="E-mail *" htmlFor="participant-email" error={participantErrors.email}><input id="participant-email" type="email" autoComplete="email" value={participant.email} onChange={(change) => updateParticipant("email", change.target.value)} placeholder="voce@exemplo.com" className={CUSTOM_INPUT_CLASS} aria-invalid={Boolean(participantErrors.email)} aria-describedby={participantErrors.email ? "participant-email-error" : undefined} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Data de nascimento" htmlFor="participant-birth-date"><input id="participant-birth-date" type="date" autoComplete="bday" value={participant.birthDate} onChange={(change) => updateParticipant("birthDate", change.target.value)} className={CUSTOM_INPUT_CLASS} /></Field>
          <Field label="Empresa / instituição" htmlFor="participant-company"><input id="participant-company" autoComplete="organization" value={participant.company} onChange={(change) => updateParticipant("company", change.target.value)} className={CUSTOM_INPUT_CLASS} /></Field>
        </div>
        <Field label="Cargo" htmlFor="participant-job-title"><input id="participant-job-title" autoComplete="organization-title" value={participant.jobTitle} onChange={(change) => updateParticipant("jobTitle", change.target.value)} className={CUSTOM_INPUT_CLASS} /></Field>
      </section>

      {event.formFields.length ? <section className="space-y-3 border-t border-app-border pt-4"><div><h3 className="text-xs font-bold uppercase tracking-wide text-app-muted-foreground">Informações adicionais</h3><p className="mt-1 text-xs text-app-muted-foreground">Campos definidos pela organização do evento.</p></div>{event.formFields.map((field) => <CustomRegistrationField key={field.id} field={field} value={answers[field.id]} file={files[field.id]} error={fieldErrors[field.id]} onChange={(value) => updateAnswer(field.id, value)} onFileChange={(file) => updateFile(field.id, file)} />)}</section> : null}

      {requiresLot ? <section className="space-y-3 border-t border-app-border pt-4"><h3 className="text-xs font-bold uppercase tracking-wide text-app-muted-foreground">Ingresso e pagamento</h3>
        <Field label="Lote de ingresso *" htmlFor="registration-lot" error={fieldErrors.lotId}>
          <select id="registration-lot" value={lotId} onChange={(change) => setLotId(change.target.value)} className={selectCls} aria-invalid={Boolean(fieldErrors.lotId)} aria-describedby={fieldErrors.lotId ? "registration-lot-error" : undefined}><option value="">Selecione um lote</option>{availableLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.name} · {formatCurrency({ cents: lot.priceCents })} · {Math.max(0, lot.maxQuantity - lot.soldCount)} disponíveis</option>)}</select>
        </Field>
        <Field label="Cupom de desconto" htmlFor="registration-coupon" hint="Opcional. Cupons são validados no envio da inscrição."><input id="registration-coupon" value={couponCode} onChange={(change) => setCouponCode(change.target.value.toUpperCase())} autoCapitalize="characters" className={CUSTOM_INPUT_CLASS} placeholder="EX.: PROMO20" /></Field>
        <p className="text-xs text-app-muted-foreground"><Clock3 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />Após o envio, sua reserva fica disponível por 15 minutos para finalizar o pagamento no PagBank.</p>
      </section> : null}

      <section className="space-y-3 border-t border-app-border pt-4">
        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-app-muted-foreground"><input type="checkbox" checked={termsConsent} onChange={(change) => setTermsConsent(change.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-app-primary" aria-invalid={Boolean(participantErrors.termsConsent)} aria-describedby={participantErrors.termsConsent ? "terms-consent-error" : undefined} /><span>Li e aceito os termos de participação e a Política de Privacidade do evento. <span className="text-app-danger">*</span></span></label>
        {participantErrors.termsConsent ? <p id="terms-consent-error" role="alert" className="text-xs text-app-danger">{participantErrors.termsConsent}</p> : null}
        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-app-muted-foreground"><input type="checkbox" checked={marketingConsent} onChange={(change) => setMarketingConsent(change.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-app-primary" /><span>Quero receber novidades e comunicações sobre outros eventos. (opcional)</span></label>
      </section>
      <div className="border-t border-app-border pt-4"><Button type="submit" className="w-full" disabled={submitting}>{submitting ? <><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Enviando inscrição…</> : <><TicketCheck className="h-4 w-4" aria-hidden="true" />{isWaitlist ? "Entrar na lista de espera" : "Confirmar inscrição"}</>}</Button><p className="mt-2 text-center text-[11px] text-app-muted-foreground">Seus dados serão usados para gerenciar esta inscrição.</p></div>
    </form>
  </Panel>;
}

export type RegistrationAvailabilityProps = { event: EventReadModel; now: Date };
function RegistrationAvailability({ event, now }: RegistrationAvailabilityProps) {
  const starts = toDate(event.props.registrationStartAt);
  const ends = toDate(event.props.registrationEndAt);
  const message = now < starts ? `As inscrições abrem em ${formatDate({ value: starts, withTime: true })}.` : now > ends ? "O período de inscrições deste evento foi encerrado." : "As inscrições ainda não estão liberadas para este evento.";
  return <Panel><PanelHeader title="Inscrições" /><div className="space-y-3 p-4"><InlineAlert>{message}</InlineAlert>{event.props.status === "agendado" ? <p className="text-xs text-app-muted-foreground">Acompanhe esta página para saber quando as vagas forem liberadas.</p> : null}</div></Panel>;
}

export type RegistrationConfirmationProps = { result: PublicRegistrationResult };
function RegistrationConfirmation({ result }: RegistrationConfirmationProps) {
  const waitlisted = result.status === "lista_espera";
  const isConfirmed = result.status === "confirmada";
  const statusLabel = waitlisted ? "Lista de espera" : isConfirmed ? "Inscrição confirmada" : "Aguardando pagamento";
  const tone = waitlisted ? "warning" : isConfirmed ? "success" : "primary";
  return <Panel><PanelHeader title={waitlisted ? "Solicitação registrada" : isConfirmed ? "Inscrição realizada" : "Vaga reservada"} /><div className="space-y-4 p-4 sm:p-5"><InlineAlert tone="success"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{waitlisted ? "Você está na lista de espera." : isConfirmed ? "Sua inscrição foi confirmada." : "Sua vaga está reservada por 15 minutos."}</span></InlineAlert><div className="rounded-app-md border border-app-border bg-app-surface-elevated/50 p-3"><p className="text-xs text-app-muted-foreground">Código da inscrição</p><p className="mt-1 font-mono text-sm font-bold text-app-foreground">{result.registrationCode}</p><Badge tone={tone} className="mt-2">{statusLabel}</Badge>{result.finalCents > 0 ? <p className="mt-2 text-xs text-app-muted-foreground">Total: {formatCurrency({ cents: result.finalCents })}</p> : null}</div><div className="flex flex-col gap-2">{result.checkoutUrl ? <a href={result.checkoutUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white hover:brightness-110">Abrir checkout seguro PagBank<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a> : null}<Link href={result.participantUrl} className="inline-flex h-10 items-center justify-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-4 text-sm font-semibold text-app-foreground hover:bg-app-surface">Acessar Área do Participante</Link></div><p className="text-xs text-app-muted-foreground">As instruções também serão enviadas ao e-mail informado.</p></div></Panel>;
}

function CustomRegistrationField({ field, value, file, error, onChange, onFileChange }: CustomRegistrationFieldProps) {
  const inputId = `custom-${field.id}`;
  const errorId = `${inputId}-error`;
  const hint = field.description || undefined;
  const describedBy = [hint ? `${inputId}-hint` : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined;
  const requiredLabel = `${field.label}${field.required ? " *" : ""}`;
  const fieldHint = field.type === "arquivo" ? `${hint ? `${hint} ` : ""}PDF, PNG ou JPG; até 10 MB.` : hint;
  const commonInputProps = { id: inputId, "aria-invalid": Boolean(error), "aria-describedby": describedBy, required: field.required };
  const textValue = typeof value === "string" ? value : "";
  const render = customFieldControl({ field, value, file, error, onChange, onFileChange, inputId, commonInputProps });
  return <Field label={requiredLabel} htmlFor={field.type === "checkbox" ? `${inputId}-option-0` : inputId} hint={fieldHint} hintId={fieldHint ? `${inputId}-hint` : undefined} error={error} errorId={errorId}><>{render || <input {...commonInputProps} value={textValue} onChange={(change) => onChange(change.target.value)} className={CUSTOM_INPUT_CLASS} />}</></Field>;
}

export type CustomFieldControlParams = CustomRegistrationFieldProps & { inputId: string; commonInputProps: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined; required: boolean } };
function customFieldControl(params: CustomFieldControlParams): ReactNode | null {
  const value = params.value;
  const textValue = typeof value === "string" ? value : "";
  if (params.field.type === "texto_longo") return <textarea {...params.commonInputProps} rows={3} value={textValue} onChange={(change) => params.onChange(change.target.value)} className={CUSTOM_TEXTAREA_CLASS} />;
  if (params.field.type === "numero") return <input {...params.commonInputProps} type="number" value={textValue} onChange={(change) => params.onChange(change.target.value)} className={CUSTOM_INPUT_CLASS} />;
  if (params.field.type === "data") return <input {...params.commonInputProps} type="date" value={textValue} onChange={(change) => params.onChange(change.target.value)} className={CUSTOM_INPUT_CLASS} />;
  if (params.field.type === "email") return <input {...params.commonInputProps} type="email" value={textValue} onChange={(change) => params.onChange(change.target.value)} className={CUSTOM_INPUT_CLASS} />;
  if (params.field.type === "telefone") return <input {...params.commonInputProps} type="tel" value={textValue} onChange={(change) => params.onChange(change.target.value)} className={CUSTOM_INPUT_CLASS} />;
  if (params.field.type === "cpf") return <input {...params.commonInputProps} inputMode="numeric" value={textValue} onChange={(change) => params.onChange(change.target.value)} className={CUSTOM_INPUT_CLASS} placeholder="000.000.000-00" />;
  if (params.field.type === "cnpj") return <input {...params.commonInputProps} inputMode="numeric" value={textValue} onChange={(change) => params.onChange(change.target.value)} className={CUSTOM_INPUT_CLASS} placeholder="00.000.000/0000-00" />;
  if (params.field.type === "select") return <select {...params.commonInputProps} value={textValue} onChange={(change) => params.onChange(change.target.value)} className={selectCls}><option value="">Selecione uma opção</option>{params.field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  if (params.field.type === "boolean") return <select id={params.inputId} value={typeof value === "boolean" ? String(value) : ""} onChange={(change) => params.onChange(change.target.value === "" ? null : change.target.value === "true")} className={selectCls} aria-invalid={Boolean(params.error)} aria-describedby={params.commonInputProps["aria-describedby"]} required={params.field.required}><option value="">Selecione</option><option value="true">Sim</option><option value="false">Não</option></select>;
  if (params.field.type === "checkbox") return <CheckboxOptions {...params} />;
  if (params.field.type === "arquivo") return <FileField {...params} />;
  return null;
}

export type CheckboxOptionsProps = CustomFieldControlParams;
function CheckboxOptions(params: CheckboxOptionsProps) {
  const selected = Array.isArray(params.value) ? params.value.filter((item): item is string => typeof item === "string") : [];
  return <fieldset className="space-y-2" aria-describedby={params.commonInputProps["aria-describedby"]}><legend className="sr-only">{params.field.label}</legend>{params.field.options.map((option, index) => { const id = `${params.inputId}-option-${index}`; return <label key={option} htmlFor={id} className="flex items-center gap-2 text-sm text-app-muted-foreground"><input id={id} type="checkbox" checked={selected.includes(option)} onChange={(change) => params.onChange(change.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} className="h-4 w-4 accent-app-primary" />{option}</label>; })}</fieldset>;
}

export type FileFieldProps = CustomFieldControlParams;
function FileField(params: FileFieldProps) {
  return <div className="flex min-h-10 items-center gap-3 rounded-app-md border border-app-border bg-app-surface px-3"><FileUp className="h-4 w-4 shrink-0 text-app-muted-foreground" aria-hidden="true" /><input id={params.inputId} type="file" accept={FILE_ACCEPT} required={params.field.required && !params.file} aria-invalid={Boolean(params.error)} aria-describedby={params.commonInputProps["aria-describedby"]} onChange={(change: ChangeEvent<HTMLInputElement>) => params.onFileChange(change.target.files?.[0])} className="min-w-0 flex-1 text-xs text-app-muted-foreground file:mr-3 file:rounded-app-sm file:border-0 file:bg-app-surface-elevated file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-app-foreground" />{params.file ? <span className="max-w-28 truncate text-xs text-app-foreground" title={params.file.name}>{params.file.name}</span> : null}</div>;
}

export type ValidateRegistrationParams = { event: EventReadModel; participant: ParticipantFormState; answers: Record<string, unknown>; files: Record<string, File>; lotId: string; termsConsent: boolean };
export type RegistrationValidation = { participantErrors: ParticipantFormErrors; fieldErrors: Record<string, string>; answers: Record<string, unknown>; error: string | null };
function validateRegistration(params: ValidateRegistrationParams): RegistrationValidation {
  const participantErrors: ParticipantFormErrors = {};
  const nameResult = ParticipantName.create(params.participant.name);
  if (nameResult.isFailure) participantErrors.name = nameResult.error.message;
  if (Email.create(params.participant.email).isFailure) participantErrors.email = "Informe um e-mail válido.";
  if (Cpf.create(params.participant.cpf).isFailure) participantErrors.cpf = "Informe um CPF válido.";
  if (Phone.create(params.participant.phone).isFailure) participantErrors.phone = "Informe um telefone válido com DDD.";
  if (!params.termsConsent) participantErrors.termsConsent = "O aceite dos termos é obrigatório.";
  const answers = { ...params.answers };
  for (const field of params.event.formFields) if (field.type === "arquivo") answers[field.id] = params.files[field.id] ? `file:${field.id}` : undefined;
  const fields: FormFieldDefinition[] = params.event.formFields.map((field) => ({ id: field.id, label: field.label, type: field.type, required: field.required, options: field.options }));
  const formResult = registrationFormValidator.execute({ fields, answers });
  const fieldErrors = formResult.isFailure ? readDomainFieldErrors(formResult.error) : {};
  const requiresLot = params.event.props.chargeType === "pago" && params.event.capacity.confirmed + params.event.capacity.reserved < params.event.props.maxCapacity;
  if (requiresLot && !params.lotId) fieldErrors.lotId = "Selecione um lote de ingresso.";
  const error = Object.keys(participantErrors).length || Object.keys(fieldErrors).length ? "Revise os campos destacados antes de continuar." : null;
  return { participantErrors, fieldErrors, answers: formResult.isSuccess ? formResult.value.answers : answers, error };
}

function readDomainFieldErrors(error: Error): Record<string, string> {
  const details = "details" in error ? error.details : null;
  if (!isRecord(details)) return {};
  return Object.fromEntries(Object.entries(details).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function readApiFieldErrors(error: unknown): Record<string, string> | null {
  if (!(error instanceof ApiError) || !isRecord(error.details)) return null;
  return Object.fromEntries(Object.entries(error.details).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function createRegistration(params: CreateRegistrationParams): Promise<PublicRegistrationResult> {
  const birthDate = params.participant.birthDate ? new Date(`${params.participant.birthDate}T00:00:00.000Z`) : null;
  return ticketingApi.createPublicRegistration({ slug: params.event.props.slug, request: {
    participant: { name: params.participant.name.trim(), cpf: params.participant.cpf, email: params.participant.email, phone: params.participant.phone, birthDate, company: params.participant.company.trim() || null, jobTitle: params.participant.jobTitle.trim() || null, termsConsent: true, marketingConsent: params.marketingConsent },
    answers: params.answers,
    lotId: params.lotId,
    couponCode: params.couponCode.trim() || null,
    files: Object.entries(params.files).map(([fieldId, file]) => ({ fieldId, file })),
  } });
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
