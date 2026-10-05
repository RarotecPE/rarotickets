import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import type { ICheckInRepository } from '../../../domain/repositories/check-in-repository.interface';
import { CheckInLookupMapper } from '../../mappers/checkin.mapper';
import type { FindRegistrationForCheckInInputDto } from './find-registration-for-check-in.input.dto';
import type { FindRegistrationForCheckInOutputDto } from './find-registration-for-check-in.output.dto';

export type FindRegistrationForCheckInDependencies = {
  checkInRepository: ICheckInRepository;
  mapper: CheckInLookupMapper;
};

/**
 * Pré-visualização do credenciamento (§29): permite conferir a inscrição pelo
 * código ou pela credencial antes de confirmar a entrada. O registro em si é
 * feito pelo caso de uso de check-in do contexto de inscrições.
 */
export class FindRegistrationForCheckInUseCase extends UseCase<
  FindRegistrationForCheckInInputDto,
  FindRegistrationForCheckInOutputDto
> {
  private readonly dependencies: FindRegistrationForCheckInDependencies;

  constructor(dependencies: FindRegistrationForCheckInDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: FindRegistrationForCheckInInputDto): Promise<Result<FindRegistrationForCheckInOutputDto>> {
    const code = (input.code ?? '').trim();
    if (code.length < 4) return Result.fail(new Error('Informe o código da inscrição ou a credencial'));

    const registration = await this.dependencies.checkInRepository.lookupByCode({
      code,
      eventId: input.eventId ?? null,
    });
    if (!registration) return Result.fail(new Error('Nenhuma inscrição encontrada para este código'));

    return Result.ok({ registration: this.dependencies.mapper.map({ lookup: registration }) });
  }
}
