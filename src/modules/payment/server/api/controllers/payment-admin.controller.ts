import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext } from '@server/api/http-request.types';
import type { CancelPaymentInputDto } from '../../../application/use-cases/cancel-payment/cancel-payment.input.dto';
import type { CancelPaymentOutputDto } from '../../../application/use-cases/cancel-payment/cancel-payment.output.dto';
import type { GetPaymentInputDto } from '../../../application/use-cases/get-payment/get-payment.input.dto';
import type { GetPaymentOutputDto } from '../../../application/use-cases/get-payment/get-payment.output.dto';
import type { ListPaymentsInputDto } from '../../../application/use-cases/list-payments/list-payments.input.dto';
import type { ListPaymentsOutputDto } from '../../../application/use-cases/list-payments/list-payments.output.dto';
import type { ReconcilePaymentsInputDto } from '../../../application/use-cases/reconcile-payments/reconcile-payments.input.dto';
import type { ReconcilePaymentsOutputDto } from '../../../application/use-cases/reconcile-payments/reconcile-payments.output.dto';
import type { RefundPaymentInputDto } from '../../../application/use-cases/refund-payment/refund-payment.input.dto';
import type { RefundPaymentOutputDto } from '../../../application/use-cases/refund-payment/refund-payment.output.dto';
import type { PaymentAdminActionRequest } from '../dtos/payment.request.types';

export type PaymentAdminControllerDependencies = {
  listPaymentsUseCase: IUseCase<ListPaymentsInputDto, ListPaymentsOutputDto>;
  getPaymentUseCase: IUseCase<GetPaymentInputDto, GetPaymentOutputDto>;
  refundPaymentUseCase: IUseCase<RefundPaymentInputDto, RefundPaymentOutputDto>;
  cancelPaymentUseCase: IUseCase<CancelPaymentInputDto, CancelPaymentOutputDto>;
  reconcilePaymentsUseCase: IUseCase<ReconcilePaymentsInputDto, ReconcilePaymentsOutputDto>;
  /** Disponível somente em desenvolvimento (provedor simulado). */
  simulatePayment?: (params: { paymentId: string }) => Promise<{ simulated: boolean; message: string }>;
};

/** Gestão financeira: listagem, estorno, cancelamento e reconciliação (§21, §22). */
export class PaymentAdminController extends Controller<HttpRequestContext<PaymentAdminActionRequest>, HttpResponse> {
  private readonly dependencies: PaymentAdminControllerDependencies;

  constructor(dependencies: PaymentAdminControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<PaymentAdminActionRequest>): Promise<HttpResponse> {
    const actor = request.actor;
    if (!actor) return HttpResponse.unauthorized();

    switch (request.body.action) {
      case 'list': {
        const query = request.body.query;
        const result = await this.dependencies.listPaymentsUseCase.execute({
          eventId: query.eventId ?? null,
          participantId: query.participantId ?? null,
          status: query.status ?? null,
          method: query.method ?? null,
          search: query.search ?? null,
          page: query.page ? Number(query.page) : 1,
          perPage: query.perPage ? Number(query.perPage) : 20,
        });
        if (result.isFailure) return HttpResponse.serverError(result.error.message);
        return HttpResponse.ok(result.value.payments, { ...result.value.meta, totals: result.value.totals });
      }
      case 'detail': {
        const result = await this.dependencies.getPaymentUseCase.execute({ paymentId: request.body.paymentId });
        if (result.isFailure) return HttpResponse.notFound(result.error.message, 'PAYMENT_NOT_FOUND');
        return HttpResponse.ok(result.value);
      }
      case 'refund': {
        const result = await this.dependencies.refundPaymentUseCase.execute({
          paymentId: request.body.paymentId,
          reason: request.body.body.reason ?? '',
          amountCents: request.body.body.amountCents ?? null,
          actorUserId: actor.userId,
          actorName: actor.name,
          ip: request.ip,
        });
        if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'REFUND_FAILED');
        return HttpResponse.ok(result.value);
      }
      case 'cancel': {
        const result = await this.dependencies.cancelPaymentUseCase.execute({
          paymentId: request.body.paymentId,
          reason: request.body.body.reason ?? 'Cancelamento administrativo',
          actorUserId: actor.userId,
          actorName: actor.name,
          ip: request.ip,
        });
        if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'PAYMENT_CANCEL_FAILED');
        return HttpResponse.ok(result.value);
      }
      case 'reconcile': {
        const result = await this.dependencies.reconcilePaymentsUseCase.execute({
          windowHours: request.body.body.windowHours,
          limit: request.body.body.limit,
          actorUserId: actor.userId,
          actorName: actor.name,
        });
        if (result.isFailure) return HttpResponse.serverError(result.error.message);
        return HttpResponse.ok(result.value);
      }
      case 'simulate': {
        if (!this.dependencies.simulatePayment) {
          return HttpResponse.badRequest('Simulação disponível apenas em desenvolvimento');
        }
        const result = await this.dependencies.simulatePayment({ paymentId: request.body.paymentId });
        if (!result.simulated) return HttpResponse.unprocessable(result.message, 'SIMULATION_FAILED');
        return HttpResponse.ok({ message: result.message });
      }
      default:
        return HttpResponse.badRequest('Ação não suportada');
    }
  }
}
