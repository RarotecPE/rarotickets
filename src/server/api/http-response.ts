export type HttpErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export type HttpDataBody<Data> = { data: Data };
export type HttpResponseBody = HttpErrorBody | HttpDataBody<unknown> | Record<string, unknown>;
export type HttpResponseConstructorParams = {
  statusCode: number;
  body: HttpResponseBody;
};
export type HttpResponseSuccessParams<Data> = { data: Data; statusCode?: number };
export type HttpResponseFailureParams = { statusCode: number; code: string; message: string };
export type HttpResponseCustomParams = { statusCode: number; body: Record<string, unknown> };

export class HttpResponse {
  readonly statusCode: number;
  readonly body: HttpResponseBody;

  private constructor(params: HttpResponseConstructorParams) {
    this.statusCode = params.statusCode;
    this.body = params.body;
  }

  static success<Data>(params: HttpResponseSuccessParams<Data>): HttpResponse {
    return new HttpResponse({ statusCode: params.statusCode ?? 200, body: { data: params.data } });
  }

  static failure(params: HttpResponseFailureParams): HttpResponse {
    return new HttpResponse({
      statusCode: params.statusCode,
      body: { error: { code: params.code, message: params.message } },
    });
  }

  static custom(params: HttpResponseCustomParams): HttpResponse {
    return new HttpResponse({ statusCode: params.statusCode, body: params.body });
  }
}
