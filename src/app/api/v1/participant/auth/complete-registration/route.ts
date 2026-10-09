import { NextRequest } from "next/server";
import { createTicketingContainer } from "@/server/di/container";
import {
  jsonSuccess,
  resultFailureResponse,
  internalErrorResponse,
} from "@/server/api/http-response.util";
import { setParticipantSessionCookie } from "@/server/auth/participant-session-cookie.util";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      token?: string;
      name?: string;
      phone?: string;
      birthDate?: string | null;
      company?: string | null;
      jobTitle?: string | null;
      password?: string;
      termsConsent?: boolean;
      marketingConsent?: boolean;
    };

    const container = createTicketingContainer();
    const result = await container.completeParticipantRegistration.execute({
      rawToken: body.token || "",
      name: body.name || "",
      phone: body.phone || "",
      birthDate: body.birthDate,
      company: body.company,
      jobTitle: body.jobTitle,
      password: body.password || "",
      termsConsent: Boolean(body.termsConsent),
      marketingConsent: Boolean(body.marketingConsent),
    });

    if (result.isFailure) {
      return resultFailureResponse({ error: result.error, status: 400 });
    }

    const response = jsonSuccess({
      participant: result.value.participant,
    });

    setParticipantSessionCookie(response, result.value.sessionToken);

    return response;
  } catch (error) {
    return internalErrorResponse(error);
  }
}

