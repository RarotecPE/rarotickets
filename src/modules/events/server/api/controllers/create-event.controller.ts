import { Controller } from '../../../../../server/api/controller.base';
import { mapDomainErrorToHttpResponse } from '../../../../../server/api/domain-http-response.mapper';
import { HttpResponse } from '../../../../../server/api/http-response';
import { CreateEventUseCase } from '../../../application/use-cases/create-event/create-event.use-case';
import type { CreateEventInputDto } from '../../../application/use-cases/create-event/create-event.input.dto';
import type { CreateEventControllerRequest } from '../dtos/create-event.request.dto';

export type CreateEventControllerDependencies = { useCase: CreateEventUseCase };

export class CreateEventController extends Controller<CreateEventControllerRequest, HttpResponse> {
  private readonly useCase: CreateEventUseCase;

  constructor(dependencies: CreateEventControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(request: CreateEventControllerRequest): Promise<HttpResponse> {
    const result = await this.useCase.execute(this.toInput(request));
    if (result.isFailure) return mapDomainErrorToHttpResponse({ error: result.error });
    return HttpResponse.success({ data: result.value, statusCode: 201 });
  }

  private toInput(request: CreateEventControllerRequest): CreateEventInputDto {
    return { ...request.body, createdById: request.createdById };
  }
}
