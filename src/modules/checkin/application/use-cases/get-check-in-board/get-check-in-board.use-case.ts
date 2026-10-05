import { buildPaginationMeta, normalizePagination } from '@core/application/pagination/pagination';
import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import type { ICheckInRepository } from '../../../domain/repositories/check-in-repository.interface';
import { CheckInRecordMapper } from '../../mappers/checkin.mapper';
import type { GetCheckInBoardInputDto } from './get-check-in-board.input.dto';
import type { CheckInBoardOutputDto } from './get-check-in-board.output.dto';

export type GetCheckInBoardDependencies = {
  checkInRepository: ICheckInRepository;
  mapper: CheckInRecordMapper;
};

/** Painel do credenciamento: presenças do evento e taxa de comparecimento (§29, §41). */
export class GetCheckInBoardUseCase extends UseCase<GetCheckInBoardInputDto, CheckInBoardOutputDto> {
  private readonly dependencies: GetCheckInBoardDependencies;

  constructor(dependencies: GetCheckInBoardDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: GetCheckInBoardInputDto): Promise<Result<CheckInBoardOutputDto>> {
    if (!input.eventId) return Result.fail(new Error('Evento é obrigatório para consultar o credenciamento'));

    const pagination = normalizePagination({ page: input.page, perPage: input.perPage ?? 50 });
    const [{ records, total }, stats] = await Promise.all([
      this.dependencies.checkInRepository.listByEvent({
        eventId: input.eventId,
        search: input.search ?? null,
        onlyOverrides: input.onlyOverrides ?? false,
        page: pagination.page,
        perPage: pagination.perPage,
      }),
      this.dependencies.checkInRepository.statsByEvent(input.eventId),
    ]);

    return Result.ok({
      records: records.map((record) => this.dependencies.mapper.map({ record })),
      stats: {
        expected: stats.expected,
        checkedIn: stats.checkedIn,
        absent: stats.absent,
        cancelled: stats.cancelled,
        waitlisted: stats.waitlisted,
        attendanceRate: stats.attendanceRate,
        attendanceRateLabel: stats.attendanceRateLabel,
      },
      meta: buildPaginationMeta({ ...pagination, total }),
    });
  }
}
