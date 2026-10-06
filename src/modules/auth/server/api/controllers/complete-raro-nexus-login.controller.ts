import { Controller } from '../../../../../server/api/controller.base';
import { Result } from '../../../../../@core/domain/result';
import { CompleteRaroNexusLoginUseCase } from '../../../application/use-cases/complete-raro-nexus-login/complete-raro-nexus-login.use-case';
import type { CompleteRaroNexusLoginInputDto } from '../../../application/use-cases/complete-raro-nexus-login/complete-raro-nexus-login.input.dto';
import type { CompleteRaroNexusLoginOutputDto } from '../../../application/use-cases/complete-raro-nexus-login/complete-raro-nexus-login.output.dto';

export type CompleteRaroNexusLoginControllerDependencies = {
  useCase: CompleteRaroNexusLoginUseCase;
};

export class CompleteRaroNexusLoginController extends Controller<
  CompleteRaroNexusLoginInputDto,
  Result<CompleteRaroNexusLoginOutputDto>
> {
  private readonly useCase: CompleteRaroNexusLoginUseCase;

  constructor(dependencies: CompleteRaroNexusLoginControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  handle(request: CompleteRaroNexusLoginInputDto): Promise<Result<CompleteRaroNexusLoginOutputDto>> {
    return this.useCase.execute(request);
  }
}
