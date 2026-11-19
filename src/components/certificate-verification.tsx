"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Search, ShieldCheck, XCircle } from "lucide-react";
import {
  Badge,
  Button,
  InlineAlert,
  Panel,
  PanelHeader,
  Spinner,
  inputCls,
} from "@/components/ui";
import { ApiError } from "@/client/services/api-service.base";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import type { CertificateReadModel } from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import { cn, formatDate } from "@/lib/utils";

export type CertificateVerificationProps = { code?: string };

function normalizeCodeInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/\/certificados\/([^/?#]+)/i);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]).trim().toUpperCase();
    } catch {
      return match[1].trim().toUpperCase();
    }
  }
  return trimmed.toUpperCase();
}

export function CertificateVerification({
  code = "",
}: CertificateVerificationProps) {
  const initialNormalized = normalizeCodeInput(code);
  const [inputCode, setInputCode] = useState(initialNormalized);
  const [queriedCode, setQueriedCode] = useState(initialNormalized);
  const [certificate, setCertificate] = useState<CertificateReadModel | null>(
    null,
  );
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(Boolean(initialNormalized));
  const [error, setError] = useState<string | null>(null);

  const runVerification = useCallback(async (targetCode: string) => {
    const normalized = normalizeCodeInput(targetCode);
    if (!normalized) return;

    setQueriedCode(normalized);
    setLoading(true);
    setError(null);
    setNotFound(false);
    setCertificate(null);

    try {
      const result = await ticketingApi.getCertificate({ code: normalized });
      setCertificate(result);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setNotFound(true);
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível validar este certificado.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialNormalized) {
      void runVerification(initialNormalized);
    }
  }, [initialNormalized, runVerification]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const normalized = normalizeCodeInput(inputCode);
    if (!normalized) return;
    setInputCode(normalized);
    void runVerification(normalized);
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
          Insira o código de autenticação para verificar se o certificado é válido.
        </p>
      </div>

      <Panel>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5"
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-app-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Digite o código (ex: CERT-2026-ABCD1234)"
              aria-label="Código de autenticação do certificado"
              autoComplete="off"
              spellCheck={false}
              className={cn(inputCls, "pl-9 font-mono text-sm uppercase")}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !inputCode.trim()}
            className="sm:shrink-0"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {loading ? "Validando…" : "Validar"}
          </Button>
        </form>
      </Panel>

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
              <Button
                compact
                variant="secondary"
                onClick={() => void runVerification(queriedCode)}
              >
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
            right={
              <Badge tone="success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Válido
              </Badge>
            }
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
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/v1/certificates/${encodeURIComponent(certificate.authenticationCode)}/pdf`}
                  className="inline-flex h-9 items-center gap-2 rounded-app-md bg-app-primary px-4 text-xs font-semibold text-white hover:brightness-110"
                >
                  Baixar PDF do certificado
                </a>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => window.print()}
                >
                  Imprimir página
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      ) : notFound ? (
        <Panel>
          <PanelHeader
            title="Certificado não localizado"
            right={
              <Badge tone="danger">
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Inválido
              </Badge>
            }
          />
          <div className="p-5 text-sm text-app-muted-foreground">
            Não encontramos nenhum certificado emitido com o código{" "}
            <span className="font-mono font-semibold text-app-foreground">
              {queriedCode}
            </span>
            . Verifique se o código foi digitado corretamente.
          </div>
        </Panel>
      ) : null}

      {queriedCode ? (
        <p className="text-center text-xs text-app-muted-foreground">
          Código consultado:{" "}
          <span className="font-mono font-semibold text-app-foreground">
            {queriedCode}
          </span>
        </p>
      ) : null}
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
