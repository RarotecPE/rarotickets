import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import { Email } from "@/modules/ticketing/domain/participants/value-objects/email.vo";
import { Cpf } from "@/modules/ticketing/domain/participants/value-objects/cpf.vo";
import { Phone } from "@/modules/ticketing/domain/participants/value-objects/phone.vo";
import { ParticipantName } from "@/modules/ticketing/domain/participants/value-objects/participant-name.vo";
import { EventRepository } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import { RegistrationFormDomainService } from "@/modules/ticketing/domain/registrations/services/registration-form.domain-service";
import { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { ParticipantInput, PublicRegistrationResult } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import type { IIdGenerator } from "@/@core/domain/id-generator.interface";
import type { IOutboxRepository } from "@/modules/ticketing/domain/repositories/outbox-repository.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { IPaymentGateway } from "@/modules/ticketing/domain/services/payment-gateway.interface";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";
import { ParticipantFileDomainService, type ValidateParticipantFileParams } from "@/modules/ticketing/domain/registrations/services/participant-file.domain-service";
import type { FormFieldType } from "@/modules/ticketing/domain/registrations/services/registration-form.domain-service";
import type { CreatePublicRegistrationOutput, RegistrationAttachment } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";

export type UploadedParticipantFile = { fieldId: string; fileName: string; mimeType: string; sizeBytes: number; content: Uint8Array };
export type PreparedParticipantFile = RegistrationAttachment & { content: Uint8Array };
export type ParticipantFilesParams = { files: PreparedParticipantFile[] };
export type PublicRegistrationFormField = { id: string; label: string; type: FormFieldType; required: boolean; options: string[] };
export type PrepareParticipantFilesParams = { fields: PublicRegistrationFormField[]; answers: Record<string, unknown>; files: UploadedParticipantFile[]; eventId: string };
export type PreparedParticipantFilesResult = { files: PreparedParticipantFile[]; answers: Record<string, unknown> };
export type CreatePublicRegistrationInputDto = {
  eventSlug: string;
  participant: ParticipantInput;
  answers: Record<string, unknown>;
  files: UploadedParticipantFile[];
  lotId: string | null;
  couponCode: string | null;
  ip: string | null;
};
export type CreatePublicRegistrationOutputDto = PublicRegistrationResult & {
  participantUrl: string;
  credentialUrl: string | null;
  accessToken: string;
};
export type CreatePublicRegistrationDependencies = {
  eventRepository: EventRepository;
  registrationRepository: RegistrationRepository;
  credentialProvider: ICredentialProvider;
  idGenerator: IIdGenerator;
  outboxRepository: IOutboxRepository;
  auditRepository: IAuditRepository;
  formValidator: RegistrationFormDomainService;
  participantFileValidator: ParticipantFileDomainService;
  fileStorageProvider: IFileStorageProvider;
  paymentGateway: IPaymentGateway;
  publicBaseUrl: string;
};

export class CreatePublicRegistrationUseCase extends UseCase<CreatePublicRegistrationInputDto, CreatePublicRegistrationOutputDto> {
  private readonly eventRepository: EventRepository;
  private readonly registrationRepository: RegistrationRepository;
  private readonly credentialProvider: ICredentialProvider;
  private readonly idGenerator: IIdGenerator;
  private readonly outboxRepository: IOutboxRepository;
  private readonly auditRepository: IAuditRepository;
  private readonly formValidator: RegistrationFormDomainService;
  private readonly participantFileValidator: ParticipantFileDomainService;
  private readonly fileStorageProvider: IFileStorageProvider;
  private readonly paymentGateway: IPaymentGateway;
  private readonly publicBaseUrl: string;

  constructor(dependencies: CreatePublicRegistrationDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.registrationRepository = dependencies.registrationRepository;
    this.credentialProvider = dependencies.credentialProvider;
    this.idGenerator = dependencies.idGenerator;
    this.outboxRepository = dependencies.outboxRepository;
    this.auditRepository = dependencies.auditRepository;
    this.formValidator = dependencies.formValidator;
    this.participantFileValidator = dependencies.participantFileValidator;
    this.fileStorageProvider = dependencies.fileStorageProvider;
    this.paymentGateway = dependencies.paymentGateway;
    this.publicBaseUrl = dependencies.publicBaseUrl.replace(/\/$/, "");
  }

  async execute(input: CreatePublicRegistrationInputDto): Promise<Result<CreatePublicRegistrationOutputDto>> {
    const event = await this.eventRepository.getPublicBySlug({ slug: input.eventSlug, at: new Date() });
    if (!event) return Result.fail(new Error("Evento não encontrado ou inscrições indisponíveis."));
    const nameResult = ParticipantName.create(input.participant.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);
    const emailResult = Email.create(input.participant.email);
    if (emailResult.isFailure) return Result.fail(emailResult.error);
    const cpfResult = Cpf.create(input.participant.cpf);
    if (cpfResult.isFailure) return Result.fail(cpfResult.error);
    const phoneResult = Phone.create(input.participant.phone);
    if (phoneResult.isFailure) return Result.fail(phoneResult.error);
    if (!input.participant.termsConsent) return Result.fail(new Error("O aceite dos termos é obrigatório para concluir a inscrição."));
    const preparedFiles = this.prepareParticipantFiles({ fields: event.formFields, answers: input.answers, files: input.files, eventId: event.id });
    if (preparedFiles.isFailure) return Result.fail(preparedFiles.error);
    const formResult = this.formValidator.execute({ fields: event.formFields, answers: preparedFiles.value.answers });
    if (formResult.isFailure) return Result.fail(formResult.error);

    const now = new Date();
    const registrationId = this.idGenerator.next();
    const accessToken = this.credentialProvider.issueAccessToken({ registrationId });
    const code = this.credentialProvider.issueRegistrationCode({ year: now.getUTCFullYear() });
    const participant: ParticipantInput = {
      ...input.participant,
      email: emailResult.value.value,
      cpf: cpfResult.value.digits,
      name: nameResult.value.value,
      phone: phoneResult.value.digits,
    };
    const files = preparedFiles.value.files;
    let creationResult: CreatePublicRegistrationOutput;
    try {
      await this.storeParticipantFiles({ files });
      creationResult = await this.registrationRepository.createPublic({
        eventId: event.id,
        participant,
        answers: formResult.value.answers,
        files,
        lotId: input.lotId,
        couponCode: input.couponCode?.trim().toUpperCase() || null,
        registrationId,
        participantId: this.idGenerator.next(),
        registrationCode: code,
        accessTokenHash: accessToken.hash,
        at: now,
      });
    } catch (error) {
      await this.deleteParticipantFiles({ files });
      throw error;
    }
    if (creationResult.isFailure) {
      await this.deleteParticipantFiles({ files });
      return Result.fail(creationResult.error);
    }
    const created = creationResult.value;
    const withCheckout = await this.startCheckoutIfRequired(created);
    const participantUrl = `${this.publicBaseUrl}/ingressos/${accessToken.rawToken}`;
    const credentialUrl = withCheckout.status === "confirmada" ? participantUrl : null;
    await this.enqueueRegistrationNotification(withCheckout, participant, participantUrl);
    await this.auditRepository.write({ userId: "public", userName: participant.name, action: "registration.created", entity: "registration", recordId: withCheckout.registrationId, beforeData: null, afterData: { eventSlug: withCheckout.eventSlug, status: withCheckout.status, totalCents: withCheckout.finalCents }, ip: input.ip });
    return Result.ok({
      ...withCheckout,
      participantUrl,
      credentialUrl,
      accessToken: accessToken.rawToken,
    });
  }

  private prepareParticipantFiles(params: PrepareParticipantFilesParams): Result<PreparedParticipantFilesResult> {
    const answers = { ...params.answers };
    const fields = new Map(params.fields.map((field) => [field.id, field]));
    const files: PreparedParticipantFile[] = [];
    for (const field of params.fields) if (field.type === "arquivo") delete answers[field.id];
    for (const file of params.files) {
      const field = fields.get(file.fieldId);
      if (!field || field.type !== "arquivo") return Result.fail(new Error("O anexo não corresponde a um campo válido do formulário."));
      if (files.some((storedFile) => storedFile.fieldId === file.fieldId)) return Result.fail(new Error("Envie somente um arquivo por campo de anexo."));
      const validationParams: ValidateParticipantFileParams = { fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, content: file.content };
      const validation = this.participantFileValidator.execute(validationParams);
      if (validation.isFailure) return Result.fail(validation.error);
      const id = this.idGenerator.next();
      const storageKey = `private/registration-files/${params.eventId}/${id}.${validation.value.extension}`;
      files.push({ id, fieldId: file.fieldId, storageKey, originalName: validation.value.originalName, mimeType: validation.value.mimeType, sizeBytes: file.sizeBytes, content: file.content });
      answers[field.id] = `file:${id}`;
    }
    return Result.ok({ files, answers });
  }

  private async storeParticipantFiles(params: ParticipantFilesParams): Promise<void> {
    for (const file of params.files) await this.fileStorageProvider.storePrivate({ key: file.storageKey, contentType: file.mimeType, content: file.content });
  }

  private async deleteParticipantFiles(params: ParticipantFilesParams): Promise<void> {
    await Promise.all(params.files.map(async (file) => {
      try { await this.fileStorageProvider.delete({ key: file.storageKey }); } catch { /* A limpeza não deve ocultar o erro original. */ }
    }));
  }

  private async startCheckoutIfRequired(created: PublicRegistrationResult): Promise<PublicRegistrationResult> {
    if (!created.shouldCreateCheckout || !created.paymentId) return created;
    try {
      const checkout = await this.paymentGateway.createCheckout({
        referenceId: created.registrationId,
        description: created.eventTitle,
        amountCents: created.finalCents,
        customer: { name: created.participantName, email: created.participantEmail, taxId: created.participantTaxId, phone: created.participantPhone },
        notificationUrl: `${this.publicBaseUrl}/api/webhooks/pagbank`,
        returnUrl: `${this.publicBaseUrl}/ingressos/checkout-retorno`,
      });
      await this.registrationRepository.attachCheckout({ registrationId: created.registrationId, paymentId: created.paymentId, provider: checkout.provider, externalId: checkout.externalId, checkoutUrl: checkout.checkoutUrl, at: new Date() });
      return { ...created, paymentExternalId: checkout.externalId, checkoutUrl: checkout.checkoutUrl, shouldCreateCheckout: false };
    } catch {
      return { ...created, paymentExternalId: null, checkoutUrl: null, shouldCreateCheckout: false };
    }
  }

  private async enqueueRegistrationNotification(result: PublicRegistrationResult, participant: ParticipantInput, participantUrl: string): Promise<void> {
    const isConfirmed = result.status === "confirmada";
    const template = result.status === "lista_espera" ? "waitlist" : isConfirmed ? "registration-confirmed" : "payment-instructions";
    const subject = result.status === "lista_espera" ? "Você está na lista de espera" : isConfirmed ? "Inscrição confirmada" : "Finalize o pagamento da sua inscrição";
    await this.outboxRepository.enqueue({ channel: "email", recipient: participant.email, subject, template, payload: { name: participant.name, eventTitle: result.eventTitle, eventStartAt: result.eventStartAt.toISOString(), registrationCode: result.registrationCode, participantUrl, checkoutUrl: result.checkoutUrl, amountCents: result.finalCents } });
    if (participant.phone) await this.outboxRepository.enqueue({ channel: "whatsapp", recipient: participant.phone, subject, template, payload: { name: participant.name, email: participant.email, eventTitle: result.eventTitle, registrationCode: result.registrationCode, participantUrl, checkoutUrl: result.checkoutUrl } });
  }
}
