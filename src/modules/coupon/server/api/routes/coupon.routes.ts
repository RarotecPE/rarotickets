import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { sendHttpResponse } from '@server/api/http-router';
import { readRouteParam, readStringQuery, toHttpContext } from '@server/api/route-helpers';
import { requirePermission } from '@server/middlewares/auth.middleware';
import type { CouponController } from '../controllers/coupon.controller';
import type { CouponActionRequest, CouponListQuery } from '../dtos/coupon.request.types';

export type CouponRouterDependencies = {
  controller: CouponController;
  authenticate: RequestHandler;
};

export function createCouponRouter(dependencies: CouponRouterDependencies): Router {
  const router = Router();
  const admin = [dependencies.authenticate];

  router.post('/coupons/validate', async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<CouponActionRequest>(request, {
        action: 'validate',
        body: {
          eventId: request.body?.eventId as string | undefined,
          code: request.body?.code as string | undefined,
          amountCents: request.body?.amountCents as number | undefined,
        },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/admin/coupons', ...admin, requirePermission('COUPON_MANAGE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<CouponActionRequest>(request, {
        action: 'list',
        query: readStringQuery<CouponListQuery>(request),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/coupons', ...admin, requirePermission('COUPON_MANAGE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<CouponActionRequest>(request, { action: 'create', body: (request.body ?? {}) as never }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.put('/admin/coupons/:couponId', ...admin, requirePermission('COUPON_MANAGE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<CouponActionRequest>(request, {
        action: 'update',
        couponId: readRouteParam(request, 'couponId'),
        body: (request.body ?? {}) as never,
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.delete('/admin/coupons/:couponId', ...admin, requirePermission('COUPON_MANAGE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<CouponActionRequest>(request, {
        action: 'deactivate',
        couponId: readRouteParam(request, 'couponId'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  return router;
}
