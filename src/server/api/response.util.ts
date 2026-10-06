import type { Response } from 'express';
import { HttpResponse } from './http-response';

export type SendHttpResponseParams = {
  response: Response;
  httpResponse: HttpResponse;
};

export function sendHttpResponse(params: SendHttpResponseParams): void {
  params.response.status(params.httpResponse.statusCode).json(params.httpResponse.body);
}
