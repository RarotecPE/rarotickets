import type { AppConfig } from '@server/config/app.config';
import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import { ConsoleLogger } from '@server/infrastructure/logger/logger';
import type { ILogger } from '@server/infrastructure/logger/logger';
import { CryptoSignatureProvider } from '@server/infrastructure/providers/crypto-signature.provider';
import { ScryptPasswordHasher } from '@server/infrastructure/providers/scrypt-password.provider';
import { SystemClock } from '@server/infrastructure/providers/system-clock.provider';
import { PostgresAuditRecorder } from '@server/infrastructure/providers/audit-recorder.provider';
import { LoggingNotificationGateway } from '@server/infrastructure/providers/notification.gateway';
import { PagBankPaymentProvider } from '@server/infrastructure/providers/pagbank.provider';
import { SimulatedPaymentProvider } from '@server/infrastructure/providers/simulated-payment.provider';
import type { IPaymentProvider } from '@core/contracts/payment-provider.contract';

// Auth
import { UserPersistenceMapper } from '@modules/auth/server/infrastructure/persistence/mappers/user-persistence.mapper';
import { SessionPersistenceMapper } from '@modules/auth/server/infrastructure/persistence/mappers/session-persistence.mapper';
import { UserRepositoryImpl } from '@modules/auth/server/infrastructure/persistence/repositories/user.repository.impl';
import { SessionRepositoryImpl } from '@modules/auth/server/infrastructure/persistence/repositories/session.repository.impl';
import { UserMapper } from '@modules/auth/application/mappers/user.mapper';
import { LoginUseCase } from '@modules/auth/application/use-cases/login/login.use-case';
import { LogoutUseCase } from '@modules/auth/application/use-cases/logout/logout.use-case';
import { GetCurrentUserUseCase } from '@modules/auth/application/use-cases/get-current-user/get-current-user.use-case';
import { CreateUserUseCase } from '@modules/auth/application/use-cases/create-user/create-user.use-case';
import { UpdateUserUseCase } from '@modules/auth/application/use-cases/update-user/update-user.use-case';
import { ListUsersUseCase } from '@modules/auth/application/use-cases/list-users/list-users.use-case';
import { ResolveSessionService } from '@modules/auth/application/services/resolve-session.service';
import { AuthController } from '@modules/auth/server/api/controllers/auth.controller';
import { UserController } from '@modules/auth/server/api/controllers/user.controller';
import { createAuthRouter } from '@modules/auth/server/api/routes/auth.routes';
import { createUserRouter } from '@modules/auth/server/api/routes/user.routes';
import { createAuthMiddleware } from '@server/middlewares/auth.middleware';

// Participant
import { ParticipantPersistenceMapper } from '@modules/participant/server/infrastructure/persistence/mappers/participant-persistence.mapper';
import { ParticipantConsentPersistenceMapper } from '@modules/participant/server/infrastructure/persistence/mappers/participant-persistence.mapper';
import { ParticipantRepositoryImpl } from '@modules/participant/server/infrastructure/persistence/repositories/participant.repository.impl';
import { ParticipantConsentRepositoryImpl } from '@modules/participant/server/infrastructure/persistence/repositories/participant-consent.repository.impl';
import { ParticipantSessionRepositoryImpl } from '@modules/participant/server/infrastructure/persistence/repositories/participant-session.repository.impl';
import { ParticipantGatewayAdapter } from '@modules/participant/server/infrastructure/adapters/participant-gateway.adapter';
import { ParticipantMapper } from '@modules/participant/application/mappers/participant.mapper';
import { OpenParticipantSessionUseCase } from '@modules/participant/application/use-cases/participant-session/open-participant-session.use-case';
import { CloseParticipantSessionUseCase } from '@modules/participant/application/use-cases/participant-session/close-participant-session.use-case';
import { ResolveParticipantSessionService } from '@modules/participant/application/use-cases/participant-session/resolve-participant-session.service';
import { GetParticipantUseCase } from '@modules/participant/application/use-cases/get-participant/get-participant.use-case';
import { ListParticipantsUseCase } from '@modules/participant/application/use-cases/list-participants/list-participants.use-case';
import { UpdateParticipantUseCase } from '@modules/participant/application/use-cases/update-participant/update-participant.use-case';
import { RegisterConsentUseCase } from '@modules/participant/application/use-cases/register-consent/register-consent.use-case';
import { ResolveParticipantUseCase } from '@modules/participant/application/use-cases/resolve-participant/resolve-participant.use-case';
import { ParticipantController } from '@modules/participant/server/api/controllers/participant.controller';
import { createParticipantRouter } from '@modules/participant/server/api/routes/participant.routes';
import { createParticipantAuthMiddleware } from '@server/middlewares/participant-auth.middleware';

// Event
import { EventPersistenceMapper } from '@modules/event/server/infrastructure/persistence/mappers/event-persistence.mapper';
import { EventLotePersistenceMapper } from '@modules/event/server/infrastructure/persistence/mappers/event-persistence.mapper';
import { EventFormFieldPersistenceMapper } from '@modules/event/server/infrastructure/persistence/mappers/event-persistence.mapper';
import { EventSpeakerPersistenceMapper } from '@modules/event/server/infrastructure/persistence/mappers/event-persistence.mapper';
import { EventActivityPersistenceMapper } from '@modules/event/server/infrastructure/persistence/mappers/event-persistence.mapper';
import { EventRepositoryImpl } from '@modules/event/server/infrastructure/persistence/repositories/event.repository.impl';
import { EventLoteRepositoryImpl } from '@modules/event/server/infrastructure/persistence/repositories/event-lote.repository.impl';
import { EventFormRepositoryImpl } from '@modules/event/server/infrastructure/persistence/repositories/event-form.repository.impl';
import { EventProgramRepositoryImpl } from '@modules/event/server/infrastructure/persistence/repositories/event-program.repository.impl';
import { EventCatalogAdapter } from '@modules/event/server/infrastructure/adapters/event-catalog.adapter';
import { EventMapper } from '@modules/event/application/mappers/event.mapper';
import { LoteSelectorService } from '@modules/event/domain/services/lote-selector.service';
import { CreateEventUseCase } from '@modules/event/application/use-cases/create-event/create-event.use-case';
import { UpdateEventUseCase } from '@modules/event/application/use-cases/update-event/update-event.use-case';
import { ChangeEventStatusUseCase } from '@modules/event/application/use-cases/change-event-status/change-event-status.use-case';
import { ListEventsUseCase } from '@modules/event/application/use-cases/list-events/list-events.use-case';
import { GetPublicEventUseCase } from '@modules/event/application/use-cases/get-public-event/get-public-event.use-case';
import { GetAdminEventUseCase } from '@modules/event/application/use-cases/get-admin-event/get-admin-event.use-case';
import { SaveEventFormUseCase } from '@modules/event/application/use-cases/save-event-form/save-event-form.use-case';
import { ManageEventLoteUseCase } from '@modules/event/application/use-cases/manage-event-lote/manage-event-lote.use-case';
import { ManageEventProgramUseCase } from '@modules/event/application/use-cases/manage-event-program/manage-event-program.use-case';
import { SyncEventStatusesUseCase } from '@modules/event/application/use-cases/sync-event-statuses/sync-event-statuses.use-case';
import { PublicEventController } from '@modules/event/server/api/controllers/public-event.controller';
import { EventAdminController } from '@modules/event/server/api/controllers/event-admin.controller';
import { createEventRouter } from '@modules/event/server/api/routes/event.routes';

// Coupon
import { CouponPersistenceMapper } from '@modules/coupon/server/infrastructure/persistence/mappers/coupon-persistence.mapper';
import { CouponRepositoryImpl } from '@modules/coupon/server/infrastructure/persistence/repositories/coupon.repository.impl';
import { CouponCatalogAdapter } from '@modules/coupon/server/infrastructure/adapters/coupon-catalog.adapter';
import { CouponMapper } from '@modules/coupon/application/mappers/coupon.mapper';
import { CouponDiscountService } from '@modules/coupon/domain/services/coupon-discount.service';
import { CreateCouponUseCase } from '@modules/coupon/application/use-cases/create-coupon/create-coupon.use-case';
import { UpdateCouponUseCase } from '@modules/coupon/application/use-cases/update-coupon/update-coupon.use-case';
import { ListCouponsUseCase } from '@modules/coupon/application/use-cases/list-coupons/list-coupons.use-case';
import { ValidateCouponUseCase } from '@modules/coupon/application/use-cases/validate-coupon/validate-coupon.use-case';
import { DeactivateCouponUseCase } from '@modules/coupon/application/use-cases/deactivate-coupon/deactivate-coupon.use-case';
import { CouponController } from '@modules/coupon/server/api/controllers/coupon.controller';
import { createCouponRouter } from '@modules/coupon/server/api/routes/coupon.routes';

// Registration
import { RegistrationPersistenceMapper } from '@modules/registration/server/infrastructure/persistence/mappers/registration-persistence.mapper';
import { RegistrationRepositoryImpl } from '@modules/registration/server/infrastructure/persistence/repositories/registration.repository.impl';
import { RegistrationGatewayAdapter } from '@modules/registration/server/infrastructure/adapters/registration-gateway.adapter';
import { RegistrationMapper } from '@modules/registration/application/mappers/registration.mapper';
import { CredentialService } from '@modules/registration/application/services/credential.service';
import { RegistrationPricingService } from '@modules/registration/domain/services/registration-pricing.service';
import { RegistrationPolicyService } from '@core/domain/services/registration-policy.service';
import { LoteSelectionService } from '@core/domain/services/lote-selection.service';
import { RegisterForEventUseCase } from '@modules/registration/application/use-cases/register-for-event/register-for-event.use-case';
import { GetRegistrationUseCase } from '@modules/registration/application/use-cases/get-registration/get-registration.use-case';
import { ListRegistrationsUseCase } from '@modules/registration/application/use-cases/list-registrations/list-registrations.use-case';
import { CancelRegistrationUseCase } from '@modules/registration/application/use-cases/cancel-registration/cancel-registration.use-case';
import { PromoteFromWaitlistUseCase } from '@modules/registration/application/use-cases/promote-from-waitlist/promote-from-waitlist.use-case';
import { PerformCheckInUseCase } from '@modules/registration/application/use-cases/perform-check-in/perform-check-in.use-case';
import { ExpireReservationsUseCase } from '@modules/registration/application/use-cases/expire-reservations/expire-reservations.use-case';
import { GetRegistrationCredentialUseCase } from '@modules/registration/application/use-cases/get-registration-credential/get-registration-credential.use-case';
import { RegistrationController } from '@modules/registration/server/api/controllers/registration.controller';
import { RegistrationAdminController } from '@modules/registration/server/api/controllers/registration-admin.controller';
import { createRegistrationRouter } from '@modules/registration/server/api/routes/registration.routes';

// Payment
import { PaymentPersistenceMapper } from '@modules/payment/server/infrastructure/persistence/mappers/payment-persistence.mapper';
import { PaymentRepositoryImpl } from '@modules/payment/server/infrastructure/persistence/repositories/payment.repository.impl';
import { PaymentNotificationRepositoryImpl } from '@modules/payment/server/infrastructure/persistence/repositories/payment-notification.repository.impl';
import { PaymentMapper } from '@modules/payment/application/mappers/payment.mapper';
import { PaymentStatusSyncService } from '@modules/payment/application/services/payment-status-sync.service';
import { InitiatePaymentUseCase } from '@modules/payment/application/use-cases/initiate-payment/initiate-payment.use-case';
import { HandlePaymentWebhookUseCase } from '@modules/payment/application/use-cases/handle-payment-webhook/handle-payment-webhook.use-case';
import { ReconcilePaymentsUseCase } from '@modules/payment/application/use-cases/reconcile-payments/reconcile-payments.use-case';
import { RefundPaymentUseCase } from '@modules/payment/application/use-cases/refund-payment/refund-payment.use-case';
import { CancelPaymentUseCase } from '@modules/payment/application/use-cases/cancel-payment/cancel-payment.use-case';
import { GetPaymentUseCase } from '@modules/payment/application/use-cases/get-payment/get-payment.use-case';
import { ListPaymentsUseCase } from '@modules/payment/application/use-cases/list-payments/list-payments.use-case';
import { PaymentController } from '@modules/payment/server/api/controllers/payment.controller';
import { PaymentAdminController } from '@modules/payment/server/api/controllers/payment-admin.controller';
import { PaymentWebhookController } from '@modules/payment/server/api/controllers/payment-webhook.controller';
import { createPaymentRouter } from '@modules/payment/server/api/routes/payment.routes';

// Certificate
import { CertificatePersistenceMapper } from '@modules/certificate/server/infrastructure/persistence/mappers/certificate-persistence.mapper';
import { CertificateRepositoryImpl } from '@modules/certificate/server/infrastructure/persistence/repositories/certificate.repository.impl';
import { CertificateMapper } from '@modules/certificate/application/mappers/certificate.mapper';
import { IssueCertificateUseCase } from '@modules/certificate/application/use-cases/issue-certificate/issue-certificate.use-case';
import { GetCertificateUseCase } from '@modules/certificate/application/use-cases/get-certificate/get-certificate.use-case';
import { ListCertificatesUseCase } from '@modules/certificate/application/use-cases/list-certificates/list-certificates.use-case';
import { ValidateCertificateUseCase } from '@modules/certificate/application/use-cases/validate-certificate/validate-certificate.use-case';
import { RevokeCertificateUseCase } from '@modules/certificate/application/use-cases/revoke-certificate/revoke-certificate.use-case';
import { CertificateController } from '@modules/certificate/server/api/controllers/certificate.controller';
import { createCertificateRouter } from '@modules/certificate/server/api/routes/certificate.routes';

// Report
import { ReportQueryGatewayImpl } from '@modules/report/server/infrastructure/gateways/report-query.gateway.impl';
import { DashboardUseCase } from '@modules/report/application/use-cases/dashboard/dashboard.use-case';
import { RegistrationsByEventUseCase } from '@modules/report/application/use-cases/registrations-by-event/registrations-by-event.use-case';
import { AttendanceListUseCase } from '@modules/report/application/use-cases/attendance-list/attendance-list.use-case';
import { CheckInsUseCase } from '@modules/report/application/use-cases/check-ins/check-ins.use-case';
import { RegistrationFunnelUseCase } from '@modules/report/application/use-cases/registration-funnel/registration-funnel.use-case';
import { PaymentsByPeriodUseCase } from '@modules/report/application/use-cases/payments-by-period/payments-by-period.use-case';
import { OpenPaymentsUseCase } from '@modules/report/application/use-cases/open-payments/open-payments.use-case';
import { RefundsUseCase } from '@modules/report/application/use-cases/refunds/refunds.use-case';
import { CouponUsageUseCase } from '@modules/report/application/use-cases/coupon-usage/coupon-usage.use-case';
import { WaitlistUseCase } from '@modules/report/application/use-cases/waitlist/waitlist.use-case';
import { ParticipantsByLocationUseCase } from '@modules/report/application/use-cases/participants-by-location/participants-by-location.use-case';
import { CertificatesIssuedUseCase } from '@modules/report/application/use-cases/certificates-issued/certificates-issued.use-case';
import { RevenueByLoteUseCase } from '@modules/report/application/use-cases/revenue-by-lote/revenue-by-lote.use-case';
import { CommunicationsUseCase } from '@modules/report/application/use-cases/communications/communications.use-case';
import { ReportController } from '@modules/report/server/api/controllers/report.controller';
import { createReportRouter } from '@modules/report/server/api/routes/report.routes';
import { ListAuditEntriesUseCase } from '@modules/audit/application/use-cases/list-audit-entries/list-audit-entries.use-case';
import { AuditController } from '@modules/audit/server/api/controllers/audit.controller';
import { AuditRepositoryImpl } from '@modules/audit/server/infrastructure/persistence/repositories/audit.repository.impl';
import { createAuditRouter } from '@modules/audit/server/api/routes/audit.routes';
import { GetCheckInBoardUseCase } from '@modules/checkin/application/use-cases/get-check-in-board/get-check-in-board.use-case';
import { FindRegistrationForCheckInUseCase } from '@modules/checkin/application/use-cases/find-registration-for-check-in/find-registration-for-check-in.use-case';
import { CheckInController } from '@modules/checkin/server/api/controllers/checkin.controller';
import { CheckInRepositoryImpl } from '@modules/checkin/server/infrastructure/persistence/repositories/check-in.repository.impl';
import {
  CheckInLookupMapper,
  CheckInRecordMapper,
} from '@modules/checkin/application/mappers/checkin.mapper';
import { createCheckInRouter } from '@modules/checkin/server/api/routes/checkin.routes';

export type ContainerDependencies = { config: AppConfig; db: IDatabaseClient; logger?: ILogger };

export type Container = ReturnType<typeof buildContainer>;

/**
 * Composição da aplicação: única camada autorizada a conhecer implementações
 * concretas de todos os módulos (ver ARCHITECTURE §5 — Composition Root).
 */
export function buildContainer(dependencies: ContainerDependencies) {
  const { config, db } = dependencies;
  const logger = dependencies.logger ?? new ConsoleLogger({ level: config.logLevel as never, prefix: config.appName });

  // Núcleo compartilhado
  const clock = new SystemClock();
  const signatureProvider = new CryptoSignatureProvider();
  const passwordHasher = new ScryptPasswordHasher();
  const auditRecorder = new PostgresAuditRecorder({ db, logger });
  const notificationGateway = new LoggingNotificationGateway({
    db,
    logger,
    mailProvider: config.communications.mailProvider,
    mailFrom: config.communications.mailFrom,
    whatsappProvider: config.communications.whatsappProvider,
  });

  const pagbankConfigured = Boolean(config.pagbank.token) && !config.pagbank.token.startsWith('PREENCHER');
  const simulatedProvider = new SimulatedPaymentProvider({ logger });
  const paymentProvider: IPaymentProvider = pagbankConfigured
    ? new PagBankPaymentProvider({
        apiBaseUrl: config.pagbank.apiBaseUrl,
        token: config.pagbank.token,
        webhookSignatureHeader: config.pagbank.webhookSignatureHeader,
        webhookSecret: config.pagbank.webhookSecret,
        logger,
      })
    : simulatedProvider;

  // ---------------------------------------------------------------- auth
  const userRepository = new UserRepositoryImpl({ db, mapper: new UserPersistenceMapper() });
  const sessionRepository = new SessionRepositoryImpl({ db, mapper: new SessionPersistenceMapper() });
  const userMapper = new UserMapper();

  const loginUseCase = new LoginUseCase({
    userRepository,
    sessionRepository,
    passwordHasher,
    signatureProvider,
    clock,
    sessionTtlMinutes: config.session.ttlMinutes,
    mapper: userMapper,
  });
  const logoutUseCase = new LogoutUseCase({ sessionRepository, signatureProvider, clock });
  const getCurrentUserUseCase = new GetCurrentUserUseCase({ userRepository, mapper: userMapper });
  const createUserUseCase = new CreateUserUseCase({ userRepository, passwordHasher, auditRecorder, mapper: userMapper });
  const updateUserUseCase = new UpdateUserUseCase({ userRepository, auditRecorder, mapper: userMapper });
  const listUsersUseCase = new ListUsersUseCase({ userRepository, mapper: userMapper });
  const resolveSessionService = new ResolveSessionService({ sessionRepository, userRepository, signatureProvider });

  const authController = new AuthController({
    loginUseCase,
    logoutUseCase,
    getCurrentUserUseCase,
    sessionCookieName: config.session.cookieName,
    sessionTtlMinutes: config.session.ttlMinutes,
    cookieSecure: config.session.secure,
  });
  const userController = new UserController({ createUserUseCase, updateUserUseCase, listUsersUseCase });

  const authenticate = createAuthMiddleware({ resolveSession: (params) => resolveSessionService.execute(params).then((result) => (result.isSuccess ? result.value : null)), logger });

  // --------------------------------------------------------- participant
  const participantRepository = new ParticipantRepositoryImpl({ db, mapper: new ParticipantPersistenceMapper() });
  const participantConsentRepository = new ParticipantConsentRepositoryImpl({ db, mapper: new ParticipantConsentPersistenceMapper() });
  const participantSessionRepository = new ParticipantSessionRepositoryImpl({ db });
  const participantMapper = new ParticipantMapper();
  const resolveParticipantUseCase = new ResolveParticipantUseCase({
    participantRepository,
    consentRepository: participantConsentRepository,
    mapper: participantMapper,
  });
  const participantGateway = new ParticipantGatewayAdapter({ participantRepository, resolveParticipantUseCase });

  const openParticipantSessionUseCase = new OpenParticipantSessionUseCase({
    participantRepository,
    sessionRepository: participantSessionRepository,
    signatureProvider,
    clock,
    mapper: participantMapper,
    sessionTtlMinutes: config.session.ttlMinutes,
  });
  const closeParticipantSessionUseCase = new CloseParticipantSessionUseCase({
    sessionRepository: participantSessionRepository,
    signatureProvider,
    clock,
  });
  const resolveParticipantSessionService = new ResolveParticipantSessionService({
    sessionRepository: participantSessionRepository,
    participantRepository,
    signatureProvider,
  });
  const getParticipantUseCase = new GetParticipantUseCase({ participantRepository, consentRepository: participantConsentRepository, mapper: participantMapper });
  const listParticipantsUseCase = new ListParticipantsUseCase({ participantRepository, mapper: participantMapper });
  const updateParticipantUseCase = new UpdateParticipantUseCase({ participantRepository, auditRecorder, mapper: participantMapper });
  const registerConsentUseCase = new RegisterConsentUseCase({ participantRepository, consentRepository: participantConsentRepository });

  const participantController = new ParticipantController({
    openSessionUseCase: openParticipantSessionUseCase,
    closeSessionUseCase: closeParticipantSessionUseCase,
    getParticipantUseCase,
    updateParticipantUseCase,
    registerConsentUseCase,
    listParticipantsUseCase,
    sessionCookieName: 'rarotickets_participant_session',
    sessionTtlMinutes: config.session.ttlMinutes,
    cookieSecure: config.session.secure,
  });
  const authenticateParticipant = createParticipantAuthMiddleware({
    resolveParticipantSession: (params) =>
      resolveParticipantSessionService.execute(params).then((result) => (result.isSuccess ? result.value : null)),
    logger,
  });

  // -------------------------------------------------------------- event
  const eventRepository = new EventRepositoryImpl({ db, mapper: new EventPersistenceMapper() });
  const eventLoteRepository = new EventLoteRepositoryImpl({ db, mapper: new EventLotePersistenceMapper() });
  const eventFormRepository = new EventFormRepositoryImpl({ db, mapper: new EventFormFieldPersistenceMapper() });
  const eventProgramRepository = new EventProgramRepositoryImpl({
    db,
    speakerMapper: new EventSpeakerPersistenceMapper(),
    activityMapper: new EventActivityPersistenceMapper(),
  });
  const eventMapper = new EventMapper();
  const eventCatalog = new EventCatalogAdapter({ eventRepository, loteRepository: eventLoteRepository, formRepository: eventFormRepository });

  const createEventUseCase = new CreateEventUseCase({ eventRepository, formRepository: eventFormRepository, auditRecorder, mapper: eventMapper });
  const updateEventUseCase = new UpdateEventUseCase({ eventRepository, auditRecorder, mapper: eventMapper });
  const changeEventStatusUseCase = new ChangeEventStatusUseCase({ eventRepository, auditRecorder, notificationGateway, clock, mapper: eventMapper });
  const listEventsUseCase = new ListEventsUseCase({ eventRepository, clock, mapper: eventMapper });
  const getPublicEventUseCase = new GetPublicEventUseCase({
    eventRepository,
    loteRepository: eventLoteRepository,
    formRepository: eventFormRepository,
    programRepository: eventProgramRepository,
    loteSelector: new LoteSelectorService(),
    clock,
    mapper: eventMapper,
  });
  const getAdminEventUseCase = new GetAdminEventUseCase({
    eventRepository,
    loteRepository: eventLoteRepository,
    formRepository: eventFormRepository,
    programRepository: eventProgramRepository,
    mapper: eventMapper,
  });
  const saveEventFormUseCase = new SaveEventFormUseCase({ eventRepository, formRepository: eventFormRepository, auditRecorder, mapper: eventMapper });
  const manageEventLoteUseCase = new ManageEventLoteUseCase({ eventRepository, loteRepository: eventLoteRepository, auditRecorder, mapper: eventMapper });
  const manageEventProgramUseCase = new ManageEventProgramUseCase({ eventRepository, programRepository: eventProgramRepository, auditRecorder, mapper: eventMapper });
  const syncEventStatusesUseCase = new SyncEventStatusesUseCase({ eventRepository, clock });

  const publicEventController = new PublicEventController({ listEventsUseCase, getPublicEventUseCase });
  const eventAdminController = new EventAdminController({
    listEventsUseCase,
    getAdminEventUseCase,
    createEventUseCase,
    updateEventUseCase,
    changeEventStatusUseCase,
    saveEventFormUseCase,
    manageEventLoteUseCase,
    manageEventProgramUseCase,
  });

  // ------------------------------------------------------------- coupon
  const couponRepository = new CouponRepositoryImpl({ db, mapper: new CouponPersistenceMapper() });
  const couponDiscountService = new CouponDiscountService();
  const couponCatalog = new CouponCatalogAdapter({ couponRepository, discountService: couponDiscountService });
  const couponMapper = new CouponMapper();

  const createCouponUseCase = new CreateCouponUseCase({ couponRepository, auditRecorder, mapper: couponMapper });
  const updateCouponUseCase = new UpdateCouponUseCase({ couponRepository, auditRecorder, mapper: couponMapper });
  const listCouponsUseCase = new ListCouponsUseCase({ couponRepository, mapper: couponMapper });
  const validateCouponUseCase = new ValidateCouponUseCase({ couponRepository, discountService: couponDiscountService, clock, mapper: couponMapper });
  const deactivateCouponUseCase = new DeactivateCouponUseCase({ couponRepository, auditRecorder, mapper: couponMapper });
  const couponController = new CouponController({
    createCouponUseCase,
    updateCouponUseCase,
    listCouponsUseCase,
    validateCouponUseCase,
    deactivateCouponUseCase,
  });

  // ------------------------------------------------------- registration
  const registrationRepository = new RegistrationRepositoryImpl({ db, mapper: new RegistrationPersistenceMapper() });
  const registrationMapper = new RegistrationMapper();
  const credentialService = new CredentialService({
    signatureProvider,
    credentialSecret: config.credentials.secret,
    credentialBaseUrl: config.credentials.baseUrl,
  });
  const registrationGateway = new RegistrationGatewayAdapter({ registrationRepository, couponCatalog });

  const registerForEventUseCase = new RegisterForEventUseCase({
    registrationRepository,
    eventCatalog,
    couponCatalog,
    participantGateway,
    notificationGateway,
    pricingService: new RegistrationPricingService(),
    policyService: new RegistrationPolicyService(),
    loteSelectionService: new LoteSelectionService(),
    clock,
    mapper: registrationMapper,
  });
  const getRegistrationUseCase = new GetRegistrationUseCase({
    registrationRepository,
    eventCatalog,
    participantGateway,
    credentialService,
    mapper: registrationMapper,
  });
  const listRegistrationsUseCase = new ListRegistrationsUseCase({
    registrationRepository,
    participantGateway,
    eventCatalog,
    mapper: registrationMapper,
  });
  const cancelRegistrationUseCase = new CancelRegistrationUseCase({
    registrationRepository,
    participantGateway,
    couponCatalog,
    notificationGateway,
    auditRecorder,
    clock,
    mapper: registrationMapper,
  });
  const promoteFromWaitlistUseCase = new PromoteFromWaitlistUseCase({
    registrationRepository,
    eventCatalog,
    participantGateway,
    notificationGateway,
    auditRecorder,
    clock,
    mapper: registrationMapper,
  });
  const performCheckInUseCase = new PerformCheckInUseCase({
    registrationRepository,
    eventCatalog,
    participantGateway,
    credentialService,
    auditRecorder,
    clock,
    mapper: registrationMapper,
  });
  const expireReservationsUseCase = new ExpireReservationsUseCase({ registrationRepository, couponCatalog, clock });
  const getRegistrationCredentialUseCase = new GetRegistrationCredentialUseCase({
    registrationRepository,
    eventCatalog,
    participantGateway,
    credentialService,
  });

  const registrationController = new RegistrationController({
    registerForEventUseCase,
    getRegistrationUseCase,
    listRegistrationsUseCase,
    cancelRegistrationUseCase,
    getRegistrationCredentialUseCase,
  });
  const registrationAdminController = new RegistrationAdminController({
    listRegistrationsUseCase,
    getRegistrationUseCase,
    cancelRegistrationUseCase,
    promoteFromWaitlistUseCase,
    performCheckInUseCase,
    expireReservationsUseCase,
    listCheckIns: async (eventId) => ({ checkIns: await registrationRepository.listCheckInsByEvent(eventId) }),
  });

  // ------------------------------------------------------------ payment
  const paymentPersistenceMapper = new PaymentPersistenceMapper();
  const paymentMapper = new PaymentMapper();
  const paymentRepository = new PaymentRepositoryImpl({ db, mapper: paymentPersistenceMapper });
  const paymentNotificationRepository = new PaymentNotificationRepositoryImpl({ db, mapper: paymentPersistenceMapper });

  const paymentStatusSyncService = new PaymentStatusSyncService({
    paymentRepository,
    registrationGateway,
    notificationGateway,
    auditRecorder,
  });
  const initiatePaymentUseCase = new InitiatePaymentUseCase({
    paymentRepository,
    registrationGateway,
    participantGateway,
    eventCatalog,
    paymentProvider,
    auditRecorder,
    clock,
    mapper: paymentMapper,
    notificationUrl: config.pagbank.notificationUrl,
    defaultReservationMinutes: config.payments.defaultSeatReservationMinutes,
  });
  const handlePaymentWebhookUseCase = new HandlePaymentWebhookUseCase({
    paymentRepository,
    notificationRepository: paymentNotificationRepository,
    paymentProvider,
    syncService: paymentStatusSyncService,
    clock,
  });
  const reconcilePaymentsUseCase = new ReconcilePaymentsUseCase({
    paymentRepository,
    paymentProvider,
    syncService: paymentStatusSyncService,
    auditRecorder,
    clock,
    defaultWindowHours: config.payments.reconcileWindowHours,
    defaultLimit: 50,
  });
  const refundPaymentUseCase = new RefundPaymentUseCase({
    paymentRepository,
    paymentProvider,
    notificationGateway,
    auditRecorder,
    clock,
    mapper: paymentMapper,
  });
  const cancelPaymentUseCase = new CancelPaymentUseCase({
    paymentRepository,
    registrationGateway,
    auditRecorder,
    clock,
    mapper: paymentMapper,
  });
  const getPaymentUseCase = new GetPaymentUseCase({ paymentRepository, registrationGateway, mapper: paymentMapper });
  const listPaymentsUseCase = new ListPaymentsUseCase({ paymentRepository, mapper: paymentMapper });

  const paymentController = new PaymentController({ initiatePaymentUseCase, getPaymentUseCase });
  const paymentAdminController = new PaymentAdminController({
    listPaymentsUseCase,
    getPaymentUseCase,
    refundPaymentUseCase,
    cancelPaymentUseCase,
    reconcilePaymentsUseCase,
    simulatePayment: async ({ paymentId }) => {
      if (paymentProvider !== simulatedProvider) {
        return { simulated: false, message: 'Provedor real configurado: a liquidação vem do PagBank' };
      }
      const payment = await paymentRepository.findById(paymentId);
      const chargeId = payment?.transaction.providerChargeId ?? null;
      if (!payment || !chargeId) return { simulated: false, message: 'Cobrança simulada não encontrada' };

      simulatedProvider.simulatePayment({ providerChargeId: chargeId });
      const sync = await paymentStatusSyncService.execute({
        payment,
        providerStatus: 'PAID',
        at: clock.now(),
        source: 'MANUAL',
        actorName: 'Simulação de pagamento',
      });
      if (sync.isFailure) return { simulated: false, message: sync.error.message };
      return { simulated: true, message: sync.value.message };
    },
  });
  const paymentWebhookController = new PaymentWebhookController({ handlePaymentWebhookUseCase });

  // -------------------------------------------------------- certificate
  const certificateRepository = new CertificateRepositoryImpl({ db, mapper: new CertificatePersistenceMapper() });
  const certificateMapper = new CertificateMapper();
  const issueCertificateUseCase = new IssueCertificateUseCase({
    certificateRepository,
    registrationGateway,
    eventCatalog,
    participantGateway,
    notificationGateway,
    auditRecorder,
    clock,
    mapper: certificateMapper,
    validationBaseUrl: config.certificates.baseUrl,
  });
  const getCertificateUseCase = new GetCertificateUseCase({ certificateRepository, mapper: certificateMapper });
  const listCertificatesUseCase = new ListCertificatesUseCase({ certificateRepository, mapper: certificateMapper });
  const validateCertificateUseCase = new ValidateCertificateUseCase({ certificateRepository });
  const revokeCertificateUseCase = new RevokeCertificateUseCase({ certificateRepository, auditRecorder, clock, mapper: certificateMapper });
  const certificateController = new CertificateController({
    issueCertificateUseCase,
    getCertificateUseCase,
    listCertificatesUseCase,
    validateCertificateUseCase,
    revokeCertificateUseCase,
  });

  // ------------------------------------------------------------- report
  const reportQueryGateway = new ReportQueryGatewayImpl({ db });
  const dashboardUseCase = new DashboardUseCase({ reportQueryGateway, clock });
  const reportController = new ReportController({
    dashboardUseCase,
    reports: {
      'registrations-by-event': new RegistrationsByEventUseCase({ reportQueryGateway, clock }),
      'attendance-list': new AttendanceListUseCase({ reportQueryGateway, clock }),
      'check-ins': new CheckInsUseCase({ reportQueryGateway, clock }),
      'registration-funnel': new RegistrationFunnelUseCase({ reportQueryGateway, clock }),
      'payments-by-period': new PaymentsByPeriodUseCase({ reportQueryGateway, clock }),
      'open-payments': new OpenPaymentsUseCase({ reportQueryGateway, clock }),
      refunds: new RefundsUseCase({ reportQueryGateway, clock }),
      'coupon-usage': new CouponUsageUseCase({ reportQueryGateway, clock }),
      waitlist: new WaitlistUseCase({ reportQueryGateway, clock }),
      'participants-by-location': new ParticipantsByLocationUseCase({ reportQueryGateway, clock }),
      'certificates-issued': new CertificatesIssuedUseCase({ reportQueryGateway, clock }),
      'revenue-by-lote': new RevenueByLoteUseCase({ reportQueryGateway, clock }),
      communications: new CommunicationsUseCase({ reportQueryGateway, clock }),
    },
  });

  // ------------------------------------------------------- audit / check-in
  const auditRepository = new AuditRepositoryImpl({ db });
  const listAuditEntriesUseCase = new ListAuditEntriesUseCase({ auditRepository });
  const auditController = new AuditController({ listAuditEntriesUseCase });

  const checkInRepository = new CheckInRepositoryImpl({ db });
  const checkInRecordMapper = new CheckInRecordMapper();
  const checkInLookupMapper = new CheckInLookupMapper();
  const getCheckInBoardUseCase = new GetCheckInBoardUseCase({ checkInRepository, mapper: checkInRecordMapper });
  const findRegistrationForCheckInUseCase = new FindRegistrationForCheckInUseCase({
    checkInRepository,
    mapper: checkInLookupMapper,
  });
  const checkInController = new CheckInController({ getCheckInBoardUseCase, findRegistrationForCheckInUseCase });

  // -------------------------------------------------------------- routes
  const routers = [
    createAuthRouter({ controller: authController, authenticate }),
    createUserRouter({ controller: userController, authenticate }),
    createParticipantRouter({ controller: participantController, authenticate, authenticateParticipant }),
    createEventRouter({ publicController: publicEventController, adminController: eventAdminController, authenticate }),
    createCouponRouter({ controller: couponController, authenticate }),
    createRegistrationRouter({
      controller: registrationController,
      adminController: registrationAdminController,
      authenticate,
      authenticateParticipant,
    }),
    createPaymentRouter({
      controller: paymentController,
      adminController: paymentAdminController,
      webhookController: paymentWebhookController,
      authenticate,
      authenticateParticipant,
      providerSignatureHeader: config.pagbank.webhookSignatureHeader,
    }),
    createCertificateRouter({ controller: certificateController, authenticate, authenticateParticipant }),
    createReportRouter({ controller: reportController, authenticate }),
    createAuditRouter({ controller: auditController, authenticate }),
    createCheckInRouter({ controller: checkInController, authenticate }),
  ];

  const useCases = {
    loginUseCase,
    logoutUseCase,
    getCurrentUserUseCase,
    createUserUseCase,
    updateUserUseCase,
    listUsersUseCase,
    getParticipantUseCase,
    listParticipantsUseCase,
    updateParticipantUseCase,
    registerConsentUseCase,
    createEventUseCase,
    updateEventUseCase,
    changeEventStatusUseCase,
    listEventsUseCase,
    getPublicEventUseCase,
    getAdminEventUseCase,
    saveEventFormUseCase,
    manageEventLoteUseCase,
    manageEventProgramUseCase,
    syncEventStatusesUseCase,
    registerForEventUseCase,
    getRegistrationUseCase,
    listRegistrationsUseCase,
    cancelRegistrationUseCase,
    promoteFromWaitlistUseCase,
    performCheckInUseCase,
    expireReservationsUseCase,
    getRegistrationCredentialUseCase,
    initiatePaymentUseCase,
    handlePaymentWebhookUseCase,
    reconcilePaymentsUseCase,
    refundPaymentUseCase,
    cancelPaymentUseCase,
    getPaymentUseCase,
    listPaymentsUseCase,
    issueCertificateUseCase,
    getCertificateUseCase,
    listCertificatesUseCase,
    validateCertificateUseCase,
    revokeCertificateUseCase,
    dashboardUseCase,
    createCouponUseCase,
    updateCouponUseCase,
    listCouponsUseCase,
    validateCouponUseCase,
    deactivateCouponUseCase,
    listAuditEntriesUseCase,
    getCheckInBoardUseCase,
    findRegistrationForCheckInUseCase,
  };

  return {
    config,
    db,
    logger,
    repositories: {
      userRepository,
      sessionRepository,
      participantRepository,
      participantConsentRepository,
      participantSessionRepository,
      eventRepository,
      eventLoteRepository,
      eventFormRepository,
      eventProgramRepository,
      couponRepository,
      registrationRepository,
      paymentRepository,
      paymentNotificationRepository,
      certificateRepository,
      auditRepository,
      checkInRepository,
    },
    gateways: { eventCatalog, participantGateway, couponCatalog, registrationGateway, reportQueryGateway, notificationGateway },
    providers: { clock, signatureProvider, passwordHasher, auditRecorder, paymentProvider },
    services: { resolveSessionService, resolveParticipantSessionService, credentialService, paymentStatusSyncService, couponDiscountService },
    middlewares: { authenticate, authenticateParticipant },
    routers,
    useCases,
  } as const;
}

export type { Container as AppContainer };
