import { Controller } from '../../../../../server/api/controller.base';
import { mapDomainErrorToHttpResponse } from '../../../../../server/api/domain-http-response.mapper';
import { HttpResponse } from '../../../../../server/api/http-response';
import { RevokeGlobalSessionUseCase } from '../../../application/use-cases/revoke-global-session/revoke-global-session.use-case';
import type { RevokeGlobalSessionInputDto } from '../../../application/use-cases/revoke-global-session/revoke-global-session.input.dto';

export type RevokeGlobalSessionControllerDependencies = { useCase: RevokeGlobalSessionUseCase };

export class RevokeGlobalSessionController extends Controller<RevokeGlobalSessionInputDto, HttpResponse> {
  private readonly useCase: RevokeGlobalSessionUseCase;

  constructor(dependencies: RevokeGlobalSessionControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(request: RevokeGlobalSessionInputDto): Promise<HttpResponse> {
    const result = await this.useCase.execute(request);
    if (result.isFailure) return mapDomainErrorToHttpResponse({ error: result.error });
    return HttpResponse.success({ data: result.value });
  }
}
