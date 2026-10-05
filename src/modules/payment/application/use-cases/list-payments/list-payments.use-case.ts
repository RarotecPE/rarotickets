import { buildPaginationMeta, normalizePagination } from '@core/application/pagination/pagination';
import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import { MoneyVO } from '@core/domain/value-objects/money.vo';
import { PAYMENT_REPOSITORY } from '../../../domain/repositories/payment-repository.interface';
import type { IPaymentRepository } from '../../../domain/repositories/payment-repository.interface';
import type { PaymentStatusValue } from '../../../domain/value-objects/payment-status.vo';
import { PaymentMapper } from '../../mappers/payment.mapper';
import type { ListPaymentsInputDto } from './list-payments.input.dto';
import type { ListPaymentsOutputDto } from './list-payments.output.dto';

export type ListPaymentsDependencies = {
  paymentRepository: IPaymentRepository;
  mapper: PaymentMapper;
};

export class ListPaymentsUseCase extends UseCase<ListPaymentsInputDto, ListPaymentsOutputDto> {
  private readonly dependencies: ListPaymentsDependencies;

  constructor(dependencies: ListPaymentsDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ListPaymentsInputDto): Promise<Result<ListPaymentsOutputDto>> {
    const pagination = normalizePagination({ page: input.page, perPage: input.perPage });
    const { paymentRepository, mapper } = this.dependencies;

    const { payments, total } = await paymentRepository.list({
      registrationId: input.registrationId ?? null,
      eventId: input.eventId ?? null,
      participantId: input.participantId ?? null,
      status: (input.status as PaymentStatusValue | null) ?? null,
      method: input.method ?? null,
      search: input.search ?? null,
      page: pagination.page,
      perPage: pagination.perPage,
    });

    const sumBy = (predicate: (status: string) => boolean): number =>
      payments
        .filter((payment) => predicate(payment.status.value))
        .reduce((accumulator, payment) => accumulator + payment.amount.cents, 0);

    const paidCents = sumBy((status) => status === 'PAGO');
    const pendingCents = sumBy((status) => status === 'PENDENTE' || status === 'AGUARDANDO');
    const refundedCents = payments
      .filter((payment) => payment.status.isRefunded())
      .reduce((accumulator, payment) => accumulator + (payment.refundedAmountCents ?? 0), 0);

    return Result.ok({
      payments: payments.map((payment) => mapper.map({ payment })),
      meta: buildPaginationMeta({ ...pagination, total }),
      totals: {
        count: total,
        paidCents,
        pendingCents,
        refundedCents,
        paidFormatted: MoneyVO.reconstitute({ cents: paidCents }).format(),
        pendingFormatted: MoneyVO.reconstitute({ cents: pendingCents }).format(),
        refundedFormatted: MoneyVO.reconstitute({ cents: refundedCents }).format(),
      },
    });
  }
}
