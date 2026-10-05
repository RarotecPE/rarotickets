import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@shared/constants/route.constants';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDate, formatMoney, maskCpf, maskPhone } from '@client/shared/format';
import { Button } from '@client/ui/components/button.component';
import { Alert, ErrorBlock, LoadingBlock } from '@client/ui/components/feedback.component';
import { CheckboxField, SelectField, TextField, TextareaField } from '@client/ui/components/form-fields.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { useParticipant } from '@client/state/participant.state';
import { useToast } from '@client/state/toast.state';
import type { EventFormFieldView } from '@modules/event/client/services/event-api.service';

type AnswerMap = Record<string, string>;

/** Inscrição pública: formulário dinâmico (§5, §7, §8) e envio único. */
export function RegistrationPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { openSession } = useParticipant();
  const { data, error, isLoading, reload } = useAsync(() => api.events.getPublic(slug), [slug]);

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [person, setPerson] = useState({ name: '', email: '', cpf: '', phone: '', city: '', state: '', company: '', jobTitle: '' });
  const [marketing, setMarketing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponPreview, setCouponPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const fields = useMemo(() => (data?.formFields ?? []).filter((field) => field.isActive), [data]);

  if (isLoading) return <LoadingBlock label="Carregando inscrição…" />;
  if (error || !data) return <ErrorBlock message={error ?? 'Evento não encontrado'} onRetry={() => void reload()} />;

  const { event, currentLote, isRegistrationOpen } = data;
  const baseCents = currentLote?.priceCents ?? 0;

  /** Versão vigente de cada consentimento vem do servidor (§37, §38). */
  const consentVersion = (type: string) =>
    data.consents.find((consent) => consent.type === type)?.version ?? '2026-01';

  const setAnswer = (fieldKey: string, value: string) =>
    setAnswers((current) => ({ ...current, [fieldKey]: value }));

  const buildPayload = () => ({
    eventId: event.id,
    participant: {
      name: person.name,
      email: person.email,
      cpf: person.cpf,
      phone: person.phone || null,
      city: person.city || null,
      state: person.state || null,
      company: person.company || null,
      jobTitle: person.jobTitle || null,
    },
    answers: Object.entries(answers).map(([fieldKey, value]) => ({ fieldKey, value })),
    consents: {
      termsVersion: consentVersion('TERMOS_DE_USO'),
      privacyVersion: consentVersion('POLITICA_DE_PRIVACIDADE'),
      marketingAccepted: marketing,
    },
    couponCode: couponCode.trim() ? couponCode.trim() : null,
  });

  const handleValidateCoupon = async () => {
    setCouponPreview(null);
    try {
      const result = await api.coupons.validate({ eventId: event.id, code: couponCode.trim(), amountCents: baseCents });
      setCouponPreview(
        result.isCourtesy
          ? 'Cortesia aplicada: sua inscrição será confirmada sem cobrança.'
          : `Desconto de ${result.discountFormatted} — valor final ${result.finalAmountFormatted}.`,
      );
    } catch (caught) {
      setCouponPreview(caught instanceof Error ? caught.message : 'Cupom inválido');
    }
  };

  const handleSubmit = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await api.registrations.register(buildPayload());
      toast.show({
        tone: 'success',
        title: 'Inscrição registrada',
        description: `Seu código é ${result.registration.code}.`,
      });
      // Abre a sessão do participante para liberar pagamento, credencial e área do participante.
      try {
        await openSession({ email: person.email, cpf: person.cpf.replace(/\D/g, '') });
      } catch {
        // Segue para o acompanhamento público pelo código caso a sessão não possa ser aberta.
      }
      if (result.requiresPayment) {
        void navigate(ROUTES.eventCheckout(event.slug, result.registration.id));
      } else if (result.waitlisted) {
        void navigate(ROUTES.registrationStatus(result.registration.code));
      } else {
        void navigate(ROUTES.registrationStatus(result.registration.code));
      }
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Não foi possível concluir a inscrição');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isRegistrationOpen) {
    return (
      <Alert tone="warning" title="Inscrições indisponíveis">
        Este evento não está com inscrições abertas neste momento.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb={event.title}
        title="Inscrição"
        description={
          baseCents > 0
            ? `Investimento: ${formatMoney(baseCents)} (${currentLote?.name ?? 'lote atual'})`
            : 'Evento gratuito — inscrição confirmada na hora.'
        }
      />

      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && <Alert tone="danger">{formError}</Alert>}

        <section className="rounded-[12px] border border-app-border bg-app-surface p-4">
          <h2 className="mb-3 text-[15px] font-semibold">Seus dados</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Nome completo"
              required
              value={person.name}
              onChange={(event_) => setPerson({ ...person, name: event_.target.value })}
            />
            <TextField
              label="E-mail"
              type="email"
              required
              value={person.email}
              onChange={(event_) => setPerson({ ...person, email: event_.target.value })}
            />
            <TextField
              label="CPF"
              required
              placeholder="000.000.000-00"
              value={person.cpf}
              onChange={(event_) => setPerson({ ...person, cpf: maskCpf(event_.target.value) })}
            />
            <TextField
              label="Telefone/WhatsApp"
              placeholder="(00) 00000-0000"
              value={person.phone}
              onChange={(event_) => setPerson({ ...person, phone: maskPhone(event_.target.value) })}
            />
            <TextField
              label="Cidade"
              value={person.city}
              onChange={(event_) => setPerson({ ...person, city: event_.target.value })}
            />
            <TextField
              label="UF"
              maxLength={2}
              value={person.state}
              onChange={(event_) => setPerson({ ...person, state: event_.target.value.toUpperCase() })}
            />
          </div>
        </section>

        {fields.length > 0 && (
          <section className="rounded-[12px] border border-app-border bg-app-surface p-4">
            <h2 className="mb-3 text-[15px] font-semibold">Informações do evento</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <DynamicField
                  key={field.id}
                  field={field}
                  value={answers[field.fieldKey] ?? ''}
                  onChange={(value) => setAnswer(field.fieldKey, value)}
                />
              ))}
            </div>
          </section>
        )}

        {baseCents > 0 && (
          <section className="rounded-[12px] border border-app-border bg-app-surface p-4">
            <h2 className="mb-3 text-[15px] font-semibold">Cupom de desconto</h2>
            <div className="flex gap-2">
              <div className="flex-1">
                <TextField
                  placeholder="Código do cupom"
                  aria-label="Cupom"
                  value={couponCode}
                  onChange={(event_) => setCouponCode(event_.target.value.toUpperCase())}
                />
              </div>
              <Button type="button" variant="secondary" onClick={() => void handleValidateCoupon()}>
                Aplicar
              </Button>
            </div>
            {couponPreview && (
              <p className="mt-2 text-[12px] text-app-muted" role="status">
                {couponPreview}
              </p>
            )}
          </section>
        )}

        <section className="space-y-3 rounded-[12px] border border-app-border bg-app-surface p-4">
          <h2 className="text-[15px] font-semibold">Consentimentos (LGPD)</h2>
          <CheckboxField
            required
            checked
            disabled
            label="Aceito os termos de uso e a política de privacidade do evento (obrigatório)."
          />
          <CheckboxField
            checked={marketing}
            onChange={(event_) => setMarketing(event_.target.checked)}
            label="Quero receber novidades e comunicações de marketing (opcional)."
          />
          <p className="text-[12px] text-app-muted">
            Registramos tipo, versão, data e hora do seu consentimento. Você pode revisar isso na sua área.
          </p>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link to={ROUTES.eventDetail(event.slug)}>
            <Button variant="secondary" block type="button">
              Voltar
            </Button>
          </Link>
          <Button type="submit" isLoading={isSubmitting} block>
            {baseCents > 0 ? 'Continuar para pagamento' : 'Confirmar inscrição'}
          </Button>
        </div>
      </form>
    </div>
  );
}

type DynamicFieldProps = { field: EventFormFieldView; value: string; onChange: (value: string) => void };

/** Renderiza os 13 tipos de campo do formulário dinâmico (§5). */
function DynamicField({ field, value, onChange }: DynamicFieldProps) {
  const common = { label: field.label, hint: field.description ?? undefined, required: field.isRequired };

  switch (field.fieldType) {
    case 'TEXTO_LONGO':
      return (
        <div className="sm:col-span-2">
          <TextareaField {...common} placeholder={field.placeholder ?? undefined} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'SELECAO':
    case 'ESCOLHA_UNICA':
      return (
        <SelectField
          {...common}
          placeholder="Selecione"
          options={field.options.map((option) => ({ value: option, label: option }))}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'MULTIPLA_ESCOLHA': {
      const selected = value ? value.split('|') : [];
      return (
        <fieldset className="sm:col-span-2">
          <legend className="mb-1 text-[13px] font-medium">
            {field.label}
            {field.isRequired && <span className="text-app-danger"> *</span>}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {field.options.map((option) => (
              <CheckboxField
                key={option}
                label={option}
                checked={selected.includes(option)}
                onChange={(e) => {
                  const next = e.target.checked ? [...selected, option] : selected.filter((item) => item !== option);
                  onChange(next.join('|'));
                }}
              />
            ))}
          </div>
        </fieldset>
      );
    }
    case 'SIM_NAO':
      return (
        <SelectField
          {...common}
          placeholder="Selecione"
          options={[
            { value: 'SIM', label: 'Sim' },
            { value: 'NAO', label: 'Não' },
          ]}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'DATA':
      return <TextField {...common} type="date" value={value} onChange={(e) => onChange(e.target.value)} />;
    case 'NUMERO':
      return <TextField {...common} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} />;
    case 'EMAIL':
      return <TextField {...common} type="email" value={value} onChange={(e) => onChange(e.target.value)} />;
    case 'TELEFONE':
      return (
        <TextField
          {...common}
          inputMode="tel"
          placeholder="(00) 00000-0000"
          value={value}
          onChange={(e) => onChange(maskPhone(e.target.value))}
        />
      );
    case 'CPF':
      return (
        <TextField
          {...common}
          placeholder="000.000.000-00"
          value={value}
          onChange={(e) => onChange(maskCpf(e.target.value))}
        />
      );
    case 'ARQUIVO':
      return (
        <TextField
          {...common}
          hint={field.description ?? 'Informe o link do arquivo enviado para a organização.'}
          placeholder="https://…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return <TextField {...common} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}
