import { UseCase } from '@core/application/use-case.base';
import { REGISTRATION_GATEWAY } from '@core/contracts/registration-gateway.contract';
import type { IRegistrationGateway } from '@core/contracts/registration-gateway.contract';
import { Result } from '@core/domain/result';
import { PaymentNotFoundError } from '../../../domain/errors/payment-not-found.error';
import { PAYMENT_REPOSITORY } from '../../../domain/repositories/payment-repository.interface';
import type { IPaymentRepository } from '../../../domain/repositories/payment-repository.interface';
import { PaymentMapper } from '../../mappers/payment.mapper';
import type { GetPaymentInputDto } from './get-payment.input.dto';
import type { GetPaymentOutputDto } from './get-payment.output.dto';

export type GetPaymentDependencies = {
  paymentRepository: IPaymentRepository;
  registrationGateway: IRegistrationGateway;
  mapper: PaymentMapper;
};

export class GetPaymentUseCase extends UseCase<GetPaymentInputDto, GetPaymentOutputDto> {
  private readonly dependencies: GetPaymentDependencies;

  constructor(dependencies: GetPaymentDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: GetPaymentInputDto): Promise<Result<GetPaymentOutputDto>> {
    const { paymentRepository, registrationGateway, mapper } = this.dependencies;

    let payments = input.registrationId
      ? await paymentRepository.findByRegistrationId(input.registrationId)
      : [];

    if (payments.length === 0 && input.paymentId) {
      const payment = await paymentRepository.findById(input.paymentId);
      if (payment) payments = [payment];
    }
    if (payments.length === 0 && input.reference) {
      const payment = await paymentRepository.findByReference(input.reference);
      if (payment) payments = [payment];
    }
    if (payments.length === 0) {
      return Result.fail(new PaymentNotFoundError(input.paymentId ?? input.reference ?? input.registrationId ?? ''));
    }

    const registrationId = input.registrationId ?? payments[0]?.registrationId ?? null;
    const [events, registration] = await Promise.all([
      this.collectEvents(payments.map((payment) => payment.id.toString())),
      registrationId ? registrationGateway.getSnapshot({ registrationId }) : Promise.resolve(null),
    ]);

    return Result.ok({
      payments: payments.map((payment) => mapper.map({ payment })),
      events,
      registration: registration
        ? {
            registrationId: registration.registrationId,
            code: registration.code,
            status: registration.status,
            seatStatus: registration.seatStatus,
            finalAmountCents: registration.finalAmountCents,
            reservationExpiresAt: registration.reservationExpiresAt,
            waitlistPosition: registration.waitlistPosition,
          }
        : null,
    });
  }

  private async collectEvents(paymentIds: string[]): Promise<GetPaymentOutputDto['events']> {
    const events = await Promise.all(
      paymentIds.map((paymentId) => this.dependencies.paymentRepository.listEvents(paymentId)),
    );
    return events
      .flat()
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
      .map((event) => this.dependencies.mapper.mapEvent(event));
  }
}
