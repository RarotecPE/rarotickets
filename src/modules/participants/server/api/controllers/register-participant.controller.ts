import { Controller } from '../../../../../server/api/controller.base';
import { mapDomainErrorToHttpResponse } from '../../../../../server/api/domain-http-response.mapper';
import { HttpResponse } from '../../../../../server/api/http-response';
import { RegisterParticipantUseCase } from '../../../application/use-cases/register-participant/register-participant.use-case';
import type { RegisterParticipantInputDto } from '../../../application/use-cases/register-participant/register-participant.input.dto';

export type RegisterParticipantControllerDependencies = { useCase: RegisterParticipantUseCase };

export class RegisterParticipantController extends Controller<RegisterParticipantInputDto, HttpResponse> {
  private readonly useCase: RegisterParticipantUseCase;

  constructor(dependencies: RegisterParticipantControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(request: RegisterParticipantInputDto): Promise<HttpResponse> {
    const result = await this.useCase.execute(request);
    if (result.isFailure) return mapDomainErrorToHttpResponse({ error: result.error });
    return HttpResponse.success({ data: result.value, statusCode: 201 });
  }
}
