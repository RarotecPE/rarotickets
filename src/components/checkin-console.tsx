"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Camera,
  CheckCircle2,
  ScanLine,
  ShieldCheck,
  StopCircle,
  XCircle,
} from "lucide-react";
import {
  ticketingApi,
  type CheckInResponse,
} from "@/client/services/ticketing-api.service";
import { useAuth } from "@/components/auth-provider";
import {
  Badge,
  Button,
  Field,
  InlineAlert,
  Panel,
  PanelHeader,
  inputCls,
  textareaCls,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

export function CheckInConsole() {
  const auth = useAuth();
  const [qrToken, setQrToken] = useState("");
  const [reentry, setReentry] = useState(false);
  const [justification, setJustification] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const canReenter = Boolean(
    auth.session?.permissions.includes("checkin:reentry"),
  );

  const acceptScannedToken = useCallback((value: string) => {
    setQrToken(value);
    setError(null);
    setResult(null);
  }, []);
  const closeCamera = useCallback(() => setCameraOpen(false), []);

  async function submitCheckIn(
    formEvent: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    formEvent.preventDefault();
    setError(null);
    setResult(null);
    const token = qrToken.trim();
    if (!token) {
      setError("Escaneie ou informe o token do QR Code da credencial.");
      return;
    }
    if (reentry && !justification.trim()) {
      setError("A justificativa é obrigatória para uma reentrada.");
      return;
    }
    setProcessing(true);
    try {
      const response = await ticketingApi.checkIn({
        qrToken: token,
        reentry,
        justification: reentry ? justification.trim() : undefined,
      });
      setResult(response);
      setQrToken("");
      setJustification("");
      setReentry(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível registrar o check-in.",
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-app-primary">
          Portaria
        </p>
        <h2 className="mt-1 text-xl font-bold text-app-foreground">
          Credenciamento
        </h2>
        <p className="mt-1 text-xs text-app-muted-foreground">
          Escaneie o QR Code da credencial ou use um leitor que digite o token
          no campo abaixo.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,.7fr)]">
        <Panel>
          <PanelHeader
            title="Validar credencial"
            description="O servidor valida a assinatura do QR Code, a inscrição e a janela do evento."
            right={
              <Badge tone="primary">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verificação segura
              </Badge>
            }
          />
          <form
            onSubmit={(formEvent) => void submitCheckIn(formEvent)}
            className="flex flex-col gap-4 p-4 sm:p-5"
          >
            <Field
              label="Token do QR Code *"
              htmlFor="checkin-qr-token"
              hint="O leitor USB/Bluetooth funciona como teclado; também é possível colar o token da credencial."
            >
              <div className="flex gap-2">
                <input
                  id="checkin-qr-token"
                  autoComplete="off"
                  value={qrToken}
                  onChange={(change) => {
                    setQrToken(change.target.value);
                    setError(null);
                  }}
                  className={inputCls}
                  placeholder="RT1.…"
                />
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={
                    cameraOpen ? "Fechar câmera" : "Abrir câmera para escanear"
                  }
                  onClick={() => setCameraOpen((current) => !current)}
                >
                  {cameraOpen ? (
                    <StopCircle className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Camera className="h-4 w-4" aria-hidden="true" />
                  )}
                  {cameraOpen ? "Parar" : "Câmera"}
                </Button>
              </div>
            </Field>
            {cameraOpen ? (
              <QrCameraScanner
                onDetected={acceptScannedToken}
                onClose={closeCamera}
              />
            ) : null}
            {canReenter ? (
              <div className="rounded-app-md border border-app-border bg-app-surface-elevated/40 p-3">
                <label className="flex items-start gap-2 text-sm text-app-foreground">
                  <input
                    type="checkbox"
                    checked={reentry}
                    onChange={(change) => {
                      setReentry(change.target.checked);
                      setError(null);
                    }}
                    className="mt-0.5 h-4 w-4 accent-app-primary"
                  />
                  <span>
                    <span className="font-semibold">Autorizar reentrada</span>
                    <span className="mt-0.5 block text-xs text-app-muted-foreground">
                      Disponível para seu perfil; cada reentrada fica registrada
                      na auditoria.
                    </span>
                  </span>
                </label>
                {reentry ? (
                  <Field
                    label="Justificativa *"
                    htmlFor="checkin-reentry-justification"
                    className="mt-3"
                  >
                    <textarea
                      id="checkin-reentry-justification"
                      value={justification}
                      onChange={(change) =>
                        setJustification(change.target.value)
                      }
                      maxLength={500}
                      rows={3}
                      className={textareaCls}
                    />
                  </Field>
                ) : null}
              </div>
            ) : null}
            {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={processing}>
                {processing ? (
                  "Validando…"
                ) : (
                  <>
                    <ScanLine className="h-4 w-4" aria-hidden="true" />
                    Registrar check-in
                  </>
                )}
              </Button>
            </div>
          </form>
        </Panel>
        <div className="flex flex-col gap-5">
          {result ? (
            <CheckInResultCard result={result} />
          ) : (
            <Panel>
              <div className="flex flex-col items-center gap-2 p-6 text-center sm:p-8">
                <div className="rounded-app-pill bg-app-primary/10 p-3 text-app-primary">
                  <ScanLine className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-app-foreground">
                  Pronto para validar
                </h3>
                <p className="max-w-sm text-xs leading-relaxed text-app-muted-foreground">
                  Após a leitura, o resultado e os dados do participante serão
                  exibidos aqui.
                </p>
              </div>
            </Panel>
          )}
          <InlineAlert tone="info">
            <span className="font-semibold">Importante:</span> não compartilhe
            tokens de credencial. Uma tentativa duplicada será recusada, a menos
            que um operador autorizado registre uma reentrada com justificativa.
          </InlineAlert>
        </div>
      </div>
    </div>
  );
}

function CheckInResultCard({ result }: { result: CheckInResponse }) {
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-app-border bg-app-success/10 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-app-success">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          <h3 className="text-sm font-bold">Check-in autorizado</h3>
        </div>
        <p className="mt-1 text-xs text-app-muted-foreground">
          A presença foi registrada com sucesso.
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <Detail label="Participante" value={result.participantName} />
        <Detail label="Evento" value={result.eventTitle} />
        <Detail label="Código da inscrição" value={result.registrationCode} />
        <Detail
          label="Registrado em"
          value={formatDate({ value: result.happenedAt, withTime: true })}
        />
        <Detail label="Operador" value={result.operatorName} />
        {result.previousCheckInAt ? (
          <Detail
            label="Check-in anterior"
            value={formatDate({
              value: result.previousCheckInAt,
              withTime: true,
            })}
          />
        ) : null}
      </dl>
      {result.reason ? (
        <div className="border-t border-app-border p-4">
          <InlineAlert tone="danger">
            <XCircle className="mr-1 inline h-4 w-4" aria-hidden="true" />
            {result.reason}
          </InlineAlert>
        </div>
      ) : null}
    </Panel>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-app-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-app-foreground">
        {value}
      </dd>
    </div>
  );
}

type DetectedCode = { rawValue: string };
type BrowserBarcodeDetector = {
  detect: (source: HTMLVideoElement) => Promise<DetectedCode[]>;
};
type BrowserBarcodeDetectorConstructor = new (options: {
  formats: string[];
}) => BrowserBarcodeDetector;
type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: BrowserBarcodeDetectorConstructor;
};

function QrCameraScanner({
  onDetected,
  onClose,
}: {
  onDetected: (value: string) => void;
  onClose: () => void;
}) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | null = null;
    let intervalId: number | null = null;
    let scanning = false;

    async function startCamera(): Promise<void> {
      const Detector = (window as WindowWithBarcodeDetector).BarcodeDetector;
      if (!Detector) {
        setCameraError(
          "Este navegador não oferece leitura de QR pela câmera. Use um leitor USB/Bluetooth ou cole o token manualmente.",
        );
        setStarting(false);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "A câmera não está disponível neste navegador ou contexto. Use o campo de token manualmente.",
        );
        setStarting(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video)
          throw new Error("Não foi possível iniciar a prévia da câmera.");
        video.srcObject = stream;
        await video.play();
        if (disposed) return;
        const detector = new Detector({ formats: ["qr_code"] });
        setStarting(false);
        intervalId = window.setInterval(() => {
          if (scanning || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)
            return;
          scanning = true;
          void detector
            .detect(video)
            .then((codes) => {
              const payload = codes
                .find((code) => code.rawValue.trim())
                ?.rawValue.trim();
              if (payload && !disposed) {
                onDetected(payload);
                onClose();
              }
            })
            .catch(() => undefined)
            .finally(() => {
              scanning = false;
            });
        }, 500);
      } catch (caught) {
        if (!disposed) {
          setCameraError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível acessar a câmera.",
          );
          setStarting(false);
        }
      }
    }

    void startCamera();
    return () => {
      disposed = true;
      if (intervalId !== null) window.clearInterval(intervalId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onClose, onDetected]);

  return (
    <div className="rounded-app-md border border-app-border bg-app-surface-elevated/40 p-3">
      <video
        ref={videoRef}
        aria-label="Prévia da câmera para leitura do QR Code"
        className="aspect-video w-full rounded-app-sm bg-black object-cover"
        muted
        playsInline
      />
      {starting ? (
        <p className="mt-2 text-xs text-app-muted-foreground">
          Iniciando câmera…
        </p>
      ) : null}
      {cameraError ? (
        <InlineAlert tone="danger" className="mt-3">
          {cameraError}
        </InlineAlert>
      ) : (
        <p className="mt-2 text-xs text-app-muted-foreground">
          Mantenha o QR Code dentro do quadro. A câmera será fechada após a
          leitura.
        </p>
      )}
    </div>
  );
}
