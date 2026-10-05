import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@shared/constants/route.constants';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDateTime, formatMoney, maskCpf } from '@client/shared/format';
import { PaymentStatusBadge } from '@client/ui/components/badge.component';
import { Button } from '@client/ui/components/button.component';
import { Card, SectionCard } from '@client/ui/components/card.component';
import { Alert, LoadingBlock } from '@client/ui/components/feedback.component';
import { SelectField, TextField } from '@client/ui/components/form-fields.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { QrCode } from '@client/ui/components/qrcode.component';
import { useParticipant } from '@client/state/participant.state';
import { useToast } from '@client/state/toast.state';
import type { PaymentInstructionsView, PaymentView } from '../../services/payment-api.service';

type CheckoutPageProps = { registrationIdOverride?: string };

/** Pagamento da inscrição: PIX, boleto ou cartão, com status em tempo real (§13–§22). */
export function CheckoutPage({ registrationIdOverride }: CheckoutPageProps = {}) {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const registrationId = registrationIdOverride ?? params.registrationId ?? '';

  const { openSession, isAuthenticated } = useParticipant();
  const [accessEmail, setAccessEmail] = useState('');
  const [accessCpf, setAccessCpf] = useState('');
  const [accessError, setAccessError] = useState<string | null>(null);

  const { data, isLoading, error: loadError, reload } = useAsync(async () => {
    const detail = await api.payments.byRegistration(registrationId);
    return detail;
  }, [registrationId, isAuthenticated]);

  const [method, setMethod] = useState('PIX');
  const [installments, setInstallments] = useState(1);
  const [instructions, setInstructions] = useState<PaymentInstructionsView | null>(null);
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  if (isLoading) return <LoadingBlock label="Carregando pagamento…" />;

  if (loadError && !data) {
    const lacksSession = loadError.toLowerCase().includes('sessão');
    if (lacksSession) {
      return (
        <div className="mx-auto max-w-sm space-y-4">
          <PageHeader title="Confirme seu acesso" description="Confirme o e-mail e o CPF usados na inscrição para acessar o pagamento." />
          <form
            className="space-y-3"
            onSubmit={async (formEvent) => {
              formEvent.preventDefault();
              setAccessError(null);
              try {
                await openSession({ email: accessEmail.trim(), cpf: accessCpf.replace(/\D/g, '') });
                await reload();
              } catch (caught) {
                setAccessError(caught instanceof Error ? caught.message : 'Não encontramos sua inscrição');
              }
            }}
          >
            {accessError && <Alert tone="danger">{accessError}</Alert>}
            <TextField
              label="E-mail"
              type="email"
              required
              value={accessEmail}
              onChange={(event) => setAccessEmail(event.target.value)}
            />
            <TextField
              label="CPF"
              required
              placeholder="000.000.000-00"
              value={accessCpf}
              onChange={(event) => setAccessCpf(maskCpf(event.target.value))}
            />
            <Button type="submit" block>
              Acessar pagamento
            </Button>
          </form>
        </div>
      );
    }
    return <Alert tone="danger" title="Não foi possível carregar o pagamento">{loadError}</Alert>;
  }

  const registration = data?.registration ?? null;
  const hasOpenPayment = (data?.payments ?? []).some((item) => ['PENDENTE', 'AGUARDANDO'].includes(item.status));

  const handleInitiate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.payments.initiate({ registrationId, method, installments });
      setInstructions(result.instructions);
      setPayment(result.payment);
      toast.show({ tone: 'success', title: 'Cobrança gerada', description: `Referência ${result.payment.reference}` });
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível gerar a cobrança');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulate = async () => {
    if (!payment) return;
    try {
      await api.payments.simulate(payment.id);
      toast.show({ tone: 'success', title: 'Pagamento simulado', description: 'Em produção isso vem do PagBank.' });
      await reload();
      void navigate(ROUTES.registrationStatus(registration?.code ?? ''));
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Falha na simulação', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb="Pagamento"
        title="Concluir inscrição"
        description={registration ? `Inscrição ${registration.code} · valor ${formatMoney(registration.finalAmountCents)}` : undefined}
      />

      {registration?.reservationExpiresAt && (
        <Alert tone="warning" title="Reserva temporária de vaga">
          <p>Sua vaga fica reservada até {formatDateTime(registration.reservationExpiresAt)}. Após esse prazo ela volta a ficar disponível.</p>
        </Alert>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      {!instructions && !hasOpenPayment && (
        <SectionCard title="Forma de pagamento">
          <div className="space-y-3">
            <SelectField
              label="Como deseja pagar?"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              options={[
                { value: 'PIX', label: 'PIX (aprovação imediata)' },
                { value: 'BOLETO', label: 'Boleto bancário' },
                { value: 'CARTAO_CREDITO', label: 'Cartão de crédito' },
              ]}
            />
            {method === 'CARTAO_CREDITO' && (
              <SelectField
                label="Parcelamento"
                value={String(installments)}
                onChange={(event) => setInstallments(Number(event.target.value))}
                options={Array.from({ length: 12 }, (_, index) => index + 1).map((count) => ({
                  value: String(count),
                  label: `${count}x`,
                }))}
              />
            )}
            <Button block isLoading={isSubmitting} onClick={() => void handleInitiate()}>
              Gerar cobrança
            </Button>
            <p className="text-[12px] text-app-muted">
              Não armazenamos dados do seu cartão: PAN e CVV ficam exclusivamente com o PagBank.
            </p>
          </div>
        </SectionCard>
      )}

      {hasOpenPayment && !instructions && (
        <SectionCard title="Cobrança em aberto">
          <ul className="space-y-2">
            {(data?.payments ?? []).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-[8px] border border-app-border px-3 py-2 text-[13px]">
                <div>
                  <p className="font-medium">{item.methodLabel}</p>
                  <p className="text-[12px] text-app-muted">{item.reference}</p>
                </div>
                <div className="text-right">
                  <p>{item.amountFormatted}</p>
                  <PaymentStatusBadge status={item.status} />
                </div>
              </li>
            ))}
          </ul>
          <Button className="mt-3" variant="secondary" block onClick={() => void reload()}>
            Atualizar status
          </Button>
        </SectionCard>
      )}

      {instructions && (
        <SectionCard title="Pague agora">
          <div className="space-y-3">
            {instructions.qrCode && (
              <div className="flex flex-col items-center gap-3">
                <QrCode value={instructions.qrCode} label="Escaneie com o app do banco" />
                <textarea
                  readOnly
                  value={instructions.qrCode}
                  className="h-20 w-full rounded-[8px] border border-app-border bg-app-surface-elevated p-2 text-[12px]"
                />
              </div>
            )}
            {instructions.boletoLine && (
              <Card className="p-3">
                <p className="text-[12px] text-app-muted">Linha digitável</p>
                <p className="break-all text-[13px]">{instructions.boletoLine}</p>
                {instructions.boletoDueDate && (
                  <p className="mt-1 text-[12px] text-app-muted">Vencimento em {formatDateTime(instructions.boletoDueDate)}</p>
                )}
              </Card>
            )}
            {instructions.expiresAt && (
              <p className="text-[12px] text-app-muted">Válido até {formatDateTime(instructions.expiresAt)}.</p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" block onClick={() => void reload()}>
                Já paguei / atualizar
              </Button>
              <Button block onClick={() => void handleSimulate()}>
                Simular confirmação
              </Button>
            </div>
            <p className="text-[12px] text-app-muted">
              Em produção, a confirmação chega pelo webhook do PagBank e a inscrição é confirmada automaticamente.
            </p>
          </div>
        </SectionCard>
      )}

      <Link to={ROUTES.registrationStatus(registration?.code ?? '')}>
        <Button variant="ghost" block>
          Ver status da inscrição
        </Button>
      </Link>
    </div>
  );
}
