import { Controller } from '../../../../../server/api/controller.base';
import { mapDomainErrorToHttpResponse } from '../../../../../server/api/domain-http-response.mapper';
import { HttpResponse } from '../../../../../server/api/http-response';
import { ListEventsUseCase } from '../../../application/use-cases/list-events/list-events.use-case';
import type { ListEventsInputDto } from '../../../application/use-cases/list-events/list-events.input.dto';

export type ListEventsControllerDependencies = { useCase: ListEventsUseCase };

export class ListEventsController extends Controller<ListEventsInputDto, HttpResponse> {
  private readonly useCase: ListEventsUseCase;

  constructor(dependencies: ListEventsControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(request: ListEventsInputDto): Promise<HttpResponse> {
    const result = await this.useCase.execute(request);
    if (result.isFailure) return mapDomainErrorToHttpResponse({ error: result.error });
    return HttpResponse.success({ data: result.value });
  }
}
