import { Mapper } from '@core/application/mapper.base';
import type { Certificate } from '../../domain/entities/certificate.entity';

export type CertificateDto = {
  id: string;
  code: string;
  registrationId: string;
  participantId: string;
  eventId: string;
  participantName: string;
  participantCpf: string | null;
  eventTitle: string;
  workloadHours: number;
  activitiesSummary: string | null;
  status: string;
  issuedAt: Date;
  issuedBy: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  validationUrl: string;
};

export class CertificateMapper extends Mapper<{ certificate: Certificate }, CertificateDto> {
  public map({ certificate }: { certificate: Certificate }): CertificateDto {
    return {
      id: certificate.id.toString(),
      code: certificate.code.value,
      registrationId: certificate.registrationId,
      participantId: certificate.participantId,
      eventId: certificate.eventId,
      participantName: certificate.participantName,
      participantCpf: certificate.participantCpf,
      eventTitle: certificate.eventTitle,
      workloadHours: certificate.workloadHours,
      activitiesSummary: certificate.activitiesSummary,
      status: certificate.status,
      issuedAt: certificate.issuedAt,
      issuedBy: certificate.issuedBy,
      cancelledAt: certificate.cancelledAt,
      cancelReason: certificate.cancelReason,
      validationUrl: certificate.validationUrl,
    };
  }
}
