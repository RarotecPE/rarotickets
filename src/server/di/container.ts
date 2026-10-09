import "server-only";
import { CheckInDomainService } from "@/modules/ticketing/domain/services/check-in.domain-service";
import { RegistrationFormDomainService } from "@/modules/ticketing/domain/registrations/services/registration-form.domain-service";
import { ParticipantFileDomainService } from "@/modules/ticketing/domain/registrations/services/participant-file.domain-service";
import { BannerImageDomainService } from "@/modules/ticketing/domain/events/services/banner-image.domain-service";
import { EventConfigurationDomainService } from "@/modules/ticketing/domain/events/services/event-configuration.domain-service";
import { CancelRegistrationUseCase } from "@/modules/ticketing/application/use-cases/cancel-registration/cancel-registration.use-case";
import { CheckInUseCase } from "@/modules/ticketing/application/use-cases/check-in/check-in.use-case";
import { CreateEventUseCase } from "@/modules/ticketing/application/use-cases/create-event/create-event.use-case";
import { UploadEventBannerUseCase } from "@/modules/ticketing/application/use-cases/upload-event-banner/upload-event-banner.use-case";
import { CreatePublicRegistrationUseCase } from "@/modules/ticketing/application/use-cases/create-public-registration/create-public-registration.use-case";
import { GetPrivateRegistrationFileUseCase } from "@/modules/ticketing/application/use-cases/get-private-registration-file/get-private-registration-file.use-case";
import { GetPublicFileUseCase } from "@/modules/ticketing/application/use-cases/get-public-file/get-public-file.use-case";
import { GetDashboardUseCase } from "@/modules/ticketing/application/use-cases/get-dashboard/get-dashboard.use-case";
import { GetReportUseCase } from "@/modules/ticketing/application/use-cases/get-report/get-report.use-case";
import { ValidateCertificateUseCase } from "@/modules/ticketing/application/use-cases/validate-certificate/validate-certificate.use-case";
import { ListAuditLogUseCase } from "@/modules/ticketing/application/use-cases/list-audit-log/list-audit-log.use-case";
import { GetManagedEventUseCase } from "@/modules/ticketing/application/use-cases/get-managed-event/get-managed-event.use-case";
import { GetParticipantPortalUseCase } from "@/modules/ticketing/application/use-cases/get-participant-portal/get-participant-portal.use-case";
import { StartParticipantCheckoutUseCase } from "@/modules/ticketing/application/use-cases/start-participant-checkout/start-participant-checkout.use-case";
import { GetPublicEventUseCase } from "@/modules/ticketing/application/use-cases/get-public-event/get-public-event.use-case";
import { IssueCertificatesUseCase } from "@/modules/ticketing/application/use-cases/issue-certificates/issue-certificates.use-case";
import { ListManagedEventsUseCase } from "@/modules/ticketing/application/use-cases/list-managed-events/list-managed-events.use-case";
import { ListPublicEventsUseCase } from "@/modules/ticketing/application/use-cases/list-public-events/list-public-events.use-case";
import { ListRegistrationsUseCase } from "@/modules/ticketing/application/use-cases/list-registrations/list-registrations.use-case";
import { ProcessOutboxUseCase } from "@/modules/ticketing/application/use-cases/process-outbox/process-outbox.use-case";
import { PromoteWaitlistUseCase } from "@/modules/ticketing/application/use-cases/promote-waitlist/promote-waitlist.use-case";
import { RunMaintenanceUseCase } from "@/modules/ticketing/application/use-cases/run-maintenance/run-maintenance.use-case";
import { ProcessPaymentWebhookUseCase } from "@/modules/ticketing/application/use-cases/process-payment-webhook/process-payment-webhook.use-case";
import { TransitionEventUseCase } from "@/modules/ticketing/application/use-cases/transition-event/transition-event.use-case";
import { UpdateEventUseCase } from "@/modules/ticketing/application/use-cases/update-event/update-event.use-case";
import { DrizzleAuditRepository } from "@/modules/ticketing/server/infrastructure/persistence/repositories/drizzle-audit.repository.impl";
import { DrizzleCertificateRepository } from "@/modules/ticketing/server/infrastructure/persistence/repositories/drizzle-certificate.repository.impl";
import { DrizzleCheckInRepository } from "@/modules/ticketing/server/infrastructure/persistence/repositories/drizzle-checkin.repository.impl";
import { DrizzleEventRepository } from "@/modules/ticketing/server/infrastructure/persistence/repositories/drizzle-event.repository.impl";
import { DrizzleOutboxRepository } from "@/modules/ticketing/server/infrastructure/persistence/repositories/drizzle-outbox.repository.impl";
import { DrizzleRegistrationRepository } from "@/modules/ticketing/server/infrastructure/persistence/repositories/drizzle-registration.repository.impl";
import { DrizzleReportingRepository } from "@/modules/ticketing/server/infrastructure/persistence/repositories/drizzle-reporting.repository.impl";
import { SecureCredentialProvider } from "@/server/infrastructure/providers/secure-credential.provider";
import { UuidIdGenerator } from "@/server/infrastructure/providers/id-generator.provider";
import { getPaymentGateway } from "@/server/infrastructure/providers/payment-gateway.factory";
import { getEmailNotificationProvider } from "@/server/infrastructure/providers/email-notification-provider.factory";
import { MetaWhatsAppNotificationProvider } from "@/server/infrastructure/providers/meta-whatsapp.notification.provider";
import { RequestParticipantRegistrationUseCase } from "@/modules/ticketing/application/use-cases/request-participant-registration/request-participant-registration.use-case";
import { GetActivationTokenInfoUseCase } from "@/modules/ticketing/application/use-cases/get-activation-token-info/get-activation-token-info.use-case";
import { CompleteParticipantRegistrationUseCase } from "@/modules/ticketing/application/use-cases/complete-participant-registration/complete-participant-registration.use-case";
import { ParticipantLoginWithPasswordUseCase } from "@/modules/ticketing/application/use-cases/participant-login-with-password/participant-login-with-password.use-case";
import { RequestParticipantOtpUseCase } from "@/modules/ticketing/application/use-cases/request-participant-otp/request-participant-otp.use-case";
import { VerifyParticipantOtpUseCase } from "@/modules/ticketing/application/use-cases/verify-participant-otp/verify-participant-otp.use-case";
import { GetParticipantEventsUseCase } from "@/modules/ticketing/application/use-cases/get-participant-events/get-participant-events.use-case";
import { DrizzleParticipantAuthRepository } from "@/server/infrastructure/persistence/repositories/drizzle-participant-auth.repository.impl";
import { ParticipantEmailProvider } from "@/server/infrastructure/providers/participant-email.provider";
import { getFileStorageProvider } from "@/server/infrastructure/providers/file-storage-provider.factory";
import { getDatabase } from "@/server/infrastructure/persistence/database";
import { readEnvironment } from "@/server/config/environment.config";
import type { IPaymentGateway } from "@/modules/ticketing/domain/services/payment-gateway.interface";

export type TicketingContainer = {
  listPublicEvents: ListPublicEventsUseCase;
  getPublicEvent: GetPublicEventUseCase;
  listManagedEvents: ListManagedEventsUseCase;
  getManagedEvent: GetManagedEventUseCase;
  createEvent: CreateEventUseCase;
  uploadEventBanner: UploadEventBannerUseCase;
  updateEvent: UpdateEventUseCase;
  transitionEvent: TransitionEventUseCase;
  createPublicRegistration: CreatePublicRegistrationUseCase;
  getPrivateRegistrationFile: GetPrivateRegistrationFileUseCase;
  getPublicFile: GetPublicFileUseCase;
  getParticipantPortal: GetParticipantPortalUseCase;
  startParticipantCheckout: StartParticipantCheckoutUseCase;
  listRegistrations: ListRegistrationsUseCase;
  cancelRegistration: CancelRegistrationUseCase;
  processPaymentWebhook: ProcessPaymentWebhookUseCase;
  checkIn: CheckInUseCase;
  getDashboard: GetDashboardUseCase;
  getReport: GetReportUseCase;
  listAuditLog: ListAuditLogUseCase;
  validateCertificate: ValidateCertificateUseCase;
  issueCertificates: IssueCertificatesUseCase;
  processOutbox: ProcessOutboxUseCase;
  promoteWaitlist: PromoteWaitlistUseCase;
  runMaintenance: RunMaintenanceUseCase;
  paymentGateway: IPaymentGateway;
  requestParticipantRegistration: RequestParticipantRegistrationUseCase;
  getActivationTokenInfo: GetActivationTokenInfoUseCase;
  completeParticipantRegistration: CompleteParticipantRegistrationUseCase;
  participantLoginWithPassword: ParticipantLoginWithPasswordUseCase;
  requestParticipantOtp: RequestParticipantOtpUseCase;
  verifyParticipantOtp: VerifyParticipantOtpUseCase;
  getParticipantEvents: GetParticipantEventsUseCase;
  participantAuthRepository: DrizzleParticipantAuthRepository;
  eventRepository: DrizzleEventRepository;
  registrationRepository: DrizzleRegistrationRepository;
  auditRepository: DrizzleAuditRepository;
  certificateRepository: DrizzleCertificateRepository;
};

export function createTicketingContainer(): TicketingContainer {
  const database = getDatabase();
  const eventRepository = new DrizzleEventRepository({ database });
  const registrationRepository = new DrizzleRegistrationRepository({
    database,
  });
  const auditRepository = new DrizzleAuditRepository({ database });
  const reportingRepository = new DrizzleReportingRepository({ database });
  const checkInRepository = new DrizzleCheckInRepository({ database });
  const credentialProvider = new SecureCredentialProvider();
  const outboxRepository = new DrizzleOutboxRepository({ database });
  const certificateRepository = new DrizzleCertificateRepository({
    database,
    credentialProvider,
  });
  const idGenerator = new UuidIdGenerator();
  const environment = readEnvironment();
  const paymentGateway = getPaymentGateway();
  const fileStorageProvider = getFileStorageProvider();
  const emailProvider = getEmailNotificationProvider();
  const whatsappProvider = new MetaWhatsAppNotificationProvider();
  const processOutbox = new ProcessOutboxUseCase({
    outboxRepository,
    emailProvider,
    whatsappProvider,
  });
  const promoteWaitlist = new PromoteWaitlistUseCase({
    registrationRepository,
    credentialProvider,
    outboxRepository,
    auditRepository,
    paymentProvider: environment.paymentGateway,
    publicBaseUrl: environment.appBaseUrl,
  });
  const runMaintenance = new RunMaintenanceUseCase({
    registrationRepository,
    promoteWaitlist,
    processOutbox,
  });
  const participantAuthRepository = new DrizzleParticipantAuthRepository({
    database,
  });
  const participantEmailSender = new ParticipantEmailProvider();
  const requestParticipantRegistration = new RequestParticipantRegistrationUseCase({
    participantAuthRepository,
    emailSender: participantEmailSender,
    publicBaseUrl: environment.appBaseUrl,
  });
  const getActivationTokenInfo = new GetActivationTokenInfoUseCase({
    participantAuthRepository,
  });
  const completeParticipantRegistration = new CompleteParticipantRegistrationUseCase({
    participantAuthRepository,
  });
  const participantLoginWithPassword = new ParticipantLoginWithPasswordUseCase({
    participantAuthRepository,
  });
  const requestParticipantOtp = new RequestParticipantOtpUseCase({
    participantAuthRepository,
    emailSender: participantEmailSender,
  });
  const verifyParticipantOtp = new VerifyParticipantOtpUseCase({
    participantAuthRepository,
  });
  const getParticipantEvents = new GetParticipantEventsUseCase({
    participantAuthRepository,
  });
  return {
    listPublicEvents: new ListPublicEventsUseCase({ eventRepository }),
    getPublicEvent: new GetPublicEventUseCase({ eventRepository }),
    listManagedEvents: new ListManagedEventsUseCase({ eventRepository }),
    getManagedEvent: new GetManagedEventUseCase({ eventRepository }),
    createEvent: new CreateEventUseCase({
      eventRepository,
      auditRepository,
      idGenerator,
      configurationValidator: new EventConfigurationDomainService(),
    }),
    uploadEventBanner: new UploadEventBannerUseCase({
      fileStorageProvider,
      idGenerator,
      bannerValidator: new BannerImageDomainService(),
    }),
    updateEvent: new UpdateEventUseCase({ eventRepository, auditRepository }),
    transitionEvent: new TransitionEventUseCase({
      eventRepository,
      auditRepository,
    }),
    createPublicRegistration: new CreatePublicRegistrationUseCase({
      eventRepository,
      registrationRepository,
      credentialProvider,
      idGenerator,
      outboxRepository,
      auditRepository,
      formValidator: new RegistrationFormDomainService(),
      participantFileValidator: new ParticipantFileDomainService(),
      fileStorageProvider,
      paymentGateway,
      publicBaseUrl: environment.appBaseUrl,
    }),
    getPrivateRegistrationFile: new GetPrivateRegistrationFileUseCase({
      registrationRepository,
      fileStorageProvider,
    }),
    getPublicFile: new GetPublicFileUseCase({ fileStorageProvider }),
    getParticipantPortal: new GetParticipantPortalUseCase({
      registrationRepository,
      credentialProvider,
    }),
    startParticipantCheckout: new StartParticipantCheckoutUseCase({
      registrationRepository,
      credentialProvider,
      paymentGateway,
      publicBaseUrl: environment.appBaseUrl,
    }),
    listRegistrations: new ListRegistrationsUseCase({ registrationRepository }),
    cancelRegistration: new CancelRegistrationUseCase({
      registrationRepository,
      auditRepository,
      promoteWaitlist,
    }),
    processPaymentWebhook: new ProcessPaymentWebhookUseCase({
      registrationRepository,
      credentialProvider,
      outboxRepository,
      auditRepository,
      publicBaseUrl: environment.appBaseUrl,
    }),
    checkIn: new CheckInUseCase({
      checkInRepository,
      credentialProvider,
      auditRepository,
      checkInDomainService: new CheckInDomainService(),
    }),
    getDashboard: new GetDashboardUseCase({ reportingRepository }),
    getReport: new GetReportUseCase({ reportingRepository }),
    listAuditLog: new ListAuditLogUseCase({ auditRepository }),
    validateCertificate: new ValidateCertificateUseCase({
      certificateRepository,
    }),
    issueCertificates: new IssueCertificatesUseCase({
      certificateRepository,
      auditRepository,
    }),
    processOutbox,
    promoteWaitlist,
    runMaintenance,
    paymentGateway,
    requestParticipantRegistration,
    getActivationTokenInfo,
    completeParticipantRegistration,
    participantLoginWithPassword,
    requestParticipantOtp,
    verifyParticipantOtp,
    getParticipantEvents,
    participantAuthRepository,
    eventRepository,
    registrationRepository,
    auditRepository,
    certificateRepository,
  };
}
