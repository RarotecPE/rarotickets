import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext } from '@server/api/http-request.types';
import type { DashboardOutputDto, ReportOutputDto } from '../../../application/use-cases/report.output.dto';
import type { ReportFilterInputDto } from '../../../application/use-cases/report-filter.input.dto';
import type { ReportActionRequest } from '../dtos/report.request.types';

export type ReportControllerDependencies = {
  dashboardUseCase: IUseCase<ReportFilterInputDto, DashboardOutputDto>;
  /** Um caso de uso por relatório — a chave vem da rota (§41). */
  reports: Record<string, IUseCase<ReportFilterInputDto, ReportOutputDto>>;
};

export class ReportController extends Controller<HttpRequestContext<ReportActionRequest>, HttpResponse> {
  private readonly dependencies: ReportControllerDependencies;

  constructor(dependencies: ReportControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<ReportActionRequest>): Promise<HttpResponse> {
    if (request.body.action === 'dashboard') {
      const query = request.body.query;
      const result = await this.dependencies.dashboardUseCase.execute({
        eventId: query.eventId ?? null,
        from: query.from ?? null,
        to: query.to ?? null,
        search: query.search ?? null,
      });
      if (result.isFailure) return HttpResponse.serverError(result.error.message);
      return HttpResponse.ok(result.value);
    }

    const reportKey = request.body.reportKey;
    const useCase = this.dependencies.reports[reportKey];
    if (!useCase) {
      return HttpResponse.notFound(
        `Relatório desconhecido. Disponíveis: ${Object.keys(this.dependencies.reports).join(', ')}`,
        'REPORT_NOT_FOUND',
      );
    }

    const query = request.body.query;
    const result = await useCase.execute({
      eventId: query.eventId ?? null,
      from: query.from ?? null,
      to: query.to ?? null,
      search: query.search ?? null,
      page: query.page ? Number(query.page) : 1,
      perPage: query.perPage ? Number(query.perPage) : 50,
    });
    if (result.isFailure) return HttpResponse.serverError(result.error.message);
    return HttpResponse.ok(result.value);
  }
}
