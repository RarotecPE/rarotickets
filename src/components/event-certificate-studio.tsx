"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from "react";
import Link from "next/link";
import JSZip from "jszip";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Archive,
  ArrowLeft,
  ArrowRight,
  Ban,
  Bookmark,
  CheckCircle2,
  CheckSquare,
  Clock,
  Crosshair,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileDown,
  FolderArchive,
  Loader2,
  MailCheck,
  Move,
  Palette,
  Pause,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Square,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import {
  interpolateCertificateTemplate,
  sanitizeCertificateFilename,
} from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import type {
  CertificateEmailConfig,
  CertificateExtraRecipient,
  CertificateFontFamily,
  CertificateLayoutConfig,
  CertificateRecipientVariables,
  CertificateSelectionConfig,
  CertificateTextAlign,
  CertificateTextFieldConfig,
  CertificateWorkflowStatus,
} from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import type {
  CertificateEventWorkspaceReadModel,
  CertificatePresetReadModel,
  CertificateWorkspaceRecipientReadModel,
} from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import {
  createDefaultCertificateBasePdf,
  getPdfDimensions,
  renderCertificatePdf,
} from "@/shared/utils/certificate-pdf.util";
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
import { cn, formatDate } from "@/lib/utils";

type StudioStep = "participants" | "studio" | "generator" | "messenger";

type GeneratedBatchItem = {
  recipientKey: string;
  participantName: string;
  participantEmail: string;
  authenticationCode: string;
  zipFilename: string;
  attachmentFilename: string;
  pdfBytes: Uint8Array;
  generatedAt: string;
};

type DragInteractionState = {
  mode: "move" | "resize" | "move-qr";
  fieldId: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
};

const AVAILABLE_FONTS: Array<{
  value: CertificateFontFamily;
  label: string;
  cssFont: string;
}> = [
  {
    value: "Helvetica-Bold",
    label: "Helvetica Bold (Sans-Serif)",
    cssFont: "Helvetica, Arial, sans-serif",
  },
  {
    value: "Helvetica",
    label: "Helvetica Regular (Sans-Serif)",
    cssFont: "Helvetica, Arial, sans-serif",
  },
  {
    value: "Times-Bold",
    label: "Times Roman Bold (Clássico)",
    cssFont: '"Times New Roman", Times, serif',
  },
  {
    value: "Times-Roman",
    label: "Times Roman Regular (Clássico)",
    cssFont: '"Times New Roman", Times, serif',
  },
  {
    value: "Courier-Bold",
    label: "Courier Bold (Monoespaçada)",
    cssFont: '"Courier New", Courier, monospace',
  },
  {
    value: "Courier",
    label: "Courier Regular (Monoespaçada)",
    cssFont: '"Courier New", Courier, monospace',
  },
];

export type EventCertificateStudioProps = {
  eventId: string;
};

export function EventCertificateStudio({
  eventId,
}: EventCertificateStudioProps) {
  const [workspace, setWorkspace] =
    useState<CertificateEventWorkspaceReadModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<StudioStep>("participants");

  const [workloadHours, setWorkloadHours] = useState<number>(8);
  const [certificateDescription, setCertificateDescription] =
    useState<string>("");
  const [layoutConfig, setLayoutConfig] =
    useState<CertificateLayoutConfig | null>(null);
  const [emailConfig, setEmailConfig] = useState<CertificateEmailConfig | null>(
    null,
  );
  const [selectionConfig, setSelectionConfig] =
    useState<CertificateSelectionConfig | null>(null);
  const [recipients, setRecipients] = useState<
    CertificateWorkspaceRecipientReadModel[]
  >([]);
  const [presets, setPresets] = useState<CertificatePresetReadModel[]>([]);

  const [basePdfBytes, setBasePdfBytes] = useState<Uint8Array | null>(null);
  const [templatePdfKey, setTemplatePdfKey] = useState<string | null>(null);
  const [templatePdfName, setTemplatePdfName] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  // Step 1 state
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantFilter, setParticipantFilter] = useState<
    "all" | "selected" | "checkin" | "missing-email"
  >("all");

  // Step 2 Studio state
  const [pdfSize, setPdfSize] = useState<{ width: number; height: number }>({
    width: 842,
    height: 595,
  });
  const [stageWidth, setStageWidth] = useState<number>(640);
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [previewRecipientIdx, setPreviewRecipientIdx] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"interactive" | "merged-pdf">(
    "interactive",
  );
  const [renderVersion, setRenderVersion] = useState<number>(0);
  const [isRenderingPreview, setIsRenderingPreview] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragInteractionState | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Step 3 Generator state
  const [generatedBatch, setGeneratedBatch] = useState<GeneratedBatchItem[]>(
    [],
  );
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  }>({ current: 0, total: 0 });
  const [isZipping, setIsZipping] = useState(false);
  const [zipArchiveName, setZipArchiveName] = useState("certificados.zip");
  const [previewModalItem, setPreviewModalItem] = useState<{
    name: string;
    url: string;
  } | null>(null);

  // Step 4 Messenger state
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [sendingRecipientKey, setSendingRecipientKey] = useState<string | null>(
    null,
  );
  const stopQueueRef = useRef(false);
  const recipientsRef = useRef(recipients);
  useEffect(() => {
    recipientsRef.current = recipients;
  }, [recipients]);

  const applyLoadedWorkspace = useCallback(
    (ws: CertificateEventWorkspaceReadModel): void => {
      setWorkspace(ws);
      setWorkloadHours(ws.event.workloadHours || 8);
      setCertificateDescription(ws.event.certificateDescription || "");
      setLayoutConfig(ws.layoutConfig);
      setEmailConfig(ws.emailConfig);
      setSelectionConfig(ws.selectionConfig);
      setRecipients(ws.recipients);
      setPresets(ws.presets);
      setTemplatePdfKey(ws.event.templatePdfKey);
      setTemplatePdfName(ws.event.templatePdfName);
      setZipArchiveName(`certificados-${ws.event.slug || "evento"}.zip`);
      setSelectedFieldId((prev) =>
        ws.layoutConfig.fields.length > 0 &&
        !ws.layoutConfig.fields.some((f) => f.id === prev)
          ? ws.layoutConfig.fields[0].id
          : prev,
      );
      setTestRecipientEmail((prev) =>
        !prev && ws.event.responsibleEmail ? ws.event.responsibleEmail : prev,
      );
    },
    [],
  );

  useEffect(() => {
    let active = true;
    async function loadInitial(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const ws = await ticketingApi.getEventCertificateWorkspace({ eventId });
        if (!active) return;
        applyLoadedWorkspace(ws);

        if (ws.event.templatePdfKey) {
          try {
            const pdfBytes =
              await ticketingApi.fetchCertificateTemplatePdfBytes({
                eventId,
                key: ws.event.templatePdfKey,
              });
            if (active) setBasePdfBytes(pdfBytes);
          } catch {
            // Se o arquivo antigo não estiver acessível, usa o modelo padrão
          }
        }
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar o estúdio de certificados deste evento.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInitial();
    return () => {
      active = false;
    };
  }, [eventId, applyLoadedWorkspace]);

  const buildVariablesForRecipient = useCallback(
    (
      recipient: CertificateWorkspaceRecipientReadModel | undefined,
    ): CertificateRecipientVariables => {
      const eventTitle = workspace?.event.title || "Evento";
      const eventDateText = workspace
        ? new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeZone: "America/Sao_Paulo",
          }).format(new Date(workspace.event.startAt))
        : "";
      const code = recipient?.authenticationCode || "CERT-2026-DEMO0001";
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const verificationUrl = `${origin}/certificados/${encodeURIComponent(code)}`;

      return {
        nome: recipient?.name || "Nome do Participante",
        email: recipient?.email || "participante@email.com",
        cpf: recipient?.cpf || "000.000.000-00",
        empresa: recipient?.company || "Instituição / Empresa",
        cargo: recipient?.jobTitle || "Participante",
        evento: eventTitle,
        data_evento: eventDateText,
        carga_horaria: `${workloadHours || 8}h`,
        descricao_certificado:
          certificateDescription ||
          `participou com êxito do evento ${eventTitle}`,
        responsavel: workspace?.event.responsibleName || "Organização",
        codigo_autenticacao: code,
        link_validacao: verificationUrl,
        codigo_inscricao: recipient?.registrationCode || "INS-2026-0001",
        customVars: recipient?.customVars ?? {},
      };
    },
    [workspace, workloadHours, certificateDescription],
  );

  // Track stage width for 1:1 scaling in Step 2
  useEffect(() => {
    if (activeStep !== "studio" || loading) return;
    const el = canvasContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (el.clientWidth > 0) {
        setStageWidth(el.clientWidth);
      }
    };
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeStep, basePdfBytes, viewMode, renderVersion, loading, pdfSize.width]);

  // Render PDF to <canvas> via pdfjs-dist in Step 2 (both interactive and merged-pdf modes)
  useEffect(() => {
    if (activeStep !== "studio" || !workspace || !layoutConfig) {
      return;
    }

    let cancelled = false;

    const renderToCanvas = async () => {
      setIsRenderingPreview(true);
      try {
        let effectiveBytes = basePdfBytes;
        if (!effectiveBytes && templatePdfKey) {
          try {
            effectiveBytes =
              await ticketingApi.fetchCertificateTemplatePdfBytes({
                eventId,
                key: templatePdfKey,
              });
            if (!cancelled) setBasePdfBytes(effectiveBytes);
          } catch {
            // fallback para o modelo institucional
          }
        }
        if (!effectiveBytes) {
          effectiveBytes = await createDefaultCertificateBasePdf({
            eventTitle: workspace.event.title,
            description: certificateDescription,
            workloadHours,
            eventDateText: new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short",
            }).format(new Date(workspace.event.startAt)),
            responsibleName: workspace.event.responsibleName,
          });
        }

        if (cancelled) return;

        const dims = await getPdfDimensions({ pdfBytes: effectiveBytes });
        if (!cancelled) {
          setPdfSize({
            width: Math.round(dims.width),
            height: Math.round(dims.height),
          });
        }

        let bytesToRender = effectiveBytes;
        if (viewMode === "merged-pdf") {
          const sampleRecipient =
            recipients.filter((r) => r.selected)[previewRecipientIdx] ??
            recipients[previewRecipientIdx] ??
            recipients[0];
          const vars = buildVariablesForRecipient(sampleRecipient);
          bytesToRender = await renderCertificatePdf({
            basePdfBytes: effectiveBytes,
            layoutConfig,
            variables: vars,
          });
        }

        if (cancelled) return;

        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const loadingTask = pdfjsLib.getDocument({
          data: bytesToRender.slice(0),
        });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);

        if (cancelled || !pdfCanvasRef.current) return;

        const baseViewport = page.getViewport({ scale: 1 });
        setPdfSize({
          width: Math.round(baseViewport.width),
          height: Math.round(baseViewport.height),
        });

        const renderScale = 2;
        const viewport = page.getViewport({ scale: renderScale });
        const canvas = pdfCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;
      } catch (err) {
        console.error("Erro ao renderizar PDF no canvas do estúdio:", err);
      } finally {
        if (!cancelled) setIsRenderingPreview(false);
      }
    };

    void renderToCanvas();

    return () => {
      cancelled = true;
    };
  }, [
    activeStep,
    viewMode,
    basePdfBytes,
    templatePdfKey,
    eventId,
    workspace,
    layoutConfig,
    previewRecipientIdx,
    recipients,
    workloadHours,
    certificateDescription,
    buildVariablesForRecipient,
    renderVersion,
  ]);

  function buildCurrentSelectionConfig(
    nextRecipients: CertificateWorkspaceRecipientReadModel[],
    includeWithoutCheckInOverride?: boolean,
  ): CertificateSelectionConfig {
    const includeWithoutCheckIn =
      includeWithoutCheckInOverride ??
      selectionConfig?.includeWithoutCheckIn ??
      false;

    const overrides: CertificateSelectionConfig["overrides"] = {};
    const extraRecipients: CertificateExtraRecipient[] = [];

    for (const r of nextRecipients) {
      if (r.source === "extra") {
        extraRecipients.push({
          id: r.recipientKey,
          selected: r.selected,
          name: r.name,
          email: r.email,
          cpf: r.cpf,
          company: r.company,
          jobTitle: r.jobTitle,
          roleLabel: r.registrationCode || "EXTRA",
          customVars: r.customVars,
        });
      } else {
        overrides[r.recipientKey] = {
          selected: r.selected,
          name: r.name,
          email: r.email,
          cpf: r.cpf,
          company: r.company,
          jobTitle: r.jobTitle,
          customVars: r.customVars,
        };
      }
    }

    return {
      includeWithoutCheckIn,
      overrides,
      extraRecipients,
    };
  }

  async function handleSaveWorkspace(options?: {
    issueBatch?: boolean;
    workflowStatus?: CertificateWorkflowStatus;
    resetEmailStatuses?: boolean;
    silent?: boolean;
  }): Promise<CertificateEventWorkspaceReadModel | null> {
    if (!layoutConfig || !emailConfig) return null;
    setSavingWorkspace(true);
    setError(null);
    if (!options?.silent) setNotice(null);

    try {
      const nextSelection = buildCurrentSelectionConfig(recipients);
      const updated = await ticketingApi.saveEventCertificateWorkspace({
        eventId,
        workloadHours,
        certificateDescription,
        templatePdfKey,
        templatePdfName,
        layoutConfig,
        emailConfig,
        selectionConfig: nextSelection,
        workflowStatus: options?.workflowStatus,
        issueBatch: options?.issueBatch,
        resetEmailStatuses: options?.resetEmailStatuses,
      });
      applyLoadedWorkspace(updated);
      if (!options?.silent) {
        setNotice(
          options?.issueBatch
            ? "Certificados emitidos com código de autenticidade!"
            : "Configurações salvas com sucesso.",
        );
      }
      return updated;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar as configurações de certificado.",
      );
      return null;
    } finally {
      setSavingWorkspace(false);
    }
  }

  async function handleUploadPdfTemplate(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingPdf(true);
    setError(null);
    setNotice(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const uploaded = await ticketingApi.uploadCertificateTemplate({
        eventId,
        file,
      });
      setBasePdfBytes(bytes);
      setTemplatePdfKey(uploaded.templatePdfKey);
      setTemplatePdfName(uploaded.templatePdfName);
      setRenderVersion((v) => v + 1);
      setNotice(`Modelo PDF “${uploaded.templatePdfName}” enviado!`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Falha ao enviar o arquivo PDF do modelo.",
      );
    } finally {
      setUploadingPdf(false);
    }
  }

  function handleToggleIncludeWithoutCheckIn(checked: boolean): void {
    const updatedRecipients = recipients.map((r) => {
      if (r.source === "confirmado") {
        return { ...r, selected: checked };
      }
      return r;
    });
    setRecipients(updatedRecipients);
    setSelectionConfig(
      buildCurrentSelectionConfig(updatedRecipients, checked),
    );
  }

  function handleUpdateRecipientField(
    recipientKey: string,
    patch: Partial<CertificateWorkspaceRecipientReadModel>,
  ): void {
    const next = recipients.map((r) =>
      r.recipientKey === recipientKey ? { ...r, ...patch } : r,
    );
    setRecipients(next);
    setSelectionConfig(buildCurrentSelectionConfig(next));
  }

  function handleAddExtraRecipient(): void {
    const newKey = `extra:${Date.now()}`;
    const newItem: CertificateWorkspaceRecipientReadModel = {
      recipientKey: newKey,
      source: "extra",
      registrationId: null,
      participantId: null,
      registrationCode: "EXTRA",
      selected: true,
      name: "",
      originalName: "",
      email: "",
      cpf: "",
      company: "",
      jobTitle: "",
      hasCheckIn: false,
      checkInAt: null,
      customVars: {},
      certificateId: null,
      authenticationCode: null,
      issuedAt: null,
      emailStatus: "idle",
      emailSentAt: null,
      emailError: null,
    };
    const next = [newItem, ...recipients];
    setRecipients(next);
    setSelectionConfig(buildCurrentSelectionConfig(next));
  }

  function handleDeleteExtraRecipient(recipientKey: string): void {
    const next = recipients.filter((r) => r.recipientKey !== recipientKey);
    setRecipients(next);
    setSelectionConfig(buildCurrentSelectionConfig(next));
  }

  // Step 2 Studio field helpers
  function updateTextField(
    id: string,
    patch: Partial<CertificateTextFieldConfig>,
  ): void {
    if (!layoutConfig) return;
    setLayoutConfig({
      ...layoutConfig,
      fields: layoutConfig.fields.map((f) =>
        f.id === id ? { ...f, ...patch } : f,
      ),
    });
  }

  function handleAddTextField(): void {
    if (!layoutConfig) return;
    const newId = `field-${Date.now()}`;
    const defaultWidth = Math.min(440, Math.round(pdfSize.width * 0.6));
    const newField: CertificateTextFieldConfig = {
      id: newId,
      label: `Campo Extra ${layoutConfig.fields.length + 1}`,
      template: "{{carga_horaria}}",
      x: Math.round((pdfSize.width - defaultWidth) / 2),
      y: Math.max(80, Math.round(pdfSize.height / 2) - 55),
      fontSize: 14,
      fontFamily: "Helvetica",
      colorHex: "#334155",
      align: "center",
      maxWidth: defaultWidth,
    };
    setLayoutConfig({
      ...layoutConfig,
      fields: [...layoutConfig.fields, newField],
    });
    setSelectedFieldId(newId);
  }

  function handleRemoveTextField(id: string): void {
    if (!layoutConfig || layoutConfig.fields.length <= 1) return;
    const nextFields = layoutConfig.fields.filter((f) => f.id !== id);
    setLayoutConfig({
      ...layoutConfig,
      fields: nextFields,
    });
    if (selectedFieldId === id) {
      setSelectedFieldId(nextFields[0]?.id || "");
    }
  }

  function handleCenterFieldOnPage(field: CertificateTextFieldConfig): void {
    const boxWidth = field.maxWidth || 440;
    updateTextField(field.id, {
      x: Math.max(0, Math.round((pdfSize.width - boxWidth) / 2)),
    });
  }

  async function handleSavePreset(): Promise<void> {
    if (!newPresetName.trim() || !layoutConfig || savingPreset) return;
    setSavingPreset(true);
    setError(null);
    setNotice(null);

    try {
      const created = await ticketingApi.createCertificatePreset({
        name: newPresetName.trim(),
        templatePdfKey,
        templatePdfName,
        layoutConfig,
        emailConfig,
        workloadHoursDefault: workloadHours,
      });
      setPresets([created, ...presets]);
      setNewPresetName("");
      setNotice(`Modelo “${created.name}” salvo!`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar o modelo.",
      );
    } finally {
      setSavingPreset(false);
    }
  }

  async function handleDeletePreset(
    preset: CertificatePresetReadModel,
  ): Promise<void> {
    if (deletingPresetId) return;
    setDeletingPresetId(preset.id);
    setError(null);
    setNotice(null);

    try {
      await ticketingApi.deleteCertificatePreset({ presetId: preset.id });
      setPresets((prev) => prev.filter((item) => item.id !== preset.id));
      setNotice(`Modelo “${preset.name}” excluído.`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível excluir o modelo.",
      );
    } finally {
      setDeletingPresetId(null);
    }
  }

  async function handleApplyPreset(
    preset: CertificatePresetReadModel,
  ): Promise<void> {
    const clonedLayout = JSON.parse(
      JSON.stringify(preset.layoutConfig),
    ) as CertificateLayoutConfig;
    setLayoutConfig(clonedLayout);
    if (clonedLayout.fields[0]) {
      setSelectedFieldId(clonedLayout.fields[0].id);
    }
    if (preset.emailConfig) {
      setEmailConfig({ ...preset.emailConfig });
    }
    if (preset.workloadHoursDefault) {
      setWorkloadHours(preset.workloadHoursDefault);
    }
    if (preset.templatePdfKey) {
      setTemplatePdfKey(preset.templatePdfKey);
      setTemplatePdfName(preset.templatePdfName);
      try {
        const bytes = await ticketingApi.fetchCertificateTemplatePdfBytes({
          eventId,
          key: preset.templatePdfKey,
        });
        setBasePdfBytes(bytes);
      } catch {
        // Caso o PDF do preset não esteja acessível, mantém apenas o layout
      }
    }
    setRenderVersion((v) => v + 1);
    setNotice(`Modelo “${preset.name}” aplicado.`);
  }

  const stageScale = pdfSize.width > 0 ? stageWidth / pdfSize.width : 1;

  function handlePointerMove(e: PointerEvent<HTMLDivElement>): void {
    if (!dragState || !layoutConfig) return;

    const dxPx = e.clientX - dragState.startClientX;
    const dyPx = e.clientY - dragState.startClientY;

    const rect = canvasContainerRef.current?.getBoundingClientRect();
    const scaleX =
      rect && rect.width > 0 ? rect.width / pdfSize.width : stageScale;
    const scaleY =
      rect && rect.height > 0 ? rect.height / pdfSize.height : stageScale;

    const dxPt = dxPx / scaleX;
    const dyPt = -dyPx / scaleY;

    if (dragState.mode === "move") {
      const nextX = Math.round(
        Math.max(0, Math.min(pdfSize.width - 40, dragState.startX + dxPt)),
      );
      const nextY = Math.round(
        Math.max(5, Math.min(pdfSize.height - 15, dragState.startY + dyPt)),
      );
      updateTextField(dragState.fieldId, { x: nextX, y: nextY });
    } else if (dragState.mode === "resize") {
      const maxAllowedWidth = Math.max(80, pdfSize.width - dragState.startX);
      const nextWidth = Math.round(
        Math.max(80, Math.min(maxAllowedWidth, dragState.startWidth + dxPt)),
      );
      updateTextField(dragState.fieldId, { maxWidth: nextWidth });
    } else if (dragState.mode === "move-qr") {
      const qrSize = layoutConfig.qrCode.size || 76;
      const nextX = Math.round(
        Math.max(0, Math.min(pdfSize.width - qrSize, dragState.startX + dxPt)),
      );
      const nextY = Math.round(
        Math.max(
          10,
          Math.min(pdfSize.height - qrSize, dragState.startY + dyPt),
        ),
      );
      setLayoutConfig({
        ...layoutConfig,
        qrCode: {
          ...layoutConfig.qrCode,
          x: nextX,
          y: nextY,
        },
      });
    }
  }

  function handlePointerUp(): void {
    if (dragState) {
      setDragState(null);
    }
  }

  // Step 3: Issue in DB + Generate PDFs in memory for preview & ZIP
  async function handleGenerateBatchPdfs(): Promise<void> {
    if (!layoutConfig || !emailConfig || isGeneratingBatch) return;
    setIsGeneratingBatch(true);
    setError(null);
    setNotice(null);

    try {
      const updatedWs = await handleSaveWorkspace({
        issueBatch: true,
        silent: true,
      });
      const currentRecipients = updatedWs
        ? updatedWs.recipients
        : recipients;
      const selectedList = currentRecipients.filter(
        (r) => r.selected && r.name.trim().length > 0,
      );

      setBatchProgress({ current: 0, total: selectedList.length });
      const newBatch: GeneratedBatchItem[] = [];
      const usedZipNames = new Set<string>();

      for (let i = 0; i < selectedList.length; i++) {
        const r = selectedList[i];
        const vars = buildVariablesForRecipient(r);
        const pdfBytes = await renderCertificatePdf({
          basePdfBytes,
          layoutConfig,
          variables: vars,
        });

        const baseSafeName = sanitizeCertificateFilename({ value: r.name });
        let zipEntryName = `${baseSafeName}.pdf`;
        if (usedZipNames.has(zipEntryName.toLowerCase())) {
          zipEntryName = `${baseSafeName}_${i + 1}.pdf`;
        }
        usedZipNames.add(zipEntryName.toLowerCase());

        const attachmentFilename = `Certificado - ${r.name.trim() || "Participante"}.pdf`;

        newBatch.push({
          recipientKey: r.recipientKey,
          participantName: r.name,
          participantEmail: r.email,
          authenticationCode: r.authenticationCode || "CERT-EMITIDO",
          zipFilename: zipEntryName,
          attachmentFilename,
          pdfBytes,
          generatedAt: new Date().toLocaleTimeString("pt-BR"),
        });

        setBatchProgress({ current: i + 1, total: selectedList.length });
      }

      setGeneratedBatch(newBatch);
      setNotice(
        `${newBatch.length} certificado(s) emitido(s) e prontos para revisão ou disparo!`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao gerar lote de certificados.",
      );
    } finally {
      setIsGeneratingBatch(false);
    }
  }

  async function handleDownloadZip(): Promise<void> {
    if (generatedBatch.length === 0 || isZipping) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const item of generatedBatch) {
        zip.file(item.zipFilename, item.pdfBytes);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipArchiveName.endsWith(".zip")
        ? zipArchiveName
        : `${zipArchiveName}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } finally {
      setIsZipping(false);
    }
  }

  function handleDownloadSinglePdf(item: GeneratedBatchItem): void {
    const blob = new Blob([new Uint8Array(item.pdfBytes)], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.zipFilename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function handlePreviewSinglePdf(item: GeneratedBatchItem): void {
    if (previewModalItem?.url) {
      URL.revokeObjectURL(previewModalItem.url);
    }
    const blob = new Blob([new Uint8Array(item.pdfBytes)], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    setPreviewModalItem({ name: item.participantName, url });
  }

  // Step 4: RaroNexus Email Dispatch
  async function handleSendTestEmail(): Promise<void> {
    if (!testRecipientEmail.trim() || isSendingTest) return;
    setIsSendingTest(true);
    setTestFeedback(null);

    try {
      await handleSaveWorkspace({ silent: true });
      const res = await ticketingApi.sendCertificateEmail({
        eventId,
        testRecipient: testRecipientEmail.trim(),
      });
      setTestFeedback({
        type: "success",
        text: `E-mail de teste enviado via RaroNexus para ${res.toEmail}!`,
      });
    } catch (caught) {
      setTestFeedback({
        type: "error",
        text:
          caught instanceof Error
            ? caught.message
            : "Falha ao enviar e-mail de teste via RaroNexus.",
      });
    } finally {
      setIsSendingTest(false);
    }
  }

  async function sendSingleRecipientEmail(
    recipient: CertificateWorkspaceRecipientReadModel,
  ): Promise<boolean> {
    if (!recipient.email || !recipient.email.includes("@")) {
      setRecipients((prev) =>
        prev.map((item) =>
          item.recipientKey === recipient.recipientKey
            ? {
                ...item,
                emailStatus: "failed",
                emailError: "E-mail ausente ou inválido",
              }
            : item,
        ),
      );
      return false;
    }

    setSendingRecipientKey(recipient.recipientKey);
    setRecipients((prev) =>
      prev.map((item) =>
        item.recipientKey === recipient.recipientKey
          ? { ...item, emailStatus: "sending", emailError: null }
          : item,
      ),
    );

    try {
      const res = await ticketingApi.sendCertificateEmail({
        eventId,
        recipientKey: recipient.recipientKey,
      });

      setRecipients((prev) =>
        prev.map((item) =>
          item.recipientKey === recipient.recipientKey
            ? {
                ...item,
                authenticationCode:
                  res.authenticationCode || item.authenticationCode,
                emailStatus: "sent",
                emailSentAt: new Date(res.sentAt),
                emailError: null,
              }
            : item,
        ),
      );
      return true;
    } catch (caught) {
      const msg =
        caught instanceof Error ? caught.message : "Erro no envio RaroNexus";
      setRecipients((prev) =>
        prev.map((item) =>
          item.recipientKey === recipient.recipientKey
            ? {
                ...item,
                emailStatus: "failed",
                emailError: msg,
              }
            : item,
        ),
      );
      return false;
    } finally {
      setSendingRecipientKey(null);
    }
  }

  async function runEmailQueue(onlyFailed: boolean): Promise<void> {
    if (isQueueRunning || !emailConfig) return;

    const savedWs = await handleSaveWorkspace({
      issueBatch: true,
      silent: true,
    });
    const listToFilter = savedWs ? savedWs.recipients : recipientsRef.current;

    const queue = listToFilter.filter((r) => {
      if (!r.selected) return false;
      if (onlyFailed) return r.emailStatus === "failed";
      return r.emailStatus !== "sent";
    });

    if (queue.length === 0) return;

    stopQueueRef.current = false;
    setIsQueueRunning(true);

    for (let i = 0; i < queue.length; i++) {
      if (stopQueueRef.current) break;
      const target = queue[i];
      await sendSingleRecipientEmail(target);

      if (i < queue.length - 1 && !stopQueueRef.current) {
        const waitMs = Math.max(500, (emailConfig.delaySeconds || 2) * 1000);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }

    setIsQueueRunning(false);

    const afterList = recipientsRef.current.filter((r) => r.selected);
    if (
      afterList.length > 0 &&
      afterList.every((r) => r.emailStatus === "sent")
    ) {
      await handleSaveWorkspace({
        workflowStatus: "concluido",
        silent: true,
      });
      setNotice(
        "Todos os certificados selecionados foram enviados via RaroNexus e o evento foi marcado como Concluído!",
      );
    }
  }

  function handlePauseQueue(): void {
    stopQueueRef.current = true;
    setIsQueueRunning(false);
  }

  function handleExportCsvReport(): void {
    const headers = [
      "Nome",
      "Email",
      "Origem",
      "Codigo_Autenticacao",
      "Status_Email",
      "Data_Envio",
      "Detalhes_Erro",
    ];
    const rows = recipients
      .filter((r) => r.selected)
      .map((r) => [
        `"${(r.name || "").replace(/"/g, '""')}"`,
        `"${(r.email || "").replace(/"/g, '""')}"`,
        r.source,
        r.authenticationCode || "",
        r.emailStatus || "idle",
        r.emailSentAt
          ? formatDate({ value: r.emailSentAt, withTime: true })
          : "",
        `"${(r.emailError || "").replace(/"/g, '""')}"`,
      ]);
    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_certificados_${workspace?.event.slug || "evento"}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const filteredRecipients = useMemo(() => {
    const q = participantSearch.trim().toLowerCase();
    return recipients.filter((r) => {
      if (participantFilter === "selected" && !r.selected) return false;
      if (participantFilter === "checkin" && !r.hasCheckIn) return false;
      if (
        participantFilter === "missing-email" &&
        r.email &&
        r.email.includes("@")
      ) {
        return false;
      }
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.registrationCode || "").toLowerCase().includes(q)
      );
    });
  }, [recipients, participantSearch, participantFilter]);

  if (loading) {
    return (
      <Panel>
        <div className="p-5">
          <Spinner label="Carregando estúdio de certificados do evento…" />
        </div>
      </Panel>
    );
  }

  if (error && !workspace) {
    return (
      <div className="flex flex-col gap-4">
        <InlineAlert tone="danger">{error}</InlineAlert>
        <Link
          href="/painel/certificados"
          className="text-sm font-semibold text-app-primary hover:underline"
        >
          Voltar para a Central de Certificados
        </Link>
      </div>
    );
  }

  if (!workspace || !layoutConfig || !emailConfig || !selectionConfig) {
    return null;
  }

  const selectedRecipients = recipients.filter((r) => r.selected);
  const selectedCount = selectedRecipients.length;
  const checkInCount = recipients.filter((r) => r.hasCheckIn).length;
  const issuedCount = selectedRecipients.filter((r) =>
    Boolean(r.authenticationCode),
  ).length;
  const sentCount = selectedRecipients.filter(
    (r) => r.emailStatus === "sent",
  ).length;
  const failedCount = selectedRecipients.filter(
    (r) => r.emailStatus === "failed",
  ).length;
  const pendingSendCount = selectedRecipients.filter(
    (r) => r.emailStatus !== "sent",
  ).length;
  const missingEmailCount = selectedRecipients.filter(
    (r) => !r.email || !r.email.includes("@"),
  ).length;

  const activeField =
    layoutConfig.fields.find((f) => f.id === selectedFieldId) ||
    layoutConfig.fields[0];
  const sampleRecipientForPreview =
    selectedRecipients[previewRecipientIdx] ??
    recipients[previewRecipientIdx] ??
    recipients[0];
  const sampleVariables = buildVariablesForRecipient(sampleRecipientForPreview);

  const stepItems: Array<{
    id: StudioStep;
    step: string;
    title: string;
    icon: typeof Users;
    badge?: string;
    done?: boolean;
  }> = [
    {
      id: "participants",
      step: "01",
      title: "Participantes",
      icon: Users,
      badge: `${selectedCount} ativos`,
      done: selectedCount > 0,
    },
    {
      id: "studio",
      step: "02",
      title: "Estúdio do Modelo",
      icon: Palette,
      badge: templatePdfName ? "PDF Anexado" : "Padrão",
      done: true,
    },
    {
      id: "generator",
      step: "03",
      title: "Revisão & Lote",
      icon: FolderArchive,
      badge: issuedCount > 0 ? `${issuedCount} emitidos` : undefined,
      done: issuedCount > 0 && issuedCount >= selectedCount && selectedCount > 0,
    },
    {
      id: "messenger",
      step: "04",
      title: "Disparo RaroNexus",
      icon: Send,
      badge: sentCount > 0 ? `${sentCount}/${selectedCount}` : undefined,
      done: sentCount > 0 && sentCount === selectedCount,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho do Evento e Ações Globais */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/painel/certificados"
            className="inline-flex min-h-8 items-center gap-2 text-xs font-semibold text-app-muted-foreground hover:text-app-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar para Certificados
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold text-app-foreground">
              {workspace.event.title}
            </h2>
            <Badge
              tone={
                workspace.event.workflowStatus === "concluido"
                  ? "success"
                  : workspace.event.workflowStatus === "dispensado"
                    ? "muted"
                    : "warning"
              }
            >
              {workspace.event.workflowStatus === "concluido"
                ? "Concluído / Enviado"
                : workspace.event.workflowStatus === "dispensado"
                  ? "Não precisa de certificado"
                  : "Pendente de envio"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={savingWorkspace}
            onClick={() => void handleSaveWorkspace()}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {savingWorkspace ? "Salvando…" : "Salvar alterações"}
          </Button>

          {workspace.event.workflowStatus !== "dispensado" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={savingWorkspace}
              onClick={() =>
                void handleSaveWorkspace({ workflowStatus: "dispensado" })
              }
            >
              <Ban className="h-4 w-4" aria-hidden="true" />
              Não precisa de certificado
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={savingWorkspace}
              onClick={() =>
                void handleSaveWorkspace({ workflowStatus: "pendente" })
              }
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reativar como Pendente
            </Button>
          )}

          {workspace.event.workflowStatus !== "concluido" ? (
            <Button
              type="button"
              variant="primary"
              disabled={savingWorkspace}
              onClick={() =>
                void handleSaveWorkspace({ workflowStatus: "concluido" })
              }
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Marcar como Concluído
            </Button>
          ) : null}
        </div>
      </div>

      {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      {/* Barra de Etapas (01 a 04) — sem subtítulos extras */}
      <nav
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Etapas de emissão de certificados"
      >
        {stepItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeStep === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveStep(item.id)}
              className={cn(
                "flex items-center justify-between rounded-app-lg border p-3 text-left transition cursor-pointer",
                isActive
                  ? "border-app-primary bg-app-primary/10 text-app-foreground"
                  : "border-app-border bg-app-surface text-app-muted-foreground hover:bg-app-surface-elevated hover:text-app-foreground",
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-app-md",
                    isActive
                      ? "bg-app-primary text-white"
                      : item.done
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-app-surface-elevated text-app-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold uppercase text-app-primary">
                    {item.step}
                  </span>
                  <span className="truncate text-xs font-bold text-app-foreground">
                    {item.title}
                  </span>
                </div>
              </div>

              {item.badge ? (
                <Badge
                  tone={item.done ? "success" : "muted"}
                  className="ml-2 shrink-0"
                >
                  {item.badge}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* ==================== ETAPA 01: PARTICIPANTES ==================== */}
      {activeStep === "participants" && (
        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHeader title="Configuração do Certificado" />
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:p-5">
              <Field
                label="Carga horária (horas inteiras)"
                htmlFor="studio-workload-hours"
              >
                <input
                  id="studio-workload-hours"
                  type="number"
                  min={1}
                  max={1000}
                  value={workloadHours}
                  onChange={(e) =>
                    setWorkloadHours(Math.max(1, Number(e.target.value) || 1))
                  }
                  className={inputCls}
                />
              </Field>
              <Field
                label="Descrição / Texto do Certificado"
                htmlFor="studio-cert-description"
                className="sm:col-span-2"
              >
                <input
                  id="studio-cert-description"
                  type="text"
                  value={certificateDescription}
                  onChange={(e) => setCertificateDescription(e.target.value)}
                  placeholder={`Ex: participou com êxito do evento ${workspace.event.title}`}
                  className={inputCls}
                />
              </Field>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Destinatários"
              right={
                <Button
                  type="button"
                  compact
                  variant="secondary"
                  onClick={handleAddExtraRecipient}
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Adicionar Participante Extra
                </Button>
              }
            />

            <div className="space-y-4 p-4 sm:p-5">
              {/* Regra de Check-in e Filtros */}
              <div className="flex flex-col justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 p-3.5 lg:flex-row lg:items-center">
                <label className="flex items-center gap-2.5 text-xs font-medium text-app-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(selectionConfig.includeWithoutCheckIn)}
                    onChange={(e) =>
                      handleToggleIncludeWithoutCheckIn(e.target.checked)
                    }
                    className="h-4 w-4 accent-app-primary"
                  />
                  <span>
                    Incluir também inscritos{" "}
                    <strong>Confirmados sem Check-in</strong>
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "all", label: `Todos (${recipients.length})` },
                      {
                        id: "selected",
                        label: `Selecionados (${selectedCount})`,
                      },
                      { id: "checkin", label: `Com Check-in (${checkInCount})` },
                      {
                        id: "missing-email",
                        label: `Sem E-mail (${missingEmailCount})`,
                      },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setParticipantFilter(f.id)}
                      className={cn(
                        "rounded-app-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer",
                        participantFilter === f.id
                          ? "bg-app-primary text-white"
                          : "bg-app-surface text-app-muted-foreground hover:text-app-foreground",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {missingEmailCount > 0 ? (
                <InlineAlert tone="info">
                  Existem <strong>{missingEmailCount}</strong> participante(s)
                  selecionado(s) sem endereço de e-mail válido.
                </InlineAlert>
              ) : null}

              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-app-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder="Filtrar por nome, e-mail ou código da inscrição…"
                  className={cn(inputCls, "pl-9")}
                />
              </div>

              <div className="overflow-x-auto rounded-app-md border border-app-border">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="border-b border-app-border bg-app-surface-elevated/50 text-xs uppercase text-app-muted-foreground">
                    <tr>
                      <th className="w-12 px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            const allSelected =
                              filteredRecipients.length > 0 &&
                              filteredRecipients.every((r) => r.selected);
                            const ids = new Set(
                              filteredRecipients.map((r) => r.recipientKey),
                            );
                            const next = recipients.map((r) =>
                              ids.has(r.recipientKey)
                                ? { ...r, selected: !allSelected }
                                : r,
                            );
                            setRecipients(next);
                            setSelectionConfig(buildCurrentSelectionConfig(next));
                          }}
                          className="flex items-center justify-center text-app-muted-foreground hover:text-app-foreground cursor-pointer"
                          title="Selecionar/Desmarcar visíveis"
                        >
                          {filteredRecipients.length > 0 &&
                          filteredRecipients.every((r) => r.selected) ? (
                            <CheckSquare className="h-4 w-4 text-app-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-3 py-2.5">Nome no Certificado</th>
                      <th className="px-3 py-2.5">E-mail para Envio</th>
                      <th className="px-3 py-2.5">Origem / Presença</th>
                      <th className="px-3 py-2.5">Código Emitido</th>
                      <th className="w-14 px-3 py-2.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border text-sm">
                    {filteredRecipients.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-xs text-app-muted-foreground"
                        >
                          Nenhum participante encontrado para este filtro.
                        </td>
                      </tr>
                    ) : (
                      filteredRecipients.map((r) => (
                        <tr
                          key={r.recipientKey}
                          className={cn(
                            "transition",
                            r.selected
                              ? "bg-app-surface"
                              : "bg-app-background/50 opacity-60",
                          )}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={(e) =>
                                handleUpdateRecipientField(r.recipientKey, {
                                  selected: e.target.checked,
                                })
                              }
                              className="h-4 w-4 accent-app-primary cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={r.name}
                              onChange={(e) =>
                                handleUpdateRecipientField(r.recipientKey, {
                                  name: e.target.value,
                                })
                              }
                              placeholder="Nome completo no certificado"
                              className="w-full rounded-app-sm border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-app-foreground hover:border-app-border focus:border-app-primary focus:bg-app-surface-elevated focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="email"
                              value={r.email}
                              onChange={(e) =>
                                handleUpdateRecipientField(r.recipientKey, {
                                  email: e.target.value,
                                })
                              }
                              placeholder="email@exemplo.com"
                              className="w-full rounded-app-sm border border-transparent bg-transparent px-2 py-1 font-mono text-xs text-app-muted-foreground hover:border-app-border focus:border-app-primary focus:bg-app-surface-elevated focus:text-app-foreground focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            {r.source === "checkin" ? (
                              <Badge tone="success">Check-in validado</Badge>
                            ) : r.source === "confirmado" ? (
                              <Badge tone="warning">Sem check-in</Badge>
                            ) : (
                              <Badge tone="primary">Extra</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-app-muted-foreground">
                            {r.authenticationCode || "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {r.source === "extra" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteExtraRecipient(r.recipientKey)
                                }
                                className="rounded p-1 text-app-muted-foreground hover:bg-app-danger/10 hover:text-app-danger cursor-pointer"
                                title="Remover participante extra"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-app-border pt-4">
                <p className="text-xs text-app-muted-foreground">
                  <strong>{selectedCount}</strong> de{" "}
                  <strong>{recipients.length}</strong> destinatários marcados.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    void handleSaveWorkspace({ silent: true });
                    setActiveStep("studio");
                  }}
                >
                  Avançar para o Estúdio
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* ==================== ETAPA 02: ESTÚDIO DO MODELO ==================== */}
      {activeStep === "studio" && (
        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHeader
              title="Estúdio do Certificado"
              right={
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex h-9 items-center gap-2 rounded-app-md bg-app-primary px-3.5 text-xs font-semibold text-white hover:brightness-110 cursor-pointer">
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    {uploadingPdf
                      ? "Enviando PDF…"
                      : templatePdfName
                        ? "Substituir Modelo PDF (.pdf)"
                        : "Anexar Modelo PDF (.pdf)"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={uploadingPdf}
                      onChange={(e) => void handleUploadPdfTemplate(e)}
                      className="hidden"
                    />
                  </label>
                  {templatePdfName ? (
                    <Button
                      type="button"
                      compact
                      variant="secondary"
                      onClick={() => {
                        setBasePdfBytes(null);
                        setTemplatePdfKey(null);
                        setTemplatePdfName(null);
                        setRenderVersion((v) => v + 1);
                      }}
                    >
                      Usar Moldura Padrão
                    </Button>
                  ) : null}
                </div>
              }
            />

            <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 lg:grid-cols-12">
              {/* Coluna Esquerda: Controles de Campos, QR Code e Presets (5 cols) */}
              <div className="space-y-4 lg:col-span-5">
                {/* Lista de Campos de Texto */}
                <div className="space-y-3 rounded-app-lg border border-app-border bg-app-surface-elevated/30 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-app-foreground">
                      Campos de Texto
                    </h3>
                    <Button
                      type="button"
                      compact
                      variant="secondary"
                      onClick={handleAddTextField}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Adicionar Campo
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {layoutConfig.fields.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFieldId(f.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-app-md border px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer",
                          activeField?.id === f.id
                            ? "border-app-primary bg-app-primary text-white"
                            : "border-app-border bg-app-surface text-app-foreground hover:bg-app-surface-elevated",
                        )}
                      >
                        <span>{f.label}</span>
                        <span className="font-mono text-[11px] opacity-80">
                          ({f.template})
                        </span>
                        {layoutConfig.fields.length > 1 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTextField(f.id);
                            }}
                            className="ml-1 hover:text-rose-300"
                            title="Remover campo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {activeField ? (
                    <div className="space-y-3 border-t border-app-border pt-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field
                          label="Identificação do campo"
                          htmlFor="field-label"
                        >
                          <input
                            id="field-label"
                            type="text"
                            value={activeField.label}
                            onChange={(e) =>
                              updateTextField(activeField.id, {
                                label: e.target.value,
                              })
                            }
                            className={inputCls}
                          />
                        </Field>
                        <Field
                          label="Conteúdo / Variável"
                          htmlFor="field-template"
                        >
                          <input
                            id="field-template"
                            type="text"
                            value={activeField.template}
                            onChange={(e) =>
                              updateTextField(activeField.id, {
                                template: e.target.value,
                              })
                            }
                            placeholder="Ex: {{nome}}"
                            className={cn(inputCls, "font-mono")}
                          />
                        </Field>
                      </div>

                      {/* Pílulas de Variáveis do RaroTickets */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold text-app-muted-foreground">
                          Variáveis disponíveis:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {workspace.availableVariables.map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() =>
                                updateTextField(activeField.id, {
                                  template: `{{${v}}}`,
                                })
                              }
                              className="rounded border border-app-border bg-app-surface px-2 py-0.5 font-mono text-[11px] text-app-foreground hover:border-app-primary hover:text-app-primary cursor-pointer"
                            >
                              {`{{${v}}}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Coordenadas X, Y e Centralização */}
                      <div className="space-y-2.5 rounded-app-md border border-app-border bg-app-surface p-3">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-app-foreground">
                            <Crosshair className="h-3.5 w-3.5 text-app-primary" />
                            Posição ({pdfSize.width} × {pdfSize.height} pt)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCenterFieldOnPage(activeField)}
                            className="text-xs font-semibold text-app-primary underline cursor-pointer"
                          >
                            Centralizar Caixa na Página
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="mb-1 flex justify-between text-xs text-app-muted-foreground">
                              <span>Início X</span>
                              <span className="font-mono text-app-foreground">
                                {activeField.x} pt
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={Math.max(100, pdfSize.width - 40)}
                              value={activeField.x}
                              onChange={(e) =>
                                updateTextField(activeField.id, {
                                  x: Number(e.target.value),
                                })
                              }
                              className="w-full accent-app-primary"
                            />
                            <input
                              type="number"
                              value={activeField.x}
                              onChange={(e) =>
                                updateTextField(activeField.id, {
                                  x: Number(e.target.value),
                                })
                              }
                              className={cn(inputCls, "mt-1 h-8 font-mono text-xs")}
                            />
                          </div>

                          <div>
                            <div className="mb-1 flex justify-between text-xs text-app-muted-foreground">
                              <span>Base Y</span>
                              <span className="font-mono text-app-foreground">
                                {activeField.y} pt
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={pdfSize.height}
                              value={activeField.y}
                              onChange={(e) =>
                                updateTextField(activeField.id, {
                                  y: Number(e.target.value),
                                })
                              }
                              className="w-full accent-app-primary"
                            />
                            <input
                              type="number"
                              value={activeField.y}
                              onChange={(e) =>
                                updateTextField(activeField.id, {
                                  y: Number(e.target.value),
                                })
                              }
                              className={cn(inputCls, "mt-1 h-8 font-mono text-xs")}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Fonte, Tamanho, Cor, Alinhamento e Largura */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Fonte" htmlFor="field-font">
                          <select
                            id="field-font"
                            value={activeField.fontFamily}
                            onChange={(e) =>
                              updateTextField(activeField.id, {
                                fontFamily: e.target.value as CertificateFontFamily,
                              })
                            }
                            className={selectCls}
                          >
                            {AVAILABLE_FONTS.map((f) => (
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Tamanho (pt)" htmlFor="field-size">
                            <input
                              id="field-size"
                              type="number"
                              min={8}
                              max={72}
                              value={activeField.fontSize}
                              onChange={(e) =>
                                updateTextField(activeField.id, {
                                  fontSize: Number(e.target.value),
                                })
                              }
                              className={cn(inputCls, "font-mono")}
                            />
                          </Field>
                          <Field label="Cor" htmlFor="field-color">
                            <input
                              id="field-color"
                              type="color"
                              value={activeField.colorHex}
                              onChange={(e) =>
                                updateTextField(activeField.id, {
                                  colorHex: e.target.value,
                                })
                              }
                              className="h-10 w-full rounded-app-md border border-app-border bg-app-surface p-1 cursor-pointer"
                            />
                          </Field>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-app-foreground">
                            Alinhamento na Caixa
                          </label>
                          <div className="grid grid-cols-3 rounded-app-md border border-app-border bg-app-surface p-1">
                            {(
                              [
                                { value: "left", icon: AlignLeft, label: "Esq" },
                                {
                                  value: "center",
                                  icon: AlignCenter,
                                  label: "Centro",
                                },
                                {
                                  value: "right",
                                  icon: AlignRight,
                                  label: "Dir",
                                },
                              ] as Array<{
                                value: CertificateTextAlign;
                                icon: typeof AlignLeft;
                                label: string;
                              }>
                            ).map((opt) => {
                              const Icon = opt.icon;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() =>
                                    updateTextField(activeField.id, {
                                      align: opt.value,
                                    })
                                  }
                                  className={cn(
                                    "flex items-center justify-center gap-1 rounded py-1.5 text-xs font-semibold transition cursor-pointer",
                                    activeField.align === opt.value
                                      ? "bg-app-primary text-white"
                                      : "text-app-muted-foreground hover:text-app-foreground",
                                  )}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <Field label="Largura da Caixa (pt)" htmlFor="field-width">
                          <input
                            id="field-width"
                            type="number"
                            min={80}
                            max={pdfSize.width}
                            value={activeField.maxWidth || 460}
                            onChange={(e) =>
                              updateTextField(activeField.id, {
                                maxWidth: Number(e.target.value),
                              })
                            }
                            className={cn(inputCls, "font-mono")}
                          />
                        </Field>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Configuração do QR Code de Autenticidade */}
                <div className="space-y-3 rounded-app-lg border border-app-border bg-app-surface-elevated/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-foreground">
                      <QrCode className="h-4 w-4 text-app-primary" />
                      QR Code de Validação
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(layoutConfig.qrCode?.enabled)}
                      onChange={(e) =>
                        setLayoutConfig({
                          ...layoutConfig,
                          qrCode: {
                            ...layoutConfig.qrCode,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 accent-app-primary cursor-pointer"
                    />
                  </div>

                  {layoutConfig.qrCode?.enabled ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="X (pt)" htmlFor="qr-x">
                          <input
                            id="qr-x"
                            type="number"
                            value={layoutConfig.qrCode.x}
                            onChange={(e) =>
                              setLayoutConfig({
                                ...layoutConfig,
                                qrCode: {
                                  ...layoutConfig.qrCode,
                                  x: Number(e.target.value),
                                },
                              })
                            }
                            className={cn(inputCls, "h-8 font-mono text-xs")}
                          />
                        </Field>
                        <Field label="Y (pt)" htmlFor="qr-y">
                          <input
                            id="qr-y"
                            type="number"
                            value={layoutConfig.qrCode.y}
                            onChange={(e) =>
                              setLayoutConfig({
                                ...layoutConfig,
                                qrCode: {
                                  ...layoutConfig.qrCode,
                                  y: Number(e.target.value),
                                },
                              })
                            }
                            className={cn(inputCls, "h-8 font-mono text-xs")}
                          />
                        </Field>
                        <Field label="Tamanho (pt)" htmlFor="qr-size">
                          <input
                            id="qr-size"
                            type="number"
                            min={40}
                            max={180}
                            value={layoutConfig.qrCode.size}
                            onChange={(e) =>
                              setLayoutConfig({
                                ...layoutConfig,
                                qrCode: {
                                  ...layoutConfig.qrCode,
                                  size: Number(e.target.value),
                                },
                              })
                            }
                            className={cn(inputCls, "h-8 font-mono text-xs")}
                          />
                        </Field>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-app-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(
                            layoutConfig.qrCode.includeCodeCaption,
                          )}
                          onChange={(e) =>
                            setLayoutConfig({
                              ...layoutConfig,
                              qrCode: {
                                ...layoutConfig.qrCode,
                                includeCodeCaption: e.target.checked,
                              },
                            })
                          }
                          className="h-3.5 w-3.5 accent-app-primary"
                        />
                        Exibir código CERT abaixo do QR Code
                      </label>
                    </div>
                  ) : null}
                </div>

                {/* Card de Modelos Salvos (Presets) com opção de Excluir */}
                <div className="space-y-3 rounded-app-lg border border-app-border bg-app-surface-elevated/30 p-4">
                  <h3 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-app-foreground">
                    <Bookmark className="h-3.5 w-3.5 text-app-primary" />
                    Modelos Salvos
                  </h3>

                  {presets.length === 0 ? (
                    <p className="text-xs text-app-muted-foreground">
                      Nenhum modelo salvo ainda.
                    </p>
                  ) : (
                    <div className="max-h-36 space-y-1.5 overflow-y-auto">
                      {presets.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between gap-2 rounded-app-md border border-app-border bg-app-surface px-3 py-2 text-xs"
                        >
                          <span className="truncate font-medium text-app-foreground">
                            {preset.name}
                          </span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Button
                              type="button"
                              compact
                              variant="secondary"
                              onClick={() => void handleApplyPreset(preset)}
                            >
                              Aplicar
                            </Button>
                            <button
                              type="button"
                              disabled={deletingPresetId === preset.id}
                              onClick={() => void handleDeletePreset(preset)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-app-md border border-app-border text-app-muted-foreground hover:border-app-danger/40 hover:bg-app-danger/10 hover:text-app-danger cursor-pointer disabled:opacity-40"
                              title="Excluir modelo"
                              aria-label="Excluir modelo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Salvar modelo atual como…"
                      className={cn(inputCls, "h-9 text-xs")}
                    />
                    <Button
                      type="button"
                      compact
                      variant="primary"
                      disabled={!newPresetName.trim() || savingPreset}
                      onClick={() => void handleSavePreset()}
                    >
                      {savingPreset ? "Salvando…" : "Salvar"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Canvas Interativo & Preview PDF Real (7 cols) */}
              <div className="flex flex-col justify-between space-y-4 rounded-app-lg border border-app-border bg-app-surface-elevated/20 p-4 lg:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-app-md border border-app-border bg-app-surface p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setViewMode("interactive")}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-semibold transition cursor-pointer",
                          viewMode === "interactive"
                            ? "bg-app-primary text-white"
                            : "text-app-muted-foreground hover:text-app-foreground",
                        )}
                      >
                        <Move className="h-3.5 w-3.5" />
                        Editor Interativo
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("merged-pdf")}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-semibold transition cursor-pointer",
                          viewMode === "merged-pdf"
                            ? "bg-app-primary text-white"
                            : "text-app-muted-foreground hover:text-app-foreground",
                        )}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Visualizar PDF
                      </button>
                    </div>

                    {/* Botão sutil de re-renderizar (apenas ícone) */}
                    <button
                      type="button"
                      onClick={() => setRenderVersion((v) => v + 1)}
                      title="Renderizar novamente"
                      aria-label="Renderizar novamente"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-app-md border border-app-border bg-app-surface text-app-muted-foreground transition hover:bg-app-surface-elevated hover:text-app-foreground cursor-pointer"
                    >
                      <RefreshCw
                        className={cn(
                          "h-3.5 w-3.5",
                          isRenderingPreview && "animate-spin text-app-primary",
                        )}
                      />
                    </button>
                  </div>

                  {recipients.length > 0 ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-app-muted-foreground">
                        Simular:
                      </span>
                      <select
                        value={previewRecipientIdx}
                        onChange={(e) =>
                          setPreviewRecipientIdx(Number(e.target.value))
                        }
                        className="max-w-[220px] rounded-app-md border border-app-border bg-app-surface px-2.5 py-1.5 text-xs text-app-foreground"
                      >
                        {(selectedRecipients.length > 0
                          ? selectedRecipients
                          : recipients
                        ).map((p, i) => (
                          <option key={p.recipientKey} value={i}>
                            {p.name || `Participante #${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col items-center justify-center">
                  <div
                    ref={canvasContainerRef}
                    onPointerMove={
                      viewMode === "interactive" ? handlePointerMove : undefined
                    }
                    onPointerUp={
                      viewMode === "interactive" ? handlePointerUp : undefined
                    }
                    onPointerLeave={
                      viewMode === "interactive" ? handlePointerUp : undefined
                    }
                    className="relative w-full overflow-hidden rounded-app-md border border-app-border bg-white shadow-lg select-none"
                    style={{
                      aspectRatio: `${pdfSize.width} / ${pdfSize.height}`,
                    }}
                  >
                    <canvas
                      ref={pdfCanvasRef}
                      className="pointer-events-none block h-full w-full"
                    />

                    {/* Camada SVG de renderização tipográfica 1:1 com o PDF (dominant-baseline="alphabetic") */}
                    {viewMode === "interactive" && (
                      <svg
                        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                        viewBox={`0 0 ${pdfSize.width} ${pdfSize.height}`}
                      >
                        {layoutConfig.fields.map((field) => {
                          const resolvedPreview =
                            interpolateCertificateTemplate({
                              template: field.template,
                              variables: sampleVariables,
                            }) || field.label;

                          const boxWidthPt =
                            field.maxWidth && field.maxWidth > 40
                              ? field.maxWidth
                              : 440;

                          let drawX = field.x;
                          let textAnchor: "start" | "middle" | "end" = "start";
                          if (field.align === "center") {
                            drawX = field.x + boxWidthPt / 2;
                            textAnchor = "middle";
                          } else if (field.align === "right") {
                            drawX = field.x + boxWidthPt;
                            textAnchor = "end";
                          }

                          const fontMeta = AVAILABLE_FONTS.find(
                            (f) => f.value === field.fontFamily,
                          );

                          return (
                            <text
                              key={`svg-text-${field.id}`}
                              x={drawX}
                              y={pdfSize.height - field.y}
                              textAnchor={textAnchor}
                              dominantBaseline="alphabetic"
                              fontFamily={
                                fontMeta?.cssFont ||
                                "Helvetica, Arial, sans-serif"
                              }
                              fontWeight={
                                field.fontFamily.includes("Bold") ? 700 : 400
                              }
                              fontSize={field.fontSize || 20}
                              fill={field.colorHex || "#000000"}
                              xmlSpace="preserve"
                            >
                              {resolvedPreview}
                            </text>
                          );
                        })}
                      </svg>
                    )}

                    {/* Caixas de Seleção e Controle Interativo (exibidas apenas no modo interactive) */}
                    {viewMode === "interactive" &&
                      layoutConfig.fields.map((field) => {
                        const isSelected = activeField?.id === field.id;
                        const boxWidthPt =
                          field.maxWidth && field.maxWidth > 40
                            ? field.maxWidth
                            : 440;
                        const leftPercent = (field.x / pdfSize.width) * 100;
                        const widthPercent = (boxWidthPt / pdfSize.width) * 100;

                        const fontPt = field.fontSize || 20;
                        // O baseline no PDF fica exatamente em field.y.
                        // O retângulo de seleção engloba do descender (~0.25*fontPt) até o ascender (~0.80*fontPt):
                        const bottomPt = field.y - 0.25 * fontPt;
                        const heightPt = 1.05 * fontPt;
                        const bottomPercent = (bottomPt / pdfSize.height) * 100;
                        const heightPercent = (heightPt / pdfSize.height) * 100;

                        return (
                          <div
                            key={field.id}
                            onClick={() => setSelectedFieldId(field.id)}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setSelectedFieldId(field.id);
                              setDragState({
                                mode: "move",
                                fieldId: field.id,
                                startClientX: e.clientX,
                                startClientY: e.clientY,
                                startX: field.x,
                                startY: field.y,
                                startWidth: boxWidthPt,
                              });
                            }}
                            style={{
                              position: "absolute",
                              left: `${leftPercent}%`,
                              bottom: `${bottomPercent}%`,
                              width: `${widthPercent}%`,
                              height: `${heightPercent}%`,
                            }}
                            className={cn(
                              "group cursor-move transition-colors",
                              isSelected
                                ? "bg-blue-500/15 outline-2 outline-blue-600"
                                : "bg-amber-500/10 outline-1 outline-dashed outline-slate-500/70 hover:outline-blue-500",
                            )}
                            title="Arraste para posicionar a caixa no certificado"
                          >
                            {/* Etiqueta Superior */}
                            <span className="pointer-events-none absolute -top-5 left-0 z-20 rounded bg-slate-900/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white whitespace-nowrap shadow">
                              {field.label} ({field.x}, {field.y})
                            </span>

                            {/* Alça Lateral Direita para Redimensionar Largura */}
                            <div
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                setSelectedFieldId(field.id);
                                setDragState({
                                  mode: "resize",
                                  fieldId: field.id,
                                  startClientX: e.clientX,
                                  startClientY: e.clientY,
                                  startX: field.x,
                                  startY: field.y,
                                  startWidth: boxWidthPt,
                                });
                              }}
                              title="Arraste para ajustar a largura da caixa"
                              className="absolute top-0 -right-1.5 bottom-0 w-3 cursor-ew-resize bg-blue-600/80 opacity-80 hover:opacity-100"
                            />
                          </div>
                        );
                      })}

                    {/* Caixa Interativa do QR Code (exibida apenas no modo interactive) */}
                    {viewMode === "interactive" &&
                    layoutConfig.qrCode?.enabled ? (
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setDragState({
                            mode: "move-qr",
                            fieldId: "qr-code",
                            startClientX: e.clientX,
                            startClientY: e.clientY,
                            startX: layoutConfig.qrCode.x,
                            startY: layoutConfig.qrCode.y,
                            startWidth: layoutConfig.qrCode.size,
                          });
                        }}
                        style={{
                          position: "absolute",
                          left: `${(layoutConfig.qrCode.x / pdfSize.width) * 100}%`,
                          bottom: `${(layoutConfig.qrCode.y / pdfSize.height) * 100}%`,
                          width: `${(Math.max(36, Math.min(220, layoutConfig.qrCode.size || 76)) / pdfSize.width) * 100}%`,
                          height: `${(Math.max(36, Math.min(220, layoutConfig.qrCode.size || 76)) / pdfSize.height) * 100}%`,
                        }}
                        className="flex cursor-move flex-col items-center justify-center bg-white/95 text-center shadow outline-2 outline-blue-600"
                        title="Arraste para posicionar o QR Code de validação"
                      >
                        <QrCode className="h-3/4 w-3/4 text-slate-900" />
                        <span className="font-mono text-[7px] leading-none font-bold text-slate-800">
                          QR VALIDACAO
                        </span>
                        {layoutConfig.qrCode.includeCodeCaption ? (
                          <span
                            style={{
                              fontSize: `${Math.max(6, 7 * stageScale)}px`,
                              lineHeight: 1,
                            }}
                            className="pointer-events-none absolute top-full left-1/2 mt-0.5 -translate-x-1/2 font-mono font-bold whitespace-nowrap text-slate-600"
                          >
                            {sampleVariables.codigo_autenticacao}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-app-border pt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setActiveStep("participants")}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Voltar aos Participantes
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      void handleSaveWorkspace({ silent: true });
                      setActiveStep("generator");
                    }}
                  >
                    Salvar e Ir para Revisão
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* ==================== ETAPA 03: REVISÃO & GERAÇÃO (.ZIP) ==================== */}
      {activeStep === "generator" && (
        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHeader
              title="Revisão e Emissão em Lote"
              right={
                <Button
                  type="button"
                  variant="primary"
                  disabled={selectedCount === 0 || isGeneratingBatch}
                  onClick={() => void handleGenerateBatchPdfs()}
                >
                  {isGeneratingBatch ? (
                    <>
                      <RefreshCw
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Gerando ({batchProgress.current}/{batchProgress.total})…
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" aria-hidden="true" />
                      {generatedBatch.length > 0
                        ? `Atualizar Lote (${selectedCount} PDFs)`
                        : `Emitir e Gerar ${selectedCount} Certificados`}
                    </>
                  )}
                </Button>
              }
            />

            <div className="space-y-5 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-app-lg border border-app-border bg-app-surface-elevated/30 p-4">
                  <span className="text-xs text-app-muted-foreground">
                    Destinatários Selecionados
                  </span>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-app-foreground">
                    {selectedCount}
                  </p>
                </div>

                <div className="rounded-app-lg border border-app-border bg-app-surface-elevated/30 p-4">
                  <span className="text-xs text-app-muted-foreground">
                    Certificados Emitidos
                  </span>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-500">
                    {issuedCount}
                  </p>
                </div>

                <div className="flex flex-col justify-between gap-3 rounded-app-lg border border-app-border bg-app-surface-elevated/30 p-4">
                  <Field
                    label="Nome do pacote (.ZIP)"
                    htmlFor="zip-archive-name"
                  >
                    <input
                      id="zip-archive-name"
                      type="text"
                      value={zipArchiveName}
                      onChange={(e) => setZipArchiveName(e.target.value)}
                      className={cn(inputCls, "h-8 font-mono text-xs")}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={generatedBatch.length === 0 || isZipping}
                    onClick={() => void handleDownloadZip()}
                  >
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    {isZipping
                      ? "Compactando…"
                      : `Baixar .ZIP (${generatedBatch.length})`}
                  </Button>
                </div>
              </div>

              {generatedBatch.length === 0 ? (
                <div className="rounded-app-lg border border-dashed border-app-border p-10 text-center">
                  <FileCheck2 className="mx-auto h-10 w-10 text-app-primary" />
                  <h3 className="mt-3 text-sm font-bold text-app-foreground">
                    Pronto para emitir os certificados
                  </h3>
                  <p className="mx-auto mt-1 max-w-md text-xs text-app-muted-foreground">
                    Clique em <strong>“Emitir e Gerar Certificados”</strong> no
                    topo para visualizar os PDFs individuais antes do disparo.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-app-md border border-app-border">
                  <table className="w-full min-w-[720px] text-left">
                    <thead className="border-b border-app-border bg-app-surface-elevated/50 text-xs uppercase text-app-muted-foreground">
                      <tr>
                        <th className="w-12 px-4 py-3">#</th>
                        <th className="px-4 py-3">Participante</th>
                        <th className="px-4 py-3">Código CERT</th>
                        <th className="px-4 py-3">E-mail</th>
                        <th className="px-4 py-3 text-right">Conferência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border text-sm">
                      {generatedBatch.map((item, idx) => (
                        <tr
                          key={item.recipientKey}
                          className="hover:bg-app-surface-elevated/30"
                        >
                          <td className="px-4 py-2.5 font-mono text-xs text-app-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-app-foreground">
                            {item.participantName}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-app-primary">
                            {item.authenticationCode}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-app-muted-foreground">
                            {item.participantEmail || (
                              <span className="text-app-warning">Sem e-mail</span>
                            )}
                          </td>
                          <td className="space-x-2 px-4 py-2.5 text-right">
                            <Button
                              type="button"
                              compact
                              variant="secondary"
                              onClick={() => handlePreviewSinglePdf(item)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Visualizar
                            </Button>
                            <Button
                              type="button"
                              compact
                              variant="secondary"
                              onClick={() => handleDownloadSinglePdf(item)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Baixar PDF
                            </Button>
                            <Link
                              href={`/certificados/${encodeURIComponent(item.authenticationCode)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 items-center gap-1 rounded-app-md border border-app-border bg-app-surface px-2.5 text-xs font-semibold text-app-foreground hover:bg-app-surface-elevated"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-app-border pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveStep("studio")}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Voltar ao Estúdio
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setActiveStep("messenger")}
                >
                  Avançar para Disparo por E-mail
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* ==================== ETAPA 04: DISPARO RARONEXUS ==================== */}
      {activeStep === "messenger" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Coluna Esquerda: Disparo de Teste via RaroNexus (5 cols) */}
            <div className="space-y-4 lg:col-span-5">
              <Panel>
                <PanelHeader
                  title="Envio de Teste (RaroNexus)"
                  right={<Badge tone="success">Integrado</Badge>}
                />
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="space-y-2 rounded-app-md border border-app-border bg-app-surface p-3.5">
                    <label
                      htmlFor="test-recipient-input"
                      className="block text-xs font-semibold text-app-foreground"
                    >
                      E-mail para receber o teste com o PDF anexado:
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="test-recipient-input"
                        type="email"
                        value={testRecipientEmail}
                        onChange={(e) => setTestRecipientEmail(e.target.value)}
                        placeholder="seu-email@dominio.com"
                        className={cn(inputCls, "font-mono text-xs")}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isSendingTest || !testRecipientEmail.trim()}
                        onClick={() => void handleSendTestEmail()}
                      >
                        {isSendingTest ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MailCheck className="h-4 w-4 text-emerald-500" />
                        )}
                        Enviar Teste
                      </Button>
                    </div>
                  </div>

                  {testFeedback ? (
                    <InlineAlert
                      tone={
                        testFeedback.type === "success" ? "success" : "danger"
                      }
                    >
                      {testFeedback.text}
                    </InlineAlert>
                  ) : null}
                </div>
              </Panel>
            </div>

            {/* Coluna Direita: Apenas Corpo da Mensagem (7 cols) */}
            <div className="lg:col-span-7">
              <Panel>
                <PanelHeader
                  title="Corpo da Mensagem"
                  right={
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-app-muted-foreground">
                        Intervalo:
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={emailConfig.delaySeconds}
                        onChange={(e) =>
                          setEmailConfig({
                            ...emailConfig,
                            delaySeconds: Math.max(
                              1,
                              Number(e.target.value) || 1,
                            ),
                          })
                        }
                        className="h-8 w-16 rounded-app-md border border-app-border bg-app-surface px-2 text-center font-mono text-xs text-app-foreground"
                      />
                      <span className="text-app-muted-foreground">seg</span>
                    </div>
                  }
                />
                <div className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="email-body-textarea"
                      className="text-xs font-semibold text-app-foreground"
                    >
                      Mensagem enviada ao participante
                    </label>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[11px] text-app-muted-foreground">
                        Variáveis:
                      </span>
                      {[
                        "nome",
                        "evento",
                        "carga_horaria",
                        "codigo_autenticacao",
                        "link_validacao",
                      ].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() =>
                            setEmailConfig({
                              ...emailConfig,
                              body: `${emailConfig.body} {{${v}}}`,
                            })
                          }
                          className="rounded border border-app-border bg-app-surface px-1.5 py-0.5 font-mono text-[11px] text-app-foreground hover:border-app-primary cursor-pointer"
                        >
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    id="email-body-textarea"
                    rows={6}
                    value={emailConfig.body}
                    onChange={(e) =>
                      setEmailConfig({
                        ...emailConfig,
                        body: e.target.value,
                      })
                    }
                    className={textareaCls}
                  />
                </div>
              </Panel>
            </div>
          </div>

          {/* Controle da Fila e Tabela de Disparo em Tempo Real */}
          <Panel>
            <PanelHeader
              title="Fila de Disparo em Lote"
              right={
                <Button
                  type="button"
                  compact
                  variant="secondary"
                  disabled={selectedCount === 0}
                  onClick={handleExportCsvReport}
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Exportar Relatório (.CSV)
                </Button>
              }
            />

            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 p-4 lg:flex-row lg:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="muted">Pendentes: {pendingSendCount}</Badge>
                  <Badge tone="success">Enviados: {sentCount}</Badge>
                  {failedCount > 0 ? (
                    <Badge tone="danger">Falhas: {failedCount}</Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isQueueRunning ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handlePauseQueue}
                    >
                      <Pause className="h-4 w-4" />
                      Pausar Fila
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      disabled={selectedCount === 0 || pendingSendCount === 0}
                      onClick={() => void runEmailQueue(false)}
                    >
                      <Play className="h-4 w-4" />
                      {sentCount > 0 && pendingSendCount > 0
                        ? `Continuar Fila (${pendingSendCount} restantes)`
                        : `Disparar Certificados (${pendingSendCount})`}
                    </Button>
                  )}

                  {failedCount > 0 && !isQueueRunning ? (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => void runEmailQueue(true)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reenviar Falhas ({failedCount})
                    </Button>
                  ) : null}

                  {(sentCount > 0 || failedCount > 0) && !isQueueRunning ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        void handleSaveWorkspace({ resetEmailStatuses: true })
                      }
                    >
                      Resetar Status
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto rounded-app-md border border-app-border">
                <table className="w-full min-w-[720px] text-left">
                  <thead className="border-b border-app-border bg-app-surface-elevated/50 text-xs uppercase text-app-muted-foreground">
                    <tr>
                      <th className="w-12 px-4 py-3">#</th>
                      <th className="px-4 py-3">Participante</th>
                      <th className="px-4 py-3">Destinatário</th>
                      <th className="px-4 py-3">Código CERT</th>
                      <th className="px-4 py-3">Status de Envio</th>
                      <th className="px-4 py-3 text-right">Ação Individual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border text-sm">
                    {selectedRecipients.map((r, idx) => {
                      const isSendingThis =
                        sendingRecipientKey === r.recipientKey;
                      return (
                        <tr
                          key={r.recipientKey}
                          className="hover:bg-app-surface-elevated/30"
                        >
                          <td className="px-4 py-2.5 font-mono text-xs text-app-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-app-foreground">
                            {r.name}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-app-muted-foreground">
                            {r.email || (
                              <span className="text-app-danger">Sem e-mail</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-app-primary">
                            {r.authenticationCode || "Será gerado"}
                          </td>
                          <td className="px-4 py-2.5">
                            {isSendingThis || r.emailStatus === "sending" ? (
                              <Badge tone="primary">
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Enviando…
                              </Badge>
                            ) : r.emailStatus === "sent" ? (
                              <div className="space-y-0.5">
                                <Badge tone="success">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Enviado
                                </Badge>
                                {r.emailSentAt ? (
                                  <p className="text-[11px] text-app-muted-foreground">
                                    {formatDate({
                                      value: r.emailSentAt,
                                      withTime: true,
                                    })}
                                  </p>
                                ) : null}
                              </div>
                            ) : r.emailStatus === "failed" ? (
                              <div className="space-y-0.5">
                                <Badge tone="danger">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Falha
                                </Badge>
                                {r.emailError ? (
                                  <p className="max-w-xs truncate text-[11px] text-app-danger">
                                    {r.emailError}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <Badge tone="muted">
                                <Clock className="mr-1 h-3 w-3" />
                                Pendente
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              type="button"
                              compact
                              variant="secondary"
                              disabled={isQueueRunning || isSendingThis}
                              onClick={() => void sendSingleRecipientEmail(r)}
                            >
                              <Send className="h-3.5 w-3.5" />
                              {r.emailStatus === "sent" ? "Reenviar" : "Enviar"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* Modal de Visualização de PDF Individual */}
      {previewModalItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-app-lg border border-app-border bg-app-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
              <h4 className="text-sm font-bold text-app-foreground">
                Certificado:{" "}
                <span className="text-app-primary">
                  {previewModalItem.name}
                </span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewModalItem.url);
                  setPreviewModalItem(null);
                }}
                className="rounded-app-md p-1.5 text-app-muted-foreground hover:bg-app-surface-elevated hover:text-app-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[72vh] bg-slate-950">
              <iframe
                src={previewModalItem.url}
                title={`Certificado ${previewModalItem.name}`}
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
