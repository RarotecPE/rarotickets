import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext } from '@server/api/http-request.types';
import type { GetPaymentInputDto } from '../../../application/use-cases/get-payment/get-payment.input.dto';
import type { GetPaymentOutputDto } from '../../../application/use-cases/get-payment/get-payment.output.dto';
import type { InitiatePaymentInputDto } from '../../../application/use-cases/initiate-payment/initiate-payment.input.dto';
import type { InitiatePaymentOutputDto } from '../../../application/use-cases/initiate-payment/initiate-payment.output.dto';
import type { PaymentActionRequest } from '../dtos/payment.request.types';

export type PaymentControllerDependencies = {
  initiatePaymentUseCase: IUseCase<InitiatePaymentInputDto, InitiatePaymentOutputDto>;
  getPaymentUseCase: IUseCase<GetPaymentInputDto, GetPaymentOutputDto>;
};

/** Escolha da forma de pagamento e consulta pelo participante (§15, §16). */
export class PaymentController extends Controller<HttpRequestContext<PaymentActionRequest>, HttpResponse> {
  private readonly dependencies: PaymentControllerDependencies;

  constructor(dependencies: PaymentControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<PaymentActionRequest>): Promise<HttpResponse> {
    switch (request.body.action) {
      case 'initiate': {
        const result = await this.dependencies.initiatePaymentUseCase.execute({
          registrationId: request.body.registrationId ?? null,
          registrationCode: request.body.registrationCode ?? null,
          method: request.body.body.method ?? 'PIX',
          installments: request.body.body.installments ?? 1,
          actorUserId: request.actor?.userId ?? null,
          actorName: request.actor?.name ?? request.participant?.name ?? null,
          ip: request.ip,
        });
        if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'PAYMENT_INITIATION_FAILED');
        return HttpResponse.created(result.value);
      }
      case 'byRegistration': {
        const result = await this.dependencies.getPaymentUseCase.execute({
          registrationId: request.body.registrationId,
        });
        if (result.isFailure) return HttpResponse.notFound(result.error.message, 'PAYMENT_NOT_FOUND');
        return HttpResponse.ok(result.value);
      }
      case 'detail': {
        const result = await this.dependencies.getPaymentUseCase.execute({
          paymentId: request.body.paymentId ?? null,
          reference: request.body.reference ?? null,
        });
        if (result.isFailure) return HttpResponse.notFound(result.error.message, 'PAYMENT_NOT_FOUND');
        return HttpResponse.ok(result.value);
      }
      default:
        return HttpResponse.badRequest('Ação não suportada');
    }
  }
}
