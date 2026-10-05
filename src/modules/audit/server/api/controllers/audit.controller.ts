import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext } from '@server/api/http-request.types';
import type { ListAuditEntriesInputDto } from '../../../application/use-cases/list-audit-entries/list-audit-entries.input.dto';
import type { ListAuditEntriesOutputDto } from '../../../application/use-cases/list-audit-entries/list-audit-entries.output.dto';
import type { AuditActionRequest } from '../dtos/audit.request.types';

export type AuditControllerDependencies = {
  listAuditEntriesUseCase: IUseCase<ListAuditEntriesInputDto, ListAuditEntriesOutputDto>;
};

/** Consulta da trilha de auditoria — quem, quando, o quê e valores (antes/depois). */
export class AuditController extends Controller<HttpRequestContext<AuditActionRequest>, HttpResponse> {
  private readonly dependencies: AuditControllerDependencies;

  constructor(dependencies: AuditControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<AuditActionRequest>): Promise<HttpResponse> {
    if (request.body.action !== 'list') {
      return HttpResponse.badRequest('Ação não suportada');
    }

    const query = request.body.query;
    const result = await this.dependencies.listAuditEntriesUseCase.execute({
      actorUserId: query.actorUserId ?? null,
      entity: query.entity ?? null,
      action: query.action ?? null,
      search: query.search ?? null,
      from: query.from ?? null,
      to: query.to ?? null,
      page: query.page ? Number(query.page) : 1,
      perPage: query.perPage ? Number(query.perPage) : 20,
    });

    if (result.isFailure) return HttpResponse.serverError(result.error.message);
    return HttpResponse.ok(result.value.entries, {
      ...result.value.meta,
      entities: result.value.entities,
    });
  }
}
