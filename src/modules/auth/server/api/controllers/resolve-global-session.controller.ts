import { Controller } from '../../../../../server/api/controller.base';
import { mapDomainErrorToHttpResponse } from '../../../../../server/api/domain-http-response.mapper';
import { HttpResponse } from '../../../../../server/api/http-response';
import { ResolveGlobalSessionUseCase } from '../../../application/use-cases/resolve-global-session/resolve-global-session.use-case';
import type { ResolveGlobalSessionInputDto } from '../../../application/use-cases/resolve-global-session/resolve-global-session.input.dto';

export type ResolveGlobalSessionControllerDependencies = { useCase: ResolveGlobalSessionUseCase };

export class ResolveGlobalSessionController extends Controller<ResolveGlobalSessionInputDto, HttpResponse> {
  private readonly useCase: ResolveGlobalSessionUseCase;

  constructor(dependencies: ResolveGlobalSessionControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(request: ResolveGlobalSessionInputDto): Promise<HttpResponse> {
    const result = await this.useCase.execute(request);
    if (result.isFailure) return mapDomainErrorToHttpResponse({ error: result.error });
    return HttpResponse.success({ data: { authenticated: true, authorized: true, session: result.value } });
  }
}
