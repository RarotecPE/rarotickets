import { Controller } from '../../../../../server/api/controller.base';
import { mapDomainErrorToHttpResponse } from '../../../../../server/api/domain-http-response.mapper';
import { HttpResponse } from '../../../../../server/api/http-response';
import { UpdateEventStatusUseCase } from '../../../application/use-cases/update-event-status/update-event-status.use-case';
import type { UpdateEventStatusInputDto } from '../../../application/use-cases/update-event-status/update-event-status.input.dto';
import type { UpdateEventStatusControllerRequest } from '../dtos/update-event-status.request.dto';

export type UpdateEventStatusControllerDependencies = { useCase: UpdateEventStatusUseCase };

export class UpdateEventStatusController extends Controller<UpdateEventStatusControllerRequest, HttpResponse> {
  private readonly useCase: UpdateEventStatusUseCase;

  constructor(dependencies: UpdateEventStatusControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(request: UpdateEventStatusControllerRequest): Promise<HttpResponse> {
    const input: UpdateEventStatusInputDto = { eventId: request.eventId, status: request.body.status };
    const result = await this.useCase.execute(input);
    if (result.isFailure) return mapDomainErrorToHttpResponse({ error: result.error });
    return HttpResponse.success({ data: result.value });
  }
}
