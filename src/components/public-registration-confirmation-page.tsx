"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  FileUp,
  LoaderCircle,
  Lock,
  MapPin,
  MonitorPlay,
  RefreshCw,
  ShieldCheck,
  TicketCheck,
  UserCheck,
} from "lucide-react";
import { ApiError } from "@/client/services/api-service.base";
import { participantApi } from "@/client/services/participant-api.service";
import {
  ticketingApi,
  type PublicRegistrationResult,
} from "@/client/services/ticketing-api.service";
import { useParticipantAuth } from "@/components/participant-auth-provider";
import {
  Badge,
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
import type { EventReadModel } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import {
  RegistrationFormDomainService,
  type FormFieldDefinition,
} from "@/modules/ticketing/domain/registrations/services/registration-form.domain-service";
import {
  formatCpf,
  formatCurrency,
  formatDate,
  formatPhone,
} from "@/lib/utils";

export type PublicRegistrationConfirmationPageProps = {
  slug: string;
};

type ConfirmationStep =
  | "form"
  | "waiting_payment"
  | "confirmed"
  | "waitlist";

const registrationFormValidator = new RegistrationFormDomainService();
const CUSTOM_INPUT_CLASS = `${inputCls} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary`;
const CUSTOM_TEXTAREA_CLASS = `${textareaCls} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary`;
const FILE_ACCEPT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

export function PublicRegistrationConfirmationPage({
  slug,
}: PublicRegistrationConfirmationPageProps) {
  const { participant: authParticipant, isAuthenticated, isLoading: authLoading } =
    useParticipantAuth();

  const [event, setEvent] = useState<EventReadModel | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Profile complement overrides
  const [profileOverrides, setProfileOverrides] = useState<{
    birthDate?: string;
    company?: string;
    jobTitle?: string;
  }>({});

  // Form states - remaining fields only
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [lotId, setLotId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [termsConsent, setTermsConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Validation & Submission states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [termsError, setTermsError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Payment & Confirmation states
  const [step, setStep] = useState<ConfirmationStep>("form");
  const [registrationResult, setRegistrationResult] =
    useState<PublicRegistrationResult | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(15 * 60);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  const pollingTimerRef = useRef<number | null>(null);
  const popupWindowRef = useRef<Window | null>(null);

  const effectiveBirthDate =
    profileOverrides.birthDate ?? authParticipant?.birthDate ?? "";
  const effectiveCompany =
    profileOverrides.company ?? authParticipant?.company ?? "";
  const effectiveJobTitle =
    profileOverrides.jobTitle ?? authParticipant?.jobTitle ?? "";

  // Load event details
  useEffect(() => {
    let active = true;

    ticketingApi
      .getPublicEvent({ slug })
      .then((data) => {
        if (!active) return;
        setEvent(data);
        if (data.props.chargeType === "pago" && data.lots.length > 0) {
          const currentTime = new Date();
          const firstAvailable = data.lots.find(
            (lot) =>
              lot.active &&
              currentTime >= new Date(lot.startAt) &&
              currentTime <= new Date(lot.endAt) &&
              lot.soldCount < lot.maxQuantity,
          );
          if (firstAvailable) {
            setLotId(firstAvailable.id);
          }
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setEventError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar os dados do evento.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingEvent(false);
      });

    return () => {
      active = false;
    };
  }, [slug, attempt]);

  const retryLoadEvent = useCallback(() => {
    setAttempt((c) => c + 1);
  }, []);

  // If participant already has an active registration for this event, load it
  useEffect(() => {
    if (!isAuthenticated || !authParticipant || registrationResult) return;
    let active = true;

    participantApi
      .getMyEvents()
      .then((response) => {
        if (!active) return;
        const found = response.events.find(
          (item) =>
            (item.eventSlug === slug || (event && item.eventId === event.id)) &&
            item.status !== "cancelada",
        );
        if (!found) return;
        setRegistrationResult({
          registrationId: found.registrationId,
          registrationCode: found.registrationCode,
          status: found.status,
          finalCents: found.finalCents,
          reservationExpiresAt: found.reservationExpiresAt,
          participantUrl: `/ingressos/${found.accessToken}`,
          checkoutUrl: found.checkoutUrl,
          credentialUrl:
            found.status === "confirmada"
              ? `/ingressos/${found.accessToken}`
              : null,
          eventTitle: found.eventTitle,
          accessToken: found.accessToken,
        });
        if (found.status === "lista_espera") {
          setStep("waitlist");
        } else if (found.status === "confirmada") {
          setStep("confirmed");
        } else if (
          found.status === "aguardando_pagamento" ||
          found.status === "pendente"
        ) {
          setStep("waiting_payment");
        }
      })
      .catch(() => {
        // Ignora erro silenciosamente e mantém formulário
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, authParticipant, slug, event, registrationResult]);

  // Check payment status function
  const checkPaymentStatus = useCallback(async () => {
    const token = registrationResult?.accessToken;
    if (!token) return;
    setIsCheckingPayment(true);
    try {
      const portal = await ticketingApi.getParticipantPortal({
        accessToken: token,
      });
      if (portal.status === "confirmada") {
        if (pollingTimerRef.current) {
          window.clearInterval(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }
        setPaymentNotice(null);
        setStep("confirmed");
        if (popupWindowRef.current && !popupWindowRef.current.closed) {
          window.setTimeout(() => {
            try {
              popupWindowRef.current?.close();
            } catch {
              // Ignora caso o navegador impeça fechar
            }
          }, 600);
        }
      } else if (portal.status === "cancelada") {
        if (pollingTimerRef.current) {
          window.clearInterval(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }
        setPaymentNotice(null);
        setGeneralError("O pagamento foi cancelado ou o prazo da reserva expirou.");
        setStep("form");
      }
    } catch {
      // Ignorar erros temporários de conexão durante o polling
    } finally {
      setIsCheckingPayment(false);
    }
  }, [registrationResult]);

  // Polling and cross-window events for payment confirmation
  useEffect(() => {
    if (step === "waiting_payment" && registrationResult?.accessToken) {
      pollingTimerRef.current = window.setInterval(() => {
        void checkPaymentStatus();
      }, 2500);

      const handleIncomingPaymentPayload = (payload: unknown) => {
        if (!payload || typeof payload !== "object") return;
        const record = payload as {
          type?: string;
          status?: string;
          referenceId?: string;
        };
        if (
          record.type !== "PAYMENT_COMPLETED" &&
          record.type !== "PAGSEGURO_PAYMENT_SUCCESS"
        ) {
          return;
        }
        if (
          record.referenceId &&
          registrationResult.registrationId &&
          record.referenceId.toLowerCase() !==
            registrationResult.registrationId.toLowerCase()
        ) {
          return;
        }
        if (record.status === "recusado") {
          setPaymentNotice(
            "A tentativa de pagamento foi recusada. Você ainda pode tentar novamente dentro do prazo da reserva clicando em 'Reabrir popup do PagSeguro'.",
          );
        } else {
          setPaymentNotice(null);
        }
        void checkPaymentStatus();
      };

      const onWindowFocus = () => {
        void checkPaymentStatus();
      };
      const onMessage = (eventMsg: MessageEvent) => {
        handleIncomingPaymentPayload(eventMsg.data);
      };
      const onStorage = (storageEvent: StorageEvent) => {
        if (
          storageEvent.key === "rarotickets:last-payment-update" &&
          storageEvent.newValue
        ) {
          try {
            handleIncomingPaymentPayload(JSON.parse(storageEvent.newValue));
          } catch {
            void checkPaymentStatus();
          }
        }
      };

      let channel: BroadcastChannel | null = null;
      try {
        if (typeof BroadcastChannel !== "undefined") {
          channel = new BroadcastChannel("rarotickets-payment");
          channel.onmessage = (msgEvent) => {
            handleIncomingPaymentPayload(msgEvent.data);
          };
        }
      } catch {
        channel = null;
      }

      window.addEventListener("focus", onWindowFocus);
      window.addEventListener("message", onMessage);
      window.addEventListener("storage", onStorage);

      return () => {
        if (pollingTimerRef.current) {
          window.clearInterval(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }
        window.removeEventListener("focus", onWindowFocus);
        window.removeEventListener("message", onMessage);
        window.removeEventListener("storage", onStorage);
        try {
          channel?.close();
        } catch {
          // Ignorar erro ao fechar canal
        }
      };
    }
  }, [step, registrationResult, checkPaymentStatus]);

  // 15-minute countdown timer during payment waiting
  useEffect(() => {
    if (step === "waiting_payment") {
      const timer = window.setInterval(() => {
        setSecondsRemaining((current) => {
          if (current <= 1) {
            window.clearInterval(timer);
            return 0;
          }
          return current - 1;
        });
      }, 1000);
      return () => window.clearInterval(timer);
    }
  }, [step]);

  function openPagSeguroPopup(rawUrl: string) {
    setPaymentNotice(null);
    let targetUrl = rawUrl;
    try {
      const parsed = new URL(rawUrl, window.location.origin);
      if (parsed.pathname.startsWith("/checkout/mock")) {
        targetUrl = `${window.location.origin}${parsed.pathname}${parsed.search}`;
      } else {
        targetUrl = parsed.toString();
      }
    } catch {
      targetUrl = rawUrl;
    }

    const width = 650;
    const height = 750;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

    try {
      const popup = window.open(
        targetUrl,
        "PagSeguroCheckout",
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`,
      );
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        setPopupBlocked(true);
      } else {
        popupWindowRef.current = popup;
        setPopupBlocked(false);
        popup.focus();
      }
    } catch {
      setPopupBlocked(true);
    }
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

  async function handleConfirmRegistration(
    formEvent: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    formEvent.preventDefault();
    setGeneralError(null);
    setTermsError(null);

    if (!authParticipant) {
      setGeneralError("Você precisa estar conectado para se inscrever.");
      return;
    }

    if (!event) return;

    if (!termsConsent) {
      setTermsError("O aceite dos termos de participação é obrigatório.");
      return;
    }

    const remaining = Math.max(
      0,
      event.props.maxCapacity -
        event.capacity.confirmed -
        event.capacity.reserved,
    );
    const isWaitlist = remaining === 0 && event.props.allowsWaitlist;
    const requiresLot = event.props.chargeType === "pago" && !isWaitlist;

    // Validate custom fields
    const preparedAnswers = { ...answers };
    for (const field of event.formFields) {
      if (field.type === "arquivo") {
        preparedAnswers[field.id] = files[field.id]
          ? `file:${field.id}`
          : undefined;
      }
    }

    const fieldsDef: FormFieldDefinition[] = event.formFields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      options: field.options,
    }));

    const formResult = registrationFormValidator.execute({
      fields: fieldsDef,
      answers: preparedAnswers,
    });

    const currentFieldErrors: Record<string, string> = formResult.isFailure
      ? readDomainFieldErrors(formResult.error)
      : {};

    if (requiresLot && !lotId) {
      currentFieldErrors.lotId = "Selecione um lote de ingresso.";
    }

    setFieldErrors(currentFieldErrors);

    if (Object.keys(currentFieldErrors).length > 0) {
      setGeneralError("Revise os campos adicionais destacados antes de continuar.");
      return;
    }

    setSubmitting(true);

    try {
      const parsedBirthDate = effectiveBirthDate
        ? new Date(`${effectiveBirthDate}T00:00:00.000Z`)
        : null;

      const result = await ticketingApi.createPublicRegistration({
        slug: event.props.slug,
        request: {
          participant: {
            name: authParticipant.name.trim(),
            cpf: authParticipant.cpf ?? "",
            email: authParticipant.email,
            phone: authParticipant.phone,
            birthDate: parsedBirthDate,
            company: effectiveCompany.trim() || null,
            jobTitle: effectiveJobTitle.trim() || null,
            termsConsent: true,
            marketingConsent,
          },
          answers: formResult.isSuccess ? formResult.value.answers : preparedAnswers,
          lotId: requiresLot ? lotId : null,
          couponCode: couponCode.trim() || null,
          files: Object.entries(files).map(([fieldId, file]) => ({
            fieldId,
            file,
          })),
        },
      });

      setRegistrationResult(result);

      if (result.status === "lista_espera") {
        setStep("waitlist");
      } else if (result.status === "confirmada" || result.finalCents === 0) {
        setStep("confirmed");
      } else if (result.checkoutUrl) {
        setStep("waiting_payment");
        setSecondsRemaining(15 * 60);
        openPagSeguroPopup(result.checkoutUrl);
      } else {
        setStep("confirmed");
      }
    } catch (caught) {
      const apiErrors = readApiFieldErrors(caught);
      if (apiErrors) setFieldErrors(apiErrors);
      setGeneralError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível concluir a inscrição.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (authLoading || loadingEvent) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
        <Spinner label="Carregando informações da inscrição…" />
        <div className="h-80 animate-pulse rounded-app-lg border border-app-border bg-app-surface" />
      </div>
    );
  }

  // Not authenticated state
  if (!isAuthenticated || !authParticipant) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <Panel>
          <PanelHeader
            title="Conecte-se para continuar"
            description="É necessário estar conectado à sua conta de participante para confirmar a inscrição."
          />
          <div className="space-y-4 p-5 sm:p-6">
            <InlineAlert tone="info">
              Para garantir sua vaga e vincular seus dados cadastrais, acesse sua conta ou crie um cadastro.
            </InlineAlert>
            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href={`/participante/login?redirect=/eventos/${encodeURIComponent(slug)}/confirmacao`}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                Fazer login
              </Link>
              <Link
                href={`/participante/cadastro?redirect=/eventos/${encodeURIComponent(slug)}/confirmacao`}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-4 text-sm font-semibold text-app-foreground transition hover:bg-app-surface"
              >
                Criar cadastro gratuito
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  // Error state
  if (eventError || !event) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <InlineAlert
          tone="danger"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          {eventError || "Evento não encontrado."}
          <Button compact variant="secondary" onClick={retryLoadEvent}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Tentar novamente
          </Button>
        </InlineAlert>
      </div>
    );
  }

  const remaining = Math.max(
    0,
    event.props.maxCapacity -
      event.capacity.confirmed -
      event.capacity.reserved,
  );
  const isWaitlist = remaining === 0 && event.props.allowsWaitlist;
  const now = new Date();
  const availableLots = event.lots.filter(
    (lot) =>
      lot.active &&
      now >= new Date(lot.startAt) &&
      now <= new Date(lot.endAt) &&
      lot.soldCount < lot.maxQuantity,
  );
  const requiresLot = event.props.chargeType === "pago" && !isWaitlist;
  const selectedLot = event.lots.find((lot) => lot.id === lotId);

  // STEP: WAITING PAYMENT (PagSeguro Popup open & polling)
  if (step === "waiting_payment" && registrationResult) {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    const timeDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Panel className="overflow-hidden border-app-primary/30 shadow-lg">
          <PanelHeader
            title="Aguardando confirmação do pagamento"
            description="Conclua a transação na janela do PagSeguro para ativar sua inscrição."
            right={
              <Badge tone="primary" className="gap-1.5 py-1 text-xs">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                PagSeguro / PagBank
              </Badge>
            }
          />
          <div className="space-y-6 p-5 sm:p-7">
            {popupBlocked ? (
              <InlineAlert tone="danger">
                <div className="space-y-2">
                  <p className="font-semibold">
                    A janela do PagSeguro foi bloqueada pelo seu navegador.
                  </p>
                  <p className="text-xs">
                    Permita popups neste site ou clique no botão abaixo para abrir a janela de pagamento com segurança:
                  </p>
                  {registrationResult.checkoutUrl ? (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() =>
                        registrationResult.checkoutUrl &&
                        openPagSeguroPopup(registrationResult.checkoutUrl)
                      }
                      className="mt-2"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Abrir janela do PagSeguro
                    </Button>
                  ) : null}
                </div>
              </InlineAlert>
            ) : null}

            {paymentNotice ? (
              <InlineAlert tone="danger">{paymentNotice}</InlineAlert>
            ) : null}

            <div className="flex flex-col items-center justify-center gap-4 rounded-app-lg border border-app-primary/20 bg-app-surface-elevated/40 p-6 text-center sm:p-8">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-app-primary opacity-25" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-app-primary/10 text-app-primary">
                  <CreditCard className="h-8 w-8 animate-pulse" aria-hidden="true" />
                </div>
              </div>

              <div className="max-w-md space-y-1">
                <h3 className="text-lg font-bold text-app-foreground">
                  Aguardando confirmação financeira…
                </h3>
                <p className="text-xs leading-relaxed text-app-muted-foreground">
                  Uma janela segura do PagSeguro foi aberta para você efetuar o pagamento via PIX, Cartão de Crédito ou Boleto. Assim que o pagamento for registrado, esta página será atualizada automaticamente.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-app-pill border border-app-border bg-app-surface px-4 py-1.5 text-xs font-semibold text-app-muted-foreground">
                <Clock3 className="h-3.5 w-3.5 text-app-warning" aria-hidden="true" />
                <span>
                  Tempo restante de reserva da vaga:{" "}
                  <strong className="font-mono text-app-foreground">
                    {timeDisplay}
                  </strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/60 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-app-muted-foreground">Inscrição</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-app-foreground">
                  {registrationResult.registrationCode}
                </p>
              </div>
              <div>
                <p className="text-xs text-app-muted-foreground">Evento</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-app-foreground">
                  {event.props.title}
                </p>
              </div>
              <div>
                <p className="text-xs text-app-muted-foreground">Total a pagar</p>
                <p className="mt-0.5 text-sm font-bold text-app-primary">
                  {formatCurrency({ cents: registrationResult.finalCents })}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-between">
              {registrationResult.checkoutUrl ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    registrationResult.checkoutUrl &&
                    openPagSeguroPopup(registrationResult.checkoutUrl)
                  }
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Reabrir popup do PagSeguro
                </Button>
              ) : null}

              <Button
                type="button"
                variant="primary"
                disabled={isCheckingPayment}
                onClick={() => void checkPaymentStatus()}
              >
                {isCheckingPayment ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Consultando status…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Verificar status agora
                  </>
                )}
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  // STEP: CONFIRMED
  if (step === "confirmed" && registrationResult) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Panel className="overflow-hidden border-app-success/30 shadow-md">
          <PanelHeader
            title="Inscrição Confirmada!"
            right={<Badge tone="success">Confirmada</Badge>}
          />
          <div className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-app-pill bg-app-success/10 text-app-success">
              <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-app-foreground">
                Parabéns! Sua vaga está garantida.
              </h2>
              <p className="text-sm text-app-muted-foreground">
                Sua inscrição para <strong>{event.props.title}</strong> foi confirmada com sucesso.
              </p>
            </div>

            <div className="w-full rounded-app-md border border-app-border bg-app-surface-elevated/50 p-4 text-left">
              <p className="text-xs text-app-muted-foreground">Código da inscrição</p>
              <p className="mt-1 font-mono text-base font-bold text-app-foreground">
                {registrationResult.registrationCode}
              </p>
              {registrationResult.finalCents > 0 ? (
                <p className="mt-2 text-xs text-app-muted-foreground">
                  Valor pago:{" "}
                  <strong className="text-app-foreground">
                    {formatCurrency({ cents: registrationResult.finalCents })}
                  </strong>
                </p>
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-2 pt-2 sm:flex-row">
              {registrationResult.accessToken ? (
                <Link
                  href={`/ingressos/${registrationResult.accessToken}`}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                >
                  <TicketCheck className="h-4 w-4" aria-hidden="true" />
                  Ver credencial e QR Code
                </Link>
              ) : null}
              <Link
                href="/participante"
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-4 text-sm font-semibold text-app-foreground hover:bg-app-surface"
              >
                Área do participante
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  // STEP: WAITLIST CONFIRMATION
  if (step === "waitlist" && registrationResult) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Panel className="overflow-hidden border-app-warning/30 shadow-md">
          <PanelHeader
            title="Lista de espera registrada"
            right={<Badge tone="warning">Lista de espera</Badge>}
          />
          <div className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-app-pill bg-app-warning/10 text-app-warning">
              <Clock3 className="h-9 w-9" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-app-foreground">
                Você está na lista de espera!
              </h2>
              <p className="text-sm text-app-muted-foreground">
                Assim que uma vaga for liberada para <strong>{event.props.title}</strong>, você receberá uma notificação para concluir sua inscrição.
              </p>
            </div>
            <div className="w-full rounded-app-md border border-app-border bg-app-surface-elevated/50 p-4 text-left">
              <p className="text-xs text-app-muted-foreground">Protocolo</p>
              <p className="mt-1 font-mono text-base font-bold text-app-foreground">
                {registrationResult.registrationCode}
              </p>
            </div>
            <Link
              href="/participante"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white hover:brightness-110"
            >
              Acompanhar na Área do Participante
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  // STEP: FORM CONFIRMATION
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 pb-16 sm:px-6 lg:px-8 lg:py-8">
      {/* Top navigation */}
      <div>
        <Link
          href={`/eventos/${encodeURIComponent(slug)}`}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-app-muted-foreground hover:text-app-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar aos detalhes do evento
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">
            {event.props.modality === "online" ? "Online" : "Presencial"}
          </Badge>
          <Badge
            tone={event.props.chargeType === "gratuito" ? "success" : "muted"}
          >
            {event.props.chargeType === "gratuito" ? "Gratuito" : "Pago"}
          </Badge>
          {isWaitlist ? <Badge tone="warning">Lista de espera</Badge> : null}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-app-foreground sm:text-3xl">
          Confirmação de Inscrição
        </h1>
        <p className="text-sm text-app-muted-foreground">
          {event.props.title}
        </p>
      </header>

      {/* Main form */}
      <form onSubmit={(e) => void handleConfirmRegistration(e)} noValidate className="space-y-6">
        {generalError ? <InlineAlert tone="danger">{generalError}</InlineAlert> : null}

        {/* SECTION 1: Event Summary */}
        <Panel>
          <PanelHeader title="Resumo do evento" />
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:p-5">
            <div className="flex items-start gap-2.5">
              <CalendarDays className="mt-0.5 h-4 w-4 text-app-primary" aria-hidden="true" />
              <div>
                <p className="text-xs text-app-muted-foreground">Data e início</p>
                <p className="text-sm font-medium text-app-foreground">
                  {formatDate({ value: event.props.startAt, withTime: true })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              {event.props.modality === "online" ? (
                <MonitorPlay className="mt-0.5 h-4 w-4 text-app-primary" aria-hidden="true" />
              ) : (
                <MapPin className="mt-0.5 h-4 w-4 text-app-primary" aria-hidden="true" />
              )}
              <div>
                <p className="text-xs text-app-muted-foreground">Local</p>
                <p className="text-sm font-medium text-app-foreground">
                  {event.props.modality === "online"
                    ? "Online"
                    : event.props.address
                      ? `${event.props.address.municipality}, ${event.props.address.state}`
                      : "Local a definir"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CreditCard className="mt-0.5 h-4 w-4 text-app-primary" aria-hidden="true" />
              <div>
                <p className="text-xs text-app-muted-foreground">Investimento</p>
                <p className="text-sm font-bold text-app-foreground">
                  {event.props.chargeType === "gratuito"
                    ? "Gratuito"
                    : selectedLot
                      ? formatCurrency({ cents: selectedLot.priceCents })
                      : "A definir no lote"}
                </p>
              </div>
            </div>
          </div>
        </Panel>

        {/* SECTION 2: Participant Data from Account (Read-Only) */}
        <Panel>
          <PanelHeader
            title="Dados do participante"
            description="Informações recuperadas da sua conta conectada. Não é necessário informá-las novamente."
            right={
              <Badge tone="success" className="gap-1 py-1">
                <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Conta verificada
              </Badge>
            }
          />
          <div className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 rounded-app-md border border-app-border bg-app-surface-elevated/40 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-app-muted-foreground">Nome completo</p>
                <p className="mt-0.5 text-sm font-semibold text-app-foreground">
                  {authParticipant.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-app-muted-foreground">E-mail</p>
                <p className="mt-0.5 text-sm font-semibold text-app-foreground">
                  {authParticipant.email}
                </p>
              </div>
              <div>
                <p className="text-xs text-app-muted-foreground">CPF</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-app-foreground">
                  {formatCpf(authParticipant.cpf)}
                </p>
              </div>
              <div>
                <p className="text-xs text-app-muted-foreground">Celular</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-app-foreground">
                  {formatPhone(authParticipant.phone)}
                </p>
              </div>
            </div>

            {/* Optional profile complement if missing in account */}
            {(!authParticipant.birthDate || !authParticipant.company || !authParticipant.jobTitle) ? (
              <div className="border-t border-app-border pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wide text-app-muted-foreground">
                  Complemento de perfil (opcional)
                </h4>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {!authParticipant.birthDate ? (
                    <Field label="Data de nascimento" htmlFor="participant-birth-date">
                      <input
                        id="participant-birth-date"
                        type="date"
                        value={effectiveBirthDate}
                        onChange={(e) =>
                          setProfileOverrides((cur) => ({
                            ...cur,
                            birthDate: e.target.value,
                          }))
                        }
                        className={CUSTOM_INPUT_CLASS}
                      />
                    </Field>
                  ) : null}
                  {!authParticipant.company ? (
                    <Field label="Empresa / instituição" htmlFor="participant-company">
                      <input
                        id="participant-company"
                        value={effectiveCompany}
                        onChange={(e) =>
                          setProfileOverrides((cur) => ({
                            ...cur,
                            company: e.target.value,
                          }))
                        }
                        placeholder="Ex: Empresa ou Prefeitura"
                        className={CUSTOM_INPUT_CLASS}
                      />
                    </Field>
                  ) : null}
                  {!authParticipant.jobTitle ? (
                    <Field label="Cargo / função" htmlFor="participant-job-title">
                      <input
                        id="participant-job-title"
                        value={effectiveJobTitle}
                        onChange={(e) =>
                          setProfileOverrides((cur) => ({
                            ...cur,
                            jobTitle: e.target.value,
                          }))
                        }
                        placeholder="Ex: Analista, Diretor"
                        className={CUSTOM_INPUT_CLASS}
                      />
                    </Field>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </Panel>

        {/* SECTION 3: Additional Form Fields of the Event */}
        {event.formFields.length > 0 ? (
          <Panel>
            <PanelHeader
              title="Informações adicionais do evento"
              description="Campos solicitados pela comissão organizadora para este evento específico."
            />
            <div className="space-y-4 p-4 sm:p-5">
              {event.formFields.map((field) => (
                <CustomRegistrationField
                  key={field.id}
                  field={field}
                  value={answers[field.id]}
                  file={files[field.id]}
                  error={fieldErrors[field.id]}
                  onChange={(val) => updateAnswer(field.id, val)}
                  onFileChange={(f) => updateFile(field.id, f)}
                />
              ))}
            </div>
          </Panel>
        ) : null}

        {/* SECTION 4: Ticket Lot & Payment Selection */}
        {requiresLot ? (
          <Panel>
            <PanelHeader
              title="Ingresso e pagamento"
              description="Selecione o lote desejado para concluir sua compra com segurança via PagSeguro."
              right={
                <Badge tone="muted" className="gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-app-success" aria-hidden="true" />
                  Checkout PagSeguro
                </Badge>
              }
            />
            <div className="space-y-4 p-4 sm:p-5">
              <Field
                label="Lote de ingresso *"
                htmlFor="registration-lot"
                error={fieldErrors.lotId}
              >
                <select
                  id="registration-lot"
                  value={lotId}
                  onChange={(e) => setLotId(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Selecione um lote</option>
                  {availableLots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.name} — {formatCurrency({ cents: lot.priceCents })} ({Math.max(0, lot.maxQuantity - lot.soldCount)} vagas disponíveis)
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Cupom de desconto"
                htmlFor="registration-coupon"
                hint="Opcional. Cupons de desconto ou cortesia são validados no momento do envio."
              >
                <input
                  id="registration-coupon"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="EX.: PROMO20"
                  className={CUSTOM_INPUT_CLASS}
                />
              </Field>

              <InlineAlert tone="info">
                <span className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 shrink-0 text-app-primary" aria-hidden="true" />
                  <span>
                    Após confirmar, sua vaga fica reservada temporariamente por <strong>15 minutos</strong> enquanto você conclui o pagamento na janela segura do PagSeguro (PIX, Cartão ou Boleto).
                  </span>
                </span>
              </InlineAlert>
            </div>
          </Panel>
        ) : null}

        {/* SECTION 5: Terms and Consent */}
        <Panel>
          <div className="space-y-3 p-4 sm:p-5">
            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-app-muted-foreground">
              <input
                type="checkbox"
                checked={termsConsent}
                onChange={(e) => {
                  setTermsConsent(e.target.checked);
                  if (e.target.checked) setTermsError(null);
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-app-primary"
              />
              <span>
                Li e concordo com os termos de participação e a Política de Privacidade deste evento. <span className="text-app-danger">*</span>
              </span>
            </label>
            {termsError ? (
              <p className="text-xs text-app-danger">{termsError}</p>
            ) : null}

            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-app-muted-foreground">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-app-primary"
              />
              <span>
                Quero receber comunicações e novidades sobre eventos futuros da organização. (opcional)
              </span>
            </label>
          </div>
        </Panel>

        {/* Action Button */}
        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full text-base font-bold shadow-md"
          >
            {submitting ? (
              <>
                <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
                Processando inscrição…
              </>
            ) : isWaitlist ? (
              <>
                <Clock3 className="h-5 w-5" aria-hidden="true" />
                Confirmar entrada na lista de espera
              </>
            ) : requiresLot ? (
              <>
                <CreditCard className="h-5 w-5" aria-hidden="true" />
                Prosseguir para pagamento no PagSeguro
              </>
            ) : (
              <>
                <TicketCheck className="h-5 w-5" aria-hidden="true" />
                Confirmar inscrição gratuita
              </>
            )}
          </Button>

          <p className="text-center text-xs text-app-muted-foreground">
            {requiresLot
              ? "Você será direcionado a uma janela segura do PagSeguro (PagBank). Nenhum dado de cartão é armazenado em nossos servidores."
              : "Sua vaga será confirmada imediatamente e sua credencial ficará disponível."}
          </p>
        </div>
      </form>
    </div>
  );
}

// Helper components for dynamic form fields
type CustomRegistrationFieldProps = {
  field: EventReadModel["formFields"][number];
  value: unknown;
  file?: File;
  error?: string;
  onChange: (value: unknown) => void;
  onFileChange: (file: File | undefined) => void;
};

function CustomRegistrationField({
  field,
  value,
  file,
  error,
  onChange,
  onFileChange,
}: CustomRegistrationFieldProps) {
  const inputId = `custom-${field.id}`;
  const errorId = `${inputId}-error`;
  const hint = field.description || undefined;
  const describedBy = [hint ? `${inputId}-hint` : "", error ? errorId : ""]
    .filter(Boolean)
    .join(" ") || undefined;
  const requiredLabel = `${field.label}${field.required ? " *" : ""}`;
  const fieldHint =
    field.type === "arquivo"
      ? `${hint ? `${hint} ` : ""}PDF, PNG ou JPG; até 10 MB.`
      : hint;
  const commonInputProps = {
    id: inputId,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy,
    required: field.required,
  };
  const textValue = typeof value === "string" ? value : "";

  let control: ReactNode = (
    <input
      {...commonInputProps}
      value={textValue}
      onChange={(e) => onChange(e.target.value)}
      className={CUSTOM_INPUT_CLASS}
    />
  );

  if (field.type === "texto_longo") {
    control = (
      <textarea
        {...commonInputProps}
        rows={3}
        value={textValue}
        onChange={(e) => onChange(e.target.value)}
        className={CUSTOM_TEXTAREA_CLASS}
      />
    );
  } else if (field.type === "numero") {
    control = (
      <input
        {...commonInputProps}
        type="number"
        value={textValue}
        onChange={(e) => onChange(e.target.value)}
        className={CUSTOM_INPUT_CLASS}
      />
    );
  } else if (field.type === "data") {
    control = (
      <input
        {...commonInputProps}
        type="date"
        value={textValue}
        onChange={(e) => onChange(e.target.value)}
        className={CUSTOM_INPUT_CLASS}
      />
    );
  } else if (field.type === "email") {
    control = (
      <input
        {...commonInputProps}
        type="email"
        value={textValue}
        onChange={(e) => onChange(e.target.value)}
        className={CUSTOM_INPUT_CLASS}
      />
    );
  } else if (field.type === "telefone") {
    control = (
      <input
        {...commonInputProps}
        type="tel"
        value={textValue}
        onChange={(e) => onChange(e.target.value)}
        className={CUSTOM_INPUT_CLASS}
      />
    );
  } else if (field.type === "cpf") {
    control = (
      <input
        {...commonInputProps}
        inputMode="numeric"
        value={textValue}
        onChange={(e) => onChange(e.target.value)}
        className={CUSTOM_INPUT_CLASS}
        placeholder="000.000.000-00"
      />
    );
  } else if (field.type === "cnpj") {
    control = (
      <input
        {...commonInputProps}
        inputMode="numeric"
        value={textValue}
        onChange={(e) => onChange(e.target.value)}
        className={CUSTOM_INPUT_CLASS}
        placeholder="00.000.000/0000-00"
      />
    );
  } else if (field.type === "select") {
    control = (
      <select
        {...commonInputProps}
        value={textValue}
        onChange={(e) => onChange(e.target.value)}
        className={selectCls}
      >
        <option value="">Selecione uma opção</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  } else if (field.type === "boolean") {
    control = (
      <select
        id={inputId}
        value={typeof value === "boolean" ? String(value) : ""}
        onChange={(e) =>
          onChange(
            e.target.value === "" ? null : e.target.value === "true",
          )
        }
        className={selectCls}
        required={field.required}
      >
        <option value="">Selecione</option>
        <option value="true">Sim</option>
        <option value="false">Não</option>
      </select>
    );
  } else if (field.type === "checkbox") {
    const selected = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
    control = (
      <fieldset className="space-y-2">
        <legend className="sr-only">{field.label}</legend>
        {field.options.map((opt, idx) => {
          const optId = `${inputId}-opt-${idx}`;
          return (
            <label
              key={opt}
              htmlFor={optId}
              className="flex items-center gap-2 text-sm text-app-muted-foreground"
            >
              <input
                id={optId}
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, opt]
                      : selected.filter((item) => item !== opt),
                  )
                }
                className="h-4 w-4 accent-app-primary"
              />
              {opt}
            </label>
          );
        })}
      </fieldset>
    );
  } else if (field.type === "arquivo") {
    control = (
      <div className="flex min-h-10 items-center gap-3 rounded-app-md border border-app-border bg-app-surface px-3">
        <FileUp className="h-4 w-4 shrink-0 text-app-muted-foreground" aria-hidden="true" />
        <input
          id={inputId}
          type="file"
          accept={FILE_ACCEPT}
          required={field.required && !file}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFileChange(e.target.files?.[0])
          }
          className="min-w-0 flex-1 text-xs text-app-muted-foreground file:mr-3 file:rounded-app-sm file:border-0 file:bg-app-surface-elevated file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-app-foreground"
        />
        {file ? (
          <span
            className="max-w-28 truncate text-xs text-app-foreground"
            title={file.name}
          >
            {file.name}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <Field
      label={requiredLabel}
      htmlFor={field.type === "checkbox" ? undefined : inputId}
      hint={fieldHint}
      hintId={fieldHint ? `${inputId}-hint` : undefined}
      error={error}
      errorId={errorId}
    >
      {control}
    </Field>
  );
}

function readDomainFieldErrors(error: Error): Record<string, string> {
  const details = "details" in error ? error.details : null;
  if (!isRecord(details)) return {};
  return Object.fromEntries(
    Object.entries(details).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function readApiFieldErrors(error: unknown): Record<string, string> | null {
  if (!(error instanceof ApiError) || !isRecord(error.details)) return null;
  return Object.fromEntries(
    Object.entries(error.details).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
