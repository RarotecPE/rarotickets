import { DomainService } from "@/@core/domain/domain-service.base";
import { Result } from "@/@core/domain/result";

export type CertificateWorkflowStatus = "pendente" | "concluido" | "dispensado";

export type CertificateFontFamily =
  | "Courier-Bold"
  | "Courier"
  | "Helvetica-Bold"
  | "Helvetica"
  | "Times-Bold"
  | "Times-Roman";

export type CertificateTextAlign = "left" | "center" | "right";

export type CertificateTextFieldConfig = {
  id: string;
  label: string;
  template: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: CertificateFontFamily;
  colorHex: string;
  align: CertificateTextAlign;
  maxWidth: number;
};

export type CertificateQrCodeConfig = {
  enabled: boolean;
  x: number;
  y: number;
  size: number;
  includeCodeCaption: boolean;
};

export type CertificateLayoutConfig = {
  fields: CertificateTextFieldConfig[];
  qrCode: CertificateQrCodeConfig;
};

export type CertificateEmailExtraAttachment = {
  id: string;
  key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export const MAX_CERTIFICATE_EXTRA_ATTACHMENTS = 10;
export const MAX_CERTIFICATE_EXTRA_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_CERTIFICATE_EXTRA_ATTACHMENTS_TOTAL_BYTES = 20 * 1024 * 1024;

export type CertificateEmailConfig = {
  subject: string;
  body: string;
  attachmentNamePattern: string;
  delaySeconds: number;
  extraAttachments?: CertificateEmailExtraAttachment[];
};

export type CertificateParticipantOverride = {
  selected?: boolean;
  name?: string;
  email?: string;
  cpf?: string;
  company?: string;
  jobTitle?: string;
  customVars?: Record<string, string>;
};

export type CertificateExtraRecipient = {
  id: string;
  selected: boolean;
  name: string;
  email: string;
  cpf?: string;
  company?: string;
  jobTitle?: string;
  roleLabel?: string;
  customVars: Record<string, string>;
};

export type CertificateSelectionConfig = {
  includeWithoutCheckIn: boolean;
  overrides: Record<string, CertificateParticipantOverride>;
  extraRecipients: CertificateExtraRecipient[];
};

export type CertificateRecipientVariables = {
  nome: string;
  email: string;
  cpf?: string;
  empresa?: string;
  cargo?: string;
  evento?: string;
  data_evento?: string;
  carga_horaria?: string;
  descricao_certificado?: string;
  responsavel?: string;
  codigo_autenticacao?: string;
  link_validacao?: string;
  codigo_inscricao?: string;
  customVars?: Record<string, string>;
};

export type CleanSpacesParams = { value: string };
export type SmartTitleCaseParams = { value: string };
export type SanitizeFilenameParams = { value: string };
export type InterpolateTemplateParams = {
  template: string;
  variables: CertificateRecipientVariables;
};
export type InterpolateTemplateOutput = { text: string };

const LOWERCASE_PARTICLES = new Set([
  "da",
  "de",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "na",
  "no",
  "nas",
  "nos",
  "por",
  "para",
]);

export const DEFAULT_CERTIFICATE_TEXT_FIELDS: CertificateTextFieldConfig[] = [
  {
    id: "field-nome-principal",
    label: "Nome do Participante",
    template: "{{nome}}",
    x: 190,
    y: 315,
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    colorHex: "#0f172a",
    align: "center",
    maxWidth: 460,
  },
];

export const DEFAULT_CERTIFICATE_QR_CODE: CertificateQrCodeConfig = {
  enabled: true,
  x: 720,
  y: 40,
  size: 76,
  includeCodeCaption: true,
};

export const DEFAULT_CERTIFICATE_LAYOUT_CONFIG: CertificateLayoutConfig = {
  fields: DEFAULT_CERTIFICATE_TEXT_FIELDS,
  qrCode: DEFAULT_CERTIFICATE_QR_CODE,
};

export const DEFAULT_CERTIFICATE_EMAIL_CONFIG: CertificateEmailConfig = {
  subject: "Seu Certificado de Participação — {{evento}}",
  body: `Prezado(a) {{nome}},

É com satisfação que enviamos em anexo o seu certificado de participação no evento {{evento}}, com carga horária de {{carga_horaria}}.

Código de autenticidade: {{codigo_autenticacao}}
Validação pública: {{link_validacao}}

Agradecemos a sua presença e participação!

Atenciosamente,
{{responsavel}}`,
  attachmentNamePattern: "Certificado - {{nome}}.pdf",
  delaySeconds: 2,
  extraAttachments: [],
};

export const DEFAULT_CERTIFICATE_SELECTION_CONFIG: CertificateSelectionConfig = {
  includeWithoutCheckIn: false,
  overrides: {},
  extraRecipients: [],
};

export function cleanCertificateSpaces(params: CleanSpacesParams): string {
  return (params.value || "").replace(/\s+/g, " ").trim();
}

export function toSmartCertificateTitleCase(
  params: SmartTitleCaseParams,
): string {
  const cleaned = cleanCertificateSpaces({ value: params.value });
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && LOWERCASE_PARTICLES.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function sanitizeCertificateFilename(
  params: SanitizeFilenameParams,
): string {
  const cleaned = cleanCertificateSpaces({ value: params.value })
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_");
  return cleaned || "participante";
}

export function interpolateCertificateTemplate(
  params: InterpolateTemplateParams,
): string {
  if (!params.template) return "";
  const vars = params.variables;

  return params.template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawKey) => {
    const key = String(rawKey).trim();
    const lowerKey = key.toLowerCase();

    if (lowerKey === "nome" || lowerKey === "name") return vars.nome || "";
    if (lowerKey === "email" || lowerKey === "e-mail") return vars.email || "";
    if (lowerKey === "cpf") return vars.cpf || "";
    if (lowerKey === "empresa" || lowerKey === "company") return vars.empresa || "";
    if (lowerKey === "cargo" || lowerKey === "job_title") return vars.cargo || "";
    if (lowerKey === "evento" || lowerKey === "event") return vars.evento || "";
    if (lowerKey === "data_evento" || lowerKey === "data") return vars.data_evento || "";
    if (lowerKey === "carga_horaria" || lowerKey === "horas") return vars.carga_horaria || "";
    if (lowerKey === "descricao_certificado" || lowerKey === "descricao") {
      return vars.descricao_certificado || "";
    }
    if (lowerKey === "responsavel") return vars.responsavel || "";
    if (lowerKey === "codigo_autenticacao" || lowerKey === "codigo") {
      return vars.codigo_autenticacao || "";
    }
    if (lowerKey === "link_validacao" || lowerKey === "url_validacao") {
      return vars.link_validacao || "";
    }
    if (lowerKey === "codigo_inscricao") return vars.codigo_inscricao || "";

    if (vars.customVars) {
      if (key in vars.customVars) {
        return vars.customVars[key] || "";
      }
      const foundKey = Object.keys(vars.customVars).find(
        (candidate) => candidate.toLowerCase() === lowerKey,
      );
      if (foundKey) {
        return vars.customVars[foundKey] || "";
      }
    }

    return "";
  });
}

export class CertificateTextDomainService extends DomainService<
  InterpolateTemplateParams,
  InterpolateTemplateOutput
> {
  execute(params: InterpolateTemplateParams): Result<InterpolateTemplateOutput> {
    const text = interpolateCertificateTemplate(params);
    return Result.ok({ text });
  }
}
