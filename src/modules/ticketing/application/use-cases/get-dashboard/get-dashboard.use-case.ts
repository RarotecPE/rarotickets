import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { DashboardMetrics, ReportingRepository } from "@/modules/ticketing/domain/repositories/reporting-repository.interface";

export type GetDashboardInputDto = { userId: string; canViewAll: boolean };
export type GetDashboardOutputDto = DashboardMetrics;
export type GetDashboardDependencies = { reportingRepository: ReportingRepository };

export class GetDashboardUseCase extends UseCase<GetDashboardInputDto, GetDashboardOutputDto> {
  private readonly reportingRepository: ReportingRepository;
  constructor(dependencies: GetDashboardDependencies) {
    super();
    this.reportingRepository = dependencies.reportingRepository;
  }
  async execute(input: GetDashboardInputDto): Promise<Result<GetDashboardOutputDto>> {
    return Result.ok(await this.reportingRepository.dashboard(input));
  }
}
