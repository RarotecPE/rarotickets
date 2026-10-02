import { Entity } from '../../../../@core/domain/entity.base.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';

export type AuditOperation =
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'EVENT_PUBLISHED'
  | 'EVENT_CANCELLED'
  | 'REGISTRATION_CREATED'
  | 'REGISTRATION_CANCELLED'
  | 'REGISTRATION_MANUALLY_CONFIRMED'
  | 'REGISTRATION_PROMOTED'
  | 'COURTESY_GRANTED'
  | 'PAYMENT_CANCELLED'
  | 'PAYMENT_REFUNDED'
  | 'CHECKIN_RECORDED'
  | 'CHECKIN_CORRECTED'
  | 'PRESENCE_CHANGED'
  | 'CERTIFICATE_ISSUED'
  | 'PERMISSIONS_CHANGED'
  | 'PARTICIPANT_ANONYMIZED';
export type AuditEntryProps = {
  actorId: string;
  operation: AuditOperation;
  aggregateType: string;
  aggregateId: string;
  occurredAt: Date;
  beforeStateJson: string | null;
  afterStateJson: string | null;
  reason: string | null;
};
export type CreateAuditEntryParams = AuditEntryProps & { id?: string };
export type AuditEntrySnapshot = AuditEntryProps & { id: string; createdAt: Date; updatedAt: Date };

export class AuditEntry extends Entity<AuditEntryProps> {
  private constructor(params: EntityConstructorParams<AuditEntryProps>) {
    super(params);
  }

  public static create(params: CreateAuditEntryParams): Result<AuditEntry, ValidationError> {
    if (!params.actorId.trim() || !params.operation || !params.aggregateType.trim() || !params.aggregateId.trim()) {
      return Result.fail(new ValidationError({ code: 'AUDIT_ENTRY_REQUIRED_FIELDS', message: 'A auditoria deve identificar responsável, operação e registro afetado.' }));
    }
    const entryParams: EntityConstructorParams<AuditEntryProps> = {
      props: {
        actorId: params.actorId,
        operation: params.operation,
        aggregateType: params.aggregateType,
        aggregateId: params.aggregateId,
        occurredAt: new Date(params.occurredAt.getTime()),
        beforeStateJson: params.beforeStateJson,
        afterStateJson: params.afterStateJson,
        reason: params.reason?.trim() || null,
      },
      createdAt: params.occurredAt,
      updatedAt: params.occurredAt,
    };
    if (params.id) entryParams.id = Identifier.fromExisting(params.id);
    return Result.ok(new AuditEntry(entryParams));
  }

  public get actorId(): string { return this.props.actorId; }
  public get operation(): AuditOperation { return this.props.operation; }
  public get aggregateType(): string { return this.props.aggregateType; }
  public get aggregateId(): string { return this.props.aggregateId; }
  public get occurredAt(): Date { return new Date(this.props.occurredAt.getTime()); }
  public get beforeStateJson(): string | null { return this.props.beforeStateJson; }
  public get afterStateJson(): string | null { return this.props.afterStateJson; }
  public get reason(): string | null { return this.props.reason; }

  public snapshot(): AuditEntrySnapshot {
    return {
      ...this.props,
      occurredAt: this.occurredAt,
      id: this.id.toString(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
