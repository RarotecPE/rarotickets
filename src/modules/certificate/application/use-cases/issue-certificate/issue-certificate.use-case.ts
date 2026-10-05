import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { EVENT_CATALOG } from '@core/contracts/event-catalog.contract';
import type { IEventCatalog } from '@core/contracts/event-catalog.contract';
import { NOTIFICATION_GATEWAY } from '@core/contracts/notification.contract';
import type { INotificationGateway } from '@core/contracts/notification.contract';
import { PARTICIPANT_GATEWAY } from '@core/contracts/participant-gateway.contract';
import type { IParticipantGateway } from '@core/contracts/participant-gateway.contract';
import { REGISTRATION_GATEWAY } from '@core/contracts/registration-gateway.contract';
import type { IRegistrationGateway } from '@core/contracts/registration-gateway.contract';
import { Result } from '@core/domain/result';
import { Certificate } from '../../../domain/entities/certificate.entity';
import { CertificateNotEligibleError } from '../../../domain/errors/certificate-not-eligible.error';
import { CERTIFICATE_REPOSITORY } from '../../../domain/repositories/certificate-repository.interface';
import type { ICertificateRepository } from '../../../domain/repositories/certificate-repository.interface';
import { CertificateMapper } from '../../mappers/certificate.mapper';
import type { IssueCertificateInputDto } from './issue-certificate.input.dto';
import type { IssueCertificateOutputDto } from './issue-certificate.output.dto';

export type IssueCertificateDependencies = {
  certificateRepository: ICertificateRepository;
  registrationGateway: IRegistrationGateway;
  eventCatalog: IEventCatalog;
  participantGateway: IParticipantGateway;
  notificationGateway: INotificationGateway;
  auditRecorder: IAuditRecorder;
  clock: IClock;
  mapper: CertificateMapper;
  validationBaseUrl: string;
};

/**
 * Emissão do certificado (§30): exige inscrição confirmada e, quando o evento
 * exige presença, o check-in realizado. A emissão é idempotente por inscrição.
 */
export class IssueCertificateUseCase extends UseCase<IssueCertificateInputDto, IssueCertificateOutputDto> {
  private readonly dependencies: IssueCertificateDependencies;

  constructor(dependencies: IssueCertificateDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: IssueCertificateInputDto): Promise<Result<IssueCertificateOutputDto>> {
    const { certificateRepository, registrationGateway, eventCatalog, participantGateway, notificationGateway, auditRecorder, clock, mapper } =
      this.dependencies;

    const existing = await certificateRepository.findByRegistrationId(input.registrationId);
    if (existing && existing.isIssued()) {
      return Result.ok({ certificate: mapper.map({ certificate: existing }), alreadyIssued: true });
    }

    const registration = await registrationGateway.getSnapshot({ registrationId: input.registrationId });
    if (!registration) return Result.fail(new CertificateNotEligibleError('Inscrição não encontrada'));
    if (registration.status !== 'CONFIRMADA') {
      return Result.fail(new CertificateNotEligibleError('Certificado disponível apenas para inscrições confirmadas'));
    }

    const settings = await eventCatalog.getCertificateSettings({ eventId: registration.eventId });
    if (!settings) return Result.fail(new CertificateNotEligibleError('Evento não encontrado'));
    if (!settings.enabled) return Result.fail(new CertificateNotEligibleError('Este evento não emite certificados'));
    if (settings.requiresAttendance && !registration.hasCheckedIn) {
      return Result.fail(new CertificateNotEligibleError('É necessário realizar o check-in para emitir o certificado'));
    }

    const participant = await participantGateway.findById({ id: registration.participantId });

    const certificateResult = Certificate.issue({
      registrationId: registration.registrationId,
      participantId: registration.participantId,
      eventId: registration.eventId,
      participantName: participant?.name ?? '',
      participantCpf: participant?.cpf ?? null,
      eventTitle: settings.eventTitle,
      workloadHours: settings.workloadHours,
      activitiesSummary: settings.text,
      issuedAt: clock.now(),
      issuedBy: input.actorUserId ?? null,
      validationBaseUrl: this.dependencies.validationBaseUrl,
    });
    if (certificateResult.isFailure) return Result.fail(certificateResult.error);
    const certificate = certificateResult.value;

    if (existing) {
      await certificateRepository.update(certificate);
    } else {
      await certificateRepository.save(certificate);
    }

    await notificationGateway.send({
      template: 'CERTIFICADO_DISPONIVEL',
      registrationId: registration.registrationId,
      eventId: registration.eventId,
      participantId: registration.participantId,
      destination: participant?.email ?? null,
      variables: { codigo: certificate.code.value, evento: settings.eventTitle },
    });

    await auditRecorder.record({
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? 'Sistema',
      action: 'CERTIFICATE_ISSUED',
      entity: 'certificate',
      entityId: certificate.id.toString(),
      description: `Certificado ${certificate.code.value} emitido para ${certificate.participantName}`,
      after: { code: certificate.code.value, eventId: certificate.eventId },
      ip: input.ip ?? null,
    });

    return Result.ok({ certificate: mapper.map({ certificate }), alreadyIssued: false });
  }
}
