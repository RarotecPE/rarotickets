import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { REPORT_QUERY_GATEWAY } from '@core/contracts/report-query.contract';
import type { IReportQueryGateway } from '@core/contracts/report-query.contract';
import { Result } from '@core/domain/result';
import type { ReportFilterInputDto } from '../report-filter.input.dto';
import type { ReportOutputDto } from '../report.output.dto';

export type RegistrationFunnelUseCaseDependencies = {
  reportQueryGateway: IReportQueryGateway;
  clock: IClock;
};

/** Relatório: Funil de inscrições por situação (§41). */
export class RegistrationFunnelUseCase extends UseCase<ReportFilterInputDto, ReportOutputDto> {
  private readonly dependencies: RegistrationFunnelUseCaseDependencies;

  constructor(dependencies: RegistrationFunnelUseCaseDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ReportFilterInputDto): Promise<Result<ReportOutputDto>> {
    const result = await this.dependencies.reportQueryGateway.registrationFunnel({
      eventId: input.eventId ?? null,
      from: input.from ? new Date(input.from) : null,
      to: input.to ? new Date(input.to) : null,
      search: input.search ?? null,
      page: input.page ?? 1,
      perPage: input.perPage ?? 50,
    });

    return Result.ok({
      report: 'registrationFunnel',
      rows: result.rows,
      total: result.total,
      summary: result.summary,
      generatedAt: this.dependencies.clock.now(),
    });
  }
}
