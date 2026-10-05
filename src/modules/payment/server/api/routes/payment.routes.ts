import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { sendHttpResponse } from '@server/api/http-router';
import { readRouteParam, readStringQuery, toHttpContext } from '@server/api/route-helpers';
import { requirePermission } from '@server/middlewares/auth.middleware';
import type { PaymentController } from '../controllers/payment.controller';
import type { PaymentAdminController } from '../controllers/payment-admin.controller';
import type { PaymentWebhookController } from '../controllers/payment-webhook.controller';
import type {
  PaymentActionRequest,
  PaymentAdminActionRequest,
  PaymentAdminListQuery,
  PaymentWebhookRequest,
} from '../dtos/payment.request.types';

export type PaymentRouterDependencies = {
  controller: PaymentController;
  adminController: PaymentAdminController;
  webhookController: PaymentWebhookController;
  authenticate: RequestHandler;
  authenticateParticipant: RequestHandler;
  providerSignatureHeader: string;
};

export function createPaymentRouter(dependencies: PaymentRouterDependencies): Router {
  const router = Router();
  const admin = [dependencies.authenticate];
  const participant = [dependencies.authenticateParticipant];

  router.post('/registrations/:registrationId/payments', ...participant, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<PaymentActionRequest>(request, {
        action: 'initiate',
        registrationId: readRouteParam(request, 'registrationId'),
        body: {
          method: request.body?.method as string | undefined,
          installments: request.body?.installments as number | undefined,
        },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/registrations/:registrationId/payments', ...participant, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<PaymentActionRequest>(request, {
        action: 'byRegistration',
        registrationId: readRouteParam(request, 'registrationId'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/payments/:paymentId', ...participant, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<PaymentActionRequest>(request, {
        action: 'detail',
        paymentId: readRouteParam(request, 'paymentId'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/webhooks/pagbank', async (request: Request, response: Response) => {
    const rawBody = (request as Request & { rawBody?: string }).rawBody ?? JSON.stringify(request.body ?? {});
    const signature = (request.headers[dependencies.providerSignatureHeader] as string | undefined) ?? null;
    const httpResponse = await dependencies.webhookController.handle(
      toHttpContext<PaymentWebhookRequest>(request, {
        payload: request.body ?? {},
        rawBody,
        signature,
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/admin/payments', ...admin, requirePermission('PAYMENT_VIEW'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<PaymentAdminActionRequest>(request, {
        action: 'list',
        query: readStringQuery<PaymentAdminListQuery>(request),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/admin/payments/:paymentId', ...admin, requirePermission('PAYMENT_VIEW'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<PaymentAdminActionRequest>(request, {
        action: 'detail',
        paymentId: readRouteParam(request, 'paymentId'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/payments/:paymentId/refund', ...admin, requirePermission('PAYMENT_REFUND'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<PaymentAdminActionRequest>(request, {
        action: 'refund',
        paymentId: readRouteParam(request, 'paymentId'),
        body: {
          reason: request.body?.reason as string | undefined,
          amountCents: (request.body?.amountCents as number | undefined) ?? null,
        },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/payments/:paymentId/cancel', ...admin, requirePermission('PAYMENT_MANAGE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<PaymentAdminActionRequest>(request, {
        action: 'cancel',
        paymentId: readRouteParam(request, 'paymentId'),
        body: { reason: request.body?.reason as string | undefined },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/payments/reconcile', ...admin, requirePermission('PAYMENT_MANAGE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<PaymentAdminActionRequest>(request, {
        action: 'reconcile',
        body: {
          windowHours: request.body?.windowHours as number | undefined,
          limit: request.body?.limit as number | undefined,
        },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/dev/payments/:paymentId/simulate', ...admin, requirePermission('PAYMENT_MANAGE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<PaymentAdminActionRequest>(request, {
        action: 'simulate',
        paymentId: readRouteParam(request, 'paymentId'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  return router;
}
