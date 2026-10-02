import { ConflictError, NotFoundError } from '../../../../../../@core/domain/errors/domain-errors.ts';
import { Result } from '../../../../../../@core/domain/result.ts';
import { CheckIn } from '../../../../domain/entities/check-in.entity.ts';
import { CheckInRepository } from '../../../../domain/repositories/check-in-repository.base.ts';
import type { DomainError } from '../../../../../../@core/domain/domain-error.base.ts';
import type {
  CheckInByRegistrationParams,
  CheckInId,
  CheckInListParams,
  CreateCheckInIfAbsentParams,
} from '../../../../domain/repositories/check-in-repository.interface.ts';

export type InMemoryCheckInRepositoryDependencies = { initialCheckIns?: CheckIn[] };

/** Duplicate protection is synchronous here and must be a unique DB constraint in production. */
export class InMemoryCheckInRepository extends CheckInRepository {
  private readonly checkIns: Map<CheckInId, CheckIn>;

  constructor(dependencies: InMemoryCheckInRepositoryDependencies = {}) {
    super();
    this.checkIns = new Map((dependencies.initialCheckIns ?? []).map((checkIn) => [checkIn.id.toString(), checkIn]));
  }

  public async findById(id: CheckInId): Promise<CheckIn | null> {
    return this.checkIns.get(id) ?? null;
  }

  public async findByRegistration(params: CheckInByRegistrationParams): Promise<CheckIn | null> {
    return [...this.checkIns.values()].find((checkIn) => checkIn.registrationId === params.registrationId) ?? null;
  }

  public async listByEvent(params: CheckInListParams): Promise<CheckIn[]> {
    return [...this.checkIns.values()]
      .filter((checkIn) => checkIn.eventId === params.eventId)
      .sort((left, right) => left.checkedInAt.getTime() - right.checkedInAt.getTime())
      .slice(Math.max(0, params.offset), Math.max(0, params.offset) + Math.max(0, params.limit));
  }

  public async createIfAbsent(params: CreateCheckInIfAbsentParams): Promise<Result<{ checkIn: CheckIn; wasCreated: boolean }, DomainError>> {
    const existing = [...this.checkIns.values()].find((checkIn) => checkIn.registrationId === params.checkIn.registrationId);
    if (existing) return Result.ok({ checkIn: existing, wasCreated: false });
    if (this.checkIns.has(params.checkIn.id.toString())) {
      return Result.fail(new ConflictError({ code: 'CHECKIN_ID_CONFLICT', message: 'O identificador do check-in já está em uso.' }));
    }
    this.checkIns.set(params.checkIn.id.toString(), params.checkIn);
    return Result.ok({ checkIn: params.checkIn, wasCreated: true });
  }

  public async save(checkIn: CheckIn): Promise<Result<void, DomainError>> {
    const id = checkIn.id.toString();
    if (!this.checkIns.has(id)) {
      return Result.fail(new NotFoundError({ code: 'CHECKIN_NOT_FOUND', message: 'Check-in não encontrado.' }));
    }
    const duplicateRegistration = [...this.checkIns.values()].some((candidate) => candidate.id.toString() !== id
      && candidate.registrationId === checkIn.registrationId);
    if (duplicateRegistration) {
      return Result.fail(new ConflictError({ code: 'CHECKIN_REGISTRATION_CONFLICT', message: 'A inscrição já possui um check-in.' }));
    }
    this.checkIns.set(id, checkIn);
    return Result.ok();
  }
}
