import { PersistenceMapper } from '@core/application/persistence-mapper.base';
import type { ToDomainParams, ToPersistenceParams } from '@core/application/persistence-mapper.base';
import { Identifier } from '@core/domain/identifier';
import { Certificate } from '../../../../domain/entities/certificate.entity';
import { CertificateCode } from '../../../../domain/value-objects/certificate-code.vo';
import type { CertificateModel } from '../models/certificate.model';

export type CertificateData = Omit<CertificateModel, 'created_at'> & { created_at: Date };

export class CertificatePersistenceMapper extends PersistenceMapper<Certificate, CertificateModel, CertificateData> {
  public toDomain({ record }: ToDomainParams<CertificateModel>): Certificate {
    return Certificate.reconstitute({
      props: {
        code: CertificateCode.reconstitute(record.code),
        registrationId: record.registration_id,
        participantId: record.participant_id,
        eventId: record.event_id,
        participantName: record.participant_name ?? '',
        participantCpf: record.participant_cpf,
        eventTitle: record.event_title ?? '',
        workloadHours: Number(record.workload_hours),
        activitiesSummary: record.activities_summary,
        status: { value: record.revoked_at ? 'CANCELADO' : 'EMITIDO' },
        issuedAt: new Date(record.issued_at),
        issuedBy: record.issued_by,
        cancelledAt: record.revoked_at ? new Date(record.revoked_at) : null,
        cancelReason: record.revoke_reason,
        validationUrl: record.validation_url ?? '',
      },
      id: Identifier.fromExisting(record.id),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.revoked_at ?? record.issued_at),
    });
  }

  public toPersistence({ entity }: ToPersistenceParams<Certificate>): CertificateData {
    return {
      id: entity.id.toString(),
      registration_id: entity.registrationId,
      event_id: entity.eventId,
      participant_id: entity.participantId,
      code: entity.code.value,
      validation_hash: '',
      workload_hours: entity.workloadHours.toFixed(1),
      participant_name: entity.participantName,
      participant_cpf: entity.participantCpf,
      event_title: entity.eventTitle,
      activities_summary: entity.activitiesSummary,
      validation_url: entity.validationUrl,
      issued_at: entity.issuedAt,
      issued_by: entity.issuedBy,
      revoked_at: entity.cancelledAt,
      revoke_reason: entity.cancelReason,
      created_at: entity.createdAt,
    };
  }
}
