import type { Response } from 'express';
import type { HttpResponse } from './http-response';

export type SendHttpResponseParams = { response: Response; httpResponse: HttpResponse };

/** Único ponto que traduz HttpResponse para o runtime do Express. */
export function sendHttpResponse(params: SendHttpResponseParams): void {
  const { response, httpResponse } = params;

  for (const cookie of httpResponse.cookies) {
    response.cookie(cookie.name, cookie.value, {
      maxAge: cookie.maxAgeSeconds !== undefined ? cookie.maxAgeSeconds * 1000 : undefined,
      httpOnly: cookie.httpOnly ?? true,
      secure: cookie.secure ?? false,
      sameSite: cookie.sameSite ?? 'lax',
      path: cookie.path ?? '/',
    });
  }

  if (httpResponse.status === 204) {
    response.status(204).end();
    return;
  }

  response.status(httpResponse.status).json(httpResponse.body);
}
