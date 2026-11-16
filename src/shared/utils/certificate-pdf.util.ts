import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import type {
  CertificateFontFamily,
  CertificateLayoutConfig,
  CertificateRecipientVariables,
} from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import { interpolateCertificateTemplate } from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";

const FONT_MAP: Record<CertificateFontFamily, StandardFonts> = {
  "Courier-Bold": StandardFonts.CourierBold,
  Courier: StandardFonts.Courier,
  "Helvetica-Bold": StandardFonts.HelveticaBold,
  Helvetica: StandardFonts.Helvetica,
  "Times-Bold": StandardFonts.TimesRomanBold,
  "Times-Roman": StandardFonts.TimesRoman,
};

export type HexToRgbParams = { hex: string };
export type GetPdfDimensionsParams = { pdfBytes: Uint8Array };
export type PdfDimensionsResult = {
  width: number;
  height: number;
  pageCount: number;
};

export type CreateDefaultBasePdfParams = {
  eventTitle: string;
  description: string;
  workloadHours: number;
  eventDateText: string;
  responsibleName: string;
};

export type RenderCertificatePdfParams = {
  basePdfBytes: Uint8Array | null;
  layoutConfig: CertificateLayoutConfig;
  variables: CertificateRecipientVariables;
};

export type BytesConversionParams = { bytes: Uint8Array };
export type Base64ConversionParams = { base64: string };

export function hexToPdfRgb(params: HexToRgbParams) {
  const clean = (params.hex || "#000000").replace("#", "");
  const bigint = parseInt(
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.padEnd(6, "0"),
    16,
  );
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return rgb(
    Number.isFinite(r) ? r : 0,
    Number.isFinite(g) ? g : 0,
    Number.isFinite(b) ? b : 0,
  );
}

/**
 * Normaliza caracteres fora da tabela WinAnsi usada pelas fontes padrão do pdf-lib.
 */
function normalizeWinAnsiText(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

export async function getPdfDimensions(
  params: GetPdfDimensionsParams,
): Promise<PdfDimensionsResult> {
  const pdfDoc = await PDFDocument.load(params.pdfBytes, {
    ignoreEncryption: true,
  });
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const cropBox = firstPage.getCropBox();
  const { width, height } =
    cropBox && cropBox.width > 0 && cropBox.height > 0
      ? cropBox
      : firstPage.getSize();
  return { width, height, pageCount: pages.length };
}

export async function createDefaultCertificateBasePdf(
  params: CreateDefaultBasePdfParams,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const width = 842;
  const height = 595;
  const page = pdfDoc.addPage([width, height]);

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Fundo suave e moldura dupla institucional
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.985, 0.99, 1),
  });

  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: rgb(0.145, 0.388, 0.922),
    borderWidth: 2,
  });

  page.drawRectangle({
    x: 32,
    y: 32,
    width: width - 64,
    height: height - 64,
    borderColor: rgb(0.796, 0.835, 0.882),
    borderWidth: 1,
  });

  // Cabeçalho institucional
  const headerTag = "CERTIFICADO DE PARTICIPACAO";
  const headerTagWidth = fontBold.widthOfTextAtSize(headerTag, 14);
  page.drawText(headerTag, {
    x: (width - headerTagWidth) / 2,
    y: 490,
    size: 14,
    font: fontBold,
    color: rgb(0.145, 0.388, 0.922),
  });

  const intro = "Certificamos que";
  const introWidth = fontRegular.widthOfTextAtSize(intro, 13);
  page.drawText(intro, {
    x: (width - introWidth) / 2,
    y: 365,
    size: 13,
    font: fontRegular,
    color: rgb(0.39, 0.45, 0.54),
  });

  // Linha de apoio onde o nome fica centralizado (Y ~ 315)
  page.drawLine({
    start: { x: 180, y: 302 },
    end: { x: width - 180, y: 302 },
    thickness: 1,
    color: rgb(0.796, 0.835, 0.882),
  });

  const safeEventTitle = normalizeWinAnsiText(params.eventTitle || "Evento");
  const descLine1 = normalizeWinAnsiText(
    params.description || `participou com exito do evento ${safeEventTitle}`,
  );
  const descWidth = fontRegular.widthOfTextAtSize(descLine1, 12);
  page.drawText(descLine1, {
    x: Math.max(60, (width - descWidth) / 2),
    y: 260,
    size: 12,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.33),
  });

  const detailsLine = normalizeWinAnsiText(
    `Realizado em ${params.eventDateText || "-"}  |  Carga horaria: ${params.workloadHours || 0}h`,
  );
  const detailsWidth = fontBold.widthOfTextAtSize(detailsLine, 12);
  page.drawText(detailsLine, {
    x: Math.max(60, (width - detailsWidth) / 2),
    y: 225,
    size: 12,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  // Assinatura do responsável
  page.drawLine({
    start: { x: (width - 240) / 2, y: 118 },
    end: { x: (width + 240) / 2, y: 118 },
    thickness: 1,
    color: rgb(0.58, 0.64, 0.72),
  });

  const respName = normalizeWinAnsiText(
    params.responsibleName || "Organizacao do Evento",
  );
  const respWidth = fontBold.widthOfTextAtSize(respName, 11);
  page.drawText(respName, {
    x: (width - respWidth) / 2,
    y: 100,
    size: 11,
    font: fontBold,
    color: rgb(0.12, 0.16, 0.23),
  });

  const respRole = "Responsavel pelo Evento";
  const respRoleWidth = fontRegular.widthOfTextAtSize(respRole, 9);
  page.drawText(respRole, {
    x: (width - respRoleWidth) / 2,
    y: 86,
    size: 9,
    font: fontRegular,
    color: rgb(0.39, 0.45, 0.54),
  });

  return await pdfDoc.save();
}

export async function renderCertificatePdf(
  params: RenderCertificatePdfParams,
): Promise<Uint8Array> {
  const effectiveBaseBytes =
    params.basePdfBytes ??
    (await createDefaultCertificateBasePdf({
      eventTitle: params.variables.evento || "Evento",
      description: params.variables.descricao_certificado || "",
      workloadHours: parseInt(params.variables.carga_horaria || "0", 10) || 0,
      eventDateText: params.variables.data_evento || "",
      responsibleName: params.variables.responsavel || "Organizacao",
    }));

  const pdfDoc = await PDFDocument.load(effectiveBaseBytes, {
    ignoreEncryption: true,
  });
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const cropBox = firstPage.getCropBox();
  const originX = cropBox?.x || 0;
  const originY = cropBox?.y || 0;

  for (const field of params.layoutConfig.fields) {
    const rawResolved = interpolateCertificateTemplate({
      template: field.template,
      variables: params.variables,
    });
    const resolvedText = normalizeWinAnsiText(rawResolved);
    if (!resolvedText.trim()) continue;

    const standardFont =
      FONT_MAP[field.fontFamily] || StandardFonts.HelveticaBold;
    const font = await pdfDoc.embedFont(standardFont);

    const boxWidth =
      field.maxWidth && field.maxWidth > 40 ? field.maxWidth : 440;
    let fontSize = field.fontSize || 20;
    let textWidth = font.widthOfTextAtSize(resolvedText, fontSize);

    if (textWidth > boxWidth) {
      fontSize = Math.max(8, (fontSize * boxWidth) / textWidth);
      textWidth = font.widthOfTextAtSize(resolvedText, fontSize);
    }

    let drawX = field.x;
    if (field.align === "center") {
      drawX = field.x + (boxWidth - textWidth) / 2;
    } else if (field.align === "right") {
      drawX = field.x + boxWidth - textWidth;
    }

    firstPage.drawText(resolvedText, {
      x: originX + drawX,
      y: originY + field.y,
      size: fontSize,
      font,
      color: hexToPdfRgb({ hex: field.colorHex }),
    });
  }

  const qrConfig = params.layoutConfig.qrCode;
  const qrTarget =
    params.variables.link_validacao || params.variables.codigo_autenticacao;

  if (qrConfig?.enabled && qrTarget) {
    try {
      const dataUrl = await QRCode.toDataURL(qrTarget, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 240,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      const base64Data = dataUrl.split(",")[1] || "";
      if (base64Data) {
        const pngBytes = base64ToUint8Array({ base64: base64Data });
        const qrImage = await pdfDoc.embedPng(pngBytes);
        const qrSize = Math.max(36, Math.min(220, qrConfig.size || 76));

        firstPage.drawImage(qrImage, {
          x: originX + qrConfig.x,
          y: originY + qrConfig.y,
          width: qrSize,
          height: qrSize,
        });

        if (
          qrConfig.includeCodeCaption &&
          params.variables.codigo_autenticacao
        ) {
          const captionFont = await pdfDoc.embedFont(StandardFonts.CourierBold);
          const codeText = normalizeWinAnsiText(
            params.variables.codigo_autenticacao,
          );
          const captionSize = 7;
          const captionWidth = captionFont.widthOfTextAtSize(
            codeText,
            captionSize,
          );
          firstPage.drawText(codeText, {
            x: originX + qrConfig.x + (qrSize - captionWidth) / 2,
            y: originY + Math.max(6, qrConfig.y - 9),
            size: captionSize,
            font: captionFont,
            color: rgb(0.2, 0.25, 0.33),
          });
        }
      }
    } catch {
      // Caso a geração de QR falhe em ambiente restrito, o PDF ainda é salvo normalmente
    }
  }

  return await pdfDoc.save();
}

export function uint8ArrayToBase64(params: BytesConversionParams): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < params.bytes.length; i += chunkSize) {
    const chunk = params.bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  return Buffer.from(params.bytes).toString("base64");
}

export function base64ToUint8Array(params: Base64ConversionParams): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(params.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(params.base64, "base64"));
}
