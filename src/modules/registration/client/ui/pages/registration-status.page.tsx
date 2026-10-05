import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '@shared/constants/route.constants';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDateTime, formatMoney } from '@client/shared/format';
import { PaymentStatusBadge, RegistrationStatusBadge } from '@client/ui/components/badge.component';
import { Button } from '@client/ui/components/button.component';
import { Card, SectionCard } from '@client/ui/components/card.component';
import { Alert, ErrorBlock, LoadingBlock } from '@client/ui/components/feedback.component';
import { TextField } from '@client/ui/components/form-fields.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { QrCode } from '@client/ui/components/qrcode.component';
import { useToast } from '@client/state/toast.state';
import type { PaymentView } from '@modules/payment/client/services/payment-api.service';

/** Consulta pública da inscrição pelo código, com credencial e cancelamento (§10–§12, §26, §28). */
export function RegistrationStatusPage() {
  const { code = '' } = useParams();
  const toast = useToast();
  const [search, setSearch] = useState(code);
  const [reason, setReason] = useState('');
  const [isCancelling, setCancelling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const { data, error, isLoading, reload } = useAsync(async () => {
    const detail = await api.registrations.getByCode(code);
    let payments: PaymentView[] = [];
    try {
      const paymentDetail = await api.payments.byRegistration(detail.registration.id);
      payments = paymentDetail.payments;
    } catch {
      payments = [];
    }
    return { ...detail, payments };
  }, [code]);

  const credential = data?.credential ?? null;

  if (isLoading) return <LoadingBlock label="Buscando inscrição…" />;
  if (error || !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Consultar inscrição" description="Informe o código recebido por e-mail para ver os detalhes." />
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            window.location.href = ROUTES.registrationStatus(search.trim().toUpperCase());
          }}
        >
          <div className="flex-1">
            <TextField aria-label="Código da inscrição" placeholder="RT-XXXXXX-0" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
        {error && <ErrorBlock message={error} />}
      </div>
    );
  }

  const { registration, event, participant } = data;

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.registrations.cancelMine({ code: registration.code, reason: reason.trim() || 'Cancelamento solicitado pelo participante' });
      toast.show({ tone: 'success', title: 'Inscrição cancelada', description: 'A vaga foi liberada.' });
      setShowCancel(false);
      await reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Não foi possível cancelar', description: caught instanceof Error ? caught.message : undefined });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb="Inscrição"
        title={registration.code}
        description={event?.title ?? registration.eventTitle ?? ''}
        actions={<RegistrationStatusBadge status={registration.status} />}
      />

      <Card className="p-4">
        <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
          <Row label="Participante" value={participant?.name ?? '—'} />
          <Row label="E-mail" value={participant?.email ?? '—'} />
          <Row label="Valor" value={registration.isCourtesy ? 'Cortesia' : formatMoney(registration.finalAmountCents)} />
          <Row label="Desconto" value={registration.discountCents > 0 ? formatMoney(registration.discountCents) : '—'} />
          {registration.couponCode && <Row label="Cupom" value={registration.couponCode} />}
          <Row label="Inscrição em" value={formatDateTime(registration.createdAt)} />
          {registration.reservationExpiresAt && (
            <Row label="Reserva expira em" value={formatDateTime(registration.reservationExpiresAt)} />
          )}
          {registration.waitlistPosition !== null && (
            <Row label="Posição na lista de espera" value={String(registration.waitlistPosition)} />
          )}
          {registration.checkInAt && <Row label="Check-in" value={formatDateTime(registration.checkInAt)} />}
        </dl>
      </Card>

      {registration.status === 'PENDENTE' && registration.finalAmountCents > 0 && (
        <Alert tone="warning" title="Pagamento pendente">
          <p>Conclua o pagamento para garantir sua vaga. A reserva é liberada automaticamente após o prazo.</p>
          <Link to={ROUTES.eventCheckout(event?.slug ?? '', registration.id)} className="mt-2 inline-block font-medium underline">
            Ir para o pagamento
          </Link>
        </Alert>
      )}

      {registration.status === 'LISTA_ESPERA' && (
        <Alert tone="info" title="Você está na lista de espera">
          <p>
            Assim que uma vaga for liberada você será promovido automaticamente e avisado por e-mail/WhatsApp.
          </p>
        </Alert>
      )}

      {data.payments.length > 0 && (
        <SectionCard title="Pagamentos">
          <ul className="space-y-2">
            {data.payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-app-border px-3 py-2.5 text-[13px]">
                <div>
                  <p className="font-medium">{payment.methodLabel}</p>
                  <p className="text-[12px] text-app-muted">
                    {payment.reference} · criado em {formatDateTime(payment.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p>{payment.amountFormatted}</p>
                  <PaymentStatusBadge status={payment.status} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {credential && registration.status === 'CONFIRMADA' && (
        <SectionCard title="Sua credencial" description="Apresente o QR Code na entrada do evento.">
          <div className="flex flex-col items-center gap-3">
            <QrCode value={credential.token} label={credential.code} />
            <p className="text-[12px] text-app-muted">
              Código {credential.code} · também disponível em texto para digitação manual.
            </p>
          </div>
        </SectionCard>
      )}

      {registration.status !== 'CANCELADA' && (
        <SectionCard title="Precisa cancelar?">
          {showCancel ? (
            <div className="space-y-3">
              <TextField
                label="Motivo"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Conte rapidamente o motivo do cancelamento"
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" isLoading={isCancelling} onClick={() => void handleCancel()}>
                  Confirmar cancelamento
                </Button>
                <Button variant="secondary" onClick={() => setShowCancel(false)}>
                  Voltar
                </Button>
              </div>
              {registration.finalAmountCents > 0 && (
                <p className="text-[12px] text-app-muted">
                  Inscrições pagas podem seguir para análise financeira de reembolso conforme a política do evento.
                </p>
              )}
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setShowCancel(true)}>
              Solicitar cancelamento
            </Button>
          )}
        </SectionCard>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-app-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
