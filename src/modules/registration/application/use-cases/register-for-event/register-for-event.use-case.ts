import { UseCase } from '../../../../../@core/application/use-case.base.ts';
import type { IAuthorizationService } from '../../../../../@core/application/authorization.interface.ts';
import type { IClock } from '../../../../../@core/application/clock.interface.ts';
import type { ICommunicationService, CommunicationChannel, CommunicationTrigger } from '../../../../../@core/application/communication.interface.ts';
import type { IIdGenerator } from '../../../../../@core/application/id-generator.interface.ts';
import type { DomainError } from '../../../../../@core/domain/domain-error.base.ts';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../../@core/domain/errors/domain-errors.ts';
import { Result } from '../../../../../@core/domain/result.ts';
import type { IAuditRepository } from '../../../../audit/domain/repositories/audit-repository.interface.ts';
import { AuditEntry } from '../../../../audit/domain/entities/audit-entry.entity.ts';
import type { IEventRepository } from '../../../../event/domain/repositories/event-repository.interface.ts';
import type { IRegistrationFormRepository } from '../../../../event/domain/repositories/registration-form-repository.interface.ts';
import type { ITicketBatchRepository } from '../../../../event/domain/repositories/ticket-batch-repository.interface.ts';
import type { Event } from '../../../../event/domain/entities/event.aggregate.ts';
import type { RegistrationForm, FormAnswers } from '../../../../event/domain/entities/registration-form.aggregate.ts';
import type { TicketBatch } from '../../../../event/domain/entities/ticket-batch.entity.ts';
import { SelectCurrentTicketBatchService } from '../../../../event/domain/services/select-current-ticket-batch.service.ts';
import type { IParticipantRepository } from '../../../../participant/domain/repositories/participant-repository.interface.ts';
import type { IConsentRepository } from '../../../../privacy/domain/repositories/consent-repository.interface.ts';
import { ConsentRecord } from '../../../../privacy/domain/entities/consent-record.entity.ts';
import type { ConsentSubmission, RegisterForEventInputDto } from './register-for-event.input.dto.ts';
import type { RegisterForEventOutputDto } from './register-for-event.output.dto.ts';
import { Coupon } from '../../../domain/entities/coupon.entity.ts';
import { Registration } from '../../../domain/entities/registration.aggregate.ts';
import type { RegistrationAnswers, RegistrationSnapshot } from '../../../domain/entities/registration.aggregate.ts';
import { RegistrationPricing } from '../../../domain/value-objects/registration-pricing.vo.ts';
import type { IRegistrationRepository, CreateRegistrationAtomicallyOutput } from '../../../domain/repositories/registration-repository.interface.ts';
import type { ICouponRepository } from '../../../domain/repositories/coupon-repository.interface.ts';

export type RegisterForEventDependencies = {
  eventRepository: IEventRepository;
  formRepository: IRegistrationFormRepository;
  ticketBatchRepository: ITicketBatchRepository;
  participantRepository: IParticipantRepository;
  couponRepository: ICouponRepository;
  registrationRepository: IRegistrationRepository;
  consentRepository: IConsentRepository;
  auditRepository: IAuditRepository;
  authorization: IAuthorizationService;
  communication: ICommunicationService;
  communicationChannels: CommunicationChannel[];
  currentTicketBatch: SelectCurrentTicketBatchService;
  clock: IClock;
  idGenerator: IIdGenerator;
};
export type RegistrationFormContext = {
  form: RegistrationForm | null;
  answers: FormAnswers;
  formId: string | null;
  formVersion: number | null;
  formSchemaSnapshotJson: string | null;
};
export type RegistrationCreationContext = {
  event: Event;
  input: RegisterForEventInputDto;
  form: RegistrationFormContext;
  now: Date;
  registrationId: string;
  registrationCode: string;
};
export type RegistrationCreationResult = CreateRegistrationAtomicallyOutput & { coupon: Coupon | null };
export type ConsentCreationParams = {
  submissions: ConsentSubmission[];
  participantId: string;
  eventId: string;
  registrationId: string;
  now: Date;
};
export type RegistrationPermissionParams = { actorId: string; permission: string };
export type CheckActorParams = { input: RegisterForEventInputDto };
export type CheckEventRegistrationAccessParams = { event: Event; input: RegisterForEventInputDto; now: Date };
export type PrepareRegistrationFormParams = { eventId: string; answers: FormAnswers };
export type SelectCurrentBatchParams = { eventId: string; batches: TicketBatch[]; now: Date };
export type CouponPricingContext = { coupon: Coupon | null; pricing: RegistrationPricing };
export type ResolveCouponParams = { eventId: string; couponCode: string | null; batch: TicketBatch; now: Date };
export type BuildRegistrationParams = {
  event: Event;
  input: RegisterForEventInputDto;
  form: RegistrationFormContext;
  batch: TicketBatch;
  coupon: CouponPricingContext;
  registrationId: string;
  registrationCode: string;
  now: Date;
};
export type MakeRegistrationParams = {
  event: Event;
  input: RegisterForEventInputDto;
  form: RegistrationFormContext;
  ticketBatchId: string | null;
  pricing: RegistrationPricing;
  registrationId?: string;
  registrationCode?: string;
  reservationExpiresAt: Date | null;
  now: Date;
};
export type PersistConsentsParams = { records: ConsentRecord[] };
export type RecordAdministrativeCreationParams = {
  event: Event;
  input: RegisterForEventInputDto;
  registration: Registration;
  now: Date;
};
export type CommunicationTriggerParams = { registration: Registration; wasWaitlisted: boolean };

export class RegisterForEventUseCase extends UseCase<RegisterForEventInputDto, RegisterForEventOutputDto, DomainError> {
  private readonly eventRepository: IEventRepository;
  private readonly formRepository: IRegistrationFormRepository;
  private readonly ticketBatchRepository: ITicketBatchRepository;
  private readonly participantRepository: IParticipantRepository;
  private readonly couponRepository: ICouponRepository;
  private readonly registrationRepository: IRegistrationRepository;
  private readonly consentRepository: IConsentRepository;
  private readonly auditRepository: IAuditRepository;
  private readonly authorization: IAuthorizationService;
  private readonly communication: ICommunicationService;
  private readonly communicationChannels: CommunicationChannel[];
  private readonly currentTicketBatch: SelectCurrentTicketBatchService;
  private readonly clock: IClock;
  private readonly idGenerator: IIdGenerator;

  constructor(dependencies: RegisterForEventDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.formRepository = dependencies.formRepository;
    this.ticketBatchRepository = dependencies.ticketBatchRepository;
    this.participantRepository = dependencies.participantRepository;
    this.couponRepository = dependencies.couponRepository;
    this.registrationRepository = dependencies.registrationRepository;
    this.consentRepository = dependencies.consentRepository;
    this.auditRepository = dependencies.auditRepository;
    this.authorization = dependencies.authorization;
    this.communication = dependencies.communication;
    this.communicationChannels = [...dependencies.communicationChannels];
    this.currentTicketBatch = dependencies.currentTicketBatch;
    this.clock = dependencies.clock;
    this.idGenerator = dependencies.idGenerator;
  }

  public async execute(input: RegisterForEventInputDto): Promise<Result<RegisterForEventOutputDto, DomainError>> {
    const now = this.clock.now();
    const actorCheck = await this.checkActor({ input });
    if (actorCheck.isFailure) return Result.fail(actorCheck.error);
    const event = await this.eventRepository.findById(input.eventId);
    if (!event) return Result.fail(new NotFoundError({ code: 'EVENT_NOT_FOUND', message: 'Evento não encontrado.' }));
    const access = await this.checkEventRegistrationAccess({ event, input, now });
    if (access.isFailure) return Result.fail(access.error);
    const participant = await this.participantRepository.findById(input.participantId);
    if (!participant) return Result.fail(new NotFoundError({ code: 'PARTICIPANT_NOT_FOUND', message: 'Participante não encontrado.' }));
    const form = await this.prepareForm({ eventId: event.id.toString(), answers: input.answers });
    if (form.isFailure) return Result.fail(form.error);

    const registrationId = this.idGenerator.generate({ purpose: 'registration' });
    const registrationCode = this.idGenerator.generate({ purpose: 'registration-code' });
    const consentRecords = this.createConsentRecords({
      submissions: input.consents,
      participantId: input.participantId,
      eventId: event.id.toString(),
      registrationId,
      now,
    });
    if (consentRecords.isFailure) return Result.fail(consentRecords.error);
    const created = await this.createRegistration({
      event,
      input,
      form: form.value,
      now,
      registrationId,
      registrationCode,
    });
    if (created.isFailure) return Result.fail(created.error);
    const consentsPersisted = await this.persistConsents({ records: consentRecords.value });
    const auditPersisted = await this.recordAdministrativeCreation({
      event,
      input,
      registration: created.value.registration,
      now,
    });
    const trigger = this.communicationTrigger({
      registration: created.value.registration,
      wasWaitlisted: created.value.wasWaitlisted,
    });
    const communicationResult = await this.communication.enqueue({
      trigger,
      eventId: event.id.toString(),
      registrationId: created.value.registration.id.toString(),
      participantId: participant.id.toString(),
      channels: this.communicationChannels,
    });
    return Result.ok({
      registration: created.value.registration.snapshot(),
      wasWaitlisted: created.value.wasWaitlisted,
      communicationQueued: communicationResult.isSuccess,
      consentsPersisted,
      auditPersisted,
    });
  }

  private async checkActor(params: CheckActorParams): Promise<Result<void, DomainError>> {
    if (params.input.isPublic) return Result.ok();
    if (!params.input.actorId?.trim()) {
      return Result.fail(new ForbiddenError({ code: 'REGISTRATION_ACTOR_REQUIRED', message: 'Uma inscrição administrativa deve identificar o usuário responsável.' }));
    }
    return this.requirePermission({ actorId: params.input.actorId, permission: 'registration:create' });
  }

  private async checkEventRegistrationAccess(params: CheckEventRegistrationAccessParams): Promise<Result<void, DomainError>> {
    const now = params.now;
    const initial = params.event.checkRegistrationAccess({ now, isPublic: params.input.isPublic, authorizedClosedWindowOverride: false });
    if (initial.isSuccess || params.input.isPublic || initial.error.code !== 'REGISTRATION_WINDOW_CLOSED') return initial;
    const actorId = params.input.actorId;
    if (!actorId) return Result.fail(initial.error);
    const permission = await this.authorization.authorize({ actorId, permission: 'registration:override-closed-window' });
    if (permission.isFailure) return Result.fail(permission.error);
    if (!permission.value) return Result.fail(initial.error);
    if (!params.input.administrativeReason?.trim()) {
      return Result.fail(new ValidationError({ code: 'REGISTRATION_OVERRIDE_REASON_REQUIRED', message: 'Informe o motivo da inscrição fora do período público.' }));
    }
    return params.event.checkRegistrationAccess({ now, isPublic: false, authorizedClosedWindowOverride: true });
  }

  private async prepareForm(params: PrepareRegistrationFormParams): Promise<Result<RegistrationFormContext, DomainError>> {
    const form = await this.formRepository.findActiveForEvent({ eventId: params.eventId });
    if (!form) {
      if (Object.keys(params.answers).length > 0) {
        return Result.fail(new ValidationError({ code: 'FORM_NOT_CONFIGURED', message: 'O evento não possui formulário de inscrição configurado.' }));
      }
      return Result.ok({ form: null, answers: {}, formId: null, formVersion: null, formSchemaSnapshotJson: null });
    }
    const validation = form.validateAnswers(params.answers);
    if (validation.isFailure) return Result.fail(validation.error);
    return Result.ok({
      form,
      answers: validation.value,
      formId: form.id.toString(),
      formVersion: form.version,
      formSchemaSnapshotJson: JSON.stringify(form.snapshot()),
    });
  }

  private async createRegistration(params: RegistrationCreationContext): Promise<Result<RegistrationCreationResult, DomainError>> {
    if (params.event.kind === 'GRATUITO') return this.createFreeRegistration(params);
    const batches = await this.ticketBatchRepository.listForEvent({ eventId: params.event.id.toString(), includeInactive: false });
    if (batches.length === 0) {
      return Result.fail(new NotFoundError({ code: 'TICKET_BATCH_NOT_FOUND', message: 'O evento pago não possui lotes disponíveis.' }));
    }
    for (let attempt = 0; attempt <= batches.length; attempt += 1) {
      const currentBatch = await this.selectCurrentBatch({ eventId: params.event.id.toString(), batches, now: params.now });
      if (currentBatch.isFailure) return Result.fail(currentBatch.error);
      const coupon = await this.resolveCoupon({ eventId: params.event.id.toString(), couponCode: params.input.couponCode, batch: currentBatch.value, now: params.now });
      if (coupon.isFailure) return Result.fail(coupon.error);
      const registration = this.buildRegistration({
        event: params.event,
        input: params.input,
        form: params.form,
        batch: currentBatch.value,
        coupon: coupon.value,
        registrationId: params.registrationId,
        registrationCode: params.registrationCode,
        now: params.now,
      });
      if (registration.isFailure) return Result.fail(registration.error);
      const created = await this.registrationRepository.createAtomically({
        registration: registration.value,
        coupon: coupon.value.coupon,
        eventCapacity: params.event.capacity,
        batchCapacity: currentBatch.value.maxQuantity,
        waitlistEnabled: params.event.waitlistEnabled,
        now: params.now,
      });
      if (created.isSuccess) return Result.ok({ ...created.value, coupon: coupon.value.coupon });
      if (created.error.code !== 'TICKET_BATCH_CAPACITY_REACHED') return Result.fail(created.error);
    }
    return Result.fail(new NotFoundError({ code: 'NO_ACTIVE_TICKET_BATCH', message: 'Não existe lote ativo e disponível para este evento.' }));
  }

  private async createFreeRegistration(params: RegistrationCreationContext): Promise<Result<RegistrationCreationResult, DomainError>> {
    if (params.input.couponCode?.trim()) {
      return Result.fail(new ValidationError({ code: 'COUPON_ONLY_FOR_PAID_EVENT', message: 'Cupons só podem ser usados em eventos pagos.' }));
    }
    const pricing = RegistrationPricing.create({
      baseAmountInMinorUnits: 0,
      discountAmountInMinorUnits: 0,
      couponId: null,
      couponCode: null,
      couponType: null,
    });
    if (pricing.isFailure) return Result.fail(pricing.error);
    const registration = this.makeRegistration({ ...params, ticketBatchId: null, pricing: pricing.value, reservationExpiresAt: null });
    if (registration.isFailure) return Result.fail(registration.error);
    const created = await this.registrationRepository.createAtomically({
      registration: registration.value,
      coupon: null,
      eventCapacity: params.event.capacity,
      batchCapacity: null,
      waitlistEnabled: params.event.waitlistEnabled,
      now: params.now,
    });
    return created.isFailure ? Result.fail(created.error) : Result.ok({ ...created.value, coupon: null });
  }

  private async selectCurrentBatch(params: SelectCurrentBatchParams): Promise<Result<TicketBatch, DomainError>> {
    const usage = await Promise.all(params.batches.map(async (batch) => ({
      batchId: batch.id.toString(),
      committedQuantity: await this.registrationRepository.countOccupiedSeatsByBatch({
        eventId: params.eventId,
        batchId: batch.id.toString(),
        now: params.now,
      }),
    })));
    return this.currentTicketBatch.execute({ batches: params.batches, usage, now: params.now });
  }

  private async resolveCoupon(params: ResolveCouponParams): Promise<Result<CouponPricingContext, DomainError>> {
    if (!params.couponCode?.trim()) {
      const pricing = RegistrationPricing.create({
        baseAmountInMinorUnits: params.batch.priceInMinorUnits,
        discountAmountInMinorUnits: 0,
        couponId: null,
        couponCode: null,
        couponType: null,
      });
      return pricing.isFailure ? Result.fail(pricing.error) : Result.ok({ coupon: null, pricing: pricing.value });
    }
    const coupon = await this.couponRepository.findByEventAndCode({ eventId: params.eventId, code: params.couponCode });
    if (!coupon) return Result.fail(new NotFoundError({ code: 'COUPON_NOT_FOUND', message: 'Cupom não encontrado para este evento.' }));
    const applied = coupon.apply({
      eventId: params.eventId,
      baseAmountInMinorUnits: params.batch.priceInMinorUnits,
      usedUses: coupon.usedUses,
      now: params.now,
    });
    if (applied.isFailure) return Result.fail(applied.error);
    const pricing = RegistrationPricing.create({
      baseAmountInMinorUnits: params.batch.priceInMinorUnits,
      discountAmountInMinorUnits: applied.value.discountAmountInMinorUnits,
      couponId: applied.value.couponId,
      couponCode: applied.value.code,
      couponType: applied.value.type,
    });
    return pricing.isFailure ? Result.fail(pricing.error) : Result.ok({ coupon, pricing: pricing.value });
  }

  private buildRegistration(params: BuildRegistrationParams): Result<Registration, DomainError> {
    const reservationMinutes = params.event.payment.reservationDurationMinutes;
    const hasCharge = params.coupon.pricing.finalAmountInMinorUnits > 0;
    const reservationExpiresAt = hasCharge && reservationMinutes !== null
      ? new Date(params.now.getTime() + reservationMinutes * 60_000)
      : null;
    return this.makeRegistration({
      event: params.event,
      input: params.input,
      form: params.form,
      ticketBatchId: params.batch.id.toString(),
      pricing: params.coupon.pricing,
      registrationId: params.registrationId,
      registrationCode: params.registrationCode,
      reservationExpiresAt,
      now: params.now,
    });
  }

  private makeRegistration(params: MakeRegistrationParams): Result<Registration, DomainError> {
    const registrationId = params.registrationId ?? this.idGenerator.generate({ purpose: 'registration' });
    const registrationCode = params.registrationCode ?? this.idGenerator.generate({ purpose: 'registration-code' });
    return Registration.create({
      id: registrationId,
      code: registrationCode,
      eventId: params.event.id.toString(),
      participantId: params.input.participantId,
      eventKind: params.event.kind,
      ticketBatchId: params.ticketBatchId,
      pricing: params.pricing,
      formId: params.form.formId,
      formVersion: params.form.formVersion,
      formSchemaSnapshotJson: params.form.formSchemaSnapshotJson,
      answers: params.form.answers as RegistrationAnswers,
      reservationExpiresAt: params.reservationExpiresAt,
      isWaitlisted: false,
      now: params.now,
    });
  }

  private createConsentRecords(params: ConsentCreationParams): Result<ConsentRecord[], DomainError> {
    const records: ConsentRecord[] = [];
    for (const consent of params.submissions) {
      const created = ConsentRecord.create({
        id: this.idGenerator.generate({ purpose: 'consent' }),
        participantId: params.participantId,
        eventId: params.eventId,
        registrationId: params.registrationId,
        type: consent.type,
        version: consent.version,
        accepted: consent.accepted,
        acceptedAt: params.now,
      });
      if (created.isFailure) return Result.fail(created.error);
      records.push(created.value);
    }
    return Result.ok(records);
  }

  private async persistConsents(params: PersistConsentsParams): Promise<boolean> {
    try {
      for (const record of params.records) await this.consentRepository.append(record);
      return true;
    } catch {
      return false;
    }
  }

  private async recordAdministrativeCreation(params: RecordAdministrativeCreationParams): Promise<boolean> {
    if (params.input.isPublic || !params.input.actorId) return true;
    const registration = params.registration.snapshot();
    const audit = AuditEntry.create({
      id: this.idGenerator.generate({ purpose: 'audit' }),
      actorId: params.input.actorId,
      operation: 'REGISTRATION_CREATED',
      aggregateType: 'REGISTRATION',
      aggregateId: registration.id,
      occurredAt: params.now,
      beforeStateJson: null,
      afterStateJson: JSON.stringify({
        eventId: params.event.id.toString(),
        participantId: registration.participantId,
        code: registration.code,
        status: registration.status,
      }),
      reason: params.input.administrativeReason,
    });
    if (audit.isFailure) return false;
    try {
      await this.auditRepository.append(audit.value);
      return true;
    } catch {
      return false;
    }
  }

  private communicationTrigger(params: CommunicationTriggerParams): CommunicationTrigger {
    if (params.wasWaitlisted) return 'REGISTRATION_WAITLISTED';
    if (params.registration.status === 'CONFIRMADA') return 'REGISTRATION_CONFIRMED';
    return 'REGISTRATION_CREATED';
  }

  private async requirePermission(params: RegistrationPermissionParams): Promise<Result<void, DomainError>> {
    const result = await this.authorization.authorize(params);
    if (result.isFailure) return Result.fail(result.error);
    if (!result.value) {
      return Result.fail(new ForbiddenError({ code: 'REGISTRATION_PERMISSION_DENIED', message: 'O usuário não possui permissão para esta operação.' }));
    }
    return Result.ok();
  }
}
