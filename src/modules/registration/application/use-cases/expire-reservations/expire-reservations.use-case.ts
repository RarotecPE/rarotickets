import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { COUPON_CATALOG } from '@core/contracts/coupon-catalog.contract';
import type { ICouponCatalog } from '@core/contracts/coupon-catalog.contract';
import { Result } from '@core/domain/result';
import { REGISTRATION_REPOSITORY } from '../../../domain/repositories/registration-repository.interface';
import type { IRegistrationRepository } from '../../../domain/repositories/registration-repository.interface';
import type { ExpireReservationsInputDto } from './expire-reservations.input.dto';
import type { ExpireReservationsOutputDto } from './expire-reservations.output.dto';

export type ExpireReservationsDependencies = {
  registrationRepository: IRegistrationRepository;
  couponCatalog: ICouponCatalog;
  clock: IClock;
};

/**
 * Expiração automática das reservas temporárias de vaga (§4 e §39): a vaga
 * volta a ficar disponível e o cupom eventualmente usado é devolvido.
 */
export class ExpireReservationsUseCase extends UseCase<
  ExpireReservationsInputDto,
  ExpireReservationsOutputDto
> {
  private readonly dependencies: ExpireReservationsDependencies;

  constructor(dependencies: ExpireReservationsDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ExpireReservationsInputDto): Promise<Result<ExpireReservationsOutputDto>> {
    const { registrationRepository, couponCatalog, clock } = this.dependencies;
    const at = clock.now();

    const registrations = await registrationRepository.listExpiredReservations({
      at,
      limit: input.limit ?? 100,
    });

    const expired: ExpireReservationsOutputDto['expired'] = [];
    for (const registration of registrations) {
      const expireResult = registration.expireReservation({ at });
      if (expireResult.isFailure) continue;

      await registrationRepository.update(registration);
      if (registration.couponCode) await couponCatalog.release({ registrationId: registration.id.toString() });

      expired.push({
        registrationId: registration.id.toString(),
        code: registration.code.value,
        eventId: registration.eventId,
      });
    }

    return Result.ok({ expired });
  }
}
