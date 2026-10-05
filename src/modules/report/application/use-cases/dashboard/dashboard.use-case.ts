import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { REPORT_QUERY_GATEWAY } from '@core/contracts/report-query.contract';
import type { IReportQueryGateway } from '@core/contracts/report-query.contract';
import { Result } from '@core/domain/result';
import type { ReportFilterInputDto } from '../report-filter.input.dto';
import type { DashboardOutputDto } from '../report.output.dto';

export type DashboardUseCaseDependencies = { reportQueryGateway: IReportQueryGateway; clock: IClock };

/** Indicadores do painel (§42). */
export class DashboardUseCase extends UseCase<ReportFilterInputDto, DashboardOutputDto> {
  private readonly dependencies: DashboardUseCaseDependencies;

  constructor(dependencies: DashboardUseCaseDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ReportFilterInputDto): Promise<Result<DashboardOutputDto>> {
    const result = await this.dependencies.reportQueryGateway.dashboard({
      eventId: input.eventId ?? null,
      from: input.from ? new Date(input.from) : null,
      to: input.to ? new Date(input.to) : null,
      search: null,
      page: 1,
      perPage: 1,
    });

    return Result.ok({ indicators: result.indicators, updatedAt: this.dependencies.clock.now() });
  }
}
