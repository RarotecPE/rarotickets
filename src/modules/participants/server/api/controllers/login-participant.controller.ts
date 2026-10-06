import { Controller } from '../../../../../server/api/controller.base';
import { mapDomainErrorToHttpResponse } from '../../../../../server/api/domain-http-response.mapper';
import { HttpResponse } from '../../../../../server/api/http-response';
import { LoginParticipantUseCase } from '../../../application/use-cases/login-participant/login-participant.use-case';
import type { LoginParticipantInputDto } from '../../../application/use-cases/login-participant/login-participant.input.dto';

export type LoginParticipantControllerDependencies = { useCase: LoginParticipantUseCase };

export class LoginParticipantController extends Controller<LoginParticipantInputDto, HttpResponse> {
  private readonly useCase: LoginParticipantUseCase;

  constructor(dependencies: LoginParticipantControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(request: LoginParticipantInputDto): Promise<HttpResponse> {
    const result = await this.useCase.execute(request);
    if (result.isFailure) return mapDomainErrorToHttpResponse({ error: result.error });
    return HttpResponse.success({ data: result.value });
  }
}
