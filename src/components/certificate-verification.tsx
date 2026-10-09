"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Empty,
  InlineAlert,
  Panel,
  PanelHeader,
  Spinner,
} from "@/components/ui";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import type { CertificateReadModel } from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import { formatDate } from "@/lib/utils";

export type CertificateVerificationProps = { code: string };

export function CertificateVerification({
  code,
}: CertificateVerificationProps) {
  const [certificate, setCertificate] = useState<CertificateReadModel | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    async function verify(): Promise<void> {
      try {
        const result = await ticketingApi.getCertificate({ code });
        if (active) setCertificate(result);
      } catch (caught) {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível validar este certificado.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void verify();
    return () => {
      active = false;
    };
  }, [code, reloadVersion]);

  function retry(): void {
    setLoading(true);
    setError(null);
    setReloadVersion((current) => current + 1);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-app-primary">
          Autenticidade
        </p>
        <h1 className="mt-2 text-2xl font-bold text-app-foreground">
          Validação de certificado
        </h1>
        <p className="mt-2 text-sm text-app-muted-foreground">
          Consulte o código para confirmar a emissão pelo RaroTickets.
        </p>
      </div>
      {loading ? (
        <Panel>
          <div className="p-5">
            <Spinner label="Validando código…" />
          </div>
        </Panel>
      ) : error ? (
        <Panel>
          <div className="p-4 sm:p-5">
            <InlineAlert
              tone="danger"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              {error}
              <Button compact variant="secondary" onClick={retry}>
                Tentar novamente
              </Button>
            </InlineAlert>
          </div>
        </Panel>
      ) : certificate ? (
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Certificado autêntico"
            description="Os dados abaixo correspondem ao registro localizado no sistema."
            right={<Badge tone="success">Válido</Badge>}
          />
          <div className="space-y-5 p-5 sm:p-8">
            <div className="border-b border-app-border pb-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-app-primary">
                Certificamos que
              </p>
              <h2 className="mt-3 text-2xl font-bold text-app-foreground">
                {certificate.participantName}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-app-muted-foreground">
                {certificate.description}
              </p>
              <p className="mt-3 text-base font-semibold text-app-foreground">
                {certificate.eventTitle}
              </p>
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CertificateDetail
                label="Data do evento"
                value={formatDate({ value: certificate.eventStartAt })}
              />
              <CertificateDetail
                label="Carga horária"
                value={`${certificate.workloadHours} horas`}
              />
              <CertificateDetail
                label="Emitido em"
                value={formatDate({ value: certificate.issuedAt })}
              />
              <CertificateDetail
                label="Código de autenticação"
                value={certificate.authenticationCode}
                mono
              />
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4">
              <Link
                href="/eventos"
                className="text-xs font-semibold text-app-primary hover:underline"
              >
                Conheça outros eventos
              </Link>
              <Button
                type="button"
                variant="secondary"
                onClick={() => window.print()}
              >
                Imprimir certificado
              </Button>
            </div>
          </div>
        </Panel>
      ) : (
        <Panel>
          <div className="p-5">
            <Empty
              title="Certificado não localizado"
              description="Confira o código informado e tente novamente."
            />
          </div>
        </Panel>
      )}
      <p className="text-center text-xs text-app-muted-foreground">
        Código consultado:{" "}
        <span className="font-mono font-semibold text-app-foreground">
          {code}
        </span>
      </p>
    </div>
  );
}

function CertificateDetail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-app-muted-foreground">{label}</dt>
      <dd
        className={`mt-1 break-words text-sm font-semibold text-app-foreground ${mono ? "font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
