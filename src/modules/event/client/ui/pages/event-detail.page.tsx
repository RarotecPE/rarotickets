import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '@shared/constants/route.constants';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDate, formatDateTime, formatDateRange, formatMoney } from '@client/shared/format';
import { EventStatusBadge } from '@client/ui/components/badge.component';
import { Button } from '@client/ui/components/button.component';
import { Card, SectionCard } from '@client/ui/components/card.component';
import { ErrorBlock, LoadingBlock } from '@client/ui/components/feedback.component';
import { PageHeader } from '@client/ui/components/page-header.component';

/** Detalhe público do evento (§2, §5, §32, §33). */
export function EventDetailPage() {
  const { slug = '' } = useParams();
  const { data, error, isLoading, reload } = useAsync(() => api.events.getPublic(slug), [slug]);

  if (isLoading) return <LoadingBlock label="Carregando evento…" />;
  if (error || !data) return <ErrorBlock message={error ?? 'Evento não encontrado'} onRetry={() => void reload()} />;

  const { event, lotes, currentLote, activities, speakers, seatUsage, isRegistrationOpen } = data;

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb="Eventos"
        title={event.title}
        description={event.summary}
        actions={
          isRegistrationOpen ? (
            <Link to={`${ROUTES.eventDetail(event.slug)}/inscricao/nova`}>
              <Button>Inscrever-se</Button>
            </Link>
          ) : (
            <Button disabled>Inscrições encerradas</Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <dl className="space-y-2 text-[13px]">
            <Row label="Status" value={<EventStatusBadge status={event.status} />} />
            <Row label="Data" value={formatDateRange(event.startDate, event.endDate)} />
            <Row label="Horário" value={`${event.startTime} às ${event.endTime}`} />
            <Row label="Local" value={event.isOnline ? 'Online' : event.locationLabel} />
            <Row label="Responsável" value={event.responsibleName} />
            <Row label="Carga horária" value={`${event.workloadHours}h`} />
            <Row
              label="Certificado"
              value={event.certificateEnabled ? 'Emitido após o evento' : 'Não disponível'}
            />
          </dl>
          <dl className="space-y-2 text-[13px]">
            <Row label="Tipo" value={event.type === 'GRATUITO' ? 'Gratuito' : 'Pago'} />
            <Row
              label="Investimento"
              value={currentLote ? `${currentLote.name} · ${formatMoney(currentLote.priceCents)}` : 'Sem lote ativo'}
            />
            <Row
              label="Vagas"
              value={`${seatUsage.availableSeats} disponíveis de ${event.capacity}${seatUsage.waitlistCount > 0 ? ` · ${seatUsage.waitlistCount} na lista de espera` : ''}`}
            />
            <Row label="Inscrições" value={`${formatDate(event.registrationStart)} a ${formatDate(event.registrationEnd)}`} />
            <Row label="Pagamento" value={[event.allowPix && 'PIX', event.allowBoleto && 'Boleto', event.allowCreditCard && 'Cartão'].filter(Boolean).join(' · ') || '—'} />
            <Row label="Parcelamento" value={`até ${event.maxInstallments}x`} />
            {event.onlineUrl && (
              <Row
                label="Link de acesso"
                value={
                  <a className="text-app-primary underline" href={event.onlineUrl} target="_blank" rel="noreferrer">
                    Entrar na sala
                  </a>
                }
              />
            )}
          </dl>
        </div>
      </Card>

      <SectionCard title="Sobre o evento">
        <p className="whitespace-pre-line text-[13px] leading-relaxed">{event.description}</p>
      </SectionCard>

      {lotes.length > 0 && (
        <SectionCard title="Lotes e valores" description="O valor é congelado no momento da inscrição.">
          <ul className="space-y-2">
            {lotes.map((lote) => (
              <li
                key={lote.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-[8px] border px-3 py-2.5 text-[13px] ${
                  currentLote?.id === lote.id ? 'border-app-primary/60 bg-app-primary/10' : 'border-app-border'
                }`}
              >
                <div>
                  <p className="font-medium">{lote.name}</p>
                  <p className="text-[12px] text-app-muted">
                    {formatDate(lote.startDate)} a {formatDate(lote.endDate)} · {lote.availableQuantity} vagas
                  </p>
                </div>
                <p className="font-semibold">{lote.priceCents === 0 ? 'Gratuito' : formatMoney(lote.priceCents)}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {speakers.length > 0 && (
        <SectionCard title="Palestrantes">
          <ul className="grid gap-3 sm:grid-cols-2">
            {speakers.map((speaker) => (
              <li key={speaker.id} className="rounded-[8px] border border-app-border p-3">
                <p className="text-[14px] font-medium">{speaker.name}</p>
                {speaker.institution && <p className="text-[12px] text-app-muted">{speaker.institution}</p>}
                {speaker.bio && <p className="mt-1 text-[13px] text-app-muted">{speaker.bio}</p>}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {activities.length > 0 && (
        <SectionCard title="Programação">
          <ol className="space-y-2">
            {activities.map((activity) => (
              <li key={activity.id} className="rounded-[8px] border border-app-border px-3 py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[14px] font-medium">{activity.title}</p>
                  <p className="text-[12px] text-app-muted">{formatDateTime(activity.startAt)}</p>
                </div>
                <p className="text-[12px] text-app-muted">
                  {activity.speakerName ? `${activity.speakerName} · ` : ''}
                  {activity.room ?? ''}
                </p>
                {activity.description && <p className="mt-1 text-[13px]">{activity.description}</p>}
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      {data.waitlistEnabled && (
        <p className="text-[12px] text-app-muted">
          Quando as vagas acabam, a inscrição entra na lista de espera e é promovida automaticamente conforme liberação.
        </p>
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
