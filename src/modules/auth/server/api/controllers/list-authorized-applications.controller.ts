import { Controller } from '../../../../../server/api/controller.base';
import { mapDomainErrorToHttpResponse } from '../../../../../server/api/domain-http-response.mapper';
import { HttpResponse } from '../../../../../server/api/http-response';
import { ListAuthorizedApplicationsUseCase } from '../../../application/use-cases/list-authorized-applications/list-authorized-applications.use-case';
import type { ListAuthorizedApplicationsInputDto } from '../../../application/use-cases/list-authorized-applications/list-authorized-applications.input.dto';

export type ListAuthorizedApplicationsControllerDependencies = { useCase: ListAuthorizedApplicationsUseCase };

export class ListAuthorizedApplicationsController extends Controller<ListAuthorizedApplicationsInputDto, HttpResponse> {
  private readonly useCase: ListAuthorizedApplicationsUseCase;

  constructor(dependencies: ListAuthorizedApplicationsControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(request: ListAuthorizedApplicationsInputDto): Promise<HttpResponse> {
    const result = await this.useCase.execute(request);
    if (result.isFailure) return mapDomainErrorToHttpResponse({ error: result.error });
    return HttpResponse.success({ data: result.value });
  }
}
