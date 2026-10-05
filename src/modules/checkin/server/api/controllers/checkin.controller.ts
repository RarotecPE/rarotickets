import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext } from '@server/api/http-request.types';
import type { FindRegistrationForCheckInInputDto } from '../../../application/use-cases/find-registration-for-check-in/find-registration-for-check-in.input.dto';
import type { FindRegistrationForCheckInOutputDto } from '../../../application/use-cases/find-registration-for-check-in/find-registration-for-check-in.output.dto';
import type { GetCheckInBoardInputDto } from '../../../application/use-cases/get-check-in-board/get-check-in-board.input.dto';
import type { CheckInBoardOutputDto } from '../../../application/use-cases/get-check-in-board/get-check-in-board.output.dto';
import type { CheckInActionRequest } from '../dtos/checkin.request.types';

export type CheckInControllerDependencies = {
  getCheckInBoardUseCase: IUseCase<GetCheckInBoardInputDto, CheckInBoardOutputDto>;
  findRegistrationForCheckInUseCase: IUseCase<
    FindRegistrationForCheckInInputDto,
    FindRegistrationForCheckInOutputDto
  >;
};

/** Consulta do credenciamento: presenças do evento e conferência da credencial (§29). */
export class CheckInController extends Controller<HttpRequestContext<CheckInActionRequest>, HttpResponse> {
  private readonly dependencies: CheckInControllerDependencies;

  constructor(dependencies: CheckInControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<CheckInActionRequest>): Promise<HttpResponse> {
    switch (request.body.action) {
      case 'board': {
        const query = request.body.query;
        const result = await this.dependencies.getCheckInBoardUseCase.execute({
          eventId: query.eventId ?? '',
          search: query.search ?? null,
          onlyOverrides: query.onlyOverrides === 'true',
          page: query.page ? Number(query.page) : 1,
          perPage: query.perPage ? Number(query.perPage) : 50,
        });
        if (result.isFailure) return HttpResponse.badRequest(result.error.message);
        return HttpResponse.ok(result.value.records, {
          ...result.value.meta,
          stats: result.value.stats,
        });
      }
      case 'lookup': {
        const result = await this.dependencies.findRegistrationForCheckInUseCase.execute({
          code: request.body.query.code ?? '',
          eventId: request.body.query.eventId ?? null,
        });
        if (result.isFailure) return HttpResponse.notFound(result.error.message, 'REGISTRATION_NOT_FOUND');
        return HttpResponse.ok(result.value.registration);
      }
      default:
        return HttpResponse.badRequest('Ação não suportada');
    }
  }
}
