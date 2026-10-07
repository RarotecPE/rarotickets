import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { AuditListResult, AuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";

export type ListAuditLogInputDto = { query?: string; page: number; pageSize: number };
export type ListAuditLogOutputDto = AuditListResult;
export type ListAuditLogDependencies = { auditRepository: AuditRepository };

export class ListAuditLogUseCase extends UseCase<ListAuditLogInputDto, ListAuditLogOutputDto> {
  private readonly auditRepository: AuditRepository;
  constructor(dependencies: ListAuditLogDependencies) {
    super();
    this.auditRepository = dependencies.auditRepository;
  }
  async execute(input: ListAuditLogInputDto): Promise<Result<ListAuditLogOutputDto>> {
    return Result.ok(await this.auditRepository.list(input));
  }
}
