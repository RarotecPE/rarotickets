import { Result } from "@/@core/domain/result";
import type { CreatePublicRegistrationInputDto, UploadedParticipantFile } from "@/modules/ticketing/application/use-cases/create-public-registration/create-public-registration.use-case";
import { MAX_PARTICIPANT_FILE_SIZE_BYTES } from "@/modules/ticketing/domain/registrations/services/participant-file.domain-service";
import { isJsonRecord, readBoolean, readDate, readObject, readOptionalText, readText } from "@/server/api/request-data.util";

export type CreatePublicRegistrationRequestDto = { body: unknown; eventSlug: string; ip: string | null; files: UploadedParticipantFile[] };
export type ParseMultipartRegistrationFormParams = { formData: FormData };
export type ParsedMultipartRegistrationForm = { body: unknown; files: UploadedParticipantFile[] };

export class InvalidRegistrationRequestError extends Error {
  readonly code = "INVALID_REGISTRATION_REQUEST";
  constructor(message: string) { super(message); }
}

export async function parseMultipartRegistrationForm(params: ParseMultipartRegistrationFormParams): Promise<Result<ParsedMultipartRegistrationForm, InvalidRegistrationRequestError>> {
  const entries = collectFileEntries({ formData: params.formData });
  if (entries.isFailure) return Result.fail(entries.error);
  const files = await Promise.all(entries.value.map(async (entry) => ({
    fieldId: entry.fieldId,
    fileName: entry.file.name,
    mimeType: entry.file.type,
    sizeBytes: entry.file.size,
    content: new Uint8Array(await entry.file.arrayBuffer()),
  })));
  return Result.ok({ body: createMultipartBody({ formData: params.formData }), files });
}

export function mapCreatePublicRegistrationRequest(params: CreatePublicRegistrationRequestDto): Result<CreatePublicRegistrationInputDto, InvalidRegistrationRequestError> {
  if (!isJsonRecord(params.body)) return Result.fail(new InvalidRegistrationRequestError("Informe os dados da pessoa participante."));
  const body = params.body;
  const participantValue = body.participant;
  if (!isJsonRecord(participantValue)) return Result.fail(new InvalidRegistrationRequestError("Informe os dados da pessoa participante."));
  const participant = participantValue;
  return Result.ok({
    eventSlug: params.eventSlug,
    participant: {
      name: readText({ value: participant.name }),
      cpf: readText({ value: participant.cpf }),
      email: readText({ value: participant.email }),
      phone: readText({ value: participant.phone }),
      birthDate: readDate({ value: participant.birthDate }),
      company: readOptionalText({ value: participant.company }),
      jobTitle: readOptionalText({ value: participant.jobTitle }),
      termsConsent: readBoolean({ value: participant.termsConsent }),
      marketingConsent: readBoolean({ value: participant.marketingConsent }),
    },
    answers: readObject(body.answers),
    lotId: readOptionalText({ value: body.lotId }),
    couponCode: readOptionalText({ value: body.couponCode }),
    files: params.files,
    ip: params.ip,
  });
}

type MultipartFileEntry = { fieldId: string; file: File };
type CollectFileEntriesParams = { formData: FormData };
type CreateMultipartBodyParams = { formData: FormData };
type ParseJsonFormValueParams = { value: FormDataEntryValue | null };

function collectFileEntries(params: CollectFileEntriesParams): Result<MultipartFileEntry[], InvalidRegistrationRequestError> {
  const files: MultipartFileEntry[] = [];
  let tooLarge = false;
  params.formData.forEach((value, name) => {
    if (!name.startsWith("file:") || typeof value === "string" || value.size === 0) return;
    if (value.size > MAX_PARTICIPANT_FILE_SIZE_BYTES) {
      tooLarge = true;
      return;
    }
    files.push({ fieldId: name.slice("file:".length), file: value });
  });
  if (tooLarge) return Result.fail(new InvalidRegistrationRequestError("Cada arquivo deve ter no máximo 10 MB."));
  return Result.ok(files);
}

function createMultipartBody(params: CreateMultipartBodyParams): Record<string, unknown> {
  return {
    participant: parseJsonFormValue({ value: params.formData.get("participant") }),
    answers: parseJsonFormValue({ value: params.formData.get("answers") }),
    lotId: params.formData.get("lotId"),
    couponCode: params.formData.get("couponCode"),
  };
}

function parseJsonFormValue(params: ParseJsonFormValueParams): unknown {
  if (typeof params.value !== "string") return null;
  try { return JSON.parse(params.value) as unknown; } catch { return null; }
}
