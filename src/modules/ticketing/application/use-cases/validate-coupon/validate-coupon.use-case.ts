import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import { CouponUnavailableError } from "@/modules/ticketing/domain/coupons/entities/coupon.entity";
import type { EventRepository } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import type {
  RegistrationRepository,
  ValidatedCouponResult,
} from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";

export type ValidateCouponInputDto = {
  slug: string;
  lotId: string;
  code: string;
  email?: string | null;
  cpf?: string | null;
  at?: Date;
};

export type ValidateCouponOutputDto = ValidatedCouponResult;

export type ValidateCouponDependencies = {
  eventRepository: EventRepository;
  registrationRepository: RegistrationRepository;
};

export class ValidateCouponUseCase extends UseCase<
  ValidateCouponInputDto,
  ValidateCouponOutputDto
> {
  private readonly eventRepository: EventRepository;
  private readonly registrationRepository: RegistrationRepository;

  constructor(dependencies: ValidateCouponDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.registrationRepository = dependencies.registrationRepository;
  }

  async execute(input: ValidateCouponInputDto): Promise<Result<ValidateCouponOutputDto>> {
    const genericError = new CouponUnavailableError();

    if (!input.slug || !input.lotId || !input.code) {
      return Result.fail(genericError);
    }

    const at = input.at ?? new Date();
    const event = await this.eventRepository.getPublicBySlug({
      slug: input.slug,
      at,
    });

    if (
      !event ||
      (event.props.status !== "inscricoes_abertas" && event.props.status !== "agendado")
    ) {
      return Result.fail(genericError);
    }

    const lot = event.lots.find((l) => l.id === input.lotId);
    if (!lot || !lot.active) {
      return Result.fail(genericError);
    }

    const validationResult = await this.registrationRepository.validateCoupon({
      eventId: event.id,
      lotId: input.lotId,
      code: input.code,
      participantEmail: input.email,
      participantCpf: input.cpf,
      at,
    });

    if (validationResult.isFailure) {
      return Result.fail(genericError);
    }

    return Result.ok(validationResult.value);
  }
}
