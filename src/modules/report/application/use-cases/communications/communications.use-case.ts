import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { REPORT_QUERY_GATEWAY } from '@core/contracts/report-query.contract';
import type { IReportQueryGateway } from '@core/contracts/report-query.contract';
import { Result } from '@core/domain/result';
import type { ReportFilterInputDto } from '../report-filter.input.dto';
import type { ReportOutputDto } from '../report.output.dto';

export type CommunicationsUseCaseDependencies = {
  reportQueryGateway: IReportQueryGateway;
  clock: IClock;
};

/** Relatório: Comunicações enviadas (§41). */
export class CommunicationsUseCase extends UseCase<ReportFilterInputDto, ReportOutputDto> {
  private readonly dependencies: CommunicationsUseCaseDependencies;

  constructor(dependencies: CommunicationsUseCaseDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ReportFilterInputDto): Promise<Result<ReportOutputDto>> {
    const result = await this.dependencies.reportQueryGateway.communications({
      eventId: input.eventId ?? null,
      from: input.from ? new Date(input.from) : null,
      to: input.to ? new Date(input.to) : null,
      search: input.search ?? null,
      page: input.page ?? 1,
      perPage: input.perPage ?? 50,
    });

    return Result.ok({
      report: 'communications',
      rows: result.rows,
      total: result.total,
      summary: result.summary,
      generatedAt: this.dependencies.clock.now(),
    });
  }
}
