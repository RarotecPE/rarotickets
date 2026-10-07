import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { ReportParams, ReportingRepository, RevenueReport } from "@/modules/ticketing/domain/repositories/reporting-repository.interface";

export type GetReportInputDto = ReportParams;
export type GetReportOutputDto = RevenueReport;
export type GetReportDependencies = { reportingRepository: ReportingRepository };

export class GetReportUseCase extends UseCase<GetReportInputDto, GetReportOutputDto> {
  private readonly reportingRepository: ReportingRepository;
  constructor(dependencies: GetReportDependencies) {
    super();
    this.reportingRepository = dependencies.reportingRepository;
  }
  async execute(input: GetReportInputDto): Promise<Result<GetReportOutputDto>> {
    return Result.ok(await this.reportingRepository.report(input));
  }
}
