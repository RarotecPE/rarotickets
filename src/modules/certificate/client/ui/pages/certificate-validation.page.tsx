import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDateTime } from '@client/shared/format';
import { Button } from '@client/ui/components/button.component';
import { Card } from '@client/ui/components/card.component';
import { Alert, LoadingBlock } from '@client/ui/components/feedback.component';
import { TextField } from '@client/ui/components/form-fields.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import type { CertificateValidationView } from '../../services/certificate-api.service';

/** Consulta pública de autenticidade do certificado (§31). */
export function CertificateValidationPage() {
  const params = useParams();
  const codeFromRoute = (params.code ?? '').trim().toUpperCase();
  const [code, setCode] = useState(codeFromRoute);
  const [searched, setSearched] = useState(codeFromRoute);

  const { data, isLoading, error } = useAsync<CertificateValidationView | null>(
    async () => (searched ? api.certificates.validate(searched) : null),
    [searched],
  );

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader
        title="Validar certificado"
        description="Digite o código impresso no certificado para confirmar a autenticidade."
      />

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSearched(code.trim().toUpperCase());
        }}
      >
        <div className="flex-1">
          <TextField
            aria-label="Código do certificado"
            placeholder="CERT-XXXX-XXXX-D"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
        </div>
        <Button type="submit">Validar</Button>
      </form>

      {isLoading && <LoadingBlock label="Consultando certificado…" />}
      {error && <Alert tone="danger">{error}</Alert>}

      {data && (
        <Card className={`p-4 ${data.valid ? 'border-app-success/50' : 'border-app-warning/50'}`}>
          <div className="flex items-start gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-[999px] text-lg ${data.valid ? 'bg-app-success/15 text-app-success' : 'bg-app-warning/15 text-app-warning'}`}>
              {data.valid ? '✓' : '!'}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">{data.message}</p>
              {data.status !== 'NAO_ENCONTRADO' && (
                <dl className="mt-2 space-y-1 text-[13px]">
                  <Row label="Código" value={data.code} />
                  <Row label="Participante" value={data.participantName ?? '—'} />
                  <Row label="Evento" value={data.eventTitle ?? '—'} />
                  <Row label="Carga horária" value={`${data.workloadHours}h`} />
                  <Row label="Emitido em" value={formatDateTime(data.issuedAt)} />
                  {data.cancelledAt && <Row label="Cancelado em" value={formatDateTime(data.cancelledAt)} />}
                </dl>
              )}
            </div>
          </div>
        </Card>
      )}

      <p className="text-[12px] text-app-muted">
        Certificados são emitidos apenas para inscrições confirmadas e com presença registrada quando o evento exigir.
      </p>
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
