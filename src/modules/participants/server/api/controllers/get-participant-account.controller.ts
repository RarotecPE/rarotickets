import { Controller } from '../../../../../server/api/controller.base';
import { mapDomainErrorToHttpResponse } from '../../../../../server/api/domain-http-response.mapper';
import { HttpResponse } from '../../../../../server/api/http-response';
import { GetParticipantAccountUseCase } from '../../../application/use-cases/get-participant-account/get-participant-account.use-case';
import type { GetParticipantAccountInputDto } from '../../../application/use-cases/get-participant-account/get-participant-account.input.dto';

export type GetParticipantAccountControllerDependencies = { useCase: GetParticipantAccountUseCase };

export class GetParticipantAccountController extends Controller<GetParticipantAccountInputDto, HttpResponse> {
  private readonly useCase: GetParticipantAccountUseCase;

  constructor(dependencies: GetParticipantAccountControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(request: GetParticipantAccountInputDto): Promise<HttpResponse> {
    const result = await this.useCase.execute(request);
    if (result.isFailure) return mapDomainErrorToHttpResponse({ error: result.error });
    return HttpResponse.success({ data: result.value });
  }
}
