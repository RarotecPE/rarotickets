import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext } from '@server/api/http-request.types';
import type { HandlePaymentWebhookInputDto } from '../../../application/use-cases/handle-payment-webhook/handle-payment-webhook.input.dto';
import type { HandlePaymentWebhookOutputDto } from '../../../application/use-cases/handle-payment-webhook/handle-payment-webhook.output.dto';
import type { PaymentWebhookRequest } from '../dtos/payment.request.types';

export type PaymentWebhookControllerDependencies = {
  handlePaymentWebhookUseCase: IUseCase<HandlePaymentWebhookInputDto, HandlePaymentWebhookOutputDto>;
};

/** Endpoint público chamado pelo PagBank: sempre responde 200 para evitar retentativas infinitas (§20). */
export class PaymentWebhookController extends Controller<
  HttpRequestContext<PaymentWebhookRequest>,
  HttpResponse
> {
  private readonly dependencies: PaymentWebhookControllerDependencies;

  constructor(dependencies: PaymentWebhookControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<PaymentWebhookRequest>): Promise<HttpResponse> {
    const result = await this.dependencies.handlePaymentWebhookUseCase.execute({
      payload: request.body.payload,
      rawBody: request.body.rawBody,
      signature: request.body.signature,
      ip: request.ip,
    });

    if (result.isFailure) {
      return HttpResponse.ok({ received: true, processed: false, message: result.error.message });
    }
    return HttpResponse.ok(result.value);
  }
}
