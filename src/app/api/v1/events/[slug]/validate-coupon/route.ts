import { NextRequest, NextResponse } from "next/server";
import { createTicketingContainer } from "@/server/di/container";
import { ValidateCouponController } from "@/modules/ticketing/server/api/controllers/validate-coupon.controller";

type EventSlugParams = { slug: string };
type RouteContext = { params: Promise<EventSlugParams> };

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { slug } = await context.params;
  const controller = new ValidateCouponController({
    useCase: createTicketingContainer().validateCoupon,
  });
  return controller.handle({ request, eventSlug: slug });
}

