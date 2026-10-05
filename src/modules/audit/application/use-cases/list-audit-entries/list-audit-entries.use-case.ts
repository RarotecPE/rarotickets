import { buildPaginationMeta, normalizePagination } from '@core/application/pagination/pagination';
import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import { AUDIT_REPOSITORY } from '../../../domain/repositories/audit-repository.interface';
import type { IAuditRepository } from '../../../domain/repositories/audit-repository.interface';
import type { ListAuditEntriesInputDto } from './list-audit-entries.input.dto';
import type { ListAuditEntriesOutputDto } from './list-audit-entries.output.dto';

export type ListAuditEntriesDependencies = { auditRepository: IAuditRepository };

/** Consulta da trilha de auditoria (§36). */
export class ListAuditEntriesUseCase extends UseCase<ListAuditEntriesInputDto, ListAuditEntriesOutputDto> {
  private readonly dependencies: ListAuditEntriesDependencies;

  constructor(dependencies: ListAuditEntriesDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ListAuditEntriesInputDto): Promise<Result<ListAuditEntriesOutputDto>> {
    const pagination = normalizePagination({ page: input.page, perPage: input.perPage });
    const { auditRepository } = this.dependencies;

    const [{ entries, total }, entities] = await Promise.all([
      auditRepository.list({
        actorUserId: input.actorUserId ?? null,
        entity: input.entity ?? null,
        action: input.action ?? null,
        search: input.search ?? null,
        from: input.from ? new Date(input.from) : null,
        to: input.to ? new Date(input.to) : null,
        page: pagination.page,
        perPage: pagination.perPage,
      }),
      auditRepository.listEntities(),
    ]);

    return Result.ok({ entries, entities, meta: buildPaginationMeta({ ...pagination, total }) });
  }
}
